-- PASS2871 Customer Export Supervisory Post-Closure Mutation Watch / Auto-Freeze Gate
CREATE TABLE IF NOT EXISTS market_integrity_customer_export_supervisory_post_closure_mutation_watch_auto_freezes (
  id TEXT PRIMARY KEY,
  final_closure_audit_index_id TEXT NOT NULL,
  final_closure_audit_index_hash TEXT NOT NULL,
  post_closure_watch_receipt_id TEXT NOT NULL,
  post_closure_watch_window_hours INTEGER NOT NULL CHECK (post_closure_watch_window_hours > 0),
  mutation_signal_review_receipt_id TEXT NOT NULL,
  mutation_signal_count INTEGER NOT NULL DEFAULT 0,
  auto_freeze_receipt_id TEXT,
  archive_close_freeze_receipt_id TEXT,
  export_channel_freeze_receipt_id TEXT,
  mutation_incident_ticket_id TEXT,
  mutation_incident_owner_pseudonym TEXT,
  mutation_incident_sla_due_at TIMESTAMPTZ,
  customer_notice_decision_receipt_id TEXT NOT NULL,
  regulator_notice_decision_receipt_id TEXT NOT NULL,
  auditor_notice_decision_receipt_id TEXT NOT NULL,
  post_closure_watch_payload_hash TEXT NOT NULL,
  post_closure_watch_timeline_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pass2871_post_closure_watch_index
  ON market_integrity_customer_export_supervisory_post_closure_mutation_watch_auto_freezes(final_closure_audit_index_id);

ALTER TABLE market_integrity_customer_export_supervisory_post_closure_mutation_watch_auto_freezes
  ADD CONSTRAINT pass2871_no_silent_post_closure_mutation
  CHECK (
    mutation_signal_count = 0 OR (
      auto_freeze_receipt_id IS NOT NULL AND
      archive_close_freeze_receipt_id IS NOT NULL AND
      export_channel_freeze_receipt_id IS NOT NULL AND
      mutation_incident_ticket_id IS NOT NULL AND
      mutation_incident_owner_pseudonym IS NOT NULL AND
      mutation_incident_sla_due_at IS NOT NULL
    )
  );
