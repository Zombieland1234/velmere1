-- PASS2851 Customer Export Archive Retention / Legal Hold / Deletion Boundary
-- Contract-only SQL plan. Production rollout still requires migrations, RLS, worker leases and storage lifecycle proof.

create table if not exists market_integrity_customer_export_archive_retention_decisions (
  id text primary key,
  archive_bundle_id text not null,
  archive_manifest_hash text not null,
  retention_policy_id text not null,
  retention_class text not null check (retention_class in ('standard_report','advanced_review','support_attachment','legal_hold')),
  legal_hold_status_receipt_id text not null,
  legal_hold_active boolean not null default false,
  customer_deletion_request_id text,
  deletion_eligibility_receipt_id text not null,
  retention_timer_receipt_id text not null,
  scheduled_purge_at timestamptz not null,
  archive_tombstone_id text not null,
  archive_access_revocation_receipt_id text not null,
  customer_access_index_update_receipt_id text not null,
  operator_retention_signoff_receipt_id text not null,
  retention_deletion_timeline_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists market_integrity_customer_export_archive_channel_purge_receipts (
  id text primary key,
  retention_decision_id text not null references market_integrity_customer_export_archive_retention_decisions(id),
  channel text not null check (channel in ('account_vault','email','api','support')),
  purge_receipt_id text not null,
  archived_bundle_reference_id text not null,
  revoked_access_reference_id text not null,
  purged_at timestamptz not null,
  unique (retention_decision_id, channel)
);

create index if not exists idx_mi_customer_export_archive_retention_bundle
  on market_integrity_customer_export_archive_retention_decisions (archive_bundle_id);

create index if not exists idx_mi_customer_export_archive_retention_legal_hold
  on market_integrity_customer_export_archive_retention_decisions (legal_hold_active, scheduled_purge_at);
