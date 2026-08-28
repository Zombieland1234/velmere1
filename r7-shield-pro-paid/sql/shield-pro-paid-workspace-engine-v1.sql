create table if not exists velmere_private.r7_shield_pro_paid_entitlement_events(
 event_id bigint generated always as identity primary key,
 entitlement_ref uuid not null,
 account_id uuid not null,
 tier text not null check(tier in('pro','advanced')),
 event_kind text not null check(event_kind in('GRANT','REVOKE')),
 authority text not null check(authority in('E2E_TEST_NO_PAYMENT_CREDIT','PAYMENT_WEBHOOK','CUSTOMER_OWNED_AUTHORITY')),
 expires_at timestamptz,
 evidence jsonb not null default '{}'::jsonb,
 recorded_at timestamptz not null default clock_timestamp(),
 unique(entitlement_ref,event_kind)
);
create or replace function velmere_private.block_r7_shield_pro_paid_entitlement_event_mutation() returns trigger language plpgsql set search_path=pg_catalog as $f$ begin raise exception 'shield_pro_paid_entitlement_events_append_only' using errcode='42501'; end $f$;
drop trigger if exists r7_shield_pro_paid_entitlement_events_append_only on velmere_private.r7_shield_pro_paid_entitlement_events;
create trigger r7_shield_pro_paid_entitlement_events_append_only before update or delete on velmere_private.r7_shield_pro_paid_entitlement_events for each row execute function velmere_private.block_r7_shield_pro_paid_entitlement_event_mutation();
revoke all on table velmere_private.r7_shield_pro_paid_entitlement_events from public,anon,authenticated;
grant select,insert on table velmere_private.r7_shield_pro_paid_entitlement_events to service_role;

create table if not exists velmere_private.r7_shield_pro_paid_workspace_events(
 event_id bigint generated always as identity primary key,
 workspace_id uuid not null,
 account_id uuid not null,
 tier text not null check(tier in('pro','advanced')),
 locale text not null check(locale in('pl','en','de')),
 event_kind text not null check(event_kind in('CREATE','DELETE','RESTORE')),
 e2e_run_id text check(e2e_run_id is null or e2e_run_id~'^[1-9][0-9]{0,19}$'),
 payload jsonb not null,
 payload_digest_sha256 text not null check(payload_digest_sha256~'^[a-f0-9]{64}$'),
 recorded_at timestamptz not null default clock_timestamp()
);
create index if not exists r7_shield_pro_paid_workspace_account_idx on velmere_private.r7_shield_pro_paid_workspace_events(account_id,workspace_id,event_id desc);
create or replace function velmere_private.block_r7_shield_pro_paid_workspace_event_mutation() returns trigger language plpgsql set search_path=pg_catalog as $f$ begin raise exception 'shield_pro_paid_workspace_events_append_only' using errcode='42501'; end $f$;
drop trigger if exists r7_shield_pro_paid_workspace_events_append_only on velmere_private.r7_shield_pro_paid_workspace_events;
create trigger r7_shield_pro_paid_workspace_events_append_only before update or delete on velmere_private.r7_shield_pro_paid_workspace_events for each row execute function velmere_private.block_r7_shield_pro_paid_workspace_event_mutation();
revoke all on table velmere_private.r7_shield_pro_paid_workspace_events from public,anon,authenticated;
grant select,insert on table velmere_private.r7_shield_pro_paid_workspace_events to service_role;

