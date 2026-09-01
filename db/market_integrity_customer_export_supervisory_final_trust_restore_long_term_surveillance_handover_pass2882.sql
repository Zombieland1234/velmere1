-- PASS2882 Customer Export Supervisory Final Trust Restore / Long-Term Surveillance Handover Gate
create table if not exists market_integrity_customer_export_supervisory_final_trust_restore_long_term_surveillance_handovers (
  id text primary key,
  release_packet_id text not null,
  previous_probation_case_id text not null,
  final_trust_restore_case_id text not null,
  final_trust_restore_owner_id text not null,
  final_trust_restore_sla_receipt_id text not null,
  final_trust_ledger_receipt_id text not null,
  final_trust_ledger_hash text not null,
  archive_channel_custody_receipt_id text not null,
  export_channel_custody_receipt_id text not null,
  delivery_channel_custody_receipt_id text not null,
  long_term_surveillance_owner_id text not null,
  long_term_surveillance_schedule_hash text not null,
  long_term_surveillance_heartbeat_receipt_id text not null,
  post_restore_drift_probe_receipt_id text not null,
  reviewed_handover_signals jsonb not null default '[]'::jsonb,
  handover_decision text not null check (handover_decision in ('promote_to_long_term_surveillance','return_to_post_reseal_probation','emergency_refreeze','reopen_supervisory_investigation')),
  return_to_probation_receipt_id text,
  emergency_refreeze_receipt_id text,
  reopened_supervisory_investigation_ticket_id text,
  customer_final_trust_notice_receipt_id text not null,
  regulator_final_trust_notice_receipt_id text not null,
  auditor_final_trust_notice_receipt_id text not null,
  internal_final_trust_notice_receipt_id text not null,
  legal_signoff_receipt_id text not null,
  security_signoff_receipt_id text not null,
  privacy_signoff_receipt_id text not null,
  final_trust_restore_payload_hash text not null,
  final_trust_restore_timeline_hash text not null,
  created_at timestamptz not null default now(),
  constraint pass2882_final_trust_ledger_requires_hash check (length(final_trust_ledger_hash) > 0),
  constraint pass2882_channel_custody_requires_all_receipts check (archive_channel_custody_receipt_id <> '' and export_channel_custody_receipt_id <> '' and delivery_channel_custody_receipt_id <> ''),
  constraint pass2882_long_term_surveillance_requires_heartbeat check (long_term_surveillance_owner_id <> '' and long_term_surveillance_schedule_hash <> '' and long_term_surveillance_heartbeat_receipt_id <> ''),
  constraint pass2882_return_to_probation_requires_receipt check (handover_decision <> 'return_to_post_reseal_probation' or return_to_probation_receipt_id is not null),
  constraint pass2882_emergency_refreeze_requires_receipt check (handover_decision <> 'emergency_refreeze' or emergency_refreeze_receipt_id is not null),
  constraint pass2882_reopen_requires_ticket check (handover_decision <> 'reopen_supervisory_investigation' or reopened_supervisory_investigation_ticket_id is not null),
  constraint pass2882_notice_signoff_payload_timeline_required check (
    customer_final_trust_notice_receipt_id <> '' and regulator_final_trust_notice_receipt_id <> '' and auditor_final_trust_notice_receipt_id <> '' and internal_final_trust_notice_receipt_id <> '' and
    legal_signoff_receipt_id <> '' and security_signoff_receipt_id <> '' and privacy_signoff_receipt_id <> '' and
    final_trust_restore_payload_hash <> '' and final_trust_restore_timeline_hash <> ''
  )
);
