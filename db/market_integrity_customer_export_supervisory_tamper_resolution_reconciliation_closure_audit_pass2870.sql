-- PASS2870 Customer Export Supervisory Tamper Resolution Reconciliation / Closure Audit Gate
-- This is a schema contract plan, not an applied production migration.

create table if not exists market_integrity_customer_export_supervisory_tamper_resolution_reconciliation_closure_audits (
  id uuid primary key default gen_random_uuid(),
  release_packet_id text not null,
  seal_id text not null,
  tamper_resolution_case_id text not null,
  original_frozen_index_id text not null,
  original_frozen_index_version text not null,
  original_frozen_index_hash text not null,
  corrected_evidence_index_id text not null,
  corrected_evidence_index_version text not null,
  corrected_evidence_index_hash text not null,
  corrected_index_comparison_receipt_id text not null,
  corrected_index_ledger_binding_hash text not null,
  archive_resume_refreeze_ledger_receipt_id text not null,
  final_notice_reconciliation_receipt_id text not null,
  closure_signoff_reconciliation_receipt_id text not null,
  residual_hash_drift_scan_receipt_id text not null,
  residual_channel_drift_scan_receipt_id text not null,
  residual_drift_detected boolean not null default false,
  closure_audit_payload_hash text not null,
  closure_audit_timeline_hash text not null,
  created_at timestamptz not null default now(),
  constraint pass2870_no_silent_archive_resume_after_tamper check (archive_resume_refreeze_ledger_receipt_id <> ''),
  constraint pass2870_original_index_immutable_reference check (original_frozen_index_hash <> corrected_evidence_index_hash),
  constraint pass2870_no_residual_drift_for_close check (residual_drift_detected = false)
);

create unique index if not exists pass2870_tamper_resolution_reconciliation_case_unique
  on market_integrity_customer_export_supervisory_tamper_resolution_reconciliation_closure_audits (release_packet_id, tamper_resolution_case_id, closure_audit_timeline_hash);
