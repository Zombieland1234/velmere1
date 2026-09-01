-- PASS2852 Customer Export Retention Purge Execution / Tombstone Gate
-- Purpose: retention/legal-hold approval is not enough. Actual archive purge requires
-- a worker execution record, storage lifecycle receipts, per-channel delete receipts,
-- tombstone verification, customer access-index purge markers and post-purge reconciliation.

create table if not exists market_integrity_customer_export_retention_purge_executions (
  id text primary key,
  release_packet_id text not null,
  seal_id text not null,
  archive_bundle_id text not null,
  archive_tombstone_id text not null,
  retention_policy_id text not null,
  scheduled_purge_at timestamptz not null,
  purge_worker_run_id text not null,
  legal_hold_release_receipt_id text not null,
  storage_lifecycle_execution_receipt_id text not null,
  tombstone_manifest_hash text not null,
  verified_archive_tombstone_id text not null,
  customer_index_purge_marker_id text not null,
  immutable_purge_audit_receipt_id text not null,
  post_purge_reconciliation_receipt_id text not null,
  operator_purge_signoff_receipt_id text not null,
  purge_completed_at timestamptz not null,
  post_purge_drift_detected boolean not null default false,
  created_at timestamptz not null default now(),
  constraint market_integrity_customer_export_retention_purge_no_drift check (post_purge_drift_detected = false)
);

create table if not exists market_integrity_customer_export_channel_purge_execution_receipts (
  id text primary key,
  purge_execution_id text not null references market_integrity_customer_export_retention_purge_executions(id) on delete cascade,
  channel text not null check (channel in ('account_vault', 'email', 'api', 'support')),
  purge_job_id text not null,
  storage_delete_receipt_id text not null,
  tombstone_verify_receipt_id text not null,
  customer_access_revoked_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (purge_execution_id, channel)
);

create table if not exists market_integrity_customer_export_archive_tombstone_index_pass2852 (
  tombstone_id text primary key,
  archive_bundle_id text not null,
  tombstone_manifest_hash text not null,
  customer_index_purge_marker_id text not null,
  immutable_purge_audit_receipt_id text not null,
  created_at timestamptz not null default now()
);
