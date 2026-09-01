-- Current closure: account-owned Audit Basic worker orchestration and exact immutable PDF artifact.
-- Forward-only. Historical Pro/Advanced migrations and receipts remain byte-identical.

begin;

alter table public.velmere_audit_intake_cases
  add column if not exists target_chain_id text,
  add column if not exists target_chain_name text;
alter table public.velmere_audit_intake_cases
  drop constraint if exists velmere_audit_intake_contract_chain_identity,
  drop constraint if exists velmere_audit_intake_contract_target_hash_identity;
alter table public.velmere_audit_intake_cases
  add constraint velmere_audit_intake_contract_chain_identity check (
    target_kind <> 'contract' or (
      target_chain_id is not null and target_chain_name is not null
      and target_chain_id = '56' and target_chain_name = 'BSC'
    )
  ) not valid,
  add constraint velmere_audit_intake_contract_target_hash_identity check (
    target_kind <> 'contract' or (
      target_chain_id is not null and target_private is not null and target_hash is not null
      and target_hash = 'sha256:' || encode(digest(
        'velmere-audit-contract-target-v1:' || target_chain_id || ':' || lower(target_private),
        'sha256'
      ), 'hex')
    )
  ) not valid;

create or replace function public.velmere_reject_non_current_audit_target_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.target_kind <> 'contract' then
    raise exception 'audit_execution_target_withheld' using errcode = '22023';
  end if;
  if new.target_chain_id is distinct from '56' or new.target_chain_name is distinct from 'BSC' then
    raise exception 'audit_execution_chain_withheld' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function public.velmere_reject_non_current_audit_target_v1()
  from public, anon, authenticated, service_role;
drop trigger if exists reject_non_current_audit_target on public.velmere_audit_intake_cases;
create trigger reject_non_current_audit_target
before insert on public.velmere_audit_intake_cases
for each row execute function public.velmere_reject_non_current_audit_target_v1();

create or replace function public.velmere_basic_worker_lease_token_valid_v1(p_token text)
returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  select case
    when coalesce(p_token, '') ~ '^[A-Za-z0-9_-]{43}$' then
      octet_length(decode(translate(p_token, '-_', '+/') || '=', 'base64')) = 32
      and translate(rtrim(encode(decode(translate(p_token, '-_', '+/') || '=', 'base64'), 'base64'), '='), '+/', '-_') = p_token
      and (select count(distinct ch) from regexp_split_to_table(p_token, '') as chars(ch)) >= 16
    else false
  end;
$$;
revoke all on function public.velmere_basic_worker_lease_token_valid_v1(text)
  from public, anon, authenticated, service_role;

-- Idempotency is scoped to the authenticated owner. The historical global
-- request_id uniqueness allowed one account to reserve another account's key.
alter table public.velmere_audit_intake_cases
  drop constraint if exists velmere_audit_intake_cases_request_id_key;
drop index if exists public.velmere_audit_intake_cases_request_id_key;
create unique index if not exists velmere_audit_intake_account_request_uidx
  on public.velmere_audit_intake_cases(account_id, request_id) nulls not distinct;

alter table public.velmere_audit_review_orchestration
  drop constraint if exists velmere_audit_review_orchestration_tier_check,
  drop constraint if exists velmere_audit_review_worker_lease_shape;
alter table public.velmere_audit_review_orchestration
  add constraint velmere_audit_review_orchestration_tier_check
    check (tier in ('basic', 'pro', 'advanced')),
  add constraint velmere_audit_review_worker_lease_shape check (
    (lease_token_hash is null and worker_principal_hash is null and lease_expires_at is null)
    or (tier in ('basic', 'pro', 'advanced') and lease_token_hash is not null and worker_principal_hash is not null and lease_expires_at is not null)
  );

create index if not exists velmere_audit_review_basic_claim_idx
  on public.velmere_audit_review_orchestration(review_state, next_attempt_at, updated_at)
  where tier = 'basic' and review_state in ('queued', 'retry_wait', 'leased');

