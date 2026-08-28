create or replace function public.velmere_r7_read_shield_pro_basic_server_capability_for_oidc()
returns text language sql stable security definer set search_path=pg_catalog,vault
as $f$ select d.decrypted_secret from vault.decrypted_secrets d where d.name='r7_shield_pro_basic_server_capability' limit 1 $f$;
revoke all on function public.velmere_r7_read_shield_pro_basic_server_capability_for_oidc() from public,anon,authenticated;
grant execute on function public.velmere_r7_read_shield_pro_basic_server_capability_for_oidc() to service_role;

create or replace function public.velmere_r7_shield_pro_basic_terminal_data_v2(p_asset_id text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $f$
declare
  v_resolution jsonb; v_events jsonb; v_current jsonb; v_history_count integer;
  v_segments integer; v_first timestamptz; v_latest timestamptz; v_row jsonb;
begin
  if p_asset_id is null or p_asset_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{2,159}$' then
    raise exception 'shield_pro_basic_asset_id_invalid' using errcode='22023';
  end if;
  v_resolution:=public.velmere_read_public_risk_history_by_asset_v1(p_asset_id,12,null);
  if coalesce(v_resolution->>'resolution','')<>'RESOLVED' or jsonb_typeof(v_resolution->'events')<>'array' then
    return jsonb_build_object('resolution','NOT_FOUND');
  end if;
  v_events:=v_resolution->'events'; v_history_count:=jsonb_array_length(v_events);
  if v_history_count<2 then raise exception 'shield_pro_basic_history_incomplete' using errcode='23514'; end if;
  for v_row in select value from jsonb_array_elements(v_events) loop
    if coalesce(v_row->>'publicationState','')<>'PUBLIC'
       or coalesce((v_row->>'customerPublishable')::boolean,false)=false
       or coalesce(v_row->>'eventDigest','') !~ '^sha256:[a-f0-9]{64}$'
       or coalesce(v_row->>'evidenceDigest','') !~ '^sha256:[a-f0-9]{64}$'
       or coalesce(v_row->>'observedAt','') !~ '^\d{4}-\d{2}-\d{2}T'
       or coalesce(v_row->>'sourceAsOf','') !~ '^\d{4}-\d{2}-\d{2}T'
    then raise exception 'shield_pro_basic_public_evidence_boundary_failed' using errcode='42501'; end if;
  end loop;
  select value into v_current from jsonb_array_elements(v_events) with ordinality e(value,ord) order by ord desc limit 1;
  select min((value->>'observedAt')::timestamptz),max((value->>'observedAt')::timestamptz),count(distinct value->>'comparabilityKey')::integer
    into v_first,v_latest,v_segments from jsonb_array_elements(v_events);
  if v_latest>clock_timestamp()+interval '5 minutes'
     or (v_current->>'sourceAsOf')::timestamptz>clock_timestamp()+interval '5 minutes'
     or v_latest<clock_timestamp()-interval '7 days'
     or (v_current->>'sourceAsOf')::timestamptz<clock_timestamp()-interval '7 days'
  then raise exception 'shield_pro_basic_evidence_not_current' using errcode='23514'; end if;
  return jsonb_build_object(
    'resolution','RESOLVED','terminalScope','BOUNDED_SINGLE_TARGET_FREE_BASIC',
    'sourceClass','VELMERE_GENERATED_PUBLIC_EVIDENCE_FROM_DIRECT_CHAIN_BOUND_SOURCE',
    'assetId',v_current->>'assetId','canonicalAssetId',v_resolution->>'canonicalAssetId',
    'identityClass',v_current->>'identityClass','symbol',v_current->>'symbol','name',v_current->>'name',
    'publicationState','PUBLIC','customerPublishable',true,'providerNetworkCalls',0,'maxAgeSeconds',604800,
    'historyCount',v_history_count,'comparabilitySegments',v_segments,'firstObservedAt',v_first,'latestObservedAt',v_latest,
    'currentEvent',v_current,'history',v_events);
end $f$;
revoke all on function public.velmere_r7_shield_pro_basic_terminal_data_v2(text) from public,anon,authenticated;
grant execute on function public.velmere_r7_shield_pro_basic_terminal_data_v2(text) to service_role;