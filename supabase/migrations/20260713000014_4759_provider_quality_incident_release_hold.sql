-- PASS4759: durable provider-quality incident workflow, release hold, SLA escalation and signed recovery chain.

create table if not exists public.velmere_provider_quality_incidents (
  incident_key text primary key default 'provider_quality',
  state text not null check (state in ('healthy','open','acknowledged','recovery_pending','resolved')),
  severity text not null check (severity in ('none','warning','critical')),
  quality_digest text not null check (quality_digest ~ '^[a-f0-9]{64}$'),
  incident_digest text not null check (incident_digest ~ '^[a-f0-9]{64}$'),
  release_hold boolean not null default false,
  rollback_required boolean not null default false,
  first_seen_at timestamptz,
  last_seen_at timestamptz not null default now(),
  healthy_since timestamptz,
  acknowledged_at timestamptz,
  recovery_started_at timestamptz,
  resolved_at timestamptz,
  operator_hash text check (operator_hash is null or operator_hash ~ '^[a-f0-9]{64}$'),
  reason_hash text check (reason_hash is null or reason_hash ~ '^[a-f0-9]{64}$'),
  approval_digest text check (approval_digest is null or approval_digest ~ '^[a-f0-9]{64}$'),
  updated_at timestamptz not null default now()
);

alter table public.velmere_provider_quality_incidents enable row level security;
revoke all on table public.velmere_provider_quality_incidents from public,anon,authenticated;
grant select,insert,update on table public.velmere_provider_quality_incidents to service_role;

alter table public.velmere_durable_computation_alert_outbox
  drop constraint if exists velmere_durable_computation_alert_outbox_code_check;
alter table public.velmere_durable_computation_alert_outbox
  add constraint velmere_durable_computation_alert_outbox_code_check
  check (code in (
    'dead_letter_nonzero','retry_backlog','expired_lease','old_ready_job','old_processing_lease',
    'provider_history_anomaly','provider_observation_retention_drift','provider_observation_ledger_stale',
    'provider_quality_auto_rollback_required'
  ));

create or replace function public.velmere_record_provider_observation_alert(
  p_code text,
  p_severity text,
  p_value integer,
  p_threshold integer
) returns table(state text)
language plpgsql security definer set search_path = public as $$
declare
  v_event_id uuid := gen_random_uuid();
  v_window timestamptz := date_trunc('hour',now());
  v_dedupe_key text;
