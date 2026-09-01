-- PASS2840 Customer Export Delivery Ledger Persistence Plan
-- Purpose: make PASS2838 redacted packets + PASS2839 expiry/recall durable before customer download/email/API/support handoff.

create table if not exists market_integrity_customer_export_delivery_ledger (
  export_ledger_row_id text primary key,
  export_packet_id text not null,
  active_link_id text not null,
  account_id_redacted text,
  payload_hash text not null,
  source_receipt_root text not null,
  support_sla_ticket_id text,
  row_schema_version text not null default 'customer_export_delivery_ledger_v1',
  status text not null check (status in ('pending', 'active', 'expired', 'recalled', 'retention_closed', 'blocked')),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  recall_receipt_id text,
  resend_idempotency_key text,
  retry_budget_limit integer not null default 3 check (retry_budget_limit >= 0),
  retry_budget_used integer not null default 0 check (retry_budget_used >= 0 and retry_budget_used <= retry_budget_limit),
  support_attachment_retention_hours integer not null default 72 check (support_attachment_retention_hours >= 0),
  audit_timeline_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists market_integrity_customer_export_delivery_events (
  export_event_id text primary key,
  export_ledger_row_id text not null references market_integrity_customer_export_delivery_ledger(export_ledger_row_id),
  channel text not null check (channel in ('account_vault', 'email_notice', 'api_handoff', 'support_attachment', 'recall', 'reissue', 'retention_job')),
  event_type text not null check (event_type in ('issued', 'served', 'resent', 'recalled', 'reissued', 'expired', 'retention_closed', 'blocked')),
  idempotency_key text,
  payload_hash text not null,
  source_receipt_root text not null,
  occurred_at timestamptz not null default now()
);

create unique index if not exists market_integrity_customer_export_active_link_unique
  on market_integrity_customer_export_delivery_ledger(active_link_id);

create unique index if not exists market_integrity_customer_export_resend_idempotency_unique
  on market_integrity_customer_export_delivery_events(idempotency_key)
  where idempotency_key is not null;

create index if not exists market_integrity_customer_export_packet_status_idx
  on market_integrity_customer_export_delivery_ledger(export_packet_id, status, expires_at);

-- Operator rule: never update recalled rows back to active. Reissue creates a new row and appends a reissue event.
-- Runtime rule: retry_budget_used increments must be atomic in the storage adapter transaction.
-- Retention rule: support_attachment channel requires a retention_job event before launch/customer-safe delivery claims.
