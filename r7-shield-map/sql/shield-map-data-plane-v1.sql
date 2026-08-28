do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'r7_shield_map_server_capability'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(48), 'hex'),
      'r7_shield_map_server_capability',
      'Server-only capability for the R7 Shield Map customer evidence graph route'
    );
  end if;
end
$$;

create or replace function public.velmere_r7_read_shield_map_server_capability_for_oidc()
returns text
language sql
stable
security definer
set search_path to 'pg_catalog', 'vault'
as $$
  select d.decrypted_secret
    from vault.decrypted_secrets d
   where d.name = 'r7_shield_map_server_capability'
   limit 1
$$;

revoke all on function public.velmere_r7_read_shield_map_server_capability_for_oidc() from public, anon, authenticated;
grant execute on function public.velmere_r7_read_shield_map_server_capability_for_oidc() to service_role;

create or replace function public.velmere_r7_shield_map_graph_data_v1(p_asset_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_canonical constant text := 'eip155:56:0xca11bde05977b3631167028862be2a173976ca11';
  v_history jsonb;
  v_current jsonb;
  v_count integer;
  v_segments integer;
  v_first timestamptz;
  v_latest timestamptz;
  v_latest_source timestamptz;
begin
  if p_asset_id is null or p_asset_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{2,159}$' then
    raise exception 'shield_map_asset_id_invalid' using errcode = '22023';
  end if;
  if p_asset_id not in ('multicall3-bsc', v_canonical) then
    return jsonb_build_object('resolution', 'NOT_FOUND');
  end if;

  select
    count(*)::integer,
    count(distinct e.comparability_key)::integer,
    min(e.observed_at),
    max(e.observed_at),
    max(e.source_as_of),
    jsonb_agg(
      jsonb_build_object(
        'eventId', e.event_id,
        'eventDigest', e.event_digest,
        'evidenceDigest', e.evidence_digest,
        'observedAt', e.observed_at,
        'sourceAsOf', e.source_as_of,
        'score', e.risk_score,
        'level', e.risk_level,
        'confidence', e.confidence,
        'signalCount', e.signal_count,
        'methodologyVersion', e.methodology_version,
        'scoreVersion', e.score_version,
        'evidenceVersion', e.evidence_version,
        'comparabilityKey', e.comparability_key,
        'comparableToPrevious', e.comparable_to_previous,
        'eventTypes', to_jsonb(e.event_types),
        'changeReasons', to_jsonb(e.change_reasons),
        'publicationState', e.publication_state,
        'customerPublishable', e.customer_publishable
      ) order by e.observed_at asc, e.event_id asc
    )
  into v_count, v_segments, v_first, v_latest, v_latest_source, v_history
  from public.velmere_risk_history_events e
  where e.canonical_asset_id = v_canonical
    and e.publication_state = 'PUBLIC'
    and e.customer_publishable = true;

  if v_count < 2 or jsonb_typeof(v_history) <> 'array' then
    raise exception 'shield_map_public_history_incomplete' using errcode = '23514';
  end if;
  if (
    select count(*)
      from jsonb_array_elements(v_history) event
     where event->>'eventDigest' in (
       'sha256:fd4a3a3b66f5a030e951cc0c592a847197260418282b3f71b4fdacdc9b8aa861',
       'sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e'
     )
  ) <> 2 then
    raise exception 'shield_map_required_evidence_missing' using errcode = '23514';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(v_history) event
     where coalesce(event->>'eventDigest', '') !~ '^sha256:[a-f0-9]{64}$'
        or coalesce(event->>'evidenceDigest', '') !~ '^sha256:[a-f0-9]{64}$'
        or coalesce(event->>'publicationState', '') <> 'PUBLIC'
        or coalesce((event->>'customerPublishable')::boolean, false) = false
  ) then
    raise exception 'shield_map_publication_or_digest_boundary_failed' using errcode = '42501';
  end if;
  if v_latest is null or v_latest_source is null
     or v_latest > now() + interval '5 minutes'
     or v_latest_source > now() + interval '5 minutes'
     or v_latest < now() - interval '7 days'
     or v_latest_source < now() - interval '7 days'
  then
    raise exception 'shield_map_evidence_stale_or_future' using errcode = '23514';
  end if;

  select event into v_current
    from jsonb_array_elements(v_history) event
   order by (event->>'observedAt')::timestamptz desc, event->>'eventId' desc
   limit 1;

  return jsonb_build_object(
    'resolution', 'RESOLVED',
    'assetId', 'multicall3-bsc',
    'canonicalAssetId', v_canonical,
    'identityClass', 'CHAIN_CONTRACT',
    'symbol', 'MC3',
    'name', 'Multicall3',
    'publicationState', 'PUBLIC',
    'customerPublishable', true,
    'historyCount', v_count,
    'comparabilitySegments', v_segments,
    'firstObservedAt', v_first,
    'latestObservedAt', v_latest,
    'maxAgeSeconds', 604800,
    'currentEvent', v_current,
    'history', v_history,
    'providerNetworkCalls', 0,
    'sourceClass', 'VELMERE_GENERATED_PUBLIC_EVIDENCE_FROM_DIRECT_CHAIN_BOUND_SOURCE'
  );
end
$$;

revoke all on function public.velmere_r7_shield_map_graph_data_v1(text) from public, anon, authenticated;
grant execute on function public.velmere_r7_shield_map_graph_data_v1(text) to service_role;
