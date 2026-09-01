-- PASS2897 — Release Attestation Verifier Gate
-- Default state remains NO_GO until PASS2896 tamper ledger, all receipt families and the operator signature are independently verified.

create table if not exists market_integrity_release_attestation_verifier_gates (
  id text primary key,
  pass integer not null default 2897,
  default_production_decision text not null default 'NO_GO',
  previous_tamper_ledger text not null,
  attestation_digest text,
  required_attestation_count integer not null,
  missing_attestation_count integer not null,
  can_claim_clean_typecheck boolean not null default false,
  can_claim_clean_build boolean not null default false,
  can_claim_worldclass_live boolean not null default false,
  can_operator_approve_production boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pass2897_no_production_go_without_release_attestation check (
    default_production_decision = 'NO_GO'
    and can_claim_clean_typecheck = false
    and can_claim_clean_build = false
    and can_claim_worldclass_live = false
    and can_operator_approve_production = false
  )
);
