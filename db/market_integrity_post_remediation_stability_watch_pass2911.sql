create table if not exists market_integrity_post_remediation_stability_watch_gates (
  id uuid primary key default gen_random_uuid(),
  release_candidate text not null,
  pass integer not null default 2911,
  previous_remediation_closure_gate text not null,
  default_production_decision text not null default 'NO_GO',
  post_remediation_stability_status text not null default 'NO_GO_POST_REMEDIATION_STABILITY_WATCH_REQUIRED',
  relapse_sentinel_status text not null default 'NO_GO_RELAPSE_SENTINEL_REQUIRED',
  pass2910_verified_closure_digest text,
  shield_post_closure_watch_sha256 text,
  realmarkets_post_closure_watch_sha256 text,
  pdf_tier_post_closure_watch_sha256 text,
  payment_entitlement_post_closure_watch_sha256 text,
  provider_freshness_post_closure_watch_sha256 text,
  relapse_sentinel_digest_sha256 text,
  customer_reopen_notice_sha256 text,
  rollback_refreeze_receipt_sha256 text,
  operator_signature_sha256 text,
  can_show_green_production_badge boolean not null default false,
  can_claim_worldclass_live boolean not null default false,
  can_keep_customer_case_closed boolean not null default false,
  can_treat_closure_as_permanent boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pass2911_no_go_without_post_remediation_stability_watch
    check (
      pass = 2911
      and default_production_decision = 'NO_GO'
      and can_show_green_production_badge = false
      and can_claim_worldclass_live = false
      and can_keep_customer_case_closed = false
      and can_treat_closure_as_permanent = false
    ),
  constraint pass2911_relapse_sentinel_required_before_customer_case_stays_closed
    check (
      relapse_sentinel_status = 'NO_GO_RELAPSE_SENTINEL_REQUIRED'
      or (relapse_sentinel_digest_sha256 is not null and customer_reopen_notice_sha256 is not null)
    )
);

comment on table market_integrity_post_remediation_stability_watch_gates is
  'PASS2911 post-remediation stability watch gate: verified remediation closure remains provisional until fresh watch receipts prove stability and any relapse can refreeze public status.';
