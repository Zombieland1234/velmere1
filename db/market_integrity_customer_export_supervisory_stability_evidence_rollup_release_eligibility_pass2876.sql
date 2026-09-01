-- PASS2876 — Customer Export Supervisory Stability Evidence Rollup / Release Eligibility Gate
-- Purpose: require a stability evidence rollup and operator dashboard packet before archive/export/delivery channels are released after PASS2875.

create table if not exists market_integrity_customer_export_supervisory_stability_evidence_rollup_release_eligibilities (
  id uuid primary key default gen_random_uuid(),
  stability_evidence_rollup_id text not null,
  stability_evidence_rollup_version text not null,
  stability_evidence_rollup_hash text not null,
  operator_dashboard_card_id text not null,
  operator_dashboard_snapshot_hash text not null,
  drift_budget_burndown_hash text not null,
  stability_slo_breach_card_id text,
  final_stability_window_hours integer not null check (final_stability_window_hours > 0),
  zero_regression_attestation_receipt_id text not null,
  release_eligibility_assessment_receipt_id text not null,
  release_eligibility_decision text not null check (release_eligibility_decision in ('release_archive_export_channels','extend_stability_watch','downgrade_to_permanent_freeze','reopen_supervisory_investigation')),
  archive_channel_release_receipt_id text,
  export_channel_release_receipt_id text,
  delivery_channel_release_receipt_id text,
  extended_watch_receipt_id text,
  permanent_freeze_receipt_id text,
  reopened_supervisory_investigation_ticket_id text,
  customer_notice_receipt_id text not null,
  regulator_notice_receipt_id text not null,
  auditor_notice_receipt_id text not null,
  legal_signoff_receipt_id text not null,
  security_signoff_receipt_id text not null,
  privacy_signoff_receipt_id text not null,
  release_eligibility_payload_hash text not null,
  release_eligibility_timeline_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pass2876_stability_rollup_release_eligibility
  on market_integrity_customer_export_supervisory_stability_evidence_rollup_release_eligibilities (stability_evidence_rollup_id, stability_evidence_rollup_hash);

alter table market_integrity_customer_export_supervisory_stability_evidence_rollup_release_eligibilities
  add constraint pass2876_release_requires_channel_receipts
  check (release_eligibility_decision <> 'release_archive_export_channels' or (archive_channel_release_receipt_id is not null and export_channel_release_receipt_id is not null and delivery_channel_release_receipt_id is not null));

alter table market_integrity_customer_export_supervisory_stability_evidence_rollup_release_eligibilities
  add constraint pass2876_extend_watch_requires_receipt
  check (release_eligibility_decision <> 'extend_stability_watch' or extended_watch_receipt_id is not null);

alter table market_integrity_customer_export_supervisory_stability_evidence_rollup_release_eligibilities
  add constraint pass2876_permanent_freeze_requires_receipt
  check (release_eligibility_decision <> 'downgrade_to_permanent_freeze' or permanent_freeze_receipt_id is not null);

alter table market_integrity_customer_export_supervisory_stability_evidence_rollup_release_eligibilities
  add constraint pass2876_reopen_requires_investigation_ticket
  check (release_eligibility_decision <> 'reopen_supervisory_investigation' or reopened_supervisory_investigation_ticket_id is not null);
