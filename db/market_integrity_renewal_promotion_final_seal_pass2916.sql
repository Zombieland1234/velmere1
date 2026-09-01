create table if not exists market_integrity_renewal_promotion_final_seal_gates (
  id uuid primary key default gen_random_uuid(),
  pass integer not null default 2916,
  release_candidate text not null,
  production_decision text not null default 'NO_GO',
  public_claim_status text not null default 'NO_GO_PUBLIC_RECEIPTS_REQUIRED',
  promotion_quarantine_status text not null default 'NO_GO_RENEWAL_ESCROW_PROMOTION_QUARANTINE_REQUIRED',
  final_seal_status text not null default 'NO_GO_RENEWAL_PROMOTION_FINAL_SEAL_REQUIRED',
  dual_control_restore_vote_status text not null default 'NO_GO_DUAL_CONTROL_RESTORE_VOTE_REQUIRED',
  scheduled_revalidation_status text not null default 'NO_GO_SCHEDULED_REVALIDATION_REQUIRED',
  fresh_proof_restore_status text not null default 'NO_GO_FRESH_PROOF_RESTORE_BLOCKED',
  pass2915_quarantine_digest text,
  shield_final_seal_receipt_digest text,
  realmarkets_final_seal_receipt_digest text,
  pdf_tier_final_seal_receipt_digest text,
  payment_entitlement_final_seal_receipt_digest text,
  provider_freshness_final_seal_receipt_digest text,
  dual_control_restore_vote_digest text,
  fresh_proof_final_seal_digest text,
  scheduled_revalidation_plan_digest text,
  customer_visible_restore_candidate_board_digest text,
  append_only_final_seal_history_digest text,
  can_restore_public_trust boolean not null default false,
  can_auto_restore_after_replay boolean not null default false,
  can_use_independent_replay_as_final_seal boolean not null default false,
  can_bypass_dual_control_vote boolean not null default false,
  can_skip_scheduled_revalidation boolean not null default false,
  can_show_green_badge boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pass2916_no_go_without_renewal_promotion_final_seal
    check (production_decision = 'NO_GO'),
  constraint pass2916_no_restore_without_dual_control_and_schedule
    check (can_restore_public_trust = false and can_auto_restore_after_replay = false and can_use_independent_replay_as_final_seal = false and can_bypass_dual_control_vote = false and can_skip_scheduled_revalidation = false),
  constraint pass2916_green_badge_blocked_until_final_seal_and_revalidation
    check (can_show_green_badge = false),
  constraint pass2916_final_seal_status_required
    check (final_seal_status = 'NO_GO_RENEWAL_PROMOTION_FINAL_SEAL_REQUIRED')
);

comment on table market_integrity_renewal_promotion_final_seal_gates is
'PASS2916 gate: independent replay cannot restore public trust until final seal, dual-control restore vote, customer-visible restore-candidate board and scheduled revalidation plan are signed.';
