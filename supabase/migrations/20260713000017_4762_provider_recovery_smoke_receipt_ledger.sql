-- PASS4762: durable signed customer/provider recovery smoke receipts.
create table if not exists public.velmere_provider_recovery_smoke_receipts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('customer_path','provider_path')),
  rollback_execution_digest text not null check (rollback_execution_digest ~ '^[a-f0-9]{64}$'),
  incident_digest text not null check (incident_digest ~ '^[a-f0-9]{64}$'),
  quality_digest text not null check (quality_digest ~ '^[a-f0-9]{64}$'),
  capability_digest text not null check (capability_digest ~ '^[a-f0-9]{64}$'),
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  build_sha256 text not null check (build_sha256 ~ '^[a-f0-9]{64}$'),
  exact_checkpoint integer not null check (exact_checkpoint>=4725),
  result_digest text not null check (result_digest ~ '^[a-f0-9]{64}$'),
  receipt_digest text not null unique check (receipt_digest ~ '^[a-f0-9]{64}$'),
  approval_digest text not null check (approval_digest ~ '^[a-f0-9]{64}$'),
  checks_passed integer not null check (checks_passed>0),
  checks_total integer not null check (checks_total>0 and checks_passed<=checks_total),
  executed_at timestamptz not null,
  expires_at timestamptz not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique(kind,rollback_execution_digest,source_sha256,build_sha256,result_digest)
);
alter table public.velmere_provider_recovery_smoke_receipts enable row level security;
revoke all on public.velmere_provider_recovery_smoke_receipts from public,anon,authenticated;
grant select,insert,update on public.velmere_provider_recovery_smoke_receipts to service_role;
create index if not exists velmere_provider_recovery_smoke_chain_idx on public.velmere_provider_recovery_smoke_receipts(
  rollback_execution_digest,incident_digest,quality_digest,capability_digest,source_sha256,build_sha256,exact_checkpoint,kind,expires_at desc
);

