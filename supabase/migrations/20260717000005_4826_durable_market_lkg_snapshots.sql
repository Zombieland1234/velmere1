-- PASS4826: durable, integrity-bound last-known-good market sweeps.
-- Only a service-role server adapter can read or write this cache.
create table if not exists public.velmere_market_snapshots (
  snapshot_key text primary key,
  page integer not null,
  per_page integer not null,
  source text not null,
  generated_at timestamptz not null,
  stored_at timestamptz not null default now(),
  expires_at timestamptz not null,
  row_count integer not null,
  payload_hash text not null,
  rows jsonb not null,
  updated_at timestamptz not null default now(),
  constraint velmere_market_snapshots_key_check check (snapshot_key ~ '^[1-9][0-9]*:[1-9][0-9]*$'),
  constraint velmere_market_snapshots_key_binding_check check (snapshot_key = page::text || ':' || per_page::text),
  constraint velmere_market_snapshots_page_check check (page between 1 and 20),
  constraint velmere_market_snapshots_per_page_check check (per_page in (10, 25, 50, 100, 250)),
  constraint velmere_market_snapshots_row_count_check check (row_count between 1 and 250),
  constraint velmere_market_snapshots_row_count_page_check check (row_count <= per_page),
  constraint velmere_market_snapshots_source_check check (char_length(source) between 1 and 500),
  constraint velmere_market_snapshots_payload_hash_check check (payload_hash ~ '^[a-f0-9]{64}$'),
  constraint velmere_market_snapshots_expiry_check check (
    expires_at > stored_at and expires_at <= stored_at + interval '24 hours'
  ),
  constraint velmere_market_snapshots_rows_array_check check (jsonb_typeof(rows) = 'array'),
  constraint velmere_market_snapshots_row_count_match_check check (jsonb_array_length(rows) = row_count)
);

alter table public.velmere_market_snapshots enable row level security;

create index if not exists velmere_market_snapshots_expiry_idx
  on public.velmere_market_snapshots (expires_at);

do $$ begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'velmere_market_snapshots'
      and policyname = 'velmere_market_snapshots_service_role_all'
  ) then
    create policy velmere_market_snapshots_service_role_all
      on public.velmere_market_snapshots
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

revoke all on table public.velmere_market_snapshots from anon, authenticated;
grant select, insert, update, delete on table public.velmere_market_snapshots to service_role;
