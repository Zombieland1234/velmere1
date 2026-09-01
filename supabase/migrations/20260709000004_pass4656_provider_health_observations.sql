create table if not exists public.provider_health_observations (
  observation_key text primary key check (observation_key ~ '^[a-f0-9]{64}$'),
  provider_id text not null,
  provider_family text not null,
  observed_at timestamptz not null,
  elapsed_ms integer not null check (elapsed_ms >= 0),
  origin text not null check (origin in ('customer', 'probe', 'scheduled', 'runner')),
  accepted_as_evidence boolean not null,
  failure_kind text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.provider_health_observations enable row level security;

revoke all on public.provider_health_observations from anon, authenticated;
grant all on public.provider_health_observations to service_role;

create index if not exists provider_health_observations_recent_idx
  on public.provider_health_observations (observed_at desc);

create index if not exists provider_health_observations_provider_idx
  on public.provider_health_observations (provider_family, provider_id, observed_at desc);

comment on table public.provider_health_observations is
  'PASS4656 append-only service-role provider health event log. Signed snapshots are rebuilt from this durable source to avoid lost updates under concurrency.';
