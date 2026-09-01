-- PASS2875 — Customer Export Supervisory Post-Rebaseline Stability Enforcement Gate
-- Purpose: make PASS2874 hardened rebaseline a monitored/enforced state, not a permanent trust claim.

create table if not exists market_integrity_customer_export_supervisory_post_rebaseline_stability_enforcements (
  id uuid primary key default gen_random_uuid(),
  recurrence_case_id text not null,
  hardened_rebaseline_index_id text not null,
  hardened_rebaseline_index_version text not null,
  hardened_rebaseline_index_hash text not null,
  post_rebaseline_watch_receipt_id text not null,
  stability_watch_policy_id text not null,
  stability_window_hours integer not null check (stability_window_hours > 0),
  monitor_heartbeat_receipt_id text not null,
  rebaseline_probe_receipt_id text not null,
  regression_budget_max_incidents integer not null default 0 check (regression_budget_max_incidents >= 0),
  observed_regression_signals jsonb not null default '[]'::jsonb,
  enforcement_decision text not null check (enforcement_decision in ('keep_hardened_rebaseline','downgrade_to_permanent_freeze','reopen_supervisory_investigation')),
  permanent_freeze_downgrade_receipt_id text,
  reopened_supervisory_investigation_ticket_id text,
  watcher_escalation_receipt_id text,
  customer_notice_receipt_id text not null,
  regulator_notice_receipt_id text not null,
  auditor_notice_receipt_id text not null,
  legal_signoff_receipt_id text not null,
  security_signoff_receipt_id text not null,
  privacy_signoff_receipt_id text not null,
  stability_enforcement_payload_hash text not null,
  stability_enforcement_timeline_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pass2875_post_rebaseline_stability_case
  on market_integrity_customer_export_supervisory_post_rebaseline_stability_enforcements (recurrence_case_id, hardened_rebaseline_index_hash);

alter table market_integrity_customer_export_supervisory_post_rebaseline_stability_enforcements
  add constraint pass2875_keep_hardened_rebaseline_requires_zero_signals
  check (enforcement_decision <> 'keep_hardened_rebaseline' or jsonb_array_length(observed_regression_signals) = 0);

alter table market_integrity_customer_export_supervisory_post_rebaseline_stability_enforcements
  add constraint pass2875_downgrade_requires_freeze_receipt
  check (enforcement_decision <> 'downgrade_to_permanent_freeze' or permanent_freeze_downgrade_receipt_id is not null);

alter table market_integrity_customer_export_supervisory_post_rebaseline_stability_enforcements
  add constraint pass2875_reopen_requires_investigation_ticket
  check (enforcement_decision <> 'reopen_supervisory_investigation' or reopened_supervisory_investigation_ticket_id is not null);
