-- PASS2902 — Production Claim Notarization / Final Manifest Gate
-- Purpose: store the final notary boundary after PASS2901 promotion escrow.
-- This does not grant production GO. It records why a production certificate remains blocked
-- until fresh install/typecheck/build/browser/PDF/payment/provider receipts and dual-control signatures exist.

create table if not exists market_integrity_production_claim_notarization_gates (
  id text primary key,
  pass integer not null default 2902,
  release_lineage text not null,
  production_decision text not null default 'NO_GO',
  notary_decision text not null default 'NO_GO_NOTARIZATION_PENDING',
  promotion_escrow_digest text,
  final_notary_manifest_digest text,
  can_issue_production_certificate boolean not null default false,
  manual_override_allowed boolean not null default false,
  can_claim_worldclass_live boolean not null default false,
  full_install_receipt_sha256 text,
  typecheck_receipt_sha256 text,
  build_receipt_sha256 text,
  browser_visual_receipts_sha256 text,
  pdf_payment_provider_receipts_sha256 text,
  provider_quorum_receipts_sha256 text,
  dual_control_signature_sha256 text,
  missing_receipts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists market_integrity_production_claim_notarization_pass_idx
  on market_integrity_production_claim_notarization_gates(pass, production_decision, notary_decision);

comment on table market_integrity_production_claim_notarization_gates is
  'PASS2902 production claim notarization: production GO and world-class live claims stay blocked until final notary manifest, fresh runtime receipts and dual-control signatures are present.';

comment on column market_integrity_production_claim_notarization_gates.manual_override_allowed is
  'Hard default false. A manual UI/operator override cannot bypass the final notary manifest and fresh runtime receipts.';

insert into market_integrity_production_claim_notarization_gates (
  id,
  release_lineage,
  production_decision,
  notary_decision,
  can_issue_production_certificate,
  manual_override_allowed,
  can_claim_worldclass_live,
  missing_receipts
) values (
  'pass2902_no_go_without_final_notary_manifest',
  'PASS2895->PASS2896->PASS2897->PASS2898->PASS2899->PASS2900->PASS2901->PASS2902',
  'NO_GO',
  'NO_GO_NOTARIZATION_PENDING',
  false,
  false,
  false,
  '["full_npm_ci_exit0","typecheck_exit0","next_build_exit0","playwright_browser_visual_receipts","pdf_payment_provider_receipts","provider_quorum_receipts","dual_control_operator_notary_signature"]'::jsonb
) on conflict (id) do update set
  release_lineage = excluded.release_lineage,
  production_decision = excluded.production_decision,
  notary_decision = excluded.notary_decision,
  can_issue_production_certificate = excluded.can_issue_production_certificate,
  manual_override_allowed = excluded.manual_override_allowed,
  can_claim_worldclass_live = excluded.can_claim_worldclass_live,
  missing_receipts = excluded.missing_receipts;
