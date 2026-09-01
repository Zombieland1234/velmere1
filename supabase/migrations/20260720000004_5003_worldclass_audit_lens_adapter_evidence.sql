-- PASS18: service-role-only registry for smart-contract audit and Lens/PDF adapter versions.
-- Only redacted hashes and release metadata may be stored. Raw contract source, provider payloads and PDF blobs are forbidden here.

create table if not exists public.velmere_worldclass_audit_lens_adapter_versions (
  id uuid primary key default gen_random_uuid(),
  adapter_key text not null check (adapter_key in ('smart_contract_audit', 'lens_pdf')),
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

create table if not exists public.velmere_worldclass_audit_lens_evidence_receipts (
  run_id uuid not null references public.velmere_worldclass_evaluation_runs(id) on delete cascade,
  matrix_id text not null,
  adapter_version_id uuid not null references public.velmere_worldclass_audit_lens_adapter_versions(id) on delete restrict,
  surface text not null check (surface in ('smart_contract_audit', 'lens_pdf')),
  canonical_identity_hash text check (canonical_identity_hash is null or canonical_identity_hash ~ '^[0-9a-f]{64}$'),
  evidence_packet_sha256 text not null check (evidence_packet_sha256 ~ '^[0-9a-f]{64}$'),
  output_sha256 text check (output_sha256 is null or output_sha256 ~ '^[0-9a-f]{64}$'),
  source_family_count integer not null default 0 check (source_family_count >= 0),
  commercial_rights_status text not null check (commercial_rights_status in ('verified', 'display_only', 'restricted', 'unknown')),
  entitlement_status text not null check (entitlement_status in ('not_required', 'verified', 'unverified')),
  identity_status text not null check (identity_status in ('verified', 'unresolved', 'conflict')),
  parity_status text not null check (parity_status in ('not_applicable', 'verified', 'failed', 'missing')),
  human_review_status text not null check (human_review_status in ('not_required', 'required_missing', 'approved', 'rejected')),
  human_review_receipt_sha256 text check (human_review_receipt_sha256 is null or human_review_receipt_sha256 ~ '^[0-9a-f]{64}$'),
  redacted_receipt jsonb not null default '{}'::jsonb,
  raw_contract_source_stored boolean not null default false check (raw_contract_source_stored = false),
  raw_provider_payload_stored boolean not null default false check (raw_provider_payload_stored = false),
  raw_pdf_blob_stored boolean not null default false check (raw_pdf_blob_stored = false),
  created_at timestamptz not null default now(),
  primary key (run_id, matrix_id),
  check (jsonb_typeof(redacted_receipt) = 'object')
);

create index if not exists velmere_worldclass_audit_lens_adapter_versions_status_idx
  on public.velmere_worldclass_audit_lens_adapter_versions (adapter_key, status, created_at desc);
create index if not exists velmere_worldclass_audit_lens_receipts_run_idx
  on public.velmere_worldclass_audit_lens_evidence_receipts (run_id, surface, created_at);

alter table public.velmere_worldclass_audit_lens_adapter_versions enable row level security;
alter table public.velmere_worldclass_audit_lens_evidence_receipts enable row level security;

revoke all on public.velmere_worldclass_audit_lens_adapter_versions from public, anon, authenticated;
revoke all on public.velmere_worldclass_audit_lens_evidence_receipts from public, anon, authenticated;
grant all on public.velmere_worldclass_audit_lens_adapter_versions to service_role;
grant all on public.velmere_worldclass_audit_lens_evidence_receipts to service_role;

comment on table public.velmere_worldclass_audit_lens_adapter_versions is
  'Service-role-only registry. Offline synthetic status never implies detector quality, real human review, rendered PDF, staging or LIVE proof.';
comment on table public.velmere_worldclass_audit_lens_evidence_receipts is
  'Redacted audit/Lens receipt metadata only. Raw contract source, licensed provider payload and PDF blob storage are forbidden by constraints.';
