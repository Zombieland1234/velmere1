-- PASS2890 — Local Runtime Proof Harness / Shield + Real Markets + PDF Fixture Smoke Gate
create table if not exists market_integrity_local_runtime_proof_harnesses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pass integer not null default 2890,
  harness_name text not null default 'local-runtime-proof-harness',
  can_claim_clean_typecheck boolean not null default false,
  can_claim_clean_build boolean not null default false,
  can_claim_world_class_live boolean not null default false,
  shield_rows_gt_10_right_chart_lane boolean not null default false,
  realmarkets_icon_chart_lane boolean not null default false,
  btc_aapl_pdf_tier_fixture_lane boolean not null default false,
  route_smoke_static_lane boolean not null default false,
  proof_payload jsonb not null default '{}'::jsonb,
  proof_hash text,
  notes text not null default 'pass2890_no_live_claim_without_dependency_build_browser_payment_provider_receipts'
);

create index if not exists market_integrity_local_runtime_proof_harnesses_pass_idx
  on market_integrity_local_runtime_proof_harnesses(pass, created_at desc);

comment on table market_integrity_local_runtime_proof_harnesses is
  'PASS2890 local static smoke harness records: Shield/Real Markets/PDF route proof lanes prepared, but clean live topka świata remains blocked until npm ci/typecheck/build/browser/visual/payment/provider receipts exist.';
