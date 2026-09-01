-- PASS2878 Customer Export Supervisory Post-Release Observation Close / Final Channel Seal Gate
create table if not exists market_integrity_customer_export_supervisory_post_release_observation_close_final_channel_seals (
  id uuid primary key default gen_random_uuid(),
  report_id text not null,
  previous_post_release_channel_payload_hash text not null,
  observation_close_receipt_id text not null,
  observation_window_closed_at timestamptz not null,
  heartbeat_rollup_receipt_id text not null,
  heartbeat_rollup_hash text not null,
  drift_probe_rollup_receipt_id text not null,
  drift_probe_rollup_hash text not null,
  final_channel_seal_receipt_id text,
  final_channel_seal_hash text,
  rollback_plan_retention_lock_receipt_id text not null,
  rollback_plan_retention_hash text not null,
  final_release_dashboard_snapshot_id text not null,
  final_release_dashboard_snapshot_hash text not null,
  observation_close_decision text not null check (observation_close_decision in ('seal_channels_open','rollback_to_freeze','extend_observation','reopen_release_review')),
  rollback_to_freeze_receipt_id text,
  extended_observation_receipt_id text,
  reopened_release_review_ticket_id text,
  customer_final_observation_notice_receipt_id text not null,
  regulator_final_observation_notice_receipt_id text not null,
  auditor_final_observation_notice_receipt_id text not null,
  legal_signoff_receipt_id text not null,
  security_signoff_receipt_id text not null,
  privacy_signoff_receipt_id text not null,
  final_channel_seal_payload_hash text not null,
  final_channel_seal_timeline_hash text not null,
  created_at timestamptz not null default now(),
  constraint pass2878_seal_decision_requires_final_seal check (
    observation_close_decision <> 'seal_channels_open' or (final_channel_seal_receipt_id is not null and final_channel_seal_hash is not null)
  ),
  constraint pass2878_rollback_requires_receipt check (
    observation_close_decision <> 'rollback_to_freeze' or rollback_to_freeze_receipt_id is not null
  ),
  constraint pass2878_extend_requires_receipt check (
    observation_close_decision <> 'extend_observation' or extended_observation_receipt_id is not null
  ),
  constraint pass2878_reopen_requires_ticket check (
    observation_close_decision <> 'reopen_release_review' or reopened_release_review_ticket_id is not null
  )
);

comment on table market_integrity_customer_export_supervisory_post_release_observation_close_final_channel_seals is
  'PASS2878: final channel seal requires explicit observation close, clean heartbeat/probe rollups, retention lock, notices, signoffs and immutable payload/timeline hashes.';
