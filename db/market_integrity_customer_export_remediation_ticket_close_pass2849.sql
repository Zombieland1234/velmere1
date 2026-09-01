-- PASS2849 Customer Export Remediation Ticket Close Gate
-- Purpose: keep customer-visible export channels frozen until drift/no-drift close is root-caused,
-- remediated, replayed/resealed, customer-impact reviewed, noticed and timeline-hashed.

create table if not exists market_integrity_customer_export_remediation_ticket_closes (
  id uuid primary key default gen_random_uuid(),
  export_packet_id text not null,
  release_packet_id text not null,
  seal_id text not null,
  reconciliation_run_id text not null,
  remediation_ticket_id text not null,
  remediation_root_cause text not null check (remediation_root_cause in (
    'payload_hash_drift',
    'source_receipt_root_drift',
    'channel_commit_mismatch',
    'stale_storage_object',
    'outbox_replay_duplicate',
    'customer_receipt_mismatch',
    'no_drift_observed',
    'unknown'
  )),
  operator_remediation_receipt_id text not null,
  replay_and_reseal_receipt_id text not null,
  expected_payload_hash text not null,
  expected_source_receipt_root text not null,
  corrected_payload_hash text not null,
  corrected_source_receipt_root text not null,
  customer_impact_assessment_id text not null,
  freeze_lift_decision_receipt_id text not null,
  customer_remediation_notice_receipt_id text not null,
  no_residual_drift_receipt_id text not null,
  remediation_audit_timeline_hash text not null,
  remediation_closed_at timestamptz not null,
  residual_drift_detected boolean not null default false,
  created_at timestamptz not null default now(),
  constraint market_integrity_customer_export_remediation_no_drift_check check (residual_drift_detected = false),
  constraint market_integrity_customer_export_remediation_payload_match check (expected_payload_hash = corrected_payload_hash),
  constraint market_integrity_customer_export_remediation_source_root_match check (expected_source_receipt_root = corrected_source_receipt_root)
);

create unique index if not exists market_integrity_customer_export_remediation_ticket_unique_idx
  on market_integrity_customer_export_remediation_ticket_closes (export_packet_id, remediation_ticket_id);

create table if not exists market_integrity_customer_export_remediation_freeze_lift_events (
  id uuid primary key default gen_random_uuid(),
  remediation_close_id uuid not null references market_integrity_customer_export_remediation_ticket_closes(id),
  channel text not null check (channel in ('account_vault', 'email', 'api', 'support')),
  freeze_lift_decision_receipt_id text not null,
  customer_notice_receipt_id text not null,
  resumed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(remediation_close_id, channel)
);

comment on table market_integrity_customer_export_remediation_ticket_closes is
  'PASS2849 durable remediation close contract: drift/no-drift export close must bind root cause, operator remediation, replay/reseal, corrected payload/source roots, customer impact, freeze-lift, notice, timeline and no-residual-drift proof.';

comment on table market_integrity_customer_export_remediation_freeze_lift_events is
  'PASS2849 per-channel freeze-lift events: account vault, email, API and support channels cannot resume without remediation close and customer notice receipts.';
