-- PASS2624: Supabase / RLS account delivery production lock.
-- Production account delivery fails closed without durable Supabase storage.
-- Do not store raw Stripe payloads, raw webhook bodies, raw download tokens,
-- service role keys, card data, BLIK codes, secrets, seed phrases, exploit steps,
-- Certified Safe claims, investment advice, operator notes or unredacted PII here.

alter table public.velmere_audit_account_messages enable row level security;
alter table public.velmere_audit_delivery_receipts enable row level security;

create table if not exists public.velmere_audit_report_access_tokens (
  id text primary key,
  token_hash text unique not null,
  state text not null default 'issued',
  scope text not null default 'pro_pdf_download',
  account_id text not null,
  report_id text not null,
  entitlement_id text not null,
  report_version_hash text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  consumed_by_receipt_id text,
  safe_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_audit_report_access_tokens_state_check check (state in ('issued','consumed','expired','revoked')),
  constraint velmere_audit_report_access_tokens_scope_check check (scope in ('pro_pdf_download','advanced_private_delivery','customer_report_view'))
);

alter table public.velmere_audit_report_access_tokens enable row level security;
create index if not exists velmere_audit_report_access_tokens_account_idx on public.velmere_audit_report_access_tokens(account_id, issued_at desc);
create index if not exists velmere_audit_report_access_tokens_report_idx on public.velmere_audit_report_access_tokens(report_id, issued_at desc);
create index if not exists velmere_audit_report_access_tokens_entitlement_idx on public.velmere_audit_report_access_tokens(entitlement_id, issued_at desc);
create index if not exists velmere_audit_report_access_tokens_state_idx on public.velmere_audit_report_access_tokens(state, expires_at desc);

alter table public.velmere_audit_delivery_receipts add column if not exists report_version_hash text;
alter table public.velmere_audit_delivery_receipts add column if not exists entitlement_id text;
alter table public.velmere_audit_delivery_receipts add column if not exists download_token_consumed_at timestamptz;
create index if not exists velmere_audit_delivery_receipts_entitlement_idx on public.velmere_audit_delivery_receipts(entitlement_id, delivered_at desc);
create index if not exists velmere_audit_delivery_receipts_version_idx on public.velmere_audit_delivery_receipts(report_version_hash, delivered_at desc);

-- Account owner select policy. Service-role writes stay server-only.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_account_messages' and policyname = 'velmere_audit_account_messages_owner_select') then
    create policy velmere_audit_account_messages_owner_select
      on public.velmere_audit_account_messages
      for select
      using (
        account_id = coalesce(auth.jwt() ->> 'velmere_account_id', auth.uid()::text)
        or contact_email = lower(coalesce(auth.jwt() ->> 'email', ''))
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_delivery_receipts' and policyname = 'velmere_audit_delivery_receipts_owner_select') then
    create policy velmere_audit_delivery_receipts_owner_select
      on public.velmere_audit_delivery_receipts
      for select
      using (account_id = coalesce(auth.jwt() ->> 'velmere_account_id', auth.uid()::text));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_report_access_tokens' and policyname = 'velmere_audit_report_access_tokens_owner_select_redacted') then
    create policy velmere_audit_report_access_tokens_owner_select_redacted
      on public.velmere_audit_report_access_tokens
      for select
      using (account_id = coalesce(auth.jwt() ->> 'velmere_account_id', auth.uid()::text));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_report_access_tokens' and policyname = 'velmere_audit_report_access_tokens_service_role_all') then
    create policy velmere_audit_report_access_tokens_service_role_all
      on public.velmere_audit_report_access_tokens
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
