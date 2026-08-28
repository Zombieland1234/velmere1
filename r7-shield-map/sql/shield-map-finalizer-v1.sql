create table if not exists velmere_private.r7_shield_map_release_authority (
  singleton boolean primary key default true check (singleton),
  product_ordinal integer not null check (product_ordinal = 16),
  product_slug text not null check (product_slug = 'shield-map'),
  workflow_sha256 text not null check (workflow_sha256 ~ '^[a-f0-9]{64}$'),
  bridge_sha256 text not null check (bridge_sha256 ~ '^[a-f0-9]{64}$'),
  oidc_helper_sha256 text not null check (oidc_helper_sha256 ~ '^[a-f0-9]{64}$'),
  finalizer_edge_sha256 text not null check (finalizer_edge_sha256 ~ '^[a-f0-9]{64}$'),
  data_plane_sql_sha256 text not null check (data_plane_sql_sha256 ~ '^[a-f0-9]{64}$'),
  graph_function_definition_sha256 text not null check (graph_function_definition_sha256 ~ '^[a-f0-9]{64}$'),
  capability_function_definition_sha256 text not null check (capability_function_definition_sha256 ~ '^[a-f0-9]{64}$'),
  finalizer_function_definition_sha256 text not null check (finalizer_function_definition_sha256 ~ '^[a-f0-9]{64}$'),
  full_source_aggregate_sha256 text not null check (full_source_aggregate_sha256 ~ '^[a-f0-9]{64}$'),
  execution_slice_aggregate_sha256 text not null check (execution_slice_aggregate_sha256 ~ '^[a-f0-9]{64}$'),
  execution_slice_manifest_sha256 text not null check (execution_slice_manifest_sha256 ~ '^[a-f0-9]{64}$'),
  execution_bundle_sha256 text not null check (execution_bundle_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create or replace function velmere_private.block_r7_shield_map_release_authority_mutation()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $$
begin
  raise exception 'r7_shield_map_release_authority_is_append_only' using errcode = '55000';
end
$$;

drop trigger if exists r7_shield_map_release_authority_append_only
  on velmere_private.r7_shield_map_release_authority;
create trigger r7_shield_map_release_authority_append_only
before update or delete on velmere_private.r7_shield_map_release_authority
for each row execute function velmere_private.block_r7_shield_map_release_authority_mutation();

revoke all on velmere_private.r7_shield_map_release_authority from public, anon, authenticated;

create or replace function public.velmere_r7_finalize_shield_map_v1(
  p_github_run_id text,
  p_github_sha text,
  p_workflow_sha256 text,
  p_artifact_digest_sha256 text,
  p_bridge_digest_sha256 text,
  p_oidc_helper_digest_sha256 text,
  p_finalizer_digest_sha256 text,
  p_data_plane_digest_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'velmere_private', 'extensions'
as $$
declare
  v_release velmere_private.r7_shield_map_release_authority%rowtype;
  v_source velmere_private.r7_source_authority%rowtype;
  v_existing jsonb;
  v_required_events integer;
  v_public_events integer;
  v_latest_event_digest text;
  v_latest_observed_at timestamptz;
  v_latest_source_as_of timestamptz;
  v_graph_definition_sha256 text;
  v_capability_definition_sha256 text;
  v_finalizer_definition_sha256 text;
begin
  if not coalesce(p_github_run_id ~ '^[1-9][0-9]{0,19}$', false)
     or not coalesce(p_github_sha ~ '^[a-f0-9]{40}$', false)
     or not coalesce(p_workflow_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_artifact_digest_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_bridge_digest_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_oidc_helper_digest_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_finalizer_digest_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_data_plane_digest_sha256 ~ '^[a-f0-9]{64}$', false)
  then
    raise exception 'shield_map_finalization_identity_invalid' using errcode = '22023';
  end if;

  select * into strict v_release
    from velmere_private.r7_shield_map_release_authority
   where singleton = true;

  if p_workflow_sha256 is distinct from v_release.workflow_sha256
     or p_bridge_digest_sha256 is distinct from v_release.bridge_sha256
     or p_oidc_helper_digest_sha256 is distinct from v_release.oidc_helper_sha256
     or p_finalizer_digest_sha256 is distinct from v_release.finalizer_edge_sha256
     or p_data_plane_digest_sha256 is distinct from v_release.data_plane_sql_sha256
  then
    raise exception 'shield_map_release_component_hash_mismatch' using errcode = '23514';
  end if;

  v_graph_definition_sha256 := encode(
    extensions.digest(
      convert_to(pg_get_functiondef('public.velmere_r7_shield_map_graph_data_v1(text)'::regprocedure), 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  v_capability_definition_sha256 := encode(
    extensions.digest(
      convert_to(pg_get_functiondef('public.velmere_r7_read_shield_map_server_capability_for_oidc()'::regprocedure), 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  v_finalizer_definition_sha256 := encode(
    extensions.digest(
      convert_to(pg_get_functiondef('public.velmere_r7_finalize_shield_map_v1(text,text,text,text,text,text,text,text)'::regprocedure), 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  if v_graph_definition_sha256 is distinct from v_release.graph_function_definition_sha256
     or v_capability_definition_sha256 is distinct from v_release.capability_function_definition_sha256
     or v_finalizer_definition_sha256 is distinct from v_release.finalizer_function_definition_sha256
  then
    raise exception 'shield_map_live_database_definition_mismatch' using errcode = '23514';
  end if;

  select * into strict v_source
    from velmere_private.r7_source_authority
   where singleton = true;

  if v_source.exact_windows_status is distinct from 'PASS'
     or v_source.test_denominator is distinct from 52
     or v_source.source_aggregate_sha256 is distinct from v_release.full_source_aggregate_sha256
     or v_source.execution_slice_aggregate_sha256 is distinct from v_release.execution_slice_aggregate_sha256
     or v_source.execution_slice_manifest_sha256 is distinct from v_release.execution_slice_manifest_sha256
     or v_source.execution_bundle_sha256 is distinct from v_release.execution_bundle_sha256
     or v_source.github_sha is distinct from '50840bb5a2cdc4384a557114e64a115828f97143'
     or v_source.exact_windows_run_id is distinct from '33056763944'
     or v_source.exact_windows_run_attempt is distinct from 1
  then
    raise exception 'shield_map_exact_source_authority_not_satisfied' using errcode = '23514';
  end if;

  select
    count(*)::integer,
    max(e.event_digest) filter (where e.observed_at = latest.latest_observed_at),
    latest.latest_observed_at,
    max(e.source_as_of)
  into v_public_events, v_latest_event_digest, v_latest_observed_at, v_latest_source_as_of
  from public.velmere_risk_history_events e
  cross join lateral (
    select max(x.observed_at) as latest_observed_at
      from public.velmere_risk_history_events x
     where x.canonical_asset_id = 'eip155:56:0xca11bde05977b3631167028862be2a173976ca11'
       and x.publication_state = 'PUBLIC'
       and x.customer_publishable = true
  ) latest
  where e.canonical_asset_id = 'eip155:56:0xca11bde05977b3631167028862be2a173976ca11'
    and e.publication_state = 'PUBLIC'
    and e.customer_publishable = true
  group by latest.latest_observed_at;

  select count(*)::integer into v_required_events
    from public.velmere_risk_history_events e
   where e.canonical_asset_id = 'eip155:56:0xca11bde05977b3631167028862be2a173976ca11'
     and e.publication_state = 'PUBLIC'
     and e.customer_publishable = true
     and e.event_digest in (
       'sha256:fd4a3a3b66f5a030e951cc0c592a847197260418282b3f71b4fdacdc9b8aa861',
       'sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e'
     );

  if v_public_events <> 2
     or v_required_events <> 2
     or v_latest_event_digest is distinct from 'sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e'
     or v_latest_observed_at is null
     or v_latest_source_as_of is null
     or v_latest_observed_at > now() + interval '5 minutes'
     or v_latest_source_as_of > now() + interval '5 minutes'
     or v_latest_observed_at < now() - interval '7 days'
     or v_latest_source_as_of < now() - interval '7 days'
  then
    raise exception 'shield_map_customer_evidence_not_satisfied' using errcode = '23514';
  end if;

  if exists (
    select 1
      from public.velmere_risk_history_events e
     where e.canonical_asset_id = 'eip155:56:0xca11bde05977b3631167028862be2a173976ca11'
       and e.publication_state = 'PUBLIC'
       and e.customer_publishable = true
       and (
         e.event_digest !~ '^sha256:[a-f0-9]{64}$'
         or e.evidence_digest !~ '^sha256:[a-f0-9]{64}$'
         or e.identity_class is distinct from 'CHAIN_CONTRACT'
       )
  ) then
    raise exception 'shield_map_publication_digest_or_identity_boundary_failed' using errcode = '42501';
  end if;

  select jsonb_build_object(
      'productOrdinal', product_ordinal,
      'productSlug', product_slug,
      'finalStatus', final_status,
      'finalizedAt', finalized_at,
      'evidence', evidence,
      'idempotent', true
    )
    into v_existing
    from public.velmere_r7_customer_final_ledger
   where product_slug = 'shield-map';
  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.velmere_r7_customer_final_ledger(
    product_ordinal,
    product_slug,
    final_status,
    full_source_aggregate_sha256,
    execution_slice_aggregate_sha256,
    evidence
  ) values (
    16,
    'shield-map',
    'FINAL',
    v_source.source_aggregate_sha256,
    v_source.execution_slice_aggregate_sha256,
    jsonb_build_object(
      'schemaVersion', 'velmere.r7.shield-map-final-evidence.v1',
      'githubRunId', p_github_run_id,
      'githubHeadSha', p_github_sha,
      'workflowSha256', p_workflow_sha256,
      'artifactDigestSha256', p_artifact_digest_sha256,
      'bridgeDigestSha256', p_bridge_digest_sha256,
      'oidcHelperDigestSha256', p_oidc_helper_digest_sha256,
      'finalizerEdgeDigestSha256', p_finalizer_digest_sha256,
      'dataPlaneSqlDigestSha256', p_data_plane_digest_sha256,
      'graphFunctionDefinitionSha256', v_graph_definition_sha256,
      'capabilityFunctionDefinitionSha256', v_capability_definition_sha256,
      'finalizerFunctionDefinitionSha256', v_finalizer_definition_sha256,
      'sourceAuthorityRunId', v_source.exact_windows_run_id,
      'sourceAuthorityHeadSha', v_source.github_sha,
      'sourceAuthorityRunAttempt', v_source.exact_windows_run_attempt,
      'sourceAuthorityWorkflowSha256', v_source.workflow_sha256,
      'executionBundleSha256', v_source.execution_bundle_sha256,
      'executionSliceManifestSha256', v_source.execution_slice_manifest_sha256,
      'exactWindows', 'PASS_52_X2',
      'testDenominator', 52,
      'productContract', 'EVIDENCE_LINEAGE_GAPS_NEXT_ACTION_NOT_CURRENT_POSTURE_TILE',
      'distinctFromShieldBasic', true,
      'distinctFromRiskIndicator', true,
      'canonicalAssetId', 'eip155:56:0xca11bde05977b3631167028862be2a173976ca11',
      'requiredEventDigests', jsonb_build_array(
        'sha256:fd4a3a3b66f5a030e951cc0c592a847197260418282b3f71b4fdacdc9b8aa861',
        'sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e'
      ),
      'customerGraphRoute', true,
      'graphCards', 6,
      'graphNodes', 6,
      'graphEdges', 5,
      'historyEvents', 2,
      'comparabilitySegments', 2,
      'locales', jsonb_build_array('pl', 'en', 'de'),
      'provenance', true,
      'structuredPayload', true,
      'currentnessMaxAgeSeconds', 604800,
      'providerNetworkCalls', 0,
      'sourceClass', 'VELMERE_GENERATED_PUBLIC_EVIDENCE_FROM_DIRECT_CHAIN_BOUND_SOURCE',
      'customerDisplayRightsBasis', 'FIRST_PARTY_DERIVED_CUSTOMER_PUBLISHABLE_EVIDENCE_NO_EXTERNAL_PROVIDER_PAYLOAD',
      'externalProviderRedistributionClaimed', false,
      'invalidCapabilityDenied', true,
      'missingAssetFailClosed', true,
      'unsupportedLocaleRejected', true,
      'unknownFieldRejected', true,
      'oversizedBodyRejected', true,
      'wrongMethodRejected', true,
      'serviceRoleInApplication', false,
      'rawCapabilityReturned', false,
      'rawProviderPayloadReturned', false,
      'customerPublishable', true,
      'paidValueCredit', false
    )
  );

  return jsonb_build_object(
    'ok', true,
    'productOrdinal', 16,
    'productSlug', 'shield-map',
    'finalStatus', 'FINAL',
    'customerFinalCount', (select count(*) from public.velmere_r7_customer_final_ledger where final_status = 'FINAL'),
    'idempotent', false
  );
end
$$;

revoke all on function public.velmere_r7_finalize_shield_map_v1(text,text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.velmere_r7_finalize_shield_map_v1(text,text,text,text,text,text,text,text)
  to service_role;

do $$
declare
  v_graph text;
  v_capability text;
  v_finalizer text;
begin
  v_graph := encode(
    extensions.digest(convert_to(pg_get_functiondef('public.velmere_r7_shield_map_graph_data_v1(text)'::regprocedure), 'UTF8'), 'sha256'),
    'hex'
  );
  v_capability := encode(
    extensions.digest(convert_to(pg_get_functiondef('public.velmere_r7_read_shield_map_server_capability_for_oidc()'::regprocedure), 'UTF8'), 'sha256'),
    'hex'
  );
  v_finalizer := encode(
    extensions.digest(convert_to(pg_get_functiondef('public.velmere_r7_finalize_shield_map_v1(text,text,text,text,text,text,text,text)'::regprocedure), 'UTF8'), 'sha256'),
    'hex'
  );

  if v_graph <> 'a4e50671cc629bd30d037255470791cd77bdbd50abe6ee17fc2cdacf4a8c3a7b'
     or v_capability <> '47fe7f9d0957e0fc354bc10085ec07dc3202125cee78a0ac1aae2caa850d0f14'
  then
    raise exception 'shield_map_preexisting_data_plane_definition_mismatch' using errcode = '23514';
  end if;

  insert into velmere_private.r7_shield_map_release_authority(
    singleton,
    product_ordinal,
    product_slug,
    workflow_sha256,
    bridge_sha256,
    oidc_helper_sha256,
    finalizer_edge_sha256,
    data_plane_sql_sha256,
    graph_function_definition_sha256,
    capability_function_definition_sha256,
    finalizer_function_definition_sha256,
    full_source_aggregate_sha256,
    execution_slice_aggregate_sha256,
    execution_slice_manifest_sha256,
    execution_bundle_sha256
  ) values (
    true,
    16,
    'shield-map',
    'bb872ed924c785261b81135c54281bd2b7f46232d25759b693c92071f06c9bec',
    '9afdd8d29de5849d3906b9397d2dacd47c6e1c009e2252c21fc8b26e42b55d94',
    'acefeb0797221c0bb7ba41fd81ed0c78fb15c706466c34ba7846cf9b1bc1c256',
    '8b7dc490ad5ae604992d0f978adfb21003386255aa790b4c0fb18fd18c532347',
    'c2934563a8b627300573832efd791cc8b515dd72b5d8d64dff95e3551e2e1e29',
    v_graph,
    v_capability,
    v_finalizer,
    '50d59f5f028ef73b279fa3930889fcbf2ab5bc5e36ab4e8cec97be5ed49be67e',
    'f83f28de6add73eee70d9086f2705241243661d64b5c9fd579b17b359050a221',
    'b947314bb696fb8f9153c34d46ba825c5897e9f8cc8cf911a5f31113aa5fc01f',
    '8e3c66471d534310e1142c3671d43bb556e35b6901c847c9596eea14e8815967'
  );
end
$$;
