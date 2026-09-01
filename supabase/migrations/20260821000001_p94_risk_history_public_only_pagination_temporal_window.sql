begin;

-- P94 RISK HISTORY PUBLIC-ONLY PAGINATION / TEMPORAL WINDOW BEGIN
-- This service-role RPC is the only database reader intended for the public
-- Risk History HTTP route. Canonical resolution remains exact-before-alias,
-- but only customer-publishable PUBLIC events enter the returned page. Private
-- or WITHHELD events never cross into the public application process, cannot
-- consume the customer page limit and cannot influence hasOlder/nextBefore.
-- Pagination is exclusive on observed_at; P91 guarantees uniqueness per
-- canonical asset and observation timestamp.

create index if not exists velmere_risk_history_events_public_lower_time_idx
  on public.velmere_risk_history_events(lower(canonical_asset_id), observed_at desc)
  where customer_publishable and publication_state = 'PUBLIC';

create or replace function public.velmere_read_public_risk_history_by_asset_v1(
  p_asset_id text,
  p_limit integer default 144,
  p_before timestamptz default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_requested text;
  v_internal_resolution text;
  v_canonical_asset_id text;
  v_resolution_kind text;
  v_events jsonb := '[]'::jsonb;
  v_candidate_count integer := 0;
  v_has_older boolean := false;
  v_next_before timestamptz := null;
begin
  if p_asset_id is null
     or length(trim(p_asset_id)) < 1
     or length(p_asset_id) > 256
     or trim(p_asset_id) !~ '^[A-Za-z0-9:._-]{1,256}$'
     or p_limit is null
     or p_limit < 1
     or p_limit > 144
     or (p_before is not null and p_before > now() + interval '5 minutes') then
    raise exception 'risk_history_public_page_input_invalid' using errcode = '22023';
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
    end,
    case
      when exact_count = 1 then 'CANONICAL'
      when exact_count = 0 and alias_count = 1 then 'UNIQUE_ALIAS'
      else null
    end
  into v_internal_resolution, v_canonical_asset_id, v_resolution_kind
  from candidate_counts;

  if v_internal_resolution = 'RESOLVED' then
    with candidate_page as (
      select event_json, observed_at
      from public.velmere_risk_history_events
      where canonical_asset_id = v_canonical_asset_id
        and customer_publishable
        and publication_state = 'PUBLIC'
        and (p_before is null or observed_at < p_before)
      order by observed_at desc
      limit p_limit + 1
    ), numbered as (
      select event_json, observed_at, row_number() over (order by observed_at desc) as position
      from candidate_page
    ), page_rows as (
      select event_json, observed_at
      from numbered
      where position <= p_limit
    )
    select
      (select count(*) from candidate_page),
      coalesce((select jsonb_agg(event_json order by observed_at) from page_rows), '[]'::jsonb),
      (select min(observed_at) from page_rows)
    into v_candidate_count, v_events, v_next_before;

    v_has_older := v_candidate_count > p_limit;
    if jsonb_array_length(v_events) < 1 then
      -- Unknown, ambiguous and private-only/exhausted pages share the same
      -- public envelope. The canonical identifier is deliberately removed.
      v_internal_resolution := 'EMPTY';
      v_canonical_asset_id := null;
      v_has_older := false;
      v_next_before := null;
    elsif not v_has_older then
      v_next_before := null;
    end if;
  else
    -- Do not expose AMBIGUOUS as a distinct public result.
    v_internal_resolution := 'EMPTY';
    v_canonical_asset_id := null;
  end if;

  return jsonb_build_object(
    'schemaVersion', 'velmere.risk-history-public-resolution.v1',
    'resolution', case when v_internal_resolution = 'RESOLVED' then 'RESOLVED' else 'EMPTY' end,
    'canonicalAssetId', v_canonical_asset_id,
    'events', v_events,
    'requestBinding', jsonb_build_object(
      'schemaVersion', 'velmere.risk-history-public-request-binding.v1',
      'requestedId', v_requested,
      'resolutionKind', case when v_internal_resolution = 'RESOLVED' then v_resolution_kind else null end
    ),
    'page', jsonb_build_object(
      'requestedLimit', p_limit,
      'before', case when p_before is null then null else to_char(p_before at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
      'hasOlder', v_has_older,
      'nextBefore', case when v_has_older then to_char(v_next_before at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') else null end
    )
  );
end;
$$;
revoke all on function public.velmere_read_public_risk_history_by_asset_v1(text, integer, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_read_public_risk_history_by_asset_v1(text, integer, timestamptz) to service_role;

comment on function public.velmere_read_public_risk_history_by_asset_v1(text, integer, timestamptz) is
  'P94 service-role-only customer-public Risk History page. It resolves one canonical asset, selects only PUBLIC/customer-publishable events, uses exclusive observed_at pagination and normalizes unknown, ambiguous, private-only and exhausted pages to one empty envelope.';

-- P94 RISK HISTORY PUBLIC-ONLY PAGINATION / TEMPORAL WINDOW END
commit;
