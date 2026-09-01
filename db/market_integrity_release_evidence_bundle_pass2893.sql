-- PASS2893 Release Evidence Bundle / Artifact Contract
CREATE TABLE IF NOT EXISTS market_integrity_release_evidence_bundles (
  id BIGSERIAL PRIMARY KEY,
  pass INTEGER NOT NULL DEFAULT 2893,
  bundle_script TEXT NOT NULL,
  release_evidence_spec TEXT NOT NULL,
  npm_ci_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  typecheck_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  build_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  playwright_html_report_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  shield_rows_gt_10_screenshot_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  shield_no_forced_first_row_highlight_dom_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  shield_desktop_mobile_chart_receipts BOOLEAN NOT NULL DEFAULT FALSE,
  realmarkets_icon_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  realmarkets_no_grey_underlay_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  btc_pdf_tier_hash_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  aapl_pdf_tier_hash_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  advanced_entitlement_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  payment_provider_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  provider_freshness_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  can_claim_clean_typecheck BOOLEAN NOT NULL DEFAULT FALSE,
  can_claim_clean_build BOOLEAN NOT NULL DEFAULT FALSE,
  can_claim_world_class_live BOOLEAN NOT NULL DEFAULT FALSE,
  receipt_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pass2893_no_worldclass_claim_without_release_bundle CHECK (
    can_claim_world_class_live = FALSE
    OR (
      npm_ci_receipt
      AND typecheck_receipt
      AND build_receipt
      AND playwright_html_report_receipt
      AND shield_rows_gt_10_screenshot_receipt
      AND shield_no_forced_first_row_highlight_dom_receipt
      AND shield_desktop_mobile_chart_receipts
      AND realmarkets_icon_receipt
      AND realmarkets_no_grey_underlay_receipt
      AND btc_pdf_tier_hash_receipt
      AND aapl_pdf_tier_hash_receipt
      AND advanced_entitlement_receipt
      AND payment_provider_receipt
      AND provider_freshness_receipt
      AND can_claim_clean_typecheck
      AND can_claim_clean_build
    )
  )
);
