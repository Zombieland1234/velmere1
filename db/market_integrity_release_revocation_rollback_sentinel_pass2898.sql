-- PASS2898: release revocation / rollback sentinel gate.
-- Purpose: forbid stale, mutated or regressed receipt families from keeping production GO after attestation.

create table if not exists market_integrity_release_revocation_rollback_sentinel_gates (
  id text primary key,
  pass integer not null default 2898,
  decision text not null default 'NO_GO',
  revocation_decision text not null default 'REVOKE_IF_ANY_TRIGGER',
  attestation_digest text,
  rollback_target text,
  missing_receipt_count integer not null default 0,
  stale_receipt_count integer not null default 0,
  mutated_receipt_count integer not null default 0,
  runtime_regression_count integer not null default 0,
  operator_reapproval_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pass2898_no_go_without_revocation_safe_receipts
    check (decision = 'NO_GO' or (missing_receipt_count = 0 and stale_receipt_count = 0 and mutated_receipt_count = 0 and runtime_regression_count = 0 and operator_reapproval_required = false))
);

create index if not exists market_integrity_release_revocation_rollback_sentinel_pass_idx
  on market_integrity_release_revocation_rollback_sentinel_gates(pass, decision, revocation_decision);
