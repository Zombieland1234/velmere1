-- PASS4600: durable verified OHLC last-known-good snapshots.
-- Apply with a Supabase service-role controlled migration path.
create table if not exists public.velmere_kline_snapshots (
  snapshot_key text primary key,
  pair text not null,
  range text not null,
  source text not null,
  generated_at timestamptz not null,
  stored_at timestamptz not null default now(),
  expires_at timestamptz not null,
  bar_count integer not null,
  payload_hash text not null,
  candles jsonb not null,
  updated_at timestamptz not null default now(),
  constraint velmere_kline_snapshots_bar_count_check check (bar_count between 8 and 1400),
  constraint velmere_kline_snapshots_payload_hash_check check (payload_hash ~ '^[a-f0-9]{64}$'),
  constraint velmere_kline_snapshots_pair_check check (char_length(pair) between 2 and 32),
  constraint velmere_kline_snapshots_range_check check (char_length(range) between 1 and 16),
  constraint velmere_kline_snapshots_expiry_check check (expires_at > stored_at)
);

alter table public.velmere_kline_snapshots enable row level security;
create index if not exists velmere_kline_snapshots_pair_range_idx on public.velmere_kline_snapshots(pair, range);
create index if not exists velmere_kline_snapshots_expires_at_idx on public.velmere_kline_snapshots(expires_at);

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'velmere_kline_snapshots'
      and policyname = 'velmere_kline_snapshots_service_role_all'
  ) then
    create policy velmere_kline_snapshots_service_role_all
      on public.velmere_kline_snapshots
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
