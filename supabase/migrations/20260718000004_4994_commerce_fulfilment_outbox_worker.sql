-- PASS4994 COMMERCE FULFILMENT OUTBOX WORKER BEGIN
-- Service-role-only, leased provider-effect execution for the PASS4992 outbox.
-- Customer PII and raw Stripe/Printful payloads are deliberately excluded.

alter table public.velmere_commerce_fulfilment_outbox
  add column if not exists lease_owner text,
  add column if not exists claimed_at timestamptz,
  add column if not exists provider_order_id text,
  add column if not exists execution_receipt jsonb,
  add column if not exists failure_receipt jsonb,
  add column if not exists completed_at timestamptz,
  add column if not exists dead_lettered_at timestamptz;

create index if not exists velmere_commerce_fulfilment_outbox_stale_lease_idx
  on public.velmere_commerce_fulfilment_outbox(leased_until, created_at)
  where status = 'processing';

create or replace function public.velmere_guard_paid_commerce_order_binding_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.velmere_commerce_fulfilment_outbox o
    where o.order_draft_id = old.id
  ) and (
    new.cart_hash is distinct from old.cart_hash
    or new.expected_amount_total is distinct from old.expected_amount_total
    or new.expected_currency is distinct from old.expected_currency
    or new.stripe_session_id is distinct from old.stripe_session_id
    or new.stripe_livemode is distinct from old.stripe_livemode
    or new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id
    or new.line_items is distinct from old.line_items
  ) then
    raise exception 'commerce_outbox_order_binding_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists velmere_guard_paid_commerce_order_binding_immutable_trigger
  on public.velmere_order_drafts;
create trigger velmere_guard_paid_commerce_order_binding_immutable_trigger
before update on public.velmere_order_drafts
for each row execute function public.velmere_guard_paid_commerce_order_binding_immutable();

revoke all on function public.velmere_guard_paid_commerce_order_binding_immutable()
  from public, anon, authenticated;

