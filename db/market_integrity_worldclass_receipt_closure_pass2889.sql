-- PASS2889 — Worldclass Receipt Closure / Route Smoke + PDF Parity Fixture Gate
-- This table is a schema contract for preserving PASS2889 strict repair, route-smoke matrix and PDF tier fixture evidence.

create table if not exists market_integrity_worldclass_receipt_closures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pass integer not null default 2889,
  repaired_strict_clusters jsonb not null default '[]'::jsonb,
  route_smoke_surfaces jsonb not null default '[]'::jsonb,
  pdf_tier_fixture_surfaces jsonb not null default '[]'::jsonb,
  can_claim_clean_typecheck boolean not null default false,
  can_claim_clean_build boolean not null default false,
  can_claim_world_class_live boolean not null default false,
  dependency_tree_receipt_hash text,
  typecheck_receipt_hash text,
  build_receipt_hash text,
  route_smoke_receipt_hash text,
  visual_receipt_hash text,
  payment_provider_receipt_hash text,
  constraint pass2889_no_live_claim_without_build check (can_claim_world_class_live = false or (dependency_tree_receipt_hash is not null and typecheck_receipt_hash is not null and build_receipt_hash is not null and route_smoke_receipt_hash is not null and visual_receipt_hash is not null and payment_provider_receipt_hash is not null)),
  constraint pass2889_clean_build_requires_typecheck check (can_claim_clean_build = false or (can_claim_clean_typecheck = true and typecheck_receipt_hash is not null and build_receipt_hash is not null))
);

comment on table market_integrity_worldclass_receipt_closures is 'PASS2889 contract: strict receipt-pack repairs and smoke/PDF parity matrices are preserved without overclaiming clean build/live topka świata.';
