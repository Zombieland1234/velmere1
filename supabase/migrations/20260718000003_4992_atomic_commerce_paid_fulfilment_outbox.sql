-- PASS4992 ATOMIC COMMERCE PAID + FULFILMENT OUTBOX BEGIN
-- A verified Stripe payment, its durable state event, and the provider-action
-- request are committed by one service-role-only transaction. No webhook may
-- call a fulfilment provider before this durable request exists.

create table if not exists public.velmere_commerce_fulfilment_outbox (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  idempotency_key text not null unique,
  order_draft_id text not null references public.velmere_order_drafts(id) on delete restrict,
  stripe_session_id text not null,
  stripe_event_id text not null,
  stripe_payment_intent_id text not null,
  cart_hash text not null,
  amount_total bigint not null,
  currency text not null,
  stripe_livemode boolean not null,
  fulfilment_action text not null,
  provider text not null,
  automatic_printful_line_count integer not null default 0,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  lease_token text,
  leased_until timestamptz,
  last_error_code text,
  redacted_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_commerce_fulfilment_outbox_request_id_check
    check (request_id ~ '^commerce_fulfilment_[a-f0-9]{32}$'),
  constraint velmere_commerce_fulfilment_outbox_cart_hash_check
    check (cart_hash ~ '^[a-f0-9]{64}$'),
  constraint velmere_commerce_fulfilment_outbox_amount_check
    check (amount_total >= 0),
  constraint velmere_commerce_fulfilment_outbox_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint velmere_commerce_fulfilment_outbox_action_check
    check (fulfilment_action in ('printful_order_draft','manual_fulfilment_review')),
  constraint velmere_commerce_fulfilment_outbox_provider_check
    check (provider in ('printful','manual')),
  constraint velmere_commerce_fulfilment_outbox_action_provider_check
    check (
      (fulfilment_action = 'printful_order_draft' and provider = 'printful' and automatic_printful_line_count > 0)
      or
      (fulfilment_action = 'manual_fulfilment_review' and provider = 'manual' and automatic_printful_line_count = 0)
    ),
  constraint velmere_commerce_fulfilment_outbox_line_count_check
    check (automatic_printful_line_count between 0 and 1000),
  constraint velmere_commerce_fulfilment_outbox_status_check
    check (status in ('pending','processing','succeeded','retryable_failed','dead_letter','cancelled')),
  constraint velmere_commerce_fulfilment_outbox_attempt_count_check
    check (attempt_count between 0 and 1000)
);

create unique index if not exists velmere_commerce_fulfilment_outbox_payment_once_idx
  on public.velmere_commerce_fulfilment_outbox(order_draft_id, stripe_payment_intent_id);
create unique index if not exists velmere_commerce_fulfilment_outbox_stripe_event_idx
  on public.velmere_commerce_fulfilment_outbox(stripe_event_id);
create index if not exists velmere_commerce_fulfilment_outbox_claim_idx
  on public.velmere_commerce_fulfilment_outbox(status, next_attempt_at, created_at)
  where status in ('pending','retryable_failed');

alter table public.velmere_commerce_fulfilment_outbox enable row level security;
revoke all on table public.velmere_commerce_fulfilment_outbox from public, anon, authenticated;
grant select, insert, update on table public.velmere_commerce_fulfilment_outbox to service_role;

drop policy if exists velmere_commerce_fulfilment_outbox_service_role_all
  on public.velmere_commerce_fulfilment_outbox;
