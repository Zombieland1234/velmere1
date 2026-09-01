-- PASS17: service-role-only registry for Shield / Real Markets adapter versions and redacted evidence receipts.
-- No raw licensed provider payload may be persisted by this migration.

create table if not exists public.velmere_worldclass_market_adapter_versions (
  id uuid primary key default gen_random_uuid(),
  adapter_key text not null check (adapter_key in ('shield', 'real_markets')),
  adapter_schema text not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  policy_sha256 text not null check (policy_sha256 ~ '^[0-9a-f]{64}$'),
  output_contract_sha256 text not null check (output_contract_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('prepared', 'offline_simulation_proven', 'offline_provider_proven', 'staging_proven', 'live_proven', 'retired')),
  simulated_cases integer not null default 0 check (simulated_cases >= 0),
  canonical_cases integer not null default 0 check (canonical_cases >= 0),
  verification_receipt_sha256 text check (verification_receipt_sha256 is null or verification_receipt_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  unique (adapter_key, source_sha256, policy_sha256, output_contract_sha256),
  check (status <> 'retired' or retired_at is not null)
);

create table if not exists public.velmere_worldclass_market_evidence_receipts (
  run_id uuid not null references public.velmere_worldclass_evaluation_runs(id) on delete cascade,
  matrix_id text not null,
  adapter_version_id uuid not null references public.velmere_worldclass_market_adapter_versions(id) on delete restrict,
  surface text not null check (surface in ('shield', 'real_markets')),
  canonical_identity text,
  packet_sha256 text not null check (packet_sha256 ~ '^[0-9a-f]{64}$'),
  output_sha256 text check (output_sha256 is null or output_sha256 ~ '^[0-9a-f]{64}$'),
  independent_source_families integer not null default 0 check (independent_source_families >= 0),
  fresh_source_families integer not null default 0 check (fresh_source_families >= 0 and fresh_source_families <= independent_source_families),
  commercial_rights_status text not null check (commercial_rights_status in ('verified', 'display_only', 'restricted', 'unknown')),
  entitlement_status text not null check (entitlement_status in ('not_required', 'verified', 'unverified')),
  identity_status text not null check (identity_status in ('verified', 'unresolved', 'conflict')),
  conflict_count integer not null default 0 check (conflict_count >= 0),
  missing_field_count integer not null default 0 check (missing_field_count >= 0),
  redacted_receipt jsonb not null default '{}'::jsonb,
  raw_payload_stored boolean not null default false check (raw_payload_stored = false),
  created_at timestamptz not null default now(),
  primary key (run_id, matrix_id),
  check (jsonb_typeof(redacted_receipt) = 'object')
);

create index if not exists velmere_worldclass_adapter_versions_status_idx
  on public.velmere_worldclass_market_adapter_versions (adapter_key, status, created_at desc);
create index if not exists velmere_worldclass_market_receipts_run_idx
  on public.velmere_worldclass_market_evidence_receipts (run_id, surface, created_at);

alter table public.velmere_worldclass_market_adapter_versions enable row level security;
alter table public.velmere_worldclass_market_evidence_receipts enable row level security;

revoke all on public.velmere_worldclass_market_adapter_versions from public, anon, authenticated;
revoke all on public.velmere_worldclass_market_evidence_receipts from public, anon, authenticated;
grant all on public.velmere_worldclass_market_adapter_versions to service_role;
grant all on public.velmere_worldclass_market_evidence_receipts to service_role;

comment on table public.velmere_worldclass_market_adapter_versions is
  'Service-role-only source/policy/output-contract-bound adapter registry. Offline simulation status never implies provider, staging or LIVE proof.';
comment on table public.velmere_worldclass_market_evidence_receipts is
  'Redacted evidence metadata and hashes only. Raw licensed market payload storage is forbidden by constraint.';
