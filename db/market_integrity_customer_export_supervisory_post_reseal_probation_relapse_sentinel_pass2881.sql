-- PASS2881: Customer Export Supervisory Post-Reseal Probation / Relapse Sentinel Gate
create table if not exists market_integrity_customer_export_supervisory_post_reseal_probation_relapse_sentinels (
  id uuid primary key default gen_random_uuid(),
  release_packet_id text not null,
  previous_pass2880_resolution_case_id text not null,
  post_reseal_probation_case_id text not null,
  post_reseal_probation_owner_id text not null,
  post_reseal_probation_sla_receipt_id text not null,
  probation_window_started_at timestamptz not null,
  probation_window_ends_at timestamptz not null,
  resealed_channel_baseline_hash text not null,
  probation_heartbeat_receipt_id text not null,
  probation_heartbeat_schedule_hash text not null,
  relapse_scan_receipt_id text not null,
  relapse_scan_hash text not null,
  reviewed_relapse_signals jsonb not null default '[]'::jsonb,
  relapse_budget_remaining integer not null default 0,
  probation_decision text not null check (probation_decision in ('restore_trust_after_probation','emergency_refreeze_on_relapse','extend_probation','reopen_supervisory_investigation')),
  trust_restore_receipt_id text,
  trust_restore_hash text,
  emergency_refreeze_receipt_id text,
  extended_probation_receipt_id text,
  reopened_supervisory_investigation_ticket_id text,
  customer_probation_notice_receipt_id text not null,
  regulator_probation_notice_receipt_id text not null,
  auditor_probation_notice_receipt_id text not null,
  internal_probation_notice_receipt_id text not null,
  legal_signoff_receipt_id text not null,
  security_signoff_receipt_id text not null,
  privacy_signoff_receipt_id text not null,
  post_reseal_probation_payload_hash text not null,
  post_reseal_probation_timeline_hash text not null,
  created_at timestamptz not null default now(),
  constraint pass2881_probation_window_order check (probation_window_ends_at > probation_window_started_at),
  constraint pass2881_trust_restore_requires_receipts check (probation_decision <> 'restore_trust_after_probation' or (trust_restore_receipt_id is not null and trust_restore_hash is not null and relapse_budget_remaining >= 0)),
  constraint pass2881_emergency_refreeze_requires_receipt check (probation_decision <> 'emergency_refreeze_on_relapse' or emergency_refreeze_receipt_id is not null),
  constraint pass2881_extend_probation_requires_receipt check (probation_decision <> 'extend_probation' or extended_probation_receipt_id is not null),
  constraint pass2881_reopen_requires_ticket check (probation_decision <> 'reopen_supervisory_investigation' or reopened_supervisory_investigation_ticket_id is not null)
);

create index if not exists idx_pass2881_post_reseal_probation_release_packet
  on market_integrity_customer_export_supervisory_post_reseal_probation_relapse_sentinels (release_packet_id);

create index if not exists idx_pass2881_post_reseal_probation_case
  on market_integrity_customer_export_supervisory_post_reseal_probation_relapse_sentinels (post_reseal_probation_case_id);
