create table if not exists market_integrity_downgrade_recovery_escrow_gates (
  id uuid primary key default gen_random_uuid(),
  pass integer not null default 2918,
  release_candidate text not null,
  production_decision text not null default 'NO_GO',
  public_claim_status text not null default 'NO_GO_PUBLIC_RECEIPTS_REQUIRED',
  previous_degraded_public_trust_status text not null default 'NO_GO_PUBLIC_TRUST_DEGRADED_REVALIDATION_MISSED',
  downgrade_recovery_status text not null default 'NO_GO_DOWNGRADE_RECOVERY_ESCROW_REQUIRED',
  customer_notice_reopen_status text not null default 'NO_GO_CUSTOMER_NOTICE_REOPEN_REQUIRED',
  recovery_escrow_fresh_receipts_status text not null default 'NO_GO_RECOVERY_ESCROW_FRESH_RECEIPTS_REQUIRED',
  pass2917_auto_downgrade_digest text,
  customer_notice_reopen_packet_digest text,
  recovery_escrow_packet_digest text,
  shield_recovery_receipt_digest text,
  realmarkets_recovery_receipt_digest text,
  pdf_tier_recovery_receipt_digest text,
  payment_entitlement_recovery_receipt_digest text,
  provider_freshness_recovery_receipt_digest text,
  operator_dual_control_reopen_vote_digest text,
  append_only_recovery_history_digest text,
  reopen_notice_sla_hours integer not null default 24,
  can_restore_from_downgrade_directly boolean not null default false,
  can_use_downgraded_status_as_recovery_proof boolean not null default false,
  can_hide_customer_notice boolean not null default false,
  can_skip_recovery_escrow boolean not null default false,
  can_reuse_old_revalidation_receipts boolean not null default false,
  can_rewrite_downgrade_history boolean not null default false,
  can_show_green_badge boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pass2918_no_go_without_downgrade_recovery_escrow
    check (production_decision = 'NO_GO'),
  constraint pass2918_direct_restore_after_downgrade_blocked
    check (can_restore_from_downgrade_directly = false and can_use_downgraded_status_as_recovery_proof = false and can_skip_recovery_escrow = false),
  constraint pass2918_customer_notice_and_append_only_history_required
    check (can_hide_customer_notice = false and can_rewrite_downgrade_history = false),
  constraint pass2918_old_revalidation_receipt_reuse_blocked
    check (can_reuse_old_revalidation_receipts = false),
  constraint pass2918_green_badge_blocked_during_recovery_reopen
    check (can_show_green_badge = false),
  constraint pass2918_recovery_status_required
    check (downgrade_recovery_status = 'NO_GO_DOWNGRADE_RECOVERY_ESCROW_REQUIRED')
);

create or replace view pass2918_no_restore_without_recovery_escrow as
select
  id,
  release_candidate,
  downgrade_recovery_status,
  customer_notice_reopen_status,
  recovery_escrow_fresh_receipts_status,
  can_restore_from_downgrade_directly,
  can_hide_customer_notice,
  can_show_green_badge
from market_integrity_downgrade_recovery_escrow_gates
where production_decision = 'NO_GO';

comment on table market_integrity_downgrade_recovery_escrow_gates is
'PASS2918 gate: after automatic public trust downgrade, recovery must reopen with customer notice, fresh recovery escrow receipts, dual-control approval and append-only history; direct restore remains blocked.';
