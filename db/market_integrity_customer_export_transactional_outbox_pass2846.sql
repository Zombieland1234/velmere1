-- PASS2846 customer export transactional outbox / health contract
-- Purpose: durable customer export delivery jobs with lease locks, commit receipts, dead-letter recovery and health probes.

create table if not exists market_integrity_customer_export_outbox (
  id text primary key,
  export_packet_id text not null,
  channel text not null check (channel in ('account_vault', 'email', 'api', 'support')),
  status text not null check (status in ('pending', 'leased', 'committed', 'retry_scheduled', 'dead_lettered', 'poison_blocked')),
  idempotency_key text not null,
  payload_hash text not null,
  source_receipt_root text not null,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  lease_id text,
  lease_owner text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  channel_commit_receipt_id text,
  dead_letter_reason text,
  poison_message_policy_id text,
  worker_heartbeat_receipt_id text,
  health_probe_receipt_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  committed_at timestamptz,
  unique (export_packet_id, channel, idempotency_key)
);

create index if not exists market_integrity_customer_export_outbox_pending_idx
  on market_integrity_customer_export_outbox (status, next_attempt_at, lease_expires_at);

create table if not exists market_integrity_customer_export_outbox_health_checks (
  id text primary key,
  outbox_table_id text not null,
  worker_id text not null,
  heartbeat_receipt_id text not null,
  health_probe_receipt_id text not null,
  pending_count integer not null default 0,
  leased_count integer not null default 0,
  dead_letter_count integer not null default 0,
  oldest_pending_age_seconds integer not null default 0,
  payload_hash_sample text,
  source_receipt_root_sample text,
  checked_at timestamptz not null default now()
);

comment on table market_integrity_customer_export_outbox is
  'PASS2846 transactional outbox contract: delivery jobs are leased, committed, retried or dead-lettered with payloadHash/sourceReceiptRoot binding.';
comment on table market_integrity_customer_export_outbox_health_checks is
  'PASS2846 outbox health probe contract: heartbeat and queue health receipts before customer-safe delivery claims.';
