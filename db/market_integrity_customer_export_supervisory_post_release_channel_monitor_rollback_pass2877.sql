-- PASS2877 Customer Export Supervisory Post-Release Channel Monitor / Rollback Gate
-- Deterministic schema contract. Production migration must add RLS, actor attribution and immutable append-only storage.

create table if not exists market_integrity_customer_export_supervisory_post_release_channel_monitor_rollbacks (
  id uuid primary key default gen_random_uuid(),
  release_packet_id text not null,
  previous_release_eligibility_payload_hash text not null,
  previous_release_eligibility_timeline_hash text not null,
  release_execution_receipt_id text not null,
  release_execution_runbook_hash text not null,
  archive_channel_unlock_receipt_id text not null,
  export_channel_unlock_receipt_id text not null,
  delivery_channel_unlock_receipt_id text not null,
  post_release_monitor_receipt_id text not null,
  channel_heartbeat_receipt_id text not null,
  release_observation_window_hours integer not null check (release_observation_window_hours > 0),
  rollback_plan_id text not null,
  rollback_plan_hash text not null,
  late_drift_probe_receipt_id text not null,
  late_drift_probe_hash text not null,
  release_dashboard_card_id text not null,
  post_release_channel_decision text not null check (
    post_release_channel_decision in ('channels_remain_open_under_monitor','rollback_to_freeze','extend_release_observation','reopen_release_review')
  ),
  rollback_to_freeze_receipt_id text,
  extended_observation_receipt_id text,
  reopened_release_review_ticket_id text,
  customer_correction_notice_receipt_id text not null,
  regulator_correction_notice_receipt_id text not null,
  auditor_correction_notice_receipt_id text not null,
  legal_signoff_receipt_id text not null,
  security_signoff_receipt_id text not null,
  privacy_signoff_receipt_id text not null,
  post_release_channel_payload_hash text not null,
  post_release_channel_timeline_hash text not null,
  created_at timestamptz not null default now(),
  constraint pass2877_rollback_requires_receipt check (post_release_channel_decision <> 'rollback_to_freeze' or rollback_to_freeze_receipt_id is not null),
  constraint pass2877_extend_requires_receipt check (post_release_channel_decision <> 'extend_release_observation' or extended_observation_receipt_id is not null),
  constraint pass2877_reopen_requires_ticket check (post_release_channel_decision <> 'reopen_release_review' or reopened_release_review_ticket_id is not null),
  constraint pass2877_unlock_requires_monitor_and_rollback_plan check (
    archive_channel_unlock_receipt_id <> '' and export_channel_unlock_receipt_id <> '' and delivery_channel_unlock_receipt_id <> ''
    and post_release_monitor_receipt_id <> '' and channel_heartbeat_receipt_id <> '' and rollback_plan_hash <> ''
  )
);

create index if not exists idx_pass2877_post_release_channel_monitor_rollbacks_packet
  on market_integrity_customer_export_supervisory_post_release_channel_monitor_rollbacks (release_packet_id, created_at desc);
