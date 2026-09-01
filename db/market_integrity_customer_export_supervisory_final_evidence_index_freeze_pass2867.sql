-- PASS2867 Customer Export Supervisory Final Evidence Index Freeze Gate
-- Contract-only SQL plan. This does not run migrations by itself.

create table if not exists market_integrity_customer_export_supervisory_final_evidence_index_freezes (
  id uuid primary key default gen_random_uuid(),
  release_packet_id text not null,
  seal_id text not null,
  final_evidence_index_id text not null,
  final_evidence_index_version text not null,
  final_evidence_index_hash text not null,
  immutable_archive_binding_hash text not null,
  freeze_lift_receipt_binding_hash text not null,
  resolution_timeline_binding_hash text not null,
  final_evidence_index_freeze_receipt_id text not null,
  mutation_attempt_monitor_receipt_id text not null,
  operator_audit_signoff_receipt_id text not null,
  legal_audit_signoff_receipt_id text not null,
  evidence_index_frozen_at timestamptz not null,
  final_evidence_index_freeze_timeline_hash text not null,
  created_at timestamptz not null default now(),
  constraint pass2867_index_freeze_requires_hashes check (
    length(final_evidence_index_hash) > 8
    and length(immutable_archive_binding_hash) > 8
    and length(freeze_lift_receipt_binding_hash) > 8
    and length(resolution_timeline_binding_hash) > 8
  ),
  constraint pass2867_index_freeze_requires_signoffs check (
    length(operator_audit_signoff_receipt_id) > 4
    and length(legal_audit_signoff_receipt_id) > 4
  )
);

create table if not exists market_integrity_customer_export_supervisory_final_evidence_index_mutation_attempts (
  id uuid primary key default gen_random_uuid(),
  final_evidence_index_id text not null,
  attempted_action text not null,
  attempted_by_pseudonym text,
  attempted_at timestamptz not null default now(),
  mutation_attempt_receipt_id text not null,
  blocked boolean not null default true,
  reason_hash text not null,
  created_at timestamptz not null default now(),
  constraint pass2867_mutation_attempts_must_be_blocked check (blocked = true),
  constraint pass2867_mutation_attempts_need_receipt check (length(mutation_attempt_receipt_id) > 4 and length(reason_hash) > 8)
);

create index if not exists idx_pass2867_final_evidence_index_freezes_packet
  on market_integrity_customer_export_supervisory_final_evidence_index_freezes (release_packet_id, final_evidence_index_id, final_evidence_index_version);

create index if not exists idx_pass2867_final_evidence_index_mutation_attempts
  on market_integrity_customer_export_supervisory_final_evidence_index_mutation_attempts (final_evidence_index_id, attempted_at desc);
