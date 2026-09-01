-- PASS2886 — Visible Runtime / TypeScript Strict Cluster Repair Gate
create table if not exists market_integrity_visible_runtime_typecheck_repairs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  pass integer not null default 2886,
  repair_gate text not null default 'pass2886_visible_runtime_typecheck_repair',
  strict_boolean_normalization_fix boolean not null default false,
  shield_rows_beyond_10_proof_required boolean not null default true,
  shield_neutral_chart_skeleton_required boolean not null default true,
  realmarkets_icon_chart_runtime_proof_required boolean not null default true,
  npm_ci_dry_run_prepared boolean not null default false,
  npm_ci_install_completed boolean not null default false,
  typecheck_exit_code integer,
  can_claim_clean_build boolean not null default false,
  can_claim_live_world_class boolean not null default false,
  evidence jsonb not null default '{}'::jsonb
);

comment on table market_integrity_visible_runtime_typecheck_repairs is
  'PASS2886 records strict TypeScript repairs plus Shield/Real Markets visible runtime proof requirements without claiming clean build/live production.';

alter table market_integrity_visible_runtime_typecheck_repairs
  add constraint pass2886_no_live_claim_without_build check (can_claim_live_world_class = false or (npm_ci_install_completed = true and typecheck_exit_code = 0));
