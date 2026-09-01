-- PASS2896: Tamper-proof release ledger contract.
-- Purpose: production GO cannot be approved from mutable/stale evidence.

create table if not exists market_integrity_tamper_proof_release_ledger_gates (
  id text primary key,
  pass integer not null default 2896,
  previous_pass integer not null default 2895,
  approval_mode text not null default 'NO_GO',
  ledger_digest text,
  required_hash_algorithm text not null default 'sha256',
  append_only boolean not null default true,
  reject_if_hash_missing boolean not null default true,
  reject_if_receipt_mutated_after_signing boolean not null default true,
  reject_if_ledger_rewritten boolean not null default true,
  can_claim_clean_typecheck boolean not null default false,
  can_claim_clean_build boolean not null default false,
  can_claim_worldclass_live boolean not null default false,
  required_receipt_hash_count integer not null default 11,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into market_integrity_tamper_proof_release_ledger_gates (
  id,
  approval_mode,
  ledger_digest,
  required_hash_algorithm,
  append_only,
  reject_if_hash_missing,
  reject_if_receipt_mutated_after_signing,
  reject_if_ledger_rewritten,
  can_claim_clean_typecheck,
  can_claim_clean_build,
  can_claim_worldclass_live,
  required_receipt_hash_count
)
values (
  'pass2896_no_production_go_without_tamper_proof_hash_ledger',
  'NO_GO',
  null,
  'sha256',
  true,
  true,
  true,
  true,
  false,
  false,
  false,
  11
)
on conflict (id) do update set
  approval_mode = excluded.approval_mode,
  required_hash_algorithm = excluded.required_hash_algorithm,
  append_only = excluded.append_only,
  reject_if_hash_missing = excluded.reject_if_hash_missing,
  reject_if_receipt_mutated_after_signing = excluded.reject_if_receipt_mutated_after_signing,
  reject_if_ledger_rewritten = excluded.reject_if_ledger_rewritten,
  can_claim_clean_typecheck = excluded.can_claim_clean_typecheck,
  can_claim_clean_build = excluded.can_claim_clean_build,
  can_claim_worldclass_live = excluded.can_claim_worldclass_live,
  required_receipt_hash_count = excluded.required_receipt_hash_count,
  updated_at = now();
