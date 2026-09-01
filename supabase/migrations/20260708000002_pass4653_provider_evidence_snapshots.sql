create table if not exists public.provider_evidence_snapshots (
  cache_key text primary key,
  snapshot_id text not null,
  requested_identity text not null,
  surface text not null check (surface in ('crypto','real_markets','contract_audit')),
  snapshot_hash text not null,
  stored_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.provider_evidence_snapshots enable row level security;
revoke all on public.provider_evidence_snapshots from anon, authenticated;
create index if not exists provider_evidence_snapshots_stored_at_idx on public.provider_evidence_snapshots(stored_at desc);

create table if not exists public.provider_evidence_refresh_targets (
  target_key text primary key,
  requested_identity text not null,
  surface text not null check (surface in ('crypto','real_markets','contract_audit')),
  asset_class text not null default 'unknown',
  highest_requested_tier text not null check (highest_requested_tier in ('basic','pro','advanced')),
  demand_count bigint not null default 1,
  cadence_ms integer not null,
  priority integer not null default 1,
  first_requested_at timestamptz not null,
  last_requested_at timestamptz not null,
  next_refresh_at timestamptz not null,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  consecutive_failures integer not null default 0,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.provider_evidence_refresh_targets enable row level security;
revoke all on public.provider_evidence_refresh_targets from anon, authenticated;
create index if not exists provider_evidence_refresh_targets_due_idx
  on public.provider_evidence_refresh_targets(next_refresh_at asc, priority desc);
create index if not exists provider_evidence_refresh_targets_demand_idx
  on public.provider_evidence_refresh_targets(highest_requested_tier, demand_count desc);

create table if not exists public.instrument_identity_snapshots (
  cache_key text primary key,
  requested_identity text not null,
  surface text not null check (surface in ('crypto','real_markets','contract_audit')),
  canonical_symbol text not null,
  canonical_name text not null,
  asset_class text not null,
  market_id text,
  exchange text,
  currency text,
  provider_id text not null,
  provider_family text not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  stored_at timestamptz not null,
  snapshot_hash text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.instrument_identity_snapshots enable row level security;
revoke all on public.instrument_identity_snapshots from anon, authenticated;
create index if not exists instrument_identity_snapshots_expiry_idx
  on public.instrument_identity_snapshots(expires_at asc);
create index if not exists instrument_identity_snapshots_symbol_idx
  on public.instrument_identity_snapshots(canonical_symbol, asset_class);

alter table public.provider_evidence_refresh_targets
  add column if not exists lease_owner text,
  add column if not exists lease_until timestamptz;
create index if not exists provider_evidence_refresh_targets_lease_idx
  on public.provider_evidence_refresh_targets(lease_until asc);
