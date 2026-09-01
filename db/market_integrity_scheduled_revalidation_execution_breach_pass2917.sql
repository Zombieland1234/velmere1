create table if not exists market_integrity_scheduled_revalidation_execution_breach_gates (
  id uuid primary key default gen_random_uuid(),
  pass integer not null default 2917,
  release_candidate text not null,
  production_decision text not null default 'NO_GO',
  public_claim_status text not null default 'NO_GO_PUBLIC_RECEIPTS_REQUIRED',
  final_seal_status text not null default 'NO_GO_RENEWAL_PROMOTION_FINAL_SEAL_REQUIRED',
  scheduled_revalidation_status text not null default 'NO_GO_SCHEDULED_REVALIDATION_REQUIRED',
  revalidation_execution_status text not null default 'NO_GO_SCHEDULED_REVALIDATION_EXECUTION_REQUIRED',
  revalidation_breach_status text not null default 'NO_GO_REVALIDATION_BREACH_AUTO_DOWNGRADE_REQUIRED',
  degraded_public_trust_status text not null default 'NO_GO_PUBLIC_TRUST_DEGRADED_REVALIDATION_MISSED',
  pass2916_final_seal_digest text,
  scheduled_job_execution_receipt_digest text,
  shield_revalidation_receipt_digest text,
  realmarkets_revalidation_receipt_digest text,
  pdf_tier_revalidation_receipt_digest text,
  payment_entitlement_revalidation_receipt_digest text,
  provider_freshness_revalidation_receipt_digest text,
  auto_downgrade_decision_digest text,
  customer_visible_degraded_board_digest text,
  append_only_breach_history_digest text,
  missed_revalidation_grace_minutes integer not null default 0,
  revalidation_cadence_hours integer not null default 24,
  can_keep_restored_trust boolean not null default false,
  can_ignore_missed_revalidation boolean not null default false,
  can_manually_keep_green_on_breach boolean not null default false,
  can_use_old_final_seal_as_current_proof boolean not null default false,
  can_hide_degraded_status_from_customers boolean not null default false,
  can_show_green_badge boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pass2917_no_go_without_scheduled_revalidation_execution
    check (production_decision = 'NO_GO'),
  constraint pass2917_missed_revalidation_auto_downgrade_required
    check (can_keep_restored_trust = false and can_ignore_missed_revalidation = false and can_manually_keep_green_on_breach = false and can_use_old_final_seal_as_current_proof = false),
  constraint pass2917_degraded_status_must_be_customer_visible
    check (can_hide_degraded_status_from_customers = false),
  constraint pass2917_green_badge_blocked_on_breach
    check (can_show_green_badge = false),
  constraint pass2917_execution_status_required
    check (revalidation_execution_status = 'NO_GO_SCHEDULED_REVALIDATION_EXECUTION_REQUIRED')
);

comment on table market_integrity_scheduled_revalidation_execution_breach_gates is
'PASS2917 gate: scheduled revalidation must execute with fresh receipts; missed SLA triggers fail-closed automatic public trust downgrade and customer-visible degraded status.';
