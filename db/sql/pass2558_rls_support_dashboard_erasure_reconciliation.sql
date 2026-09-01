-- PASS2558 RLS support dashboard / erasure reconciliation skeleton.
-- Raw payment/contact/webhook/DSAR fields are intentionally excluded from customer and operator-visible tables.
create table if not exists retention_capsules (
  id text primary key,
  account_id uuid not null,
  account_id_hash text not null,
  support_case_id text not null,
  state text not null,
  customer_safe_notice_hash text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz
);
create table if not exists purge_jobs (
  id text primary key,
  support_case_id text not null,
  purge_job_receipt_hash text not null,
  purge_dry_run_hash text not null,
  customer_deletion_timeline_hash text not null,
  state text not null,
  audit_event_hash text not null,
  created_at timestamptz default now()
);
create table if not exists worker_runs (
  id text primary key,
  support_case_id text not null,
  worker_dry_run_receipt_hash text not null,
  retry_backoff_receipt_hash text not null,
  dead_letter_queue_id text not null,
  state text not null,
  no_raw_payload boolean not null default true
);
create table if not exists legal_hold_dsar_gates (
  id text primary key,
  support_case_id text not null,
  legal_hold_state text not null,
  dsar_erasure_request_hash text not null,
  conflict_review_queue_id text not null,
  customer_safe_conflict_notice_hash text not null,
  second_approver_receipt_hash text
);
create table if not exists provider_erasure_webhooks (
  id text primary key,
  support_case_id text not null,
  provider_erasure_webhook_hash text not null,
  provider_ack_reconciliation_hash text not null,
  provider_retry_backoff_hash text not null,
  state text not null,
  no_raw_provider_payload boolean not null default true
);
create table if not exists support_dashboard_audit_events (
  id text primary key,
  operator_id uuid not null,
  support_case_id text not null,
  reason_code text not null,
  expiry_at timestamptz not null,
  audit_event_hash text not null,
  second_approver_receipt_hash text
);
alter table retention_capsules enable row level security;
alter table purge_jobs enable row level security;
alter table worker_runs enable row level security;
alter table legal_hold_dsar_gates enable row level security;
alter table provider_erasure_webhooks enable row level security;
alter table support_dashboard_audit_events enable row level security;
