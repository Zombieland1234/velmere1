-- PASS4616 — private Advanced reviewer assignment + SLA and Pro worker lease/retry/dead-letter orchestration.
-- Reviewer and worker principals are stored only as SHA-256 hashes. Customer history receives safe event types only.

create table if not exists public.velmere_audit_review_orchestration (
  orchestration_id uuid primary key default gen_random_uuid(),
  case_id text not null unique references public.velmere_audit_intake_cases(case_id) on delete restrict,
  case_ref text not null unique,
  tier text not null check (tier in ('pro', 'advanced')),
  review_state text not null default 'queued' check (review_state in ('queued', 'assigned', 'leased', 'retry_wait', 'dead_letter', 'completed', 'revoked')),
  reviewer_principal_hash text null,
  assignment_request_hash text null,
  assigned_at timestamptz null,
  sla_due_at timestamptz null,
  worker_principal_hash text null,
  lease_token_hash text null,
  claim_request_hash text null,
  lease_expires_at timestamptz null,
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 32),
  max_attempts integer not null default 3 check (max_attempts between 1 and 8),
  next_attempt_at timestamptz null,
  dead_letter_reason_code text null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_audit_review_advanced_assignment_shape check (
    tier <> 'advanced'
    or reviewer_principal_hash is null
    or (assigned_at is not null and sla_due_at is not null)
  ),
  constraint velmere_audit_review_pro_lease_shape check (
    (lease_token_hash is null and worker_principal_hash is null and lease_expires_at is null)
    or (tier = 'pro' and lease_token_hash is not null and worker_principal_hash is not null and lease_expires_at is not null)
  )
);

create index if not exists velmere_audit_review_pro_claim_idx
  on public.velmere_audit_review_orchestration(review_state, next_attempt_at, updated_at)
  where tier = 'pro' and review_state in ('queued', 'retry_wait', 'leased');
create index if not exists velmere_audit_review_advanced_sla_idx
  on public.velmere_audit_review_orchestration(sla_due_at, review_state)
  where tier = 'advanced' and review_state = 'assigned';

alter table public.velmere_audit_review_orchestration enable row level security;
revoke all on table public.velmere_audit_review_orchestration from public, anon, authenticated;
grant all on table public.velmere_audit_review_orchestration to service_role;

comment on table public.velmere_audit_review_orchestration is
  'PASS4616 private review orchestration. Stores only reviewer/worker hashes and lease hashes; customer APIs expose a redacted projection.';

