-- PASS4711: continuous Printful fulfilment provider-status synchronization.
-- Server-only queue, fenced worker lease, bounded retries/dead-letter and aggregate run receipts.

create table if not exists public.velmere_fulfilment_provider_sync_queue (
  sync_id text primary key,
  order_draft_id text not null references public.velmere_order_drafts(id) on delete cascade,
  external_id text not null,
  expected_provider_order_id text,
  previous_status text,
  pending_since timestamptz not null default now(),
  stale_after_hours integer not null default 48 check (stale_after_hours between 1 and 336),
  refund_expected boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending','processing','retryable_failed','completed','dead_letter','paused')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  lease_token text,
  claimed_at timestamptz,
  last_provider_status text,
  last_result_state text,
  last_action text,
  last_error_code text,
  completed_at timestamptz,
  dead_lettered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_draft_id)
);

create index if not exists velmere_fulfilment_provider_sync_due_idx
  on public.velmere_fulfilment_provider_sync_queue(status, next_attempt_at, updated_at);

create table if not exists public.velmere_fulfilment_provider_sync_worker_lock (
  lock_id text primary key,
  lease_token text,
  lease_expires_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.velmere_fulfilment_provider_sync_worker_lock(lock_id)
values ('global') on conflict(lock_id) do nothing;

create table if not exists public.velmere_fulfilment_provider_sync_runs (
  run_id text primary key,
  lease_token_hash text not null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.velmere_fulfilment_provider_sync_queue enable row level security;
alter table public.velmere_fulfilment_provider_sync_worker_lock enable row level security;
alter table public.velmere_fulfilment_provider_sync_runs enable row level security;
revoke all on table public.velmere_fulfilment_provider_sync_queue from public,anon,authenticated;
revoke all on table public.velmere_fulfilment_provider_sync_worker_lock from public,anon,authenticated;
revoke all on table public.velmere_fulfilment_provider_sync_runs from public,anon,authenticated;

create or replace function public.velmere_enqueue_fulfilment_provider_sync(
  p_order_draft_id text,
  p_external_id text,
  p_expected_provider_order_id text,
  p_previous_status text default 'draft',
  p_pending_since timestamptz default now(),
  p_stale_after_hours integer default 48,
  p_refund_expected boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text;
  v_existing public.velmere_fulfilment_provider_sync_queue%rowtype;
begin
  if p_order_draft_id !~ '^order_[A-Za-z0-9_-]{8,120}$' then raise exception 'invalid_order_draft_id'; end if;
  if p_external_id !~ '^order_[A-Za-z0-9_-]{8,120}$' then raise exception 'invalid_external_id'; end if;
  if p_expected_provider_order_id is not null and p_expected_provider_order_id !~ '^[0-9]{1,20}$' then
    raise exception 'invalid_provider_order_id';
  end if;
  if p_stale_after_hours < 1 or p_stale_after_hours > 336 then raise exception 'invalid_stale_after_hours'; end if;

  v_sync_id := 'fulfilment_sync_' || substr(md5(p_order_draft_id), 1, 24);
  select * into v_existing
  from public.velmere_fulfilment_provider_sync_queue
  where order_draft_id = p_order_draft_id
  for update;

  if found then
    if v_existing.status in ('completed','dead_letter','paused') then
      update public.velmere_fulfilment_provider_sync_queue
      set external_id = p_external_id,
          expected_provider_order_id = coalesce(p_expected_provider_order_id, expected_provider_order_id),
          previous_status = coalesce(p_previous_status, previous_status),
          pending_since = coalesce(p_pending_since, now()),
          stale_after_hours = p_stale_after_hours,
          refund_expected = p_refund_expected,
          status = 'pending', attempt_count = 0, next_attempt_at = now(),
          lease_token = null, claimed_at = null, completed_at = null, dead_lettered_at = null,
          last_error_code = null, updated_at = now()
      where order_draft_id = p_order_draft_id;
      return 'reopened';
    end if;
    update public.velmere_fulfilment_provider_sync_queue
    set expected_provider_order_id = coalesce(p_expected_provider_order_id, expected_provider_order_id),
        refund_expected = p_refund_expected,
        updated_at = now()
    where order_draft_id = p_order_draft_id;
    return 'already_queued';
  end if;

  insert into public.velmere_fulfilment_provider_sync_queue(
    sync_id, order_draft_id, external_id, expected_provider_order_id,
    previous_status, pending_since, stale_after_hours, refund_expected,
    status, next_attempt_at
  ) values (
    v_sync_id, p_order_draft_id, p_external_id, p_expected_provider_order_id,
    left(coalesce(p_previous_status,'draft'),40), coalesce(p_pending_since,now()),
    p_stale_after_hours, p_refund_expected, 'pending', now()
  );
  return 'queued';
end;
$$;

create or replace function public.velmere_claim_fulfilment_provider_sync_worker(
  p_run_id text,
  p_lease_token text,
  p_limit integer,
  p_worker_lease_seconds integer,
  p_stale_after_seconds integer,
  p_retry_threshold integer
)
returns table(
  lease_acquired boolean,
  sync_id text,
  order_draft_id text,
  external_id text,
  expected_provider_order_id text,
  previous_status text,
  pending_since timestamptz,
  stale_after_hours integer,
  refund_expected boolean,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare v_acquired boolean := false;
begin
  if p_run_id !~ '^fulfilment_sync_run_[A-Za-z0-9]{16,32}$' then raise exception 'invalid_run_id'; end if;
  if p_lease_token !~ '^fulfilment_sync_lease_[A-Za-z0-9]{16,32}$' then raise exception 'invalid_lease_token'; end if;
  if p_limit < 1 or p_limit > 100 then raise exception 'invalid_limit'; end if;
  if p_worker_lease_seconds < 30 or p_worker_lease_seconds > 300 then raise exception 'invalid_worker_lease'; end if;
  if p_stale_after_seconds < 60 or p_stale_after_seconds > 86400 then raise exception 'invalid_stale_after'; end if;
  if p_retry_threshold < 2 or p_retry_threshold > 20 then raise exception 'invalid_retry_threshold'; end if;

  update public.velmere_fulfilment_provider_sync_worker_lock
  set lease_token=p_lease_token,
      lease_expires_at=now()+make_interval(secs=>p_worker_lease_seconds),
      updated_at=now()
  where lock_id='global'
    and (lease_expires_at is null or lease_expires_at < now() or lease_token=p_lease_token);
  v_acquired := found;
  if not v_acquired then return; end if;

  update public.velmere_fulfilment_provider_sync_queue
  set status='retryable_failed', lease_token=null, claimed_at=null,
      next_attempt_at=now(), last_error_code='stale_processing_recovered', updated_at=now()
  where status='processing' and claimed_at < now()-make_interval(secs=>p_stale_after_seconds);

  update public.velmere_fulfilment_provider_sync_queue
  set status='dead_letter', dead_lettered_at=now(), next_attempt_at=null,
      lease_token=null, claimed_at=null, last_error_code='retry_threshold_exhausted', updated_at=now()
  where status in ('pending','retryable_failed') and attempt_count >= p_retry_threshold;

  return query
  with due as (
    select q.sync_id
    from public.velmere_fulfilment_provider_sync_queue q
    where q.status in ('pending','retryable_failed')
      and coalesce(q.next_attempt_at,q.updated_at) <= now()
      and q.attempt_count < p_retry_threshold
    order by coalesce(q.next_attempt_at,q.updated_at), q.created_at
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.velmere_fulfilment_provider_sync_queue q
    set status='processing', lease_token=p_lease_token, claimed_at=now(),
        attempt_count=q.attempt_count+1, updated_at=now()
    from due where q.sync_id=due.sync_id
    returning q.*
  )
  select true, c.sync_id, c.order_draft_id, c.external_id,
         c.expected_provider_order_id, c.previous_status, c.pending_since,
         c.stale_after_hours, c.refund_expected, c.attempt_count
  from claimed c;

  if not found then
    return query select true, null::text, null::text, null::text, null::text,
      null::text, null::timestamptz, null::integer, null::boolean, null::integer;
  end if;
end;
$$;

create or replace function public.velmere_reschedule_fulfilment_provider_sync(
  p_sync_id text, p_lease_token text, p_provider_status text,
  p_result_state text, p_action text, p_delay_seconds integer
)
returns text language plpgsql security definer set search_path=public as $$
begin
  if p_delay_seconds < 30 or p_delay_seconds > 86400 then raise exception 'invalid_delay'; end if;
  update public.velmere_fulfilment_provider_sync_queue
  set status='pending', previous_status=left(coalesce(p_provider_status,'unknown'),40),
      last_provider_status=left(coalesce(p_provider_status,'unknown'),40),
      last_result_state=left(coalesce(p_result_state,'unknown'),40),
      last_action=left(coalesce(p_action,'none'),80),
      next_attempt_at=now()+make_interval(secs=>p_delay_seconds),
      lease_token=null, claimed_at=null, last_error_code=null, updated_at=now()
  where sync_id=p_sync_id and status='processing' and lease_token=p_lease_token;
  return case when found then 'rescheduled' else 'fenced' end;
end; $$;

create or replace function public.velmere_complete_fulfilment_provider_sync(
  p_sync_id text, p_lease_token text, p_provider_status text,
  p_result_state text, p_action text
)
returns text language plpgsql security definer set search_path=public as $$
begin
  update public.velmere_fulfilment_provider_sync_queue
  set status='completed', last_provider_status=left(coalesce(p_provider_status,'unknown'),40),
      last_result_state=left(coalesce(p_result_state,'unknown'),40),
      last_action=left(coalesce(p_action,'none'),80),
      completed_at=now(), next_attempt_at=null, lease_token=null, claimed_at=null,
      last_error_code=null, updated_at=now()
  where sync_id=p_sync_id and status='processing' and lease_token=p_lease_token;
  return case when found then 'completed' else 'fenced' end;
end; $$;

create or replace function public.velmere_fail_fulfilment_provider_sync(
  p_sync_id text, p_lease_token text, p_error_code text,
  p_retry_threshold integer, p_retry_after_seconds integer
)
returns text language plpgsql security definer set search_path=public as $$
declare v_attempt integer;
begin
  if p_retry_after_seconds < 5 or p_retry_after_seconds > 86400 then raise exception 'invalid_retry_after'; end if;
  select attempt_count into v_attempt
  from public.velmere_fulfilment_provider_sync_queue
  where sync_id=p_sync_id and status='processing' and lease_token=p_lease_token
  for update;
  if not found then return 'fenced'; end if;
  if v_attempt >= p_retry_threshold then
    update public.velmere_fulfilment_provider_sync_queue
    set status='dead_letter', dead_lettered_at=now(), next_attempt_at=null,
        lease_token=null, claimed_at=null, last_error_code=left(p_error_code,120), updated_at=now()
    where sync_id=p_sync_id;
    return 'dead_letter';
  end if;
  update public.velmere_fulfilment_provider_sync_queue
  set status='retryable_failed', next_attempt_at=now()+make_interval(secs=>p_retry_after_seconds),
      lease_token=null, claimed_at=null, last_error_code=left(p_error_code,120), updated_at=now()
  where sync_id=p_sync_id;
  return 'retryable_failed';
end; $$;

create or replace function public.velmere_dead_letter_fulfilment_provider_sync(
  p_sync_id text, p_lease_token text, p_error_code text
)
returns text language plpgsql security definer set search_path=public as $$
begin
  update public.velmere_fulfilment_provider_sync_queue
  set status='dead_letter', dead_lettered_at=now(), next_attempt_at=null,
      lease_token=null, claimed_at=null, last_error_code=left(p_error_code,120), updated_at=now()
  where sync_id=p_sync_id and status='processing' and lease_token=p_lease_token;
  return case when found then 'dead_letter' else 'fenced' end;
end; $$;

create or replace function public.velmere_release_fulfilment_provider_sync(
  p_sync_id text, p_lease_token text, p_reason_code text
)
returns text language plpgsql security definer set search_path=public as $$
begin
  update public.velmere_fulfilment_provider_sync_queue
  set status='retryable_failed', next_attempt_at=now(), lease_token=null, claimed_at=null,
      last_error_code=left(p_reason_code,120), updated_at=now()
  where sync_id=p_sync_id and status='processing' and lease_token=p_lease_token;
  return case when found then 'released' else 'fenced' end;
end; $$;

create or replace function public.velmere_finish_fulfilment_provider_sync_worker(
  p_run_id text, p_lease_token text, p_summary jsonb
)
returns text language plpgsql security definer set search_path=public as $$
begin
  insert into public.velmere_fulfilment_provider_sync_runs(run_id,lease_token_hash,summary)
  values(p_run_id,substr(md5(p_lease_token),1,24),coalesce(p_summary,'{}'::jsonb))
  on conflict(run_id) do nothing;
  update public.velmere_fulfilment_provider_sync_worker_lock
  set lease_token=null, lease_expires_at=null, updated_at=now()
  where lock_id='global' and lease_token=p_lease_token;
  return 'finished';
end; $$;

revoke all on function public.velmere_enqueue_fulfilment_provider_sync(text,text,text,text,timestamptz,integer,boolean) from public,anon,authenticated;
revoke all on function public.velmere_claim_fulfilment_provider_sync_worker(text,text,integer,integer,integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_reschedule_fulfilment_provider_sync(text,text,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.velmere_complete_fulfilment_provider_sync(text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.velmere_fail_fulfilment_provider_sync(text,text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_dead_letter_fulfilment_provider_sync(text,text,text) from public,anon,authenticated;
revoke all on function public.velmere_release_fulfilment_provider_sync(text,text,text) from public,anon,authenticated;
revoke all on function public.velmere_finish_fulfilment_provider_sync_worker(text,text,jsonb) from public,anon,authenticated;

grant execute on function public.velmere_enqueue_fulfilment_provider_sync(text,text,text,text,timestamptz,integer,boolean) to service_role;
grant execute on function public.velmere_claim_fulfilment_provider_sync_worker(text,text,integer,integer,integer,integer) to service_role;
grant execute on function public.velmere_reschedule_fulfilment_provider_sync(text,text,text,text,text,integer) to service_role;
grant execute on function public.velmere_complete_fulfilment_provider_sync(text,text,text,text,text) to service_role;
grant execute on function public.velmere_fail_fulfilment_provider_sync(text,text,text,integer,integer) to service_role;
grant execute on function public.velmere_dead_letter_fulfilment_provider_sync(text,text,text) to service_role;
grant execute on function public.velmere_release_fulfilment_provider_sync(text,text,text) to service_role;
grant execute on function public.velmere_finish_fulfilment_provider_sync_worker(text,text,jsonb) to service_role;