begin
  if p_code not in (
    'provider_history_anomaly','provider_observation_retention_drift','provider_observation_ledger_stale',
    'provider_quality_auto_rollback_required'
  ) then raise exception 'invalid_provider_alert_code'; end if;
  if p_severity not in ('warning','critical') then raise exception 'invalid_provider_alert_severity'; end if;
  v_dedupe_key := encode(digest(p_code||'|'||v_window::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtext('velmere_provider_alert_'||p_code));
  if exists(select 1 from public.velmere_durable_computation_alert_outbox where dedupe_key_hash=v_dedupe_key) then
    return query select 'deduplicated'::text;
    return;
  end if;
  insert into public.velmere_durable_computation_operator_events(event_id,run_id,event_type,severity,code,value,threshold_value,metadata)
  values(v_event_id,null,'alert',p_severity,p_code,greatest(0,p_value),greatest(0,p_threshold),jsonb_build_object('source','provider_quality_incident'));
  insert into public.velmere_durable_computation_alert_outbox(alert_id,code,severity,observed_value,threshold_value,state,next_attempt_at,dedupe_window,dedupe_key_hash)
  values(v_event_id,p_code,p_severity,greatest(0,p_value),greatest(0,p_threshold),'pending',now(),v_window,v_dedupe_key);
  return query select 'recorded'::text;
end $$;

create or replace function public.velmere_reconcile_provider_quality_incident(
  p_quality_digest text,
  p_quality_ready boolean,
  p_requested_severity text,
  p_warning_after_seconds integer,
  p_critical_after_seconds integer,
  p_rollback_after_seconds integer,
  p_recovery_stable_seconds integer
) returns table(
  state text,severity text,release_hold boolean,rollback_required boolean,
  active_deployment_present boolean,incident_age_seconds integer,quality_stable_age_seconds integer,
  opened_incidents integer,resolved_incidents integer,incident_digest text
)
language plpgsql security definer set search_path = public as $$
declare
  v_row public.velmere_provider_quality_incidents%rowtype;
  v_now timestamptz := now();
  v_age integer := 0;
  v_stable_age integer := 0;
  v_severity text;
  v_state text;
  v_hold boolean;
  v_rollback boolean;
  v_active boolean;
  v_digest text;
begin
  if p_quality_digest !~ '^[a-f0-9]{64}$' then raise exception 'invalid_quality_digest'; end if;
  if p_requested_severity not in ('none','warning','critical') then raise exception 'invalid_incident_severity'; end if;
  if p_warning_after_seconds<60 or p_critical_after_seconds<p_warning_after_seconds
     or p_rollback_after_seconds<p_critical_after_seconds or p_recovery_stable_seconds<120
  then raise exception 'invalid_incident_policy'; end if;
  perform pg_advisory_xact_lock(hashtext('velmere_provider_quality_incident'));
  select * into v_row from public.velmere_provider_quality_incidents where incident_key='provider_quality' for update;
  if not found then
    v_state := case when p_quality_ready then 'healthy' else 'open' end;
    v_severity := case when p_quality_ready then 'none' else p_requested_severity end;
    v_hold := not p_quality_ready;
    v_rollback := false;
    insert into public.velmere_provider_quality_incidents(
      incident_key,state,severity,quality_digest,incident_digest,release_hold,rollback_required,
      first_seen_at,last_seen_at,healthy_since,updated_at
    ) values(
      'provider_quality',v_state,v_severity,p_quality_digest,repeat('0',64),v_hold,v_rollback,
      case when p_quality_ready then null else v_now end,v_now,case when p_quality_ready then v_now else null end,v_now
    ) returning * into v_row;
  end if;

  if p_quality_ready then
    if v_row.healthy_since is null then v_row.healthy_since := v_now; end if;
    v_stable_age := greatest(0,extract(epoch from(v_now-v_row.healthy_since))::integer);
    v_age := case when v_row.first_seen_at is null then 0 else greatest(0,extract(epoch from(v_now-v_row.first_seen_at))::integer) end;
    if v_row.state in ('open','acknowledged','recovery_pending') then
      v_state := case when v_row.state='open' then 'open' else v_row.state end;
      v_hold := true;
      v_severity := case when v_row.severity='critical' then 'critical' else 'warning' end;
    else
      v_state := v_row.state;
      v_hold := false;
      v_severity := 'none';
    end if;
    v_rollback := false;
  else
    if v_row.first_seen_at is null or v_row.state in ('healthy','resolved') then v_row.first_seen_at := v_now; end if;
    v_age := greatest(0,extract(epoch from(v_now-v_row.first_seen_at))::integer);
    v_stable_age := 0;
    v_row.healthy_since := null;
    v_state := case when v_row.state in ('acknowledged','recovery_pending') then v_row.state else 'open' end;
    v_severity := case
      when p_requested_severity='critical' or v_age>=p_critical_after_seconds then 'critical'
      when p_requested_severity='warning' or v_age>=p_warning_after_seconds then 'warning'
      else 'warning'
    end;
    v_hold := true;
    v_rollback := v_severity='critical' and v_age>=p_rollback_after_seconds
      and exists(select 1 from public.velmere_durable_computation_deployment_ledger where is_active=true and state='promoted');
  end if;

  v_active := exists(select 1 from public.velmere_durable_computation_deployment_ledger where is_active=true and state='promoted');
  v_digest := encode(digest(jsonb_build_object(
    'state',v_state,'severity',v_severity,'qualityDigest',p_quality_digest,'releaseHold',v_hold,
    'rollbackRequired',v_rollback,'firstSeenAt',v_row.first_seen_at,'healthySince',v_row.healthy_since
  )::text,'sha256'),'hex');

  update public.velmere_provider_quality_incidents set
    state=v_state,severity=v_severity,quality_digest=p_quality_digest,incident_digest=v_digest,
    release_hold=v_hold,rollback_required=v_rollback,first_seen_at=v_row.first_seen_at,last_seen_at=v_now,
    healthy_since=v_row.healthy_since,updated_at=v_now
  where incident_key='provider_quality';

  return query select v_state,v_severity,v_hold,v_rollback,v_active,v_age,v_stable_age,
    case when v_state in ('open','acknowledged','recovery_pending') then 1 else 0 end,
    case when v_state='resolved' then 1 else 0 end,v_digest;
end $$;

create or replace function public.velmere_get_provider_quality_incident_snapshot()
returns table(
  state text,severity text,release_hold boolean,rollback_required boolean,
  active_deployment_present boolean,incident_age_seconds integer,quality_stable_age_seconds integer,
  opened_incidents integer,resolved_incidents integer,incident_digest text
)
language sql security definer set search_path = public stable as $$
  select i.state,i.severity,i.release_hold,i.rollback_required,
    exists(select 1 from public.velmere_durable_computation_deployment_ledger d where d.is_active=true and d.state='promoted'),
    case when i.first_seen_at is null then 0 else greatest(0,extract(epoch from(now()-i.first_seen_at))::integer) end,
    case when i.healthy_since is null then 0 else greatest(0,extract(epoch from(now()-i.healthy_since))::integer) end,
    case when i.state in ('open','acknowledged','recovery_pending') then 1 else 0 end,
    case when i.state='resolved' then 1 else 0 end,
    i.incident_digest
  from public.velmere_provider_quality_incidents i where i.incident_key='provider_quality'
  union all
  select 'healthy','none',false,false,
    exists(select 1 from public.velmere_durable_computation_deployment_ledger d where d.is_active=true and d.state='promoted'),
    0,0,0,0,encode(digest('provider_quality_healthy'::text,'sha256'),'hex')
  where not exists(select 1 from public.velmere_provider_quality_incidents where incident_key='provider_quality')
  limit 1;
$$;

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
  v_state text;
  v_hold boolean;
  v_rollback boolean;
  v_digest text;
  v_stable_age integer;
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
    v_state:='recovery_pending';v_hold:=true;v_rollback:=false;
  else
    v_stable_age:=case when v_row.healthy_since is null then 0 else greatest(0,extract(epoch from(now()-v_row.healthy_since))::integer) end;
    if not p_quality_ready or v_row.state<>'recovery_pending' or v_stable_age<900 then raise exception 'provider_incident_resolution_not_ready'; end if;
    v_state:='resolved';v_hold:=false;v_rollback:=false;
  end if;

  v_digest:=encode(digest(jsonb_build_object(
    'state',v_state,'qualityDigest',v_row.quality_digest,'releaseHold',v_hold,'rollbackRequired',v_rollback,
    'previousDigest',v_row.incident_digest,'approvalDigest',p_approval_digest
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

revoke all on function public.velmere_reconcile_provider_quality_incident(text,boolean,text,integer,integer,integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_get_provider_quality_incident_snapshot() from public,anon,authenticated;
revoke all on function public.velmere_apply_provider_quality_incident_action(text,text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.velmere_reconcile_provider_quality_incident(text,boolean,text,integer,integer,integer,integer) to service_role;
grant execute on function public.velmere_get_provider_quality_incident_snapshot() to service_role;
grant execute on function public.velmere_apply_provider_quality_incident_action(text,text,text,text,text,text,boolean) to service_role;

-- Expand staging capability proof to include incident state and recovery controls.
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
    'velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents'
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
    'velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action'
  ];
  v_present_tables integer;v_rls_tables integer;v_table_grants integer;v_present_functions integer;v_function_grants integer;v_payload jsonb;
begin
  if p_expected_schema<>'velmere.durable-computation.schema.4759' then raise exception 'unexpected_schema_version'; end if;
  if p_deployment_fingerprint is null or p_deployment_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint'; end if;
  select count(*)::integer,count(*) filter(where c.relrowsecurity)::integer,
    count(*) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_table_privilege('service_role',c.oid,'SELECT'))::integer
    into v_present_tables,v_rls_tables,v_table_grants
  from unnest(v_tables)t(name) join pg_class c on c.oid=to_regclass('public.'||t.name);
  select count(distinct p.proname)::integer,
    count(distinct p.proname) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer
    into v_present_functions,v_function_grants
  from unnest(v_functions)f(name) join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
  v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4759','requiredTables',cardinality(v_tables),
    'presentTables',v_present_tables,'rlsTables',v_rls_tables,'serviceRoleTableGrants',v_table_grants,
    'requiredFunctions',cardinality(v_functions),'presentFunctions',v_present_functions,'serviceRoleFunctionGrants',v_function_grants,
    'deploymentFingerprint',p_deployment_fingerprint);
  return query select case when v_present_tables=cardinality(v_tables) and v_rls_tables=cardinality(v_tables)
    and v_table_grants=cardinality(v_tables) and v_present_functions=cardinality(v_functions)
    and v_function_grants=cardinality(v_functions) then 'ready' else 'mismatch' end,
    'velmere.durable-computation.schema.4759'::text,cardinality(v_tables),v_present_tables,v_rls_tables,v_table_grants,
    cardinality(v_functions),v_present_functions,v_function_grants,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end $$;
