-- PASS20: service-role-only data/license requirement registry and i18n release audit receipts.
-- Raw provider payloads, raw licensed values and full user text are forbidden in this evidence plane.

create table if not exists public.velmere_worldclass_data_license_matrix_versions (
  id uuid primary key default gen_random_uuid(),
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  corpus_sha256 text not null check (corpus_sha256 ~ '^[0-9a-f]{64}$'),
  policy_sha256 text not null check (policy_sha256 ~ '^[0-9a-f]{64}$'),
  matrix_sha256 text not null check (matrix_sha256 ~ '^[0-9a-f]{64}$'),
  requirement_cells integer not null check (requirement_cells > 0),
  provider_bound_cells integer not null default 0 check (provider_bound_cells >= 0 and provider_bound_cells <= requirement_cells),
  sell_eligible_cells integer not null default 0 check (sell_eligible_cells >= 0 and sell_eligible_cells <= requirement_cells),
  status text not null check (status in ('prepared_requirements','offline_provider_proven','staging_proven','live_proven','retired')),
  verification_receipt_sha256 text check (verification_receipt_sha256 is null or verification_receipt_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  unique (source_sha256, corpus_sha256, policy_sha256, matrix_sha256),
  check (status <> 'retired' or retired_at is not null)
);

create table if not exists public.velmere_worldclass_data_license_cell_receipts (
  matrix_version_id uuid not null references public.velmere_worldclass_data_license_matrix_versions(id) on delete cascade,
  cell_id text not null check (cell_id ~ '^[0-9a-f]{64}$'),
  case_id text not null,
  surface text not null check (surface in ('shield','real_markets','smart_contract_audit','lens_pdf','vlm_brain','angel')),
  tier text not null check (tier in ('basic','pro','advanced')),
  field_id text not null,
  canonical_identity_hash text not null check (canonical_identity_hash ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('missing_provider_bound_evidence','blocked','eligible')),
  freshness_status text not null check (freshness_status in ('missing','fresh','stale','mixed')),
  license_status text not null check (license_status in ('unverified','verified','display_only','restricted','mixed')),
  independent_source_families integer not null default 0 check (independent_source_families >= 0),
  blocker_codes text[] not null default '{}',
  redacted_receipt jsonb not null default '{}'::jsonb check (jsonb_typeof(redacted_receipt) = 'object'),
  raw_provider_payload jsonb null check (raw_provider_payload is null),
  raw_licensed_value text null check (raw_licensed_value is null),
  created_at timestamptz not null default now(),
  primary key (matrix_version_id, cell_id)
);

create table if not exists public.velmere_worldclass_i18n_release_audit_receipts (
  id uuid primary key default gen_random_uuid(),
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  messages_root_sha256 text not null check (messages_root_sha256 ~ '^[0-9a-f]{64}$'),
  locales text[] not null check (cardinality(locales) >= 3),
  flattened_values integer not null check (flattened_values > 0),
  critical_untranslated_candidates integer not null default 0 check (critical_untranslated_candidates >= 0),
  critical_english_leak_candidates integer not null default 0 check (critical_english_leak_candidates >= 0),
  legal_placeholder_blockers integer not null default 0 check (legal_placeholder_blockers >= 0),
  status text not null check (status in ('pass_static','no_go_legal','needs_translation_review','native_review_proven','retired')),
  audit_receipt_sha256 text not null check (audit_receipt_sha256 ~ '^[0-9a-f]{64}$'),
  redacted_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(redacted_summary) = 'object'),
  raw_user_text text null check (raw_user_text is null),
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  check (status <> 'retired' or retired_at is not null)
);

create index if not exists velmere_worldclass_data_license_matrix_status_idx
  on public.velmere_worldclass_data_license_matrix_versions (status, created_at desc);
create index if not exists velmere_worldclass_data_license_cells_case_idx
  on public.velmere_worldclass_data_license_cell_receipts (case_id, tier, status);
create index if not exists velmere_worldclass_i18n_audit_status_idx
  on public.velmere_worldclass_i18n_release_audit_receipts (status, created_at desc);

alter table public.velmere_worldclass_data_license_matrix_versions enable row level security;
alter table public.velmere_worldclass_data_license_matrix_versions force row level security;
alter table public.velmere_worldclass_data_license_cell_receipts enable row level security;
alter table public.velmere_worldclass_data_license_cell_receipts force row level security;
alter table public.velmere_worldclass_i18n_release_audit_receipts enable row level security;
alter table public.velmere_worldclass_i18n_release_audit_receipts force row level security;

revoke all on table public.velmere_worldclass_data_license_matrix_versions from public, anon, authenticated;
revoke all on table public.velmere_worldclass_data_license_cell_receipts from public, anon, authenticated;
revoke all on table public.velmere_worldclass_i18n_release_audit_receipts from public, anon, authenticated;
grant select, insert, update, delete on table public.velmere_worldclass_data_license_matrix_versions to service_role;
grant select, insert, update, delete on table public.velmere_worldclass_data_license_cell_receipts to service_role;
grant select, insert, update, delete on table public.velmere_worldclass_i18n_release_audit_receipts to service_role;

comment on table public.velmere_worldclass_data_license_matrix_versions is
  'PASS20 source/corpus/policy-bound requirement matrix. Prepared status is not provider, staging or LIVE proof.';
comment on table public.velmere_worldclass_data_license_cell_receipts is
  'PASS20 redacted per-field eligibility receipts. Raw provider payloads and licensed values are prohibited.';
comment on table public.velmere_worldclass_i18n_release_audit_receipts is
  'PASS20 redacted language-release audit metadata. Native review and final legal approval remain external gates.';