create or replace function public.velmere_is_commerce_fulfilment_receipt_redacted(
  p_receipt jsonb
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(
    jsonb_typeof(p_receipt) = 'object'
    and p_receipt->>'schemaVersion' = 'velmere.commerce-fulfilment-execution-receipt.v1'
    and p_receipt->>'receiptId' ~ '^commerce_fulfilment_receipt_[a-f0-9]{32}$'
    and p_receipt->>'receiptDigest' ~ '^sha256:[a-f0-9]{64}$'
    and p_receipt->>'requestBindingDigest' ~ '^sha256:[a-f0-9]{64}$'
    and p_receipt->>'stripePaymentIntentIdHash' ~ '^sha256:[a-f0-9]{64}$'
    and p_receipt->>'requestId' ~ '^commerce_fulfilment_[a-f0-9]{32}$'
    and length(p_receipt->>'orderDraftId') between 1 and 160
    and p_receipt->>'orderDraftId' ~ '^[A-Za-z0-9_-]+$'
    and p_receipt->>'attempt' ~ '^[1-9][0-9]{0,3}$'
    and p_receipt->>'processedAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
    and p_receipt->'redactionBoundary' = jsonb_build_object(
      'customerPiiStored', false,
      'rawProviderPayloadStored', false,
      'secretsStored', false
    )
    and jsonb_typeof(p_receipt->'providerResult') = 'object'
    and length(p_receipt->'providerResult'->>'externalId') between 1 and 160
    and p_receipt->'providerResult'->>'externalId' ~ '^[A-Za-z0-9_-]+$'
    and (
      p_receipt->'providerResult'->>'providerOrderIdHash' is null
      or p_receipt->'providerResult'->>'providerOrderIdHash' ~ '^sha256:[a-f0-9]{64}$'
    )
    and (
      p_receipt->'providerResult'->>'status' is null
      or p_receipt->'providerResult'->>'status' ~ '^[A-Za-z0-9_.:-]{1,80}$'
    )
    and jsonb_typeof(p_receipt->'providerResult'->'confirmed') = 'boolean'
    and jsonb_typeof(p_receipt->'providerResult'->'reconciled') = 'boolean'
    and p_receipt->'providerResult'->>'reconciliationAttempts' ~ '^(0|[1-9][0-9]?)$'
    and (
      p_receipt->'providerResult'->>'errorCode' is null
      or p_receipt->'providerResult'->>'errorCode' ~ '^[a-z0-9:_-]{1,120}$'
    )
    and jsonb_typeof(p_receipt->'providerResult'->'ambiguous') = 'boolean'
    and not exists (
      select 1 from jsonb_object_keys(p_receipt) as keys(key)
      where key not in (
        'schemaVersion', 'receiptId', 'receiptDigest', 'requestBindingDigest',
        'requestId', 'orderDraftId', 'stripePaymentIntentIdHash', 'action',
        'provider', 'attempt', 'result', 'providerResult', 'processedAt',
        'redactionBoundary'
      )
    )
    and not exists (
      select 1 from jsonb_object_keys(p_receipt->'providerResult') as keys(key)
      where key not in (
        'externalId', 'providerOrderIdHash', 'status', 'confirmed',
        'reconciled', 'reconciliationAttempts', 'errorCode', 'ambiguous'
      )
    ),
    false
  );
$$;

revoke all on function public.velmere_is_commerce_fulfilment_receipt_redacted(jsonb)
  from public, anon, authenticated;
grant execute on function public.velmere_is_commerce_fulfilment_receipt_redacted(jsonb)
  to service_role;

alter table public.velmere_commerce_fulfilment_outbox enable row level security;
revoke all on table public.velmere_commerce_fulfilment_outbox from public, anon, authenticated;
grant select, insert, update on table public.velmere_commerce_fulfilment_outbox to service_role;

create or replace function public.velmere_claim_commerce_fulfilment_outbox(
  p_worker_id text,
  p_lease_token text,
  p_limit integer default 5,
  p_lease_seconds integer default 120
)
returns table(
  request_id text,
  idempotency_key text,
  order_draft_id text,
  stripe_session_id text,
  stripe_event_id text,
  stripe_payment_intent_id text,
  cart_hash text,
  amount_total bigint,
  currency text,
  stripe_livemode boolean,
  fulfilment_action text,
  provider text,
  automatic_printful_line_count integer,
  attempt_count integer,
  order_status text,
  order_locale text,
  order_cart_hash text,
  order_expected_amount_total bigint,
  order_expected_currency text,
  order_stripe_session_id text,
  order_stripe_livemode boolean,
  order_stripe_payment_intent_id text,
  order_line_items jsonb,
  order_guard_summary jsonb,
  order_created_at timestamptz,
  order_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'commerce_outbox_worker_service_role_required';
  end if;
  if p_worker_id is null or length(p_worker_id) not between 24 and 160
    or p_worker_id !~ '^[A-Za-z0-9_-]+$'
    or p_lease_token is null or length(p_lease_token) not between 24 and 180
    or p_lease_token !~ '^[A-Za-z0-9_-]+$'
    or p_limit is null or p_limit not between 1 and 10
    or p_lease_seconds is null or p_lease_seconds not between 90 and 300
  then
    raise exception 'commerce_outbox_worker_claim_input_invalid';
  end if;

  return query
  with candidates as (
    select o.id
    from public.velmere_commerce_fulfilment_outbox o
    where (
      o.status in ('pending', 'retryable_failed')
      and coalesce(o.next_attempt_at, '-infinity'::timestamptz) <= now()
    ) or (
      o.status = 'processing'
      and coalesce(o.leased_until, '-infinity'::timestamptz) <= now()
    )
    order by
      case when o.status = 'processing' then 0 else 1 end,
      coalesce(o.next_attempt_at, o.created_at),
      o.created_at,
      o.id
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.velmere_commerce_fulfilment_outbox o
    set status = 'processing',
        attempt_count = o.attempt_count + 1,
        lease_token = p_lease_token,
        lease_owner = p_worker_id,
        claimed_at = now(),
        leased_until = now() + make_interval(secs => p_lease_seconds),
        next_attempt_at = null,
        updated_at = now()
    from candidates c
    where o.id = c.id
    returning o.*
  )
  select
    c.request_id,
    c.idempotency_key,
    c.order_draft_id,
    c.stripe_session_id,
    c.stripe_event_id,
    c.stripe_payment_intent_id,
    c.cart_hash,
    c.amount_total,
    c.currency,
    c.stripe_livemode,
    c.fulfilment_action,
    c.provider,
    c.automatic_printful_line_count,
    c.attempt_count,
    d.status,
    d.locale,
    d.cart_hash,
    d.expected_amount_total,
    d.expected_currency,
    d.stripe_session_id,
    d.stripe_livemode,
    d.stripe_payment_intent_id,
    d.line_items,
    d.guard_summary,
    d.created_at,
    d.updated_at
  from claimed c
  join public.velmere_order_drafts d on d.id = c.order_draft_id
  order by c.claimed_at, c.id;
end;
$$;

create or replace function public.velmere_complete_commerce_fulfilment_outbox(
  p_request_id text,
  p_lease_token text,
  p_provider_order_id text,
  p_execution_receipt jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.velmere_commerce_fulfilment_outbox%rowtype;
  v_next_order_status text;
  v_event_type text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'commerce_outbox_worker_service_role_required';
  end if;
  if p_request_id is null or p_request_id !~ '^commerce_fulfilment_[a-f0-9]{32}$'
    or p_lease_token is null or length(p_lease_token) not between 24 and 180
    or jsonb_typeof(p_execution_receipt) is distinct from 'object'
    or octet_length(p_execution_receipt::text) > 16384
    or p_execution_receipt->>'schemaVersion' is distinct from 'velmere.commerce-fulfilment-execution-receipt.v1'
    or coalesce(p_execution_receipt->>'receiptDigest', '') !~ '^sha256:[a-f0-9]{64}$'
    or coalesce(p_execution_receipt->>'requestBindingDigest', '') !~ '^sha256:[a-f0-9]{64}$'
    or coalesce(p_execution_receipt->>'stripePaymentIntentIdHash', '') !~ '^sha256:[a-f0-9]{64}$'
    or not public.velmere_is_commerce_fulfilment_receipt_redacted(p_execution_receipt)
  then
    raise exception 'commerce_outbox_worker_complete_input_invalid';
  end if;

  select * into v_item
  from public.velmere_commerce_fulfilment_outbox
  where request_id = p_request_id
  for update;
  if not found then raise exception 'commerce_outbox_worker_item_missing'; end if;
  if v_item.status = 'succeeded' then
    if v_item.provider_order_id is not distinct from p_provider_order_id
      and v_item.execution_receipt->>'receiptDigest' is not distinct from
        p_execution_receipt->>'receiptDigest'
    then
      return 'succeeded';
    end if;
    raise exception 'commerce_outbox_worker_completion_idempotency_conflict';
  end if;
  if v_item.status is distinct from 'processing' or v_item.lease_token is distinct from p_lease_token then
    raise exception 'commerce_outbox_worker_stale_lease';
  end if;
  if p_execution_receipt->>'requestId' is distinct from v_item.request_id
    or p_execution_receipt->>'orderDraftId' is distinct from v_item.order_draft_id
    or p_execution_receipt->>'action' is distinct from v_item.fulfilment_action
    or p_execution_receipt->>'provider' is distinct from v_item.provider
    or p_execution_receipt->>'attempt' is distinct from v_item.attempt_count::text
    or v_item.claimed_at is null
    or (p_execution_receipt->>'processedAt')::timestamptz < v_item.claimed_at - interval '30 seconds'
    or (p_execution_receipt->>'processedAt')::timestamptz > now() + interval '30 seconds'
    or p_execution_receipt->>'stripePaymentIntentIdHash' is distinct from
      'sha256:' || encode(digest(v_item.stripe_payment_intent_id, 'sha256'), 'hex')
    or p_execution_receipt->>'requestBindingDigest' is distinct from
      'sha256:' || encode(digest(concat_ws('|',
        'velmere.commerce-fulfilment-request-binding.v1',
        v_item.request_id,
        v_item.order_draft_id,
        v_item.stripe_session_id,
        v_item.stripe_event_id,
        v_item.stripe_payment_intent_id,
        v_item.cart_hash,
        v_item.amount_total::text,
        v_item.currency,
        v_item.stripe_livemode::text,
        v_item.fulfilment_action,
        v_item.provider,
        v_item.automatic_printful_line_count::text
      ), 'sha256'), 'hex')
    or jsonb_typeof(p_execution_receipt->'providerResult') is distinct from 'object'
    or p_execution_receipt->'providerResult'->>'externalId' is distinct from v_item.order_draft_id
  then
    raise exception 'commerce_outbox_worker_receipt_binding_mismatch';
  end if;

  if v_item.fulfilment_action = 'printful_order_draft' then
    if p_provider_order_id is null or p_provider_order_id !~ '^[1-9][0-9]{0,39}$'
      or coalesce(p_execution_receipt->>'result', '') not in ('provider_draft_created', 'provider_draft_reconciled')
      or p_execution_receipt->'providerResult'->>'providerOrderIdHash' is distinct from
        'sha256:' || encode(digest(p_provider_order_id, 'sha256'), 'hex')
    then
      raise exception 'commerce_outbox_worker_provider_result_invalid';
    end if;
    v_next_order_status := 'fulfilment_pending';
    v_event_type := 'provider_draft_created';
  else
    if p_provider_order_id is not null
      or p_execution_receipt->>'result' is distinct from 'manual_review_required'
      or p_execution_receipt->'providerResult'->>'providerOrderIdHash' is not null
    then
      raise exception 'commerce_outbox_worker_manual_result_invalid';
    end if;
    v_next_order_status := 'manual_fulfilment_required';
    v_event_type := 'manual_fulfilment_required';
  end if;

  update public.velmere_commerce_fulfilment_outbox
  set status = 'succeeded',
      provider_order_id = p_provider_order_id,
      execution_receipt = p_execution_receipt,
      failure_receipt = null,
      last_error_code = null,
      lease_token = null,
      lease_owner = null,
      leased_until = null,
      next_attempt_at = null,
      completed_at = now(),
      dead_lettered_at = null,
      updated_at = now()
  where id = v_item.id;

  update public.velmere_order_drafts
  set status = v_next_order_status,
      updated_at = now()
  where id = v_item.order_draft_id
    and cart_hash = v_item.cart_hash
    and stripe_session_id = v_item.stripe_session_id
    and stripe_payment_intent_id = v_item.stripe_payment_intent_id
    and expected_amount_total = v_item.amount_total
    and upper(expected_currency) = v_item.currency
    and stripe_livemode is not distinct from v_item.stripe_livemode
    and status in ('paid', 'fulfilment_pending', 'manual_fulfilment_required', 'fulfilment_created');
  if not found then
    raise exception 'commerce_outbox_worker_order_binding_changed';
  end if;

  insert into public.velmere_order_state_events (
    order_draft_id, event_type, status_before, status_after,
    stripe_session_id, stripe_event_id, provider, provider_order_id,
    severity, source_route, idempotency_key, redacted_payload
  ) values (
    v_item.order_draft_id, v_event_type, null, v_next_order_status,
    v_item.stripe_session_id, v_item.stripe_event_id, v_item.provider, p_provider_order_id,
    case when v_item.provider = 'manual' then 'review' else 'info' end,
    'rpc.velmere_complete_commerce_fulfilment_outbox',
    'commerce_fulfilment_complete:' || v_item.request_id,
    jsonb_build_object(
      'requestId', v_item.request_id,
      'receiptDigest', p_execution_receipt->>'receiptDigest',
      'requestBindingDigest', p_execution_receipt->>'requestBindingDigest',
      'attempt', v_item.attempt_count,
      'providerResultRecorded', p_provider_order_id is not null
    )
  ) on conflict (idempotency_key) do nothing;
  return 'succeeded';
end;
$$;

create or replace function public.velmere_fail_commerce_fulfilment_outbox(
  p_request_id text,
  p_lease_token text,
  p_retryable boolean,
  p_error_code text,
  p_retry_threshold integer default 8,
  p_execution_receipt jsonb default '{}'::jsonb
)
returns table(settled_status text, next_attempt_at timestamptz, retry_after_seconds bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.velmere_commerce_fulfilment_outbox%rowtype;
  v_base_seconds integer;
  v_jitter_seconds integer;
  v_delay_seconds integer;
  v_next_attempt_at timestamptz;
  v_dead_letter boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'commerce_outbox_worker_service_role_required';
  end if;
  if p_request_id is null or p_request_id !~ '^commerce_fulfilment_[a-f0-9]{32}$'
    or p_lease_token is null or length(p_lease_token) not between 24 and 180
    or p_retryable is null
    or p_error_code is null or p_error_code !~ '^[a-z0-9:_-]{1,120}$'
    or p_retry_threshold is null or p_retry_threshold not between 1 and 20
    or jsonb_typeof(p_execution_receipt) is distinct from 'object'
    or octet_length(p_execution_receipt::text) > 16384
    or p_execution_receipt->>'schemaVersion' is distinct from 'velmere.commerce-fulfilment-execution-receipt.v1'
    or coalesce(p_execution_receipt->>'receiptDigest', '') !~ '^sha256:[a-f0-9]{64}$'
    or not public.velmere_is_commerce_fulfilment_receipt_redacted(p_execution_receipt)
  then
    raise exception 'commerce_outbox_worker_fail_input_invalid';
  end if;

  select * into v_item
  from public.velmere_commerce_fulfilment_outbox
  where request_id = p_request_id
  for update;
  if not found then raise exception 'commerce_outbox_worker_item_missing'; end if;
  if v_item.status in ('retryable_failed', 'dead_letter')
    and v_item.failure_receipt->>'receiptDigest' is not distinct from
      p_execution_receipt->>'receiptDigest'
  then
    return query select
      v_item.status,
      v_item.next_attempt_at,
      case when v_item.next_attempt_at is null then null::bigint
        else greatest(0, ceil(extract(epoch from (v_item.next_attempt_at - now())))::bigint)
      end;
    return;
  end if;
  if v_item.status is distinct from 'processing' or v_item.lease_token is distinct from p_lease_token then
    raise exception 'commerce_outbox_worker_stale_lease';
  end if;
  if p_execution_receipt->>'requestId' is distinct from v_item.request_id
    or p_execution_receipt->>'orderDraftId' is distinct from v_item.order_draft_id
    or p_execution_receipt->>'action' is distinct from v_item.fulfilment_action
    or p_execution_receipt->>'provider' is distinct from v_item.provider
    or p_execution_receipt->>'attempt' is distinct from v_item.attempt_count::text
    or v_item.claimed_at is null
    or (p_execution_receipt->>'processedAt')::timestamptz < v_item.claimed_at - interval '30 seconds'
    or (p_execution_receipt->>'processedAt')::timestamptz > now() + interval '30 seconds'
    or p_execution_receipt->>'stripePaymentIntentIdHash' is distinct from
      'sha256:' || encode(digest(v_item.stripe_payment_intent_id, 'sha256'), 'hex')
    or p_execution_receipt->>'requestBindingDigest' is distinct from
      'sha256:' || encode(digest(concat_ws('|',
        'velmere.commerce-fulfilment-request-binding.v1',
        v_item.request_id,
        v_item.order_draft_id,
        v_item.stripe_session_id,
        v_item.stripe_event_id,
        v_item.stripe_payment_intent_id,
        v_item.cart_hash,
        v_item.amount_total::text,
        v_item.currency,
        v_item.stripe_livemode::text,
        v_item.fulfilment_action,
        v_item.provider,
        v_item.automatic_printful_line_count::text
      ), 'sha256'), 'hex')
    or jsonb_typeof(p_execution_receipt->'providerResult') is distinct from 'object'
    or p_execution_receipt->'providerResult'->>'externalId' is distinct from v_item.order_draft_id
    or p_execution_receipt->'providerResult'->>'providerOrderIdHash' is not null
    or p_execution_receipt->'providerResult'->>'errorCode' is distinct from p_error_code
  then
    raise exception 'commerce_outbox_worker_receipt_binding_mismatch';
  end if;

  v_dead_letter := not p_retryable or v_item.attempt_count >= p_retry_threshold;
  if p_execution_receipt->>'result' is distinct from
    (case when v_dead_letter then 'dead_letter' else 'retryable_failed' end)
  then
    raise exception 'commerce_outbox_worker_failure_receipt_status_mismatch';
  end if;
  if v_dead_letter then
    update public.velmere_commerce_fulfilment_outbox
    set status = 'dead_letter',
        failure_receipt = p_execution_receipt,
        last_error_code = p_error_code,
        lease_token = null,
        lease_owner = null,
        leased_until = null,
        next_attempt_at = null,
        dead_lettered_at = now(),
        updated_at = now()
    where id = v_item.id;

    update public.velmere_order_drafts
    set status = 'manual_fulfilment_required', updated_at = now()
    where id = v_item.order_draft_id
      and status not in ('fulfilled', 'refunded', 'cancelled');

    insert into public.velmere_order_state_events (
      order_draft_id, event_type, status_before, status_after,
      stripe_session_id, stripe_event_id, provider, severity,
      source_route, idempotency_key, redacted_payload
    ) values (
      v_item.order_draft_id, 'provider_draft_failed', null, 'manual_fulfilment_required',
      v_item.stripe_session_id, v_item.stripe_event_id, v_item.provider, 'critical',
      'rpc.velmere_fail_commerce_fulfilment_outbox',
      'commerce_fulfilment_dead_letter:' || v_item.request_id,
      jsonb_build_object(
        'requestId', v_item.request_id,
        'receiptDigest', p_execution_receipt->>'receiptDigest',
        'errorCode', p_error_code,
        'attempt', v_item.attempt_count,
        'manualReviewRequired', true
      )
    ) on conflict (idempotency_key) do nothing;
    return query select 'dead_letter'::text, null::timestamptz, null::bigint;
    return;
  end if;

  v_base_seconds := least(
    3000,
    (15 * power(2::numeric, least(greatest(v_item.attempt_count - 1, 0), 8)))::integer
  );
  v_jitter_seconds := get_byte(
    digest(v_item.request_id || ':' || v_item.attempt_count::text, 'sha256'),
    0
  ) % (least(600, greatest(1, floor(v_base_seconds * 0.20)::integer)) + 1);
  v_delay_seconds := least(3600, v_base_seconds + v_jitter_seconds);
  v_next_attempt_at := now() + make_interval(secs => v_delay_seconds);

  update public.velmere_commerce_fulfilment_outbox
  set status = 'retryable_failed',
      failure_receipt = p_execution_receipt,
      last_error_code = p_error_code,
      lease_token = null,
      lease_owner = null,
      leased_until = null,
      next_attempt_at = v_next_attempt_at,
      updated_at = now()
  where id = v_item.id;
  return query select 'retryable_failed'::text, v_next_attempt_at, v_delay_seconds::bigint;
end;
$$;

create or replace function public.velmere_release_commerce_fulfilment_outbox(
  p_request_id text,
  p_lease_token text,
  p_reason_code text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'commerce_outbox_worker_service_role_required';
  end if;
  if p_request_id is null or p_request_id !~ '^commerce_fulfilment_[a-f0-9]{32}$'
    or p_lease_token is null or length(p_lease_token) not between 24 and 180
    or p_reason_code is null or p_reason_code !~ '^[a-z0-9:_-]{1,120}$'
  then
    raise exception 'commerce_outbox_worker_release_input_invalid';
  end if;
  update public.velmere_commerce_fulfilment_outbox
  set status = 'pending',
      attempt_count = greatest(0, attempt_count - 1),
      lease_token = null,
      lease_owner = null,
      leased_until = null,
      next_attempt_at = now(),
      last_error_code = p_reason_code,
      updated_at = now()
  where request_id = p_request_id
    and status = 'processing'
    and lease_token = p_lease_token;
  if not found then raise exception 'commerce_outbox_worker_stale_lease'; end if;
  return 'released';
end;
$$;

revoke all on function public.velmere_claim_commerce_fulfilment_outbox(text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.velmere_complete_commerce_fulfilment_outbox(text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.velmere_fail_commerce_fulfilment_outbox(text, text, boolean, text, integer, jsonb)
  from public, anon, authenticated;
revoke all on function public.velmere_release_commerce_fulfilment_outbox(text, text, text)
  from public, anon, authenticated;
grant execute on function public.velmere_claim_commerce_fulfilment_outbox(text, text, integer, integer)
  to service_role;
grant execute on function public.velmere_complete_commerce_fulfilment_outbox(text, text, text, jsonb)
  to service_role;
grant execute on function public.velmere_fail_commerce_fulfilment_outbox(text, text, boolean, text, integer, jsonb)
  to service_role;
grant execute on function public.velmere_release_commerce_fulfilment_outbox(text, text, text)
  to service_role;

comment on function public.velmere_claim_commerce_fulfilment_outbox(text, text, integer, integer) is
  'Claims a bounded batch with row locks and SKIP LOCKED, including deterministic stale-lease recovery. Service role only.';
comment on function public.velmere_complete_commerce_fulfilment_outbox(text, text, text, jsonb) is
  'Atomically records the redacted, digest-bound provider result, settles the outbox, updates the exact durable order and appends its state event.';
comment on function public.velmere_fail_commerce_fulfilment_outbox(text, text, boolean, text, integer, jsonb) is
  'Atomically retries with deterministic bounded exponential backoff or dead-letters into manual review. Service role only.';
comment on function public.velmere_release_commerce_fulfilment_outbox(text, text, text) is
  'Releases a claim before an external effect when the bounded worker deadline is exhausted.';
-- PASS4994 COMMERCE FULFILMENT OUTBOX WORKER END