create or replace function public.velmere_record_provider_recovery_smoke_receipt(
  p_kind text,p_rollback_execution_digest text,p_incident_digest text,p_quality_digest text,p_capability_digest text,
  p_source_sha256 text,p_build_sha256 text,p_exact_checkpoint integer,p_result_digest text,
  p_checks_passed integer,p_checks_total integer,p_executed_at timestamptz,p_expires_at timestamptz,p_approval_digest text
) returns table(verified boolean,receipt_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_digest text;v_existing public.velmere_provider_recovery_smoke_receipts%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_provider_recovery_smoke_receipt'));
  if p_kind not in ('customer_path','provider_path') then raise exception 'provider_recovery_smoke_kind_invalid'; end if;
  if p_rollback_execution_digest !~ '^[a-f0-9]{64}$' or p_incident_digest !~ '^[a-f0-9]{64}$'
    or p_quality_digest !~ '^[a-f0-9]{64}$' or p_capability_digest !~ '^[a-f0-9]{64}$'
    or p_source_sha256 !~ '^[a-f0-9]{64}$' or p_build_sha256 !~ '^[a-f0-9]{64}$'
    or p_result_digest !~ '^[a-f0-9]{64}$' or p_approval_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'provider_recovery_smoke_digest_invalid';
  end if;
  if p_exact_checkpoint<4725 or p_checks_total<=0 or p_checks_passed<>p_checks_total then raise exception 'provider_recovery_smoke_checks_failed'; end if;
  if p_executed_at>now()+interval '5 minutes' or p_executed_at<now()-interval '5 minutes'
    or p_expires_at<=now() or p_expires_at>p_executed_at+interval '1 hour' then raise exception 'provider_recovery_smoke_freshness_invalid'; end if;
  if not exists(select 1 from public.velmere_provider_quality_rollback_executions where verification_digest=p_rollback_execution_digest and state='verified') then
    raise exception 'provider_recovery_smoke_rollback_not_verified';
  end if;
  if not exists(select 1 from public.velmere_provider_quality_incidents where incident_digest=p_incident_digest and state='resolved' and release_hold=false and rollback_required=false) then
    raise exception 'provider_recovery_smoke_incident_not_resolved';
  end if;
  v_digest:=encode(digest(concat_ws('|','velmere.provider-recovery-smoke-receipt.v1',p_kind,p_rollback_execution_digest,p_incident_digest,p_quality_digest,p_capability_digest,p_source_sha256,p_build_sha256,p_exact_checkpoint,p_result_digest,p_checks_passed,p_checks_total,extract(epoch from p_executed_at)::bigint,extract(epoch from p_expires_at)::bigint,p_approval_digest),'sha256'),'hex');
  select * into v_existing from public.velmere_provider_recovery_smoke_receipts where receipt_digest=v_digest;
  if found then return query select v_existing.verified,v_existing.receipt_digest,true;return;end if;
  insert into public.velmere_provider_recovery_smoke_receipts(kind,rollback_execution_digest,incident_digest,quality_digest,capability_digest,source_sha256,build_sha256,exact_checkpoint,result_digest,receipt_digest,approval_digest,checks_passed,checks_total,executed_at,expires_at,verified)
  values(p_kind,p_rollback_execution_digest,p_incident_digest,p_quality_digest,p_capability_digest,p_source_sha256,p_build_sha256,p_exact_checkpoint,p_result_digest,v_digest,p_approval_digest,p_checks_passed,p_checks_total,p_executed_at,p_expires_at,true);
  return query select true,v_digest,false;
end $$;
revoke all on function public.velmere_record_provider_recovery_smoke_receipt(text,text,text,text,text,text,text,integer,text,integer,integer,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.velmere_record_provider_recovery_smoke_receipt(text,text,text,text,text,text,text,integer,text,integer,integer,timestamptz,timestamptz,text) to service_role;

create or replace function public.velmere_get_provider_recovery_smoke_receipt_status(
  p_rollback_execution_digest text,p_incident_digest text,p_quality_digest text,p_capability_digest text,
  p_source_sha256 text,p_build_sha256 text,p_exact_checkpoint integer,p_now timestamptz default now()
) returns table(ready boolean,customer_receipt_digest text,provider_receipt_digest text,blockers text[])
language plpgsql security definer set search_path=public stable as $$
declare v_customer text;v_provider text;v_blockers text[]:=array[]::text[];
begin
  select receipt_digest into v_customer from public.velmere_provider_recovery_smoke_receipts where kind='customer_path' and verified=true
    and rollback_execution_digest=p_rollback_execution_digest and incident_digest=p_incident_digest and quality_digest=p_quality_digest
    and capability_digest=p_capability_digest and source_sha256=p_source_sha256 and build_sha256=p_build_sha256 and exact_checkpoint=p_exact_checkpoint
    and expires_at>p_now order by executed_at desc limit 1;
  select receipt_digest into v_provider from public.velmere_provider_recovery_smoke_receipts where kind='provider_path' and verified=true
    and rollback_execution_digest=p_rollback_execution_digest and incident_digest=p_incident_digest and quality_digest=p_quality_digest
    and capability_digest=p_capability_digest and source_sha256=p_source_sha256 and build_sha256=p_build_sha256 and exact_checkpoint=p_exact_checkpoint
    and expires_at>p_now order by executed_at desc limit 1;
  if v_customer is null then v_blockers:=array_append(v_blockers,'provider_recovery_customer_smoke_missing_or_expired');end if;
  if v_provider is null then v_blockers:=array_append(v_blockers,'provider_recovery_provider_smoke_missing_or_expired');end if;
  return query select cardinality(v_blockers)=0,v_customer,v_provider,v_blockers;
end $$;
revoke all on function public.velmere_get_provider_recovery_smoke_receipt_status(text,text,text,text,text,text,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.velmere_get_provider_recovery_smoke_receipt_status(text,text,text,text,text,text,integer,timestamptz) to service_role;

-- Expand the capability proof to include the smoke ledger and its two controls.
create or replace function public.velmere_probe_durable_computation_capabilities(p_expected_schema text,p_deployment_fingerprint text)
returns table(state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,service_role_table_grants integer,required_functions integer,present_functions integer,service_role_function_grants integer,deployment_fingerprint text,capability_digest text)
language plpgsql security definer set search_path=public stable as $$
declare
  v_tables text[]:=array['velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events','velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger','velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents','velmere_provider_quality_rollback_executions','velmere_provider_quality_recovery_proofs','velmere_provider_recovery_smoke_receipts'];
  v_functions text[]:=array['velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation','velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned','velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance','velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert','velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter','velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts','velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities','velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment','velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation','velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert','velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action','velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action','velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback','velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status','velmere_record_provider_quality_recovery_proof','velmere_verify_provider_quality_recovery_proof','velmere_get_provider_quality_recovery_proof_status','velmere_record_provider_recovery_smoke_receipt','velmere_get_provider_recovery_smoke_receipt_status'];
  v_present_tables integer;v_rls_tables integer;v_table_grants integer;v_present_functions integer;v_function_grants integer;v_payload jsonb;
begin
  if p_expected_schema<>'velmere.durable-computation.schema.4762' then raise exception 'unexpected_schema_version';end if;
  if p_deployment_fingerprint is null or p_deployment_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint';end if;
  select count(*)::integer,count(*) filter(where c.relrowsecurity)::integer,count(*) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_table_privilege('service_role',c.oid,'SELECT'))::integer into v_present_tables,v_rls_tables,v_table_grants from unnest(v_tables)t(name) join pg_class c on c.oid=to_regclass('public.'||t.name);
  select count(distinct p.proname)::integer,count(distinct p.proname) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer into v_present_functions,v_function_grants from unnest(v_functions)f(name) join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
  v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4762','requiredTables',cardinality(v_tables),'presentTables',v_present_tables,'rlsTables',v_rls_tables,'serviceRoleTableGrants',v_table_grants,'requiredFunctions',cardinality(v_functions),'presentFunctions',v_present_functions,'serviceRoleFunctionGrants',v_function_grants,'deploymentFingerprint',p_deployment_fingerprint);
  return query select case when v_present_tables=cardinality(v_tables) and v_rls_tables=cardinality(v_tables) and v_table_grants=cardinality(v_tables) and v_present_functions=cardinality(v_functions) and v_function_grants=cardinality(v_functions) then 'ready' else 'mismatch' end,'velmere.durable-computation.schema.4762'::text,cardinality(v_tables),v_present_tables,v_rls_tables,v_table_grants,cardinality(v_functions),v_present_functions,v_function_grants,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end $$;