create or replace function public.velmere_r7_shield_pro_paid_e2e_grant_v1(p_account_id uuid,p_tier text,p_github_run_id text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,velmere_private,extensions
as $f$ declare v_ref uuid:=gen_random_uuid(); begin
 if p_account_id is null or p_tier not in('pro','advanced') or p_github_run_id!~'^[1-9][0-9]{0,19}$' then raise exception 'shield_pro_paid_e2e_grant_invalid' using errcode='22023'; end if;
 insert into velmere_private.r7_shield_pro_paid_entitlement_events(entitlement_ref,account_id,tier,event_kind,authority,expires_at,evidence)
 values(v_ref,p_account_id,p_tier,'GRANT','E2E_TEST_NO_PAYMENT_CREDIT',clock_timestamp()+interval '2 hours',jsonb_build_object('githubRunId',p_github_run_id,'paymentCredit',false,'purpose','REAL_ENTITLEMENT_PATH_E2E'));
 return jsonb_build_object('ok',true,'entitlementRef',v_ref,'accountId',p_account_id,'tier',p_tier,'expiresAt',clock_timestamp()+interval '2 hours','paymentCredit',false);
end $f$;
revoke all on function public.velmere_r7_shield_pro_paid_e2e_grant_v1(uuid,text,text) from public,anon,authenticated;
grant execute on function public.velmere_r7_shield_pro_paid_e2e_grant_v1(uuid,text,text) to service_role;

create or replace function public.velmere_r7_shield_pro_paid_e2e_revoke_run_v1(p_github_run_id text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,velmere_private
as $f$ declare v_count integer; begin
 if p_github_run_id!~'^[1-9][0-9]{0,19}$' then raise exception 'shield_pro_paid_e2e_revoke_invalid' using errcode='22023'; end if;
 insert into velmere_private.r7_shield_pro_paid_entitlement_events(entitlement_ref,account_id,tier,event_kind,authority,expires_at,evidence)
 select g.entitlement_ref,g.account_id,g.tier,'REVOKE','E2E_TEST_NO_PAYMENT_CREDIT',clock_timestamp(),jsonb_build_object('githubRunId',p_github_run_id,'paymentCredit',false,'purpose','E2E_CLEANUP_REVOKE')
 from velmere_private.r7_shield_pro_paid_entitlement_events g
 where g.event_kind='GRANT' and g.authority='E2E_TEST_NO_PAYMENT_CREDIT' and g.evidence->>'githubRunId'=p_github_run_id
 and not exists(select 1 from velmere_private.r7_shield_pro_paid_entitlement_events r where r.entitlement_ref=g.entitlement_ref and r.event_kind='REVOKE');
 get diagnostics v_count=row_count;
 return jsonb_build_object('ok',true,'revoked',v_count,'githubRunId',p_github_run_id,'paymentCredit',false);
end $f$;
revoke all on function public.velmere_r7_shield_pro_paid_e2e_revoke_run_v1(text) from public,anon,authenticated;
grant execute on function public.velmere_r7_shield_pro_paid_e2e_revoke_run_v1(text) to service_role;

create or replace function public.velmere_r7_shield_pro_has_paid_entitlement_v1(p_tier text)
returns boolean language sql stable security definer set search_path=pg_catalog,velmere_private,auth
as $f$
 select auth.uid() is not null and exists(
  select 1 from velmere_private.r7_shield_pro_paid_entitlement_events g
  where g.account_id=auth.uid() and g.event_kind='GRANT' and (g.expires_at is null or g.expires_at>clock_timestamp())
  and (g.tier=p_tier or(g.tier='advanced' and p_tier='pro'))
  and not exists(select 1 from velmere_private.r7_shield_pro_paid_entitlement_events r where r.entitlement_ref=g.entitlement_ref and r.event_kind='REVOKE'))
$f$;
revoke all on function public.velmere_r7_shield_pro_has_paid_entitlement_v1(text) from public,anon;
grant execute on function public.velmere_r7_shield_pro_has_paid_entitlement_v1(text) to authenticated,service_role;

create or replace function public.velmere_r7_shield_pro_paid_workspace_v1(p_tier text,p_locale text,p_operation text,p_workspace_id uuid default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,velmere_private,auth,extensions
as $f$
declare
 v_account uuid:=auth.uid(); v_limit integer; v_assets jsonb:='[]'::jsonb; v_history jsonb; v_asset record; v_count integer:=0;
 v_workspace uuid; v_payload jsonb; v_digest text; v_latest velmere_private.r7_shield_pro_paid_workspace_events%rowtype; v_run_id text;
begin
 if v_account is null then raise exception 'shield_pro_paid_auth_required' using errcode='28000'; end if;
 if p_tier not in('pro','advanced') or p_locale not in('pl','en','de') or p_operation not in('CREATE','READ','DELETE','RESTORE') then raise exception 'shield_pro_paid_request_invalid' using errcode='22023'; end if;
 if not public.velmere_r7_shield_pro_has_paid_entitlement_v1(p_tier) then raise exception 'shield_pro_paid_entitlement_required' using errcode='42501'; end if;
 select g.evidence->>'githubRunId' into v_run_id from velmere_private.r7_shield_pro_paid_entitlement_events g
 where g.account_id=v_account and g.event_kind='GRANT' and (g.expires_at is null or g.expires_at>clock_timestamp()) and (g.tier=p_tier or(g.tier='advanced' and p_tier='pro'))
 and not exists(select 1 from velmere_private.r7_shield_pro_paid_entitlement_events r where r.entitlement_ref=g.entitlement_ref and r.event_kind='REVOKE')
 order by g.event_id desc limit 1;
 if p_operation<>'CREATE' then
  if p_workspace_id is null then raise exception 'shield_pro_paid_workspace_id_required' using errcode='22023'; end if;
  select * into v_latest from velmere_private.r7_shield_pro_paid_workspace_events w where w.workspace_id=p_workspace_id and w.account_id=v_account order by w.event_id desc limit 1;
  if not found then return jsonb_build_object('resolution','NOT_FOUND'); end if;
  if p_operation='READ' then
   if v_latest.event_kind='DELETE' then return jsonb_build_object('resolution','NOT_FOUND'); end if;
   return jsonb_build_object('resolution','RESOLVED','operation','READ','workspaceId',v_latest.workspace_id,'tier',v_latest.tier,'locale',v_latest.locale,'payload',v_latest.payload,'payloadDigestSha256',v_latest.payload_digest_sha256,'providerNetworkCalls',0);
  elsif p_operation='DELETE' then
   if v_latest.event_kind='DELETE' then return jsonb_build_object('resolution','DELETED','idempotent',true,'workspaceId',v_latest.workspace_id,'payloadDigestSha256',v_latest.payload_digest_sha256); end if;
   insert into velmere_private.r7_shield_pro_paid_workspace_events(workspace_id,account_id,tier,locale,event_kind,e2e_run_id,payload,payload_digest_sha256)
   values(v_latest.workspace_id,v_account,v_latest.tier,v_latest.locale,'DELETE',v_run_id,v_latest.payload,v_latest.payload_digest_sha256);
   return jsonb_build_object('resolution','DELETED','idempotent',false,'workspaceId',v_latest.workspace_id,'payloadDigestSha256',v_latest.payload_digest_sha256);
  else
   if v_latest.event_kind<>'DELETE' then raise exception 'shield_pro_paid_restore_requires_deleted_workspace' using errcode='23514'; end if;
   insert into velmere_private.r7_shield_pro_paid_workspace_events(workspace_id,account_id,tier,locale,event_kind,e2e_run_id,payload,payload_digest_sha256)
   values(v_latest.workspace_id,v_account,v_latest.tier,v_latest.locale,'RESTORE',v_run_id,v_latest.payload,v_latest.payload_digest_sha256);
   return jsonb_build_object('resolution','RESTORED','workspaceId',v_latest.workspace_id,'tier',v_latest.tier,'locale',v_latest.locale,'payload',v_latest.payload,'payloadDigestSha256',v_latest.payload_digest_sha256,'providerNetworkCalls',0);
  end if;
 end if;
 v_limit:=case when p_tier='pro' then 3 else 6 end;
 for v_asset in
  select e.asset_id,max(e.observed_at) as latest from public.velmere_risk_history_events e
  where e.publication_state='PUBLIC' and e.customer_publishable=true and e.observed_at>=clock_timestamp()-interval '7 days'
  group by e.asset_id having count(*)>=2 order by latest desc,e.asset_id limit v_limit
 loop
  v_history:=public.velmere_read_public_risk_history_by_asset_v1(v_asset.asset_id,2,null);
  if coalesce(v_history->>'resolution','')='RESOLVED' and jsonb_array_length(coalesce(v_history->'events','[]'::jsonb))=2 then
   v_assets:=v_assets||jsonb_build_array(jsonb_build_object('assetId',v_asset.asset_id,'canonicalAssetId',v_history->>'canonicalAssetId','events',v_history->'events'));
   v_count:=v_count+1;
  end if;
 end loop;
 if v_count<>v_limit then raise exception 'shield_pro_paid_current_asset_denominator_not_satisfied' using errcode='23514'; end if;
 v_workspace:=gen_random_uuid();
 v_payload:=jsonb_build_object('schemaVersion','velmere.r7.shield-pro-paid-workspace-payload.v1','tier',p_tier,'locale',p_locale,'coverageAssets',v_limit,'historyEventsPerAsset',2,'assets',v_assets,'generatedAt',clock_timestamp(),'sourceClass','VELMERE_GENERATED_PUBLIC_EVIDENCE_FROM_DIRECT_CHAIN_BOUND_SOURCE','customerDisplayRightsBasis','FIRST_PARTY_DERIVED_CUSTOMER_PUBLISHABLE_EVIDENCE_NO_EXTERNAL_PROVIDER_PAYLOAD','providerNetworkCalls',0,'rawProviderPayloadReturned',false,'materialDelta',case when p_tier='pro' then 'THREE_TARGET_PERSISTENT_MONITORING_HISTORY' else 'SIX_TARGET_PRIORITY_CORRELATION_TEAM_AUTOMATION_WORKFLOW' end);
 v_digest:=encode(extensions.digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex');
 insert into velmere_private.r7_shield_pro_paid_workspace_events(workspace_id,account_id,tier,locale,event_kind,e2e_run_id,payload,payload_digest_sha256)
 values(v_workspace,v_account,p_tier,p_locale,'CREATE',v_run_id,v_payload,v_digest);
 return jsonb_build_object('resolution','CREATED','operation','CREATE','workspaceId',v_workspace,'tier',p_tier,'locale',p_locale,'payload',v_payload,'payloadDigestSha256',v_digest,'providerNetworkCalls',0);
end $f$;
revoke all on function public.velmere_r7_shield_pro_paid_workspace_v1(text,text,text,uuid) from public,anon;
grant execute on function public.velmere_r7_shield_pro_paid_workspace_v1(text,text,text,uuid) to authenticated,service_role;