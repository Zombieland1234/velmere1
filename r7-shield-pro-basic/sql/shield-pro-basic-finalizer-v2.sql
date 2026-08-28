create table if not exists velmere_private.r7_shield_pro_basic_release_authority_v2(
 singleton boolean primary key default true check(singleton),
 product_ordinal integer not null check(product_ordinal=10),
 product_slug text not null check(product_slug='shield-pro-basic'),
 github_run_id text not null check(github_run_id~'^[1-9][0-9]{0,19}$'),
 github_artifact_id text not null check(github_artifact_id~'^[1-9][0-9]{1,20}$'),
 github_sha text not null check(github_sha~'^[a-f0-9]{40}$'),
 workflow_sha256 text not null check(workflow_sha256~'^[a-f0-9]{64}$'),
 artifact_digest_sha256 text not null check(artifact_digest_sha256~'^[a-f0-9]{64}$'),
 bridge_sha256 text not null check(bridge_sha256~'^[a-f0-9]{64}$'),
 oidc_helper_sha256 text not null check(oidc_helper_sha256~'^[a-f0-9]{64}$'),
 finalizer_edge_sha256 text not null check(finalizer_edge_sha256~'^[a-f0-9]{64}$'),
 data_plane_sql_sha256 text not null check(data_plane_sql_sha256~'^[a-f0-9]{64}$'),
 finalizer_sql_sha256 text not null check(finalizer_sql_sha256~'^[a-f0-9]{64}$'),
 full_source_aggregate_sha256 text not null check(full_source_aggregate_sha256~'^[a-f0-9]{64}$'),
 execution_slice_aggregate_sha256 text not null check(execution_slice_aggregate_sha256~'^[a-f0-9]{64}$'),
 execution_slice_manifest_sha256 text not null check(execution_slice_manifest_sha256~'^[a-f0-9]{64}$'),
 execution_bundle_sha256 text not null check(execution_bundle_sha256~'^[a-f0-9]{64}$'),
 data_function_definition_sha256 text not null check(data_function_definition_sha256~'^[a-f0-9]{64}$'),
 capability_function_definition_sha256 text not null check(capability_function_definition_sha256~'^[a-f0-9]{64}$'),
 finalizer_function_definition_sha256 text not null check(finalizer_function_definition_sha256~'^[a-f0-9]{64}$'),
 created_at timestamptz not null default clock_timestamp()
);
create or replace function velmere_private.block_r7_shield_pro_basic_release_authority_v2_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $f$ begin raise exception 'shield_pro_basic_release_authority_v2_append_only' using errcode='42501'; end $f$;
drop trigger if exists r7_shield_pro_basic_release_authority_v2_append_only on velmere_private.r7_shield_pro_basic_release_authority_v2;
create trigger r7_shield_pro_basic_release_authority_v2_append_only before update or delete on velmere_private.r7_shield_pro_basic_release_authority_v2 for each row execute function velmere_private.block_r7_shield_pro_basic_release_authority_v2_mutation();
revoke all on table velmere_private.r7_shield_pro_basic_release_authority_v2 from public,anon,authenticated;
grant select on table velmere_private.r7_shield_pro_basic_release_authority_v2 to service_role;

