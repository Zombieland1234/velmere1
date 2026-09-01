-- PASS4703: globally leased, bounded reconciliation worker and durable dead-letter lifecycle.
-- Service-role only. Aggregate outputs only.

alter table public.velmere_stripe_webhook_effects
  drop constraint if exists velmere_stripe_webhook_effects_status_check;
alter table public.velmere_stripe_webhook_effects
  add constraint velmere_stripe_webhook_effects_status_check
  check (status in ('processing', 'completed', 'retryable_failed', 'dead_letter'));
alter table public.velmere_stripe_webhook_effects
  add column if not exists next_retry_at timestamptz,
  add column if not exists dead_lettered_at timestamptz,
  add column if not exists dead_letter_reason_code text,
  add column if not exists reconciliation_count integer not null default 0;
create index if not exists velmere_stripe_webhook_effect_retry_idx
  on public.velmere_stripe_webhook_effects(status, next_retry_at, attempt_count);

create table if not exists public.velmere_stripe_webhook_reconciliation_runs (
  run_id text primary key,
  state text not null check (state in ('completed')),
  scanned_count integer not null, stale_released_count integer not null,
  retry_ready_count integer not null, dead_lettered_count integer not null,
  completed_without_event_count integer not null,
  started_at timestamptz not null, finished_at timestamptz not null default now()
);
alter table public.velmere_stripe_webhook_reconciliation_runs enable row level security;

create or replace function public.velmere_run_stripe_webhook_reconciliation_worker(
  p_stale_after_seconds integer default 300,
  p_retry_threshold integer default 5,
  p_limit integer default 100,
  p_run_id text default null
)
returns table(
  lease_acquired boolean,
  scanned_count integer,
  stale_released_count integer,
  retry_ready_count integer,
  dead_lettered_count integer,
  completed_without_event_count integer,
  oldest_processing_age_seconds integer,
  error_buckets jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stale_after integer := greatest(60, least(coalesce(p_stale_after_seconds, 300), 86400));
  v_retry_threshold integer := greatest(2, least(coalesce(p_retry_threshold, 5), 50));
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 500));
  v_lock boolean := false;
  v_scanned integer := 0;
  v_released integer := 0;
  v_retry_ready integer := 0;
  v_dead integer := 0;
  v_orphan integer := 0;
  v_oldest integer := null;
  v_buckets jsonb := '{}'::jsonb;
