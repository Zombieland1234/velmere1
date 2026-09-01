-- PASS2907 Public Status Appeal / Independent Review Gate
-- Appeals cannot upgrade public status, green badges or production claims without independent review and append-only evidence.

create table if not exists market_integrity_public_status_appeal_independent_review_gates (
  id uuid primary key default gen_random_uuid(),
  release_candidate text not null,
  public_manifest_digest text not null,
  dispute_digest text not null,
  appeal_digest text not null,
  original_operator text not null,
  appeal_reviewer text not null,
  appeal_status text not null check (appeal_status in ('NO_GO_APPEAL_INDEPENDENT_REVIEW_REQUIRED', 'APPEAL_REVIEW_REQUIRED', 'CONFLICT_CHECK_REQUIRED', 'ACCEPTED_APPEND_ONLY_APPEAL_DECISION')),
  production_decision text not null check (production_decision = 'NO_GO'),
  can_show_green_production_badge boolean not null default false,
  can_resolve_appeal_without_independent_review boolean not null default false,
  can_use_same_operator_for_appeal boolean not null default false,
  can_silently_override_dispute_decision boolean not null default false,
  requires_sha256 boolean not null default true,
  append_only_appeal_ledger_required boolean not null default true,
  dual_control_signature_required boolean not null default true,
  conflict_of_interest_check_required boolean not null default true,
  customer_safe_redaction_required boolean not null default true,
  created_at timestamptz not null default now(),
  constraint pass2907_reviewer_must_differ_from_original_operator check (appeal_reviewer <> original_operator)
);

create index if not exists idx_pass2907_public_status_appeal_release_candidate
  on market_integrity_public_status_appeal_independent_review_gates (release_candidate, created_at desc);

create or replace view pass2907_no_appeal_resolution_without_independent_review as
select
  release_candidate,
  public_manifest_digest,
  dispute_digest,
  appeal_digest,
  appeal_status,
  production_decision,
  case
    when can_show_green_production_badge = true then 'BLOCK_GREEN_BADGE_OVERRIDE'
    when can_resolve_appeal_without_independent_review = true then 'BLOCK_APPEAL_WITHOUT_INDEPENDENT_REVIEW'
    when can_use_same_operator_for_appeal = true then 'BLOCK_SAME_OPERATOR_SELF_REVIEW'
    when can_silently_override_dispute_decision = true then 'BLOCK_SILENT_DISPUTE_OVERRIDE'
    when requires_sha256 = false then 'BLOCK_MISSING_SHA256'
    when append_only_appeal_ledger_required = false then 'BLOCK_NON_APPEND_ONLY_APPEAL'
    when dual_control_signature_required = false then 'BLOCK_MISSING_DUAL_CONTROL'
    when conflict_of_interest_check_required = false then 'BLOCK_MISSING_CONFLICT_CHECK'
    when customer_safe_redaction_required = false then 'BLOCK_UNREDACTED_APPEAL_EXPORT'
    else 'NO_GO_APPEAL_INDEPENDENT_REVIEW_REQUIRED'
  end as pass2907_gate_state
from market_integrity_public_status_appeal_independent_review_gates;
