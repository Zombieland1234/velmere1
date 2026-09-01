-- PASS2873 Customer Export Supervisory Post-Reclose Regression SLO Gate
-- Static schema contract for the post-reclose watch/SLO boundary.

CREATE TABLE IF NOT EXISTS market_integrity_customer_export_supervisory_post_reclose_regression_slos (
  id TEXT PRIMARY KEY,
  release_packet_id TEXT NOT NULL,
  previous_reclose_receipt_id TEXT NOT NULL,
  corrected_evidence_index_id TEXT NOT NULL,
  corrected_evidence_index_hash TEXT NOT NULL,
  post_reclose_watch_receipt_id TEXT NOT NULL,
  post_reclose_watch_window_hours INTEGER NOT NULL CHECK (post_reclose_watch_window_hours > 0),
  corrected_index_reseal_receipt_id TEXT NOT NULL,
  regression_slo_policy_id TEXT NOT NULL,
  regression_slo_max_repeat_incidents INTEGER NOT NULL DEFAULT 0 CHECK (regression_slo_max_repeat_incidents >= 0),
  regression_signal_review_receipt_id TEXT NOT NULL,
  repeated_incident_escalation_ticket_id TEXT,
  recurrence_freeze_receipt_id TEXT,
  archive_close_freeze_receipt_id TEXT,
  export_channel_freeze_receipt_id TEXT,
  customer_notice_escalation_receipt_id TEXT,
  regulator_notice_escalation_receipt_id TEXT,
  auditor_notice_escalation_receipt_id TEXT,
  legal_signoff_receipt_id TEXT NOT NULL,
  security_signoff_receipt_id TEXT NOT NULL,
  privacy_signoff_receipt_id TEXT NOT NULL,
  post_reclose_regression_payload_hash TEXT NOT NULL,
  post_reclose_regression_timeline_hash TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pass2873_repeated_incident_requires_escalation_and_freeze CHECK (
    state != 'repeat_regression_detected'
    OR (
      repeated_incident_escalation_ticket_id IS NOT NULL
      AND recurrence_freeze_receipt_id IS NOT NULL
      AND archive_close_freeze_receipt_id IS NOT NULL
      AND export_channel_freeze_receipt_id IS NOT NULL
      AND customer_notice_escalation_receipt_id IS NOT NULL
      AND regulator_notice_escalation_receipt_id IS NOT NULL
      AND auditor_notice_escalation_receipt_id IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_pass2873_post_reclose_regression_release_packet
  ON market_integrity_customer_export_supervisory_post_reclose_regression_slos (release_packet_id);
