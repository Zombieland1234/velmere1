-- PASS2872 Customer Export Supervisory Post-Closure Mutation Incident Resolution / Re-Close Gate
-- Contract only: adapt names/types to the production DB migration runner.

CREATE TABLE IF NOT EXISTS market_integrity_customer_export_supervisory_post_closure_mutation_incident_resolution_recloses (
  id TEXT PRIMARY KEY,
  final_closure_audit_index_id TEXT NOT NULL,
  previous_mutation_incident_ticket_id TEXT NOT NULL,
  resolution_case_id TEXT NOT NULL,
  resolution_owner_pseudonym TEXT NOT NULL,
  root_cause_hash TEXT NOT NULL,
  impact_scope_hash TEXT NOT NULL,
  corrected_evidence_index_id TEXT NOT NULL,
  corrected_evidence_index_version TEXT NOT NULL,
  corrected_evidence_index_hash TEXT NOT NULL,
  corrected_index_verification_receipt_id TEXT NOT NULL,
  resolution_decision TEXT NOT NULL CHECK (resolution_decision IN ('re_close_after_reseal', 'permanent_freeze', 'reopen_investigation')),
  reclose_receipt_id TEXT,
  permanent_freeze_receipt_id TEXT,
  reopened_investigation_ticket_id TEXT,
  customer_notice_resolution_receipt_id TEXT NOT NULL,
  regulator_notice_resolution_receipt_id TEXT NOT NULL,
  auditor_notice_resolution_receipt_id TEXT NOT NULL,
  legal_signoff_receipt_id TEXT NOT NULL,
  security_signoff_receipt_id TEXT NOT NULL,
  privacy_signoff_receipt_id TEXT NOT NULL,
  corrected_post_closure_watch_timeline_hash TEXT NOT NULL,
  resolution_payload_hash TEXT NOT NULL,
  resolution_timeline_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resolution_case_id),
  UNIQUE (resolution_payload_hash),
  UNIQUE (resolution_timeline_hash)
);

ALTER TABLE market_integrity_customer_export_supervisory_post_closure_mutation_incident_resolution_recloses
  ADD CONSTRAINT pass2872_resolution_decision_requires_matching_receipt
  CHECK (
    (resolution_decision = 're_close_after_reseal' AND reclose_receipt_id IS NOT NULL AND permanent_freeze_receipt_id IS NULL AND reopened_investigation_ticket_id IS NULL)
    OR (resolution_decision = 'permanent_freeze' AND permanent_freeze_receipt_id IS NOT NULL AND reclose_receipt_id IS NULL AND reopened_investigation_ticket_id IS NULL)
    OR (resolution_decision = 'reopen_investigation' AND reopened_investigation_ticket_id IS NOT NULL AND reclose_receipt_id IS NULL AND permanent_freeze_receipt_id IS NULL)
  );
