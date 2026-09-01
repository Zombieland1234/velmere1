-- PASS2912 — Post-Remediation Trust Restore / Public Handover Gate
CREATE TABLE IF NOT EXISTS market_integrity_post_remediation_trust_restore_handover_gates (
  id text PRIMARY KEY,
  pass integer NOT NULL CHECK (pass = 2912),
  production_decision text NOT NULL CHECK (production_decision = 'NO_GO'),
  trust_restore_handover_status text NOT NULL CHECK (trust_restore_handover_status = 'NO_GO_TRUST_RESTORE_HANDOVER_REQUIRED'),
  public_restore_candidate_status text NOT NULL CHECK (public_restore_candidate_status = 'NO_GO_PUBLIC_RESTORE_CANDIDATE_BLOCKED'),
  can_restore_public_status boolean NOT NULL DEFAULT false,
  can_show_green_production_badge boolean NOT NULL DEFAULT false,
  can_claim_worldclass_live boolean NOT NULL DEFAULT false,
  fresh_handover_receipt_rollup_required boolean NOT NULL DEFAULT true,
  customer_safe_restore_copy_required boolean NOT NULL DEFAULT true,
  operator_trust_restore_signature_required boolean NOT NULL DEFAULT true,
  append_only_restore_history_required boolean NOT NULL DEFAULT true,
  required_receipts jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO market_integrity_post_remediation_trust_restore_handover_gates (
  id,
  pass,
  production_decision,
  trust_restore_handover_status,
  public_restore_candidate_status,
  can_restore_public_status,
  can_show_green_production_badge,
  can_claim_worldclass_live,
  fresh_handover_receipt_rollup_required,
  customer_safe_restore_copy_required,
  operator_trust_restore_signature_required,
  append_only_restore_history_required,
  required_receipts
) VALUES (
  'pass2912_no_go_without_post_remediation_trust_restore_handover',
  2912,
  'NO_GO',
  'NO_GO_TRUST_RESTORE_HANDOVER_REQUIRED',
  'NO_GO_PUBLIC_RESTORE_CANDIDATE_BLOCKED',
  false,
  false,
  false,
  true,
  true,
  true,
  true,
  '["pass2911StabilityWatchDigest","shieldRestoreHandoverSha256","realmarketsRestoreHandoverSha256","pdfTierRestoreHandoverSha256","paymentEntitlementRestoreHandoverSha256","providerFreshnessRestoreHandoverSha256","customerSafeRestoreCopySha256","operatorTrustRestoreSignatureSha256","appendOnlyRestoreHistorySha256"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  production_decision = EXCLUDED.production_decision,
  trust_restore_handover_status = EXCLUDED.trust_restore_handover_status,
  public_restore_candidate_status = EXCLUDED.public_restore_candidate_status,
  can_restore_public_status = EXCLUDED.can_restore_public_status,
  can_show_green_production_badge = EXCLUDED.can_show_green_production_badge,
  can_claim_worldclass_live = EXCLUDED.can_claim_worldclass_live,
  required_receipts = EXCLUDED.required_receipts;
