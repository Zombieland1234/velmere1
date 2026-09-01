-- PASS2847 Customer Export Worker Replay / Dead-Letter Recovery Gate
-- Contract only: this migration plan documents the durable replay/recovery records Velmere must deploy before claiming production recovery.

create table if not exists market_integrity_customer_export_replay_recoveries (
  id text primary key,
  export_packet_id text not null,
  original_outbox_event_id text not null,
  dead_letter_recovery_receipt_id text not null,
  poison_message_operator_review_receipt_id text not null,
  replay_from_outbox_idempotency_key text not null unique,
  account_vault_replay_commit_receipt_id text,
  email_replay_commit_receipt_id text,
  api_replay_commit_receipt_id text,
  support_replay_commit_receipt_id text,
  stuck_lease_unlock_policy_id text not null,
  stuck_lease_unlock_receipt_id text not null,
  worker_lag_slo_policy_id text not null,
  max_worker_lag_seconds integer not null,
  payload_hash text not null,
  source_receipt_root text not null,
  recovery_audit_timeline_hash text not null,
  recovery_state text not null check (recovery_state in ('prepared','review_required','replayed','blocked','drift_frozen')),
  recovered_by_operator_id_hash text,
  created_at timestamptz not null default now(),
  recovered_at timestamptz
);

create index if not exists idx_customer_export_replay_recoveries_packet
  on market_integrity_customer_export_replay_recoveries(export_packet_id);

create index if not exists idx_customer_export_replay_recoveries_outbox_event
  on market_integrity_customer_export_replay_recoveries(original_outbox_event_id);

create table if not exists market_integrity_customer_export_stuck_lease_unlocks (
  id text primary key,
  outbox_event_id text not null,
  lease_id text not null,
  unlock_policy_id text not null,
  unlock_receipt_id text not null,
  worker_lag_slo_policy_id text not null,
  observed_lag_seconds integer not null,
  unlocked_by_operator_id_hash text not null,
  payload_hash text not null,
  source_receipt_root text not null,
  created_at timestamptz not null default now()
);
