-- PASS2874 — Customer Export Supervisory Recurrence Escalation Resolution / Hardened Rebaseline Gate
-- Purpose: repeated post-reclose regression escalation must not remain only an alert.
-- It needs a recurrence case, explicit outcome, hardened rebaseline/permanent-freeze/reopen proof and immutable timeline binding.

create table if not exists market_integrity_customer_export_supervisory_recurrence_escalation_resolution_rebaselines (
  id text primary key,
  previous_post_reclose_regression_slo_id text not null,
  recurrence_case_id text not null,
  recurrence_owner_pseudonym text not null,
  recurrence_family text not null check (recurrence_family in (
    'repeat_hash_drift',
    'repeat_channel_rebind',
    'repeat_reindex',
    'repeat_late_evidence_drift',
    'watcher_gap_recurrence',
    'mixed_recurrence'
  )),
  root_cause_hash text not null,
  impact_scope_hash text not null,
  resolution_decision text not null check (resolution_decision in (
    'hardened_rebaseline',
    'permanent_freeze',
    'reopen_supervisory_investigation'
  )),
  hardened_rebaseline_index_id text,
  hardened_rebaseline_index_version text,
  hardened_rebaseline_index_hash text,
  hardened_rebaseline_verification_receipt_id text,
  recurrence_prevention_controls_hash text,
  watcher_policy_update_receipt_id text,
  permanent_freeze_receipt_id text,
  reopened_supervisory_investigation_ticket_id text,
  customer_notice_resolution_receipt_id text not null,
  regulator_notice_resolution_receipt_id text not null,
  auditor_notice_resolution_receipt_id text not null,
  legal_signoff_receipt_id text not null,
  security_signoff_receipt_id text not null,
  privacy_signoff_receipt_id text not null,
  recurrence_resolution_payload_hash text not null,
  recurrence_resolution_timeline_hash text not null,
  created_at timestamptz not null default now(),
  constraint pass2874_hardened_rebaseline_requires_index_and_controls check (
    resolution_decision <> 'hardened_rebaseline'
    or (
      hardened_rebaseline_index_id is not null
      and hardened_rebaseline_index_version is not null
      and hardened_rebaseline_index_hash is not null
      and hardened_rebaseline_verification_receipt_id is not null
      and recurrence_prevention_controls_hash is not null
      and watcher_policy_update_receipt_id is not null
    )
  ),
  constraint pass2874_permanent_freeze_requires_receipt check (
    resolution_decision <> 'permanent_freeze'
    or permanent_freeze_receipt_id is not null
  ),
  constraint pass2874_reopened_investigation_requires_ticket check (
    resolution_decision <> 'reopen_supervisory_investigation'
    or reopened_supervisory_investigation_ticket_id is not null
  )
);

create index if not exists idx_pass2874_recurrence_case
  on market_integrity_customer_export_supervisory_recurrence_escalation_resolution_rebaselines (recurrence_case_id);

create index if not exists idx_pass2874_recurrence_decision
  on market_integrity_customer_export_supervisory_recurrence_escalation_resolution_rebaselines (resolution_decision, created_at desc);
