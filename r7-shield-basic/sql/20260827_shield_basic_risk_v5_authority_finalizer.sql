-- Velmère R7 Shield Basic — formal FINAL gate bound to inherited exact Risk v5 source authority.
-- This file mirrors the live verified database function. It does not grant FINAL by itself.

create or replace function public.velmere_r7_finalize_shield_basic_v1(
  p_github_run_id text,
  p_github_sha text,
  p_workflow_sha256 text,
  p_artifact_digest_sha256 text,
  p_bridge_digest_sha256 text,
  p_oidc_helper_digest_sha256 text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'velmere_private'
as $function$
declare
  v_authority velmere_private.r7_source_authority%rowtype;
  v_event_count integer;
  v_existing jsonb;
begin
  if p_github_run_id !~ '^[1-9][0-9]{0,19}$'
     or p_github_sha !~ '^[a-f0-9]{40}$'
     or p_workflow_sha256 !~ '^[a-f0-9]{64}$'
     or p_artifact_digest_sha256 !~ '^[a-f0-9]{64}$'
     or p_bridge_digest_sha256 !~ '^[a-f0-9]{64}$'
     or p_oidc_helper_digest_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'shield_basic_finalization_identity_invalid' using errcode='22023';
  end if;

  select * into strict v_authority
    from velmere_private.r7_source_authority
   where singleton=true;

  if v_authority.exact_windows_status is distinct from 'PASS'
     or v_authority.test_denominator is distinct from 52
     or v_authority.source_aggregate_sha256 is distinct from '50d59f5f028ef73b279fa3930889fcbf2ab5bc5e36ab4e8cec97be5ed49be67e'
     or v_authority.execution_slice_aggregate_sha256 is distinct from 'f83f28de6add73eee70d9086f2705241243661d64b5c9fd579b17b359050a221'
     or v_authority.execution_slice_manifest_sha256 is distinct from 'b947314bb696fb8f9153c34d46ba825c5897e9f8cc8cf911a5f31113aa5fc01f'
     or v_authority.execution_bundle_sha256 is distinct from '8e3c66471d534310e1142c3671d43bb556e35b6901c847c9596eea14e8815967'
  then
    raise exception 'shield_basic_exact_source_authority_not_satisfied' using errcode='23514';
  end if;

  select count(*)::integer into v_event_count
    from public.velmere_risk_history_events e
   where e.canonical_asset_id='eip155:56:0xca11bde05977b3631167028862be2a173976ca11'
     and e.event_digest='sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e'
     and e.publication_state='PUBLIC'
     and e.customer_publishable=true;
  if v_event_count <> 1 then
    raise exception 'shield_basic_public_evidence_not_satisfied' using errcode='23514';
  end if;

  select jsonb_build_object(
      'productOrdinal', product_ordinal,
      'productSlug', product_slug,
      'finalStatus', final_status,
      'finalizedAt', finalized_at,
      'evidence', evidence
    ) into v_existing
    from public.velmere_r7_customer_final_ledger
   where product_slug='shield-basic';
  if v_existing is not null then
    return v_existing || jsonb_build_object('idempotent', true);
  end if;

  insert into public.velmere_r7_customer_final_ledger(
    product_ordinal,
    product_slug,
    final_status,
    full_source_aggregate_sha256,
    execution_slice_aggregate_sha256,
    evidence
  ) values (
    7,
    'shield-basic',
    'FINAL',
    v_authority.source_aggregate_sha256,
    v_authority.execution_slice_aggregate_sha256,
    jsonb_build_object(
      'schemaVersion','velmere.r7.shield-basic-final-evidence.v2',
      'githubRunId',p_github_run_id,
      'githubHeadSha',p_github_sha,
      'workflowSha256',p_workflow_sha256,
      'artifactDigestSha256',p_artifact_digest_sha256,
      'bridgeDigestSha256',p_bridge_digest_sha256,
      'oidcHelperDigestSha256',p_oidc_helper_digest_sha256,
      'sourceAuthorityRunId',v_authority.exact_windows_run_id,
      'sourceAuthorityHeadSha',v_authority.github_sha,
      'exactWindows','PASS_52_X2',
      'canonicalAssetId','eip155:56:0xca11bde05977b3631167028862be2a173976ca11',
      'currentEvidenceEventDigest','sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e',
      'productContract','CURRENT_DEFENSIVE_POSTURE_NOT_RISK_HISTORY',
      'customerTileRoute',true,
      'locales',jsonb_build_array('pl','en','de'),
      'provenance',true,
      'currentness',true,
      'calibratedUncertaintyBoundary',true,
      'descriptiveNotProbability',true,
      'missingAssetFailClosed',true,
      'invalidCapabilityDenied',true,
      'serviceRoleInApplication',false,
      'customerPublishable',true,
      'inheritedExactRiskV5SourceAuthority',true
    )
  );

  return jsonb_build_object(
    'ok',true,
    'productOrdinal',7,
    'productSlug','shield-basic',
    'finalStatus','FINAL',
    'customerFinalCount',(select count(*) from public.velmere_r7_customer_final_ledger),
    'idempotent',false
  );
end
$function$;

revoke all on function public.velmere_r7_finalize_shield_basic_v1(text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.velmere_r7_finalize_shield_basic_v1(text,text,text,text,text,text)
  to service_role;