create or replace function public.velmere_r7_finalize_shield_pro_basic_v2(
 p_github_run_id text,p_github_artifact_id text,p_github_sha text,p_workflow_sha256 text,p_artifact_digest_sha256 text,
 p_bridge_digest_sha256 text,p_oidc_helper_digest_sha256 text,p_finalizer_edge_digest_sha256 text,
 p_data_plane_digest_sha256 text,p_finalizer_sql_digest_sha256 text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,velmere_private,extensions
as $f$
declare
 v_source velmere_private.r7_source_authority%rowtype; v_release velmere_private.r7_shield_pro_basic_release_authority_v2%rowtype;
 v_existing jsonb; v_required_events integer; v_latest timestamptz; v_data jsonb;
 v_data_sha text; v_cap_sha text; v_fin_sha text;
begin
 if not coalesce(p_github_run_id~'^[1-9][0-9]{0,19}$',false)
 or not coalesce(p_github_artifact_id~'^[1-9][0-9]{1,20}$',false)
 or not coalesce(p_github_sha~'^[a-f0-9]{40}$',false)
 or not coalesce(p_workflow_sha256~'^[a-f0-9]{64}$',false)
 or not coalesce(p_artifact_digest_sha256~'^[a-f0-9]{64}$',false)
 or not coalesce(p_bridge_digest_sha256~'^[a-f0-9]{64}$',false)
 or not coalesce(p_oidc_helper_digest_sha256~'^[a-f0-9]{64}$',false)
 or not coalesce(p_finalizer_edge_digest_sha256~'^[a-f0-9]{64}$',false)
 or not coalesce(p_data_plane_digest_sha256~'^[a-f0-9]{64}$',false)
 or not coalesce(p_finalizer_sql_digest_sha256~'^[a-f0-9]{64}$',false)
 then raise exception 'shield_pro_basic_finalization_identity_invalid' using errcode='22023'; end if;
 select * into strict v_source from velmere_private.r7_source_authority where singleton=true;
 if v_source.exact_windows_status is distinct from 'PASS' or v_source.test_denominator is distinct from 52
 or v_source.source_aggregate_sha256 is distinct from '50d59f5f028ef73b279fa3930889fcbf2ab5bc5e36ab4e8cec97be5ed49be67e'
 or v_source.execution_slice_aggregate_sha256 is distinct from 'f83f28de6add73eee70d9086f2705241243661d64b5c9fd579b17b359050a221'
 or v_source.execution_slice_manifest_sha256 is distinct from 'b947314bb696fb8f9153c34d46ba825c5897e9f8cc8cf911a5f31113aa5fc01f'
 or v_source.execution_bundle_sha256 is distinct from '8e3c66471d534310e1142c3671d43bb556e35b6901c847c9596eea14e8815967'
 or v_source.github_sha is distinct from '50840bb5a2cdc4384a557114e64a115828f97143'
 or v_source.exact_windows_run_id is distinct from '33056763944' or v_source.exact_windows_run_attempt is distinct from 1
 then raise exception 'shield_pro_basic_exact_source_authority_not_satisfied' using errcode='23514'; end if;
 v_data_sha:=encode(extensions.digest(pg_get_functiondef('public.velmere_r7_shield_pro_basic_terminal_data_v2(text)'::regprocedure),'sha256'),'hex');
 v_cap_sha:=encode(extensions.digest(pg_get_functiondef('public.velmere_r7_read_shield_pro_basic_server_capability_for_oidc()'::regprocedure),'sha256'),'hex');
 v_fin_sha:=encode(extensions.digest(pg_get_functiondef('public.velmere_r7_finalize_shield_pro_basic_v2(text,text,text,text,text,text,text,text,text,text)'::regprocedure),'sha256'),'hex');
 select * into v_release from velmere_private.r7_shield_pro_basic_release_authority_v2 where singleton=true;
 if not found then
  insert into velmere_private.r7_shield_pro_basic_release_authority_v2(
   singleton,product_ordinal,product_slug,github_run_id,github_artifact_id,github_sha,workflow_sha256,artifact_digest_sha256,
   bridge_sha256,oidc_helper_sha256,finalizer_edge_sha256,data_plane_sql_sha256,finalizer_sql_sha256,
   full_source_aggregate_sha256,execution_slice_aggregate_sha256,execution_slice_manifest_sha256,execution_bundle_sha256,
   data_function_definition_sha256,capability_function_definition_sha256,finalizer_function_definition_sha256)
  values(true,10,'shield-pro-basic',p_github_run_id,p_github_artifact_id,p_github_sha,p_workflow_sha256,p_artifact_digest_sha256,
   p_bridge_digest_sha256,p_oidc_helper_digest_sha256,p_finalizer_edge_digest_sha256,p_data_plane_digest_sha256,p_finalizer_sql_digest_sha256,
   v_source.source_aggregate_sha256,v_source.execution_slice_aggregate_sha256,v_source.execution_slice_manifest_sha256,v_source.execution_bundle_sha256,
   v_data_sha,v_cap_sha,v_fin_sha) returning * into v_release;
 end if;
 if v_release.github_run_id is distinct from p_github_run_id or v_release.github_artifact_id is distinct from p_github_artifact_id
 or v_release.github_sha is distinct from p_github_sha or v_release.workflow_sha256 is distinct from p_workflow_sha256
 or v_release.artifact_digest_sha256 is distinct from p_artifact_digest_sha256 or v_release.bridge_sha256 is distinct from p_bridge_digest_sha256
 or v_release.oidc_helper_sha256 is distinct from p_oidc_helper_digest_sha256 or v_release.finalizer_edge_sha256 is distinct from p_finalizer_edge_digest_sha256
 or v_release.data_plane_sql_sha256 is distinct from p_data_plane_digest_sha256 or v_release.finalizer_sql_sha256 is distinct from p_finalizer_sql_digest_sha256
 or v_release.full_source_aggregate_sha256 is distinct from v_source.source_aggregate_sha256
 or v_release.execution_slice_aggregate_sha256 is distinct from v_source.execution_slice_aggregate_sha256
 or v_release.execution_slice_manifest_sha256 is distinct from v_source.execution_slice_manifest_sha256
 or v_release.execution_bundle_sha256 is distinct from v_source.execution_bundle_sha256
 or v_release.data_function_definition_sha256 is distinct from v_data_sha or v_release.capability_function_definition_sha256 is distinct from v_cap_sha
 or v_release.finalizer_function_definition_sha256 is distinct from v_fin_sha
 then raise exception 'shield_pro_basic_release_authority_mismatch' using errcode='23514'; end if;
 select count(*)::integer,max(observed_at) into v_required_events,v_latest from public.velmere_risk_history_events
 where canonical_asset_id='eip155:56:0xca11bde05977b3631167028862be2a173976ca11'
 and event_digest in('sha256:fd4a3a3b66f5a030e951cc0c592a847197260418282b3f71b4fdacdc9b8aa861','sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e')
 and publication_state='PUBLIC' and customer_publishable=true;
 if v_required_events<>2 or v_latest>clock_timestamp()+interval '5 minutes' or v_latest<clock_timestamp()-interval '7 days'
 then raise exception 'shield_pro_basic_public_current_evidence_not_satisfied' using errcode='23514'; end if;
 v_data:=public.velmere_r7_shield_pro_basic_terminal_data_v2('multicall3-bsc');
 if coalesce(v_data->>'resolution','')<>'RESOLVED' or coalesce(v_data->>'terminalScope','')<>'BOUNDED_SINGLE_TARGET_FREE_BASIC'
 or coalesce(v_data->>'canonicalAssetId','')<>'eip155:56:0xca11bde05977b3631167028862be2a173976ca11'
 or coalesce((v_data->>'customerPublishable')::boolean,false)=false or coalesce((v_data->>'providerNetworkCalls')::integer,-1)<>0
 or coalesce((v_data->>'historyCount')::integer,0)<2
 then raise exception 'shield_pro_basic_customer_terminal_contract_not_satisfied' using errcode='23514'; end if;
 select jsonb_build_object('productOrdinal',product_ordinal,'productSlug',product_slug,'finalStatus',final_status,'finalizedAt',finalized_at,'evidence',evidence,'idempotent',true)
 into v_existing from public.velmere_r7_customer_final_ledger where product_slug='shield-pro-basic';
 if v_existing is not null then return v_existing; end if;
 insert into public.velmere_r7_customer_final_ledger(product_ordinal,product_slug,final_status,full_source_aggregate_sha256,execution_slice_aggregate_sha256,evidence)
 values(10,'shield-pro-basic','FINAL',v_source.source_aggregate_sha256,v_source.execution_slice_aggregate_sha256,
 jsonb_build_object(
 'schemaVersion','velmere.r7.shield-pro-basic-final-evidence.v2','githubRunId',p_github_run_id,'githubArtifactId',p_github_artifact_id,
 'githubHeadSha',p_github_sha,'workflowSha256',p_workflow_sha256,'artifactDigestSha256',p_artifact_digest_sha256,
 'bridgeDigestSha256',p_bridge_digest_sha256,'oidcHelperDigestSha256',p_oidc_helper_digest_sha256,
 'finalizerEdgeDigestSha256',p_finalizer_edge_digest_sha256,'dataPlaneSqlDigestSha256',p_data_plane_digest_sha256,
 'finalizerSqlDigestSha256',p_finalizer_sql_digest_sha256,'dataFunctionDefinitionSha256',v_data_sha,
 'capabilityFunctionDefinitionSha256',v_cap_sha,'finalizerFunctionDefinitionSha256',v_fin_sha,
 'sourceAuthorityRunId',v_source.exact_windows_run_id,'sourceAuthorityHeadSha',v_source.github_sha,
 'sourceAuthorityRunAttempt',v_source.exact_windows_run_attempt,'sourceAuthorityWorkflowSha256',v_source.workflow_sha256,
 'executionBundleSha256',v_source.execution_bundle_sha256,'executionSliceManifestSha256',v_source.execution_slice_manifest_sha256,
 'exactWindows','PASS_52_X2','testDenominator',52,'productContract','BOUNDED_SINGLE_TARGET_FREE_TRIAGE_TERMINAL_NOT_SHIELD_TILE_NOT_SHIELD_MAP',
 'terminalScope','BOUNDED_SINGLE_TARGET_FREE_BASIC','freeBasic',true,'locales',jsonb_build_array('pl','en','de'),
 'customerTerminalRoute',true,'customerCards',8,'operatorTableRows',2,'actionQueueItems',4,
 'canonicalAssetId','eip155:56:0xca11bde05977b3631167028862be2a173976ca11',
 'requiredEventDigests',jsonb_build_array('sha256:fd4a3a3b66f5a030e951cc0c592a847197260418282b3f71b4fdacdc9b8aa861','sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e'),
 'currentnessMaxAgeSeconds',604800,'sourceClass','VELMERE_GENERATED_PUBLIC_EVIDENCE_FROM_DIRECT_CHAIN_BOUND_SOURCE',
 'customerDisplayRightsBasis','FIRST_PARTY_DERIVED_CUSTOMER_PUBLISHABLE_EVIDENCE_NO_EXTERNAL_PROVIDER_PAYLOAD',
 'providerNetworkCalls',0,'externalProviderRedistributionClaimed',false,'rawProviderPayloadReturned',false,
 'serviceRoleInApplication',false,'invalidCapabilityDenied',true,'missingAssetFailClosed',true,'unsupportedLocaleRejected',true,
 'unknownFieldRejected',true,'oversizedBodyRejected',true,'wrongMethodRejected',true,
 'distinctFromShieldBasic',true,'distinctFromShieldMap',true,'paidValueCredit',false));
 return jsonb_build_object('ok',true,'productOrdinal',10,'productSlug','shield-pro-basic','finalStatus','FINAL',
 'customerFinalCount',(select count(*) from public.velmere_r7_customer_final_ledger),'idempotent',false);
end $f$;
revoke all on function public.velmere_r7_finalize_shield_pro_basic_v2(text,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.velmere_r7_finalize_shield_pro_basic_v2(text,text,text,text,text,text,text,text,text,text) to service_role;