-- Extend the PASS4615 append function with customer-safe orchestration events.
create or replace function public.velmere_append_audit_case_status_history(
  p_case_id text,
  p_case_ref text,
  p_event_type text,
  p_previous_status text,
  p_next_status text,
  p_tier text,
  p_entitlement_required boolean,
  p_entitlement_verified boolean,
  p_analysis_started boolean,
  p_reason_code text,
  p_occurred_at timestamptz default now()
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sequence integer;
  v_previous_hash text;
  v_hash text;
  v_queue_lane text;
  v_payment_state text;
begin
  if p_event_type not in (
    'case_created', 'checkout_bound', 'payment_verified', 'queued_for_review',
    'payment_blocked', 'access_revoked', 'analysis_started', 'analysis_completed',
    'status_changed', 'migration_snapshot', 'reviewer_assigned', 'automation_claimed',
    'review_requeued', 'review_dead_lettered', 'automation_completed'
  ) then
    raise exception 'invalid_audit_history_event_type';
  end if;

  select case_sequence, event_hash into v_sequence, v_previous_hash
  from public.velmere_audit_case_status_history
  where case_id = p_case_id
  order by case_sequence desc
  limit 1
  for update;

  v_sequence := coalesce(v_sequence, 0) + 1;
  v_queue_lane := public.velmere_audit_history_queue_lane(p_tier, p_next_status);
  v_payment_state := public.velmere_audit_history_payment_state(p_next_status, p_entitlement_required, p_entitlement_verified, p_reason_code);
  v_hash := 'sha256:' || encode(digest(concat_ws('|',
    p_case_id, v_sequence::text, p_event_type, coalesce(p_previous_status, ''), p_next_status,
    v_queue_lane, v_payment_state, p_analysis_started::text, coalesce(p_reason_code, ''),
    p_occurred_at::text, coalesce(v_previous_hash, 'root')
  ), 'sha256'), 'hex');

  insert into public.velmere_audit_case_status_history (
    case_id, case_ref, case_sequence, event_type, previous_status, next_status,
    queue_lane, payment_state, analysis_started, reason_code,
    previous_event_hash, event_hash, occurred_at
  ) values (
    p_case_id, p_case_ref, v_sequence, p_event_type, p_previous_status, p_next_status,
    v_queue_lane, v_payment_state, p_analysis_started, p_reason_code,
    v_previous_hash, v_hash, p_occurred_at
  );
end;
$$;
revoke all on function public.velmere_append_audit_case_status_history(text,text,text,text,text,text,boolean,boolean,boolean,text,timestamptz) from public, anon, authenticated;
grant execute on function public.velmere_append_audit_case_status_history(text,text,text,text,text,text,boolean,boolean,boolean,text,timestamptz) to service_role;

create or replace function public.velmere_assign_advanced_audit_reviewer(
  p_case_ref text,
  p_reviewer_principal text,
  p_assignment_request_id text,
  p_sla_minutes integer default 1440
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_review public.velmere_audit_review_orchestration%rowtype;
  v_reviewer_hash text;
  v_request_hash text;
  v_now timestamptz := now();
  v_sla_minutes integer := greatest(30, least(coalesce(p_sla_minutes, 1440), 4320));
begin
  if coalesce(trim(p_reviewer_principal), '') = '' or coalesce(trim(p_assignment_request_id), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  v_reviewer_hash := 'sha256:' || encode(digest(p_reviewer_principal, 'sha256'), 'hex');
  v_request_hash := 'sha256:' || encode(digest(p_assignment_request_id, 'sha256'), 'hex');

  select * into v_case from public.velmere_audit_intake_cases where case_ref = p_case_ref for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'case_not_found'); end if;
  if v_case.tier <> 'advanced' or v_case.status <> 'queued_paid_review' or not v_case.entitlement_verified or v_case.analysis_started then
    return jsonb_build_object('ok', false, 'error', 'case_not_eligible');
  end if;

  select * into v_review from public.velmere_audit_review_orchestration where case_id = v_case.case_id for update;
  if found and (v_review.assignment_request_hash = v_request_hash or (v_review.reviewer_principal_hash = v_reviewer_hash and v_review.review_state = 'assigned')) then
    return jsonb_build_object('ok', true, 'idempotent', true, 'caseRef', v_case.case_ref, 'state', v_review.review_state, 'slaDueAt', v_review.sla_due_at);
  end if;
  if found and v_review.review_state in ('completed', 'revoked') then
    return jsonb_build_object('ok', false, 'error', 'case_not_eligible');
  end if;
  if found and v_review.reviewer_principal_hash is not null and v_review.reviewer_principal_hash <> v_reviewer_hash then
    return jsonb_build_object('ok', false, 'error', 'review_already_assigned');
  end if;

  insert into public.velmere_audit_review_orchestration (
    case_id, case_ref, tier, review_state, reviewer_principal_hash,
    assignment_request_hash, assigned_at, sla_due_at, updated_at
  ) values (
    v_case.case_id, v_case.case_ref, 'advanced', 'assigned', v_reviewer_hash,
    v_request_hash, v_now, v_now + make_interval(mins => v_sla_minutes), v_now
  ) on conflict (case_id) do update set
    review_state = 'assigned',
    reviewer_principal_hash = excluded.reviewer_principal_hash,
    assignment_request_hash = excluded.assignment_request_hash,
    assigned_at = coalesce(public.velmere_audit_review_orchestration.assigned_at, excluded.assigned_at),
    sla_due_at = coalesce(public.velmere_audit_review_orchestration.sla_due_at, excluded.sla_due_at),
    updated_at = excluded.updated_at;

  perform public.velmere_append_audit_case_status_history(
    v_case.case_id, v_case.case_ref, 'reviewer_assigned', v_case.status, v_case.status,
    v_case.tier, v_case.entitlement_required, v_case.entitlement_verified,
    v_case.analysis_started, 'human_review_assignment', v_now
  );
  return jsonb_build_object('ok', true, 'idempotent', false, 'caseRef', v_case.case_ref, 'state', 'assigned', 'slaDueAt', v_now + make_interval(mins => v_sla_minutes));
end;
$$;
revoke all on function public.velmere_assign_advanced_audit_reviewer(text,text,text,integer) from public, anon, authenticated;
grant execute on function public.velmere_assign_advanced_audit_reviewer(text,text,text,integer) to service_role;

create or replace function public.velmere_claim_pro_audit_worker_lease(
  p_case_ref text,
  p_worker_principal text,
  p_claim_request_id text,
  p_lease_token text,
  p_lease_seconds integer default 300
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_review public.velmere_audit_review_orchestration%rowtype;
  v_worker_hash text;
  v_claim_hash text;
  v_token_hash text;
  v_now timestamptz := now();
  v_lease_seconds integer := greatest(60, least(coalesce(p_lease_seconds, 300), 1800));
  v_expires timestamptz;
begin
  if coalesce(trim(p_worker_principal), '') = '' or coalesce(trim(p_claim_request_id), '') = '' or length(coalesce(p_lease_token, '')) < 24 then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  v_worker_hash := 'sha256:' || encode(digest(p_worker_principal, 'sha256'), 'hex');
  v_claim_hash := 'sha256:' || encode(digest(p_claim_request_id, 'sha256'), 'hex');
  v_token_hash := 'sha256:' || encode(digest(p_lease_token, 'sha256'), 'hex');
  v_expires := v_now + make_interval(secs => v_lease_seconds);

  select * into v_case from public.velmere_audit_intake_cases where case_ref = p_case_ref for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'case_not_found'); end if;
  if v_case.tier <> 'pro' or v_case.status <> 'queued_paid_review' or not v_case.entitlement_verified or v_case.analysis_started then
    return jsonb_build_object('ok', false, 'error', 'case_not_eligible');
  end if;

  insert into public.velmere_audit_review_orchestration(case_id, case_ref, tier, review_state, updated_at)
  values (v_case.case_id, v_case.case_ref, 'pro', 'queued', v_now)
  on conflict (case_id) do nothing;
  select * into v_review from public.velmere_audit_review_orchestration where case_id = v_case.case_id for update;

  if v_review.claim_request_hash = v_claim_hash and v_review.lease_token_hash = v_token_hash and v_review.review_state = 'leased' then
    return jsonb_build_object('ok', true, 'idempotent', true, 'caseRef', v_case.case_ref, 'state', 'leased', 'leaseExpiresAt', v_review.lease_expires_at, 'attemptCount', v_review.attempt_count);
  end if;
  if v_review.review_state in ('completed', 'dead_letter', 'revoked') then
    return jsonb_build_object('ok', false, 'error', 'case_not_eligible');
  end if;
  if v_review.next_attempt_at is not null and v_review.next_attempt_at > v_now then
    return jsonb_build_object('ok', false, 'error', 'lease_unavailable', 'retryAt', v_review.next_attempt_at);
  end if;
  if v_review.review_state = 'leased' and v_review.lease_expires_at is not null and v_review.lease_expires_at > v_now then
    return jsonb_build_object('ok', false, 'error', 'lease_unavailable', 'leaseExpiresAt', v_review.lease_expires_at);
  end if;

  update public.velmere_audit_review_orchestration set
    review_state = 'leased',
    worker_principal_hash = v_worker_hash,
    lease_token_hash = v_token_hash,
    claim_request_hash = v_claim_hash,
    lease_expires_at = v_expires,
    next_attempt_at = null,
    updated_at = v_now
  where case_id = v_case.case_id;

  perform public.velmere_append_audit_case_status_history(
    v_case.case_id, v_case.case_ref, 'automation_claimed', v_case.status, v_case.status,
    v_case.tier, v_case.entitlement_required, v_case.entitlement_verified,
    v_case.analysis_started, 'pro_worker_lease', v_now
  );
  return jsonb_build_object('ok', true, 'idempotent', false, 'caseRef', v_case.case_ref, 'state', 'leased', 'leaseExpiresAt', v_expires, 'attemptCount', v_review.attempt_count);
end;
$$;
revoke all on function public.velmere_claim_pro_audit_worker_lease(text,text,text,text,integer) from public, anon, authenticated;
grant execute on function public.velmere_claim_pro_audit_worker_lease(text,text,text,text,integer) to service_role;

create or replace function public.velmere_settle_pro_audit_worker_lease(
  p_case_ref text,
  p_worker_principal text,
  p_lease_token text,
  p_outcome text,
  p_reason_code text default 'worker_result'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_review public.velmere_audit_review_orchestration%rowtype;
  v_worker_hash text;
  v_token_hash text;
  v_now timestamptz := now();
  v_attempt integer;
  v_state text;
  v_retry_at timestamptz;
  v_event_type text;
  v_safe_reason text;
begin
  if p_outcome not in ('complete', 'retry', 'dead_letter') or coalesce(trim(p_worker_principal), '') = '' or length(coalesce(p_lease_token, '')) < 24 then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  v_worker_hash := 'sha256:' || encode(digest(p_worker_principal, 'sha256'), 'hex');
  v_token_hash := 'sha256:' || encode(digest(p_lease_token, 'sha256'), 'hex');
  v_safe_reason := left(regexp_replace(coalesce(p_reason_code, 'worker_result'), '[^a-zA-Z0-9:_-]', '_', 'g'), 80);

  select * into v_case from public.velmere_audit_intake_cases where case_ref = p_case_ref for update;
  if not found or v_case.tier <> 'pro' or v_case.status <> 'queued_paid_review' or not v_case.entitlement_verified or v_case.analysis_started then return jsonb_build_object('ok', false, 'error', 'case_not_eligible'); end if;
  select * into v_review from public.velmere_audit_review_orchestration where case_id = v_case.case_id for update;
  if not found or v_review.review_state <> 'leased' or v_review.worker_principal_hash <> v_worker_hash or v_review.lease_token_hash <> v_token_hash then
    return jsonb_build_object('ok', false, 'error', 'lease_mismatch');
  end if;
  if v_review.lease_expires_at is null or v_review.lease_expires_at < v_now then
    return jsonb_build_object('ok', false, 'error', 'lease_mismatch', 'staleLease', true);
  end if;

  if p_outcome = 'complete' then
    v_attempt := v_review.attempt_count;
    v_state := 'completed';
    v_event_type := 'automation_completed';
  else
    v_attempt := v_review.attempt_count + 1;
    if p_outcome = 'dead_letter' or v_attempt >= v_review.max_attempts then
      v_state := 'dead_letter';
      v_event_type := 'review_dead_lettered';
    else
      v_state := 'retry_wait';
      v_event_type := 'review_requeued';
      v_retry_at := v_now + make_interval(mins => least(60, 5 * (2 ^ greatest(0, v_attempt - 1))::integer));
    end if;
  end if;

  update public.velmere_audit_review_orchestration set
    review_state = v_state,
    worker_principal_hash = null,
    lease_token_hash = null,
    claim_request_hash = null,
    lease_expires_at = null,
    attempt_count = v_attempt,
    next_attempt_at = v_retry_at,
    dead_letter_reason_code = case when v_state = 'dead_letter' then v_safe_reason else null end,
    completed_at = case when v_state = 'completed' then v_now else completed_at end,
    updated_at = v_now
  where case_id = v_case.case_id;

  perform public.velmere_append_audit_case_status_history(
    v_case.case_id, v_case.case_ref, v_event_type, v_case.status, v_case.status,
    v_case.tier, v_case.entitlement_required, v_case.entitlement_verified,
    v_case.analysis_started,
    case when v_state = 'dead_letter' then 'retry_exhausted' when v_state = 'retry_wait' then 'automation_retry' else null end,
    v_now
  );
  return jsonb_build_object('ok', true, 'caseRef', v_case.case_ref, 'state', v_state, 'retryAt', v_retry_at, 'attemptCount', v_attempt);
end;
$$;
revoke all on function public.velmere_settle_pro_audit_worker_lease(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.velmere_settle_pro_audit_worker_lease(text,text,text,text,text) to service_role;

create or replace function public.velmere_sync_audit_review_revocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('payment_blocked', 'access_revoked') and old.status is distinct from new.status then
    update public.velmere_audit_review_orchestration set
      review_state = 'revoked',
      worker_principal_hash = null,
      lease_token_hash = null,
      claim_request_hash = null,
      lease_expires_at = null,
      next_attempt_at = null,
      updated_at = new.updated_at
    where case_id = new.case_id and review_state <> 'completed';
  end if;
  return new;
end;
$$;
revoke all on function public.velmere_sync_audit_review_revocation() from public, anon, authenticated;
drop trigger if exists velmere_sync_audit_review_revocation on public.velmere_audit_intake_cases;
create trigger velmere_sync_audit_review_revocation
after update on public.velmere_audit_intake_cases
for each row execute function public.velmere_sync_audit_review_revocation();
