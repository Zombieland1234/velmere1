-- PASS2892 Playwright Receipt Pack / Browser-PDF Smoke Proof Contract
CREATE TABLE IF NOT EXISTS market_integrity_playwright_receipt_packs (
  id BIGSERIAL PRIMARY KEY,
  pass INTEGER NOT NULL DEFAULT 2892,
  receipt_pack_script TEXT NOT NULL,
  generated_spec_path TEXT NOT NULL,
  shield_rows_gt_10_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  shield_no_forced_first_row_highlight_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  shield_desktop_chart_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  shield_mobile_chart_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  realmarkets_icon_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  realmarkets_no_grey_underlay_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  btc_pdf_tier_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  aapl_pdf_tier_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  advanced_entitlement_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  can_claim_clean_typecheck BOOLEAN NOT NULL DEFAULT FALSE,
  can_claim_clean_build BOOLEAN NOT NULL DEFAULT FALSE,
  can_claim_world_class_live BOOLEAN NOT NULL DEFAULT FALSE,
  receipt_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pass2892_no_worldclass_claim_without_receipts CHECK (
    can_claim_world_class_live = FALSE
    OR (
      shield_rows_gt_10_receipt
      AND shield_no_forced_first_row_highlight_receipt
      AND shield_desktop_chart_receipt
      AND shield_mobile_chart_receipt
      AND realmarkets_icon_receipt
      AND realmarkets_no_grey_underlay_receipt
      AND btc_pdf_tier_receipt
      AND aapl_pdf_tier_receipt
      AND advanced_entitlement_receipt
      AND can_claim_clean_typecheck
      AND can_claim_clean_build
    )
  )
);