create policy velmere_commerce_fulfilment_outbox_service_role_all
  on public.velmere_commerce_fulfilment_outbox
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.velmere_commit_commerce_paid_and_enqueue_fulfilment(
  p_order_draft_id text,
  p_stripe_session_id text,
  p_stripe_event_id text,
  p_stripe_payment_intent_id text,
  p_cart_hash text,
  p_amount_total bigint,
  p_currency text,
  p_livemode boolean,
  p_fulfilment_action text,
  p_automatic_printful_line_count integer
)
returns table(
  transition_result text,
  order_status text,
  outbox_request_id text,
  outbox_status text,
  fulfilment_action text,
  idempotent_replay boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.velmere_order_drafts%rowtype;
  v_existing public.velmere_commerce_fulfilment_outbox%rowtype;
  v_previous_status text;
  v_next_status text;
  v_request_id text;
  v_idempotency_key text;
  v_state_event_key text;
  v_provider text;
  v_actual_automatic_printful_count integer;
  v_missing_provider_variant_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'commerce_paid_service_role_required';
  end if;

  if p_order_draft_id is null or length(p_order_draft_id) not between 1 and 160
    or p_order_draft_id !~ '^[A-Za-z0-9_-]+$'
    or p_stripe_session_id is null or length(p_stripe_session_id) not between 3 and 255
    or p_stripe_session_id !~ '^cs_[A-Za-z0-9_]+$'
    or p_stripe_event_id is null or length(p_stripe_event_id) not between 3 and 255
    or p_stripe_event_id !~ '^evt_[A-Za-z0-9_]+$'
    or p_stripe_payment_intent_id is null or length(p_stripe_payment_intent_id) not between 3 and 255
    or p_stripe_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$'
    or p_cart_hash is null or lower(p_cart_hash) !~ '^[a-f0-9]{64}$'
    or p_amount_total is null or p_amount_total < 0
    or p_currency is null or upper(p_currency) !~ '^[A-Z]{3}$'
    or p_livemode is null
    or p_fulfilment_action not in ('printful_order_draft','manual_fulfilment_review')
    or p_automatic_printful_line_count is null
    or p_automatic_printful_line_count not between 0 and 1000
  then
    raise exception 'commerce_paid_input_invalid';
  end if;

  select * into v_order
  from public.velmere_order_drafts
  where id = p_order_draft_id
  for update;

  if not found then
    raise exception 'commerce_paid_order_missing';
  end if;

  if v_order.status not in (
    'draft','checkout_started','failed','paid','fulfilment_pending',
    'manual_fulfilment_required','fulfilment_created','fulfilled'
  ) then
    raise exception 'commerce_paid_order_state_rejected';
  end if;

  if v_order.cart_hash <> lower(p_cart_hash)
    or v_order.stripe_session_id <> p_stripe_session_id
    or v_order.expected_amount_total <> p_amount_total
    or upper(v_order.expected_currency) <> upper(p_currency)
    or v_order.stripe_livemode is distinct from p_livemode
    or (
      v_order.stripe_payment_intent_id is not null
      and v_order.stripe_payment_intent_id <> p_stripe_payment_intent_id
    )
  then
    raise exception 'commerce_paid_exact_binding_mismatch';
  end if;

  select
    count(*) filter (
      where item.value->>'provider' = 'printful'
        and item.value->>'fulfilmentMode' = 'automatic'
    ),
    count(*) filter (
      where item.value->>'provider' = 'printful'
        and item.value->>'fulfilmentMode' = 'automatic'
        and coalesce(item.value->>'providerVariantId', '') = ''
    )
  into v_actual_automatic_printful_count, v_missing_provider_variant_count
  from jsonb_array_elements(v_order.line_items) item(value);

  if v_actual_automatic_printful_count <> p_automatic_printful_line_count
    or (p_fulfilment_action = 'printful_order_draft' and (
      v_actual_automatic_printful_count < 1 or v_missing_provider_variant_count > 0
    ))
    or (p_fulfilment_action = 'manual_fulfilment_review' and v_actual_automatic_printful_count <> 0)
  then
    raise exception 'commerce_paid_fulfilment_binding_mismatch';
  end if;

  v_provider := case
    when p_fulfilment_action = 'printful_order_draft' then 'printful'
    else 'manual'
  end;
  v_request_id := 'commerce_fulfilment_' || substr(
    encode(digest(
      p_order_draft_id || ':' || p_stripe_session_id || ':' ||
      p_stripe_payment_intent_id || ':' || p_fulfilment_action,
      'sha256'
    ), 'hex'),
    1,
    32
  );
  v_idempotency_key := 'commerce_paid_outbox:' || encode(digest(
    p_order_draft_id || ':' || p_stripe_session_id || ':' ||
    p_stripe_payment_intent_id || ':' || lower(p_cart_hash) || ':' ||
    p_amount_total::text || ':' || upper(p_currency) || ':' ||
    p_livemode::text || ':' || p_fulfilment_action || ':' ||
    p_automatic_printful_line_count::text,
    'sha256'
  ), 'hex');
  v_state_event_key := 'commerce_paid_event:' || encode(digest(
    p_order_draft_id || ':' || p_stripe_session_id || ':' || p_stripe_payment_intent_id,
    'sha256'
  ), 'hex');

  select * into v_existing
  from public.velmere_commerce_fulfilment_outbox
  where order_draft_id = p_order_draft_id
    and stripe_payment_intent_id = p_stripe_payment_intent_id;

  if found then
    if v_existing.request_id <> v_request_id
      or v_existing.idempotency_key <> v_idempotency_key
      or v_existing.stripe_session_id <> p_stripe_session_id
      or v_existing.cart_hash <> lower(p_cart_hash)
      or v_existing.amount_total <> p_amount_total
      or v_existing.currency <> upper(p_currency)
      or v_existing.stripe_livemode is distinct from p_livemode
      or v_existing.fulfilment_action <> p_fulfilment_action
      or v_existing.automatic_printful_line_count <> p_automatic_printful_line_count
    then
      raise exception 'commerce_paid_idempotency_conflict';
    end if;

    return query select
      'already_enqueued'::text,
      v_order.status,
      v_existing.request_id,
      v_existing.status,
      v_existing.fulfilment_action,
      true;
    return;
  end if;

  v_previous_status := v_order.status;
  v_next_status := case
    when v_order.status in ('draft','checkout_started','failed') then 'paid'
    else v_order.status
  end;

  update public.velmere_order_drafts
  set status = v_next_status,
      stripe_payment_intent_id = p_stripe_payment_intent_id,
      updated_at = now()
  where id = p_order_draft_id;

  insert into public.velmere_order_state_events (
    order_draft_id,
    event_type,
    status_before,
    status_after,
    stripe_session_id,
    stripe_event_id,
    provider,
    severity,
    source_route,
    idempotency_key,
    redacted_payload
  ) values (
    p_order_draft_id,
    'payment_succeeded',
    v_previous_status,
    v_next_status,
    p_stripe_session_id,
    p_stripe_event_id,
    'stripe',
    'info',
    'rpc.velmere_commit_commerce_paid_and_enqueue_fulfilment',
    v_state_event_key,
    jsonb_build_object(
      'stripeSessionId', p_stripe_session_id,
      'stripeEventId', p_stripe_event_id,
      'stripePaymentIntentId', p_stripe_payment_intent_id,
      'cartHash', lower(p_cart_hash),
      'amountTotal', p_amount_total,
      'currency', upper(p_currency),
      'livemode', p_livemode,
      'fulfilmentAction', p_fulfilment_action
    )
  );

  insert into public.velmere_commerce_fulfilment_outbox (
    request_id,
    idempotency_key,
    order_draft_id,
    stripe_session_id,
    stripe_event_id,
    stripe_payment_intent_id,
    cart_hash,
    amount_total,
    currency,
    stripe_livemode,
    fulfilment_action,
    provider,
    automatic_printful_line_count,
    redacted_payload
  ) values (
    v_request_id,
    v_idempotency_key,
    p_order_draft_id,
    p_stripe_session_id,
    p_stripe_event_id,
    p_stripe_payment_intent_id,
    lower(p_cart_hash),
    p_amount_total,
    upper(p_currency),
    p_livemode,
    p_fulfilment_action,
    v_provider,
    p_automatic_printful_line_count,
    jsonb_build_object(
      'orderDraftId', p_order_draft_id,
      'stripeSessionId', p_stripe_session_id,
      'stripeEventId', p_stripe_event_id,
      'stripePaymentIntentId', p_stripe_payment_intent_id,
      'automaticPrintfulLineCount', p_automatic_printful_line_count,
      'provider', v_provider
    )
  );

  return query select
    'enqueued'::text,
    v_next_status,
    v_request_id,
    'pending'::text,
    p_fulfilment_action,
    false;
end;
$$;

revoke all on function public.velmere_commit_commerce_paid_and_enqueue_fulfilment(
  text, text, text, text, text, bigint, text, boolean, text, integer
) from public, anon, authenticated;
grant execute on function public.velmere_commit_commerce_paid_and_enqueue_fulfilment(
  text, text, text, text, text, bigint, text, boolean, text, integer
) to service_role;

comment on table public.velmere_commerce_fulfilment_outbox is
  'Service-role-only transactional outbox. A paid state/event and exactly one fulfilment request commit together; no customer PII, raw provider payload, credentials, or secrets are stored.';
comment on function public.velmere_commit_commerce_paid_and_enqueue_fulfilment(
  text, text, text, text, text, bigint, text, boolean, text, integer
) is
  'Atomically verifies exact order/payment/provider-action binding, transitions paid state, writes the payment event, and idempotently enqueues one fulfilment request. Row lock serializes concurrent Stripe deliveries.';
-- PASS4992 ATOMIC COMMERCE PAID + FULFILMENT OUTBOX END
