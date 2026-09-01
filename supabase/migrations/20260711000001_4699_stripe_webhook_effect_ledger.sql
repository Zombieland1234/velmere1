-- PASS4699: per-effect Stripe webhook leases and replayable bounded receipts.
-- This closes the crash window between a side effect and event-level completion.
-- Service-role only. No public or authenticated policy is created.

create table if not exists public.velmere_stripe_webhook_effects (
  event_id text not null,
  effect_key text not null,
  event_type text not null,
  status text not null default 'processing',
  attempt_count integer not null default 1,
  lease_token text,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  result_json jsonb,
  last_error_code text,
  updated_at timestamptz not null default now(),
  primary key (event_id, effect_key),
  constraint velmere_stripe_webhook_effects_status_check
    check (status in ('processing', 'completed', 'retryable_failed')),
  constraint velmere_stripe_webhook_effects_effect_key_check
    check (effect_key ~ '^[a-z0-9][a-z0-9:_-]{0,119}$'),
  constraint velmere_stripe_webhook_effects_result_size_check
    check (result_json is null or octet_length(result_json::text) <= 16384)
);

alter table public.velmere_stripe_webhook_effects enable row level security;
create index if not exists velmere_stripe_webhook_effects_status_claimed_idx
  on public.velmere_stripe_webhook_effects(status, claimed_at);
create index if not exists velmere_stripe_webhook_effects_updated_idx
  on public.velmere_stripe_webhook_effects(updated_at);

create or replace function public.velmere_claim_stripe_webhook_effect(
  p_event_id text,
  p_event_type text,
  p_effect_key text,
  p_requested_lease_token text,
  p_stale_after_seconds integer default 300
)
returns table(
  claimed boolean,
  status text,
  attempt_count integer,
  lease_token text,
  retry_after_seconds integer,
  result_json jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.velmere_stripe_webhook_effects%rowtype;
  v_now timestamptz := now();
  v_inserted integer := 0;
begin
  if p_event_id is null or length(p_event_id) < 1 or length(p_event_id) > 180 then
    raise exception 'invalid_event_id';
  end if;
  if p_effect_key is null or p_effect_key !~ '^[a-z0-9][a-z0-9:_-]{0,119}$' then
    raise exception 'invalid_effect_key';
  end if;
  if p_requested_lease_token is null or length(p_requested_lease_token) < 16 then
    raise exception 'invalid_lease_token';
  end if;

  insert into public.velmere_stripe_webhook_effects(
    event_id, effect_key, event_type, status, attempt_count, lease_token, claimed_at, updated_at
  ) values (
    p_event_id, p_effect_key, p_event_type, 'processing', 1, p_requested_lease_token, v_now, v_now
  ) on conflict (event_id, effect_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    return query select true, 'processing'::text, 1, p_requested_lease_token, null::integer, null::jsonb;
    return;
  end if;

  select * into v_row
  from public.velmere_stripe_webhook_effects
  where event_id = p_event_id and effect_key = p_effect_key
  for update;

  if v_row.status = 'completed' then
    return query select false, 'completed'::text, v_row.attempt_count, null::text, null::integer, v_row.result_json;
    return;
  end if;

  if v_row.status = 'processing'
     and v_row.claimed_at > v_now - make_interval(secs => greatest(1, p_stale_after_seconds)) then
    return query select false, 'processing'::text, v_row.attempt_count, null::text,
      greatest(1, greatest(1, p_stale_after_seconds) - extract(epoch from (v_now - v_row.claimed_at))::integer),
      null::jsonb;
    return;
  end if;

  update public.velmere_stripe_webhook_effects
  set status = 'processing',
      attempt_count = attempt_count + 1,
      lease_token = p_requested_lease_token,
      claimed_at = v_now,
      completed_at = null,
      last_error_code = null,
      event_type = p_event_type,
      updated_at = v_now
  where event_id = p_event_id and effect_key = p_effect_key
  returning * into v_row;

  return query select true, v_row.status, v_row.attempt_count, v_row.lease_token, null::integer, null::jsonb;
end;
$$;

create or replace function public.velmere_complete_stripe_webhook_effect(
  p_event_id text,
  p_effect_key text,
  p_expected_attempt integer,
  p_lease_token text,
  p_result_json jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  if p_result_json is not null and octet_length(p_result_json::text) > 16384 then
    raise exception 'effect_receipt_too_large';
  end if;
  update public.velmere_stripe_webhook_effects
  set status = 'completed',
      lease_token = null,
      completed_at = now(),
      result_json = p_result_json,
      last_error_code = null,
      updated_at = now()
  where event_id = p_event_id
    and effect_key = p_effect_key
    and status = 'processing'
    and attempt_count = p_expected_attempt
    and lease_token = p_lease_token;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.velmere_fail_stripe_webhook_effect(
  p_event_id text,
  p_effect_key text,
  p_expected_attempt integer,
  p_lease_token text,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  update public.velmere_stripe_webhook_effects
  set status = 'retryable_failed',
      lease_token = null,
      last_error_code = left(coalesce(p_error_code, 'stripe_webhook_effect_failed'), 160),
      updated_at = now()
  where event_id = p_event_id
    and effect_key = p_effect_key
    and status = 'processing'
    and attempt_count = p_expected_attempt
    and lease_token = p_lease_token;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on table public.velmere_stripe_webhook_effects from public, anon, authenticated;
revoke all on function public.velmere_claim_stripe_webhook_effect(text,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.velmere_complete_stripe_webhook_effect(text,text,integer,text,jsonb) from public, anon, authenticated;
revoke all on function public.velmere_fail_stripe_webhook_effect(text,text,integer,text,text) from public, anon, authenticated;
grant execute on function public.velmere_claim_stripe_webhook_effect(text,text,text,text,integer) to service_role;
grant execute on function public.velmere_complete_stripe_webhook_effect(text,text,integer,text,jsonb) to service_role;
grant execute on function public.velmere_fail_stripe_webhook_effect(text,text,integer,text,text) to service_role;
