create extension if not exists pgcrypto;

alter table public.velmere_durable_computation_jobs
  add column if not exists operator_replay_count integer not null default 0 check (operator_replay_count >= 0),
  add column if not exists last_operator_hash text,
  add column if not exists last_requeue_reason_hash text,
  add column if not exists last_operator_requeued_at timestamptz;

create table if not exists public.velmere_durable_computation_maintenance_runs (
  run_id uuid primary key,
  state text not null check (state in ('processing','completed','expired')),
  lease_token_hash text not null,
  lease_expires_at timestamptz not null,
  summary jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.velmere_durable_computation_operator_events (
  event_id uuid primary key default gen_random_uuid(),
  run_id uuid,
  event_type text not null check (event_type in ('cleanup','alert','dead_letter_requeue')),
  severity text check (severity is null or severity in ('warning','critical')),
  code text not null,
  value integer,
  threshold_value integer,
  job_id_hash text,
  operator_hash text,
  reason_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.velmere_durable_computation_maintenance_runs enable row level security;
alter table public.velmere_durable_computation_operator_events enable row level security;
revoke all on table public.velmere_durable_computation_maintenance_runs from public, anon, authenticated;
revoke all on table public.velmere_durable_computation_operator_events from public, anon, authenticated;
grant all on table public.velmere_durable_computation_maintenance_runs to service_role;
grant all on table public.velmere_durable_computation_operator_events to service_role;

create index if not exists velmere_durable_computation_maintenance_state_lease_idx
  on public.velmere_durable_computation_maintenance_runs(state, lease_expires_at);
create index if not exists velmere_durable_computation_operator_events_created_idx
  on public.velmere_durable_computation_operator_events(created_at desc, event_type);

create or replace function public.velmere_claim_durable_computation_maintenance(
  p_run_id uuid,
  p_lease_token text,
  p_lease_seconds integer
) returns table(state text)
language plpgsql security definer set search_path = public as $$
declare
  v_now timestamptz := now();
begin
  if p_run_id is null then raise exception 'invalid_run_id'; end if;
  if p_lease_token is null or length(p_lease_token) < 24 or length(p_lease_token) > 120 then raise exception 'invalid_lease_token'; end if;
  perform pg_advisory_xact_lock(hashtext('velmere_durable_computation_maintenance'));
  update public.velmere_durable_computation_maintenance_runs
    set state='expired'
    where state='processing' and lease_expires_at <= v_now;
  if exists(select 1 from public.velmere_durable_computation_maintenance_runs where state='processing' and lease_expires_at > v_now) then
    return query select 'busy'::text;
    return;
  end if;
  insert into public.velmere_durable_computation_maintenance_runs(run_id,state,lease_token_hash,lease_expires_at)
  values(
    p_run_id,
    'processing',
    encode(digest(p_lease_token,'sha256'),'hex'),
    v_now + make_interval(secs => greatest(15, least(300, p_lease_seconds)))
  );
  return query select 'claimed'::text;
end $$;

create or replace function public.velmere_get_durable_computation_metrics()
returns table(
  processing integer,
  retry_wait integer,
  dead_letter integer,
  completed_retained integer,
  ready_for_retry integer,
  expired_leases integer,
  oldest_ready_age_seconds integer,
  oldest_lease_age_seconds integer,
  by_kind jsonb
)
language sql security definer set search_path = public stable as $$
  with aggregate_counts as (
    select
      count(*) filter (where state='processing')::integer as processing,
      count(*) filter (where state='retry_wait')::integer as retry_wait,
      count(*) filter (where state='dead_letter')::integer as dead_letter,
      count(*) filter (where state='completed')::integer as completed_retained,
      count(*) filter (where state='retry_wait' and coalesce(next_attempt_at, now()) <= now())::integer as ready_for_retry,
      count(*) filter (where state='processing' and coalesce(lease_expires_at, now()) <= now())::integer as expired_leases,
      coalesce(max(extract(epoch from (now()-coalesce(next_attempt_at,updated_at)))) filter (where state='retry_wait' and coalesce(next_attempt_at,now()) <= now()),0)::integer as oldest_ready_age_seconds,
      coalesce(max(extract(epoch from (now()-coalesce(lease_expires_at,updated_at)))) filter (where state='processing' and coalesce(lease_expires_at,now()) <= now()),0)::integer as oldest_lease_age_seconds
    from public.velmere_durable_computation_jobs
  ), kind_counts as (
    select kind, jsonb_build_object(
      'processing', count(*) filter (where state='processing')::integer,
      'retry_wait', count(*) filter (where state='retry_wait')::integer,
      'dead_letter', count(*) filter (where state='dead_letter')::integer,
      'completed_retained', count(*) filter (where state='completed')::integer
    ) as metrics
    from public.velmere_durable_computation_jobs
    group by kind
  )
  select
    a.processing,
    a.retry_wait,
    a.dead_letter,
    a.completed_retained,
    a.ready_for_retry,
    a.expired_leases,
    greatest(0,a.oldest_ready_age_seconds),
    greatest(0,a.oldest_lease_age_seconds),
    coalesce((select jsonb_object_agg(kind,metrics) from kind_counts),'{}'::jsonb)
  from aggregate_counts a;
$$;

create or replace function public.velmere_cleanup_durable_computations(
  p_run_id uuid,
  p_lease_token text,
  p_completed_retention_days integer,
  p_dead_letter_retention_days integer,
  p_limit integer
) returns table(cleaned_completed_count integer, cleaned_dead_letter_count integer)
language plpgsql security definer set search_path = public as $$
declare
  v_completed integer := 0;
  v_dead_letter integer := 0;
  v_limit integer := greatest(1,least(5000,p_limit));
begin
  if not exists(
    select 1 from public.velmere_durable_computation_maintenance_runs
    where run_id=p_run_id and state='processing'
      and lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex')
      and lease_expires_at > now()
  ) then raise exception 'invalid_maintenance_lease'; end if;

  with candidates as (
    select job_id from public.velmere_durable_computation_jobs
    where state='completed' and completed_at < now()-make_interval(days=>greatest(1,least(365,p_completed_retention_days)))
    order by completed_at asc
    limit v_limit
    for update skip locked
  ), deleted as (
    delete from public.velmere_durable_computation_jobs j using candidates c
    where j.job_id=c.job_id returning 1
  ) select count(*)::integer into v_completed from deleted;

  with candidates as (
    select job_id from public.velmere_durable_computation_jobs
    where state='dead_letter' and dead_lettered_at < now()-make_interval(days=>greatest(7,least(730,p_dead_letter_retention_days)))
    order by dead_lettered_at asc
    limit greatest(0,v_limit-v_completed)
    for update skip locked
  ), deleted as (
    delete from public.velmere_durable_computation_jobs j using candidates c
    where j.job_id=c.job_id returning 1
  ) select count(*)::integer into v_dead_letter from deleted;

  insert into public.velmere_durable_computation_operator_events(run_id,event_type,code,value,metadata)
  values(p_run_id,'cleanup','bounded_retention_cleanup',v_completed+v_dead_letter,
    jsonb_build_object('completed',v_completed,'dead_letter',v_dead_letter,'limit',v_limit));
  return query select v_completed,v_dead_letter;
end $$;

create or replace function public.velmere_record_durable_computation_alert(
  p_run_id uuid,
  p_lease_token text,
  p_code text,
  p_severity text,
  p_value integer,
  p_threshold integer
) returns table(state text)
language plpgsql security definer set search_path = public as $$
begin
  if p_code not in ('dead_letter_nonzero','retry_backlog','expired_lease','old_ready_job','old_processing_lease') then raise exception 'invalid_alert_code'; end if;
  if p_severity not in ('warning','critical') then raise exception 'invalid_alert_severity'; end if;
  if not exists(
    select 1 from public.velmere_durable_computation_maintenance_runs
    where run_id=p_run_id and state='processing'
      and lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex')
      and lease_expires_at > now()
  ) then raise exception 'invalid_maintenance_lease'; end if;
  insert into public.velmere_durable_computation_operator_events(run_id,event_type,severity,code,value,threshold_value)
  values(p_run_id,'alert',p_severity,p_code,greatest(0,p_value),greatest(0,p_threshold));
  return query select 'recorded'::text;
end $$;

create or replace function public.velmere_finish_durable_computation_maintenance(
  p_run_id uuid,
  p_lease_token text,
  p_summary jsonb
) returns table(state text)
language plpgsql security definer set search_path = public as $$
begin
  if pg_column_size(p_summary) > 65536 then raise exception 'summary_too_large'; end if;
  update public.velmere_durable_computation_maintenance_runs
    set state='completed',summary=p_summary,completed_at=now(),lease_expires_at=now()
    where run_id=p_run_id and state='processing'
      and lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex')
      and lease_expires_at > now();
  if not found then return query select 'conflict'::text; else return query select 'completed'::text; end if;
end $$;

create or replace function public.velmere_requeue_durable_computation_dead_letter(
  p_job_id text,
  p_operator_hash text,
  p_reason_hash text
) returns table(state text)
language plpgsql security definer set search_path = public as $$
declare
  v_state text;
begin
  if p_job_id !~ '^dcj_[0-9a-f]{48}$' then raise exception 'invalid_job_id'; end if;
  if p_operator_hash !~ '^[0-9a-f]{64}$' or p_reason_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_operator_hash'; end if;
  select state into v_state from public.velmere_durable_computation_jobs where job_id=p_job_id for update;
  if not found then return query select 'not_found'::text; return; end if;
  if v_state <> 'dead_letter' then return query select 'not_dead_letter'::text; return; end if;
  update public.velmere_durable_computation_jobs
    set state='retry_wait',attempt_count=0,next_attempt_at=now(),dead_lettered_at=null,
        lease_token_hash=null,lease_expires_at=null,last_error_code=null,
        operator_replay_count=operator_replay_count+1,last_operator_hash=p_operator_hash,
        last_requeue_reason_hash=p_reason_hash,last_operator_requeued_at=now(),updated_at=now()
    where job_id=p_job_id;
  insert into public.velmere_durable_computation_operator_events(event_type,code,job_id_hash,operator_hash,reason_hash)
  values('dead_letter_requeue','operator_requeue',encode(digest(p_job_id,'sha256'),'hex'),p_operator_hash,p_reason_hash);
  return query select 'requeued'::text;
end $$;

revoke all on function public.velmere_claim_durable_computation_maintenance(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.velmere_get_durable_computation_metrics() from public,anon,authenticated;
revoke all on function public.velmere_cleanup_durable_computations(uuid,text,integer,integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_record_durable_computation_alert(uuid,text,text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_finish_durable_computation_maintenance(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.velmere_requeue_durable_computation_dead_letter(text,text,text) from public,anon,authenticated;
grant execute on function public.velmere_claim_durable_computation_maintenance(uuid,text,integer) to service_role;
grant execute on function public.velmere_get_durable_computation_metrics() to service_role;
grant execute on function public.velmere_cleanup_durable_computations(uuid,text,integer,integer,integer) to service_role;
grant execute on function public.velmere_record_durable_computation_alert(uuid,text,text,text,integer,integer) to service_role;
grant execute on function public.velmere_finish_durable_computation_maintenance(uuid,text,jsonb) to service_role;
grant execute on function public.velmere_requeue_durable_computation_dead_letter(text,text,text) to service_role;
