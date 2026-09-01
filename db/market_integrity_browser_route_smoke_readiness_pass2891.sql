create table if not exists market_integrity_browser_route_smoke_readinesses (
  id uuid primary key default gen_random_uuid(),
  pass integer not null default 2891,
  artifact_name text not null,
  smoke_surfaces jsonb not null,
  install_typecheck_classifier jsonb not null,
  can_claim_clean_typecheck boolean not null default false,
  can_claim_clean_build boolean not null default false,
  can_claim_world_class_live boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pass2891_no_live_claim_without_browser_pdf_payment_provider_receipts check (
    can_claim_clean_typecheck = false
    and can_claim_clean_build = false
    and can_claim_world_class_live = false
  )
);

comment on table market_integrity_browser_route_smoke_readinesses is
  'PASS2891 browser-route smoke readiness: Shield/Real Markets/PDF/route targets are manifest-ready, but live world-class claims require dependency install, full typecheck/build, browser screenshots, PDF tier receipts, payment and provider receipts.';
