-- PASS4613 — account-owned audit status and append-only payment terminal events.
-- The customer status route never reads target_private. Signed Stripe terminal events
-- block/revoke the case without deleting prior intake, checkout or entitlement receipts.

alter table public.velmere_audit_intake_cases
  add column if not exists blocked_reason text null,
  add column if not exists blocked_event_hash text null,
  add column if not exists blocked_at timestamptz null;

alter table public.velmere_audit_intake_cases
  drop constraint if exists velmere_audit_intake_status_check;
alter table public.velmere_audit_intake_cases
  add constraint velmere_audit_intake_status_check
  check (status in (
    'queued_basic_prescreen',
    'awaiting_entitlement',
    'checkout_pending',
    'queued_paid_review',
    'payment_blocked',
    'access_revoked'
  ));

alter table public.velmere_audit_intake_cases
  drop constraint if exists velmere_audit_intake_blocked_reason_check;
alter table public.velmere_audit_intake_cases
  add constraint velmere_audit_intake_blocked_reason_check
  check (blocked_reason is null or blocked_reason in ('checkout_expired', 'payment_failed', 'refund', 'chargeback'));

create table if not exists public.velmere_audit_case_payment_events (
  event_receipt_id uuid primary key default gen_random_uuid(),
  event_hash text not null unique,
  case_id text not null references public.velmere_audit_intake_cases(case_id) on delete restrict,
  case_ref text not null,
  event_type text not null check (event_type in ('checkout_expired', 'payment_failed', 'refund', 'chargeback')),
  previous_status text not null,
  next_status text not null,
  stale_ignored boolean not null default false,
  entitlement_revoked boolean not null default false,
  analysis_started boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists velmere_audit_case_payment_events_case_idx
  on public.velmere_audit_case_payment_events(case_id, created_at desc);

alter table public.velmere_audit_case_payment_events enable row level security;
revoke all on table public.velmere_audit_case_payment_events from public, anon, authenticated;
grant all on table public.velmere_audit_case_payment_events to service_role;

comment on table public.velmere_audit_case_payment_events is
  'PASS4613 private append-only payment terminal receipt ledger. Stores only a SHA-256 event hash, never the raw Stripe event payload.';

create or replace function public.velmere_apply_audit_payment_terminal_event(
  p_case_ref text,
  p_product_id text,
  p_context_hash text,
  p_event_id text,
  p_event_type text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_event_hash text;
  v_previous_status text;
  v_next_status text;
  v_stale boolean := false;
  v_entitlement_revoked boolean := false;
  v_now timestamptz := now();
begin
  if p_event_type not in ('checkout_expired', 'payment_failed', 'refund', 'chargeback') then
    return jsonb_build_object('ok', false, 'error', 'invalid_event_type');
  end if;
  if p_product_id not in ('vlm_pro_audit_review', 'vlm_advanced_audit_human_review')
     or p_context_hash !~ '^[a-f0-9]{64}$'
     or coalesce(p_event_id, '') = '' then
    return jsonb_build_object('ok', false, 'error', 'payment_event_binding_mismatch');
  end if;

  v_event_hash := 'sha256:' || encode(digest(p_event_id, 'sha256'), 'hex');
  if exists (select 1 from public.velmere_audit_case_payment_events where event_hash = v_event_hash) then
    return jsonb_build_object('ok', true, 'idempotent', true, 'eventHash', v_event_hash);
  end if;

  select * into v_case
  from public.velmere_audit_intake_cases
  where case_ref = p_case_ref
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'case_not_found');
  end if;

  if v_case.checkout_product_id <> p_product_id
     or v_case.checkout_context_hash <> p_context_hash
     or v_case.checkout_session_id is null then
    return jsonb_build_object('ok', false, 'error', 'payment_event_binding_mismatch');
  end if;

  v_previous_status := v_case.status;

  if p_event_type in ('checkout_expired', 'payment_failed')
     and v_case.status in ('queued_paid_review', 'access_revoked') then
    v_stale := true;
    v_next_status := v_case.status;
  elsif p_event_type in ('refund', 'chargeback') then
    v_next_status := 'access_revoked';
    update public.velmere_vlm_paid_entitlements
    set status = 'refunded',
        payment_status = p_event_type,
        updated_at = v_now
    where stripe_session_id = v_case.checkout_session_id
      and product_id = p_product_id
      and context_hash = p_context_hash
      and status in ('paid', 'active');
    v_entitlement_revoked := found;
  else
    v_next_status := 'payment_blocked';
    update public.velmere_vlm_paid_entitlements
    set status = 'expired',
        payment_status = p_event_type,
        updated_at = v_now
    where stripe_session_id = v_case.checkout_session_id
      and product_id = p_product_id
      and context_hash = p_context_hash
      and status in ('paid', 'active');
    v_entitlement_revoked := found;
  end if;

  if not v_stale then
    update public.velmere_audit_intake_cases
    set status = v_next_status,
        entitlement_verified = false,
        analysis_started = false,
        blocked_reason = p_event_type,
        blocked_event_hash = v_event_hash,
        blocked_at = v_now,
        updated_at = v_now
    where case_id = v_case.case_id;
  end if;

  insert into public.velmere_audit_case_payment_events (
    event_hash,
    case_id,
    case_ref,
    event_type,
    previous_status,
    next_status,
    stale_ignored,
    entitlement_revoked,
    analysis_started,
    created_at
  ) values (
    v_event_hash,
    v_case.case_id,
    v_case.case_ref,
    p_event_type,
    v_previous_status,
    v_next_status,
    v_stale,
    v_entitlement_revoked,
    false,
    v_now
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'staleIgnored', v_stale,
    'eventHash', v_event_hash,
    'caseRef', v_case.case_ref,
    'previousStatus', v_previous_status,
    'status', v_next_status,
    'entitlementRevoked', v_entitlement_revoked,
    'analysisStarted', false
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', true, 'idempotent', true, 'eventHash', v_event_hash);
end;
$$;

revoke all on function public.velmere_apply_audit_payment_terminal_event(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.velmere_apply_audit_payment_terminal_event(text, text, text, text, text) to service_role;

comment on function public.velmere_apply_audit_payment_terminal_event(text, text, text, text, text) is
  'PASS4613 exact case/product/context terminal-event transition. Refund/chargeback revoke entitlement; failed/expired checkout cannot override an already paid queue.';
