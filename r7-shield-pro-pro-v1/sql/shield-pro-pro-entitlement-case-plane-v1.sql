create schema if not exists velmere_private;

create table if not exists velmere_private.r7_shield_pro_pro_entitlements (
  entitlement_id uuid primary key default extensions.gen_random_uuid(),
  account_id uuid not null,
  status text not null check (status in ('ACTIVE','REVOKED','EXPIRED')),
  source text not null check (source in ('OWNER_AUTHORIZED_INTERNAL_VALIDATION','PAYMENT_VERIFIED','CUSTOMER_OWNED_CONTRACT')),
  validation_only boolean not null default false,
  github_run_id text,
  github_head_sha text,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (valid_until > valid_from),
  check (github_run_id is null or github_run_id ~ '^[1-9][0-9]{0,19}$'),
  check (github_head_sha is null or github_head_sha ~ '^[a-f0-9]{40}$')
);

create index if not exists r7_shield_pro_pro_entitlements_account_idx
  on velmere_private.r7_shield_pro_pro_entitlements(account_id, status, valid_until);

create table if not exists velmere_private.r7_shield_pro_pro_cases (
  case_id uuid primary key default extensions.gen_random_uuid(),
  case_ref text not null unique check (case_ref ~ '^SPP-[A-F0-9]{12}$'),
  account_id uuid not null,
  locale text not null check (locale in ('pl','en','de')),
  status text not null check (status in ('OPEN','ACKNOWLEDGED','DELETED')),
  revision integer not null default 1 check (revision between 1 and 1000000),
  payload jsonb not null,
  payload_digest_sha256 text not null check (payload_digest_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  deleted_at timestamptz
);

create index if not exists r7_shield_pro_pro_cases_account_idx
  on velmere_private.r7_shield_pro_pro_cases(account_id, created_at desc);

create table if not exists velmere_private.r7_shield_pro_pro_rate_limits (
  account_id uuid not null,
  window_start timestamptz not null,
  request_count integer not null check (request_count between 1 and 1000000),
  primary key(account_id, window_start)
);

revoke all on table velmere_private.r7_shield_pro_pro_entitlements from public, anon, authenticated;
revoke all on table velmere_private.r7_shield_pro_pro_cases from public, anon, authenticated;
revoke all on table velmere_private.r7_shield_pro_pro_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table velmere_private.r7_shield_pro_pro_entitlements to service_role;
grant select, insert, update, delete on table velmere_private.r7_shield_pro_pro_cases to service_role;
grant select, insert, update, delete on table velmere_private.r7_shield_pro_pro_rate_limits to service_role;

create or replace function public.velmere_r7_shield_pro_pro_entitlement_status_v1(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'velmere_private'
as $function$
declare
  v_row velmere_private.r7_shield_pro_pro_entitlements%rowtype;
begin
  select * into v_row
    from velmere_private.r7_shield_pro_pro_entitlements
   where account_id = p_account_id
     and status = 'ACTIVE'
     and valid_from <= now()
     and valid_until > now()
   order by valid_until desc
   limit 1;

  if not found then
    return jsonb_build_object('entitled', false);
  end if;

  return jsonb_build_object(
    'entitled', true,
    'entitlementId', v_row.entitlement_id,
    'source', v_row.source,
    'validationOnly', v_row.validation_only,
    'validUntil', v_row.valid_until
  );
end
$function$;

create or replace function public.velmere_r7_grant_shield_pro_pro_validation_entitlement_v1(
  p_account_id uuid,
  p_github_run_id text,
  p_github_head_sha text,
  p_valid_minutes integer default 45
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'velmere_private'
as $function$
declare
  v_id uuid;
  v_until timestamptz;
begin
  if p_account_id is null
     or not coalesce(p_github_run_id ~ '^[1-9][0-9]{0,19}$', false)
     or not coalesce(p_github_head_sha ~ '^[a-f0-9]{40}$', false)
     or p_valid_minutes not between 10 and 120
  then
    raise exception 'shield_pro_pro_validation_entitlement_input_invalid' using errcode = '22023';
  end if;

  update velmere_private.r7_shield_pro_pro_entitlements
     set status='REVOKED', revoked_at=now()
   where account_id=p_account_id and status='ACTIVE';

  v_until := now() + make_interval(mins => p_valid_minutes);
  insert into velmere_private.r7_shield_pro_pro_entitlements(
    account_id,status,source,validation_only,github_run_id,github_head_sha,valid_until
  ) values (
    p_account_id,'ACTIVE','OWNER_AUTHORIZED_INTERNAL_VALIDATION',true,p_github_run_id,p_github_head_sha,v_until
  ) returning entitlement_id into v_id;

  return jsonb_build_object('ok',true,'entitlementId',v_id,'accountId',p_account_id,'validUntil',v_until,'paymentClaimed',false,'validationOnly',true);
end
$function$;

create or replace function public.velmere_r7_revoke_shield_pro_pro_entitlement_v1(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'velmere_private'
as $function$
declare
  v_count integer;
begin
  update velmere_private.r7_shield_pro_pro_entitlements
     set status='REVOKED', revoked_at=now()
   where account_id=p_account_id and status='ACTIVE';
  get diagnostics v_count = row_count;
  return jsonb_build_object('ok',true,'revoked',v_count);
end
$function$;

create or replace function public.velmere_r7_consume_shield_pro_pro_rate_limit_v1(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'velmere_private'
as $function$
declare
  v_window timestamptz;
  v_count integer;
begin
  v_window := date_trunc('minute', now());
  insert into velmere_private.r7_shield_pro_pro_rate_limits(account_id,window_start,request_count)
  values(p_account_id,v_window,1)
  on conflict(account_id,window_start)
  do update set request_count=velmere_private.r7_shield_pro_pro_rate_limits.request_count+1
  returning request_count into v_count;

  delete from velmere_private.r7_shield_pro_pro_rate_limits where window_start < now()-interval '10 minutes';
  return jsonb_build_object('allowed',v_count <= 60,'count',v_count,'limit',60,'windowStart',v_window);
end
$function$;

create or replace function public.velmere_r7_create_shield_pro_pro_case_v1(p_account_id uuid,p_locale text)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'velmere_private', 'extensions'
as $function$
declare
  v_entitlement jsonb;
  v_history jsonb;
  v_first jsonb;
  v_current jsonb;
  v_count integer;
  v_active integer;
  v_case_ref text;
  v_payload jsonb;
  v_digest text;
  v_case_id uuid;
begin
  if p_account_id is null or p_locale not in ('pl','en','de') then
    raise exception 'shield_pro_pro_case_input_invalid' using errcode='22023';
  end if;

  v_entitlement := public.velmere_r7_shield_pro_pro_entitlement_status_v1(p_account_id);
  if coalesce((v_entitlement->>'entitled')::boolean,false)=false then
    raise exception 'shield_pro_pro_entitlement_required' using errcode='42501';
  end if;

  select count(*)::integer into v_active
    from velmere_private.r7_shield_pro_pro_cases
   where account_id=p_account_id and status in ('OPEN','ACKNOWLEDGED');
  if v_active >= 10 then
    raise exception 'shield_pro_pro_active_case_limit_reached' using errcode='54000';
  end if;

  select jsonb_agg(e.event_json order by e.observed_at),count(*)::integer
    into v_history,v_count
    from public.velmere_risk_history_events e
   where e.canonical_asset_id='eip155:56:0xca11bde05977b3631167028862be2a173976ca11'
     and e.event_digest in (
       'sha256:fd4a3a3b66f5a030e951cc0c592a847197260418282b3f71b4fdacdc9b8aa861',
       'sha256:0aa92b05d736f5a3691be2420b77a0da7ff800d27707cb6f976d4626deb4f65e'
     )
     and e.publication_state='PUBLIC'
     and e.customer_publishable=true;
  if v_count<>2 or jsonb_array_length(coalesce(v_history,'[]'::jsonb))<>2 then
    raise exception 'shield_pro_pro_public_history_missing' using errcode='23514';
  end if;

  v_first:=v_history->0;
  v_current:=v_history->1;
  if (v_current->>'sourceAsOf')::timestamptz < now()-interval '7 days'
     or (v_current->>'sourceAsOf')::timestamptz > now()+interval '5 minutes'
  then
    raise exception 'shield_pro_pro_evidence_stale_or_future' using errcode='22023';
  end if;

  v_case_ref := 'SPP-' || upper(encode(extensions.gen_random_bytes(6),'hex'));
  v_payload := jsonb_build_object(
    'schemaVersion','velmere.r7.shield-pro-pro-case-payload.v1',
    'productSlug','shield-pro-pro',
    'tier','pro',
    'caseRef',v_case_ref,
    'locale',p_locale,
    'asset',jsonb_build_object(
      'assetId','multicall3-bsc',
      'canonicalAssetId','eip155:56:0xca11bde05977b3631167028862be2a173976ca11',
      'symbol','MC3',
      'name','Multicall3'
    ),
    'timeline',v_history,
    'deltaAnalysis',jsonb_build_object(
      'scoreDelta',coalesce((v_current->>'score')::numeric,0)-coalesce((v_first->>'score')::numeric,0),
      'confidenceDelta',coalesce((v_current->>'confidence')::numeric,0)-coalesce((v_first->>'confidence')::numeric,0),
      'signalCountDelta',coalesce((v_current->>'signalCount')::integer,0)-coalesce((v_first->>'signalCount')::integer,0),
      'methodologyChanged',coalesce(v_current->>'methodologyVersion','')<>coalesce(v_first->>'methodologyVersion',''),
      'scoreVersionChanged',coalesce(v_current->>'scoreVersion','')<>coalesce(v_first->>'scoreVersion',''),
      'evidenceVersionChanged',coalesce(v_current->>'evidenceVersion','')<>coalesce(v_first->>'evidenceVersion',''),
      'evidenceDigestChanged',coalesce(v_current->>'evidenceDigest','')<>coalesce(v_first->>'evidenceDigest',''),
      'comparabilityBoundary',coalesce((v_current->>'comparableToPrevious')::boolean,false)=false
    ),
    'alertPolicy',jsonb_build_object(
      'scoreAbsoluteChangeThreshold',1,
      'confidenceBelowThreshold',0.8,
      'methodologyChangeAlert',true,
      'evidenceDigestChangeAlert',true,
      'automaticExecutionAllowed',false
    ),
    'workflow',jsonb_build_object(
      'persistentAccountScopedCase',true,
      'acknowledgementRequired',true,
      'crossAccountAccessAllowed',false,
      'maxActiveCases',10
    ),
    'rights',jsonb_build_object(
      'sourceClass','VELMERE_GENERATED_PUBLIC_EVIDENCE_FROM_DIRECT_CHAIN_BOUND_SOURCE',
      'customerDisplayRightsBasis','FIRST_PARTY_DERIVED_CUSTOMER_PUBLISHABLE_EVIDENCE',
      'externalProviderRedistributionClaimed',false,
      'rawProviderPayloadReturned',false
    ),
    'truthBoundary','Shield Pro Pro adds an account-scoped persistent triage case, timeline delta analysis, alert policy and acknowledgement workflow. It is not an audit, automated remediation, investment advice, legal advice or a probability of safety.'
  );
  v_digest := 'sha256:' || encode(extensions.digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex');

  insert into velmere_private.r7_shield_pro_pro_cases(case_ref,account_id,locale,status,payload,payload_digest_sha256)
  values(v_case_ref,p_account_id,p_locale,'OPEN',v_payload,v_digest)
  returning case_id into v_case_id;

  return jsonb_build_object('ok',true,'caseId',v_case_id,'caseRef',v_case_ref,'status','OPEN','revision',1,'payloadDigestSha256',v_digest,'payload',v_payload);
end
$function$;

create or replace function public.velmere_r7_read_shield_pro_pro_case_v1(p_account_id uuid,p_case_ref text)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'velmere_private'
as $function$
declare
  v_entitlement jsonb;
  v_row velmere_private.r7_shield_pro_pro_cases%rowtype;
begin
  if p_account_id is null or not coalesce(p_case_ref ~ '^SPP-[A-F0-9]{12}$',false) then
    raise exception 'shield_pro_pro_case_read_input_invalid' using errcode='22023';
  end if;
  v_entitlement:=public.velmere_r7_shield_pro_pro_entitlement_status_v1(p_account_id);
  if coalesce((v_entitlement->>'entitled')::boolean,false)=false then
    raise exception 'shield_pro_pro_entitlement_required' using errcode='42501';
  end if;
  select * into v_row from velmere_private.r7_shield_pro_pro_cases
   where account_id=p_account_id and case_ref=p_case_ref and status<>'DELETED';
  if not found then return jsonb_build_object('resolution','NOT_FOUND'); end if;
  return jsonb_build_object('resolution','RESOLVED','caseRef',v_row.case_ref,'status',v_row.status,'revision',v_row.revision,'locale',v_row.locale,'createdAt',v_row.created_at,'updatedAt',v_row.updated_at,'acknowledgedAt',v_row.acknowledged_at,'payloadDigestSha256',v_row.payload_digest_sha256,'payload',v_row.payload);
end
$function$;

create or replace function public.velmere_r7_acknowledge_shield_pro_pro_case_v1(p_account_id uuid,p_case_ref text)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'velmere_private'
as $function$
declare
  v_entitlement jsonb;
  v_revision integer;
begin
  if p_account_id is null or not coalesce(p_case_ref ~ '^SPP-[A-F0-9]{12}$',false) then
    raise exception 'shield_pro_pro_case_ack_input_invalid' using errcode='22023';
  end if;
  v_entitlement:=public.velmere_r7_shield_pro_pro_entitlement_status_v1(p_account_id);
  if coalesce((v_entitlement->>'entitled')::boolean,false)=false then
    raise exception 'shield_pro_pro_entitlement_required' using errcode='42501';
  end if;
  update velmere_private.r7_shield_pro_pro_cases
     set status='ACKNOWLEDGED',revision=revision+1,acknowledged_at=coalesce(acknowledged_at,now()),updated_at=now()
   where account_id=p_account_id and case_ref=p_case_ref and status in ('OPEN','ACKNOWLEDGED')
   returning revision into v_revision;
  if not found then return jsonb_build_object('resolution','NOT_FOUND'); end if;
  return jsonb_build_object('resolution','RESOLVED','caseRef',p_case_ref,'status','ACKNOWLEDGED','revision',v_revision);
end
$function$;

create or replace function public.velmere_r7_delete_shield_pro_pro_case_v1(p_account_id uuid,p_case_ref text)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'velmere_private'
as $function$
declare
  v_entitlement jsonb;
  v_revision integer;
begin
  if p_account_id is null or not coalesce(p_case_ref ~ '^SPP-[A-F0-9]{12}$',false) then
    raise exception 'shield_pro_pro_case_delete_input_invalid' using errcode='22023';
  end if;
  v_entitlement:=public.velmere_r7_shield_pro_pro_entitlement_status_v1(p_account_id);
  if coalesce((v_entitlement->>'entitled')::boolean,false)=false then
    raise exception 'shield_pro_pro_entitlement_required' using errcode='42501';
  end if;
  update velmere_private.r7_shield_pro_pro_cases
     set status='DELETED',revision=revision+1,deleted_at=now(),updated_at=now(),payload='{}'::jsonb
   where account_id=p_account_id and case_ref=p_case_ref and status<>'DELETED'
   returning revision into v_revision;
  if not found then return jsonb_build_object('resolution','NOT_FOUND'); end if;
  return jsonb_build_object('resolution','RESOLVED','caseRef',p_case_ref,'status','DELETED','revision',v_revision,'payloadErased',true);
end
$function$;

create or replace function public.velmere_r7_cleanup_shield_pro_pro_validation_v1(p_account_ids uuid[],p_github_run_id text)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'velmere_private'
as $function$
declare
  v_cases integer;
  v_entitlements integer;
begin
  if p_account_ids is null or cardinality(p_account_ids)<1 or cardinality(p_account_ids)>10
     or not coalesce(p_github_run_id ~ '^[1-9][0-9]{0,19}$',false)
  then raise exception 'shield_pro_pro_cleanup_input_invalid' using errcode='22023'; end if;
  delete from velmere_private.r7_shield_pro_pro_cases where account_id=any(p_account_ids);
  get diagnostics v_cases=row_count;
  delete from velmere_private.r7_shield_pro_pro_entitlements where account_id=any(p_account_ids) and github_run_id=p_github_run_id and validation_only=true;
  get diagnostics v_entitlements=row_count;
  delete from velmere_private.r7_shield_pro_pro_rate_limits where account_id=any(p_account_ids);
  return jsonb_build_object('ok',true,'casesDeleted',v_cases,'entitlementsDeleted',v_entitlements);
end
$function$;

revoke all on function public.velmere_r7_shield_pro_pro_entitlement_status_v1(uuid) from public,anon,authenticated;
revoke all on function public.velmere_r7_grant_shield_pro_pro_validation_entitlement_v1(uuid,text,text,integer) from public,anon,authenticated;
revoke all on function public.velmere_r7_revoke_shield_pro_pro_entitlement_v1(uuid) from public,anon,authenticated;
revoke all on function public.velmere_r7_consume_shield_pro_pro_rate_limit_v1(uuid) from public,anon,authenticated;
revoke all on function public.velmere_r7_create_shield_pro_pro_case_v1(uuid,text) from public,anon,authenticated;
revoke all on function public.velmere_r7_read_shield_pro_pro_case_v1(uuid,text) from public,anon,authenticated;
revoke all on function public.velmere_r7_acknowledge_shield_pro_pro_case_v1(uuid,text) from public,anon,authenticated;
revoke all on function public.velmere_r7_delete_shield_pro_pro_case_v1(uuid,text) from public,anon,authenticated;
revoke all on function public.velmere_r7_cleanup_shield_pro_pro_validation_v1(uuid[],text) from public,anon,authenticated;
grant execute on function public.velmere_r7_shield_pro_pro_entitlement_status_v1(uuid) to service_role;
grant execute on function public.velmere_r7_grant_shield_pro_pro_validation_entitlement_v1(uuid,text,text,integer) to service_role;
grant execute on function public.velmere_r7_revoke_shield_pro_pro_entitlement_v1(uuid) to service_role;
grant execute on function public.velmere_r7_consume_shield_pro_pro_rate_limit_v1(uuid) to service_role;
grant execute on function public.velmere_r7_create_shield_pro_pro_case_v1(uuid,text) to service_role;
grant execute on function public.velmere_r7_read_shield_pro_pro_case_v1(uuid,text) to service_role;
grant execute on function public.velmere_r7_acknowledge_shield_pro_pro_case_v1(uuid,text) to service_role;
grant execute on function public.velmere_r7_delete_shield_pro_pro_case_v1(uuid,text) to service_role;
grant execute on function public.velmere_r7_cleanup_shield_pro_pro_validation_v1(uuid[],text) to service_role;
