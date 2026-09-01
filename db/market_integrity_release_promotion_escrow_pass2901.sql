-- PASS2901 — Release Promotion Escrow / Production Claim Firewall
-- Purpose: store the promotion escrow boundary after PASS2900 continuity lock.
-- This does not grant production GO. It records why a release can only become GO_CANDIDATE
-- after fresh runtime receipts are present and bound into a PASS2901 escrow digest.

create table if not exists market_integrity_release_promotion_escrow_gates (
  id text primary key,
  pass integer not null default 2901,
  release_lineage text not null,
  production_decision text not null default 'NO_GO',
  promotion_decision text not null default 'NO_GO_PROMOTION_ESCROW_PENDING',
  escrow_digest text,
  can_promote_to_go_candidate boolean not null default false,
  can_claim_worldclass_live boolean not null default false,
  clean_install_receipt_sha256 text,
  clean_typecheck_receipt_sha256 text,
  clean_build_receipt_sha256 text,
  playwright_receipts_sha256 text,
  pdf_payment_provider_receipts_sha256 text,
  operator_signature_sha256 text,
  missing_receipts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists market_integrity_release_promotion_escrow_pass_idx
  on market_integrity_release_promotion_escrow_gates(pass, production_decision, promotion_decision);

comment on table market_integrity_release_promotion_escrow_gates is
  'PASS2901 promotion escrow firewall: direct production GO is blocked until PASS2900 lineage, fresh runtime receipts and PASS2901 escrow signature are present.';

comment on column market_integrity_release_promotion_escrow_gates.can_promote_to_go_candidate is
  'Hard default false. May become true only when all fresh runtime receipts are present and bound into the PASS2901 escrow digest.';

insert into market_integrity_release_promotion_escrow_gates (
  id,
  release_lineage,
  production_decision,
  promotion_decision,
  can_promote_to_go_candidate,
  can_claim_worldclass_live,
  missing_receipts
) values (
  'pass2901_no_go_without_promotion_escrow_receipts',
  'PASS2895->PASS2896->PASS2897->PASS2898->PASS2899->PASS2900->PASS2901',
  'NO_GO',
  'NO_GO_PROMOTION_ESCROW_PENDING',
  false,
  false,
  '["full_npm_ci_exit0","typecheck_exit0","next_build_exit0","playwright_browser_receipts","pdf_payment_provider_receipts","operator_signature"]'::jsonb
) on conflict (id) do update set
  release_lineage = excluded.release_lineage,
  production_decision = excluded.production_decision,
  promotion_decision = excluded.promotion_decision,
  can_promote_to_go_candidate = excluded.can_promote_to_go_candidate,
  can_claim_worldclass_live = excluded.can_claim_worldclass_live,
  missing_receipts = excluded.missing_receipts;
