-- PASS2887 — Visible Runtime UX Proof / Strict Callback Sweep
create table if not exists market_integrity_visible_runtime_ux_proofs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pass integer not null default 2887,
  strict_clusters_removed_from_digest boolean not null default false,
  shield_no_forced_first_row_highlight boolean not null default false,
  shield_mobile_chart_cell_visible boolean not null default false,
  realmarkets_no_grey_underlay_marker boolean not null default false,
  cart_strict_line_items_typed boolean not null default false,
  typecheck_exit_code integer not null default 2,
  can_claim_clean_build boolean not null default false,
  can_claim_world_class_live boolean not null default false,
  package_lock_hash text,
  evidence jsonb not null default '{}'::jsonb,
  constraint pass2887_no_live_claim_without_build check (can_claim_world_class_live = false),
  constraint pass2887_clean_build_requires_typecheck_zero check (can_claim_clean_build = false or typecheck_exit_code = 0),
  constraint pass2887_shield_chart_proof_required check (shield_no_forced_first_row_highlight = false or shield_mobile_chart_cell_visible = true)
);
