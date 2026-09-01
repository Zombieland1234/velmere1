-- PASS4435 audit-watch durable receipt RLS write executor contract.
-- This is a migration contract prepared for live Supabase execution; it is not proof that the migration was applied.

create table if not exists public.audit_watch_receipts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  audit_queue_id text not null,
  receipt_manifest_digest text not null,
  entitlement_context_hash text not null,
  public_safe_projection_digest text not null,
  receipt_kind text not null check (receipt_kind in ('signed_stripe_replay','pdf_parity','entitlement_ledger','hosted_smoke','appsec_zero_skip','rls_write_executor')),
  created_at timestamptz not null default now(),
  previous_manifest_digest text,
  operator_context jsonb not null default '{}'::jsonb,
  customer_safe_projection jsonb not null default '{}'::jsonb,
  raw_provider_payload jsonb,
  raw_stripe_payload jsonb,
  secret_material text,
  debug_payload jsonb,
  constraint audit_watch_receipts_no_raw_payloads check (raw_provider_payload is null and raw_stripe_payload is null and secret_material is null and debug_payload is null)
);

create table if not exists public.audit_watch_receipt_manifest_chain (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  audit_queue_id text not null,
  manifest_digest text not null,
  previous_manifest_digest text,
  chain_head boolean not null default true,
  created_at timestamptz not null default now(),
  customer_safe_projection jsonb not null default '{}'::jsonb
);

alter table public.audit_watch_receipts enable row level security;
alter table public.audit_watch_receipt_manifest_chain enable row level security;

-- Service role inserts only; client mutations stay denied by absence of insert/update/delete client policies.
drop policy if exists audit_watch_receipts_select_own_account on public.audit_watch_receipts;
create policy audit_watch_receipts_select_own_account
  on public.audit_watch_receipts
  for select
  using (auth.uid() = account_id);

drop policy if exists audit_watch_receipt_manifest_chain_select_own_account on public.audit_watch_receipt_manifest_chain;
create policy audit_watch_receipt_manifest_chain_select_own_account
  on public.audit_watch_receipt_manifest_chain
  for select
  using (auth.uid() = account_id);

-- PASS4435 executor expectations:
-- 1. service_role_insert_executor writes sanitized receipt rows only.
-- 2. account_scoped_select_executor can select own account rows only.
-- 3. cross_account_select_negative_executor must return zero rows / denied.
-- 4. update_mutation_negative_executor and delete_mutation_negative_executor must fail closed.
-- 5. release_board_projection_executor_guard remains blocked until signed Stripe replay, PDF parity, hosted smoke and appsec receipts exist.
