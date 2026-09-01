-- P75 — V17 Advanced Audit automation runtime + durable customer-history repair.
-- Forward-only repair: historical PASS4615/PASS4616/PASS4806 migrations remain byte-identical.
-- Current Advanced automation must never depend on human assignment, SLA or manual sign-off.

-- PASS4615 table constraints originally predated PASS4616 orchestration events. Extend
-- the immutable projection schema without rewriting any historical row.
alter table public.velmere_audit_case_status_history
  drop constraint if exists velmere_audit_case_status_history_event_type_check,
  drop constraint if exists velmere_audit_case_status_history_queue_lane_check,
  drop constraint if exists velmere_audit_case_status_history_reason_code_check;

alter table public.velmere_audit_case_status_history
  add constraint velmere_audit_case_status_history_event_type_check check (event_type in (
    'case_created', 'checkout_bound', 'payment_verified', 'queued_for_review',
    'payment_blocked', 'access_revoked', 'analysis_started', 'analysis_completed',
    'status_changed', 'migration_snapshot', 'reviewer_assigned', 'automation_claimed',
    'review_requeued', 'review_dead_lettered', 'automation_completed'
  )),
  add constraint velmere_audit_case_status_history_queue_lane_check check (queue_lane in (
    'basic_prescreen', 'payment_verification', 'pro_review', 'advanced_automation',
    'advanced_human_review', 'blocked'
  )),
  add constraint velmere_audit_case_status_history_reason_code_check check (
    reason_code is null or reason_code in (
      'checkout_expired', 'payment_failed', 'refund', 'chargeback',
      'human_review_assignment', 'optional_internal_qa_assignment',
      'pro_worker_lease', 'advanced_worker_lease', 'automation_retry', 'retry_exhausted'
    )
  );

create or replace function public.velmere_audit_history_queue_lane(p_tier text, p_status text)
returns text language sql immutable as $$
  select case
    when p_status = 'queued_basic_prescreen' then 'basic_prescreen'
    when p_status = 'queued_paid_review' and p_tier = 'advanced' then 'advanced_automation'
    when p_status = 'queued_paid_review' then 'pro_review'
    when p_status in ('awaiting_entitlement', 'checkout_pending') then 'payment_verification'
    else 'blocked'
  end;
$$;
revoke all on function public.velmere_audit_history_queue_lane(text,text) from public, anon, authenticated;

-- Rebind the append function so both its hash input and stored reason are the same
-- customer-safe allowlisted value. Arbitrary operator reason strings never enter the
-- customer projection or its hash chain.
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
  v_reason_code text;
begin
  if p_event_type not in (
    'case_created', 'checkout_bound', 'payment_verified', 'queued_for_review',
    'payment_blocked', 'access_revoked', 'analysis_started', 'analysis_completed',
    'status_changed', 'migration_snapshot', 'reviewer_assigned', 'automation_claimed',
    'review_requeued', 'review_dead_lettered', 'automation_completed'
  ) then
    raise exception 'invalid_audit_history_event_type';
  end if;

  v_reason_code := case when p_reason_code in (
    'checkout_expired', 'payment_failed', 'refund', 'chargeback',
    'human_review_assignment', 'optional_internal_qa_assignment',
    'pro_worker_lease', 'advanced_worker_lease', 'automation_retry', 'retry_exhausted'
  ) then p_reason_code else null end;

  select case_sequence, event_hash into v_sequence, v_previous_hash
  from public.velmere_audit_case_status_history
  where case_id = p_case_id
  order by case_sequence desc
  limit 1
  for update;

  v_sequence := coalesce(v_sequence, 0) + 1;
  v_queue_lane := public.velmere_audit_history_queue_lane(p_tier, p_next_status);
  v_payment_state := public.velmere_audit_history_payment_state(p_next_status, p_entitlement_required, p_entitlement_verified, v_reason_code);
  v_hash := 'sha256:' || encode(digest(concat_ws('|',
    p_case_id, v_sequence::text, p_event_type, coalesce(p_previous_status, ''), p_next_status,
    v_queue_lane, v_payment_state, p_analysis_started::text, coalesce(v_reason_code, ''),
    p_occurred_at::text, coalesce(v_previous_hash, 'root')
  ), 'sha256'), 'hex');

  insert into public.velmere_audit_case_status_history (
    case_id, case_ref, case_sequence, event_type, previous_status, next_status,
    queue_lane, payment_state, analysis_started, reason_code,
    previous_event_hash, event_hash, occurred_at
  ) values (
    p_case_id, p_case_ref, v_sequence, p_event_type, p_previous_status, p_next_status,
    v_queue_lane, v_payment_state, p_analysis_started, v_reason_code,
    v_previous_hash, v_hash, p_occurred_at
  );
