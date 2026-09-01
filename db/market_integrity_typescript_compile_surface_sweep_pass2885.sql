-- PASS2885 — TypeScript Compile Surface Sweep / First True Code Defect Gate
create table if not exists market_integrity_typescript_compile_surface_sweeps (
  id text primary key,
  created_at timestamptz not null default now(),
  pass integer not null default 2885,
  package_lock_hash text,
  npm_ci_receipt_id text,
  internal_import_graph_digest_id text not null,
  missing_internal_import_count integer not null default 0,
  repaired_true_code_defects text[] not null default '{}',
  typecheck_exit_code integer,
  external_dependency_tree_installed boolean not null default false,
  clean_typecheck_receipt_id text,
  clean_build_receipt_id text,
  production_claim_allowed boolean not null default false,
  digest_payload_hash text not null,
  timeline_hash text not null,
  constraint pass2885_internal_imports_must_be_clean check (missing_internal_import_count = 0),
  constraint pass2885_clean_typecheck_requires_install_and_receipt check (
    clean_typecheck_receipt_id is null or external_dependency_tree_installed = true
  ),
  constraint pass2885_clean_build_requires_typecheck_and_receipt check (
    clean_build_receipt_id is null or clean_typecheck_receipt_id is not null
  ),
  constraint pass2885_production_claim_requires_clean_build check (
    production_claim_allowed = false or (clean_typecheck_receipt_id is not null and clean_build_receipt_id is not null)
  )
);

comment on table market_integrity_typescript_compile_surface_sweeps is
'PASS2885 separates external dependency missing-tree noise from true TypeScript code defects and blocks production claims until npm ci/typecheck/build receipts exist.';
