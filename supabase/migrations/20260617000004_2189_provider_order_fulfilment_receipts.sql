-- PASS2189 — Provider / order fulfilment truth runtime receipt vault
-- Stores redacted proof receipts only. Never store raw customer PII, raw provider payloads, provider tokens, Stripe secrets or API keys.

create table if not exists public.velmere_provider_order_fulfilment_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_id text not null unique,
  receipt_type text not null,
  provider text not null default 'mixed',
  status text not null check (status in ('pass', 'fail', 'blocked_env', 'not_captured')),
  receipt_hash text not null,
  redacted_summary text,
  safe_evidence jsonb not null default '{}'::jsonb,
  operator_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.velmere_provider_order_fulfilment_receipts enable row level security;

drop policy if exists "service role manages provider order fulfilment receipts" on public.velmere_provider_order_fulfilment_receipts;
create policy "service role manages provider order fulfilment receipts"
  on public.velmere_provider_order_fulfilment_receipts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists velmere_provider_order_fulfilment_receipts_type_idx
  on public.velmere_provider_order_fulfilment_receipts (receipt_type, status, created_at desc);
