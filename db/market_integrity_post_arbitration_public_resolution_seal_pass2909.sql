-- PASS2909: Public Status Post-Arbitration Resolution Publication Seal
-- Public status cannot close after final arbitration unless public redacted copy,
-- private/public digest match, remediation mandate and post-resolution retests exist.

create table if not exists market_integrity_post_arbitration_public_resolution_seal_gates (
  id uuid primary key default gen_random_uuid(),
  release_candidate text not null,
  public_manifest_digest text not null,
  pass2908_final_arbitration_digest text not null,
  private_binding_resolution_sha256 text not null,
  public_resolution_copy_sha256 text not null,
  redaction_map_sha256 text not null,
  remediation_mandate_sha256 text not null,
  shield_post_resolution_retest_sha256 text,
  realmarkets_post_resolution_retest_sha256 text,
  pdf_tier_post_resolution_retest_sha256 text,
  payment_entitlement_post_resolution_retest_sha256 text,
  provider_freshness_post_resolution_retest_sha256 text,
  customer_history_append_entry_sha256 text not null,
  public_status text not null default 'NO_GO_PUBLIC_RESOLUTION_SEAL_REQUIRED',
  remediation_status text not null default 'NO_GO_REMEDIATION_RETEST_REQUIRED',
  can_show_green_badge boolean not null default false,
  can_claim_world_class_live boolean not null default false,
  can_publish_without_private_digest_match boolean not null default false,
  can_close_remediation_without_retest boolean not null default false,
  can_rewrite_customer_history boolean not null default false,
  signed_by_operator text,
  signed_by_arbitration_owner text,
  created_at timestamptz not null default now(),
  constraint pass2909_no_public_resolution_without_digest_bound_redaction check (
    public_status = 'NO_GO_PUBLIC_RESOLUTION_SEAL_REQUIRED'
    or (
      length(pass2908_final_arbitration_digest) >= 32
      and length(private_binding_resolution_sha256) >= 32
      and length(public_resolution_copy_sha256) >= 32
      and length(redaction_map_sha256) >= 32
      and can_publish_without_private_digest_match = false
    )
  ),
  constraint pass2909_no_green_badge_without_post_resolution_retests check (
    can_show_green_badge = false
    and can_claim_world_class_live = false
  ),
  constraint pass2909_no_remediation_close_without_retests check (
    can_close_remediation_without_retest = false
    and remediation_status = 'NO_GO_REMEDIATION_RETEST_REQUIRED'
  ),
  constraint pass2909_customer_history_append_only check (can_rewrite_customer_history = false)
);
