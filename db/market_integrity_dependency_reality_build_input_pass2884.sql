create table if not exists market_integrity_dependency_reality_build_inputs (
  id text primary key,
  pass integer not null default 2884,
  state text not null,
  package_lock_present boolean not null default true,
  package_lock_hash text,
  internal_alias_compatibility_ready boolean not null default false,
  external_dependency_tree_installed boolean not null default false,
  npm_ci_receipt_id text,
  typecheck_receipt_id text,
  build_receipt_id text,
  internal_alias_error_count integer not null default 0,
  external_missing_package_count integer not null default 0,
  can_claim_clean_typecheck boolean not null default false,
  can_claim_clean_build boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pass2884_clean_typecheck_requires_install_and_receipt check (
    can_claim_clean_typecheck = false
    or (
      package_lock_present = true
      and package_lock_hash is not null
      and internal_alias_compatibility_ready = true
      and external_dependency_tree_installed = true
      and npm_ci_receipt_id is not null
      and typecheck_receipt_id is not null
      and internal_alias_error_count = 0
    )
  ),
  constraint pass2884_clean_build_requires_typecheck_and_build_receipt check (
    can_claim_clean_build = false
    or (
      can_claim_clean_typecheck = true
      and build_receipt_id is not null
    )
  )
);
