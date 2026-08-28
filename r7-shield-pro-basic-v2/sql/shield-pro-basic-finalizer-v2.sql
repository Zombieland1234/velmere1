create or replace function public.velmere_r7_finalize_shield_pro_basic_v2(
  p_github_run_id text,
  p_github_sha text,
  p_workflow_sha256 text,
  p_artifact_digest_sha256 text,
  p_bridge_digest_sha256 text,
  p_oidc_helper_digest_sha256 text,
  p_finalizer_edge_digest_sha256 text,
  p_data_plane_sql_digest_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'velmere_private', 'extensions'
as $function$
declare
  v_authority velmere_private.r7_source_authority%rowtype;
  v_terminal jsonb;
  v_existing jsonb;
  v_event_count integer;
  v_latest_source timestamptz;
  v_capability text;
  v_terminal_definition_sha256 text;
  v_capability_definition_sha256 text;
  v_finalizer_definition_sha256 text;
begin
  if not coalesce(p_github_run_id ~ '^[1-9][0-9]{0,19}$', false)
     or not coalesce(p_github_sha ~ '^[a-f0-9]{40}$', false)
     or not coalesce(p_workflow_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_artifact_digest_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_bridge_digest_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_oidc_helper_digest_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_finalizer_edge_digest_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_data_plane_sql_digest_sha256 ~ '^[a-f0-9]{64}$', false)
  then
    raise exception 'shield_pro_basic_v2_finalization_identity_invalid' using errcode = '22023';
  end if;

  select * into strict v_authority
    from velmere_private.r7_source_authority
   where singleton = true;

  if v_authority.exact_windows_status is distinct from 'PASS'
     or v_authority.test_denominator is distinct from 52
     or v_authority.source_aggregate_sha256 is distinct from '50d59f5f028ef73b279fa3930889fcbf2ab5bc5e36ab4e8cec97be5ed49be67e'
     or v_authority.execution_slice_aggregate_sha256 is distinct from 'f83f28de6add73eee70d9086f2705241243661d64b5c9fd579b17b359050a221'
     or v_authority.execution_slice_manifest_sha256 is distinct from 'b947314bb696fb8f9153c34d46ba825c5897e9f8cc8cf911a5f31113aa5fc01f'
     or v_authority.execution_bundle_sha256 is distinct from '8e3c66471d534310e1142c3671d43bb556e35b6901c847c9596eea14e8815967'
     or v_authority.exact_windows_run_id is distinct from '33056763944'
     or v_authority.exact_windows_run_attempt is distinct from 1
  then
    raise exception 'shield_pro_basic_v2_exact_source_authority_not_satisfied' using errcode = '23514';
  end if;

  select count(*)::integer, max(e.source_as_of)
    into v_event_count, v_latest_source
    from public.velmere_risk_history_events e
   where e.canonical_asset_id = 'eip155:56:0xca11bde05977b3631167028862be2a173976ca11'
     and e.event_digest in (
       'sha256:fd4a3a3b66f5a030e951cc0c592a847197260418282b3f71b4fdacdc9b8aa861',
       'sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e'
     )
     and e.publication_state = 'PUBLIC'
     and e.customer_publishable = true;

  if v_event_count <> 2
     or v_latest_source > now() + interval '5 minutes'
     or v_latest_source < now() - interval '7 days'
  then
    raise exception 'shield_pro_basic_v2_public_evidence_not_satisfied' using errcode = '23514';
  end if;

  v_terminal := public.velmere_r7_shield_pro_basic_terminal_data_v2('multicall3-bsc');
  if coalesce(v_terminal->>'resolution', '') <> 'RESOLVED'
     or coalesce(v_terminal->>'terminalScope', '') <> 'BOUNDED_SINGLE_TARGET_FREE_BASIC'
     or coalesce(v_terminal->>'canonicalAssetId', '') <> 'eip155:56:0xca11bde05977b3631167028862be2a173976ca11'
     or coalesce((v_terminal->>'customerPublishable')::boolean, false) = false
     or coalesce((v_terminal->>'providerNetworkCalls')::integer, -1) <> 0
     or coalesce((v_terminal->>'historyCount')::integer, -1) <> 2
     or jsonb_array_length(coalesce(v_terminal->'history', '[]'::jsonb)) <> 2
  then
    raise exception 'shield_pro_basic_v2_terminal_contract_not_satisfied' using errcode = '23514';
  end if;

  v_capability := public.velmere_r7_read_shield_pro_basic_v2_server_capability_for_oidc();
  if v_capability is null or length(v_capability) < 48 or length(v_capability) > 256 then
    raise exception 'shield_pro_basic_v2_server_capability_unavailable' using errcode = '23514';
  end if;

  v_terminal_definition_sha256 := encode(extensions.digest(convert_to(pg_get_functiondef('public.velmere_r7_shield_pro_basic_terminal_data_v2(text)'::regprocedure), 'UTF8'), 'sha256'), 'hex');
  v_capability_definition_sha256 := encode(extensions.digest(convert_to(pg_get_functiondef('public.velmere_r7_read_shield_pro_basic_v2_server_capability_for_oidc()'::regprocedure), 'UTF8'), 'sha256'), 'hex');
  v_finalizer_definition_sha256 := encode(extensions.digest(convert_to(pg_get_functiondef('public.velmere_r7_finalize_shield_pro_basic_v2(text,text,text,text,text,text,text,text)'::regprocedure), 'UTF8'), 'sha256'), 'hex');

  if v_terminal_definition_sha256 !~ '^[a-f0-9]{64}$'
     or v_capability_definition_sha256 !~ '^[a-f0-9]{64}$'
     or v_finalizer_definition_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'shield_pro_basic_v2_database_definition_identity_invalid' using errcode = '23514';
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
   where product_slug = 'shield-pro-basic';

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
    10,
    'shield-pro-basic',
    'FINAL',
    v_authority.source_aggregate_sha256,
    v_authority.execution_slice_aggregate_sha256,
    jsonb_build_object(
      'schemaVersion', 'velmere.r7.shield-pro-basic-v2-final-evidence.v1',
      'githubRunId', p_github_run_id,
      'githubHeadSha', p_github_sha,
      'workflowSha256', p_workflow_sha256,
      'artifactDigestSha256', p_artifact_digest_sha256,
      'bridgeDigestSha256', p_bridge_digest_sha256,
      'oidcHelperDigestSha256', p_oidc_helper_digest_sha256,
      'finalizerEdgeDigestSha256', p_finalizer_edge_digest_sha256,
      'dataPlaneSqlDigestSha256', p_data_plane_sql_digest_sha256,
      'terminalFunctionDefinitionSha256', v_terminal_definition_sha256,
      'capabilityFunctionDefinitionSha256', v_capability_definition_sha256,
      'finalizerFunctionDefinitionSha256', v_finalizer_definition_sha256,
      'sourceAuthorityRunId', v_authority.exact_windows_run_id,
      'sourceAuthorityHeadSha', v_authority.github_sha,
      'sourceAuthorityRunAttempt', v_authority.exact_windows_run_attempt,
      'sourceAuthorityWorkflowSha256', v_authority.workflow_sha256,
      'executionBundleSha256', v_authority.execution_bundle_sha256,
      'executionSliceManifestSha256', v_authority.execution_slice_manifest_sha256,
      'exactWindows', 'PASS_52_X2',
      'testDenominator', 52,
      'productOrdinal', 10,
      'productSlug', 'shield-pro-basic',
      'tier', 'basic',
      'freeBasic', true,
      'paidValueCredit', false,
      'productContract', 'BOUNDED_SINGLE_TARGET_FREE_DEFENSIVE_TRIAGE_TERMINAL',
      'canonicalAssetId', 'eip155:56:0xca11bde05977b3631167028862be2a173976ca11',
      'requiredEventDigests', jsonb_build_array(
        'sha256:fd4a3a3b66f5a030e951cc0c592a847197260418282b3f71b4fdacdc9b8aa861',
        'sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e'
      ),
      'historyEvents', 2,
      'comparabilitySegments', 2,
      'customerTerminalRoute', true,
      'customerCards', 8,
      'operatorTableRows', 2,
      'actionQueueItems', 4,
      'structuredPayload', true,
      'locales', jsonb_build_array('pl', 'en', 'de'),
      'sourceClass', 'VELMERE_GENERATED_PUBLIC_EVIDENCE_FROM_DIRECT_CHAIN_BOUND_SOURCE',
      'customerDisplayRightsBasis', 'FIRST_PARTY_DERIVED_CUSTOMER_PUBLISHABLE_EVIDENCE',
      'externalProviderRedistributionClaimed', false,
      'providerNetworkCalls', 0,
      'rawProviderPayloadReturned', false,
      'missingAssetFailClosed', true,
      'invalidCapabilityDenied', true,
      'unsupportedLocaleRejected', true,
      'unknownFieldRejected', true,
      'wrongMethodRejected', true,
      'oversizedBodyRejected', true,
      'serviceRoleInApplication', false,
      'rawCapabilityReturned', false,
      'currentnessMaxAgeSeconds', 604800,
      'customerPublishable', true,
      'distinctFromShieldBasic', true,
      'distinctFromShieldMap', true,
      'distinctFromRiskIndicator', true
    )
  );

  return jsonb_build_object(
    'ok', true,
    'productOrdinal', 10,
    'productSlug', 'shield-pro-basic',
    'finalStatus', 'FINAL',
    'customerFinalCount', (select count(*) from public.velmere_r7_customer_final_ledger),
    'idempotent', false
  );
end
$function$;

revoke all on function public.velmere_r7_finalize_shield_pro_basic_v2(text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.velmere_r7_finalize_shield_pro_basic_v2(text,text,text,text,text,text,text,text) to service_role;