create or replace function public.velmere_claim_basic_audit_worker_lease(
  p_case_ref text,
  p_worker_principal text,
  p_claim_request_id text,
  p_lease_token text,
  p_lease_seconds integer default 300
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_review public.velmere_audit_review_orchestration%rowtype;
  v_worker_hash text;
  v_claim_hash text;
  v_token_hash text;
  v_now timestamptz := clock_timestamp();
  v_expires timestamptz;
  v_attempt_count integer;
  v_state text;
  v_retry_at timestamptz;
begin
  if coalesce(trim(p_worker_principal), '') = ''
     or coalesce(trim(p_claim_request_id), '') = ''
     or not public.velmere_basic_worker_lease_token_valid_v1(p_lease_token)
     or p_lease_seconds is null or p_lease_seconds not between 60 and 900 then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  v_worker_hash := 'sha256:' || encode(digest(p_worker_principal, 'sha256'), 'hex');
  v_claim_hash := 'sha256:' || encode(digest(p_claim_request_id, 'sha256'), 'hex');
  v_token_hash := 'sha256:' || encode(digest(p_lease_token, 'sha256'), 'hex');
  v_expires := v_now + make_interval(secs => p_lease_seconds);

  select * into v_case
  from public.velmere_audit_intake_cases
  where case_ref = p_case_ref
  for update;
  if not found
     or v_case.tier <> 'basic'
     or v_case.status <> 'queued_basic_prescreen'
     or v_case.account_id is null
     or v_case.target_kind <> 'contract'
     or v_case.target_chain_id is distinct from '56'
     or v_case.target_chain_name is distinct from 'BSC'
     or v_case.entitlement_required
     or v_case.entitlement_verified
     or v_case.entitlement_id is not null
     or v_case.analysis_started then
    return jsonb_build_object('ok', false, 'error', 'case_not_eligible');
  end if;

  insert into public.velmere_audit_review_orchestration(case_id, case_ref, tier, review_state, updated_at)
  values (v_case.case_id, v_case.case_ref, 'basic', 'queued', v_now)
  on conflict (case_id) do nothing;
  select * into strict v_review
  from public.velmere_audit_review_orchestration
  where case_id = v_case.case_id
  for update;

  if v_review.tier <> 'basic' then
    return jsonb_build_object('ok', false, 'error', 'case_not_eligible');
  end if;
  if v_review.claim_request_hash = v_claim_hash
     and v_review.lease_token_hash = v_token_hash
     and v_review.review_state = 'leased'
     and v_review.lease_expires_at > v_now then
    return jsonb_build_object(
      'ok', true, 'idempotent', true, 'caseRef', v_case.case_ref,
      'state', 'leased', 'leaseExpiresAt', v_review.lease_expires_at,
      'attemptCount', v_review.attempt_count
    );
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
  if v_review.review_state = 'leased' then
    v_attempt_count := v_review.attempt_count + 1;
    v_state := case when v_attempt_count >= v_review.max_attempts then 'dead_letter' else 'retry_wait' end;
    if v_state = 'retry_wait' then
      v_retry_at := v_now + make_interval(mins => least(60, 5 * (2 ^ greatest(0, v_attempt_count - 1))::integer));
    end if;
    update public.velmere_audit_review_orchestration set
      review_state = v_state,
      worker_principal_hash = null,
      lease_token_hash = null,
      claim_request_hash = null,
      lease_expires_at = null,
      attempt_count = v_attempt_count,
      next_attempt_at = v_retry_at,
      dead_letter_reason_code = case when v_state = 'dead_letter' then 'lease_expired' else null end,
      updated_at = v_now
    where case_id = v_case.case_id;
    perform public.velmere_append_audit_case_status_history(
      v_case.case_id, v_case.case_ref,
      case when v_state = 'dead_letter' then 'review_dead_lettered' else 'review_requeued' end,
      v_case.status, v_case.status, v_case.tier, v_case.entitlement_required,
      v_case.entitlement_verified, v_case.analysis_started,
      case when v_state = 'dead_letter' then 'retry_exhausted' else 'automation_retry' end,
      v_now
    );
    return jsonb_build_object(
      'ok', false,
      'error', case when v_state = 'dead_letter' then 'case_not_eligible' else 'lease_unavailable' end,
      'state', v_state, 'retryAt', v_retry_at, 'attemptCount', v_attempt_count,
      'staleLease', true
    );
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
    v_case.analysis_started, null, v_now
  );
  return jsonb_build_object(
    'ok', true, 'idempotent', false, 'caseRef', v_case.case_ref,
    'state', 'leased', 'leaseExpiresAt', v_expires,
    'attemptCount', v_review.attempt_count
  );