end;
$$;
revoke all on function public.velmere_append_audit_case_status_history(text,text,text,text,text,text,boolean,boolean,boolean,text,timestamptz) from public, anon, authenticated;
grant execute on function public.velmere_append_audit_case_status_history(text,text,text,text,text,text,boolean,boolean,boolean,text,timestamptz) to service_role;

-- Optional internal Advanced QA metadata may coexist with automation, but it cannot
-- change the execution state, steal/clear a worker lease, or enter customer history.
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
  if found and (v_review.assignment_request_hash = v_request_hash or v_review.reviewer_principal_hash = v_reviewer_hash) then
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
    v_case.case_id, v_case.case_ref, 'advanced', 'queued', v_reviewer_hash,
    v_request_hash, v_now, v_now + make_interval(mins => v_sla_minutes), v_now
  ) on conflict (case_id) do update set
    reviewer_principal_hash = excluded.reviewer_principal_hash,
    assignment_request_hash = excluded.assignment_request_hash,
    assigned_at = coalesce(public.velmere_audit_review_orchestration.assigned_at, excluded.assigned_at),
    sla_due_at = coalesce(public.velmere_audit_review_orchestration.sla_due_at, excluded.sla_due_at),
    updated_at = excluded.updated_at;

  select * into v_review from public.velmere_audit_review_orchestration where case_id = v_case.case_id;
  return jsonb_build_object('ok', true, 'idempotent', false, 'caseRef', v_case.case_ref, 'state', v_review.review_state, 'slaDueAt', v_review.sla_due_at);
end;
$$;
revoke all on function public.velmere_assign_advanced_audit_reviewer(text,text,text,integer) from public, anon, authenticated;
grant execute on function public.velmere_assign_advanced_audit_reviewer(text,text,text,integer) to service_role;

-- Lease shape is paid-automation generic. Historical reviewer fields remain optional
-- metadata and are deliberately independent of worker lease fields.
alter table public.velmere_audit_review_orchestration
  drop constraint if exists velmere_audit_review_pro_lease_shape,
  drop constraint if exists velmere_audit_review_worker_lease_shape;
alter table public.velmere_audit_review_orchestration
  add constraint velmere_audit_review_worker_lease_shape check (
    (lease_token_hash is null and worker_principal_hash is null and lease_expires_at is null)
    or (tier in ('pro', 'advanced') and lease_token_hash is not null and worker_principal_hash is not null and lease_expires_at is not null)
  );
create index if not exists velmere_audit_review_advanced_claim_idx
  on public.velmere_audit_review_orchestration(review_state, next_attempt_at, updated_at)
  where tier = 'advanced' and review_state in ('queued', 'assigned', 'retry_wait', 'leased');

create or replace function public.velmere_claim_advanced_audit_worker_lease(
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
  if v_case.tier <> 'advanced' or v_case.status <> 'queued_paid_review' or not v_case.entitlement_verified or v_case.analysis_started then
    return jsonb_build_object('ok', false, 'error', 'case_not_eligible');
  end if;

  insert into public.velmere_audit_review_orchestration(case_id, case_ref, tier, review_state, updated_at)
  values (v_case.case_id, v_case.case_ref, 'advanced', 'queued', v_now)
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
    v_case.analysis_started, 'advanced_worker_lease', v_now
  );
  return jsonb_build_object('ok', true, 'idempotent', false, 'caseRef', v_case.case_ref, 'state', 'leased', 'leaseExpiresAt', v_expires, 'attemptCount', v_review.attempt_count);
end;
$$;
revoke all on function public.velmere_claim_advanced_audit_worker_lease(text,text,text,text,integer) from public, anon, authenticated;
grant execute on function public.velmere_claim_advanced_audit_worker_lease(text,text,text,text,integer) to service_role;

