-- PASS2894 Operator GO / NO-GO Release Gate
CREATE TABLE IF NOT EXISTS market_integrity_operator_go_no_go_gates (
  id BIGSERIAL PRIMARY KEY,
  pass INTEGER NOT NULL DEFAULT 2894,
  approval_mode TEXT NOT NULL DEFAULT 'NO_GO',
  npm_ci_exit0_log BOOLEAN NOT NULL DEFAULT FALSE,
  typecheck_exit0_log BOOLEAN NOT NULL DEFAULT FALSE,
  next_build_exit0_log BOOLEAN NOT NULL DEFAULT FALSE,
  playwright_html_report BOOLEAN NOT NULL DEFAULT FALSE,
  shield_rows_gt_10_png_dom_json BOOLEAN NOT NULL DEFAULT FALSE,
  shield_no_forced_first_row_highlight_dom_json BOOLEAN NOT NULL DEFAULT FALSE,
  shield_desktop_mobile_chart_skeleton_png BOOLEAN NOT NULL DEFAULT FALSE,
  realmarkets_icon_lanes_png_dom_json BOOLEAN NOT NULL DEFAULT FALSE,
  realmarkets_no_grey_underlay_png_dom_json BOOLEAN NOT NULL DEFAULT FALSE,
  btc_shield_basic_pro_advanced_pdf_hash_json BOOLEAN NOT NULL DEFAULT FALSE,
  aapl_realmarkets_basic_pro_advanced_pdf_hash_json BOOLEAN NOT NULL DEFAULT FALSE,
  advanced_entitlement_server_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_blik_wallet_test_mode_receipts BOOLEAN NOT NULL DEFAULT FALSE,
  provider_freshness_timeout_fallback_quorum_json BOOLEAN NOT NULL DEFAULT FALSE,
  mobile_safe_area_scroll_lock_screenshots BOOLEAN NOT NULL DEFAULT FALSE,
  operator_signed_go_no_go_json BOOLEAN NOT NULL DEFAULT FALSE,
  can_claim_clean_typecheck BOOLEAN NOT NULL DEFAULT FALSE,
  can_claim_clean_build BOOLEAN NOT NULL DEFAULT FALSE,
  can_claim_world_class_live BOOLEAN NOT NULL DEFAULT FALSE,
  can_operator_approve_production BOOLEAN NOT NULL DEFAULT FALSE,
  receipt_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pass2894_no_production_go_without_all_receipts CHECK (
    approval_mode <> 'GO_FOR_PRODUCTION_RELEASE'
    OR (
      npm_ci_exit0_log
      AND typecheck_exit0_log
      AND next_build_exit0_log
      AND playwright_html_report
      AND shield_rows_gt_10_png_dom_json
      AND shield_no_forced_first_row_highlight_dom_json
      AND shield_desktop_mobile_chart_skeleton_png
      AND realmarkets_icon_lanes_png_dom_json
      AND realmarkets_no_grey_underlay_png_dom_json
      AND btc_shield_basic_pro_advanced_pdf_hash_json
      AND aapl_realmarkets_basic_pro_advanced_pdf_hash_json
      AND advanced_entitlement_server_receipt
      AND stripe_blik_wallet_test_mode_receipts
      AND provider_freshness_timeout_fallback_quorum_json
      AND mobile_safe_area_scroll_lock_screenshots
      AND operator_signed_go_no_go_json
      AND can_claim_clean_typecheck
      AND can_claim_clean_build
      AND can_claim_world_class_live
      AND can_operator_approve_production
    )
  )
);
