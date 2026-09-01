begin;

-- P93 RISK HISTORY CANONICAL IDENTITY / NON-ENUMERATING PUBLIC RESOLUTION BEGIN
-- This service-role RPC resolves one canonical history before LIMIT is applied.
-- It prevents a reused legacy alias from mixing multiple assets in one customer
-- timeline. EMPTY and AMBIGUOUS are intentionally coarse internal outcomes; the
-- public application boundary normalizes both, plus only-WITHHELD histories, to
-- one non-enumerating empty customer projection. The RPC also replaces the
-- legacy OR-based reader for internal Shield/Angel/report consumers. Those
-- consumers may request a bounded analysis window up to 5,000 events; the
-- public HTTP route remains independently capped at 144.

create index if not exists velmere_risk_history_events_canonical_lower_time_idx
  on public.velmere_risk_history_events(lower(canonical_asset_id), observed_at desc);
create index if not exists velmere_risk_history_events_asset_lower_time_idx
  on public.velmere_risk_history_events(lower(asset_id), observed_at desc);

create or replace function public.velmere_read_risk_history_by_asset_v2(
  p_asset_id text,
  p_limit integer default 144
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_requested text;
  v_resolution text;
  v_canonical_asset_id text;
  v_events jsonb := '[]'::jsonb;
begin
  if p_asset_id is null
     or length(trim(p_asset_id)) < 1
     or length(p_asset_id) > 256
     or trim(p_asset_id) !~ '^[A-Za-z0-9:._-]{1,256}$'
     or p_limit is null
     or p_limit < 1
     or p_limit > 5000 then
    raise exception 'risk_history_asset_resolution_input_invalid' using errcode = '22023';
  end if;
  v_requested := lower(trim(p_asset_id));

  with exact_candidates as (
    select distinct canonical_asset_id
    from public.velmere_risk_history_events
    where lower(canonical_asset_id) = v_requested
  ), alias_candidates as (
    select distinct canonical_asset_id
    from public.velmere_risk_history_events
    where lower(asset_id) = v_requested
  ), candidate_counts as (
    select
      (select count(*) from exact_candidates) as exact_count,
      (select min(canonical_asset_id) from exact_candidates) as exact_id,
      (select count(*) from alias_candidates) as alias_count,
      (select min(canonical_asset_id) from alias_candidates) as alias_id
  )
  select
    case
      when exact_count = 1 then 'RESOLVED'
      when exact_count > 1 then 'AMBIGUOUS'
      when alias_count = 1 then 'RESOLVED'
      when alias_count > 1 then 'AMBIGUOUS'
      else 'EMPTY'
    end,
    case
      when exact_count = 1 then exact_id
      when exact_count = 0 and alias_count = 1 then alias_id
      else null
    end
  into v_resolution, v_canonical_asset_id
  from candidate_counts;

  if v_resolution = 'RESOLVED' then
    select coalesce(jsonb_agg(row.event_json order by row.observed_at), '[]'::jsonb)
    into v_events
    from (
      select event_json, observed_at
      from public.velmere_risk_history_events
      where canonical_asset_id = v_canonical_asset_id
      order by observed_at desc
      limit p_limit
    ) row;
    if jsonb_array_length(v_events) < 1 then
      raise exception 'risk_history_asset_resolution_empty_resolved_set' using errcode = '23514';
    end if;
  end if;

  return jsonb_build_object(
    'schemaVersion', 'velmere.risk-history-asset-resolution.v2',
    'resolution', v_resolution,
    'canonicalAssetId', v_canonical_asset_id,
    'events', v_events
  );
end;
$$;
revoke all on function public.velmere_read_risk_history_by_asset_v2(text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_read_risk_history_by_asset_v2(text, integer) to service_role;

comment on function public.velmere_read_risk_history_by_asset_v2(text, integer) is
  'P93 service-role-only canonical Risk History resolution. Exact canonical identity takes precedence; ambiguous legacy aliases never mix histories and LIMIT is applied only after one canonical identity is selected.';

-- P93 RISK HISTORY CANONICAL IDENTITY / NON-ENUMERATING PUBLIC RESOLUTION END
commit;
