-- PASS2178 mutation receipt vault.
-- Stores redacted mutation receipts only. Do not store raw customer PII, raw Stripe payloads,
-- raw provider payloads, card data, wallet signatures, cookies, IP addresses or secrets.

create table if not exists public.velmere_mutation_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_id text unique not null,
  route text not null,
  method text not null,
  action text not null,
  target_type text not null,
  target_id text,
  actor_id text not null,
  actor_mode text not null default 'unknown',
  redacted_payload jsonb not null default '{}'::jsonb,
  redacted_keys text[] not null default '{}'::text[],
  retained_keys text[] not null default '{}'::text[],
  payload_hash text not null,
  safe_summary text not null,
  created_at timestamptz not null default now(),
  constraint velmere_mutation_receipts_actor_mode_check check (actor_mode in ('admin','member','public','system','unknown')),
  constraint velmere_mutation_receipts_method_check check (method in ('POST','PUT','PATCH','DELETE','INTERNAL'))
);

alter table public.velmere_mutation_receipts enable row level security;

create index if not exists velmere_mutation_receipts_route_created_idx on public.velmere_mutation_receipts(route, created_at desc);
create index if not exists velmere_mutation_receipts_action_created_idx on public.velmere_mutation_receipts(action, created_at desc);
create index if not exists velmere_mutation_receipts_actor_mode_idx on public.velmere_mutation_receipts(actor_mode, created_at desc);

comment on table public.velmere_mutation_receipts is 'PASS2178 redacted mutation receipt vault. Server/service-role writes only; no raw PII, raw Stripe payloads, raw provider payloads, IPs, cookies, wallet signatures, card data or secrets.';
comment on column public.velmere_mutation_receipts.redacted_payload is 'Operator-safe retained fields only. Raw payload is never stored.';
comment on column public.velmere_mutation_receipts.payload_hash is 'Hash of original server-side payload for proof correlation without retaining raw payload.';
