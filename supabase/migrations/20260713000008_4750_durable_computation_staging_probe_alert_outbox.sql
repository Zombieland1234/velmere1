create extension if not exists pgcrypto;

create table if not exists public.velmere_durable_computation_alert_outbox (
  alert_id uuid primary key references public.velmere_durable_computation_operator_events(event_id) on delete cascade,
  code text not null check (code in ('dead_letter_nonzero','retry_backlog','expired_lease','old_ready_job','old_processing_lease')),
  severity text not null check (severity in ('warning','critical')),
  observed_value integer not null check (observed_value >= 0),
  threshold_value integer not null check (threshold_value >= 0),
  state text not null default 'pending' check (state in ('pending','processing','retry_wait','delivered','dead_letter')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 12),
  next_attempt_at timestamptz,
  worker_id_hash text,
  lease_token_hash text,
  lease_expires_at timestamptz,
  destination_hash text,
  last_http_status integer check (last_http_status is null or last_http_status between 100 and 599),
  last_error_code text check (last_error_code is null or length(last_error_code) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz,
  dead_lettered_at timestamptz
);

alter table public.velmere_durable_computation_alert_outbox enable row level security;
revoke all on table public.velmere_durable_computation_alert_outbox from public, anon, authenticated;
grant select, insert, update, delete on table public.velmere_durable_computation_alert_outbox to service_role;

create index if not exists velmere_durable_alert_outbox_ready_idx
  on public.velmere_durable_computation_alert_outbox(state, next_attempt_at, created_at)
  where state in ('pending','retry_wait','processing');

create or replace function public.velmere_record_durable_computation_alert(
  p_run_id uuid,
  p_lease_token text,
  p_code text,
  p_severity text,
  p_value integer,
  p_threshold integer
) returns table(state text)
language plpgsql security definer set search_path = public as $$
declare
  v_event_id uuid := gen_random_uuid();
begin
  if p_code not in ('dead_letter_nonzero','retry_backlog','expired_lease','old_ready_job','old_processing_lease') then raise exception 'invalid_alert_code'; end if;
  if p_severity not in ('warning','critical') then raise exception 'invalid_alert_severity'; end if;
  if not exists(
    select 1 from public.velmere_durable_computation_maintenance_runs
    where run_id=p_run_id and state='processing'
      and lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex')
      and lease_expires_at > now()
  ) then raise exception 'invalid_maintenance_lease'; end if;

  insert into public.velmere_durable_computation_operator_events(
    event_id,run_id,event_type,severity,code,value,threshold_value
  ) values(
    v_event_id,p_run_id,'alert',p_severity,p_code,greatest(0,p_value),greatest(0,p_threshold)
  );

  insert into public.velmere_durable_computation_alert_outbox(
    alert_id,code,severity,observed_value,threshold_value,state,next_attempt_at
  ) values(
    v_event_id,p_code,p_severity,greatest(0,p_value),greatest(0,p_threshold),'pending',now()
  ) on conflict(alert_id) do nothing;

  return query select 'recorded'::text;
end $$;

create or replace function public.velmere_claim_durable_computation_alerts(
  p_worker_id text,
  p_lease_token text,
  p_limit integer,
  p_lease_seconds integer
) returns table(
  alert_id uuid,
  code text,
  severity text,
  observed_value integer,
  threshold_value integer,
  attempt_count integer
)
language plpgsql security definer set search_path = public as $$
declare
  v_limit integer := greatest(1,least(25,p_limit));
  v_lease_seconds integer := greatest(15,least(300,p_lease_seconds));
begin
  if p_worker_id is null or length(p_worker_id) < 8 or length(p_worker_id) > 160 then raise exception 'invalid_worker_id'; end if;
  if p_lease_token is null or length(p_lease_token) < 24 or length(p_lease_token) > 160 then raise exception 'invalid_lease_token'; end if;

  update public.velmere_durable_computation_alert_outbox
    set state='retry_wait',
        next_attempt_at=now(),
        worker_id_hash=null,
        lease_token_hash=null,
        lease_expires_at=null,
        updated_at=now()
    where state='processing' and lease_expires_at <= now();

  return query
  with candidates as (
    select a.alert_id
    from public.velmere_durable_computation_alert_outbox a
    where a.state in ('pending','retry_wait')
      and coalesce(a.next_attempt_at,now()) <= now()
    order by case when a.severity='critical' then 0 else 1 end, a.created_at asc
    limit v_limit
    for update skip locked
  ), claimed as (
    update public.velmere_durable_computation_alert_outbox a
      set state='processing',
          attempt_count=a.attempt_count+1,
          worker_id_hash=encode(digest(p_worker_id,'sha256'),'hex'),
          lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex'),
          lease_expires_at=now()+make_interval(secs=>v_lease_seconds),
          updated_at=now()
      from candidates c
      where a.alert_id=c.alert_id
      returning a.alert_id,a.code,a.severity,a.observed_value,a.threshold_value,a.attempt_count
  )
  select c.alert_id,c.code,c.severity,c.observed_value,c.threshold_value,c.attempt_count
  from claimed c;
end $$;

create or replace function public.velmere_settle_durable_computation_alert(
  p_alert_id uuid,
  p_lease_token text,
  p_outcome text,
  p_http_status integer,
  p_destination_hash text,
  p_error_code text
) returns table(state text)
language plpgsql security definer set search_path = public as $$
declare
  v_attempts integer;
  v_final_state text;
  v_delay_seconds integer;
begin
  if p_outcome not in ('delivered','retry','dead_letter') then raise exception 'invalid_alert_outcome'; end if;
  if p_lease_token is null or length(p_lease_token) < 24 or length(p_lease_token) > 160 then raise exception 'invalid_lease_token'; end if;
  if p_destination_hash is null or p_destination_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_destination_hash'; end if;
  if p_error_code is not null and (length(p_error_code) > 80 or p_error_code !~ '^[a-z0-9:_-]+$') then raise exception 'invalid_error_code'; end if;

  select attempt_count into v_attempts
  from public.velmere_durable_computation_alert_outbox
  where alert_id=p_alert_id
    and state='processing'
    and lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex')
    and lease_expires_at > now()
  for update;

  if not found then return query select 'conflict'::text; return; end if;

  if p_outcome='delivered' then
    v_final_state := 'delivered';
  elsif p_outcome='dead_letter' or v_attempts >= 8 then
    v_final_state := 'dead_letter';
  else
    v_final_state := 'retry_wait';
  end if;
  v_delay_seconds := least(3600, 30 * (2 ^ greatest(0,least(7,v_attempts-1))));

  update public.velmere_durable_computation_alert_outbox
    set state=v_final_state,
        next_attempt_at=case when v_final_state='retry_wait' then now()+make_interval(secs=>v_delay_seconds) else null end,
        destination_hash=p_destination_hash,
        last_http_status=case when p_http_status between 100 and 599 then p_http_status else null end,
        last_error_code=p_error_code,
        worker_id_hash=null,
        lease_token_hash=null,
        lease_expires_at=null,
        delivered_at=case when v_final_state='delivered' then now() else delivered_at end,
        dead_lettered_at=case when v_final_state='dead_letter' then now() else dead_lettered_at end,
        updated_at=now()
    where alert_id=p_alert_id;

  return query select v_final_state;
end $$;

create or replace function public.velmere_probe_durable_computation_capabilities(
  p_expected_schema text,
  p_deployment_fingerprint text
) returns table(
  state text,
  schema_version text,
  required_tables integer,
  present_tables integer,
  rls_tables integer,
  service_role_table_grants integer,
  required_functions integer,
  present_functions integer,
  service_role_function_grants integer,
  deployment_fingerprint text,
  capability_digest text
)
language plpgsql security definer set search_path = public stable as $$
declare
  v_tables text[] := array[
    'velmere_durable_computation_jobs',
    'velmere_durable_computation_maintenance_runs',
    'velmere_durable_computation_operator_events',
    'velmere_durable_computation_cycle_receipts',
    'velmere_durable_computation_alert_outbox'
  ];
  v_functions text[] := array[
    'velmere_claim_durable_computation',
    'velmere_complete_durable_computation',
    'velmere_fail_durable_computation',
    'velmere_claim_durable_computation_worker_batch_budgeted',
    'velmere_heartbeat_durable_computation_worker_owned',
    'velmere_release_durable_computation_worker_claims_budget',
    'velmere_claim_durable_computation_maintenance',
    'velmere_get_durable_computation_metrics',
    'velmere_cleanup_durable_computations',
    'velmere_record_durable_computation_alert',
    'velmere_finish_durable_computation_maintenance',
    'velmere_requeue_durable_computation_dead_letter',
    'velmere_record_durable_computation_cycle_receipt',
    'velmere_claim_durable_computation_alerts',
    'velmere_settle_durable_computation_alert',
    'velmere_probe_durable_computation_capabilities'
  ];
  v_present_tables integer;
  v_rls_tables integer;
  v_table_grants integer;
  v_present_functions integer;
  v_function_grants integer;
  v_payload jsonb;
begin
  if p_expected_schema <> 'velmere.durable-computation.schema.4750' then raise exception 'unexpected_schema_version'; end if;
  if p_deployment_fingerprint is null or p_deployment_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'invalid_deployment_fingerprint'; end if;

  select count(*)::integer,
         count(*) filter(where c.relrowsecurity)::integer,
         count(*) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_table_privilege('service_role',c.oid,'SELECT'))::integer
    into v_present_tables,v_rls_tables,v_table_grants
  from unnest(v_tables) t(name)
  join pg_class c on c.oid=to_regclass('public.'||t.name);

  select count(distinct p.proname)::integer,
         count(distinct p.proname) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer
    into v_present_functions,v_function_grants
  from unnest(v_functions) f(name)
  join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;

  v_payload := jsonb_build_object(
    'schema','velmere.durable-computation.schema.4750',
    'requiredTables',cardinality(v_tables),
    'presentTables',v_present_tables,
    'rlsTables',v_rls_tables,
    'serviceRoleTableGrants',v_table_grants,
    'requiredFunctions',cardinality(v_functions),
    'presentFunctions',v_present_functions,
    'serviceRoleFunctionGrants',v_function_grants,
    'deploymentFingerprint',p_deployment_fingerprint
  );

  return query select
    case when v_present_tables=cardinality(v_tables)
           and v_rls_tables=cardinality(v_tables)
           and v_table_grants=cardinality(v_tables)
           and v_present_functions=cardinality(v_functions)
           and v_function_grants=cardinality(v_functions)
         then 'ready' else 'mismatch' end,
    'velmere.durable-computation.schema.4750'::text,
    cardinality(v_tables),v_present_tables,v_rls_tables,v_table_grants,
    cardinality(v_functions),v_present_functions,v_function_grants,
    p_deployment_fingerprint,
    encode(digest(v_payload::text,'sha256'),'hex');
end $$;

revoke all on function public.velmere_record_durable_computation_alert(uuid,text,text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_claim_durable_computation_alerts(text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_settle_durable_computation_alert(uuid,text,text,integer,text,text) from public,anon,authenticated;
revoke all on function public.velmere_probe_durable_computation_capabilities(text,text) from public,anon,authenticated;
grant execute on function public.velmere_record_durable_computation_alert(uuid,text,text,text,integer,integer) to service_role;
grant execute on function public.velmere_claim_durable_computation_alerts(text,text,integer,integer) to service_role;
grant execute on function public.velmere_settle_durable_computation_alert(uuid,text,text,integer,text,text) to service_role;
grant execute on function public.velmere_probe_durable_computation_capabilities(text,text) to service_role;