create or replace function public.velmere_settle_advanced_audit_worker_lease(
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
  if not found or v_case.tier <> 'advanced' or v_case.status <> 'queued_paid_review' or not v_case.entitlement_verified or v_case.analysis_started then return jsonb_build_object('ok', false, 'error', 'case_not_eligible'); end if;
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
revoke all on function public.velmere_settle_advanced_audit_worker_lease(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.velmere_settle_advanced_audit_worker_lease(text,text,text,text,text) to service_role;

-- Advanced equivalent of PASS4806 Pro atomic completion: active worker lease,
-- immutable exact snapshot insert and completed state are one DB transaction.
create or replace function public.velmere_complete_advanced_audit_with_snapshot(
  p_case_ref text,
  p_worker_principal text,
  p_lease_token text,
  p_reason_code text,
  p_report_id text,
  p_request_id text,
  p_account_id_hash text,
  p_entitlement_id text,
  p_target_hash text,
  p_report_version_hash text,
  p_snapshot_digest text,
  p_source_receipt_root text,
  p_pdf_digest text,
  p_snapshot_json jsonb,
  p_created_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_review public.velmere_audit_review_orchestration%rowtype;
  v_existing public.velmere_audit_report_snapshots%rowtype;
  v_worker_hash text;
  v_token_hash text;
  v_expected_account_hash text;
  v_now timestamptz := now();
  v_idempotent boolean := false;
  v_safe_reason text;
begin
  if coalesce(trim(p_case_ref), '') = ''
     or coalesce(trim(p_worker_principal), '') = ''
     or length(coalesce(p_lease_token, '')) < 24
     or coalesce(trim(p_report_id), '') = ''
     or coalesce(trim(p_request_id), '') = ''
     or coalesce(trim(p_entitlement_id), '') = ''
     or p_account_id_hash !~ '^[a-f0-9]{64}$'
     or p_target_hash !~ '^sha256:[a-f0-9]{64}$'
     or p_report_version_hash !~ '^sha256:[a-f0-9]{64}$'
     or p_snapshot_digest !~ '^sha256:[a-f0-9]{64}$'
     or p_source_receipt_root !~ '^sha256:[a-f0-9]{64}$'
     or p_pdf_digest !~ '^sha256:[a-f0-9]{64}$'
     or jsonb_typeof(p_snapshot_json) <> 'object'
     or p_snapshot_json->>'requestId' <> p_request_id
     or p_snapshot_json->>'tier' <> 'advanced'
     or p_snapshot_json->>'digest' <> p_snapshot_digest
     or p_snapshot_json->>'sourceReceiptRoot' <> p_source_receipt_root
     or p_created_at is null
     or p_created_at > v_now + interval '5 minutes' then
    return jsonb_build_object('ok', false, 'error', 'advanced_snapshot_completion_invalid_request');
  end if;

  v_worker_hash := 'sha256:' || encode(digest(p_worker_principal, 'sha256'), 'hex');
  v_token_hash := 'sha256:' || encode(digest(p_lease_token, 'sha256'), 'hex');
  v_safe_reason := left(regexp_replace(coalesce(p_reason_code, 'worker_result'), '[^a-zA-Z0-9:_-]', '_', 'g'), 80);

  select * into v_case
  from public.velmere_audit_intake_cases
  where case_ref = p_case_ref
  for update;
  if not found
     or v_case.tier <> 'advanced'
     or v_case.status <> 'queued_paid_review'
     or not v_case.entitlement_verified
     or v_case.analysis_started
     or v_case.request_id <> p_request_id
     or v_case.entitlement_id <> p_entitlement_id
     or v_case.target_hash <> p_target_hash
     or v_case.account_id is null then
    return jsonb_build_object('ok', false, 'error', 'case_not_eligible');
  end if;

  v_expected_account_hash := encode(digest('velmere-account-binding-v1:' || v_case.account_id, 'sha256'), 'hex');
  if v_expected_account_hash <> p_account_id_hash then
    return jsonb_build_object('ok', false, 'error', 'advanced_snapshot_account_binding_mismatch');
  end if;

  select * into v_review
  from public.velmere_audit_review_orchestration
  where case_id = v_case.case_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'review_orchestration_unavailable');
  end if;

  select * into v_existing
  from public.velmere_audit_report_snapshots
  where case_ref = p_case_ref and tier = 'advanced'
  for update;

  if found then
    if v_existing.report_id <> p_report_id
       or v_existing.request_id <> p_request_id
       or v_existing.account_id_hash <> p_account_id_hash
       or v_existing.entitlement_id <> p_entitlement_id
       or v_existing.target_hash <> p_target_hash
       or v_existing.report_version_hash <> p_report_version_hash
       or v_existing.snapshot_digest <> p_snapshot_digest
       or v_existing.source_receipt_root <> p_source_receipt_root
       or v_existing.pdf_digest <> p_pdf_digest
       or v_existing.snapshot_json <> p_snapshot_json then
      return jsonb_build_object('ok', false, 'error', 'audit_report_snapshot_immutable_conflict');
    end if;
    if v_review.review_state = 'completed' then
      return jsonb_build_object(
        'ok', true, 'idempotent', true, 'caseRef', v_case.case_ref, 'state', 'completed',
        'reportId', p_report_id, 'reportVersionHash', p_report_version_hash,
        'snapshotDigest', p_snapshot_digest, 'sourceReceiptRoot', p_source_receipt_root,
        'pdfDigest', p_pdf_digest, 'attemptCount', v_review.attempt_count
      );
    end if;
    v_idempotent := true;
  end if;

  if v_review.review_state <> 'leased'
     or v_review.worker_principal_hash <> v_worker_hash
     or v_review.lease_token_hash <> v_token_hash then
    return jsonb_build_object('ok', false, 'error', 'lease_mismatch');
  end if;
  if v_review.lease_expires_at is null or v_review.lease_expires_at < v_now then
    return jsonb_build_object('ok', false, 'error', 'lease_mismatch', 'staleLease', true);
  end if;

  if not v_idempotent then
    insert into public.velmere_audit_report_snapshots(
      report_id, case_ref, request_id, account_id_hash, entitlement_id, tier,
      target_hash, report_version_hash, snapshot_digest, source_receipt_root,
      pdf_digest, snapshot_json, created_at
    ) values (
      p_report_id, p_case_ref, p_request_id, p_account_id_hash, p_entitlement_id, 'advanced',
      p_target_hash, p_report_version_hash, p_snapshot_digest, p_source_receipt_root,
      p_pdf_digest, p_snapshot_json, p_created_at
    );
  end if;

  update public.velmere_audit_review_orchestration set
    review_state = 'completed',
    worker_principal_hash = null,
    lease_token_hash = null,
    claim_request_hash = null,
    lease_expires_at = null,
    next_attempt_at = null,
    dead_letter_reason_code = null,
    completed_at = v_now,
    updated_at = v_now
  where case_id = v_case.case_id;

  perform public.velmere_append_audit_case_status_history(
    v_case.case_id, v_case.case_ref, 'automation_completed', v_case.status, v_case.status,
    v_case.tier, v_case.entitlement_required, v_case.entitlement_verified,
    v_case.analysis_started, v_safe_reason, v_now
  );

  return jsonb_build_object(
    'ok', true, 'idempotent', v_idempotent, 'caseRef', v_case.case_ref, 'state', 'completed',
    'reportId', p_report_id, 'reportVersionHash', p_report_version_hash,
    'snapshotDigest', p_snapshot_digest, 'sourceReceiptRoot', p_source_receipt_root,
    'pdfDigest', p_pdf_digest, 'attemptCount', v_review.attempt_count
  );
end;
$$;
revoke all on function public.velmere_complete_advanced_audit_with_snapshot(
  text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz
) from public, anon, authenticated;
grant execute on function public.velmere_complete_advanced_audit_with_snapshot(
  text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz
) to service_role;

comment on function public.velmere_claim_advanced_audit_worker_lease(text,text,text,text,integer) is
  'P75 current Advanced automation worker lease. Human assignment is optional internal QA and never gates this function.';
comment on function public.velmere_complete_advanced_audit_with_snapshot(text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz) is
  'P75 atomic Advanced automation completion plus immutable account/entitlement-bound report snapshot.';
