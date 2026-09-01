-- PASS2857 Customer Export Privacy Case Supervisor / SLA Escalation Gate
-- Contract-only schema plan. Not executed in this chat.

create table if not exists market_integrity_customer_export_privacy_case_supervisor_sla_cases (
  id text primary key,
  release_packet_id text not null,
  seal_id text not null,
  privacy_case_status text not null,
  supervisor_pseudonym text not null,
  supervisor_assignment_receipt_id text not null,
  privacy_case_sla_policy_id text not null,
  appeal_resolution_due_at timestamptz not null,
  appeal_resolution_closed_at timestamptz,
  privacy_case_current_age_hours numeric not null default 0,
  legal_privacy_signoff_late boolean not null default false,
  sla_breach_detected boolean not null default false,
  late_signoff_escalation_receipt_id text,
  duplicate_appeal_count integer not null default 0,
  duplicate_appeal_throttle_receipt_id text,
  abuse_guard_receipt_id text,
  customer_communication_cadence_receipt_id text not null,
  unresolved_case_export_freeze_receipt_id text,
  supervisor_audit_timeline_hash text not null,
  payload_hash text not null,
  source_receipt_root text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists market_integrity_customer_export_privacy_case_supervisor_sla_events (
  id text primary key,
  case_id text not null references market_integrity_customer_export_privacy_case_supervisor_sla_cases(id),
  event_kind text not null,
  event_receipt_id text not null,
  actor_pseudonym text not null,
  customer_visible boolean not null default false,
  event_payload_hash text not null,
  event_source_receipt_root text not null,
  event_created_at timestamptz not null default now()
);

create index if not exists idx_pass2857_supervisor_sla_cases_release_packet
  on market_integrity_customer_export_privacy_case_supervisor_sla_cases(release_packet_id);

create index if not exists idx_pass2857_supervisor_sla_cases_status
  on market_integrity_customer_export_privacy_case_supervisor_sla_cases(privacy_case_status, sla_breach_detected, legal_privacy_signoff_late);
