-- PASS2854 Customer Export Privacy Incident / DSAR Escalation Gate
-- Purpose: post-purge privacy close cannot be treated as incident-close or DSAR/export-of-export readiness.

create table if not exists market_integrity_customer_export_privacy_incident_dsr_escalations (
  id text primary key,
  release_packet_id text not null,
  seal_id text not null,
  tier text not null,
  post_purge_privacy_attestation_id text not null,
  residual_privacy_incident_detected boolean not null default false,
  incident_classification text not null default 'none_observed',
  incident_review_receipt_id text,
  export_delivery_freeze_receipt_id text,
  customer_impact_scope_id text,
  privacy_security_escalation_receipt_id text,
  legal_regulator_review_boundary_receipt_id text,
  customer_notice_escalation_path_receipt_id text,
  data_subject_access_audit_packet_id text,
  data_subject_access_redaction_manifest_hash text,
  data_subject_access_raw_secret_leak_detected boolean not null default false,
  operator_privacy_incident_signoff_receipt_id text,
  incident_dsr_timeline_hash text,
  can_close_privacy_incident_review boolean not null default false,
  can_serve_customer_dsr_audit_packet boolean not null default false,
  can_unfreeze_customer_export_delivery boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pass2854_incident_classification_check check (
    incident_classification in ('none_observed','suspected_residual_trace','confirmed_residual_data','customer_request_only','legal_hold_review')
  ),
  constraint pass2854_no_raw_secret_leak_for_dsr check (
    can_serve_customer_dsr_audit_packet = false or data_subject_access_raw_secret_leak_detected = false
  )
);

create table if not exists market_integrity_customer_export_dsr_redaction_manifests (
  id text primary key,
  escalation_id text not null references market_integrity_customer_export_privacy_incident_dsr_escalations(id),
  redaction_manifest_hash text not null,
  minimized_packet_hash text not null,
  removed_raw_operator_notes boolean not null default true,
  removed_raw_payment_ids boolean not null default true,
  removed_raw_account_ids boolean not null default true,
  removed_private_report_tokens boolean not null default true,
  removed_private_support_messages boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists market_integrity_customer_export_privacy_incident_customer_notices (
  id text primary key,
  escalation_id text not null references market_integrity_customer_export_privacy_incident_dsr_escalations(id),
  notice_channel text not null,
  customer_notice_escalation_path_receipt_id text not null,
  notification_payload_hash text not null,
  delivery_receipt_id text,
  created_at timestamptz not null default now(),
  constraint pass2854_notice_channel_check check (notice_channel in ('account','email','support','api'))
);

comment on table market_integrity_customer_export_privacy_incident_dsr_escalations is
  'PASS2854: deterministic schema contract for customer export privacy incident review, DSAR/export-of-export minimization and delivery freeze/unfreeze gating.';
