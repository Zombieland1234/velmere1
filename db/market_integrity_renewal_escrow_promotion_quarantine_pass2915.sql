create table if not exists market_integrity_renewal_escrow_promotion_quarantine_gates (
  id uuid primary key default gen_random_uuid(),
  pass integer not null default 2915,
  release_candidate text not null,
  production_decision text not null default 'NO_GO',
  public_claim_status text not null default 'NO_GO_PUBLIC_RECEIPTS_REQUIRED',
  renewal_escrow_status text not null default 'NO_GO_RENEWAL_ESCROW_REQUIRED',
  promotion_quarantine_status text not null default 'NO_GO_RENEWAL_ESCROW_PROMOTION_QUARANTINE_REQUIRED',
  independent_replay_status text not null default 'NO_GO_INDEPENDENT_REPLAY_REQUIRED',
  fresh_proof_restore_status text not null default 'NO_GO_FRESH_PROOF_RESTORE_BLOCKED',
  pass2914_renewal_escrow_digest text,
  renewal_candidate_quarantine_digest text,
  independent_replay_matrix_digest text,
  shield_replay_receipt_digest text,
  realmarkets_replay_receipt_digest text,
  pdf_tier_replay_receipt_digest text,
  payment_entitlement_replay_receipt_digest text,
  provider_freshness_replay_receipt_digest text,
  customer_visible_quarantine_board_digest text,
  operator_replay_attestation_digest text,
  append_only_promotion_history_digest text,
  can_promote_from_escrow boolean not null default false,
  can_auto_promote_renewal_candidate boolean not null default false,
  can_bypass_independent_replay boolean not null default false,
  can_show_green_badge boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pass2915_no_go_without_renewal_escrow_promotion_quarantine
    check (production_decision = 'NO_GO'),
  constraint pass2915_no_promotion_without_independent_replay
    check (can_promote_from_escrow = false and can_auto_promote_renewal_candidate = false and can_bypass_independent_replay = false),
  constraint pass2915_green_badge_blocked_until_replay_and_dual_control
    check (can_show_green_badge = false),
  constraint pass2915_quarantine_status_required
    check (promotion_quarantine_status = 'NO_GO_RENEWAL_ESCROW_PROMOTION_QUARANTINE_REQUIRED')
);

comment on table market_integrity_renewal_escrow_promotion_quarantine_gates is
'PASS2915 gate: renewal escrow candidates cannot promote or restore public trust until independent replay validates all fresh receipts and append-only quarantine history is signed.';
