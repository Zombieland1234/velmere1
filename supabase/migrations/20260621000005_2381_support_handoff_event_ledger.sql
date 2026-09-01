-- PASS2381 support handoff event ledger
-- Redacted audit trail for support handoff page opens, API packet views, and packet downloads.
-- Must never store raw Stripe/webhook/BLIK/card payloads, secrets, seed phrases or exploit instructions.

create table if not exists public.velmere_support_handoff_event_ledger (
  id text primary key,
  event_id text unique not null,
  event_type text not null check (event_type in ('support_route_open', 'support_api_packet_view', 'support_packet_download')),
  event_at timestamptz not null default now(),
  locale text not null default 'en' check (locale in ('pl', 'en', 'de')),
  receipt_id text,
  receipt_checksum text,
  support_handoff_id text,
  support_handoff_status text not null default 'watch' check (support_handoff_status in ('ready', 'watch', 'blocked')),
  support_handoff_route text,
  downloadable_support_handoff_route text,
  actor jsonb not null default '{}'::jsonb,
  project jsonb not null default '{}'::jsonb,
  route_health jsonb not null default '{}'::jsonb,
  event_summary text,
  checksum text not null,
  safe_boundary text not null,
  record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists velmere_support_handoff_event_ledger_receipt_idx
  on public.velmere_support_handoff_event_ledger (receipt_id, event_at desc);

create index if not exists velmere_support_handoff_event_ledger_support_idx
  on public.velmere_support_handoff_event_ledger (support_handoff_id, event_at desc);

create index if not exists velmere_support_handoff_event_ledger_type_idx
  on public.velmere_support_handoff_event_ledger (event_type, event_at desc);

comment on table public.velmere_support_handoff_event_ledger is
  'PASS2381 redacted support handoff open/download event ledger. No raw payment payloads, webhook bodies, BLIK codes, card data, secrets, seed phrases, exploit instructions, Certified Safe claims or investment advice.';

alter table public.velmere_support_handoff_event_ledger enable row level security;
revoke all on table public.velmere_support_handoff_event_ledger from anon;
revoke all on table public.velmere_support_handoff_event_ledger from authenticated;
grant select, insert, update, delete on table public.velmere_support_handoff_event_ledger to service_role;
