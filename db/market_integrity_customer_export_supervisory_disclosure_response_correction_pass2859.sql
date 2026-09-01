-- PASS2859 Customer Export Supervisory Disclosure Response / Correction Gate
-- Deterministic schema contract for regulator/auditor follow-up questions, supplemental evidence and corrected packets.
-- This is a migration plan only; production apply must be reviewed before running.

create table if not exists market_integrity_customer_export_supervisory_disclosure_responses (
  id text primary key,
  supervisory_case_id text not null,
  disclosure_response_case_id text not null unique,
  response_type text not null check (response_type in ('clarification_response','supplemental_evidence','correction_notice','withdrawal_notice','closure_response')),
  supervisory_request_intake_receipt_id text not null,
  response_draft_receipt_id text not null,
  supplemental_evidence_manifest_hash text not null,
  correction_review_receipt_id text not null,
  corrected_supervisory_packet_id text not null,
  corrected_redaction_manifest_hash text not null,
  original_archive_binding_hash text not null,
  original_archive_mutation_attempted boolean not null default false,
  customer_notice_reassessment_receipt_id text,
  customer_notice_suppressed_reason text,
  export_freeze_receipt_id text,
  response_audit_timeline_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pass2859_no_original_archive_mutation check (original_archive_mutation_attempted = false),
  constraint pass2859_notice_reassessment_or_suppression check (customer_notice_reassessment_receipt_id is not null or customer_notice_suppressed_reason is not null)
);

create table if not exists market_integrity_customer_export_supervisory_response_channel_receipts (
  id text primary key,
  disclosure_response_case_id text not null references market_integrity_customer_export_supervisory_disclosure_responses(disclosure_response_case_id),
  channel text not null check (channel in ('secure_vault','legal','regulator','auditor','operator_console')),
  channel_receipt_id text not null,
  response_packet_id text not null,
  corrected_redaction_manifest_hash text not null,
  delivered_at timestamptz not null,
  acknowledged_by_recipient boolean not null default false,
  created_at timestamptz not null default now(),
  unique(disclosure_response_case_id, channel, channel_receipt_id)
);

create index if not exists idx_pass2859_supervisory_response_case
  on market_integrity_customer_export_supervisory_disclosure_responses(supervisory_case_id, disclosure_response_case_id);

create index if not exists idx_pass2859_supervisory_response_channel
  on market_integrity_customer_export_supervisory_response_channel_receipts(disclosure_response_case_id, channel);
