-- PASS4764: environment-bound release evidence bundle and atomic promotion consumption.
create extension if not exists pgcrypto;

create table if not exists public.velmere_provider_recovery_release_bundles (
  bundle_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (idempotency_key ~ '^[a-f0-9]{64}$'),
  state text not null check (state in ('recorded','verified','consumed','expired','blocked')),
  environment text not null check (environment in ('staging','production')),
  audience_hash text not null check (audience_hash ~ '^[a-f0-9]{64}$'),
  deployment_fingerprint text not null check (deployment_fingerprint ~ '^[a-f0-9]{64}$'),
  rollback_execution_digest text not null check (rollback_execution_digest ~ '^[a-f0-9]{64}$'),
  incident_digest text not null check (incident_digest ~ '^[a-f0-9]{64}$'),
  quality_digest text not null check (quality_digest ~ '^[a-f0-9]{64}$'),
  capability_digest text not null check (capability_digest ~ '^[a-f0-9]{64}$'),
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  build_sha256 text not null check (build_sha256 ~ '^[a-f0-9]{64}$'),
  build_id_hash text not null check (build_id_hash ~ '^[a-f0-9]{64}$'),
  exact_checkpoint integer not null check (exact_checkpoint between 4725 and 999999),
  recovery_proof_digest text not null check (recovery_proof_digest ~ '^[a-f0-9]{64}$'),
  customer_smoke_digest text not null check (customer_smoke_digest ~ '^[a-f0-9]{64}$'),
  provider_smoke_digest text not null check (provider_smoke_digest ~ '^[a-f0-9]{64}$'),
  release_certificate_digest text not null check (release_certificate_digest ~ '^[a-f0-9]{64}$'),
  evidence_root text not null check (evidence_root ~ '^[a-f0-9]{64}$'),
  operator_hash text not null check (operator_hash ~ '^[a-f0-9]{64}$'),
  reason_hash text not null check (reason_hash ~ '^[a-f0-9]{64}$'),
  approval_digest text not null check (approval_digest ~ '^[a-f0-9]{64}$'),
  bundle_digest text not null unique check (bundle_digest ~ '^[a-f0-9]{64}$'),
  promotion_request_digest text check (promotion_request_digest is null or promotion_request_digest ~ '^[a-f0-9]{64}$'),
  recorded_at timestamptz not null default now(),
  verified_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(environment,audience_hash,evidence_root,release_certificate_digest)
);
alter table public.velmere_provider_recovery_release_bundles enable row level security;
revoke all on public.velmere_provider_recovery_release_bundles from public,anon,authenticated;
grant select,insert,update on public.velmere_provider_recovery_release_bundles to service_role;
create index if not exists velmere_provider_recovery_release_bundle_status_idx on public.velmere_provider_recovery_release_bundles(environment,state,expires_at desc);

