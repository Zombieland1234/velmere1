-- PASS2649: Account delivery refund/chargeback webhook replay fixture / entitlement revocation ledger adapter.
-- Stores customer-safe revocation receipts while keeping raw webhook/provider payloads out of public views.

create table if not exists public.audit_entitlement_revocation_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  report_id text not null,
  entitlement_id text not null,
  provider_event_hash text not null,
  reason_class text not null check (reason_class in ('refund', 'chargeback', 'entitlement_revoked')),
  receipt_hash text not null unique,
  previous_receipt_hash text,
  status text not null default 'revoked' check (status in ('revoked', 'blocked', 'ignored_duplicate', 'ignored_stale')),
  safe_pdf_locked boolean not null default true,
  duplicate_replay_denied boolean not null default true,
  stale_replay_denied boolean not null default true,
  public_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audit_entitlement_revocation_no_raw_payload check (
    public_payload::text !~* '(raw|secret|serviceRole|authorization|jwt|operator|webhookSigningSecret|stripeSignatureSecret)'
  )
);

alter table public.audit_entitlement_revocation_ledger enable row level security;

create unique index if not exists audit_entitlement_revocation_event_once
  on public.audit_entitlement_revocation_ledger (provider_event_hash, entitlement_id);

create index if not exists audit_entitlement_revocation_account_report_idx
  on public.audit_entitlement_revocation_ledger (account_id, report_id, created_at desc);

drop policy if exists audit_entitlement_revocation_deny_anon_write on public.audit_entitlement_revocation_ledger;
create policy audit_entitlement_revocation_deny_anon_write
  on public.audit_entitlement_revocation_ledger
  for insert
  to anon
  with check (false);

drop policy if exists audit_entitlement_revocation_deny_anon_update on public.audit_entitlement_revocation_ledger;
create policy audit_entitlement_revocation_deny_anon_update
  on public.audit_entitlement_revocation_ledger
  for update
  to anon
  using (false)
  with check (false);

drop policy if exists audit_entitlement_revocation_deny_anon_delete on public.audit_entitlement_revocation_ledger;
create policy audit_entitlement_revocation_deny_anon_delete
  on public.audit_entitlement_revocation_ledger
  for delete
  to anon
  using (false);

create or replace view public.audit_entitlement_revocation_public_receipts as
select
  receipt_hash,
  account_id,
  report_id,
  entitlement_id,
  reason_class,
  status,
  safe_pdf_locked,
  duplicate_replay_denied,
  stale_replay_denied,
  created_at
from public.audit_entitlement_revocation_ledger;

grant select on public.audit_entitlement_revocation_public_receipts to anon, authenticated;

drop policy if exists audit_entitlement_revocation_public_select on public.audit_entitlement_revocation_ledger;
create policy audit_entitlement_revocation_public_select
  on public.audit_entitlement_revocation_ledger
  for select
  to authenticated
  using (true);
