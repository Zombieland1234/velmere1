-- PASS4788 repair: durable audit account-message base table.
-- The canonical schema contained this table, but the ordered Supabase migration chain
-- previously attempted to ALTER it in PASS2366 without ever creating it.
-- Customer-safe report payloads only; no raw payment payloads, card data, provider secrets or auth tokens.

create table if not exists public.velmere_audit_account_messages (
  id text primary key,
  message_id text unique not null,
  request_id text not null,
  account_id text not null default 'preview:local-member-preview',
  contact_email text,
  locale text not null default 'en',
  review_level text,
  project_name text,
  contract_address text,
  package_label text not null,
  message_status text not null default 'queued',
  delivery_channel text not null default 'account',
  delivery_status text not null default 'delivered_to_account',
  operator_status text not null default 'intake',
  operator_note text,
  pdf_route text,
  customer_safe_report jsonb not null default '{}'::jsonb,
  action_log jsonb not null default '[]'::jsonb,
  delivered_at timestamptz,
  public_report_route text,
  admin_route text,
  export_route text,
  message jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_audit_account_messages_locale_check check (locale in ('pl','en','de')),
  constraint velmere_audit_account_messages_delivery_channel_check check (delivery_channel in ('account','account_and_email_pending')),
  constraint velmere_audit_account_messages_delivery_status_check check (delivery_status in ('queued','delivered_to_account','waiting_payment','human_review_queue','ready_for_download')),
  constraint velmere_audit_account_messages_operator_status_check check (operator_status in ('intake','human_review','needs_evidence','pdf_attached','customer_safe_ready','delivered','blocked_redaction'))
);

alter table public.velmere_audit_account_messages enable row level security;

create index if not exists velmere_audit_account_messages_account_idx
  on public.velmere_audit_account_messages(account_id, created_at desc);
create index if not exists velmere_audit_account_messages_contact_idx
  on public.velmere_audit_account_messages(contact_email, created_at desc);
create index if not exists velmere_audit_account_messages_request_idx
  on public.velmere_audit_account_messages(request_id);
create index if not exists velmere_audit_account_messages_delivery_idx
  on public.velmere_audit_account_messages(delivery_status, updated_at desc);
create index if not exists velmere_audit_account_messages_operator_status_idx
  on public.velmere_audit_account_messages(operator_status, updated_at desc);

revoke all on table public.velmere_audit_account_messages from anon;
revoke all on table public.velmere_audit_account_messages from authenticated;
grant select, insert, update, delete on table public.velmere_audit_account_messages to service_role;

comment on table public.velmere_audit_account_messages is
  'Customer-safe audit delivery ledger. Direct client table access is revoked; API/service-role access only.';
