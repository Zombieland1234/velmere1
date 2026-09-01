-- PASS16: source-bound world-class evaluation registry.
-- This migration prepares staging persistence. It does not mark any evaluation as executed.

create table if not exists public.velmere_worldclass_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  corpus_sha256 text not null check (corpus_sha256 ~ '^[0-9a-f]{64}$'),
  environment text not null check (environment in ('offline', 'staging', 'live')),
  status text not null check (status in ('prepared', 'running', 'passed', 'failed', 'blocked', 'cancelled')),
  runtime jsonb not null default '{}'::jsonb,
  expected_cases integer not null check (expected_cases > 0),
  executed_cases integer not null default 0 check (executed_cases >= 0 and executed_cases <= expected_cases),
  passed_cases integer not null default 0 check (passed_cases >= 0 and passed_cases <= executed_cases),
  failed_cases integer not null default 0 check (failed_cases >= 0 and failed_cases <= executed_cases),
  receipt_sha256 text check (receipt_sha256 is null or receipt_sha256 ~ '^[0-9a-f]{64}$'),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (passed_cases + failed_cases <= executed_cases),
  check (completed_at is null or started_at is not null)
);

create table if not exists public.velmere_worldclass_evaluation_results (
  run_id uuid not null references public.velmere_worldclass_evaluation_runs(id) on delete cascade,
  matrix_id text not null,
  case_id text not null,
  surface text not null check (surface in ('shield', 'real_markets', 'smart_contract_audit', 'lens_pdf', 'vlm_brain', 'angel')),
  tier text not null check (tier in ('basic', 'pro', 'advanced')),
  locale text not null check (locale in ('pl', 'en', 'de')),
  status text not null check (status in ('passed', 'failed', 'blocked', 'not_executed')),
  output_sha256 text check (output_sha256 is null or output_sha256 ~ '^[0-9a-f]{64}$'),
  evidence_receipt jsonb not null default '{}'::jsonb,
  failure_codes text[] not null default '{}'::text[],
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now(),
  primary key (run_id, matrix_id),
  unique (run_id, case_id, tier, locale)
);

create index if not exists velmere_worldclass_evaluation_runs_source_idx
  on public.velmere_worldclass_evaluation_runs (source_sha256, corpus_sha256, environment, created_at desc);
create index if not exists velmere_worldclass_evaluation_results_surface_idx
  on public.velmere_worldclass_evaluation_results (run_id, surface, tier, locale, status);

alter table public.velmere_worldclass_evaluation_runs enable row level security;
alter table public.velmere_worldclass_evaluation_results enable row level security;

revoke all on public.velmere_worldclass_evaluation_runs from public, anon, authenticated;
revoke all on public.velmere_worldclass_evaluation_results from public, anon, authenticated;
grant all on public.velmere_worldclass_evaluation_runs to service_role;
grant all on public.velmere_worldclass_evaluation_results to service_role;

comment on table public.velmere_worldclass_evaluation_runs is
  'Service-role-only source/corpus-bound execution receipts. Prepared rows never imply PASS.';
comment on table public.velmere_worldclass_evaluation_results is
  'Service-role-only per-matrix results for the 2700-case world-class product matrix.';
