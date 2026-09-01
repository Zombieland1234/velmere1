-- PASS2858 Customer Export Supervisory Evidence Index Gate
-- Deterministic schema contract only. Not executed in this sandbox.

create table if not exists market_integrity_customer_export_supervisory_evidence_cases (
  id uuid primary key default gen_random_uuid(),
  supervisory_case_id text not null unique,
  release_packet_id text not null,
  seal_id text not null,
  supervisory_request_type text not null check (supervisory_request_type in ('internal_audit','external_auditor','regulator_request','legal_hold_review','supervisor_review')),
  lawful_basis_receipt_id text not null,
  minimum_disclosure_manifest_hash text not null,
  supervisory_redaction_manifest_hash text not null,
  legal_privilege_review_receipt_id text not null,
  supervisory_evidence_packet_id text not null,
  supervisory_evidence_index_hash text not null,
  customer_notice_decision_receipt_id text,
  customer_notice_suppressed_reason text,
  export_freeze_receipt_id text,
  raw_operator_notes_included boolean not null default false,
  raw_account_ids_included boolean not null default false,
  raw_payment_ids_included boolean not null default false,
  raw_support_messages_included boolean not null default false,
  supervisory_audit_timeline_hash text not null,
  readiness_score numeric(5,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pass2858_no_raw_sensitive_material check (
    raw_operator_notes_included = false
    and raw_account_ids_included = false
    and raw_payment_ids_included = false
    and raw_support_messages_included = false
  )
);

create table if not exists market_integrity_customer_export_supervisory_evidence_channel_receipts (
  id uuid primary key default gen_random_uuid(),
  supervisory_case_id text not null references market_integrity_customer_export_supervisory_evidence_cases(supervisory_case_id),
  channel text not null check (channel in ('secure_vault','legal','regulator','auditor','operator_console')),
  channel_receipt_id text not null,
  packet_id text not null,
  redaction_manifest_hash text not null,
  delivered_at timestamptz not null,
  access_expires_at timestamptz,
  acknowledged_by_recipient boolean not null default false,
  created_at timestamptz not null default now(),
  unique (supervisory_case_id, channel, channel_receipt_id)
);

create table if not exists market_integrity_customer_export_supervisory_evidence_events (
  id uuid primary key default gen_random_uuid(),
  supervisory_case_id text not null,
  event_type text not null,
  event_receipt_id text not null,
  event_hash text not null,
  actor_pseudonym text not null,
  created_at timestamptz not null default now(),
  unique (supervisory_case_id, event_type, event_receipt_id)
);

create index if not exists idx_pass2858_supervisory_case_release_packet
  on market_integrity_customer_export_supervisory_evidence_cases(release_packet_id, seal_id);

create index if not exists idx_pass2858_supervisory_channel_case
  on market_integrity_customer_export_supervisory_evidence_channel_receipts(supervisory_case_id, channel);
