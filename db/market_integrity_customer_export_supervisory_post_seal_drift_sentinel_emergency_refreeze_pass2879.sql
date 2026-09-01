-- PASS2879 Customer Export Supervisory Post-Seal Drift Sentinel / Emergency Re-Freeze Gate
create table if not exists market_integrity_customer_export_supervisory_post_seal_drift_sentinel_emergency_refreezes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  final_channel_seal_id text not null,
  sentinel_receipt_id text not null,
  sentinel_window_started_at timestamptz not null,
  sentinel_window_ends_at timestamptz not null,
  sealed_channel_baseline_hash text not null,
  sealed_channel_heartbeat_schedule_receipt_id text not null,
  drift_scan_receipt_id text not null,
  drift_scan_hash text not null,
  reviewed_drift_signals jsonb not null default '[]'::jsonb,
  drift_budget_remaining integer not null default 0,
  sentinel_decision text not null check (sentinel_decision in ('remain_sealed_open','emergency_refreeze','reopen_supervisory_review','extend_sentinel_observation')),
  emergency_refreeze_receipt_id text,
  reopened_supervisory_review_ticket_id text,
  extended_sentinel_observation_receipt_id text,
  customer_anomaly_notice_receipt_id text not null,
  regulator_anomaly_notice_receipt_id text not null,
  auditor_anomaly_notice_receipt_id text not null,
  internal_incident_receipt_id text not null,
  legal_signoff_receipt_id text not null,
  security_signoff_receipt_id text not null,
  privacy_signoff_receipt_id text not null,
  post_seal_sentinel_payload_hash text not null,
  post_seal_sentinel_timeline_hash text not null,
  constraint pass2879_emergency_refreeze_requires_receipt check (sentinel_decision <> 'emergency_refreeze' or emergency_refreeze_receipt_id is not null),
  constraint pass2879_reopen_requires_ticket check (sentinel_decision <> 'reopen_supervisory_review' or reopened_supervisory_review_ticket_id is not null),
  constraint pass2879_extend_requires_receipt check (sentinel_decision <> 'extend_sentinel_observation' or extended_sentinel_observation_receipt_id is not null),
  constraint pass2879_remain_open_requires_zero_drift_budget check (sentinel_decision <> 'remain_sealed_open' or drift_budget_remaining >= 0)
);

create index if not exists idx_pass2879_post_seal_sentinel_final_channel_seal_id
  on market_integrity_customer_export_supervisory_post_seal_drift_sentinel_emergency_refreezes(final_channel_seal_id);
