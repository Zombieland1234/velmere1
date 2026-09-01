-- PASS2860 Customer Export Supervisory Disclosure Final Close / Evidence Retention Lock Gate
-- Prepared-only SQL contract. Production migration must be reviewed before execution.

create table if not exists market_integrity_customer_export_supervisory_disclosure_final_closes (
  id uuid primary key default gen_random_uuid(),
  supervisory_final_close_case_id text not null unique,
  disclosure_response_case_id text not null,
  final_response_closure_receipt_id text not null,
  evidence_retention_lock_receipt_id text not null,
  retention_policy_snapshot_hash text not null,
  response_correction_version_index_hash text not null,
  immutable_supervisory_timeline_hash text not null,
  customer_notice_final_decision_receipt_id text,
  customer_notice_suppressed_reason text,
  export_freeze_receipt_id text,
  archive_mutation_attempted_after_close boolean not null default false,
  status text not null default 'prepared',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pass2860_no_archive_mutation_after_close check (archive_mutation_attempted_after_close = false),
  constraint pass2860_customer_notice_final_decision_required check (customer_notice_final_decision_receipt_id is not null or customer_notice_suppressed_reason is not null)
);

create table if not exists market_integrity_customer_export_supervisory_disclosure_final_ack_receipts (
  id uuid primary key default gen_random_uuid(),
  supervisory_final_close_case_id text not null references market_integrity_customer_export_supervisory_disclosure_final_closes(supervisory_final_close_case_id),
  channel text not null check (channel in ('secure_vault','legal','regulator','auditor','operator_console')),
  channel_ack_receipt_id text not null unique,
  final_packet_id text not null,
  evidence_retention_lock_receipt_id text not null,
  acknowledged_at timestamptz not null,
  acknowledged_by_recipient boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pass2860_final_channel_ack_required check (acknowledged_by_recipient = true)
);

create index if not exists idx_pass2860_supervisory_final_close_case on market_integrity_customer_export_supervisory_disclosure_final_closes(supervisory_final_close_case_id);
create index if not exists idx_pass2860_supervisory_final_ack_case on market_integrity_customer_export_supervisory_disclosure_final_ack_receipts(supervisory_final_close_case_id);
