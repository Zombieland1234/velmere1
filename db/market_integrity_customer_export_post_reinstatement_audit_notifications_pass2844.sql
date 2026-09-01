-- PASS2844 customer export post-reinstatement audit notification gate
-- Durable schema plan only; migrations must be reviewed before production execution.
create table if not exists market_integrity_customer_export_post_reinstatement_audit_notifications (
  id uuid primary key default gen_random_uuid(),
  export_ledger_row_id uuid,
  release_packet_id text not null,
  seal_id text not null,
  reinstated_export_audit_id text not null,
  operator_post_release_audit_receipt_id text not null,
  customer_notification_dispatch_receipt_id text not null,
  customer_notification_open_receipt_id text,
  customer_notification_content_hash text not null,
  notification_channel text not null check (notification_channel in ('account_vault','email_notice','api_handoff','support_thread','multi_channel')),
  channel_binding_receipt_id text not null,
  customer_account_hash text not null,
  payload_hash_bound text not null,
  source_receipt_root_bound text not null,
  delivery_audit_timeline_hash text not null,
  reissued_export_link_id text not null,
  previous_operator_release_receipt_id text not null,
  previous_channel_reinstatement_receipt_id text not null,
  incident_no_conflict_receipt_id text not null,
  retention_snapshot_id text not null,
  notification_content_mismatch boolean not null default false,
  payload_or_source_root_drift boolean not null default false,
  post_reinstatement_state text not null,
  created_at timestamptz not null default now(),
  unique (release_packet_id, customer_notification_dispatch_receipt_id),
  unique (reissued_export_link_id, delivery_audit_timeline_hash)
);

create index if not exists idx_mi_export_post_reinstatement_notice_release_packet
  on market_integrity_customer_export_post_reinstatement_audit_notifications (release_packet_id, created_at desc);

create index if not exists idx_mi_export_post_reinstatement_notice_customer
  on market_integrity_customer_export_post_reinstatement_audit_notifications (customer_account_hash, created_at desc);

create index if not exists idx_mi_export_post_reinstatement_notice_channel
  on market_integrity_customer_export_post_reinstatement_audit_notifications (notification_channel, created_at desc);
