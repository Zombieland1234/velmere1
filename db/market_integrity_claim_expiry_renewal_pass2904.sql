-- PASS2904 Claim Expiry Renewal / CI Artifact Ingestion Gate
-- Production/world-class-live claims are time-bound and must be renewed with fresh CI-ingested receipts.

create table if not exists market_integrity_claim_expiry_renewal_gates (
  id uuid primary key default gen_random_uuid(),
  pass integer not null default 2904,
  release_candidate text not null,
  renewal_manifest_digest text not null,
  production_decision text not null default 'NO_GO',
  renewal_decision text not null default 'NO_GO_RENEWAL_ARTIFACTS_REQUIRED',
  claim_expiry_minutes integer not null default 1440,
  npm_ci_exit0 boolean not null default false,
  typecheck_exit0 boolean not null default false,
  next_build_exit0 boolean not null default false,
  playwright_visual_receipts_fresh boolean not null default false,
  pdf_tier_parity_receipts_fresh boolean not null default false,
  payment_entitlement_receipts_fresh boolean not null default false,
  provider_freshness_receipts_fresh boolean not null default false,
  public_claim_copy_scan_fresh boolean not null default false,
  manual_override_allowed boolean not null default false,
  can_renew_production_claim boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint pass2904_no_manual_renewal check (manual_override_allowed = false),
  constraint pass2904_no_renewal_without_all_fresh_ci_receipts check (
    can_renew_production_claim = false or (
      npm_ci_exit0
      and typecheck_exit0
      and next_build_exit0
      and playwright_visual_receipts_fresh
      and pdf_tier_parity_receipts_fresh
      and payment_entitlement_receipts_fresh
      and provider_freshness_receipts_fresh
      and public_claim_copy_scan_fresh
      and production_decision = 'GO'
      and renewal_decision = 'RENEWED_GO'
      and expires_at > now()
    )
  )
);
