-- PASS2855 — Customer Export DSAR Delivery / Appeal Reopen Gate
-- Contract-only schema plan. It documents the production tables required before Velmère can claim
-- DSAR/export-of-export packets are delivered, acknowledged, appeal-windowed and safely reopened.

create table if not exists market_integrity_customer_export_dsr_delivery_appeals (
  id text primary key,
  release_packet_id text not null,
  seal_id text not null,
  dsr_delivery_receipt_id text not null,
  customer_acknowledgement_receipt_id text not null,
  appeal_window_receipt_id text not null,
  customer_appeal_requested boolean not null default false,
  appeal_review_receipt_id text,
  appeal_reopen_decision_receipt_id text,
  appeal_reopen_freeze_receipt_id text,
  reopened_dsr_packet_id text,
  reopened_dsr_redaction_manifest_hash text,
  duplicate_delivery_guard_receipt_id text not null,
  customer_privacy_case_timeline_hash text not null,
  readiness_state text not null,
  readiness_score numeric(5,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists market_integrity_customer_export_dsr_channel_delivery_receipts (
  id text primary key,
  dsr_delivery_appeal_id text not null references market_integrity_customer_export_dsr_delivery_appeals(id),
  channel text not null check (channel in ('account_vault','email','api','support','customer_portal')),
  delivery_receipt_id text not null,
  payload_hash text not null,
  redaction_manifest_hash text not null,
  delivered_at timestamptz not null,
  acknowledged boolean not null default false,
  reopened_after_appeal boolean not null default false,
  unique (dsr_delivery_appeal_id, channel, delivery_receipt_id)
);

create index if not exists idx_customer_export_dsr_delivery_appeals_release_packet
  on market_integrity_customer_export_dsr_delivery_appeals(release_packet_id);

create index if not exists idx_customer_export_dsr_channel_delivery_receipts_appeal
  on market_integrity_customer_export_dsr_channel_delivery_receipts(dsr_delivery_appeal_id);
