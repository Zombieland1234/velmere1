-- PASS2920 Recovery Restore Candidate Probation / Post-Decision Observation Gate
-- A public recovery decision creates only a restore candidate under observation. It cannot immediately restore green status.

create table if not exists market_integrity_recovery_restore_candidate_probation_gates (
  id text primary key,
  created_at timestamptz not null default now(),
  pass integer not null check (pass = 2920),
  pass2919_public_recovery_decision_digest_sha256 text not null,
  restore_candidate_probation_packet_sha256 text not null,
  post_decision_observation_matrix_sha256 text not null,
  shield_restore_probation_receipt_sha256 text not null,
  realmarkets_restore_probation_receipt_sha256 text not null,
  pdf_tier_restore_probation_receipt_sha256 text not null,
  payment_entitlement_restore_probation_receipt_sha256 text not null,
  provider_freshness_restore_probation_receipt_sha256 text not null,
  customer_visible_probation_board_sha256 text not null,
  append_only_restore_probation_history_sha256 text not null,
  production_decision text not null default 'NO_GO',
  recovery_restore_probation_status text not null default 'NO_GO_RECOVERY_RESTORE_CANDIDATE_PROBATION_REQUIRED',
  post_decision_observation_status text not null default 'NO_GO_POST_DECISION_OBSERVATION_REQUIRED',
  no_regression_receipt_status text not null default 'NO_GO_NO_REGRESSION_OBSERVATION_RECEIPTS_REQUIRED',
  can_restore_immediately_after_recovery_decision boolean not null default false,
  can_show_green_badge boolean not null default false,
  can_claim_world_class_live boolean not null default false,
  can_skip_post_decision_observation boolean not null default false,
  can_hide_restore_candidate_probation boolean not null default false,
  check (production_decision = 'NO_GO'),
  check (recovery_restore_probation_status = 'NO_GO_RECOVERY_RESTORE_CANDIDATE_PROBATION_REQUIRED'),
  check (post_decision_observation_status = 'NO_GO_POST_DECISION_OBSERVATION_REQUIRED'),
  check (no_regression_receipt_status = 'NO_GO_NO_REGRESSION_OBSERVATION_RECEIPTS_REQUIRED'),
  check (can_restore_immediately_after_recovery_decision = false),
  check (can_show_green_badge = false),
  check (can_claim_world_class_live = false),
  check (can_skip_post_decision_observation = false),
  check (can_hide_restore_candidate_probation = false)
);

create or replace view pass2920_no_restore_without_candidate_probation as
select
  id,
  recovery_restore_probation_status,
  post_decision_observation_status,
  no_regression_receipt_status,
  can_restore_immediately_after_recovery_decision,
  can_show_green_badge,
  can_claim_world_class_live
from market_integrity_recovery_restore_candidate_probation_gates
where production_decision = 'NO_GO'
  and can_restore_immediately_after_recovery_decision = false
  and can_show_green_badge = false
  and can_claim_world_class_live = false;
