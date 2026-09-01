-- PASS4657: atomic Stripe webhook claim and monotonic payment-event ordering.
-- Service-role only. RLS stays enabled and no public policy is created.

alter table public.velmere_stripe_webhook_events
  add column if not exists status text not null default 'processed',
  add column if not exists attempt_count integer not null default 1,
  add column if not exists claimed_at timestamptz,
  add column if not exists last_error_code text,
  add column if not exists event_created_at bigint;

alter table public.velmere_stripe_webhook_events
  drop constraint if exists velmere_stripe_webhook_events_status_check;
alter table public.velmere_stripe_webhook_events
  add constraint velmere_stripe_webhook_events_status_check
  check (status in ('processing', 'processed', 'retryable_failed'));

create index if not exists velmere_stripe_webhook_events_status_claimed_idx
  on public.velmere_stripe_webhook_events(status, claimed_at);

create table if not exists public.velmere_payment_event_watermarks (
  subject_key text primary key,
  event_id text not null,
  event_created_at bigint not null,
  event_kind text not null,
  event_priority integer not null,
  terminal boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint velmere_payment_event_watermarks_kind_check
    check (event_kind in ('payment_failed', 'checkout_completed', 'refund', 'chargeback'))
);

alter table public.velmere_payment_event_watermarks enable row level security;
create index if not exists velmere_payment_event_watermarks_updated_idx
  on public.velmere_payment_event_watermarks(updated_at);

create or replace function public.velmere_claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_event_created_at bigint,
  p_stale_after_seconds integer default 300
)
returns table(claimed boolean, status text, attempt_count integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.velmere_stripe_webhook_events%rowtype;
  v_now timestamptz := now();
  v_inserted integer := 0;
begin
  insert into public.velmere_stripe_webhook_events(
    id, type, status, attempt_count, claimed_at, processed_at, event_created_at
  ) values (
    p_event_id, p_event_type, 'processing', 1, v_now, v_now, p_event_created_at
  )
  on conflict (id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    return query select true, 'processing'::text, 1, null::integer;
    return;
  end if;

  select * into v_row
  from public.velmere_stripe_webhook_events
  where id = p_event_id
  for update;

  if v_row.status = 'processed' then
    return query select false, v_row.status, v_row.attempt_count, null::integer;
    return;
  end if;

  if v_row.status = 'processing'
     and v_row.claimed_at is not null
     and v_row.claimed_at > v_now - make_interval(secs => p_stale_after_seconds) then
    return query select false, v_row.status, v_row.attempt_count,
      greatest(1, p_stale_after_seconds - extract(epoch from (v_now - v_row.claimed_at))::integer);
    return;
  end if;

  update public.velmere_stripe_webhook_events
  set status = 'processing',
      attempt_count = attempt_count + 1,
      claimed_at = v_now,
      processed_at = v_now,
      last_error_code = null,
      type = p_event_type,
      event_created_at = p_event_created_at
  where id = p_event_id
  returning * into v_row;

  return query select true, v_row.status, v_row.attempt_count, null::integer;
end;
$$;

create or replace function public.velmere_apply_payment_event_watermark(
  p_subject_key text,
  p_event_id text,
  p_event_created_at bigint,
  p_event_kind text,
  p_event_priority integer,
  p_terminal boolean
)
returns table(accepted boolean, reason text, current_event_id text, current_kind text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.velmere_payment_event_watermarks%rowtype;
begin
  insert into public.velmere_payment_event_watermarks(
    subject_key, event_id, event_created_at, event_kind, event_priority, terminal
  ) values (
    p_subject_key, p_event_id, p_event_created_at, p_event_kind, p_event_priority, p_terminal
  )
  on conflict (subject_key) do nothing;

  select * into v_current
  from public.velmere_payment_event_watermarks
  where subject_key = p_subject_key
  for update;

  if v_current.event_id = p_event_id then
    return query select true, 'first_or_same_event'::text, v_current.event_id, v_current.event_kind;
    return;
  end if;

  if v_current.terminal and p_event_priority < v_current.event_priority then
    return query select false, 'terminal_state_dominates'::text, v_current.event_id, v_current.event_kind;
    return;
  end if;

  if p_event_priority > v_current.event_priority
     or (p_event_priority = v_current.event_priority and p_event_created_at > v_current.event_created_at) then
    update public.velmere_payment_event_watermarks
    set event_id = p_event_id,
        event_created_at = p_event_created_at,
        event_kind = p_event_kind,
        event_priority = p_event_priority,
        terminal = p_terminal,
        updated_at = now()
    where subject_key = p_subject_key;
    return query select true,
      case when p_event_priority > v_current.event_priority then 'higher_priority' else 'same_priority_newer' end,
      p_event_id,
      p_event_kind;
    return;
  end if;

  return query select false, 'stale_or_lower_priority'::text, v_current.event_id, v_current.event_kind;
end;
$$;

revoke all on function public.velmere_claim_stripe_webhook_event(text,text,bigint,integer) from public, anon, authenticated;
revoke all on function public.velmere_apply_payment_event_watermark(text,text,bigint,text,integer,boolean) from public, anon, authenticated;
grant execute on function public.velmere_claim_stripe_webhook_event(text,text,bigint,integer) to service_role;
grant execute on function public.velmere_apply_payment_event_watermark(text,text,bigint,text,integer,boolean) to service_role;
