-- PASS4806: immutable account-bound audit report snapshots.
-- The customer download route may render only this stored payload; providers are never re-fetched at download time.
create table if not exists public.velmere_audit_report_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  report_id text not null unique,
  case_ref text not null references public.velmere_audit_intake_cases(case_ref) on delete restrict,
  request_id text not null,
  account_id_hash text not null check (account_id_hash ~ '^[a-f0-9]{64}$'),
  entitlement_id text not null,
  tier text not null check (tier in ('pro', 'advanced')),
  target_hash text not null check (target_hash ~ '^sha256:[a-f0-9]{64}$'),
  report_version_hash text not null check (report_version_hash ~ '^sha256:[a-f0-9]{64}$'),
  snapshot_digest text not null check (snapshot_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_receipt_root text not null check (source_receipt_root ~ '^sha256:[a-f0-9]{64}$'),
  pdf_digest text not null check (pdf_digest ~ '^sha256:[a-f0-9]{64}$'),
  snapshot_json jsonb not null,
  created_at timestamptz not null,
  unique (case_ref, tier)
);

create index if not exists velmere_audit_report_snapshots_entitlement_idx
  on public.velmere_audit_report_snapshots(entitlement_id, case_ref);

alter table public.velmere_audit_report_snapshots enable row level security;
revoke all on public.velmere_audit_report_snapshots from anon, authenticated, public;
grant select, insert on public.velmere_audit_report_snapshots to service_role;

-- Immutability is deliberate: no UPDATE or DELETE grant exists for service_role.
comment on table public.velmere_audit_report_snapshots is
  'PASS4806 immutable audit report truth source. One snapshot per case/tier, account and entitlement bound.';

-- PASS4806: Pro completion and immutable report insertion must be one database
-- transaction. An invalid/stale lease can never reserve the unique case/tier
-- snapshot and a completed review can never exist without its report truth.
create or replace function public.velmere_complete_pro_audit_with_snapshot(
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
     or p_snapshot_json->>'tier' <> 'pro'
     or p_snapshot_json->>'digest' <> p_snapshot_digest
     or p_snapshot_json->>'sourceReceiptRoot' <> p_source_receipt_root
     or p_created_at is null
     or p_created_at > v_now + interval '5 minutes' then
    return jsonb_build_object('ok', false, 'error', 'pro_snapshot_completion_invalid_request');
  end if;

  v_worker_hash := 'sha256:' || encode(digest(p_worker_principal, 'sha256'), 'hex');
  v_token_hash := 'sha256:' || encode(digest(p_lease_token, 'sha256'), 'hex');
  v_safe_reason := left(regexp_replace(coalesce(p_reason_code, 'worker_result'), '[^a-zA-Z0-9:_-]', '_', 'g'), 80);

  select * into v_case
  from public.velmere_audit_intake_cases
  where case_ref = p_case_ref
  for update;
  if not found
     or v_case.tier <> 'pro'
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
    return jsonb_build_object('ok', false, 'error', 'pro_snapshot_account_binding_mismatch');
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
  where case_ref = p_case_ref and tier = 'pro'
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
        'ok', true,
        'idempotent', true,
        'caseRef', v_case.case_ref,
        'state', 'completed',
        'reportId', p_report_id,
        'reportVersionHash', p_report_version_hash,
        'snapshotDigest', p_snapshot_digest,
        'sourceReceiptRoot', p_source_receipt_root,
        'pdfDigest', p_pdf_digest,
        'attemptCount', v_review.attempt_count
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
      p_report_id, p_case_ref, p_request_id, p_account_id_hash, p_entitlement_id, 'pro',
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
    'ok', true,
    'idempotent', v_idempotent,
    'caseRef', v_case.case_ref,
    'state', 'completed',
    'reportId', p_report_id,
    'reportVersionHash', p_report_version_hash,
    'snapshotDigest', p_snapshot_digest,
    'sourceReceiptRoot', p_source_receipt_root,
    'pdfDigest', p_pdf_digest,
    'attemptCount', v_review.attempt_count
  );
end;
$$;

revoke all on function public.velmere_complete_pro_audit_with_snapshot(
  text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz
) from public, anon, authenticated;
grant execute on function public.velmere_complete_pro_audit_with_snapshot(
  text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz
) to service_role;