begin
  if p_run_id is null or length(p_run_id) < 16 or length(p_run_id) > 80 then
    raise exception 'invalid_worker_run_id';
  end if;
  v_lock := pg_try_advisory_xact_lock(hashtext('velmere_stripe_webhook_reconciliation_worker_v1'));
  if not v_lock then
    return query select false, 0, 0, 0, 0, 0, null::integer,
      jsonb_build_object('provider',0,'storage',0,'entitlement',0,'order',0,'other',0);
    return;
  end if;

  with candidates as (
    select event_id, effect_key
    from public.velmere_stripe_webhook_effects
    where status = 'processing'
      and claimed_at <= now() - make_interval(secs => v_stale_after)
    order by claimed_at asc
    for update skip locked
    limit v_limit
  ), released as (
    update public.velmere_stripe_webhook_effects e
    set status = 'retryable_failed', lease_token = null,
        last_error_code = 'stale_effect_lease_released',
        next_retry_at = now() + make_interval(secs => least(3600, greatest(30, e.attempt_count * 30))),
        reconciliation_count = reconciliation_count + 1, updated_at = now()
    from candidates c
    where e.event_id = c.event_id and e.effect_key = c.effect_key
    returning 1
  ) select count(*)::integer into v_released from released;

  with candidates as (
    select event_id, effect_key
    from public.velmere_stripe_webhook_effects
    where status = 'retryable_failed' and attempt_count >= v_retry_threshold
    order by updated_at asc
    for update skip locked
    limit v_limit
  ), dead as (
    update public.velmere_stripe_webhook_effects e
    set status = 'dead_letter', lease_token = null, next_retry_at = null,
        dead_lettered_at = now(), dead_letter_reason_code = left(coalesce(last_error_code,'retry_threshold_exhausted'),160),
        reconciliation_count = reconciliation_count + 1, updated_at = now()
    from candidates c
    where e.event_id = c.event_id and e.effect_key = c.effect_key
    returning 1
  ) select count(*)::integer into v_dead from dead;

  select count(*)::integer into v_scanned
  from public.velmere_stripe_webhook_effects
  where status in ('processing','retryable_failed','dead_letter');

  select count(*)::integer into v_retry_ready
  from public.velmere_stripe_webhook_effects
  where status = 'retryable_failed' and attempt_count < v_retry_threshold
    and (next_retry_at is null or next_retry_at <= now());

  select count(*)::integer into v_orphan
  from public.velmere_stripe_webhook_effects effects
  left join public.velmere_stripe_webhook_events events on events.id = effects.event_id
  where effects.status = 'completed' and coalesce(events.status,'missing') <> 'processed';

  select max(extract(epoch from (now() - claimed_at)))::integer into v_oldest
  from public.velmere_stripe_webhook_effects where status = 'processing';

  select jsonb_build_object(
    'provider', count(*) filter (where last_error_code ~ '(provider|printful)'),
    'storage', count(*) filter (where last_error_code ~ '(storage|supabase)'),
    'entitlement', count(*) filter (where last_error_code ~ '(entitlement|audit)'),
    'order', count(*) filter (where last_error_code ~ '(order|fulfilment)'),
    'other', count(*) filter (where last_error_code is null or last_error_code !~ '(provider|printful|storage|supabase|entitlement|audit|order|fulfilment)')
  ) into v_buckets
  from public.velmere_stripe_webhook_effects
  where status in ('retryable_failed','dead_letter');

  insert into public.velmere_stripe_webhook_reconciliation_runs(
    run_id,state,scanned_count,stale_released_count,retry_ready_count,dead_lettered_count,completed_without_event_count,started_at,finished_at
  ) values(p_run_id,'completed',v_scanned,v_released,v_retry_ready,v_dead,v_orphan,now(),now())
  on conflict(run_id) do nothing;
  return query select true, v_scanned, v_released, v_retry_ready, v_dead, v_orphan, v_oldest, v_buckets;
end;
$$;

-- Dead-lettered effects cannot be silently reclaimed by Stripe retries.
create or replace function public.velmere_claim_stripe_webhook_effect(
  p_event_id text, p_event_type text, p_effect_key text,
  p_requested_lease_token text, p_stale_after_seconds integer default 300
)
returns table(claimed boolean,status text,attempt_count integer,lease_token text,retry_after_seconds integer,result_json jsonb)
language plpgsql security definer set search_path = public
as $$
declare v_row public.velmere_stripe_webhook_effects%rowtype; v_now timestamptz := now(); v_inserted integer := 0;
begin
  if p_event_id is null or length(p_event_id)<1 or length(p_event_id)>180 then raise exception 'invalid_event_id'; end if;
  if p_effect_key is null or p_effect_key !~ '^[a-z0-9][a-z0-9:_-]{0,119}$' then raise exception 'invalid_effect_key'; end if;
  if p_requested_lease_token is null or length(p_requested_lease_token)<16 then raise exception 'invalid_lease_token'; end if;
  insert into public.velmere_stripe_webhook_effects(event_id,effect_key,event_type,status,attempt_count,lease_token,claimed_at,updated_at)
  values(p_event_id,p_effect_key,p_event_type,'processing',1,p_requested_lease_token,v_now,v_now)
  on conflict(event_id,effect_key) do nothing; get diagnostics v_inserted=row_count;
  if v_inserted=1 then return query select true,'processing'::text,1,p_requested_lease_token,null::integer,null::jsonb; return; end if;
  select * into v_row from public.velmere_stripe_webhook_effects where event_id=p_event_id and effect_key=p_effect_key for update;
  if v_row.status='completed' then return query select false,'completed'::text,v_row.attempt_count,null::text,null::integer,v_row.result_json; return; end if;
  if v_row.status='dead_letter' then return query select false,'dead_letter'::text,v_row.attempt_count,null::text,null::integer,null::jsonb; return; end if;
  if v_row.status='retryable_failed' and v_row.next_retry_at is not null and v_row.next_retry_at>v_now then
    return query select false,'processing'::text,v_row.attempt_count,null::text,greatest(1,extract(epoch from(v_row.next_retry_at-v_now))::integer),null::jsonb; return;
  end if;
  if v_row.status='processing' and v_row.claimed_at>v_now-make_interval(secs=>greatest(1,p_stale_after_seconds)) then
    return query select false,'processing'::text,v_row.attempt_count,null::text,greatest(1,greatest(1,p_stale_after_seconds)-extract(epoch from(v_now-v_row.claimed_at))::integer),null::jsonb; return;
  end if;
  update public.velmere_stripe_webhook_effects set status='processing',attempt_count=attempt_count+1,lease_token=p_requested_lease_token,
    claimed_at=v_now,completed_at=null,last_error_code=null,next_retry_at=null,event_type=p_event_type,updated_at=v_now
  where event_id=p_event_id and effect_key=p_effect_key returning * into v_row;
  return query select true,v_row.status,v_row.attempt_count,v_row.lease_token,null::integer,null::jsonb;
