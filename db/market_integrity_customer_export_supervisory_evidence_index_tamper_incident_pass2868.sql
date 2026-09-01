-- PASS2868 Customer Export Supervisory Evidence Index Tamper Incident Gate
-- Static schema contract; not applied in this artifact.

CREATE TABLE IF NOT EXISTS market_integrity_customer_export_supervisory_evidence_index_tamper_incidents (
  id TEXT PRIMARY KEY,
  final_evidence_index_id TEXT NOT NULL,
  final_evidence_index_version TEXT NOT NULL,
  final_evidence_index_hash TEXT NOT NULL,
  final_evidence_index_freeze_receipt_id TEXT NOT NULL,
  tamper_signal_receipt_id TEXT NOT NULL,
  tamper_signal_kind TEXT NOT NULL,
  tamper_incident_case_id TEXT NOT NULL UNIQUE,
  tamper_severity TEXT NOT NULL CHECK (tamper_severity IN ('low','medium','high','critical')),
  evidence_index_freeze_extension_receipt_id TEXT NOT NULL,
  supervisory_archive_close_freeze_receipt_id TEXT NOT NULL,
  incident_owner_pseudonym TEXT NOT NULL,
  incident_sla_due_at TIMESTAMPTZ NOT NULL,
  legal_review_receipt_id TEXT NOT NULL,
  security_review_receipt_id TEXT NOT NULL,
  privacy_supervisor_review_receipt_id TEXT NOT NULL,
  notice_decision_manifest_hash TEXT NOT NULL,
  final_evidence_index_version_binding_hash TEXT NOT NULL,
  tamper_incident_payload_hash TEXT NOT NULL,
  tamper_incident_timeline_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pass2868_tamper_incident_index_version
  ON market_integrity_customer_export_supervisory_evidence_index_tamper_incidents (final_evidence_index_id, final_evidence_index_version);

ALTER TABLE market_integrity_customer_export_supervisory_evidence_index_tamper_incidents
  ADD CONSTRAINT pass2868_tamper_incident_requires_index_binding
  CHECK (length(final_evidence_index_version_binding_hash) > 12 AND length(tamper_incident_timeline_hash) > 12);

ALTER TABLE market_integrity_customer_export_supervisory_evidence_index_tamper_incidents
  ADD CONSTRAINT pass2868_tamper_incident_requires_freeze_receipts
  CHECK (length(evidence_index_freeze_extension_receipt_id) > 8 AND length(supervisory_archive_close_freeze_receipt_id) > 8);
