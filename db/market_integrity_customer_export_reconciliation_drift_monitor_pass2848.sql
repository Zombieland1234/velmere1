-- PASS2848 Customer Export Reconciliation Drift Monitor Gate
-- Purpose: durable post-delivery reconciliation snapshots for customer export ledger/outbox/storage/customer receipts/channel commits.

CREATE TABLE IF NOT EXISTS market_integrity_customer_export_reconciliations (
  reconciliation_run_id TEXT PRIMARY KEY,
  export_packet_id TEXT NOT NULL,
  delivery_ledger_row_id TEXT NOT NULL,
  recovery_run_id TEXT NOT NULL,
  expected_payload_hash TEXT NOT NULL,
  expected_source_receipt_root TEXT NOT NULL,
  observed_payload_hash TEXT,
  observed_source_receipt_root TEXT,
  ledger_snapshot_id TEXT NOT NULL,
  outbox_snapshot_id TEXT NOT NULL,
  storage_snapshot_id TEXT NOT NULL,
  customer_receipt_snapshot_id TEXT NOT NULL,
  channel_commit_snapshot_id TEXT NOT NULL,
  drift_mismatch_count INTEGER NOT NULL DEFAULT 0,
  drift_remediation_ticket_id TEXT,
  reconciliation_audit_timeline_hash TEXT NOT NULL,
  last_reconciled_at TIMESTAMPTZ NOT NULL,
  next_reconcile_due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','reconciled','drift_blocked','remediation_open','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_integrity_customer_export_channel_reconciliation_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  reconciliation_run_id TEXT NOT NULL REFERENCES market_integrity_customer_export_reconciliations(reconciliation_run_id),
  channel TEXT NOT NULL CHECK (channel IN ('account_vault','email','api','support')),
  ledger_event_id TEXT NOT NULL,
  outbox_event_id TEXT NOT NULL,
  storage_object_id TEXT NOT NULL,
  customer_receipt_id TEXT NOT NULL,
  commit_receipt_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  source_receipt_root TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reconciliation_run_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_customer_export_reconciliations_packet
  ON market_integrity_customer_export_reconciliations(export_packet_id, status, next_reconcile_due_at);

CREATE INDEX IF NOT EXISTS idx_customer_export_channel_reconciliation_run
  ON market_integrity_customer_export_channel_reconciliation_snapshots(reconciliation_run_id, channel);

-- PASS2848 hard rule:
-- If expected payload/source roots differ from observed snapshots, customer-visible export channels remain frozen
-- until drift_remediation_ticket_id and reconciliation_audit_timeline_hash are appended.
