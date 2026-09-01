-- PASS2865 Customer Export Supervisory Residual Remediation Escalation / Missed-SLA Gate
-- Static schema contract for durable missed-SLA escalation after supervisory residual remediation re-scan close.

create table if not exists market_integrity_customer_export_supervisory_residual_remediation_escalation_missed_slas (
  id uuid primary key default gen_random_uuid(),
  release_packet_id text not null,
  seal_id text not null,
  residual_finding_ticket_id text not null,
  remediation_sla_policy_id text not null,
  missed_sla_monitor_receipt_id text not null,
  remediation_sla_breached boolean not null default false,
  remediation_current_age_hours numeric(10,2) not null default 0,
  missed_sla_detection_receipt_id text,
  supervisor_escalation_receipt_id text,
  escalation_supervisor_pseudonym text,
  unresolved_residual_freeze_extension_receipt_id text,
  freeze_extended_until timestamptz,
  notice_escalation_decision_receipt_id text,
  notice_escalation_receipts jsonb not null default '[]'::jsonb,
  operator_override_requested boolean not null default false,
  operator_override_review_receipt_id text,
  operator_override_approved boolean not null default false,
  operator_override_controls_receipt_id text,
  operator_override_reason_hash text,
  escalation_timeline_hash text,
  created_at timestamptz not null default now(),
  constraint pass2865_breach_requires_detection_supervisor_freeze check (
    remediation_sla_breached = false or (
      missed_sla_detection_receipt_id is not null and
      supervisor_escalation_receipt_id is not null and
      escalation_supervisor_pseudonym is not null and
      unresolved_residual_freeze_extension_receipt_id is not null and
      freeze_extended_until is not null
    )
  ),
  constraint pass2865_notice_decision_required_when_breached check (
    remediation_sla_breached = false or notice_escalation_decision_receipt_id is not null
  ),
  constraint pass2865_operator_override_requires_review_controls_reason check (
    operator_override_requested = false or (
      operator_override_review_receipt_id is not null and
      operator_override_controls_receipt_id is not null and
      operator_override_reason_hash is not null
    )
  ),
  constraint pass2865_escalation_timeline_required_when_breached check (
    remediation_sla_breached = false or escalation_timeline_hash is not null
  )
);

create index if not exists idx_pass2865_residual_missed_sla_release_packet
  on market_integrity_customer_export_supervisory_residual_remediation_escalation_missed_slas (release_packet_id, seal_id);
