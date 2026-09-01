-- PASS4756: durable, privacy-minimal provider observation history.
create table if not exists public.velmere_provider_observations (
  id bigint generated always as identity primary key,
  asset_key_hash text not null check (asset_key_hash ~ '^[a-f0-9]{64}$'),
  observation_digest text not null check (observation_digest ~ '^[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  state text not null check (state in ('aligned','watch','divergent','single_source','unavailable')),
  comparability text not null check (comparability in ('exact_window','reference_window','not_comparable','single_source','unavailable')),
  selected_price numeric null check (selected_price is null or selected_price > 0),
  divergence_bps numeric null check (divergence_bps is null or divergence_bps >= 0),
  confidence_cap integer not null check (confidence_cap between 0 and 100),
  source_count integer not null check (source_count between 0 and 8),
  created_at timestamptz not null default now(),
  unique(asset_key_hash, observation_digest)
);
alter table public.velmere_provider_observations enable row level security;
revoke all on public.velmere_provider_observations from public, anon, authenticated;
grant select, insert, delete on public.velmere_provider_observations to service_role;
create index if not exists velmere_provider_observations_asset_time_idx on public.velmere_provider_observations(asset_key_hash, observed_at desc);

create or replace function public.velmere_record_provider_observation(
  p_asset_key_hash text,
  p_observation_digest text,
  p_observed_at timestamptz,
  p_state text,
  p_comparability text,
  p_selected_price numeric,
  p_divergence_bps numeric,
  p_confidence_cap integer,
  p_source_count integer
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_inserted boolean := false;
  v_recent jsonb;
begin
  if p_asset_key_hash !~ '^[a-f0-9]{64}$' or p_observation_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_provider_observation_digest';
  end if;
  insert into public.velmere_provider_observations(asset_key_hash,observation_digest,observed_at,state,comparability,selected_price,divergence_bps,confidence_cap,source_count)
  values (p_asset_key_hash,p_observation_digest,p_observed_at,p_state,p_comparability,p_selected_price,p_divergence_bps,p_confidence_cap,p_source_count)
  on conflict(asset_key_hash,observation_digest) do nothing;
  get diagnostics v_inserted = row_count;
  delete from public.velmere_provider_observations o where o.asset_key_hash=p_asset_key_hash and o.id not in (
    select id from public.velmere_provider_observations where asset_key_hash=p_asset_key_hash order by observed_at desc,id desc limit 96
  );
  select coalesce(jsonb_agg(to_jsonb(x) order by x.observed_at), '[]'::jsonb) into v_recent from (
    select asset_key_hash as "assetKeyHash", observation_digest as "observationDigest", extract(epoch from observed_at)::bigint as "observedAt",
      state, comparability, selected_price::float8 as "selectedPrice", divergence_bps::float8 as "divergenceBps", confidence_cap as "confidenceCap", source_count as "sourceCount"
    from public.velmere_provider_observations where asset_key_hash=p_asset_key_hash order by observed_at desc,id desc limit 12
  ) x;
  return jsonb_build_object('deduplicated',not v_inserted,'recent',v_recent);
end $$;
revoke all on function public.velmere_record_provider_observation(text,text,timestamptz,text,text,numeric,numeric,integer,integer) from public, anon, authenticated;
grant execute on function public.velmere_record_provider_observation(text,text,timestamptz,text,text,numeric,numeric,integer,integer) to service_role;
