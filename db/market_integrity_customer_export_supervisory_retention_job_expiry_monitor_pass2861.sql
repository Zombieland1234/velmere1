-- PASS2861 Customer Export Supervisory Retention Job / Expiry Monitor Gate
-- Prepared-only SQL contract. Production migration must be reviewed before execution.

create table if not exists market_integrity_customer_export_supervisory_retention_monitors (
  id uuid primary key default gen_random_uuid(),
  supervisory_final_close_case_id text not null,
  evidence_retention_lock_receipt_id text not null,
  retention_job_schedule_id text not null unique,
  legal_hold_aware_expiry_monitor_id text not null,
  final_close_archive_lock_verification_receipt_id text not null,
  overdue_retention_alert_receipt_id text not null,
  regulator_auditor_access_expiry_proof_id text not null,
  evidence_retention_unlock_relock_receipt_id text not null,
  retention_monitor_timeline_hash text not null,
  retention_lock_manually_bypassed boolean not null default false,
  status text not null default 'prepared',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pass2861_no_retention_lock_bypass check (retention_lock_manually_bypassed = false)
);

create table if not exists market_integrity_customer_export_supervisory_access_expiry_receipts (
  id uuid primary key default gen_random_uuid(),
  supervisory_final_close_case_id text not null,
  evidence_retention_lock_receipt_id text not null,
  channel text not null check (channel in ('secure_vault','legal','regulator','auditor','operator_console')),
  access_expiry_receipt_id text not null unique,
  access_expires_at timestamptz not null,
  expiry_enforced boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pass2861_access_expiry_enforced check (expiry_enforced = true)
);

create index if not exists idx_pass2861_supervisory_retention_monitor_case on market_integrity_customer_export_supervisory_retention_monitors(supervisory_final_close_case_id);
create index if not exists idx_pass2861_supervisory_access_expiry_case on market_integrity_customer_export_supervisory_access_expiry_receipts(supervisory_final_close_case_id);
