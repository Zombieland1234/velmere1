-- PASS4763: one-time signed recovery release certificate and atomic promotion consumption.
create extension if not exists pgcrypto;

create table if not exists public.velmere_provider_recovery_release_certificates (
  certificate_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (idempotency_key ~ '^[a-f0-9]{64}$'),
  state text not null check (state in ('recorded','verified','consumed','expired','blocked')),
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
  operator_hash text not null check (operator_hash ~ '^[a-f0-9]{64}$'),
  reason_hash text not null check (reason_hash ~ '^[a-f0-9]{64}$'),
  approval_digest text not null check (approval_digest ~ '^[a-f0-9]{64}$'),
  certificate_digest text not null unique check (certificate_digest ~ '^[a-f0-9]{64}$'),
  promotion_request_digest text check (promotion_request_digest is null or promotion_request_digest ~ '^[a-f0-9]{64}$'),
  recorded_at timestamptz not null default now(),
  verified_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(rollback_execution_digest,source_sha256,build_sha256,recovery_proof_digest)
);
alter table public.velmere_provider_recovery_release_certificates enable row level security;
revoke all on public.velmere_provider_recovery_release_certificates from public,anon,authenticated;
grant select,insert,update on public.velmere_provider_recovery_release_certificates to service_role;
create index if not exists velmere_provider_recovery_release_certificate_status_idx on public.velmere_provider_recovery_release_certificates(state,expires_at desc);

