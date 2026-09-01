-- PASS2853 customer export post-purge privacy attestation / residual-data scanner contract.
-- Purpose: prove that archive purge/tombstone completion was followed by residual-data scans,
-- search-index/cache purge receipts, privacy attestation and final customer notice evidence.

create table if not exists market_integrity_customer_export_post_purge_privacy_attestations (
  id text primary key,
  export_archive_bundle_id text not null,
  release_packet_id text not null,
  seal_id text not null,
  payload_hash text not null,
  source_receipt_root text not null,
  previous_purge_state text not null,
  previous_verified_archive_tombstone_id text not null,
  residual_scanner_run_id text not null,
  residual_scan_manifest_hash text not null,
  search_index_purge_receipt_id text not null,
  cdn_cache_purge_receipt_id text not null,
  residual_data_detected boolean not null default false,
  residual_data_remediation_ticket_id text,
  privacy_attestation_receipt_id text not null,
  privacy_officer_signoff_receipt_id text not null,
  customer_final_privacy_notice_receipt_id text not null,
  post_purge_privacy_reconciliation_hash text not null,
  privacy_closed_at timestamptz,
  created_at timestamptz not null default now(),
  check (residual_data_detected = false or residual_data_remediation_ticket_id is not null)
);

create table if not exists market_integrity_customer_export_residual_scan_receipts (
  id text primary key,
  privacy_attestation_id text not null references market_integrity_customer_export_post_purge_privacy_attestations(id) on delete cascade,
  channel text not null check (channel in ('account_vault', 'email', 'api', 'support')),
  residual_scan_receipt_id text not null,
  purge_verification_receipt_id text not null,
  residual_item_count integer not null default 0 check (residual_item_count >= 0),
  scanned_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (privacy_attestation_id, channel)
);

create index if not exists idx_market_integrity_customer_export_post_purge_privacy_release
  on market_integrity_customer_export_post_purge_privacy_attestations(release_packet_id, seal_id);

create index if not exists idx_market_integrity_customer_export_residual_scan_privacy_id
  on market_integrity_customer_export_residual_scan_receipts(privacy_attestation_id);

comment on table market_integrity_customer_export_post_purge_privacy_attestations is
  'PASS2853: post-purge privacy close requires residual scanner run, index/cache purge receipts, privacy attestation, final customer notice and reconciliation hash.';

comment on table market_integrity_customer_export_residual_scan_receipts is
  'PASS2853: per-channel residual scan receipts for account vault, email, API and support after customer export purge/tombstone.';