end; $$;

revoke all on function public.velmere_run_stripe_webhook_reconciliation_worker(integer,integer,integer,text) from public,anon,authenticated;
grant execute on function public.velmere_run_stripe_webhook_reconciliation_worker(integer,integer,integer,text) to service_role;
revoke all on function public.velmere_claim_stripe_webhook_effect(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.velmere_claim_stripe_webhook_effect(text,text,text,text,integer) to service_role;


create table if not exists public.velmere_stripe_webhook_dead_letter_actions (
  request_id text primary key,
  event_id text not null,
  effect_key text not null,
  action text not null check (action in ('requeue')),
  reason_code text not null,
  created_at timestamptz not null default now()
);
alter table public.velmere_stripe_webhook_dead_letter_actions enable row level security;

create or replace function public.velmere_requeue_stripe_webhook_dead_letter(
  p_event_id text, p_effect_key text, p_request_id text, p_reason_code text
)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_existing public.velmere_stripe_webhook_dead_letter_actions%rowtype; v_updated integer := 0;
begin
  if p_event_id is null or length(p_event_id)<1 or length(p_event_id)>180 then raise exception 'invalid_event_id'; end if;
  if p_effect_key is null or p_effect_key !~ '^[a-z0-9][a-z0-9:_-]{0,119}$' then raise exception 'invalid_effect_key'; end if;
  if p_request_id is null or p_request_id !~ '^[a-zA-Z0-9][a-zA-Z0-9:_-]{7,119}$' then raise exception 'invalid_request_id'; end if;
  if p_reason_code is null or p_reason_code !~ '^[a-z0-9][a-z0-9:_-]{0,79}$' then raise exception 'invalid_reason_code'; end if;
  select * into v_existing from public.velmere_stripe_webhook_dead_letter_actions where request_id=p_request_id;
  if found then
    if v_existing.event_id=p_event_id and v_existing.effect_key=p_effect_key and v_existing.reason_code=p_reason_code then return 'already_requeued'; end if;
    raise exception 'request_id_conflict';
  end if;
  update public.velmere_stripe_webhook_effects
  set status='retryable_failed', attempt_count=0, lease_token=null, next_retry_at=now(),
      dead_lettered_at=null, dead_letter_reason_code=null,
      last_error_code='operator_requeued_dead_letter', reconciliation_count=reconciliation_count+1, updated_at=now()
  where event_id=p_event_id and effect_key=p_effect_key and status='dead_letter';
  get diagnostics v_updated=row_count;
  if v_updated=0 then return 'not_found'; end if;
  insert into public.velmere_stripe_webhook_dead_letter_actions(request_id,event_id,effect_key,action,reason_code)
  values(p_request_id,p_event_id,p_effect_key,'requeue',p_reason_code);
  return 'requeued';
end; $$;

revoke all on table public.velmere_stripe_webhook_reconciliation_runs from public,anon,authenticated;
revoke all on table public.velmere_stripe_webhook_dead_letter_actions from public,anon,authenticated;
revoke all on function public.velmere_requeue_stripe_webhook_dead_letter(text,text,text,text) from public,anon,authenticated;
grant execute on function public.velmere_requeue_stripe_webhook_dead_letter(text,text,text,text) to service_role;
