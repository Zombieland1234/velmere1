-- PASS2845 Customer Export Runtime Adapter Stub Gate
-- Purpose: durable contract placeholder for customer-export runtime events.
-- This file is intentionally schema-only: no secrets, credentials, provider URLs or production connection strings.

create table if not exists market_integrity_customer_export_runtime_events (
  id bigserial primary key,
  event_id text not null unique,
  event_kind text not null check (event_kind in (
    'export_issued',
    'download_attempted',
    'email_notice_sent',
    'api_handoff_sent',
    'support_attachment_created',
    'recall_requested',
    'recall_completed',
    'reissue_requested',
    'retry_incremented',
    'acknowledgement_verified',
    'hold_opened',
    'hold_released',
    'operator_reinstated',
    'post_reinstatement_notification_written',
    'retention_dry_run'
  )),
  customer_export_packet_id text not null,
  channel text not null check (channel in ('account_vault', 'email', 'api', 'support', 'multi_channel')),
  payload_hash text not null,
  source_receipt_root text not null,
  idempotency_key text not null,
  previous_event_id text,
  operator_receipt_id text,
  customer_ack_receipt_id text,
  hold_release_receipt_id text,
  reinstatement_receipt_id text,
  notification_receipt_id text,
  retention_snapshot_id text,
  created_at timestamptz not null default now(),
  unique (customer_export_packet_id, event_kind, idempotency_key)
);

create table if not exists market_integrity_customer_export_retry_counters (
  customer_export_packet_id text primary key,
  retry_count integer not null default 0 check (retry_count >= 0),
  last_idempotency_key text not null,
  payload_hash text not null,
  source_receipt_root text not null,
  updated_at timestamptz not null default now()
);

-- Production implementation note:
-- retry increments must be atomic, transaction-bound, idempotency-keyed and linked to an append-only retry_incremented event.
