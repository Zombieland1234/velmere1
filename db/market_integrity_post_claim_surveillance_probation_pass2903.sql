-- PASS2903 — Post-Claim Surveillance / Live Drift Probation Gate
-- This contract keeps any production/world-class-live claim probationary until fresh post-claim observation receipts prove no drift.

CREATE TABLE IF NOT EXISTS market_integrity_post_claim_surveillance_probation_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pass integer NOT NULL DEFAULT 2903,
  claim_seed_manifest text NOT NULL,
  default_production_decision text NOT NULL DEFAULT 'NO_GO',
  default_surveillance_decision text NOT NULL DEFAULT 'NO_GO_SURVEILLANCE_PROBATION_PENDING',
  can_sustain_production_certificate boolean NOT NULL DEFAULT false,
  manual_override_allowed boolean NOT NULL DEFAULT false,
  live_probation_window_required boolean NOT NULL DEFAULT true,
  live_drift_watch_required boolean NOT NULL DEFAULT true,
  receipt_retention_watch_required boolean NOT NULL DEFAULT true,
  auto_sustain_production_claim_allowed boolean NOT NULL DEFAULT false,
  missing_runtime_receipts jsonb NOT NULL DEFAULT '[]'::jsonb,
  drift_triggers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pass2903_no_sustained_go_without_surveillance CHECK (
    can_sustain_production_certificate = false
    OR (
      default_surveillance_decision = 'SURVEILLANCE_PASSED_PENDING_DUAL_CONTROL'
      AND manual_override_allowed = false
      AND live_probation_window_required = true
      AND live_drift_watch_required = true
      AND receipt_retention_watch_required = true
    )
  ),
  CONSTRAINT pass2903_no_manual_override CHECK (manual_override_allowed = false),
  CONSTRAINT pass2903_no_auto_sustain CHECK (auto_sustain_production_claim_allowed = false)
);
