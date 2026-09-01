create table if not exists market_integrity_remediation_execution_closure_gates (
  id uuid primary key default gen_random_uuid(),
  release_candidate text not null,
  pass integer not null default 2910,
  previous_public_resolution_gate text not null,
  default_production_decision text not null default 'NO_GO',
  remediation_execution_status text not null default 'NO_GO_REMEDIATION_EXECUTION_CLOSURE_REQUIRED',
  verified_closure_status text not null default 'NO_GO_VERIFIED_RETEST_CLOSURE_REQUIRED',
  public_resolution_seal_digest text,
  remediation_ticket_bundle_sha256 text,
  patch_commit_bundle_sha256 text,
  shield_post_patch_retest_sha256 text,
  realmarkets_post_patch_retest_sha256 text,
  pdf_tier_post_patch_retest_sha256 text,
  payment_entitlement_post_patch_retest_sha256 text,
  provider_freshness_post_patch_retest_sha256 text,
  customer_closure_notice_sha256 text,
  rollback_guard_receipt_sha256 text,
  operator_signature_sha256 text,
  can_show_green_production_badge boolean not null default false,
  can_claim_worldclass_live boolean not null default false,
  can_close_customer_case boolean not null default false,
  can_use_arbitration_text_as_fix_proof boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pass2910_no_go_without_verified_remediation_closure
    check (
      pass = 2910
      and default_production_decision = 'NO_GO'
      and can_show_green_production_badge = false
      and can_claim_worldclass_live = false
      and can_close_customer_case = false
      and can_use_arbitration_text_as_fix_proof = false
    )
);

comment on table market_integrity_remediation_execution_closure_gates is
  'PASS2910 remediation execution closure gate: public arbitration resolution cannot close customer status until remediation tickets, patch digests, fresh retests, closure notice and rollback guard receipts are all present.';
