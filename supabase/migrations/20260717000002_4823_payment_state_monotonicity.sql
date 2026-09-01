-- PASS4823 P1-06/P1-07: paid-session insert-once/read-many semantics,
-- monotonic terminal states, and explicit webhook terminal dead-letter state.
-- This migration is service-role only and intentionally does not rewrite history.

begin;

alter table public.velmere_stripe_webhook_events
  drop constraint if exists velmere_stripe_webhook_events_status_check;
alter table public.velmere_stripe_webhook_events
  add constraint velmere_stripe_webhook_events_status_check
  check (status in ('processing', 'processed', 'retryable_failed', 'dead_letter'));

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
  ) on conflict (id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    return query select true, 'processing'::text, 1, null::integer;
    return;
  end if;

  select * into v_row
  from public.velmere_stripe_webhook_events e
  where e.id = p_event_id
  for update;

  if v_row.status in ('processed', 'dead_letter') then
    return query select false, v_row.status, v_row.attempt_count, null::integer;
    return;
  end if;

  if v_row.status = 'processing'
     and v_row.claimed_at is not null
     and v_row.claimed_at > v_now - make_interval(secs => greatest(1, p_stale_after_seconds)) then
    return query select false, v_row.status, v_row.attempt_count,
      greatest(1, greatest(1, p_stale_after_seconds) - extract(epoch from (v_now - v_row.claimed_at))::integer);
    return;
  end if;

  update public.velmere_stripe_webhook_events e
  set status = 'processing',
      attempt_count = e.attempt_count + 1,
      claimed_at = v_now,
      processed_at = v_now,
      last_error_code = null,
      type = p_event_type,
      event_created_at = p_event_created_at
  where e.id = p_event_id
  returning * into v_row;

  return query select true, v_row.status, v_row.attempt_count, null::integer;
end;
$$;

-- A completed receipt with {"ok":false} is legacy-corrupt state. Reopen a
-- retryable receipt, or quarantine a terminal receipt, instead of replaying it.
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
  v_terminal_receipt boolean := false;
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
  from public.velmere_stripe_webhook_effects e
  where e.event_id = p_event_id and e.effect_key = p_effect_key
  for update;

  if v_row.status = 'completed' and v_row.result_json ->> 'ok' = 'false' then
    v_terminal_receipt := v_row.result_json ->> 'terminal' = 'true'
      or (v_row.result_json ? 'retryable' and v_row.result_json ->> 'retryable' = 'false');
    if v_terminal_receipt then
      update public.velmere_stripe_webhook_effects e
      set status = 'dead_letter',
          lease_token = null,
          result_json = null,
          next_retry_at = null,
          dead_lettered_at = v_now,
          dead_letter_reason_code = left(coalesce(v_row.result_json ->> 'error', 'terminal_callback_rejected'), 160),
          last_error_code = left(coalesce(v_row.result_json ->> 'error', 'terminal_callback_rejected'), 160),
          updated_at = v_now
      where e.event_id = p_event_id and e.effect_key = p_effect_key;
      return query select false, 'dead_letter'::text, v_row.attempt_count, null::text, null::integer, null::jsonb;
      return;
    end if;

    update public.velmere_stripe_webhook_effects e
    set status = 'retryable_failed',
        lease_token = null,
        result_json = null,
        completed_at = null,
        last_error_code = left(coalesce(v_row.result_json ->> 'error', 'callback_rejected'), 160),
        next_retry_at = v_now,
        updated_at = v_now
    where e.event_id = p_event_id and e.effect_key = p_effect_key
    returning * into v_row;
  end if;

  if v_row.status = 'completed' then
    return query select false, 'completed'::text, v_row.attempt_count, null::text, null::integer, v_row.result_json;
    return;
  end if;
  if v_row.status = 'dead_letter' then
    return query select false, 'dead_letter'::text, v_row.attempt_count, null::text, null::integer, null::jsonb;
    return;
  end if;
  if v_row.status = 'retryable_failed' and v_row.next_retry_at is not null and v_row.next_retry_at > v_now then
    return query select false, 'processing'::text, v_row.attempt_count, null::text,
      greatest(1, extract(epoch from (v_row.next_retry_at - v_now))::integer), null::jsonb;
    return;
  end if;
  if v_row.status = 'processing'
     and v_row.claimed_at > v_now - make_interval(secs => greatest(1, p_stale_after_seconds)) then
    return query select false, 'processing'::text, v_row.attempt_count, null::text,
      greatest(1, greatest(1, p_stale_after_seconds) - extract(epoch from (v_now - v_row.claimed_at))::integer), null::jsonb;
    return;
  end if;

  update public.velmere_stripe_webhook_effects e
  set status = 'processing',
      attempt_count = e.attempt_count + 1,
      lease_token = p_requested_lease_token,
      claimed_at = v_now,
      completed_at = null,
      last_error_code = null,
      next_retry_at = null,
      event_type = p_event_type,
      updated_at = v_now
  where e.event_id = p_event_id and e.effect_key = p_effect_key
  returning * into v_row;

  return query select true, v_row.status, v_row.attempt_count, v_row.lease_token, null::integer, null::jsonb;
end;
$$;

-- Defence in depth: even a caller bypassing the TypeScript runner cannot
-- persist a rejected callback as a completed effect.
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
  if p_result_json ->> 'ok' = 'false' then
    return false;
  end if;
  update public.velmere_stripe_webhook_effects e
  set status = 'completed',
      lease_token = null,
      completed_at = now(),
      result_json = p_result_json,
      last_error_code = null,
      updated_at = now()
  where e.event_id = p_event_id
    and e.effect_key = p_effect_key
    and e.status = 'processing'
    and e.attempt_count = p_expected_attempt
    and e.lease_token = p_lease_token;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.velmere_dead_letter_stripe_webhook_effect(
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
  update public.velmere_stripe_webhook_effects e
  set status = 'dead_letter',
      lease_token = null,
      result_json = null,
      next_retry_at = null,
      dead_lettered_at = now(),
      dead_letter_reason_code = left(coalesce(p_error_code, 'terminal_callback_rejected'), 160),
      last_error_code = left(coalesce(p_error_code, 'terminal_callback_rejected'), 160),
      updated_at = now()
  where e.event_id = p_event_id
    and e.effect_key = p_effect_key
    and e.status = 'processing'
    and e.attempt_count = p_expected_attempt
    and e.lease_token = p_lease_token;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.velmere_create_or_read_vlm_paid_entitlement(
  p_id text,
  p_stripe_session_id text,
  p_stripe_customer_id text,
  p_product_id text,
  p_access_scope text,
  p_context_hash text,
  p_context jsonb,
  p_locale text,
  p_amount_total integer,
  p_currency text,
  p_customer_email text,
  p_customer_name text,
  p_payment_status text,
  p_source text,
  p_audit_queue_id text,
  p_expires_at timestamptz,
  p_created_at timestamptz
)
returns table(
  ok boolean,
  error text,
  retryable boolean,
  terminal boolean,
  idempotent boolean,
  created boolean,
  id text,
  stripe_session_id text,
  stripe_customer_id text,
  product_id text,
  access_scope text,
  status text,
  context_hash text,
  context jsonb,
  locale text,
  amount_total integer,
  currency text,
  customer_email text,
  customer_name text,
  payment_status text,
  source text,
  created_at timestamptz,
  updated_at timestamptz,
  expires_at timestamptz,
  audit_queue_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.velmere_vlm_paid_entitlements%rowtype;
  v_inserted integer := 0;
  v_hold_blocked boolean := false;
begin
  if coalesce(length(trim(p_id)), 0) < 1
     or coalesce(length(trim(p_stripe_session_id)), 0) < 1
     or coalesce(p_context_hash, '') !~ '^[a-f0-9]{64}$'
     or coalesce(p_payment_status, '') <> 'paid'
     or coalesce(p_product_id, '') not in (
       'vlm_pro_analysis_single', 'vlm_pro_pdf_single', 'vlm_pro_audit_review',
       'vlm_advanced_analysis_single', 'vlm_advanced_pdf_single', 'vlm_advanced_audit_human_review'
     )
     or coalesce(p_source, '') not in ('stripe_webhook', 'checkout_verify', 'local_demo_verify')
     or coalesce(p_locale, '') not in ('pl', 'en', 'de')
     or p_expires_at is null
     or p_expires_at <= coalesce(p_created_at, now()) then
    return query select false, 'invalid_entitlement_session_write'::text, false, true, false, false,
      null::text, null::text, null::text, null::text, null::text, null::text,
      null::text, null::jsonb, null::text, null::integer, null::text, null::text,
      null::text, null::text, null::text, null::timestamptz, null::timestamptz,
      null::timestamptz, null::text;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('vlm-session:' || p_stripe_session_id || ':' || p_product_id || ':' || p_context_hash, 4823)
  );
  -- Match the latest lifecycle RPC lock so checkout verification cannot race a
  -- refund/chargeback transition on the same deterministic entitlement id.
  perform pg_advisory_xact_lock(hashtextextended('vlm-entitlement:' || p_id, 4803));

  insert into public.velmere_vlm_paid_entitlements(
    id, stripe_session_id, stripe_customer_id, product_id, access_scope, status,
    context_hash, context, locale, amount_total, currency, customer_email,
    customer_name, payment_status, source, audit_queue_id, expires_at,
    created_at, updated_at
  ) values (
    p_id, p_stripe_session_id, p_stripe_customer_id, p_product_id, p_access_scope, 'active',
    p_context_hash, coalesce(p_context, '{}'::jsonb), p_locale, p_amount_total, p_currency,
    p_customer_email, p_customer_name, p_payment_status, p_source, p_audit_queue_id,
    p_expires_at, coalesce(p_created_at, now()), coalesce(p_created_at, now())
  ) on conflict (stripe_session_id, product_id, context_hash) do nothing;
  get diagnostics v_inserted = row_count;

  select * into v_row
  from public.velmere_vlm_paid_entitlements e
  where e.stripe_session_id = p_stripe_session_id
    and e.product_id = p_product_id
    and e.context_hash = p_context_hash
  for update;

  if not found then
    return query select false, 'entitlement_session_write_failed'::text, true, false, false, false,
      null::text, null::text, null::text, null::text, null::text, null::text,
      null::text, null::jsonb, null::text, null::integer, null::text, null::text,
      null::text, null::text, null::text, null::timestamptz, null::timestamptz,
      null::timestamptz, null::text;
    return;
  end if;

  if v_row.id <> p_id then
    return query select false, 'entitlement_binding_conflict'::text, false, true, false, false,
      v_row.id, v_row.stripe_session_id, v_row.stripe_customer_id, v_row.product_id,
      v_row.access_scope, v_row.status, v_row.context_hash, v_row.context, v_row.locale,
      v_row.amount_total, v_row.currency, v_row.customer_email, v_row.customer_name,
      v_row.payment_status, v_row.source, v_row.created_at, v_row.updated_at,
      v_row.expires_at, v_row.audit_queue_id;
    return;
  end if;

  if v_inserted = 1 and p_audit_queue_id is not null then
    insert into public.velmere_vlm_audit_human_queue(
      id, entitlement_id, stripe_session_id, status, locale, project_name,
      asset_id, request_id, customer_email, context, private_note, created_at, updated_at
    ) values (
      p_audit_queue_id, v_row.id, v_row.stripe_session_id, 'paid_waiting_human_review',
      v_row.locale, v_row.context ->> 'symbol', v_row.context ->> 'assetId',
      v_row.context ->> 'requestId', v_row.customer_email, v_row.context,
      'Created once by PASS4823 paid-entitlement session write. Re-verification never resets this queue.',
      v_row.created_at, v_row.created_at
    ) on conflict (stripe_session_id) do nothing;
  end if;

  select coalesce(h.blocked, false) into v_hold_blocked
  from public.velmere_vlm_paid_entitlement_release_holds h
  where h.entitlement_id = v_row.id;
  v_hold_blocked := coalesce(v_hold_blocked, false);

  if v_inserted = 0 and (
    v_hold_blocked
    or v_row.status in ('expired', 'refunded', 'revoked', 'consumed')
    or lower(coalesce(v_row.payment_status, '')) in ('refunded', 'revoked', 'disputed', 'chargeback', 'hold')
    or v_row.expires_at <= now()
  ) then
    return query select false,
      case
        when v_hold_blocked then 'entitlement_release_hold'::text
        when v_row.status = 'expired' or v_row.expires_at <= now() then 'entitlement_expired'::text
        else 'entitlement_terminal_state'::text
      end,
      false, true, true, false,
      v_row.id, v_row.stripe_session_id, v_row.stripe_customer_id, v_row.product_id,
      v_row.access_scope, v_row.status, v_row.context_hash, v_row.context, v_row.locale,
      v_row.amount_total, v_row.currency, v_row.customer_email, v_row.customer_name,
      v_row.payment_status, v_row.source, v_row.created_at, v_row.updated_at,
      v_row.expires_at, v_row.audit_queue_id;
    return;
  end if;

  -- Existing active rows are returned byte-for-byte. No status, expiry, source,
  -- customer binding, context or human-review queue field is updated here.
  return query select true, null::text, false, false, v_inserted = 0, v_inserted = 1,
    v_row.id, v_row.stripe_session_id, v_row.stripe_customer_id, v_row.product_id,
    v_row.access_scope, v_row.status, v_row.context_hash, v_row.context, v_row.locale,
    v_row.amount_total, v_row.currency, v_row.customer_email, v_row.customer_name,
    v_row.payment_status, v_row.source, v_row.created_at, v_row.updated_at,
    v_row.expires_at, v_row.audit_queue_id;
exception
  when others then
    return query select false, 'entitlement_session_write_failed'::text, true, false, false, false,
      null::text, null::text, null::text, null::text, null::text, null::text,
      null::text, null::jsonb, null::text, null::integer, null::text, null::text,
      null::text, null::text, null::text, null::timestamptz, null::timestamptz,
      null::timestamptz, null::text;
end;
$$;

revoke all on function public.velmere_claim_stripe_webhook_event(text,text,bigint,integer)
  from public, anon, authenticated;
revoke all on function public.velmere_claim_stripe_webhook_effect(text,text,text,text,integer)
  from public, anon, authenticated;
revoke all on function public.velmere_complete_stripe_webhook_effect(text,text,integer,text,jsonb)
  from public, anon, authenticated;
revoke all on function public.velmere_dead_letter_stripe_webhook_effect(text,text,integer,text,text)
  from public, anon, authenticated;
revoke all on function public.velmere_create_or_read_vlm_paid_entitlement(
  text,text,text,text,text,text,jsonb,text,integer,text,text,text,text,text,text,timestamptz,timestamptz
) from public, anon, authenticated;

grant execute on function public.velmere_claim_stripe_webhook_event(text,text,bigint,integer)
  to service_role;
grant execute on function public.velmere_claim_stripe_webhook_effect(text,text,text,text,integer)
  to service_role;
grant execute on function public.velmere_complete_stripe_webhook_effect(text,text,integer,text,jsonb)
  to service_role;
grant execute on function public.velmere_dead_letter_stripe_webhook_effect(text,text,integer,text,text)
  to service_role;
grant execute on function public.velmere_create_or_read_vlm_paid_entitlement(
  text,text,text,text,text,text,jsonb,text,integer,text,text,text,text,text,text,timestamptz,timestamptz
) to service_role;

comment on function public.velmere_create_or_read_vlm_paid_entitlement(
  text,text,text,text,text,text,jsonb,text,integer,text,text,text,text,text,text,timestamptz,timestamptz
) is 'PASS4823 insert-once/read-many paid entitlement. Existing rows and review queues are immutable to Checkout Session re-verification.';

commit;