create or replace function public.velmere_record_provider_recovery_release_certificate(
  p_idempotency_key text,p_rollback_execution_digest text,p_incident_digest text,p_quality_digest text,p_capability_digest text,
  p_source_sha256 text,p_build_sha256 text,p_build_id_hash text,p_exact_checkpoint integer,p_recovery_proof_digest text,
  p_customer_smoke_digest text,p_provider_smoke_digest text,p_operator_hash text,p_reason_hash text,p_approval_digest text,p_expires_at timestamptz
) returns table(state text,certificate_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.velmere_provider_recovery_release_certificates%rowtype;v_digest text;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_provider_recovery_release_certificate'));
  if p_idempotency_key !~ '^[a-f0-9]{64}$' or p_rollback_execution_digest !~ '^[a-f0-9]{64}$' or p_incident_digest !~ '^[a-f0-9]{64}$'
    or p_quality_digest !~ '^[a-f0-9]{64}$' or p_capability_digest !~ '^[a-f0-9]{64}$' or p_source_sha256 !~ '^[a-f0-9]{64}$'
    or p_build_sha256 !~ '^[a-f0-9]{64}$' or p_build_id_hash !~ '^[a-f0-9]{64}$' or p_recovery_proof_digest !~ '^[a-f0-9]{64}$'
    or p_customer_smoke_digest !~ '^[a-f0-9]{64}$' or p_provider_smoke_digest !~ '^[a-f0-9]{64}$' or p_operator_hash !~ '^[a-f0-9]{64}$'
    or p_reason_hash !~ '^[a-f0-9]{64}$' or p_approval_digest !~ '^[a-f0-9]{64}$' then raise exception 'provider_recovery_release_certificate_evidence_invalid';end if;
  if p_exact_checkpoint<4725 or p_expires_at<=now() or p_expires_at>now()+interval '30 minutes' then raise exception 'provider_recovery_release_certificate_freshness_invalid';end if;
  select * into v_existing from public.velmere_provider_recovery_release_certificates where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.state,v_existing.certificate_digest,true;return;end if;
  if not exists(select 1 from public.velmere_provider_quality_rollback_executions where verification_digest=p_rollback_execution_digest and state='verified') then raise exception 'provider_recovery_release_certificate_rollback_not_verified';end if;
  if not exists(select 1 from public.velmere_provider_quality_incidents where incident_digest=p_incident_digest and quality_digest=p_quality_digest and state='resolved' and release_hold=false and rollback_required=false and rollback_execution_required=false) then raise exception 'provider_recovery_release_certificate_incident_not_resolved';end if;
  if not exists(select 1 from public.velmere_provider_quality_recovery_proofs where proof_digest=p_recovery_proof_digest and state='verified' and rollback_execution_digest=p_rollback_execution_digest and incident_digest=p_incident_digest and quality_digest=p_quality_digest and capability_digest=p_capability_digest and source_sha256=p_source_sha256 and build_sha256=p_build_sha256 and exact_checkpoint=p_exact_checkpoint and customer_smoke_digest=p_customer_smoke_digest and provider_smoke_digest=p_provider_smoke_digest) then raise exception 'provider_recovery_release_certificate_proof_not_verified';end if;
  if not exists(select 1 from public.velmere_provider_recovery_smoke_receipts where receipt_digest=p_customer_smoke_digest and kind='customer_path' and verified=true and expires_at>now()) or not exists(select 1 from public.velmere_provider_recovery_smoke_receipts where receipt_digest=p_provider_smoke_digest and kind='provider_path' and verified=true and expires_at>now()) then raise exception 'provider_recovery_release_certificate_smoke_not_fresh';end if;
  if exists(select 1 from public.velmere_durable_computation_deployment_ledger where is_active=true and state='promoted') then raise exception 'provider_recovery_release_certificate_active_deployment_present';end if;
  v_digest:=encode(digest(concat_ws('|','velmere.provider-recovery-release-certificate.v1',p_rollback_execution_digest,p_incident_digest,p_quality_digest,p_capability_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_recovery_proof_digest,p_customer_smoke_digest,p_provider_smoke_digest,p_approval_digest,extract(epoch from p_expires_at)::bigint),'sha256'),'hex');
  insert into public.velmere_provider_recovery_release_certificates(idempotency_key,state,rollback_execution_digest,incident_digest,quality_digest,capability_digest,source_sha256,build_sha256,build_id_hash,exact_checkpoint,recovery_proof_digest,customer_smoke_digest,provider_smoke_digest,operator_hash,reason_hash,approval_digest,certificate_digest,expires_at)
  values(p_idempotency_key,'recorded',p_rollback_execution_digest,p_incident_digest,p_quality_digest,p_capability_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_recovery_proof_digest,p_customer_smoke_digest,p_provider_smoke_digest,p_operator_hash,p_reason_hash,p_approval_digest,v_digest,p_expires_at);
  return query select 'recorded'::text,v_digest,false;
end $$;

create or replace function public.velmere_verify_provider_recovery_release_certificate(
  p_certificate_digest text,p_idempotency_key text,p_rollback_execution_digest text,p_incident_digest text,p_quality_digest text,p_capability_digest text,
  p_source_sha256 text,p_build_sha256 text,p_build_id_hash text,p_exact_checkpoint integer,p_recovery_proof_digest text,
  p_customer_smoke_digest text,p_provider_smoke_digest text,p_operator_hash text,p_reason_hash text,p_approval_digest text,p_expires_at timestamptz
) returns table(state text,certificate_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_row public.velmere_provider_recovery_release_certificates%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_provider_recovery_release_certificate'));
  select * into v_row from public.velmere_provider_recovery_release_certificates where certificate_digest=p_certificate_digest for update;
  if not found then raise exception 'provider_recovery_release_certificate_missing';end if;
  if v_row.idempotency_key<>p_idempotency_key or v_row.rollback_execution_digest<>p_rollback_execution_digest or v_row.incident_digest<>p_incident_digest or v_row.quality_digest<>p_quality_digest or v_row.capability_digest<>p_capability_digest or v_row.source_sha256<>p_source_sha256 or v_row.build_sha256<>p_build_sha256 or v_row.build_id_hash<>p_build_id_hash or v_row.exact_checkpoint<>p_exact_checkpoint or v_row.recovery_proof_digest<>p_recovery_proof_digest or v_row.customer_smoke_digest<>p_customer_smoke_digest or v_row.provider_smoke_digest<>p_provider_smoke_digest or v_row.operator_hash<>p_operator_hash or v_row.reason_hash<>p_reason_hash or v_row.approval_digest<>p_approval_digest or v_row.expires_at<>p_expires_at then raise exception 'provider_recovery_release_certificate_mismatch';end if;
  if v_row.state='verified' then return query select 'verified'::text,v_row.certificate_digest,true;return;end if;
  if v_row.expires_at<=now() then update public.velmere_provider_recovery_release_certificates set state='expired',updated_at=now() where certificate_id=v_row.certificate_id;raise exception 'provider_recovery_release_certificate_expired';end if;
  update public.velmere_provider_recovery_release_certificates set state='verified',verified_at=now(),updated_at=now() where certificate_id=v_row.certificate_id;
  return query select 'verified'::text,v_row.certificate_digest,false;
end $$;

create or replace function public.velmere_get_provider_recovery_release_certificate_status(
  p_rollback_execution_digest text,p_incident_digest text,p_quality_digest text,p_capability_digest text,p_source_sha256 text,p_build_sha256 text,p_build_id_hash text,p_exact_checkpoint integer,p_recovery_proof_digest text,p_customer_smoke_digest text,p_provider_smoke_digest text,p_now timestamptz default now()
) returns table(state text,certificate_digest text,expires_at timestamptz,blockers text[])
language plpgsql security definer set search_path=public as $$
declare v_row public.velmere_provider_recovery_release_certificates%rowtype;v_blockers text[]:=array[]::text[];
begin
  select * into v_row from public.velmere_provider_recovery_release_certificates where rollback_execution_digest=p_rollback_execution_digest and incident_digest=p_incident_digest and quality_digest=p_quality_digest and capability_digest=p_capability_digest and source_sha256=p_source_sha256 and build_sha256=p_build_sha256 and build_id_hash=p_build_id_hash and exact_checkpoint=p_exact_checkpoint and recovery_proof_digest=p_recovery_proof_digest and customer_smoke_digest=p_customer_smoke_digest and provider_smoke_digest=p_provider_smoke_digest order by created_at desc limit 1;
  if not found then return query select 'missing'::text,null::text,null::timestamptz,array['provider_recovery_release_certificate_missing']::text[];return;end if;
  if v_row.state='consumed' then return query select 'consumed'::text,v_row.certificate_digest,v_row.expires_at,array['provider_recovery_release_certificate_consumed']::text[];return;end if;
  if v_row.expires_at<=p_now then return query select 'expired'::text,v_row.certificate_digest,v_row.expires_at,array['provider_recovery_release_certificate_expired']::text[];return;end if;
  if v_row.state<>'verified' then v_blockers:=array_append(v_blockers,'provider_recovery_release_certificate_not_verified');end if;
  return query select v_row.state,v_row.certificate_digest,v_row.expires_at,v_blockers;
end $$;

revoke all on function public.velmere_record_provider_recovery_release_certificate(text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.velmere_verify_provider_recovery_release_certificate(text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.velmere_get_provider_recovery_release_certificate_status(text,text,text,text,text,text,text,integer,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.velmere_record_provider_recovery_release_certificate(text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,timestamptz) to service_role;
grant execute on function public.velmere_verify_provider_recovery_release_certificate(text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,timestamptz) to service_role;
grant execute on function public.velmere_get_provider_recovery_release_certificate_status(text,text,text,text,text,text,text,integer,text,text,text,timestamptz) to service_role;

alter table public.velmere_durable_computation_deployment_ledger add column if not exists release_certificate_digest text;
alter table public.velmere_durable_computation_deployment_ledger drop constraint if exists velmere_durable_computation_release_certificate_digest_check;
alter table public.velmere_durable_computation_deployment_ledger add constraint velmere_durable_computation_release_certificate_digest_check check (release_certificate_digest is null or release_certificate_digest ~ '^[a-f0-9]{64}$');

-- Replace promotion so a post-rollback certificate is consumed exactly once in the same transaction.
drop function if exists public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,text,text,integer,text,text);
create or replace function public.velmere_promote_durable_computation_deployment(
  p_idempotency_key text,p_deployment_fingerprint text,p_capability_digest text,p_provider_quality_digest text,p_recovery_proof_digest text,p_release_certificate_digest text,
  p_source_sha256 text,p_build_sha256 text,p_build_id_hash text,p_exact_checkpoint integer,p_operator_hash text,p_reason_hash text
) returns table(deployment_id uuid,state text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.velmere_durable_computation_deployment_ledger%rowtype;v_id uuid:=gen_random_uuid();v_recovery_required boolean;v_certificate public.velmere_provider_recovery_release_certificates%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_durable_computation_deployment_promotion'));
  perform pg_advisory_xact_lock(hashtext('velmere_provider_quality_recovery_proof'));
  perform pg_advisory_xact_lock(hashtext('velmere_provider_recovery_release_certificate'));
  select * into v_existing from public.velmere_durable_computation_deployment_ledger where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.deployment_id,v_existing.state,true;return;end if;
  if p_idempotency_key !~ '^[a-f0-9]{64}$' or p_deployment_fingerprint !~ '^[a-f0-9]{64}$' or p_capability_digest !~ '^[a-f0-9]{64}$' or p_provider_quality_digest !~ '^[a-f0-9]{64}$' or p_source_sha256 !~ '^[a-f0-9]{64}$' or p_build_sha256 !~ '^[a-f0-9]{64}$' or p_build_id_hash !~ '^[a-f0-9]{64}$' or p_operator_hash !~ '^[a-f0-9]{64}$' or p_reason_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_promotion_evidence';end if;
  select exists(select 1 from public.velmere_provider_quality_rollback_executions where state='verified') into v_recovery_required;
  if v_recovery_required then
    if p_recovery_proof_digest is null or p_release_certificate_digest is null then raise exception 'promotion_recovery_certificate_required';end if;
    select * into v_certificate from public.velmere_provider_recovery_release_certificates where certificate_digest=p_release_certificate_digest for update;
    if not found or v_certificate.state<>'verified' or v_certificate.expires_at<=now() then raise exception 'promotion_recovery_certificate_not_verified';end if;
    if v_certificate.recovery_proof_digest<>p_recovery_proof_digest or v_certificate.quality_digest<>p_provider_quality_digest or v_certificate.capability_digest<>p_capability_digest or v_certificate.source_sha256<>p_source_sha256 or v_certificate.build_sha256<>p_build_sha256 or v_certificate.build_id_hash<>p_build_id_hash or v_certificate.exact_checkpoint<>p_exact_checkpoint then raise exception 'promotion_recovery_certificate_mismatch';end if;
  end if;
  if exists(select 1 from public.velmere_provider_quality_incidents where incident_key='provider_quality' and (state not in ('healthy','resolved') or release_hold or rollback_required or rollback_execution_required)) then raise exception 'promotion_provider_incident_not_recovered';end if;
  update public.velmere_durable_computation_deployment_ledger set is_active=false,superseded_at=now() where is_active=true;
  insert into public.velmere_durable_computation_deployment_ledger(deployment_id,idempotency_key,action,state,is_active,deployment_fingerprint,capability_digest,provider_quality_digest,recovery_proof_digest,release_certificate_digest,source_sha256,build_sha256,build_id_hash,exact_checkpoint,operator_hash,reason_hash)
  values(v_id,p_idempotency_key,'promote','promoted',true,p_deployment_fingerprint,p_capability_digest,p_provider_quality_digest,p_recovery_proof_digest,p_release_certificate_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_operator_hash,p_reason_hash);
  if v_recovery_required then update public.velmere_provider_recovery_release_certificates set state='consumed',promotion_request_digest=p_idempotency_key,consumed_at=now(),updated_at=now() where certificate_digest=p_release_certificate_digest;end if;
  return query select v_id,'promoted'::text,false;
end $$;
revoke all on function public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,text,text,integer,text,text) to service_role;

-- Schema 4763: add release certificate table and three RPC controls.
create or replace function public.velmere_probe_durable_computation_capabilities(p_expected_schema text,p_deployment_fingerprint text)
returns table(state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,service_role_table_grants integer,required_functions integer,present_functions integer,service_role_function_grants integer,deployment_fingerprint text,capability_digest text)
language plpgsql security definer set search_path=public stable as $$
declare
  v_tables text[]:=array['velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events','velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger','velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents','velmere_provider_quality_rollback_executions','velmere_provider_quality_recovery_proofs','velmere_provider_recovery_smoke_receipts','velmere_provider_recovery_release_certificates'];
  v_functions text[]:=array['velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation','velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned','velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance','velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert','velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter','velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts','velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities','velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment','velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation','velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert','velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action','velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action','velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback','velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status','velmere_record_provider_quality_recovery_proof','velmere_verify_provider_quality_recovery_proof','velmere_get_provider_quality_recovery_proof_status','velmere_record_provider_recovery_smoke_receipt','velmere_get_provider_recovery_smoke_receipt_status','velmere_record_provider_recovery_release_certificate','velmere_verify_provider_recovery_release_certificate','velmere_get_provider_recovery_release_certificate_status'];
  v_present_tables integer;v_rls_tables integer;v_table_grants integer;v_present_functions integer;v_function_grants integer;v_payload jsonb;
begin
  if p_expected_schema<>'velmere.durable-computation.schema.4763' then raise exception 'unexpected_schema_version';end if;
  if p_deployment_fingerprint is null or p_deployment_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint';end if;
  select count(*)::integer,count(*) filter(where c.relrowsecurity)::integer,count(*) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_table_privilege('service_role',c.oid,'SELECT'))::integer into v_present_tables,v_rls_tables,v_table_grants from unnest(v_tables)t(name) join pg_class c on c.oid=to_regclass('public.'||t.name);
  select count(distinct p.proname)::integer,count(distinct p.proname) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer into v_present_functions,v_function_grants from unnest(v_functions)f(name) join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
  v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4763','requiredTables',cardinality(v_tables),'presentTables',v_present_tables,'rlsTables',v_rls_tables,'serviceRoleTableGrants',v_table_grants,'requiredFunctions',cardinality(v_functions),'presentFunctions',v_present_functions,'serviceRoleFunctionGrants',v_function_grants,'deploymentFingerprint',p_deployment_fingerprint);
  return query select case when v_present_tables=cardinality(v_tables) and v_rls_tables=cardinality(v_tables) and v_table_grants=cardinality(v_tables) and v_present_functions=cardinality(v_functions) and v_function_grants=cardinality(v_functions) then 'ready' else 'mismatch' end,'velmere.durable-computation.schema.4763'::text,cardinality(v_tables),v_present_tables,v_rls_tables,v_table_grants,cardinality(v_functions),v_present_functions,v_function_grants,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end $$;
