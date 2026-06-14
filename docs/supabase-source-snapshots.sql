-- Velmère PASS 103 · Source Snapshot Ledger table
-- Run this in Supabase SQL editor before relying on durable evidence snapshots.

create table if not exists public.velmere_source_snapshots (
  id text primary key,
  report_id text not null,
  symbol text not null,
  name text not null,
  timestamp timestamptz not null default now(),
  source_state text not null,
  overall_risk integer not null,
  confidence text not null,
  confidence_score integer not null,
  final_verdict text not null,
  missing_data jsonb not null default '[]'::jsonb,
  blocked_by jsonb not null default '[]'::jsonb,
  source_ledger jsonb not null default '[]'::jsonb,
  web_queries jsonb not null default '[]'::jsonb
);

create index if not exists velmere_source_snapshots_symbol_timestamp_idx
  on public.velmere_source_snapshots (symbol, timestamp desc);

alter table public.velmere_source_snapshots enable row level security;

-- Service-role writes are used server-side. Public reads should stay blocked unless you add a safe public view.
-- Do not expose raw source snapshots publicly until redaction policy is final.
