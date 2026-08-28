create schema if not exists velmere_private;

do $migration$
begin
  if not exists (select 1 from vault.secrets where name = 'r7_real_markets_basic_v1_server_capability') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(48), 'hex'),
      'r7_real_markets_basic_v1_server_capability',
      'Server-only capability for the R7 Real Markets Basic direct-chain market pulse.'
    );
  end if;
end
$migration$;

create or replace function public.velmere_r7_read_real_markets_basic_v1_server_capability_for_oidc()
returns text
language sql
stable
security definer
set search_path = 'pg_catalog', 'vault'
as $function$
  select d.decrypted_secret
    from vault.decrypted_secrets d
   where d.name = 'r7_real_markets_basic_v1_server_capability'
   limit 1
$function$;

revoke all on function public.velmere_r7_read_real_markets_basic_v1_server_capability_for_oidc() from public, anon, authenticated;
grant execute on function public.velmere_r7_read_real_markets_basic_v1_server_capability_for_oidc() to service_role;

create or replace function public.velmere_r7_finalize_real_markets_basic_v1(
  p_github_run_id text,
  p_github_sha text,
  p_workflow_sha256 text,
  p_artifact_digest_sha256 text,
  p_bridge_digest_sha256 text,
  p_oidc_helper_digest_sha256 text,
  p_finalizer_edge_digest_sha256 text,
  p_sql_digest_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'velmere_private', 'extensions'
as $function$
declare
  v_authority velmere_private.r7_source_authority%rowtype;
  v_existing jsonb;
  v_capability text;
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
     or not coalesce(p_sql_digest_sha256 ~ '^[a-f0-9]{64}$', false)
  then
    raise exception 'real_markets_basic_v1_finalization_identity_invalid' using errcode = '22023';
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
    raise exception 'real_markets_basic_v1_exact_source_authority_not_satisfied' using errcode = '23514';
  end if;

  v_capability := public.velmere_r7_read_real_markets_basic_v1_server_capability_for_oidc();
  if v_capability is null or length(v_capability) < 48 or length(v_capability) > 256 then
    raise exception 'real_markets_basic_v1_server_capability_unavailable' using errcode = '23514';
  end if;

  v_capability_definition_sha256 := encode(extensions.digest(convert_to(pg_get_functiondef('public.velmere_r7_read_real_markets_basic_v1_server_capability_for_oidc()'::regprocedure), 'UTF8'), 'sha256'), 'hex');
  v_finalizer_definition_sha256 := encode(extensions.digest(convert_to(pg_get_functiondef('public.velmere_r7_finalize_real_markets_basic_v1(text,text,text,text,text,text,text,text)'::regprocedure), 'UTF8'), 'sha256'), 'hex');
  if v_capability_definition_sha256 !~ '^[a-f0-9]{64}$' or v_finalizer_definition_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'real_markets_basic_v1_database_definition_identity_invalid' using errcode = '23514';
  end if;

  select jsonb_build_object(
      'productOrdinal', product_ordinal,
      'productSlug', product_slug,
      'finalStatus', final_status,
      'finalizedAt', finalized_at,
      'evidence', evidence,
      'idempotent', true
    ) into v_existing
    from public.velmere_r7_customer_final_ledger
   where product_slug = 'real-markets-basic';
  if v_existing is not null then return v_existing; end if;

  insert into public.velmere_r7_customer_final_ledger(
    product_ordinal, product_slug, final_status,
    full_source_aggregate_sha256, execution_slice_aggregate_sha256, evidence
  ) values (
    13,
    'real-markets-basic',
    'FINAL',
    v_authority.source_aggregate_sha256,
    v_authority.execution_slice_aggregate_sha256,
    jsonb_build_object(
      'schemaVersion', 'velmere.r7.real-markets-basic-final-evidence.v1',
      'githubRunId', p_github_run_id,
      'githubHeadSha', p_github_sha,
      'workflowSha256', p_workflow_sha256,
      'artifactDigestSha256', p_artifact_digest_sha256,
      'bridgeDigestSha256', p_bridge_digest_sha256,
      'oidcHelperDigestSha256', p_oidc_helper_digest_sha256,
      'finalizerEdgeDigestSha256', p_finalizer_edge_digest_sha256,
      'sqlDigestSha256', p_sql_digest_sha256,
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
      'productOrdinal', 13,
      'productSlug', 'real-markets-basic',
      'tier', 'basic',
      'freeBasic', true,
      'paidValueCredit', false,
      'productContract', 'DIRECT_CHAIN_WBNB_USDT_MARKET_PULSE_FREE_BASIC',
      'chainId', 56,
      'factoryAddress', '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
      'baseTokenAddress', '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
      'quoteTokenAddress', '0x55d398326f99059ff775485246999027b3197955',
      'pairResolvedOnChain', true,
      'customerCards', 8,
      'structuredPayload', true,
      'locales', jsonb_build_array('pl','en','de'),
      'rpcQuorumRequired', 2,
      'configuredRpcOrigins', 3,
      'providerFailover', true,
      'customerDisplayRightsBasis', 'FIRST_PARTY_DERIVATION_FROM_PUBLIC_BLOCKCHAIN_FACTS',
      'rawProviderPayloadReturned', false,
      'externalProviderRedistributionClaimed', false,
      'personalizedInvestmentAdvice', false,
      'staleDataFailClosed', true,
      'rpcDivergenceFailClosed', true,
      'pairIdentityFailClosed', true,
      'invalidCapabilityDenied', true,
      'unsupportedLocaleRejected', true,
      'unknownFieldRejected', true,
      'wrongMethodRejected', true,
      'oversizedBodyRejected', true,
      'serviceRoleInApplication', false,
      'rawCapabilityReturned', false,
      'customerPublishable', true
    )
  );

  return jsonb_build_object(
    'ok', true,
    'productOrdinal', 13,
    'productSlug', 'real-markets-basic',
    'finalStatus', 'FINAL',
    'customerFinalCount', (select count(*) from public.velmere_r7_customer_final_ledger),
    'idempotent', false
  );
end
$function$;

revoke all on function public.velmere_r7_finalize_real_markets_basic_v1(text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.velmere_r7_finalize_real_markets_basic_v1(text,text,text,text,text,text,text,text) to service_role;
