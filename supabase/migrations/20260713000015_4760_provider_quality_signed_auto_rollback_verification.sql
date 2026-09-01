-- PASS4760: signed provider-quality auto-rollback execution, atomic ledger mutation and post-rollback verification.

create extension if not exists pgcrypto;

alter table public.velmere_provider_quality_incidents
  add column if not exists rollback_execution_required boolean not null default false,
  add column if not exists rollback_execution_verified_at timestamptz,
  add column if not exists rollback_execution_digest text;

alter table public.velmere_provider_quality_incidents
  drop constraint if exists velmere_provider_quality_incident_rollback_execution_digest_check;
alter table public.velmere_provider_quality_incidents
  add constraint velmere_provider_quality_incident_rollback_execution_digest_check
  check (rollback_execution_digest is null or rollback_execution_digest ~ '^[a-f0-9]{64}$');

create table if not exists public.velmere_provider_quality_rollback_executions (
  execution_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (idempotency_key ~ '^[a-f0-9]{64}$'),
  state text not null check (state in ('applied','verified','conflict')),
  target_deployment_id uuid not null references public.velmere_durable_computation_deployment_ledger(deployment_id),
  rollback_deployment_id uuid references public.velmere_durable_computation_deployment_ledger(deployment_id),
  incident_digest text not null check (incident_digest ~ '^[a-f0-9]{64}$'),
  quality_digest text not null check (quality_digest ~ '^[a-f0-9]{64}$'),
  authorization_digest text not null check (authorization_digest ~ '^[a-f0-9]{64}$'),
  signature_digest text not null check (signature_digest ~ '^[a-f0-9]{64}$'),
  verification_digest text check (verification_digest is null or verification_digest ~ '^[a-f0-9]{64}$'),
  applied_at timestamptz not null default now(),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.velmere_provider_quality_rollback_executions enable row level security;
revoke all on table public.velmere_provider_quality_rollback_executions from public,anon,authenticated;
grant select,insert,update on table public.velmere_provider_quality_rollback_executions to service_role;

create index if not exists velmere_provider_quality_rollback_execution_history_idx
  on public.velmere_provider_quality_rollback_executions(created_at desc);
create unique index if not exists velmere_provider_quality_one_verified_rollback_per_target_idx
  on public.velmere_provider_quality_rollback_executions(target_deployment_id)
  where state='verified';

create or replace function public.velmere_get_provider_quality_auto_rollback_context()
returns table(
  state text,
  incident_digest text,
  quality_digest text,
  target_deployment_id uuid,
  deployment_fingerprint text,
  capability_digest text,
  provider_quality_digest text,
  source_sha256 text,
  build_sha256 text,
  build_id_hash text,
  exact_checkpoint integer,
  incident_age_seconds integer
)
language plpgsql security definer set search_path = public stable as $$
declare
  v_incident public.velmere_provider_quality_incidents%rowtype;
  v_target public.velmere_durable_computation_deployment_ledger%rowtype;
begin
  select * into v_incident from public.velmere_provider_quality_incidents where incident_key='provider_quality';
  if not found or not v_incident.rollback_required then
    return query select 'not_required'::text,
      coalesce(v_incident.incident_digest,encode(digest('provider_quality_no_incident'::text,'sha256'),'hex')),
      coalesce(v_incident.quality_digest,encode(digest('provider_quality_no_quality'::text,'sha256'),'hex')),
      null::uuid,null::text,null::text,null::text,null::text,null::text,null::text,null::integer,0;
    return;
  end if;
  select * into v_target from public.velmere_durable_computation_deployment_ledger
    where is_active=true and action='promote' and state='promoted'
    order by applied_at desc limit 1;
  if not found or not v_incident.release_hold or v_incident.severity<>'critical' then
    return query select 'blocked'::text,v_incident.incident_digest,v_incident.quality_digest,
      null::uuid,null::text,null::text,null::text,null::text,null::text,null::text,null::integer,
      case when v_incident.first_seen_at is null then 0 else greatest(0,extract(epoch from(now()-v_incident.first_seen_at))::integer) end;
    return;
  end if;
  return query select 'ready'::text,v_incident.incident_digest,v_incident.quality_digest,
    v_target.deployment_id,v_target.deployment_fingerprint,v_target.capability_digest,v_target.provider_quality_digest,
    v_target.source_sha256,v_target.build_sha256,v_target.build_id_hash,v_target.exact_checkpoint,
    case when v_incident.first_seen_at is null then 0 else greatest(0,extract(epoch from(now()-v_incident.first_seen_at))::integer) end;
end $$;

create or replace function public.velmere_execute_provider_quality_auto_rollback(
  p_idempotency_key text,
  p_expected_incident_digest text,
  p_expected_quality_digest text,
  p_target_deployment_id uuid,
  p_authorization_digest text,
  p_signature_digest text
) returns table(execution_id uuid,rollback_deployment_id uuid,state text,idempotent boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_existing public.velmere_provider_quality_rollback_executions%rowtype;
  v_incident public.velmere_provider_quality_incidents%rowtype;
  v_target public.velmere_durable_computation_deployment_ledger%rowtype;
  v_execution_id uuid:=gen_random_uuid();
  v_rollback_id uuid:=gen_random_uuid();
  v_operator_hash text:=encode(digest('provider_quality_auto_rollback_service'::text,'sha256'),'hex');
  v_reason_hash text;
  v_incident_digest text;
begin
  if p_idempotency_key !~ '^[a-f0-9]{64}$' or p_expected_incident_digest !~ '^[a-f0-9]{64}$'
     or p_expected_quality_digest !~ '^[a-f0-9]{64}$' or p_authorization_digest !~ '^[a-f0-9]{64}$'
     or p_signature_digest !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_auto_rollback_evidence'; end if;

  perform pg_advisory_xact_lock(hashtext('velmere_provider_quality_incident'));
  perform pg_advisory_xact_lock(hashtext('velmere_durable_computation_deployment_promotion'));

  select * into v_existing from public.velmere_provider_quality_rollback_executions where idempotency_key=p_idempotency_key;
  if found then
    return query select v_existing.execution_id,v_existing.rollback_deployment_id,v_existing.state,true;
    return;
  end if;

  select * into v_incident from public.velmere_provider_quality_incidents
    where incident_key='provider_quality' for update;
  if not found or v_incident.incident_digest<>p_expected_incident_digest
     or v_incident.quality_digest<>p_expected_quality_digest
     or not v_incident.release_hold or not v_incident.rollback_required or v_incident.severity<>'critical'
  then raise exception 'auto_rollback_incident_not_ready'; end if;

  select * into v_target from public.velmere_durable_computation_deployment_ledger
    where deployment_id=p_target_deployment_id and is_active=true and action='promote' and state='promoted'
    for update;
  if not found then raise exception 'auto_rollback_target_not_active'; end if;

  v_reason_hash:=encode(digest(('provider_quality_sla_breach|'||p_expected_incident_digest)::text,'sha256'),'hex');

  update public.velmere_durable_computation_deployment_ledger
    set is_active=false,superseded_at=now()
    where deployment_id=p_target_deployment_id;

  insert into public.velmere_durable_computation_deployment_ledger(
    deployment_id,idempotency_key,action,state,is_active,deployment_fingerprint,capability_digest,provider_quality_digest,
    source_sha256,build_sha256,build_id_hash,exact_checkpoint,operator_hash,reason_hash,target_deployment_id
  ) values(
    v_rollback_id,p_idempotency_key,'rollback','rolled_back',false,v_target.deployment_fingerprint,v_target.capability_digest,
    v_target.provider_quality_digest,v_target.source_sha256,v_target.build_sha256,v_target.build_id_hash,v_target.exact_checkpoint,
    v_operator_hash,v_reason_hash,p_target_deployment_id
  );

  insert into public.velmere_provider_quality_rollback_executions(
    execution_id,idempotency_key,state,target_deployment_id,rollback_deployment_id,incident_digest,quality_digest,
    authorization_digest,signature_digest
  ) values(
    v_execution_id,p_idempotency_key,'applied',p_target_deployment_id,v_rollback_id,p_expected_incident_digest,
    p_expected_quality_digest,p_authorization_digest,p_signature_digest
  );

  v_incident_digest:=encode(digest(jsonb_build_object(
    'previousDigest',v_incident.incident_digest,'qualityDigest',v_incident.quality_digest,'releaseHold',true,
    'rollbackRequired',false,'rollbackExecutionRequired',true,'executionId',v_execution_id
  )::text,'sha256'),'hex');
  update public.velmere_provider_quality_incidents set
    rollback_required=false,rollback_execution_required=true,rollback_execution_verified_at=null,
    rollback_execution_digest=null,incident_digest=v_incident_digest,updated_at=now()
  where incident_key='provider_quality';

  return query select v_execution_id,v_rollback_id,'applied'::text,false;
end $$;

create or replace function public.velmere_verify_provider_quality_auto_rollback(
  p_execution_id uuid,
  p_expected_incident_digest text,
  p_expected_quality_digest text
) returns table(state text,verification_digest text,idempotent boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_execution public.velmere_provider_quality_rollback_executions%rowtype;
  v_incident public.velmere_provider_quality_incidents%rowtype;
  v_verification_digest text;
  v_incident_digest text;
begin
  if p_expected_incident_digest !~ '^[a-f0-9]{64}$' or p_expected_quality_digest !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_auto_rollback_verification_evidence'; end if;
  perform pg_advisory_xact_lock(hashtext('velmere_provider_quality_incident'));
  perform pg_advisory_xact_lock(hashtext('velmere_durable_computation_deployment_promotion'));

  select * into v_execution from public.velmere_provider_quality_rollback_executions
    where execution_id=p_execution_id for update;
  if not found or v_execution.incident_digest<>p_expected_incident_digest or v_execution.quality_digest<>p_expected_quality_digest
  then raise exception 'auto_rollback_execution_mismatch'; end if;
  if v_execution.state='verified' then
    return query select 'verified'::text,v_execution.verification_digest,true;
    return;
  end if;
  if v_execution.state<>'applied' then raise exception 'auto_rollback_execution_not_applied'; end if;
  if exists(select 1 from public.velmere_durable_computation_deployment_ledger where deployment_id=v_execution.target_deployment_id and is_active=true)
  then raise exception 'auto_rollback_target_still_active'; end if;
  if not exists(select 1 from public.velmere_durable_computation_deployment_ledger
    where deployment_id=v_execution.rollback_deployment_id and action='rollback' and state='rolled_back'
      and target_deployment_id=v_execution.target_deployment_id)
  then raise exception 'auto_rollback_ledger_receipt_missing'; end if;
  if exists(select 1 from public.velmere_durable_computation_deployment_ledger where is_active=true and state='promoted')
  then raise exception 'auto_rollback_new_active_deployment_detected'; end if;

  v_verification_digest:=encode(digest(jsonb_build_object(
    'executionId',v_execution.execution_id,'targetDeploymentId',v_execution.target_deployment_id,
    'rollbackDeploymentId',v_execution.rollback_deployment_id,'incidentDigest',v_execution.incident_digest,
    'qualityDigest',v_execution.quality_digest,'targetInactive',true,'rollbackLedgerPresent',true,'activePromotions',0
  )::text,'sha256'),'hex');
  update public.velmere_provider_quality_rollback_executions set
    state='verified',verification_digest=v_verification_digest,verified_at=now(),updated_at=now()
  where execution_id=p_execution_id;

  select * into v_incident from public.velmere_provider_quality_incidents where incident_key='provider_quality' for update;
  v_incident_digest:=encode(digest(jsonb_build_object(
    'previousDigest',v_incident.incident_digest,'qualityDigest',v_incident.quality_digest,'releaseHold',true,
    'rollbackRequired',false,'rollbackExecutionRequired',false,'verificationDigest',v_verification_digest
  )::text,'sha256'),'hex');
  update public.velmere_provider_quality_incidents set
    rollback_execution_required=false,rollback_execution_verified_at=now(),rollback_execution_digest=v_verification_digest,
    incident_digest=v_incident_digest,updated_at=now()
  where incident_key='provider_quality';

  return query select 'verified'::text,v_verification_digest,false;
end $$;

create or replace function public.velmere_get_provider_quality_auto_rollback_status()
returns table(
  state text,incident_state text,release_hold boolean,rollback_required boolean,execution_verified boolean,
  incident_digest text,quality_digest text,execution_digest text
)
language sql security definer set search_path = public stable as $$
  with incident as (
    select * from public.velmere_provider_quality_incidents where incident_key='provider_quality'
  ), latest as (
    select * from public.velmere_provider_quality_rollback_executions order by created_at desc limit 1
  )
  select
    case
      when not exists(select 1 from latest) and coalesce(i.rollback_required,false) then 'required'
      when not exists(select 1 from latest) then 'idle'
      when l.state='verified' then 'verified'
      when l.state='applied' then 'applied'
      else 'blocked'
    end,
    coalesce(i.state,'healthy'),coalesce(i.release_hold,false),coalesce(i.rollback_required,false),
    coalesce(l.state='verified',false),
    coalesce(i.incident_digest,encode(digest('provider_quality_healthy'::text,'sha256'),'hex')),
    coalesce(i.quality_digest,encode(digest('provider_quality_no_quality'::text,'sha256'),'hex')),
    l.verification_digest
  from (select 1 as singleton) base
  left join incident i on true
  left join latest l on true
  limit 1;
$$;

-- Resolution is fail-closed until every required rollback execution has a verified receipt.
create or replace function public.velmere_apply_provider_quality_incident_action(
  p_action text,
  p_expected_incident_digest text,
  p_expected_quality_digest text,
  p_operator_hash text,
  p_reason_hash text,
  p_approval_digest text,
  p_quality_ready boolean
) returns table(state text,release_hold boolean,rollback_required boolean,incident_digest text)
language plpgsql security definer set search_path = public as $$
declare
  v_row public.velmere_provider_quality_incidents%rowtype;
  v_state text;v_hold boolean;v_rollback boolean;v_digest text;v_stable_age integer;
begin
  if p_action not in ('acknowledge','start_recovery','resolve') then raise exception 'invalid_incident_action'; end if;
  if p_expected_incident_digest !~ '^[a-f0-9]{64}$' or p_expected_quality_digest !~ '^[a-f0-9]{64}$'
     or p_operator_hash !~ '^[a-f0-9]{64}$' or p_reason_hash !~ '^[a-f0-9]{64}$' or p_approval_digest !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_incident_action_evidence'; end if;
  perform pg_advisory_xact_lock(hashtext('velmere_provider_quality_incident'));
  select * into v_row from public.velmere_provider_quality_incidents where incident_key='provider_quality' for update;
  if not found then raise exception 'provider_incident_missing'; end if;
  if v_row.incident_digest<>p_expected_incident_digest or v_row.quality_digest<>p_expected_quality_digest then raise exception 'provider_incident_digest_mismatch'; end if;
  if p_action='acknowledge' then
    if v_row.state not in ('open','acknowledged') then raise exception 'provider_incident_not_acknowledgeable'; end if;
    v_state:='acknowledged';v_hold:=true;v_rollback:=v_row.rollback_required;
  elsif p_action='start_recovery' then
    if not p_quality_ready or v_row.state not in ('open','acknowledged','recovery_pending') then raise exception 'provider_incident_recovery_not_ready'; end if;
    if v_row.rollback_execution_required then raise exception 'provider_incident_rollback_verification_pending'; end if;
    v_state:='recovery_pending';v_hold:=true;v_rollback:=false;
  else
    v_stable_age:=case when v_row.healthy_since is null then 0 else greatest(0,extract(epoch from(now()-v_row.healthy_since))::integer) end;
    if not p_quality_ready or v_row.state<>'recovery_pending' or v_stable_age<900 then raise exception 'provider_incident_resolution_not_ready'; end if;
    if v_row.rollback_execution_required then raise exception 'provider_incident_rollback_verification_pending'; end if;
    v_state:='resolved';v_hold:=false;v_rollback:=false;
  end if;
  v_digest:=encode(digest(jsonb_build_object(
    'state',v_state,'qualityDigest',v_row.quality_digest,'releaseHold',v_hold,'rollbackRequired',v_rollback,
    'previousDigest',v_row.incident_digest,'approvalDigest',p_approval_digest,
    'rollbackExecutionDigest',v_row.rollback_execution_digest
  )::text,'sha256'),'hex');
  update public.velmere_provider_quality_incidents set
    state=v_state,release_hold=v_hold,rollback_required=v_rollback,incident_digest=v_digest,
    acknowledged_at=case when p_action='acknowledge' then now() else acknowledged_at end,
    recovery_started_at=case when p_action='start_recovery' then now() else recovery_started_at end,
    resolved_at=case when p_action='resolve' then now() else resolved_at end,
    operator_hash=p_operator_hash,reason_hash=p_reason_hash,approval_digest=p_approval_digest,updated_at=now()
  where incident_key='provider_quality';
  return query select v_state,v_hold,v_rollback,v_digest;
end $$;

revoke all on function public.velmere_get_provider_quality_auto_rollback_context() from public,anon,authenticated;
revoke all on function public.velmere_execute_provider_quality_auto_rollback(text,text,text,uuid,text,text) from public,anon,authenticated;
revoke all on function public.velmere_verify_provider_quality_auto_rollback(uuid,text,text) from public,anon,authenticated;
revoke all on function public.velmere_get_provider_quality_auto_rollback_status() from public,anon,authenticated;
grant execute on function public.velmere_get_provider_quality_auto_rollback_context() to service_role;
grant execute on function public.velmere_execute_provider_quality_auto_rollback(text,text,text,uuid,text,text) to service_role;
grant execute on function public.velmere_verify_provider_quality_auto_rollback(uuid,text,text) to service_role;
grant execute on function public.velmere_get_provider_quality_auto_rollback_status() to service_role;

-- Expand staging capability proof for the auto-rollback execution ledger and four RPC controls.
create or replace function public.velmere_probe_durable_computation_capabilities(
  p_expected_schema text,
  p_deployment_fingerprint text
) returns table(
  state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,
  service_role_table_grants integer,required_functions integer,present_functions integer,
  service_role_function_grants integer,deployment_fingerprint text,capability_digest text
)
language plpgsql security definer set search_path = public stable as $$
declare
  v_tables text[]:=array[
    'velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events',
    'velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger',
    'velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents',
    'velmere_provider_quality_rollback_executions'
  ];
  v_functions text[]:=array[
    'velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation',
    'velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned',
    'velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance',
    'velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert',
    'velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter',
    'velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts',
    'velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities',
    'velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment',
    'velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation',
    'velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert',
    'velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action',
    'velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action',
    'velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback',
    'velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status'
  ];
  v_present_tables integer;v_rls_tables integer;v_table_grants integer;v_present_functions integer;v_function_grants integer;v_payload jsonb;
begin
  if p_expected_schema<>'velmere.durable-computation.schema.4760' then raise exception 'unexpected_schema_version'; end if;
  if p_deployment_fingerprint is null or p_deployment_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint'; end if;
  select count(*)::integer,count(*) filter(where c.relrowsecurity)::integer,
    count(*) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_table_privilege('service_role',c.oid,'SELECT'))::integer
    into v_present_tables,v_rls_tables,v_table_grants
  from unnest(v_tables)t(name) join pg_class c on c.oid=to_regclass('public.'||t.name);
  select count(distinct p.proname)::integer,
    count(distinct p.proname) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer
    into v_present_functions,v_function_grants
  from unnest(v_functions)f(name) join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
  v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4760','requiredTables',cardinality(v_tables),
    'presentTables',v_present_tables,'rlsTables',v_rls_tables,'serviceRoleTableGrants',v_table_grants,
    'requiredFunctions',cardinality(v_functions),'presentFunctions',v_present_functions,'serviceRoleFunctionGrants',v_function_grants,
    'deploymentFingerprint',p_deployment_fingerprint);
  return query select case when v_present_tables=cardinality(v_tables) and v_rls_tables=cardinality(v_tables)
    and v_table_grants=cardinality(v_tables) and v_present_functions=cardinality(v_functions)
    and v_function_grants=cardinality(v_functions) then 'ready' else 'mismatch' end,
    'velmere.durable-computation.schema.4760'::text,cardinality(v_tables),v_present_tables,v_rls_tables,v_table_grants,
    cardinality(v_functions),v_present_functions,v_function_grants,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end $$;
