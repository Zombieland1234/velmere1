-- PASS2921 Probation Exit Seal / Sustained No-Regression Graduation Gate
-- A restore candidate cannot graduate probation from a single clean observation. Sustained receipts and dual-control seal are required.

create table if not exists market_integrity_probation_exit_seal_gates (
  id text primary key,
  created_at timestamptz not null default now(),
  pass integer not null check (pass = 2921),
  pass2920_restore_probation_digest_sha256 text not null,
  sustained_no_regression_rollup_sha256 text not null,
  shield_probation_exit_receipt_sha256 text not null,
  realmarkets_probation_exit_receipt_sha256 text not null,
  pdf_tier_probation_exit_receipt_sha256 text not null,
  payment_entitlement_probation_exit_receipt_sha256 text not null,
  provider_freshness_probation_exit_receipt_sha256 text not null,
  customer_visible_graduation_board_sha256 text not null,
  dual_control_graduation_seal_sha256 text not null,
  append_only_probation_exit_history_sha256 text not null,
  production_decision text not null default 'NO_GO',
  probation_exit_seal_status text not null default 'NO_GO_PROBATION_EXIT_SEAL_REQUIRED',
  sustained_no_regression_graduation_status text not null default 'NO_GO_SUSTAINED_NO_REGRESSION_GRADUATION_REQUIRED',
  graduation_seal_status text not null default 'NO_GO_GRADUATION_SEAL_REQUIRED',
  can_exit_probation_without_sustained_receipts boolean not null default false,
  can_use_single_observation_as_graduation_proof boolean not null default false,
  can_show_green_badge boolean not null default false,
  can_claim_world_class_live boolean not null default false,
  can_rewrite_probation_exit_history boolean not null default false,
  check (production_decision = 'NO_GO'),
  check (probation_exit_seal_status = 'NO_GO_PROBATION_EXIT_SEAL_REQUIRED'),
  check (sustained_no_regression_graduation_status = 'NO_GO_SUSTAINED_NO_REGRESSION_GRADUATION_REQUIRED'),
  check (graduation_seal_status = 'NO_GO_GRADUATION_SEAL_REQUIRED'),
  check (can_exit_probation_without_sustained_receipts = false),
  check (can_use_single_observation_as_graduation_proof = false),
  check (can_show_green_badge = false),
  check (can_claim_world_class_live = false),
  check (can_rewrite_probation_exit_history = false)
);

create or replace view pass2921_no_graduation_without_probation_exit_seal as
select
  id,
  probation_exit_seal_status,
  sustained_no_regression_graduation_status,
  graduation_seal_status,
  can_exit_probation_without_sustained_receipts,
  can_use_single_observation_as_graduation_proof,
  can_show_green_badge,
  can_claim_world_class_live
from market_integrity_probation_exit_seal_gates
where production_decision = 'NO_GO'
  and can_exit_probation_without_sustained_receipts = false
  and can_use_single_observation_as_graduation_proof = false
  and can_show_green_badge = false
  and can_claim_world_class_live = false;
