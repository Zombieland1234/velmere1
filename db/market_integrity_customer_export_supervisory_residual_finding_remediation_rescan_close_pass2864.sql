-- PASS2864 — Customer Export Supervisory Residual Finding Remediation / Re-Scan Close Gate
-- Contract schema only. Production must bind this to live remediation tickets, scanner runs, notice workflow and operator/legal UI.

create table if not exists market_integrity_customer_export_supervisory_residual_finding_remediation_rescan_closes (
  id text primary key,
  release_packet_id text not null,
  seal_id text not null,
  previous_post_purge_residual_scan_state text not null,
  previous_residual_evidence_detected boolean not null default false,
  no_residual_carry_forward_receipt_id text,
  residual_finding_ticket_id text,
  residual_finding_severity text not null check (residual_finding_severity in ('none','low','medium','high','critical')),
  remediation_owner_id text,
  remediation_sla_policy_id text,
  remediation_due_at timestamptz,
  remediation_fix_receipt_id text,
  corrected_rescan_run_id text,
  corrected_rescan_manifest_hash text,
  corrected_no_residual_attestation_receipt_id text,
  regulator_auditor_notice_decision text check (regulator_auditor_notice_decision in ('not_required','notify_regulator','notify_auditor','notify_both')),
  regulator_auditor_notice_receipt_id text,
  remediation_close_signoff_receipt_id text,
  supervisory_residual_remediation_timeline_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pass2864_clean_path_requires_carry_forward check (previous_residual_evidence_detected = true or no_residual_carry_forward_receipt_id is not null),
  constraint pass2864_residual_path_requires_ticket_owner_sla_fix check (
    previous_residual_evidence_detected = false or (
      residual_finding_ticket_id is not null and
      remediation_owner_id is not null and
      remediation_sla_policy_id is not null and
      remediation_due_at is not null and
      remediation_fix_receipt_id is not null and
      corrected_rescan_run_id is not null and
      corrected_rescan_manifest_hash is not null and
      corrected_no_residual_attestation_receipt_id is not null and
      remediation_close_signoff_receipt_id is not null and
      supervisory_residual_remediation_timeline_hash is not null
    )
  ),
  constraint pass2864_notice_receipt_required_when_notice_required check (
    regulator_auditor_notice_decision is null or
    regulator_auditor_notice_decision = 'not_required' or
    regulator_auditor_notice_receipt_id is not null
  )
);

create table if not exists market_integrity_customer_export_supervisory_residual_finding_corrected_rescan_receipts (
  id text primary key,
  remediation_close_id text not null references market_integrity_customer_export_supervisory_residual_finding_remediation_rescan_closes(id) on delete cascade,
  channel text not null check (channel in ('regulator_access_index','auditor_access_index','support_attachment_cache','legal_case_cache','operator_console_cache','secure_vault_index')),
  corrected_residual_scan_receipt_id text not null,
  corrected_cache_purge_receipt_id text not null,
  corrected_tombstone_verification_receipt_id text not null,
  corrected_residual_item_count integer not null default 0 check (corrected_residual_item_count = 0),
  rescanned_at timestamptz not null,
  unique (remediation_close_id, channel)
);

create index if not exists market_integrity_pass2864_release_packet_idx
  on market_integrity_customer_export_supervisory_residual_finding_remediation_rescan_closes(release_packet_id);