-- PASS4806: bind the durable Advanced ready state to the exact source tree and
-- rendered PDF, not only to the canonical payload hash. Historical rows remain
-- nullable and therefore cannot satisfy the new customer delivery gate.
alter table public.velmere_advanced_audit_releases
  add column if not exists source_receipt_root text,
  add column if not exists pdf_digest text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'velmere_advanced_release_source_root_sha256'
  ) then
    alter table public.velmere_advanced_audit_releases
      add constraint velmere_advanced_release_source_root_sha256
      check (source_receipt_root is null or source_receipt_root ~ '^[a-f0-9]{64}$');
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'velmere_advanced_release_pdf_digest_sha256'
  ) then
    alter table public.velmere_advanced_audit_releases
      add constraint velmere_advanced_release_pdf_digest_sha256
      check (pdf_digest is null or pdf_digest ~ '^[a-f0-9]{64}$');
  end if;
end $$;

create or replace function public.velmere_record_advanced_audit_release_transition_v2(
  p_transition text,
  p_release_id text,
  p_case_ref text,
  p_entitlement_id text,
  p_entitlement_ref_hash text,
  p_payload_hash text,
  p_source_receipt_root text,
  p_pdf_digest text,
  p_envelope_digest text,
  p_release_state text,
  p_event_hash text,
  p_review_operator_hash text default null,
  p_approval_operator_hash text default null,
  p_approval_receipt_hash text default null,
  p_issued_at timestamptz default now(),
  p_expires_at timestamptz default now() + interval '1 day',
  p_transition_at timestamptz default now()
)
returns table(
  ok boolean,
  error text,
  retryable boolean,
  idempotent boolean,
  release_id text,
  release_state text,
  state_version bigint,
  event_hash text,
  envelope_digest text,
  entitlement_ref_hash text,
  release_records_revoked integer,
  artifact_tokens_revoked integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.velmere_advanced_audit_releases%rowtype;
  v_result record;
begin
  if p_source_receipt_root !~ '^[a-f0-9]{64}$'
     or p_pdf_digest !~ '^[a-f0-9]{64}$' then
    return query select false, 'advanced_release_artifact_binding_invalid', false, false,
      p_release_id, p_release_state, 0::bigint, p_event_hash, p_envelope_digest,
      p_entitlement_ref_hash, 0, 0;
    return;
  end if;

  -- Lock and reject a conflicting retry before the legacy transition mutates
  -- state. The wrapper and wrapped function run in one database transaction.
  select * into v_existing
  from public.velmere_advanced_audit_releases
  where release_id = p_release_id
  for update;
  if found and (
       (v_existing.source_receipt_root is not null and v_existing.source_receipt_root <> p_source_receipt_root)
       or (v_existing.pdf_digest is not null and v_existing.pdf_digest <> p_pdf_digest)
     ) then
    return query select false, 'advanced_release_artifact_binding_mismatch', false, false,
      p_release_id, v_existing.release_state, v_existing.state_version, p_event_hash,
      v_existing.envelope_digest, v_existing.entitlement_ref_hash, 0, 0;
    return;
  end if;

  select * into v_result
  from public.velmere_record_advanced_audit_release_transition(
    p_transition,
    p_release_id,
    p_case_ref,
    p_entitlement_id,
    p_entitlement_ref_hash,
    p_payload_hash,
    p_envelope_digest,
    p_release_state,
    p_event_hash,
    p_review_operator_hash,
    p_approval_operator_hash,
    p_approval_receipt_hash,
    p_issued_at,
    p_expires_at,
    p_transition_at
  );

  if not coalesce(v_result.ok, false) then
    return query select
      v_result.ok, v_result.error, v_result.retryable, v_result.idempotent,
      v_result.release_id, v_result.release_state, v_result.state_version,
      v_result.event_hash, v_result.envelope_digest, v_result.entitlement_ref_hash,
      v_result.release_records_revoked, v_result.artifact_tokens_revoked;
    return;
  end if;

  update public.velmere_advanced_audit_releases
  set source_receipt_root = coalesce(source_receipt_root, p_source_receipt_root),
      pdf_digest = coalesce(pdf_digest, p_pdf_digest),
      updated_at = now()
  where release_id = p_release_id
    and (source_receipt_root is null or source_receipt_root = p_source_receipt_root)
    and (pdf_digest is null or pdf_digest = p_pdf_digest);

  if not found then
    raise exception 'advanced_release_artifact_binding_atomic_failure';
  end if;

  return query select
    v_result.ok, v_result.error, v_result.retryable, v_result.idempotent,
    v_result.release_id, v_result.release_state, v_result.state_version,
    v_result.event_hash, v_result.envelope_digest, v_result.entitlement_ref_hash,
    v_result.release_records_revoked, v_result.artifact_tokens_revoked;
end;
$$;

revoke all on function public.velmere_record_advanced_audit_release_transition_v2(
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,timestamptz
) from public, anon, authenticated;
grant execute on function public.velmere_record_advanced_audit_release_transition_v2(
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,timestamptz
) to service_role;
