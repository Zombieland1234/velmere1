-- PASS2888 — Visible Runtime Release Blocker Sweep / Route Strict + Chart Cell Gate
create table if not exists market_integrity_visible_runtime_release_blocker_sweeps (
  id uuid primary key default gen_random_uuid(),
  pass integer not null default 2888,
  created_at timestamptz not null default now(),
  repaired_strict_clusters text[] not null,
  visible_runtime_surfaces text[] not null,
  can_claim_clean_typecheck boolean not null default false,
  can_claim_clean_build boolean not null default false,
  can_claim_world_class_live boolean not null default false,
  acceptance_gate text not null,
  evidence jsonb not null default '{}'::jsonb
);

alter table market_integrity_visible_runtime_release_blocker_sweeps enable row level security;

create policy if not exists pass2888_no_live_claim_without_build
on market_integrity_visible_runtime_release_blocker_sweeps
for select
using (can_claim_clean_typecheck = false and can_claim_clean_build = false and can_claim_world_class_live = false);

comment on table market_integrity_visible_runtime_release_blocker_sweeps is
'PASS2888 records repaired route/type blockers and chart-cell layout preparation, while preserving the no-clean-build/no-live-claim boundary until receipts exist.';
