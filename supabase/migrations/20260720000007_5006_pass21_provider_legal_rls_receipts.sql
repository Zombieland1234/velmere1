-- PASS21: service-role-only receipts for provider-rights, merchant-legal and RLS-classification registries.
-- Evidence hashes only; provider contracts, personal addresses and raw legal documents are not stored here.

create table if not exists public.velmere_pass21_provider_rights_receipts (
  id uuid primary key default gen_random_uuid(), source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  registry_sha256 text not null check (registry_sha256 ~ '^[0-9a-f]{64}$'), providers integer not null check (providers > 0),
  external_rights_verified integer not null default 0 check (external_rights_verified >= 0 and external_rights_verified <= providers),
  commercially_enabled integer not null default 0 check (commercially_enabled >= 0 and commercially_enabled <= providers),
  status text not null check (status in ('rights_unverified','partial','verified','retired')), redacted_summary jsonb not null default '{}'::jsonb,
  raw_contract_document bytea null check (raw_contract_document is null), created_at timestamptz not null default now()
);
create table if not exists public.velmere_pass21_merchant_legal_receipts (
  id uuid primary key default gen_random_uuid(), source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  profile_sha256 text not null check (profile_sha256 ~ '^[0-9a-f]{64}$'), missing_fields integer not null check (missing_fields >= 0),
  incomplete_policies integer not null check (incomplete_policies >= 0), legal_review_approved boolean not null default false,
  status text not null check (status in ('no_go','ready_pending_review','approved','retired')), redacted_summary jsonb not null default '{}'::jsonb,
  raw_address text null check (raw_address is null), raw_tax_identifier text null check (raw_tax_identifier is null), created_at timestamptz not null default now()
);
create table if not exists public.velmere_pass21_rls_classification_receipts (
  id uuid primary key default gen_random_uuid(), source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  registry_sha256 text not null check (registry_sha256 ~ '^[0-9a-f]{64}$'), classified_tables integer not null check (classified_tables >= 0),
  staging_policy_blockers integer not null check (staging_policy_blockers >= 0), status text not null check (status in ('classified','staging_proven','retired')),
  redacted_summary jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

alter table public.velmere_pass21_provider_rights_receipts enable row level security;
alter table public.velmere_pass21_provider_rights_receipts force row level security;
alter table public.velmere_pass21_merchant_legal_receipts enable row level security;
alter table public.velmere_pass21_merchant_legal_receipts force row level security;
alter table public.velmere_pass21_rls_classification_receipts enable row level security;
alter table public.velmere_pass21_rls_classification_receipts force row level security;
revoke all on table public.velmere_pass21_provider_rights_receipts from public, anon, authenticated;
revoke all on table public.velmere_pass21_merchant_legal_receipts from public, anon, authenticated;
revoke all on table public.velmere_pass21_rls_classification_receipts from public, anon, authenticated;
grant select, insert, update, delete on table public.velmere_pass21_provider_rights_receipts to service_role;
grant select, insert, update, delete on table public.velmere_pass21_merchant_legal_receipts to service_role;
grant select, insert, update, delete on table public.velmere_pass21_rls_classification_receipts to service_role;
