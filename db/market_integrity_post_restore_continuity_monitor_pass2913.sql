-- PASS2913 — Post-Restore Continuity Monitor / Public Trust Drift Sentinel Gate
create table if not exists market_integrity_post_restore_continuity_monitor_gates (
  id text primary key,
  pass integer not null default 2913,
  production_decision text not null default 'NO_GO',
  public_claim_status text not null default 'NO_GO_PUBLIC_RECEIPTS_REQUIRED',
  trust_restore_handover_status text not null default 'NO_GO_TRUST_RESTORE_HANDOVER_REQUIRED',
  post_restore_continuity_status text not null default 'NO_GO_POST_RESTORE_CONTINUITY_MONITOR_REQUIRED',
  public_trust_drift_status text not null default 'NO_GO_PUBLIC_TRUST_DRIFT_SENTINEL_REQUIRED',
  can_sustain_restored_trust boolean not null default false,
  can_show_green_production_badge boolean not null default false,
  can_claim_world_class_live boolean not null default false,
  can_auto_sustain_after_trust_restore boolean not null default false,
  fresh_continuity_receipt_rollup_required boolean not null default true,
  restored_status_expiry_policy_required boolean not null default true,
  public_trust_drift_sentinel_required boolean not null default true,
  customer_visible_rollback_path_required boolean not null default true,
  operator_continuity_attestation_required boolean not null default true,
  append_only_post_restore_history_required boolean not null default true,
  restore_continuity_window_hours integer not null default 168,
  claim_expiry_minutes integer not null default 1440,
  missing_receipts jsonb not null default '["pass2912_trust_restore_handover_digest","shield_post_restore_continuity_receipt","realmarkets_post_restore_continuity_receipt","pdf_tier_post_restore_continuity_receipt","payment_entitlement_post_restore_continuity_receipt","provider_freshness_post_restore_continuity_receipt","restored_status_expiry_policy","customer_visible_rollback_path","operator_continuity_attestation"]'::jsonb,
  created_at timestamptz not null default now()
);

insert into market_integrity_post_restore_continuity_monitor_gates (id)
values ('pass2913_no_go_without_post_restore_continuity_monitor')
on conflict (id) do nothing;
