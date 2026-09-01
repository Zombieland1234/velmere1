-- PASS2841 Customer Export Acknowledgement + Signed Receipt Gate
-- Purpose: durable, append-only customer acknowledgement receipts for account download,
-- email notice, API handoff and support attachment export delivery.
-- This is a schema plan / contract. It does not claim a live migration was applied.

create table if not exists market_integrity_customer_export_ack_signed_receipts (
  id uuid primary key default gen_random_uuid(),
  export_ledger_row_id uuid not null,
  export_packet_id text not null,
  payload_hash text not null,
  source_receipt_root text not null,
  acknowledgement_channel text not null check (acknowledgement_channel in ('customer_portal','account_vault','email_notice','api_handoff','support_attachment')),
  acknowledgement_terms_version text not null default 'customer_export_ack_terms_v1',
  customer_account_hash text not null,
  customer_ack_receipt_id text not null unique,
  signed_receipt_id text not null unique,
  signature_hash text not null,
  signer_nonce_hash text not null,
  signature_verified boolean not null default false,
  operator_countersignature_id text,
  notification_open_receipt_id text,
  acknowledgement_ip_hash text,
  user_agent_hash text,
  acknowledged_at timestamptz,
  acknowledgement_expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_receipt_id text,
  disputed_at timestamptz,
  dispute_receipt_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_export_ack_not_expired_before_created check (acknowledgement_expires_at > created_at),
  constraint customer_export_ack_signed_when_verified check (signature_verified = false or (signature_hash is not null and signer_nonce_hash is not null and signed_receipt_id is not null))
);

create index if not exists idx_customer_export_ack_packet_hash
  on market_integrity_customer_export_ack_signed_receipts (export_packet_id, payload_hash, source_receipt_root);

create index if not exists idx_customer_export_ack_channel_state
  on market_integrity_customer_export_ack_signed_receipts (acknowledgement_channel, signature_verified, revoked_at, disputed_at, acknowledgement_expires_at);

create table if not exists market_integrity_customer_export_ack_signed_receipt_events (
  id uuid primary key default gen_random_uuid(),
  acknowledgement_receipt_id text not null references market_integrity_customer_export_ack_signed_receipts(customer_ack_receipt_id),
  event_type text not null check (event_type in ('created','signed','verified','resent','expired','revoked','disputed','support_reviewed')),
  event_receipt_id text not null unique,
  event_payload_hash text not null,
  event_source_receipt_root text not null,
  actor_type text not null check (actor_type in ('customer','system','support','operator')),
  actor_hash text,
  created_at timestamptz not null default now()
);

alter table market_integrity_customer_export_ack_signed_receipts enable row level security;
alter table market_integrity_customer_export_ack_signed_receipt_events enable row level security;

-- Suggested policies for production implementation:
-- 1. Customers may read only acknowledgement receipts where customer_account_hash matches their account identity hash.
-- 2. Customers may append acknowledgement events only through a server RPC that validates nonce/signature.
-- 3. Support/operators may read redacted rows and append revocation/dispute events; they may not update old rows in place.
-- 4. Final export delivery queries must require signature_verified=true, revoked_at is null, disputed_at is null and acknowledgement_expires_at > now().
