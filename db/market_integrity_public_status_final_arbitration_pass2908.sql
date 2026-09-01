-- PASS2908 Public Status Final Arbitration / Binding Resolution Gate
-- Appeals cannot be silently closed or converted into green badges without a binding final resolution manifest and frozen evidence trail.

create table if not exists market_integrity_public_status_final_arbitration_gates (
  id uuid primary key default gen_random_uuid(),
  release_candidate text not null,
  public_manifest_digest text not null,
  dispute_digest text not null,
  appeal_digest text not null,
  independent_review_digest text not null,
  final_resolution_digest text not null,
  original_operator text not null,
  independent_reviewer text not null,
  arbitration_owner text not null,
  final_arbitration_status text not null check (final_arbitration_status in ('NO_GO_FINAL_ARBITRATION_RESOLUTION_REQUIRED', 'FINAL_ARBITRATION_REQUIRED', 'BINDING_RESOLUTION_REQUIRED', 'EVIDENCE_FREEZE_REQUIRED', 'ACCEPTED_BINDING_RESOLUTION_MANIFEST')),
  production_decision text not null check (production_decision = 'NO_GO'),
  can_show_green_production_badge boolean not null default false,
  can_close_appeal_without_binding_resolution boolean not null default false,
  can_use_unfrozen_evidence_for_final_resolution boolean not null default false,
  can_silently_close_appeal boolean not null default false,
  final_resolution_requires_sha256 boolean not null default true,
  frozen_evidence_trail_required boolean not null default true,
  dual_control_signature_required boolean not null default true,
  customer_safe_resolution_required boolean not null default true,
  created_at timestamptz not null default now(),
  constraint pass2908_arbitration_owner_must_differ_from_operator check (arbitration_owner <> original_operator),
  constraint pass2908_arbitration_owner_must_differ_from_reviewer check (arbitration_owner <> independent_reviewer)
);

create index if not exists idx_pass2908_public_status_final_arbitration_release_candidate
  on market_integrity_public_status_final_arbitration_gates (release_candidate, created_at desc);

create or replace view pass2908_no_final_resolution_without_binding_arbitration as
select
  release_candidate,
  public_manifest_digest,
  dispute_digest,
  appeal_digest,
  independent_review_digest,
  final_resolution_digest,
  final_arbitration_status,
  production_decision,
  case
    when can_show_green_production_badge = true then 'BLOCK_GREEN_BADGE_OVERRIDE'
    when can_close_appeal_without_binding_resolution = true then 'BLOCK_APPEAL_CLOSE_WITHOUT_BINDING_RESOLUTION'
    when can_use_unfrozen_evidence_for_final_resolution = true then 'BLOCK_UNFROZEN_FINAL_EVIDENCE'
    when can_silently_close_appeal = true then 'BLOCK_SILENT_APPEAL_CLOSE'
    when final_resolution_requires_sha256 = false then 'BLOCK_MISSING_FINAL_SHA256'
    when frozen_evidence_trail_required = false then 'BLOCK_MISSING_EVIDENCE_FREEZE'
    when dual_control_signature_required = false then 'BLOCK_MISSING_DUAL_CONTROL'
    when customer_safe_resolution_required = false then 'BLOCK_UNSAFE_PUBLIC_RESOLUTION'
    else 'NO_GO_FINAL_ARBITRATION_RESOLUTION_REQUIRED'
  end as pass2908_gate_state
from market_integrity_public_status_final_arbitration_gates;
