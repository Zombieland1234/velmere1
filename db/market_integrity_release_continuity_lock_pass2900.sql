-- PASS2900 release continuity lock contract.
-- The live DB table stores release lineage continuity checks after rollback/recovery.

create table if not exists market_integrity_release_continuity_lock_gates (
  id uuid primary key default gen_random_uuid(),
  pass integer not null default 2900,
  release_lineage text not null,
  continuity_decision text not null default 'NO_GO_CONTINUITY_LOCKED',
  production_decision text not null default 'NO_GO',
  previous_recovery_pass integer not null default 2899,
  continuity_digest text not null,
  missing_lineage_artifacts jsonb not null default '[]'::jsonb,
  missing_runtime_receipts jsonb not null default '[]'::jsonb,
  operator_signature_required boolean not null default true,
  auto_restore_go_after_recovery_allowed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pass2900_no_go_without_contiguous_lineage check (continuity_decision in ('NO_GO_CONTINUITY_LOCKED','GO_CANDIDATE_PENDING_FRESH_RECEIPTS')),
  constraint pass2900_auto_restore_forbidden check (auto_restore_go_after_recovery_allowed = false),
  constraint pass2900_production_no_go_default check (production_decision = 'NO_GO')
);

create index if not exists idx_market_integrity_release_continuity_lock_pass2900_lineage
  on market_integrity_release_continuity_lock_gates (release_lineage, created_at desc);
