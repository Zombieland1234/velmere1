-- PASS6: canonical identity, provider timestamps and keyed integrity for kline LKG snapshots.
-- Existing PASS4600 rows intentionally remain untrusted: the application rejects rows
-- without all PASS6 fields instead of manufacturing identity or signatures.
begin;

alter table public.velmere_kline_snapshots
  add column if not exists asset_identity jsonb,
  add column if not exists identity_digest text,
  add column if not exists received_at timestamptz,
  add column if not exists source_observations jsonb,
  add column if not exists latest_closed_at timestamptz,
  add column if not exists payload_mac text,
  add column if not exists integrity_mode text,
  add column if not exists integrity_key_id text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'velmere_kline_snapshots_identity_digest_check'
      and conrelid = 'public.velmere_kline_snapshots'::regclass
  ) then
    alter table public.velmere_kline_snapshots
      add constraint velmere_kline_snapshots_identity_digest_check
      check (identity_digest is null or identity_digest ~ '^sha256:[a-f0-9]{64}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'velmere_kline_snapshots_payload_mac_check'
      and conrelid = 'public.velmere_kline_snapshots'::regclass
  ) then
    alter table public.velmere_kline_snapshots
      add constraint velmere_kline_snapshots_payload_mac_check
      check (payload_mac is null or payload_mac ~ '^[a-f0-9]{64}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'velmere_kline_snapshots_integrity_mode_check'
      and conrelid = 'public.velmere_kline_snapshots'::regclass
  ) then
    alter table public.velmere_kline_snapshots
      add constraint velmere_kline_snapshots_integrity_mode_check
      check (integrity_mode is null or integrity_mode in ('hmac_sha256', 'sha256_qa'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'velmere_kline_snapshots_pass6_bundle_check'
      and conrelid = 'public.velmere_kline_snapshots'::regclass
  ) then
    alter table public.velmere_kline_snapshots
      add constraint velmere_kline_snapshots_pass6_bundle_check check (
        (asset_identity is null and identity_digest is null and received_at is null
          and source_observations is null and latest_closed_at is null and payload_mac is null
          and integrity_mode is null and integrity_key_id is null)
        or
        (asset_identity is not null and identity_digest is not null and received_at is not null
          and source_observations is not null and latest_closed_at is not null and payload_mac is not null
          and integrity_mode is not null and integrity_key_id is not null)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'velmere_kline_snapshots_asset_identity_check'
      and conrelid = 'public.velmere_kline_snapshots'::regclass
  ) then
    alter table public.velmere_kline_snapshots
      add constraint velmere_kline_snapshots_asset_identity_check check (
        asset_identity is null or coalesce(
          jsonb_typeof(asset_identity) = 'object'
          and asset_identity ?& array['assetClass','marketId','symbol','quote','chainId','address']
          and asset_identity->>'assetClass' = 'crypto'
          and asset_identity->>'quote' = 'USD'
          and asset_identity->>'marketId' ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
          and char_length(asset_identity->>'marketId') between 1 and 96
          and asset_identity->>'symbol' ~ '^[A-Z0-9]{1,16}$'
          and jsonb_typeof(asset_identity->'chainId') in ('null','string')
          and jsonb_typeof(asset_identity->'address') in ('null','string')
          and (asset_identity->'address' = 'null'::jsonb or asset_identity->'chainId' <> 'null'::jsonb),
          false
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'velmere_kline_snapshots_source_observations_check'
      and conrelid = 'public.velmere_kline_snapshots'::regclass
  ) then
    alter table public.velmere_kline_snapshots
      add constraint velmere_kline_snapshots_source_observations_check check (
        case
          when source_observations is null then true
          when jsonb_typeof(source_observations) = 'array'
            then jsonb_array_length(source_observations) between 2 and 8
          else false
        end
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'velmere_kline_snapshots_pass6_time_order_check'
      and conrelid = 'public.velmere_kline_snapshots'::regclass
  ) then
    alter table public.velmere_kline_snapshots
      add constraint velmere_kline_snapshots_pass6_time_order_check check (
        received_at is null or (
          received_at <= generated_at + interval '5 seconds'
          and latest_closed_at <= received_at + interval '5 seconds'
          and char_length(integrity_key_id) between 1 and 64
        )
      );
  end if;
end $$;

alter table public.velmere_kline_snapshots enable row level security;
revoke all on table public.velmere_kline_snapshots from anon, authenticated;
grant all on table public.velmere_kline_snapshots to service_role;

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

create index if not exists velmere_kline_snapshots_identity_range_idx
  on public.velmere_kline_snapshots(identity_digest, range);

commit;
