create schema if not exists velmere_private;

do $migration$
begin
  if not exists (
    select 1 from vault.secrets where name = 'r7_shield_pro_basic_v2_server_capability'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(48), 'hex'),
      'r7_shield_pro_basic_v2_server_capability',
      'Server-only capability for the R7 Shield Pro Basic v2 customer terminal.'
    );
  end if;
end
$migration$;

create or replace function public.velmere_r7_read_shield_pro_basic_v2_server_capability_for_oidc()
returns text
language sql
stable
security definer
set search_path = 'pg_catalog', 'vault'
as $function$
  select d.decrypted_secret
    from vault.decrypted_secrets d
   where d.name = 'r7_shield_pro_basic_v2_server_capability'
   limit 1
$function$;

revoke all on function public.velmere_r7_read_shield_pro_basic_v2_server_capability_for_oidc() from public, anon, authenticated;
grant execute on function public.velmere_r7_read_shield_pro_basic_v2_server_capability_for_oidc() to service_role;

create or replace function public.velmere_r7_shield_pro_basic_terminal_data_v2(p_asset_id text)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $function$
declare
  v_resolution jsonb;
  v_canonical text;
  v_history jsonb;
  v_current jsonb;
  v_count integer;
  v_latest_observed timestamptz;
  v_latest_source timestamptz;
begin
  if p_asset_id is null or p_asset_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{2,159}$' then
    raise exception 'shield_pro_basic_asset_id_invalid' using errcode = '22023';
  end if;

  v_resolution := public.velmere_read_public_risk_history_by_asset_v1(p_asset_id, 1, null);
  if coalesce(v_resolution->>'resolution', '') <> 'RESOLVED' then
    return jsonb_build_object('resolution', 'NOT_FOUND');
  end if;

  v_canonical := v_resolution->>'canonicalAssetId';
  if v_canonical is distinct from 'eip155:56:0xca11bde05977b3631167028862be2a173976ca11' then
    return jsonb_build_object('resolution', 'NOT_FOUND');
  end if;

  select jsonb_agg(e.event_json order by e.observed_at), count(*)::integer,
         max(e.observed_at), max(e.source_as_of)
    into v_history, v_count, v_latest_observed, v_latest_source
    from public.velmere_risk_history_events e
   where e.canonical_asset_id = v_canonical
     and e.event_digest in (
       'sha256:fd4a3a3b66f5a030e951cc0c592a847197260418282b3f71b4fdacdc9b8aa861',
       'sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e'
     )
     and e.publication_state = 'PUBLIC'
     and e.customer_publishable = true
     and e.event_digest ~ '^sha256:[a-f0-9]{64}$'
     and e.evidence_digest ~ '^sha256:[a-f0-9]{64}$';

  if v_count <> 2 or jsonb_typeof(v_history) <> 'array' or jsonb_array_length(v_history) <> 2 then
    raise exception 'shield_pro_basic_required_public_evidence_missing' using errcode = '23514';
  end if;

  v_current := v_history->1;
  if coalesce(v_current->>'eventDigest', '') <> 'sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e'
     or coalesce(v_current->>'publicationState', '') <> 'PUBLIC'
     or coalesce((v_current->>'customerPublishable')::boolean, false) = false
  then
    raise exception 'shield_pro_basic_current_event_boundary_failed' using errcode = '23514';
  end if;

  if v_latest_observed > now() + interval '5 minutes'
     or v_latest_source > now() + interval '5 minutes'
     or v_latest_observed < now() - interval '7 days'
     or v_latest_source < now() - interval '7 days'
  then
    raise exception 'shield_pro_basic_evidence_stale_or_future' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'resolution', 'RESOLVED',
    'terminalScope', 'BOUNDED_SINGLE_TARGET_FREE_BASIC',
    'assetId', v_resolution->'events'->0->>'assetId',
    'canonicalAssetId', v_canonical,
    'identityClass', v_resolution->'events'->0->>'identityClass',
    'symbol', v_resolution->'events'->0->>'symbol',
    'name', v_resolution->'events'->0->>'name',
    'history', v_history,
    'currentEvent', v_current,
    'historyCount', 2,
    'comparabilitySegments', 2,
    'firstObservedAt', v_history->0->>'observedAt',
    'latestObservedAt', v_current->>'observedAt',
    'publicationState', 'PUBLIC',
    'customerPublishable', true,
    'sourceClass', 'VELMERE_GENERATED_PUBLIC_EVIDENCE_FROM_DIRECT_CHAIN_BOUND_SOURCE',
    'providerNetworkCalls', 0,
    'maxAgeSeconds', 604800
  );
end
$function$;

revoke all on function public.velmere_r7_shield_pro_basic_terminal_data_v2(text) from public, anon, authenticated;
grant execute on function public.velmere_r7_shield_pro_basic_terminal_data_v2(text) to service_role;
