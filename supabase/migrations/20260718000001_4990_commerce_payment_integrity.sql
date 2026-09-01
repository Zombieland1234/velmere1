-- P0 commerce payment integrity.
-- Bind fulfilment release to durable amount/currency/mode/session/payment lineage.

alter table public.velmere_order_drafts
  add column if not exists expected_amount_total bigint,
  add column if not exists expected_currency text,
  add column if not exists stripe_livemode boolean,
  add column if not exists stripe_payment_intent_id text;

-- Backfill only rows whose redacted line-item snapshot is complete enough to
-- prove a single currency and integer amount. Ambiguous legacy rows stay NULL
-- and therefore fail closed in the webhook until an operator repairs them.
with derived as (
  select
    draft.id,
    sum(
      case
        when item.value ? 'amount'
          and item.value ? 'quantity'
          and (item.value->>'amount') ~ '^[0-9]+$'
          and (item.value->>'quantity') ~ '^[1-9][0-9]*$'
          and length(item.value->>'amount') <= 12
          and length(item.value->>'quantity') <= 6
        then (item.value->>'amount')::bigint * (item.value->>'quantity')::bigint
        else null
      end
    ) as amount_total,
    case
      when count(distinct upper(item.value->>'currency')) = 1
      then min(upper(item.value->>'currency'))
      else null
    end as currency,
    bool_and(
      item.value ? 'amount'
      and item.value ? 'quantity'
      and item.value ? 'currency'
      and (item.value->>'amount') ~ '^[0-9]+$'
      and (item.value->>'quantity') ~ '^[1-9][0-9]*$'
      and length(item.value->>'amount') <= 12
      and length(item.value->>'quantity') <= 6
      and upper(item.value->>'currency') ~ '^[A-Z]{3}$'
    ) as complete
  from public.velmere_order_drafts draft
  cross join lateral jsonb_array_elements(draft.line_items) item(value)
  group by draft.id
)
update public.velmere_order_drafts draft
set expected_amount_total = derived.amount_total,
    expected_currency = derived.currency
from derived
where draft.id = derived.id
  and derived.complete
  and draft.expected_amount_total is null
  and draft.expected_currency is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'velmere_order_drafts_expected_amount_check'
      and conrelid = 'public.velmere_order_drafts'::regclass
  ) then
    alter table public.velmere_order_drafts
      add constraint velmere_order_drafts_expected_amount_check
      check (expected_amount_total is null or expected_amount_total >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'velmere_order_drafts_expected_currency_check'
      and conrelid = 'public.velmere_order_drafts'::regclass
  ) then
    alter table public.velmere_order_drafts
      add constraint velmere_order_drafts_expected_currency_check
      check (expected_currency is null or expected_currency ~ '^[A-Z]{3}$');
  end if;
end
$$;

create unique index if not exists velmere_order_drafts_payment_intent_idx
  on public.velmere_order_drafts(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

alter table public.velmere_payment_event_watermarks
  drop constraint if exists velmere_payment_event_watermarks_kind_check;
alter table public.velmere_payment_event_watermarks
  add constraint velmere_payment_event_watermarks_kind_check
  check (event_kind in (
    'payment_pending',
    'payment_failed',
    'checkout_completed',
    'partial_refund',
    'refund',
    'chargeback'
  ));

comment on column public.velmere_order_drafts.expected_amount_total is
  'Server-computed smallest-currency-unit total; exact match required before fulfilment.';
comment on column public.velmere_order_drafts.expected_currency is
  'Server-computed ISO currency; exact match required before fulfilment.';
comment on column public.velmere_order_drafts.stripe_livemode is
  'Stripe mode captured at Checkout Session creation; exact webhook match required.';
comment on column public.velmere_order_drafts.stripe_payment_intent_id is
  'PaymentIntent lineage bound on checkout creation or first verified paid event.';
