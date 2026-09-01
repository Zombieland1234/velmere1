-- PASS2850 Customer Export Final Archive Bundle Gate
-- Purpose: close the customer export chain only when remediation close is archived into an immutable,
-- payload-bound, source-root-bound final evidence bundle with per-channel archived receipts.

create table if not exists market_integrity_customer_export_final_archive_bundles (
  id uuid primary key default gen_random_uuid(),
  export_packet_id text not null,
  release_packet_id text not null,
  seal_id text not null,
  remediation_close_id text not null,
  archive_bundle_id text not null,
  archive_manifest_hash text not null,
  immutable_storage_receipt_id text not null,
  retention_policy_snapshot_id text not null,
  expected_payload_hash text not null,
  expected_source_receipt_root text not null,
  final_payload_hash text not null,
  final_source_receipt_root text not null,
  customer_access_index_id text not null,
  operator_archive_signoff_receipt_id text not null,
  archive_audit_timeline_hash text not null,
  archive_closed_at timestamptz not null,
  archive_integrity_drift_detected boolean not null default false,
  created_at timestamptz not null default now(),
  constraint market_integrity_customer_export_final_archive_payload_match check (expected_payload_hash = final_payload_hash),
  constraint market_integrity_customer_export_final_archive_source_root_match check (expected_source_receipt_root = final_source_receipt_root),
  constraint market_integrity_customer_export_final_archive_no_drift check (archive_integrity_drift_detected = false)
);

create unique index if not exists market_integrity_customer_export_final_archive_bundle_unique_idx
  on market_integrity_customer_export_final_archive_bundles (export_packet_id, archive_bundle_id);

create table if not exists market_integrity_customer_export_final_archive_channel_receipts (
  id uuid primary key default gen_random_uuid(),
  final_archive_bundle_id uuid not null references market_integrity_customer_export_final_archive_bundles(id),
  channel text not null check (channel in ('account_vault', 'email', 'api', 'support')),
  channel_receipt_bundle_id text not null,
  last_commit_receipt_id text not null,
  customer_visible_reference_id text not null,
  archived_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(final_archive_bundle_id, channel)
);

comment on table market_integrity_customer_export_final_archive_bundles is
  'PASS2850 final archive contract: a customer export can only be treated as finally auditable when archive bundle, manifest, immutable storage, retention snapshot, payload/source-root binding, customer access index, operator signoff and audit timeline are attached.';

comment on table market_integrity_customer_export_final_archive_channel_receipts is
  'PASS2850 per-channel archived receipt bundles for account vault, email, API and support final evidence handoff.';