end;
$$;
revoke all on function public.velmere_claim_basic_audit_worker_lease(text,text,text,text,integer)
  from public, anon, authenticated;
grant execute on function public.velmere_claim_basic_audit_worker_lease(text,text,text,text,integer)
  to service_role;

create or replace function public.velmere_preflight_basic_audit_worker_lease(
  p_case_ref text,
  p_worker_principal text,
  p_lease_token text
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_review public.velmere_audit_review_orchestration%rowtype;
  v_worker_hash text;
  v_token_hash text;
  v_now timestamptz := statement_timestamp();
begin
  if coalesce(trim(p_case_ref), '') = ''
     or coalesce(trim(p_worker_principal), '') = ''
     or not public.velmere_basic_worker_lease_token_valid_v1(p_lease_token) then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  v_worker_hash := 'sha256:' || encode(digest(p_worker_principal, 'sha256'), 'hex');
  v_token_hash := 'sha256:' || encode(digest(p_lease_token, 'sha256'), 'hex');

  select * into v_case
  from public.velmere_audit_intake_cases
  where case_ref = p_case_ref;
  if not found or v_case.tier <> 'basic' or v_case.status <> 'queued_basic_prescreen'
     or v_case.account_id is null or v_case.entitlement_required or v_case.entitlement_verified
     or v_case.target_kind <> 'contract' or v_case.target_chain_id is distinct from '56' or v_case.target_chain_name is distinct from 'BSC'
     or v_case.entitlement_id is not null or v_case.analysis_started then
    return jsonb_build_object('ok', false, 'error', 'case_not_eligible');
  end if;
  select * into v_review
  from public.velmere_audit_review_orchestration
  where case_id = v_case.case_id;
  if not found or v_review.tier <> 'basic' or v_review.review_state <> 'leased'
     or v_review.worker_principal_hash <> v_worker_hash
     or v_review.lease_token_hash <> v_token_hash then
    return jsonb_build_object('ok', false, 'error', 'lease_mismatch');
  end if;
  if v_review.lease_expires_at is null or v_review.lease_expires_at <= v_now then
    return jsonb_build_object('ok', false, 'error', 'lease_mismatch', 'staleLease', true);
  end if;
  return jsonb_build_object(
    'ok', true, 'caseRef', v_case.case_ref, 'state', 'leased',
    'leaseExpiresAt', v_review.lease_expires_at,
    'attemptCount', v_review.attempt_count
  );
end;
$$;
revoke all on function public.velmere_preflight_basic_audit_worker_lease(text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_preflight_basic_audit_worker_lease(text,text,text)
  to service_role;

create or replace function public.velmere_settle_basic_audit_worker_lease(
  p_case_ref text,
  p_worker_principal text,
  p_lease_token text,
  p_outcome text,
  p_reason_code text default 'worker_result'
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_review public.velmere_audit_review_orchestration%rowtype;
  v_worker_hash text;
  v_token_hash text;
  v_now timestamptz := clock_timestamp();
  v_attempt_count integer;
  v_state text;
  v_retry_at timestamptz;
begin
  if p_outcome = 'complete' then
    return jsonb_build_object('ok', false, 'error', 'audit_basic_atomic_completion_required');
  end if;
  if p_outcome not in ('retry', 'dead_letter')
     or coalesce(trim(p_worker_principal), '') = ''
     or not public.velmere_basic_worker_lease_token_valid_v1(p_lease_token) then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  v_worker_hash := 'sha256:' || encode(digest(p_worker_principal, 'sha256'), 'hex');
  v_token_hash := 'sha256:' || encode(digest(p_lease_token, 'sha256'), 'hex');

  select * into v_case
  from public.velmere_audit_intake_cases
  where case_ref = p_case_ref
  for update;
  if not found or v_case.tier <> 'basic' or v_case.status <> 'queued_basic_prescreen'
     or v_case.account_id is null or v_case.entitlement_required or v_case.entitlement_verified
     or v_case.target_kind <> 'contract' or v_case.target_chain_id is distinct from '56' or v_case.target_chain_name is distinct from 'BSC'
     or v_case.entitlement_id is not null or v_case.analysis_started then
    return jsonb_build_object('ok', false, 'error', 'case_not_eligible');
  end if;
  select * into v_review
  from public.velmere_audit_review_orchestration
  where case_id = v_case.case_id
  for update;
  if not found or v_review.tier <> 'basic' or v_review.review_state <> 'leased'
     or v_review.worker_principal_hash <> v_worker_hash or v_review.lease_token_hash <> v_token_hash then
    return jsonb_build_object('ok', false, 'error', 'lease_mismatch');
  end if;
  if v_review.lease_expires_at is null or v_review.lease_expires_at <= v_now then
    return jsonb_build_object('ok', false, 'error', 'lease_mismatch', 'staleLease', true);
  end if;

  v_attempt_count := v_review.attempt_count + 1;
  v_state := case
    when p_outcome = 'dead_letter' or v_attempt_count >= v_review.max_attempts then 'dead_letter'
    else 'retry_wait'
  end;
  if v_state = 'retry_wait' then
    v_retry_at := v_now + make_interval(mins => least(60, 5 * (2 ^ greatest(0, v_attempt_count - 1))::integer));
  end if;

  update public.velmere_audit_review_orchestration set
    review_state = v_state,
    worker_principal_hash = null,
    lease_token_hash = null,
    claim_request_hash = null,
    lease_expires_at = null,
    attempt_count = v_attempt_count,
    next_attempt_at = v_retry_at,
    dead_letter_reason_code = case when v_state = 'dead_letter'
      then left(regexp_replace(coalesce(p_reason_code, 'retry_exhausted'), '[^a-zA-Z0-9:_-]', '_', 'g'), 80)
      else null end,
    updated_at = v_now
  where case_id = v_case.case_id;
  perform public.velmere_append_audit_case_status_history(
    v_case.case_id, v_case.case_ref,
    case when v_state = 'dead_letter' then 'review_dead_lettered' else 'review_requeued' end,
    v_case.status, v_case.status, v_case.tier, v_case.entitlement_required,
    v_case.entitlement_verified, v_case.analysis_started,
    case when v_state = 'dead_letter' then 'retry_exhausted' else 'automation_retry' end,
    v_now
  );
  return jsonb_build_object(
    'ok', true, 'caseRef', v_case.case_ref, 'state', v_state,
    'retryAt', v_retry_at, 'attemptCount', v_attempt_count
  );
end;
$$;
revoke all on function public.velmere_settle_basic_audit_worker_lease(text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.velmere_settle_basic_audit_worker_lease(text,text,text,text,text)
  to service_role;

create table if not exists public.velmere_audit_basic_report_artifacts (
  artifact_id uuid primary key default gen_random_uuid(),
  schema_version text not null
    check (schema_version = 'velmere.audit-basic-exact-immutable-pdf-artifact.v1'),
  report_id text not null unique,
  case_ref text not null unique references public.velmere_audit_intake_cases(case_ref) on delete restrict,
  request_id text not null,
  account_id_hash text not null check (account_id_hash ~ '^[a-f0-9]{64}$'),
  target_hash text not null check (target_hash ~ '^sha256:[a-f0-9]{64}$'),
  report_version_hash text not null check (report_version_hash ~ '^sha256:[a-f0-9]{64}$'),
  snapshot_digest text not null check (snapshot_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_receipt_root text not null check (source_receipt_root ~ '^sha256:[a-f0-9]{64}$'),
  pdf_digest text not null check (pdf_digest ~ '^sha256:[a-f0-9]{64}$'),
  pdf_byte_length integer not null check (pdf_byte_length between 1000 and 4194304),
  render_contract_id text not null
    check (render_contract_id = 'pass4808-deterministic-latin-extended-pagination-v1'),
  snapshot_json jsonb not null,
  pdf_bytes bytea not null,
  created_at timestamptz not null,
  record_digest text not null check (record_digest ~ '^sha256:[a-f0-9]{64}$'),
  check (octet_length(pdf_bytes) = pdf_byte_length),
  check (substring(pdf_bytes from 1 for 5) = decode('255044462d', 'hex')),
  check (pdf_digest = 'sha256:' || encode(digest(pdf_bytes, 'sha256'), 'hex'))
);

alter table public.velmere_audit_basic_report_artifacts enable row level security;
revoke all on public.velmere_audit_basic_report_artifacts from public, anon, authenticated, service_role;
-- service_role reads for the owner-bound API, but cannot bypass the active
-- worker lease and atomic completion function with a direct INSERT.
grant select on public.velmere_audit_basic_report_artifacts to service_role;
grant select on public.velmere_audit_basic_report_artifacts to authenticated;
drop policy if exists velmere_audit_basic_report_owner_select on public.velmere_audit_basic_report_artifacts;
create policy velmere_audit_basic_report_owner_select
on public.velmere_audit_basic_report_artifacts
for select to authenticated
using (account_id_hash = public.velmere_current_account_binding_hash());

create or replace function public.velmere_reject_audit_basic_report_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  raise exception 'audit_basic_report_immutable' using errcode = '55000';
end;
$$;
revoke all on function public.velmere_reject_audit_basic_report_mutation_v1()
  from public, anon, authenticated, service_role;
drop trigger if exists reject_audit_basic_report_mutation on public.velmere_audit_basic_report_artifacts;
create trigger reject_audit_basic_report_mutation
before update or delete on public.velmere_audit_basic_report_artifacts
for each row execute function public.velmere_reject_audit_basic_report_mutation_v1();

create or replace function public.velmere_complete_basic_audit_with_exact_pdf_v1(
  p_case_ref text,
  p_worker_principal text,
  p_lease_token text,
  p_reason_code text,
  p_report_id text,
  p_request_id text,
  p_account_id_hash text,
  p_target_hash text,
  p_report_version_hash text,
  p_snapshot_digest text,
  p_source_receipt_root text,
  p_pdf_digest text,
  p_pdf_byte_length integer,
  p_render_contract_id text,
  p_record_digest text,
  p_pdf_base64 text,
  p_snapshot_json jsonb,
  p_created_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_review public.velmere_audit_review_orchestration%rowtype;
  v_existing public.velmere_audit_basic_report_artifacts%rowtype;
  v_pdf_bytes bytea;
  v_worker_hash text;
  v_token_hash text;
  v_expected_account_hash text;
  v_expected_record_digest text;
  v_now timestamptz := clock_timestamp();
  v_idempotent boolean := false;
begin
  if coalesce(trim(p_case_ref), '') = '' or coalesce(trim(p_worker_principal), '') = ''
     or not public.velmere_basic_worker_lease_token_valid_v1(p_lease_token) or coalesce(trim(p_report_id), '') = ''
     or coalesce(trim(p_request_id), '') = '' or p_account_id_hash !~ '^[a-f0-9]{64}$'
     or p_target_hash !~ '^sha256:[a-f0-9]{64}$'
     or p_report_version_hash !~ '^sha256:[a-f0-9]{64}$'
     or p_snapshot_digest !~ '^sha256:[a-f0-9]{64}$'
     or p_source_receipt_root !~ '^sha256:[a-f0-9]{64}$'
     or p_pdf_digest !~ '^sha256:[a-f0-9]{64}$'
     or p_record_digest !~ '^sha256:[a-f0-9]{64}$'
     or p_pdf_byte_length not between 1000 and 4194304
     or p_render_contract_id <> 'pass4808-deterministic-latin-extended-pagination-v1'
     or jsonb_typeof(p_snapshot_json) <> 'object'
     or p_snapshot_json->>'requestId' <> p_request_id
     or p_snapshot_json->>'tier' <> 'basic'
     or p_snapshot_json->>'digest' <> p_snapshot_digest
     or p_snapshot_json->>'sourceReceiptRoot' <> p_source_receipt_root
     or p_snapshot_json#>>'{renderContract,id}' <> p_render_contract_id
     or p_snapshot_json#>>'{renderContract,pdfDigest}' <> p_pdf_digest
     or (case
       when coalesce(p_snapshot_json#>>'{renderContract,pdfByteLength}', '') ~ '^[0-9]{1,7}$'
         then (p_snapshot_json#>>'{renderContract,pdfByteLength}')::integer = p_pdf_byte_length
       else false
     end) is not true
     or p_snapshot_json#>>'{auditExecutionRelease,expectedTier}' <> 'basic'
     or p_snapshot_json#>>'{auditExecutionRelease,caseRef}' <> p_case_ref
     or p_snapshot_json#>>'{auditExecutionRelease,decision}' <> 'ALLOW_COMPLETE'
     or p_snapshot_json#>>'{auditExecutionRelease,completionAllowed}' <> 'true'
     or p_snapshot_json#>>'{auditExecutionRelease,persistAllowed}' <> 'true'
     or p_snapshot_json#>>'{auditExecutionRelease,packetDigest}' !~ '^sha256:[a-f0-9]{64}$'
     or p_snapshot_json#>>'{auditExecutionRelease,currentDeploymentReceiptDigest}' !~ '^sha256:[a-f0-9]{64}$'
     or p_snapshot_json#>>'{auditExecutionRelease,matchedInputDigest}' !~ '^sha256:[a-f0-9]{64}$'
     or p_snapshot_json#>>'{auditExecutionRelease,releaseBindingDigest}' !~ '^sha256:[a-f0-9]{64}$'
     or p_snapshot_json#>>'{customerEligibility,commercialUseReady}' <> 'true'
     or p_created_at is null or p_created_at > v_now + interval '5 minutes'
     or p_snapshot_json->>'generatedAt' <> to_char(p_created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
     or p_pdf_base64 is null or length(p_pdf_base64) < 4 or length(p_pdf_base64) % 4 <> 0
     or p_pdf_base64 !~ '^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$' then
    return jsonb_build_object('ok', false, 'error', 'audit_basic_exact_pdf_invalid_request');
  end if;

  begin
    v_pdf_bytes := decode(p_pdf_base64, 'base64');
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'audit_basic_exact_pdf_base64_noncanonical');
  end;
  if replace(encode(v_pdf_bytes, 'base64'), E'\n', '') <> p_pdf_base64
     or octet_length(v_pdf_bytes) <> p_pdf_byte_length
     or substring(v_pdf_bytes from 1 for 5) <> decode('255044462d', 'hex')
     or convert_from(substring(v_pdf_bytes from greatest(1, octet_length(v_pdf_bytes) - 2048)), 'LATIN1') !~ '%%EOF[[:space:]]*$'
     or convert_from(v_pdf_bytes, 'LATIN1') ~ '/(JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA)([^A-Za-z0-9_]|$)'
     or p_pdf_digest <> 'sha256:' || encode(digest(v_pdf_bytes, 'sha256'), 'hex') then
    return jsonb_build_object('ok', false, 'error', 'audit_basic_exact_pdf_bytes_invalid');
  end if;
  v_expected_record_digest := 'sha256:' || encode(digest(convert_to(concat_ws(E'\n',
    'velmere.audit-basic-exact-immutable-pdf-artifact.v1', p_report_id, p_case_ref,
    p_request_id, p_account_id_hash, p_target_hash, p_report_version_hash,
    p_snapshot_digest, p_source_receipt_root, p_pdf_digest, p_pdf_byte_length::text,
    p_render_contract_id, to_char(p_created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ), 'UTF8'), 'sha256'), 'hex');
  if p_record_digest <> v_expected_record_digest then
    return jsonb_build_object('ok', false, 'error', 'audit_basic_exact_pdf_record_digest_invalid');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('audit-basic-exact-pdf:' || p_case_ref, 0));
  select * into v_case from public.velmere_audit_intake_cases where case_ref = p_case_ref for update;
  if not found or v_case.tier <> 'basic' or v_case.status <> 'queued_basic_prescreen'
     or v_case.account_id is null or v_case.request_id <> p_request_id or v_case.target_hash <> p_target_hash
     or v_case.target_kind <> 'contract' or v_case.target_chain_id is distinct from '56' or v_case.target_chain_name is distinct from 'BSC'
     or v_case.entitlement_required or v_case.entitlement_verified or v_case.entitlement_id is not null
     or v_case.analysis_started then
    return jsonb_build_object('ok', false, 'error', 'case_not_eligible');
  end if;
  v_expected_account_hash := encode(digest('velmere-account-binding-v1:' || v_case.account_id, 'sha256'), 'hex');
  if v_expected_account_hash <> p_account_id_hash then
    return jsonb_build_object('ok', false, 'error', 'audit_basic_account_binding_mismatch');
  end if;

  select * into v_review
  from public.velmere_audit_review_orchestration
  where case_id = v_case.case_id
  for update;
  if not found or v_review.tier <> 'basic' then
    return jsonb_build_object('ok', false, 'error', 'review_orchestration_unavailable');
  end if;
  select * into v_existing
  from public.velmere_audit_basic_report_artifacts
  where case_ref = p_case_ref
  for update;
  if found then
    if v_existing.report_id <> p_report_id or v_existing.request_id <> p_request_id
       or v_existing.account_id_hash <> p_account_id_hash or v_existing.target_hash <> p_target_hash
       or v_existing.report_version_hash <> p_report_version_hash or v_existing.snapshot_digest <> p_snapshot_digest
       or v_existing.source_receipt_root <> p_source_receipt_root or v_existing.pdf_digest <> p_pdf_digest
       or v_existing.pdf_byte_length <> p_pdf_byte_length or v_existing.render_contract_id <> p_render_contract_id
       or v_existing.snapshot_json <> p_snapshot_json or v_existing.pdf_bytes <> v_pdf_bytes
       or v_existing.created_at <> p_created_at or v_existing.record_digest <> p_record_digest then
      return jsonb_build_object('ok', false, 'error', 'audit_basic_report_immutable_conflict');
    end if;
    if v_review.review_state = 'completed' then
      return jsonb_build_object(
        'ok', true, 'idempotent', true, 'caseRef', p_case_ref, 'state', 'completed',
        'reportId', p_report_id, 'recordDigest', p_record_digest,
        'attemptCount', v_review.attempt_count
      );
    end if;
    v_idempotent := true;
  end if;

  v_worker_hash := 'sha256:' || encode(digest(p_worker_principal, 'sha256'), 'hex');
  v_token_hash := 'sha256:' || encode(digest(p_lease_token, 'sha256'), 'hex');
  if v_review.review_state <> 'leased' or v_review.worker_principal_hash <> v_worker_hash
     or v_review.lease_token_hash <> v_token_hash then
    return jsonb_build_object('ok', false, 'error', 'lease_mismatch');
  end if;
  if v_review.lease_expires_at is null or v_review.lease_expires_at <= v_now then
    return jsonb_build_object('ok', false, 'error', 'lease_mismatch', 'staleLease', true);
  end if;

  if not v_idempotent then
    insert into public.velmere_audit_basic_report_artifacts(
      schema_version, report_id, case_ref, request_id, account_id_hash, target_hash,
      report_version_hash, snapshot_digest, source_receipt_root, pdf_digest,
      pdf_byte_length, render_contract_id, snapshot_json, pdf_bytes, created_at, record_digest
    ) values (
      'velmere.audit-basic-exact-immutable-pdf-artifact.v1', p_report_id, p_case_ref,
      p_request_id, p_account_id_hash, p_target_hash, p_report_version_hash,
      p_snapshot_digest, p_source_receipt_root, p_pdf_digest, p_pdf_byte_length,
      p_render_contract_id, p_snapshot_json, v_pdf_bytes, p_created_at, p_record_digest
    );
  end if;
  update public.velmere_audit_review_orchestration set
    review_state = 'completed', worker_principal_hash = null, lease_token_hash = null,
    claim_request_hash = null, lease_expires_at = null, next_attempt_at = null,
    dead_letter_reason_code = null, completed_at = v_now, updated_at = v_now
  where case_id = v_case.case_id;
  perform public.velmere_append_audit_case_status_history(
    v_case.case_id, v_case.case_ref, 'automation_completed', v_case.status, v_case.status,
    v_case.tier, v_case.entitlement_required, v_case.entitlement_verified,
    v_case.analysis_started, null, v_now
  );
  return jsonb_build_object(
    'ok', true, 'idempotent', v_idempotent, 'caseRef', p_case_ref, 'state', 'completed',
    'reportId', p_report_id, 'recordDigest', p_record_digest,
    'attemptCount', v_review.attempt_count
  );
end;
$$;
revoke all on function public.velmere_complete_basic_audit_with_exact_pdf_v1(
  text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,jsonb,timestamptz
) from public, anon, authenticated;
grant execute on function public.velmere_complete_basic_audit_with_exact_pdf_v1(
  text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,jsonb,timestamptz
) to service_role;

comment on table public.velmere_audit_basic_report_artifacts is
  'Account-owned Audit Basic render-once immutable PDF bytes. Authenticated RLS is exact account-hash owner only; insertion is available only through the service-role atomic security-definer completion function.';

commit;
