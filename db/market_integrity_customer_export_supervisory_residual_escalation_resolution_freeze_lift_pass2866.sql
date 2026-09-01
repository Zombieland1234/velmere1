-- VELMERE PASS2866
-- Customer Export Supervisory Residual Escalation Resolution / Freeze-Lift Gate

create table if not exists market_integrity_customer_export_supervisory_residual_escalation_resolution_freeze_lifts (
  id text primary key,
  release_packet_id text not null,
  seal_id text not null,
  missed_sla_escalation_receipt_id text not null,
  escalation_resolution_case_id text not null,
  supervisor_resolution_decision_receipt_id text not null,
  supervisor_resolution_decision text not null check (supervisor_resolution_decision in ('continue_freeze','lift_freeze','partial_lift','reject_lift')),
  remediation_catchup_proof_receipt_id text not null,
  fresh_residual_rescan_run_id text not null,
  fresh_residual_rescan_manifest_hash text not null,
  residual_still_detected boolean not null default false,
  corrected_no_residual_attestation_receipt_id text,
  freeze_lift_decision_receipt_id text,
  freeze_lift_receipt_id text,
  freeze_lift_effective_at timestamptz,
  customer_resolution_notice_receipt_id text,
  regulator_resolution_notice_receipt_id text,
  auditor_resolution_notice_receipt_id text,
  internal_privacy_supervisor_notice_receipt_id text,
  override_used boolean not null default false,
  override_counter_sign_receipt_id text,
  override_reason_hash text,
  resolution_timeline_hash text not null,
  created_at timestamptz not null default now(),
  constraint pass2866_lift_requires_no_residual_and_attestation check (
    supervisor_resolution_decision not in ('lift_freeze','partial_lift') or (
      residual_still_detected = false and
      corrected_no_residual_attestation_receipt_id is not null and
      freeze_lift_decision_receipt_id is not null and
      freeze_lift_receipt_id is not null and
      freeze_lift_effective_at is not null
    )
  ),
  constraint pass2866_override_requires_counter_sign_and_reason check (
    override_used = false or (override_counter_sign_receipt_id is not null and override_reason_hash is not null)
  ),
  constraint pass2866_resolution_notices_or_suppression_required check (
    customer_resolution_notice_receipt_id is not null or
    regulator_resolution_notice_receipt_id is not null or
    auditor_resolution_notice_receipt_id is not null or
    internal_privacy_supervisor_notice_receipt_id is not null
  )
);

create index if not exists idx_pass2866_supervisory_residual_resolution_release_packet
  on market_integrity_customer_export_supervisory_residual_escalation_resolution_freeze_lifts (release_packet_id, seal_id);
