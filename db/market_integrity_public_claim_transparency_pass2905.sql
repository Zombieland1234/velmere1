-- PASS2905 Public Claim Transparency / Customer-Verifiable Status Gate
-- Purpose: customer-facing claim status must match actual release evidence state.
-- Default public claim status while receipts are missing: NO_GO_PUBLIC_RECEIPTS_REQUIRED

create table if not exists market_integrity_public_claim_transparency_gates (
  id uuid primary key default gen_random_uuid(),
  release_candidate text not null,
  public_claim_status text not null,
  production_decision text not null,
  public_manifest_digest text not null,
  claim_expiry_minutes integer not null default 1440,
  shield_receipt_status text not null,
  realmarkets_receipt_status text not null,
  pdf_tier_parity_status text not null,
  payment_entitlement_status text not null,
  provider_freshness_status text not null,
  public_copy_scan_status text not null,
  can_show_green_production_badge boolean not null default false,
  can_show_world_class_live_badge boolean not null default false,
  can_hide_missing_receipts_from_customer boolean not null default false,
  can_use_marketing_copy_as_proof boolean not null default false,
  secret_redaction_required boolean not null default true,
  operator_attestation_digest text,
  created_at timestamptz not null default now(),
  constraint pass2905_public_claim_status_must_not_hide_missing_receipts check (
    can_hide_missing_receipts_from_customer = false
  ),
  constraint pass2905_no_green_badge_without_public_receipts check (
    (
      can_show_green_production_badge = false
      and can_show_world_class_live_badge = false
    )
    or (
      public_claim_status = 'PUBLIC_GREEN_RECEIPTS_VERIFIED'
      and production_decision = 'GO_FOR_PRODUCTION_RELEASE'
      and shield_receipt_status = 'verified_live_receipt'
      and realmarkets_receipt_status = 'verified_live_receipt'
      and pdf_tier_parity_status = 'verified_live_receipt'
      and payment_entitlement_status = 'verified_live_receipt'
      and provider_freshness_status = 'verified_live_receipt'
      and public_copy_scan_status = 'verified_live_receipt'
      and operator_attestation_digest is not null
      and can_use_marketing_copy_as_proof = false
      and secret_redaction_required = true
    )
  )
);
