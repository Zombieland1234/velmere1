-- PASS2856 — Customer Export DSAR Appeal Resolution / Final Privacy Closure Gate
-- Purpose: close the post-DSAR appeal/reopen privacy case only after a reviewable decision,
-- corrected packet delivery where needed, final customer response and no-residual obligation proof.

create table if not exists market_integrity_customer_export_dsr_appeal_resolution_closures (
  id uuid primary key default gen_random_uuid(),
  release_packet_id text not null,
  seal_id text not null,
  dsr_delivery_appeal_case_id text not null,
  customer_id text not null,
  tier text not null check (tier in ('Basic', 'Pro', 'Advanced')),
  customer_appeal_requested boolean not null default false,
  appeal_case_intake_receipt_id text,
  appeal_resolution_decision text not null check (appeal_resolution_decision in ('no_appeal', 'accepted_corrected_packet', 'partially_accepted_corrected_packet', 'rejected_original_packet_valid', 'customer_withdrawn')),
  appeal_resolution_decision_receipt_id text,
  corrected_dsr_packet_id text,
  corrected_redaction_manifest_hash text,
  corrected_packet_supersedes_packet_id text,
  customer_final_response_receipt_id text not null,
  final_privacy_closure_receipt_id text not null,
  no_residual_privacy_obligation_receipt_id text not null,
  privacy_case_audit_timeline_hash text not null,
  payload_hash text not null,
  source_receipt_root text not null,
  can_claim_final_privacy_case_closure boolean not null default false,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (release_packet_id, dsr_delivery_appeal_case_id)
);

create table if not exists market_integrity_customer_export_dsr_appeal_resolution_channel_receipts (
  id uuid primary key default gen_random_uuid(),
  dsr_appeal_resolution_closure_id uuid not null references market_integrity_customer_export_dsr_appeal_resolution_closures(id) on delete cascade,
  channel text not null check (channel in ('account_vault', 'email', 'api', 'support', 'customer_portal')),
  resolution_delivery_receipt_id text not null,
  payload_hash text not null,
  redaction_manifest_hash text not null,
  delivered_at timestamptz not null,
  customer_acknowledged boolean not null default false,
  corrected_packet boolean not null default false,
  unique (dsr_appeal_resolution_closure_id, channel, resolution_delivery_receipt_id)
);

create index if not exists idx_customer_export_dsr_appeal_resolution_closures_release_packet
  on market_integrity_customer_export_dsr_appeal_resolution_closures(release_packet_id);

create index if not exists idx_customer_export_dsr_appeal_resolution_closures_customer
  on market_integrity_customer_export_dsr_appeal_resolution_closures(customer_id, created_at desc);

create index if not exists idx_customer_export_dsr_appeal_resolution_channel_receipts_closure
  on market_integrity_customer_export_dsr_appeal_resolution_channel_receipts(dsr_appeal_resolution_closure_id);
