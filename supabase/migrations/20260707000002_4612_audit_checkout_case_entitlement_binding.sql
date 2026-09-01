-- PASS4612 — bind one paid audit case to one Stripe Checkout session and promote
-- only after a matching durable entitlement exists. Success URL alone is never sufficient.

alter table public.velmere_audit_intake_cases
  add column if not exists checkout_session_id text null,
  add column if not exists checkout_context_hash text null,
  add column if not exists checkout_product_id text null,
  add column if not exists entitlement_id text null,
  add column if not exists payment_event_id text null,
  add column if not exists entitlement_verified_at timestamptz null;

alter table public.velmere_audit_intake_cases
  drop constraint if exists velmere_audit_intake_cases_status_check;
alter table public.velmere_audit_intake_cases
  drop constraint if exists velmere_audit_intake_status_check;
alter table public.velmere_audit_intake_cases
  add constraint velmere_audit_intake_status_check
  check (status in ('queued_basic_prescreen', 'awaiting_entitlement', 'checkout_pending', 'queued_paid_review'));

alter table public.velmere_audit_intake_cases
  drop constraint if exists velmere_audit_intake_checkout_product_check;
alter table public.velmere_audit_intake_cases
  add constraint velmere_audit_intake_checkout_product_check
  check (checkout_product_id is null or checkout_product_id in ('vlm_pro_audit_review', 'vlm_advanced_audit_human_review'));

alter table public.velmere_audit_intake_cases
  drop constraint if exists velmere_audit_intake_checkout_binding_complete;
alter table public.velmere_audit_intake_cases
  add constraint velmere_audit_intake_checkout_binding_complete check (
    (checkout_session_id is null and checkout_context_hash is null and checkout_product_id is null)
    or
    (checkout_session_id is not null and checkout_context_hash is not null and checkout_product_id is not null)
  );

alter table public.velmere_audit_intake_cases
  drop constraint if exists velmere_audit_intake_paid_queue_verified;
alter table public.velmere_audit_intake_cases
  add constraint velmere_audit_intake_paid_queue_verified check (
    status <> 'queued_paid_review'
    or (entitlement_verified = true and entitlement_id is not null and entitlement_verified_at is not null)
  );

create unique index if not exists velmere_audit_intake_checkout_session_unique_idx
  on public.velmere_audit_intake_cases (checkout_session_id)
  where checkout_session_id is not null;
create index if not exists velmere_audit_intake_paid_queue_idx
  on public.velmere_audit_intake_cases (status, entitlement_verified_at asc)
  where status = 'queued_paid_review';


-- The original PASS2223 product allow-list predates the Pro commercial tier.
-- Re-align it with the current paid product catalogue so a valid Pro audit receipt
-- can be persisted instead of failing after Stripe has already confirmed payment.
alter table public.velmere_vlm_paid_entitlements
  drop constraint if exists velmere_vlm_paid_entitlements_product_check;
alter table public.velmere_vlm_paid_entitlements
  add constraint velmere_vlm_paid_entitlements_product_check
  check (product_id in (
    'vlm_pro_analysis_single',
    'vlm_pro_pdf_single',
    'vlm_pro_audit_review',
    'vlm_advanced_analysis_single',
    'vlm_advanced_pdf_single',
    'vlm_advanced_audit_human_review'
  ));

