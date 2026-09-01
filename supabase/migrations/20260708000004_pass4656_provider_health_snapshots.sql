create table if not exists public.provider_health_snapshots (
  scope_key text primary key,
  schema_version text not null,
  generated_at timestamptz not null,
  expires_at timestamptz not null,
  key_id text not null,
  ledger_fingerprint text not null check (ledger_fingerprint ~ '^[a-f0-9]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  signature text not null check (signature ~ '^[a-f0-9]{64}$'),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.provider_health_snapshots enable row level security;

revoke all on public.provider_health_snapshots from anon, authenticated;
grant all on public.provider_health_snapshots to service_role;

create index if not exists provider_health_snapshots_expires_at_idx
  on public.provider_health_snapshots (expires_at);

comment on table public.provider_health_snapshots is
  'PASS4656 service-role-only signed provider health ledger. Public and authenticated clients have no direct access.';
