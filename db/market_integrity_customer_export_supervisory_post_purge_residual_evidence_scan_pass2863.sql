-- PASS2863 — Customer Export Supervisory Post-Purge Residual Evidence Scan Gate
-- Contract schema only. Production must bind this to real residual scanners, storage/index/cache purge receipts and legal workflow.

create table if not exists market_integrity_customer_export_supervisory_post_purge_residual_evidence_scans (
  id text primary key,
  release_packet_id text not null,
  seal_id text not null,
  supervisory_tombstone_manifest_hash text not null,
  supervisory_tombstone_verification_receipt_id text not null,
  legal_hold_recheck_receipt_id text not null,
  post_purge_legal_hold_active boolean not null default false,
  post_purge_access_extension_active boolean not null default false,
  residual_scanner_run_id text not null,
  residual_scan_manifest_hash text not null,
  regulator_auditor_access_index_purge_verification_receipt_id text not null,
  support_legal_operator_cache_purge_batch_receipt_id text not null,
  residual_evidence_detected boolean not null default false,
  residual_finding_remediation_ticket_id text,
  final_no_residual_attestation_receipt_id text not null,
  privacy_legal_signoff_receipt_id text not null,
  supervisory_post_purge_residual_timeline_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pass2863_no_residual_close_during_legal_hold check (post_purge_legal_hold_active = false and post_purge_access_extension_active = false),
  constraint pass2863_residual_requires_remediation_ticket check (residual_evidence_detected = false or residual_finding_remediation_ticket_id is not null)
);

create table if not exists market_integrity_customer_export_supervisory_post_purge_residual_channel_scans (
  id text primary key,
  scan_id text not null references market_integrity_customer_export_supervisory_post_purge_residual_evidence_scans(id) on delete cascade,
  channel text not null check (channel in ('regulator_access_index','auditor_access_index','support_attachment_cache','legal_case_cache','operator_console_cache','secure_vault_index')),
  residual_scan_receipt_id text not null,
  cache_purge_receipt_id text not null,
  tombstone_verification_receipt_id text not null,
  residual_item_count integer not null default 0 check (residual_item_count >= 0),
  scanned_at timestamptz not null,
  unique (scan_id, channel)
);

create index if not exists market_integrity_pass2863_release_packet_idx
  on market_integrity_customer_export_supervisory_post_purge_residual_evidence_scans(release_packet_id);