create or replace function public.velmere_bind_paid_audit_checkout(
  p_case_ref text,
  p_account_id text,
  p_tier text,
  p_product_id text,
  p_stripe_session_id text,
  p_context_hash text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_now timestamptz := now();
begin
  select * into v_case
  from public.velmere_audit_intake_cases
  where case_ref = p_case_ref
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'case_not_found');
  end if;

  if v_case.account_id is null or v_case.account_id <> p_account_id then
    return jsonb_build_object('ok', false, 'error', 'case_account_mismatch');
  end if;

  if v_case.tier <> p_tier
     or (p_tier = 'pro' and p_product_id <> 'vlm_pro_audit_review')
     or (p_tier = 'advanced' and p_product_id <> 'vlm_advanced_audit_human_review')
     or p_tier not in ('pro', 'advanced') then
    return jsonb_build_object('ok', false, 'error', 'case_tier_mismatch');
  end if;

  if v_case.entitlement_required <> true
     or v_case.entitlement_verified = true
     or v_case.status in ('queued_basic_prescreen', 'queued_paid_review') then
    return jsonb_build_object('ok', false, 'error', 'case_not_payable');
  end if;

  if v_case.checkout_session_id is not null then
    if v_case.checkout_session_id = p_stripe_session_id
       and v_case.checkout_context_hash = p_context_hash
       and v_case.checkout_product_id = p_product_id
       and v_case.status = 'checkout_pending' then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'caseRef', v_case.case_ref,
        'status', v_case.status
      );
    end if;
    return jsonb_build_object('ok', false, 'error', 'case_already_bound_to_checkout');
  end if;

  if v_case.status <> 'awaiting_entitlement' then
    return jsonb_build_object('ok', false, 'error', 'case_not_payable');
  end if;

  update public.velmere_audit_intake_cases
  set status = 'checkout_pending',
      checkout_session_id = p_stripe_session_id,
      checkout_context_hash = p_context_hash,
      checkout_product_id = p_product_id,
      updated_at = v_now
  where case_id = v_case.case_id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'caseRef', v_case.case_ref,
    'status', 'checkout_pending'
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'checkout_session_already_used');
end;
$$;

revoke all on function public.velmere_bind_paid_audit_checkout(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.velmere_bind_paid_audit_checkout(text, text, text, text, text, text) to service_role;

comment on function public.velmere_bind_paid_audit_checkout(text, text, text, text, text, text) is
  'PASS4612 atomic one-case/one-checkout binding. Locks the case row and never overwrites a different session.';

create or replace function public.velmere_promote_paid_audit_case(
  p_case_ref text,
  p_stripe_session_id text,
  p_product_id text,
  p_context_hash text,
  p_entitlement_id text,
  p_payment_event_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_entitlement public.velmere_vlm_paid_entitlements%rowtype;
  v_now timestamptz := now();
begin
  select * into v_entitlement
  from public.velmere_vlm_paid_entitlements
  where id = p_entitlement_id
    and stripe_session_id = p_stripe_session_id
    and product_id = p_product_id
    and context_hash = p_context_hash
    and status in ('paid', 'active')
    and coalesce(payment_status, 'paid') = 'paid'
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'matching_entitlement_not_found');
  end if;

  select * into v_case
  from public.velmere_audit_intake_cases
  where case_ref = p_case_ref
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'case_not_found');
  end if;

  if v_case.status = 'queued_paid_review'
     and v_case.entitlement_verified = true
     and v_case.entitlement_id = p_entitlement_id then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'caseRef', v_case.case_ref,
      'status', v_case.status,
      'analysisStarted', v_case.analysis_started
    );
  end if;

  if v_case.status <> 'checkout_pending'
     or v_case.checkout_session_id <> p_stripe_session_id
     or v_case.checkout_context_hash <> p_context_hash
     or v_case.checkout_product_id <> p_product_id then
    return jsonb_build_object('ok', false, 'error', 'checkout_binding_mismatch');
  end if;

  if (v_case.tier = 'pro' and p_product_id <> 'vlm_pro_audit_review')
     or (v_case.tier = 'advanced' and p_product_id <> 'vlm_advanced_audit_human_review')
     or v_case.tier = 'basic' then
    return jsonb_build_object('ok', false, 'error', 'tier_product_mismatch');
  end if;

  update public.velmere_audit_intake_cases
  set status = 'queued_paid_review',
      entitlement_verified = true,
      entitlement_id = p_entitlement_id,
      payment_event_id = p_payment_event_id,
      entitlement_verified_at = v_now,
      analysis_started = false,
      updated_at = v_now
  where case_id = v_case.case_id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'caseRef', v_case.case_ref,
    'status', 'queued_paid_review',
    'analysisStarted', false
  );
end;
$$;

revoke all on function public.velmere_promote_paid_audit_case(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.velmere_promote_paid_audit_case(text, text, text, text, text, text) to service_role;

comment on function public.velmere_promote_paid_audit_case(text, text, text, text, text, text) is
  'PASS4612 atomic paid-audit case transition. Requires an exact durable entitlement and exact checkout binding; never starts analysis.';