create or replace function public.velmere_record_provider_recovery_release_bundle(
  p_idempotency_key text,p_environment text,p_audience_hash text,p_deployment_fingerprint text,p_rollback_execution_digest text,
  p_incident_digest text,p_quality_digest text,p_capability_digest text,p_source_sha256 text,p_build_sha256 text,p_build_id_hash text,
  p_exact_checkpoint integer,p_recovery_proof_digest text,p_customer_smoke_digest text,p_provider_smoke_digest text,
  p_release_certificate_digest text,p_evidence_root text,p_operator_hash text,p_reason_hash text,p_approval_digest text,p_expires_at timestamptz
) returns table(state text,bundle_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.velmere_provider_recovery_release_bundles%rowtype;v_digest text;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_provider_recovery_release_bundle:'||p_environment));
  if p_environment not in ('staging','production') then raise exception 'provider_recovery_release_bundle_environment_invalid';end if;
  if p_idempotency_key !~ '^[a-f0-9]{64}$' or p_audience_hash !~ '^[a-f0-9]{64}$' or p_deployment_fingerprint !~ '^[a-f0-9]{64}$'
    or p_rollback_execution_digest !~ '^[a-f0-9]{64}$' or p_incident_digest !~ '^[a-f0-9]{64}$' or p_quality_digest !~ '^[a-f0-9]{64}$'
    or p_capability_digest !~ '^[a-f0-9]{64}$' or p_source_sha256 !~ '^[a-f0-9]{64}$' or p_build_sha256 !~ '^[a-f0-9]{64}$'
    or p_build_id_hash !~ '^[a-f0-9]{64}$' or p_recovery_proof_digest !~ '^[a-f0-9]{64}$' or p_customer_smoke_digest !~ '^[a-f0-9]{64}$'
    or p_provider_smoke_digest !~ '^[a-f0-9]{64}$' or p_release_certificate_digest !~ '^[a-f0-9]{64}$' or p_evidence_root !~ '^[a-f0-9]{64}$'
    or p_operator_hash !~ '^[a-f0-9]{64}$' or p_reason_hash !~ '^[a-f0-9]{64}$' or p_approval_digest !~ '^[a-f0-9]{64}$'
  then raise exception 'provider_recovery_release_bundle_evidence_invalid';end if;
  if p_exact_checkpoint<4725 or p_expires_at<=now() or p_expires_at>now()+interval '30 minutes' then raise exception 'provider_recovery_release_bundle_freshness_invalid';end if;
  select * into v_existing from public.velmere_provider_recovery_release_bundles where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.state,v_existing.bundle_digest,true;return;end if;
  if not exists(select 1 from public.velmere_provider_recovery_release_certificates where certificate_digest=p_release_certificate_digest and state='verified' and expires_at>now()
    and rollback_execution_digest=p_rollback_execution_digest and incident_digest=p_incident_digest and quality_digest=p_quality_digest and capability_digest=p_capability_digest
    and source_sha256=p_source_sha256 and build_sha256=p_build_sha256 and build_id_hash=p_build_id_hash and exact_checkpoint=p_exact_checkpoint
    and recovery_proof_digest=p_recovery_proof_digest and customer_smoke_digest=p_customer_smoke_digest and provider_smoke_digest=p_provider_smoke_digest)
  then raise exception 'provider_recovery_release_bundle_certificate_not_verified';end if;
  if exists(select 1 from public.velmere_durable_computation_deployment_ledger where is_active=true and state='promoted') then raise exception 'provider_recovery_release_bundle_active_deployment_present';end if;
  v_digest:=encode(digest(concat_ws('|','velmere.provider-recovery-release-bundle.v1',p_environment,p_audience_hash,p_deployment_fingerprint,p_rollback_execution_digest,p_incident_digest,p_quality_digest,p_capability_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_recovery_proof_digest,p_customer_smoke_digest,p_provider_smoke_digest,p_release_certificate_digest,p_evidence_root,p_approval_digest,extract(epoch from p_expires_at)::bigint),'sha256'),'hex');
  insert into public.velmere_provider_recovery_release_bundles(idempotency_key,state,environment,audience_hash,deployment_fingerprint,rollback_execution_digest,incident_digest,quality_digest,capability_digest,source_sha256,build_sha256,build_id_hash,exact_checkpoint,recovery_proof_digest,customer_smoke_digest,provider_smoke_digest,release_certificate_digest,evidence_root,operator_hash,reason_hash,approval_digest,bundle_digest,expires_at)
  values(p_idempotency_key,'recorded',p_environment,p_audience_hash,p_deployment_fingerprint,p_rollback_execution_digest,p_incident_digest,p_quality_digest,p_capability_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_recovery_proof_digest,p_customer_smoke_digest,p_provider_smoke_digest,p_release_certificate_digest,p_evidence_root,p_operator_hash,p_reason_hash,p_approval_digest,v_digest,p_expires_at);
  return query select 'recorded'::text,v_digest,false;
end $$;

create or replace function public.velmere_verify_provider_recovery_release_bundle(
  p_bundle_digest text,p_idempotency_key text,p_environment text,p_audience_hash text,p_deployment_fingerprint text,p_rollback_execution_digest text,
  p_incident_digest text,p_quality_digest text,p_capability_digest text,p_source_sha256 text,p_build_sha256 text,p_build_id_hash text,
  p_exact_checkpoint integer,p_recovery_proof_digest text,p_customer_smoke_digest text,p_provider_smoke_digest text,
  p_release_certificate_digest text,p_evidence_root text,p_operator_hash text,p_reason_hash text,p_approval_digest text,p_expires_at timestamptz
) returns table(state text,bundle_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v public.velmere_provider_recovery_release_bundles%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_provider_recovery_release_bundle:'||p_environment));
  select * into v from public.velmere_provider_recovery_release_bundles where bundle_digest=p_bundle_digest for update;
  if not found then raise exception 'provider_recovery_release_bundle_missing';end if;
  if v.idempotency_key<>p_idempotency_key or v.environment<>p_environment or v.audience_hash<>p_audience_hash or v.deployment_fingerprint<>p_deployment_fingerprint or v.rollback_execution_digest<>p_rollback_execution_digest or v.incident_digest<>p_incident_digest or v.quality_digest<>p_quality_digest or v.capability_digest<>p_capability_digest or v.source_sha256<>p_source_sha256 or v.build_sha256<>p_build_sha256 or v.build_id_hash<>p_build_id_hash or v.exact_checkpoint<>p_exact_checkpoint or v.recovery_proof_digest<>p_recovery_proof_digest or v.customer_smoke_digest<>p_customer_smoke_digest or v.provider_smoke_digest<>p_provider_smoke_digest or v.release_certificate_digest<>p_release_certificate_digest or v.evidence_root<>p_evidence_root or v.operator_hash<>p_operator_hash or v.reason_hash<>p_reason_hash or v.approval_digest<>p_approval_digest or v.expires_at<>p_expires_at then raise exception 'provider_recovery_release_bundle_mismatch';end if;
  if v.state='verified' then return query select 'verified'::text,v.bundle_digest,true;return;end if;
  if v.expires_at<=now() then update public.velmere_provider_recovery_release_bundles set state='expired',updated_at=now() where bundle_id=v.bundle_id;raise exception 'provider_recovery_release_bundle_expired';end if;
  update public.velmere_provider_recovery_release_bundles set state='verified',verified_at=now(),updated_at=now() where bundle_id=v.bundle_id;
  return query select 'verified'::text,v.bundle_digest,false;
end $$;

create or replace function public.velmere_get_provider_recovery_release_bundle_status(
  p_environment text,p_audience_hash text,p_deployment_fingerprint text,p_rollback_execution_digest text,p_incident_digest text,p_quality_digest text,
  p_capability_digest text,p_source_sha256 text,p_build_sha256 text,p_build_id_hash text,p_exact_checkpoint integer,p_recovery_proof_digest text,
  p_customer_smoke_digest text,p_provider_smoke_digest text,p_release_certificate_digest text,p_evidence_root text,p_now timestamptz
) returns table(state text,bundle_digest text,expires_at timestamptz,blockers text[])
language plpgsql security definer set search_path=public stable as $$
declare v public.velmere_provider_recovery_release_bundles%rowtype;v_blockers text[]:='{}';
begin
  select * into v from public.velmere_provider_recovery_release_bundles where environment=p_environment and audience_hash=p_audience_hash and deployment_fingerprint=p_deployment_fingerprint and rollback_execution_digest=p_rollback_execution_digest and incident_digest=p_incident_digest and quality_digest=p_quality_digest and capability_digest=p_capability_digest and source_sha256=p_source_sha256 and build_sha256=p_build_sha256 and build_id_hash=p_build_id_hash and exact_checkpoint=p_exact_checkpoint and recovery_proof_digest=p_recovery_proof_digest and customer_smoke_digest=p_customer_smoke_digest and provider_smoke_digest=p_provider_smoke_digest and release_certificate_digest=p_release_certificate_digest and evidence_root=p_evidence_root order by created_at desc limit 1;
  if not found then return query select 'missing'::text,null::text,null::timestamptz,array['provider_recovery_release_bundle_missing']::text[];return;end if;
  if v.state='consumed' then return query select 'consumed'::text,v.bundle_digest,v.expires_at,array['provider_recovery_release_bundle_consumed']::text[];return;end if;
  if v.expires_at<=p_now then return query select 'expired'::text,v.bundle_digest,v.expires_at,array['provider_recovery_release_bundle_expired']::text[];return;end if;
  if v.state<>'verified' then v_blockers:=array_append(v_blockers,'provider_recovery_release_bundle_not_verified');end if;
  return query select v.state,v.bundle_digest,v.expires_at,v_blockers;
end $$;

revoke all on function public.velmere_record_provider_recovery_release_bundle(text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.velmere_verify_provider_recovery_release_bundle(text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.velmere_get_provider_recovery_release_bundle_status(text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.velmere_record_provider_recovery_release_bundle(text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,timestamptz) to service_role;
grant execute on function public.velmere_verify_provider_recovery_release_bundle(text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,timestamptz) to service_role;
grant execute on function public.velmere_get_provider_recovery_release_bundle_status(text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,timestamptz) to service_role;

alter table public.velmere_durable_computation_deployment_ledger add column if not exists release_bundle_digest text;
alter table public.velmere_durable_computation_deployment_ledger drop constraint if exists velmere_durable_computation_release_bundle_digest_check;
alter table public.velmere_durable_computation_deployment_ledger add constraint velmere_durable_computation_release_bundle_digest_check check (release_bundle_digest is null or release_bundle_digest ~ '^[a-f0-9]{64}$');

drop function if exists public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,text,text,integer,text,text);
create or replace function public.velmere_promote_durable_computation_deployment(
  p_idempotency_key text,p_deployment_fingerprint text,p_capability_digest text,p_provider_quality_digest text,p_recovery_proof_digest text,
  p_release_certificate_digest text,p_release_bundle_digest text,p_source_sha256 text,p_build_sha256 text,p_build_id_hash text,p_exact_checkpoint integer,p_operator_hash text,p_reason_hash text
) returns table(deployment_id uuid,state text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.velmere_durable_computation_deployment_ledger%rowtype;v_id uuid:=gen_random_uuid();v_recovery_required boolean;v_certificate public.velmere_provider_recovery_release_certificates%rowtype;v_bundle public.velmere_provider_recovery_release_bundles%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_durable_computation_deployment_promotion'));
  perform pg_advisory_xact_lock(hashtext('velmere_provider_recovery_release_certificate'));
  perform pg_advisory_xact_lock(hashtext('velmere_provider_recovery_release_bundle'));
  select * into v_existing from public.velmere_durable_computation_deployment_ledger where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.deployment_id,v_existing.state,true;return;end if;
  select exists(select 1 from public.velmere_provider_quality_rollback_executions where state='verified') into v_recovery_required;
  if v_recovery_required then
    if p_recovery_proof_digest is null or p_release_certificate_digest is null or p_release_bundle_digest is null then raise exception 'promotion_recovery_bundle_required';end if;
    select * into v_certificate from public.velmere_provider_recovery_release_certificates where certificate_digest=p_release_certificate_digest for update;
    if not found or v_certificate.state<>'verified' or v_certificate.expires_at<=now() then raise exception 'promotion_recovery_certificate_not_verified';end if;
    select * into v_bundle from public.velmere_provider_recovery_release_bundles where bundle_digest=p_release_bundle_digest for update;
    if not found or v_bundle.state<>'verified' or v_bundle.expires_at<=now() then raise exception 'promotion_recovery_bundle_not_verified';end if;
    if v_bundle.release_certificate_digest<>p_release_certificate_digest or v_bundle.recovery_proof_digest<>p_recovery_proof_digest or v_bundle.deployment_fingerprint<>p_deployment_fingerprint or v_bundle.quality_digest<>p_provider_quality_digest or v_bundle.capability_digest<>p_capability_digest or v_bundle.source_sha256<>p_source_sha256 or v_bundle.build_sha256<>p_build_sha256 or v_bundle.build_id_hash<>p_build_id_hash or v_bundle.exact_checkpoint<>p_exact_checkpoint then raise exception 'promotion_recovery_bundle_mismatch';end if;
  end if;
  if exists(select 1 from public.velmere_provider_quality_incidents where incident_key='provider_quality' and (state not in ('healthy','resolved') or release_hold or rollback_required or rollback_execution_required)) then raise exception 'promotion_provider_incident_not_recovered';end if;
  update public.velmere_durable_computation_deployment_ledger set is_active=false,superseded_at=now() where is_active=true;
  insert into public.velmere_durable_computation_deployment_ledger(deployment_id,idempotency_key,action,state,is_active,deployment_fingerprint,capability_digest,provider_quality_digest,recovery_proof_digest,release_certificate_digest,release_bundle_digest,source_sha256,build_sha256,build_id_hash,exact_checkpoint,operator_hash,reason_hash)
  values(v_id,p_idempotency_key,'promote','promoted',true,p_deployment_fingerprint,p_capability_digest,p_provider_quality_digest,p_recovery_proof_digest,p_release_certificate_digest,p_release_bundle_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_operator_hash,p_reason_hash);
  if v_recovery_required then
    update public.velmere_provider_recovery_release_certificates set state='consumed',promotion_request_digest=p_idempotency_key,consumed_at=now(),updated_at=now() where certificate_digest=p_release_certificate_digest;
    update public.velmere_provider_recovery_release_bundles set state='consumed',promotion_request_digest=p_idempotency_key,consumed_at=now(),updated_at=now() where bundle_digest=p_release_bundle_digest;
  end if;
  return query select v_id,'promoted'::text,false;
end $$;
revoke all on function public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,text,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,text,text,text,integer,text,text) to service_role;

-- Schema 4764: release bundle table and three RPC controls.
create or replace function public.velmere_probe_durable_computation_capabilities(p_expected_schema text,p_deployment_fingerprint text)
returns table(state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,service_role_table_grants integer,required_functions integer,present_functions integer,service_role_function_grants integer,deployment_fingerprint text,capability_digest text)
language plpgsql security definer set search_path=public stable as $$
declare
  v_tables text[]:=array['velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events','velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger','velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents','velmere_provider_quality_rollback_executions','velmere_provider_quality_recovery_proofs','velmere_provider_recovery_smoke_receipts','velmere_provider_recovery_release_certificates','velmere_provider_recovery_release_bundles'];
  v_functions text[]:=array['velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation','velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned','velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance','velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert','velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter','velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts','velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities','velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment','velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation','velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert','velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action','velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action','velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback','velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status','velmere_record_provider_quality_recovery_proof','velmere_verify_provider_quality_recovery_proof','velmere_get_provider_quality_recovery_proof_status','velmere_record_provider_recovery_smoke_receipt','velmere_get_provider_recovery_smoke_receipt_status','velmere_record_provider_recovery_release_certificate','velmere_verify_provider_recovery_release_certificate','velmere_get_provider_recovery_release_certificate_status','velmere_record_provider_recovery_release_bundle','velmere_verify_provider_recovery_release_bundle','velmere_get_provider_recovery_release_bundle_status'];
  v_present_tables integer;v_rls_tables integer;v_table_grants integer;v_present_functions integer;v_function_grants integer;v_payload jsonb;
begin
  if p_expected_schema<>'velmere.durable-computation.schema.4764' then raise exception 'unexpected_schema_version';end if;
  if p_deployment_fingerprint is null or p_deployment_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint';end if;
  select count(*)::integer,count(*) filter(where c.relrowsecurity)::integer,count(*) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_table_privilege('service_role',c.oid,'SELECT'))::integer into v_present_tables,v_rls_tables,v_table_grants from unnest(v_tables)t(name) join pg_class c on c.oid=to_regclass('public.'||t.name);
  select count(distinct p.proname)::integer,count(distinct p.proname) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer into v_present_functions,v_function_grants from unnest(v_functions)f(name) join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
  v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4764','requiredTables',cardinality(v_tables),'presentTables',v_present_tables,'rlsTables',v_rls_tables,'serviceRoleTableGrants',v_table_grants,'requiredFunctions',cardinality(v_functions),'presentFunctions',v_present_functions,'serviceRoleFunctionGrants',v_function_grants,'deploymentFingerprint',p_deployment_fingerprint);
  return query select case when v_present_tables=cardinality(v_tables) and v_rls_tables=cardinality(v_tables) and v_table_grants=cardinality(v_tables) and v_present_functions=cardinality(v_functions) and v_function_grants=cardinality(v_functions) then 'ready' else 'mismatch' end,'velmere.durable-computation.schema.4764'::text,cardinality(v_tables),v_present_tables,v_rls_tables,v_table_grants,cardinality(v_functions),v_present_functions,v_function_grants,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end $$;
