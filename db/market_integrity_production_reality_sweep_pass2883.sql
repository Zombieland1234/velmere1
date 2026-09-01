create table if not exists market_integrity_production_reality_sweeps (
  id text primary key,
  pass integer not null default 2883,
  sweep_state text not null,
  typecheck_probe_status text not null,
  can_claim_world_class_architecture boolean not null default true,
  can_claim_world_class_production boolean not null default false,
  dependency_tree_restored boolean not null default false,
  typecheck_clean boolean not null default false,
  build_clean boolean not null default false,
  route_smoke_clean boolean not null default false,
  shield_chart_runtime_evidence_id text,
  real_markets_icon_chart_runtime_evidence_id text,
  pdf_tier_parity_evidence_id text,
  mobile_visual_qa_evidence_id text,
  provider_timeout_fallback_evidence_id text,
  payment_entitlement_runtime_evidence_id text,
  release_claim_boundary text not null,
  blocker_digest_hash text not null,
  created_at timestamptz not null default now(),
  constraint pass2883_world_class_production_requires_clean_stack check (
    can_claim_world_class_production = false
    or (
      dependency_tree_restored = true
      and typecheck_clean = true
      and build_clean = true
      and route_smoke_clean = true
      and shield_chart_runtime_evidence_id is not null
      and real_markets_icon_chart_runtime_evidence_id is not null
      and pdf_tier_parity_evidence_id is not null
      and mobile_visual_qa_evidence_id is not null
      and provider_timeout_fallback_evidence_id is not null
      and payment_entitlement_runtime_evidence_id is not null
    )
  ),
  constraint pass2883_blocker_digest_requires_hash check (length(blocker_digest_hash) >= 16),
  constraint pass2883_release_claim_boundary_not_empty check (length(release_claim_boundary) >= 24)
);
