-- PASS2843 Customer Export Operator Release / Reinstatement Gate
-- Purpose: prevent frozen customer export links from silently reactivating after disputes/chargebacks/withdrawals/policy/compliance holds.

create table if not exists market_integrity_customer_export_operator_release_reinstatements (
  id uuid primary key default gen_random_uuid(),
  release_packet_id text not null,
  seal_id text not null,
  export_packet_id text not null,
  payload_hash text not null,
  source_receipt_root text not null,
  previous_hold_release_receipt_id text,
  previous_operator_review_receipt_id text,
  operator_release_receipt_id text not null,
  senior_operator_countersignature_id text not null,
  finance_close_receipt_id text not null,
  compliance_close_receipt_id text not null,
  support_resolution_receipt_id text not null,
  customer_reinstatement_notice_receipt_id text not null,
  reissued_export_link_id text not null,
  channel_reinstatement_receipt_id text not null,
  reinstatement_dedup_key text not null unique,
  release_decision text not null check (release_decision in ('reinstate_account_download','reinstate_email_notice','reinstate_api_handoff','reinstate_support_attachment','reinstate_all_channels','deny_reinstatement')),
  cooling_window_ends_at timestamptz,
  reinstatement_state text not null default 'release_requested',
  duplicate_reinstatement_blocked boolean not null default false,
  payload_or_source_root_drift boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mi_customer_export_operator_release_packet
  on market_integrity_customer_export_operator_release_reinstatements (release_packet_id, seal_id);

create index if not exists idx_mi_customer_export_operator_release_payload
  on market_integrity_customer_export_operator_release_reinstatements (payload_hash, source_receipt_root);

comment on table market_integrity_customer_export_operator_release_reinstatements is
  'PASS2843 append-only operator release/reinstatement ledger: frozen export links do not resume without senior countersignature, finance/compliance/support close, customer notice and new channel receipts.';
