-- PASS2842 Customer Export Dispute / Chargeback / Withdrawal Hold Gate
-- Purpose: freeze customer-visible export delivery even after PASS2841 acknowledgement
-- whenever payment dispute, chargeback, withdrawal reversal, policy/compliance hold,
-- customer dispute or refund-credit collision is active.

create table if not exists market_integrity_customer_export_dispute_chargeback_holds (
  id uuid primary key default gen_random_uuid(),
  export_ledger_row_id uuid,
  acknowledgement_receipt_id text not null,
  release_packet_id text not null,
  seal_id text not null,
  payload_hash text not null,
  source_receipt_root text not null,
  support_ticket_id text,
  active_hold_reason text not null check (active_hold_reason in (
    'none',
    'payment_dispute',
    'chargeback',
    'payment_withdrawal',
    'policy_violation',
    'compliance_review',
    'customer_dispute',
    'refund_credit_collision',
    'payload_source_drift'
  )),
  dispute_case_id text,
  chargeback_case_id text,
  payment_withdrawal_receipt_id text,
  policy_hold_receipt_id text,
  compliance_review_receipt_id text,
  refund_credit_receipt_id text,
  hold_opened_at timestamptz not null default now(),
  hold_expires_at timestamptz,
  hold_release_receipt_id text,
  operator_review_receipt_id text,
  can_serve_customer_visible_export boolean not null default false,
  can_send_final_email_notice boolean not null default false,
  can_expose_final_api_handoff boolean not null default false,
  can_attach_final_support_packet boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mi_customer_export_holds_payload_root
  on market_integrity_customer_export_dispute_chargeback_holds (payload_hash, source_receipt_root);

create index if not exists idx_mi_customer_export_holds_ack
  on market_integrity_customer_export_dispute_chargeback_holds (acknowledgement_receipt_id);

create index if not exists idx_mi_customer_export_holds_reason
  on market_integrity_customer_export_dispute_chargeback_holds (active_hold_reason, can_serve_customer_visible_export);

-- Release invariant:
-- can_serve_customer_visible_export may become true only when active_hold_reason='none'
-- or the hold has a hold_release_receipt_id and operator_review_receipt_id tied to
-- the same payload_hash/source_receipt_root/support_ticket_id and previous PASS2841 receipt.
