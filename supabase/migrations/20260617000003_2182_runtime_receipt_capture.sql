-- PASS2182: Runtime receipt capture ledger for Stripe/Supabase/Advanced paid access proofs.
-- Stores only redacted metadata and hashes. Never store raw Stripe payloads, raw tokens, cards, customer PII, or wallet signatures here.
create table if not exists public.velmere_runtime_receipts (
  id text primary key,
  pass_id text not null,
  scenario_id text not null,
  provider text not null,
  status text not null check (status in ('pass', 'blocked', 'denied', 'fail')),
  receipt_hash text not null,
  receipt jsonb not null default '{}'::jsonb,
  source text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists velmere_runtime_receipts_pass_scenario_idx
  on public.velmere_runtime_receipts (pass_id, scenario_id, created_at desc);

alter table public.velmere_runtime_receipts enable row level security;

do $$ begin
  create policy "service role can manage runtime receipts"
    on public.velmere_runtime_receipts
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
exception when duplicate_object then null;
end $$;
