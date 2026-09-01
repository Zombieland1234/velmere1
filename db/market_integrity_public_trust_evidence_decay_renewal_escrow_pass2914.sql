-- PASS2914 — Public Trust Evidence Decay / Renewal Escrow Gate
create table if not exists market_integrity_public_trust_evidence_decay_renewal_escrow_gates (
  id text primary key,
  pass integer not null default 2914,
  production_decision text not null default 'NO_GO',
  public_claim_status text not null default 'NO_GO_PUBLIC_RECEIPTS_REQUIRED',
  post_restore_continuity_status text not null default 'NO_GO_POST_RESTORE_CONTINUITY_MONITOR_REQUIRED',
  public_trust_evidence_decay_status text not null default 'NO_GO_PUBLIC_TRUST_EVIDENCE_DECAY_RENEWAL_REQUIRED',
  renewal_escrow_status text not null default 'NO_GO_RENEWAL_ESCROW_REQUIRED',
  can_sustain_public_trust boolean not null default false,
  can_show_green_production_badge boolean not null default false,
  can_claim_world_class_live boolean not null default false,
  can_auto_renew_public_trust boolean not null default false,
  can_use_stable_status_alone_as_fresh_proof boolean not null default false,
  fresh_renewal_receipt_rollup_required boolean not null default true,
  receipt_age_matrix_required boolean not null default true,
  renewal_escrow_digest_required boolean not null default true,
  customer_visible_degraded_status_required boolean not null default true,
  operator_renewal_attestation_required boolean not null default true,
  append_only_evidence_decay_history_required boolean not null default true,
  evidence_max_age_minutes integer not null default 1440,
  renewal_escrow_window_hours integer not null default 72,
  missing_receipts jsonb not null default '["pass2913_post_restore_continuity_digest","shield_evidence_age_renewal_receipt","realmarkets_evidence_age_renewal_receipt","pdf_tier_evidence_age_renewal_receipt","payment_entitlement_evidence_age_renewal_receipt","provider_freshness_evidence_age_renewal_receipt","receipt_age_matrix","renewal_escrow_digest","customer_visible_degraded_status","operator_renewal_attestation"]'::jsonb,
  created_at timestamptz not null default now(),
  constraint pass2914_no_go_without_public_trust_evidence_decay_renewal check (production_decision = 'NO_GO'),
  constraint pass2914_no_green_without_renewal_escrow check (can_show_green_production_badge = false),
  constraint pass2914_no_auto_renew_public_trust check (can_auto_renew_public_trust = false)
);

insert into market_integrity_public_trust_evidence_decay_renewal_escrow_gates (id)
values ('pass2914_no_go_without_public_trust_evidence_decay_renewal_escrow')
on conflict (id) do nothing;
