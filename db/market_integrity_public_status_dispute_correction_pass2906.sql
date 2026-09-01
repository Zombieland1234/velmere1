-- PASS2906 Public Status Dispute / Evidence Correction Gate
-- Disputes cannot mutate public claim status or enable green badges. They open an append-only correction workflow.

create table if not exists market_integrity_public_status_dispute_correction_gates (
  id uuid primary key default gen_random_uuid(),
  release_candidate text not null,
  public_manifest_digest text not null,
  dispute_digest text not null,
  correction_status text not null check (correction_status in ('NO_GO_DISPUTE_CORRECTION_EVIDENCE_REQUIRED', 'EVIDENCE_REVIEW_REQUIRED', 'DUAL_CONTROL_REQUIRED', 'ACCEPTED_APPEND_ONLY_CORRECTION')),
  production_decision text not null check (production_decision = 'NO_GO'),
  can_show_green_production_badge boolean not null default false,
  can_apply_correction_without_evidence boolean not null default false,
  can_silently_change_customer_status boolean not null default false,
  can_use_customer_dispute_as_proof boolean not null default false,
  requires_sha256 boolean not null default true,
  append_only_correction_ledger_required boolean not null default true,
  dual_control_signature_required boolean not null default true,
  secret_redaction_required boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_pass2906_public_status_dispute_release_candidate
  on market_integrity_public_status_dispute_correction_gates (release_candidate, created_at desc);

create or replace view pass2906_no_public_status_mutation_without_evidence as
select
  release_candidate,
  public_manifest_digest,
  dispute_digest,
  correction_status,
  production_decision,
  case
    when can_show_green_production_badge = true then 'BLOCK_GREEN_BADGE_OVERRIDE'
    when can_apply_correction_without_evidence = true then 'BLOCK_EVIDENCELESS_CORRECTION'
    when can_silently_change_customer_status = true then 'BLOCK_SILENT_STATUS_MUTATION'
    when can_use_customer_dispute_as_proof = true then 'BLOCK_DISPUTE_AS_PROOF'
    when requires_sha256 = false then 'BLOCK_MISSING_SHA256'
    when append_only_correction_ledger_required = false then 'BLOCK_NON_APPEND_ONLY_CORRECTION'
    when dual_control_signature_required = false then 'BLOCK_SINGLE_OPERATOR_CORRECTION'
    when secret_redaction_required = false then 'BLOCK_UNREDACTED_PUBLIC_CORRECTION'
    else 'NO_GO_DISPUTE_CORRECTION_EVIDENCE_REQUIRED'
  end as pass2906_gate_state
from market_integrity_public_status_dispute_correction_gates;
