-- PASS2895 - Receipt freshness quarantine gate
-- Production GO must reject stale, copied, missing or undersized receipts.

create table if not exists market_integrity_receipt_freshness_quarantine_gates (
  id uuid primary key default gen_random_uuid(),
  pass integer not null check (pass = 2895),
  receipt_family text not null,
  receipt_file text not null,
  min_size_bytes integer not null,
  max_age_hours integer not null,
  must_be_generated_after_pass integer not null,
  quarantine_if_missing boolean not null default true,
  quarantine_if_stale boolean not null default true,
  quarantine_if_copied_from_previous_pass boolean not null default true,
  required_for_production_go boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table market_integrity_receipt_freshness_quarantine_gates is
  'PASS2895: pass-specific receipt freshness quarantine. Production GO is forbidden until fresh npm ci/typecheck/build/browser/PDF/payment/provider/operator receipts are present.';

create or replace view pass2895_no_production_go_with_stale_or_copied_receipts as
select
  2895 as pass,
  'NO_GO' as default_approval_mode,
  false as can_claim_clean_typecheck,
  false as can_claim_clean_build,
  false as can_claim_worldclass_live,
  false as can_operator_approve_production,
  'Stale, copied, missing or undersized receipts remain quarantined until regenerated for PASS2895.' as hard_rule;
