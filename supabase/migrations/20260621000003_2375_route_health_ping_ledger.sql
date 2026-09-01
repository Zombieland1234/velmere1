-- PASS2375 route health ping ledger
-- Stores redacted route health pings only: route states, safe focus ids, counts and stale-delivery warnings.
-- It must never store raw Stripe payloads, webhook bodies, BLIK codes, card data, secrets, seed phrases or exploit instructions.

create table if not exists public.velmere_route_health_ping_ledger (
  id text primary key,
  focus_key text not null,
  locale text not null default 'en' check (locale in ('pl','en','de')),
  ping_source text not null default 'manual_admin_check' check (ping_source in ('route_health_endpoint','linked_request_drawer','customer_delivery_guard','manual_admin_check')),
  route_health_endpoint text not null,
  delivery_warning_level text not null default 'watch' check (delivery_warning_level in ('ok','watch','stale','blocked')),
  counts jsonb not null default '{}'::jsonb,
  route_states jsonb not null default '{}'::jsonb,
  missing_keys text[] not null default '{}'::text[],
  ready_keys text[] not null default '{}'::text[],
  blocked_keys text[] not null default '{}'::text[],
  focus jsonb not null default '{}'::jsonb,
  safe_boundary text not null,
  record jsonb not null default '{}'::jsonb,
  pinged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists velmere_route_health_ping_focus_idx on public.velmere_route_health_ping_ledger (focus_key, pinged_at desc);
create index if not exists velmere_route_health_ping_source_idx on public.velmere_route_health_ping_ledger (ping_source, pinged_at desc);
create index if not exists velmere_route_health_ping_warning_idx on public.velmere_route_health_ping_ledger (delivery_warning_level, pinged_at desc);

alter table public.velmere_route_health_ping_ledger enable row level security;

do $$ begin
  create policy "velmere_route_health_ping_service_role_all"
    on public.velmere_route_health_ping_ledger
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
exception when duplicate_object then null;
end $$;
