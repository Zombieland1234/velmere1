-- PASS2645 Safe PDF download token consumption ledger / RLS gate
-- Stores only hashed, customer-safe identifiers. Never store raw one-time token material.

create table if not exists public.audit_safe_pdf_download_token_consumption_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  account_id uuid,
  audit_report_id text not null,
  customer_safe_receipt_hash text not null,
  safe_pdf_token_hash text not null,
  token_status text not null check (token_status in ('issued','consumed','expired','revoked','replay_denied')),
  issued_at timestamptz not null default now(),
  consumed_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason text,
  first_consumption_receipt_hash text,
  replay_denied_receipt_hash text,
  release_board_receipt_hash text not null,
  source_pass_id text not null default 'pass2645-safe-pdf-download-token-storage-adapter-supabase-consumption-ledger-rls-gate',
  public_receipt_hash text not null,
  constraint audit_safe_pdf_token_no_plaintext check (safe_pdf_token_hash !~* '^(sk_|pk_|tok_|secret|raw|plain|bearer)'),
  constraint audit_safe_pdf_token_hash_present check (char_length(safe_pdf_token_hash) >= 16),
  constraint audit_safe_pdf_receipt_hash_present check (char_length(customer_safe_receipt_hash) >= 16)
);

create unique index if not exists audit_safe_pdf_download_token_once_idx
  on public.audit_safe_pdf_download_token_consumption_ledger (customer_safe_receipt_hash, safe_pdf_token_hash)
  where token_status in ('issued','consumed');

create index if not exists audit_safe_pdf_download_token_public_receipt_idx
  on public.audit_safe_pdf_download_token_consumption_ledger (public_receipt_hash, token_status, created_at desc);

alter table public.audit_safe_pdf_download_token_consumption_ledger enable row level security;

-- Deny by default: no anon/authenticated direct insert/select/update/delete.
drop policy if exists audit_safe_pdf_download_token_anon_insert_deny on public.audit_safe_pdf_download_token_consumption_ledger;
create policy audit_safe_pdf_download_token_anon_insert_deny
  on public.audit_safe_pdf_download_token_consumption_ledger
  for insert
  to anon, authenticated
  with check (false);

drop policy if exists audit_safe_pdf_download_token_anon_select_deny on public.audit_safe_pdf_download_token_consumption_ledger;
create policy audit_safe_pdf_download_token_anon_select_deny
  on public.audit_safe_pdf_download_token_consumption_ledger
  for select
  to anon, authenticated
  using (false);

drop policy if exists audit_safe_pdf_download_token_anon_update_deny on public.audit_safe_pdf_download_token_consumption_ledger;
create policy audit_safe_pdf_download_token_anon_update_deny
  on public.audit_safe_pdf_download_token_consumption_ledger
  for update
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists audit_safe_pdf_download_token_anon_delete_deny on public.audit_safe_pdf_download_token_consumption_ledger;
create policy audit_safe_pdf_download_token_anon_delete_deny
  on public.audit_safe_pdf_download_token_consumption_ledger
  for delete
  to anon, authenticated
  using (false);

create or replace view public.audit_safe_pdf_download_token_public_receipts as
select
  public_receipt_hash,
  customer_safe_receipt_hash,
  release_board_receipt_hash,
  token_status,
  case when consumed_at is not null then true else false end as consumed,
  case when revoked_at is not null then true else false end as revoked,
  expires_at,
  created_at,
  source_pass_id
from public.audit_safe_pdf_download_token_consumption_ledger;

comment on table public.audit_safe_pdf_download_token_consumption_ledger is
  'PASS2645: hashed Safe PDF one-time token consumption ledger. No raw token, PDF bytes, service role traces or operator notes.';

comment on view public.audit_safe_pdf_download_token_public_receipts is
  'PASS2645 public-safe receipt view for account delivery and Pro PDF appendix; excludes raw token material and private ledger pointers.';
