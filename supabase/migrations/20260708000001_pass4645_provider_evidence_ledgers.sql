create table if not exists public.provider_evidence_ledgers (
  id uuid primary key default gen_random_uuid(),
  ledger_id text not null unique,
  requested_identity text not null,
  surface text not null check (surface in ('crypto','real_markets','contract_audit')),
  depth text not null check (depth in ('basic','pro','advanced')),
  head_hash text,
  receipt_count integer not null default 0,
  eligible_receipt_count integer not null default 0,
  signed boolean not null default false,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.provider_evidence_ledgers enable row level security;
revoke all on public.provider_evidence_ledgers from anon, authenticated;
create index if not exists provider_evidence_ledgers_identity_created_idx on public.provider_evidence_ledgers(requested_identity, created_at desc);
create index if not exists provider_evidence_ledgers_head_hash_idx on public.provider_evidence_ledgers(head_hash);
