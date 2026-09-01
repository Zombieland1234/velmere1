-- PASS2377: Final delivery immutable receipt ledger.
-- Stores only redacted delivery receipts after final-delivery gate passes.
-- Never store raw Stripe payloads, raw webhook bodies, Stripe-Signature headers,
-- card data, BLIK codes, secrets, seed phrases, exploit instructions,
-- Certified Safe claims or investment advice in this table.
create table if not exists public.velmere_audit_delivery_receipts (
  id text primary key,
  receipt_id text unique not null,
  status text not null default 'delivered',
  locale text not null default 'en',
  delivered_at timestamptz not null,
  operator_id text not null default 'security-admin',
  message_id text,
  request_id text,
  audit_queue_id text,
  account_message_id text,
  account_id text,
  report_id text,
  customer_safe_report_status text,
  gate_snapshot jsonb not null default '{}'::jsonb,
  customer_safe_links jsonb not null default '{}'::jsonb,
  checksum text not null,
  safe_boundary text not null,
  record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint velmere_audit_delivery_receipts_status_check check (status in ('delivered','blocked','manual_review')),
  constraint velmere_audit_delivery_receipts_locale_check check (locale in ('pl','en','de'))
);

alter table public.velmere_audit_delivery_receipts enable row level security;
create index if not exists velmere_audit_delivery_receipts_message_idx on public.velmere_audit_delivery_receipts(message_id, delivered_at desc);
create index if not exists velmere_audit_delivery_receipts_request_idx on public.velmere_audit_delivery_receipts(request_id, delivered_at desc);
create index if not exists velmere_audit_delivery_receipts_audit_queue_idx on public.velmere_audit_delivery_receipts(audit_queue_id, delivered_at desc);
create index if not exists velmere_audit_delivery_receipts_account_message_idx on public.velmere_audit_delivery_receipts(account_message_id, delivered_at desc);
create index if not exists velmere_audit_delivery_receipts_account_idx on public.velmere_audit_delivery_receipts(account_id, delivered_at desc);
create index if not exists velmere_audit_delivery_receipts_status_idx on public.velmere_audit_delivery_receipts(status, delivered_at desc);
