-- PASS2862 Customer Export Supervisory Retention Purge / Tombstone Gate
-- This is a schema contract, not a completed production migration.

create table if not exists market_integrity_customer_export_supervisory_retention_purge_tombstones (
  id uuid primary key default gen_random_uuid(),
  release_packet_id text not null,
  seal_id text not null,
  supervisory_final_close_case_id text not null,
  evidence_retention_lock_receipt_id text not null,
  retention_job_schedule_id text not null,
  retention_expired_at timestamptz not null,
  retention_expiry_verified_receipt_id text not null,
  legal_hold_active boolean not null default false,
  access_extension_active boolean not null default false,
  supervisory_purge_authorization_receipt_id text not null,
  archive_lock_release_receipt_id text not null,
  supervisory_retention_purge_worker_run_receipt_id text not null,
  supervisory_tombstone_manifest_hash text not null,
  supervisory_tombstone_verification_receipt_id text not null,
  post_purge_reconciliation_hash text not null,
  purge_attempted_during_legal_hold boolean not null default false,
  readiness_state text not null,
  readiness_score numeric(6,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pass2862_no_purge_during_legal_hold check (purge_attempted_during_legal_hold = false and legal_hold_active = false),
  constraint pass2862_no_purge_with_active_access_extension check (access_extension_active = false),
  constraint pass2862_ready_state_requires_tombstone check (readiness_state <> 'supervisory_retention_purge_tombstone_ready' or (supervisory_tombstone_manifest_hash <> '' and supervisory_tombstone_verification_receipt_id <> '' and post_purge_reconciliation_hash <> ''))
);

create table if not exists market_integrity_customer_export_supervisory_access_revocation_receipts (
  id uuid primary key default gen_random_uuid(),
  purge_tombstone_id uuid not null references market_integrity_customer_export_supervisory_retention_purge_tombstones(id) on delete cascade,
  channel text not null check (channel in ('secure_vault', 'legal', 'regulator', 'auditor', 'operator_console')),
  access_revocation_receipt_id text not null,
  access_expiry_receipt_id text not null,
  final_close_case_id text not null,
  evidence_retention_lock_receipt_id text not null,
  revoked_at timestamptz not null,
  revocation_enforced boolean not null default false,
  created_at timestamptz not null default now(),
  unique (purge_tombstone_id, channel, access_revocation_receipt_id)
);

create index if not exists market_integrity_pass2862_retention_purge_state_idx
  on market_integrity_customer_export_supervisory_retention_purge_tombstones(readiness_state, retention_expired_at, created_at);
