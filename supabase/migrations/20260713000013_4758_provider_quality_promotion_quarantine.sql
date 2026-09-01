-- PASS4758: provider-quality promotion gate, persistent anomaly quarantine and operator-approved revalidation/release.

create extension if not exists pgcrypto;

create table if not exists public.velmere_provider_observation_quarantine (
  asset_key_hash text primary key check (asset_key_hash ~ '^[a-f0-9]{64}$'),
  state text not null check (state in ('quarantined','revalidation_pending','released')),
  reason_code text not null check (reason_code in ('history_anomalous','repeated_divergence','material_drift','operator_revalidation','stable_release')),
  evidence_digest text not null check (evidence_digest ~ '^[a-f0-9]{64}$'),
  operator_hash text check (operator_hash is null or operator_hash ~ '^[a-f0-9]{64}$'),
  reason_hash text check (reason_hash is null or reason_hash ~ '^[a-f0-9]{64}$'),
  approval_digest text check (approval_digest is null or approval_digest ~ '^[a-f0-9]{64}$'),
  quarantined_at timestamptz not null default now(),
  revalidation_requested_at timestamptz,
  released_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.velmere_provider_observation_quarantine enable row level security;
revoke all on table public.velmere_provider_observation_quarantine from public,anon,authenticated;
grant select,insert,update on table public.velmere_provider_observation_quarantine to service_role;
create index if not exists velmere_provider_observation_quarantine_state_idx
  on public.velmere_provider_observation_quarantine(state,updated_at desc);

create or replace function public.velmere_reconcile_provider_observation_quarantine(
  p_min_stable_samples integer,
  p_max_assets integer
) returns table(
  quarantined_count integer,
  revalidation_pending_count integer,
  released_count integer,
  newly_quarantined integer,
  release_candidates integer,
  last_transition_age_seconds integer
)
language plpgsql security definer set search_path = public as $$
declare
  v_min_stable integer := greatest(2,least(12,p_min_stable_samples));
  v_max_assets integer := greatest(1,least(2000,p_max_assets));
  v_new integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_provider_observation_quarantine_reconcile'));

  with ranked as (
    select o.*,
      row_number() over(partition by asset_key_hash order by observed_at desc,id desc) as rn
    from public.velmere_provider_observations o
  ), recent as (
    select * from ranked where rn <= 12
  ), classified as (
    select asset_key_hash,
      count(*)::integer as recent_count,
      count(*) filter(where state='aligned' and comparability='exact_window' and confidence_cap>=80)::integer as stable_count,
      count(*) filter(where state='divergent' or comparability='not_comparable')::integer as anomaly_count,
      max(divergence_bps) filter(where rn=1) as latest_divergence,
      max(selected_price) filter(where rn=1) as latest_price,
      percentile_cont(0.5) within group(order by selected_price) filter(where selected_price is not null and selected_price>0) as median_price,
      encode(digest(string_agg(observation_digest,'|' order by observed_at desc,id desc),'sha256'),'hex') as evidence_digest
    from recent
    group by asset_key_hash
    order by asset_key_hash
    limit v_max_assets
  ), anomalous as (
    select *,
      case
        when anomaly_count>=2 then 'repeated_divergence'
        when coalesce(latest_divergence,0)>500 then 'repeated_divergence'
        else 'material_drift'
      end as reason_code
    from classified
    where anomaly_count>=2
       or coalesce(latest_divergence,0)>500
       or (latest_price is not null and median_price is not null and abs(latest_price-median_price)/greatest(abs(median_price),0.000000000001)*10000>1000)
  ), inserted as (
    insert into public.velmere_provider_observation_quarantine(
      asset_key_hash,state,reason_code,evidence_digest,quarantined_at,updated_at,revalidation_requested_at,released_at
    )
    select asset_key_hash,'quarantined',reason_code,evidence_digest,now(),now(),null,null from anomalous
    on conflict(asset_key_hash) do update set
      state='quarantined',
      reason_code=excluded.reason_code,
      evidence_digest=excluded.evidence_digest,
      updated_at=now(),
      revalidation_requested_at=null,
      released_at=null
    where public.velmere_provider_observation_quarantine.state<>'quarantined'
       or public.velmere_provider_observation_quarantine.evidence_digest<>excluded.evidence_digest
    returning 1
  ) select count(*)::integer into v_new from inserted;

  -- A quarantined asset may become a release candidate, but release always requires a separately signed operator action.
  with ranked as (
    select o.*,
      row_number() over(partition by asset_key_hash order by observed_at desc,id desc) as rn
    from public.velmere_provider_observations o
  ), stable as (
    select asset_key_hash
    from ranked
    where rn<=12
    group by asset_key_hash
    having count(*)>=v_min_stable
       and count(*) filter(where rn<=v_min_stable and state='aligned' and comparability='exact_window' and confidence_cap>=80)=v_min_stable
       and count(*) filter(where rn<=v_min_stable and (state='divergent' or comparability='not_comparable'))=0
  )
  update public.velmere_provider_observation_quarantine q
     set state='revalidation_pending',reason_code='operator_revalidation',updated_at=now()
   where q.state='quarantined' and exists(select 1 from stable s where s.asset_key_hash=q.asset_key_hash);

  return query
  select
    count(*) filter(where state='quarantined')::integer,
    count(*) filter(where state='revalidation_pending')::integer,
    count(*) filter(where state='released')::integer,
    v_new,
    count(*) filter(where state='revalidation_pending')::integer,
    coalesce(extract(epoch from(now()-max(updated_at)))::integer,0)
  from public.velmere_provider_observation_quarantine;
end $$;

create or replace function public.velmere_apply_provider_observation_quarantine_action(
  p_action text,
  p_max_assets integer,
  p_operator_hash text,
  p_reason_hash text,
  p_approval_digest text
) returns table(
  affected_assets integer,
  remaining_quarantined integer,
  remaining_revalidation_pending integer
)
language plpgsql security definer set search_path = public as $$
declare
  v_max integer := greatest(1,least(1000,p_max_assets));
  v_affected integer := 0;
begin
  if p_action not in ('revalidate','release') then raise exception 'invalid_provider_quarantine_action'; end if;
  if p_operator_hash !~ '^[a-f0-9]{64}$' or p_reason_hash !~ '^[a-f0-9]{64}$' or p_approval_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_provider_quarantine_approval';
  end if;
  perform pg_advisory_xact_lock(hashtext('velmere_provider_observation_quarantine_action'));

  if p_action='revalidate' then
    with target as (
      select asset_key_hash from public.velmere_provider_observation_quarantine
      where state='quarantined'
      order by updated_at,asset_key_hash
      limit v_max
      for update skip locked
    ), changed as (
      update public.velmere_provider_observation_quarantine q
         set state='revalidation_pending',reason_code='operator_revalidation',operator_hash=p_operator_hash,
             reason_hash=p_reason_hash,approval_digest=p_approval_digest,revalidation_requested_at=now(),updated_at=now()
        from target t where q.asset_key_hash=t.asset_key_hash
      returning 1
    ) select count(*)::integer into v_affected from changed;
  else
    with ranked as (
      select o.*,
        row_number() over(partition by asset_key_hash order by observed_at desc,id desc) as rn
      from public.velmere_provider_observations o
    ), stable as (
      select asset_key_hash from ranked where rn<=3 group by asset_key_hash
      having count(*)=3
         and count(*) filter(where state='aligned' and comparability='exact_window' and confidence_cap>=80)=3
         and count(*) filter(where state='divergent' or comparability='not_comparable')=0
    ), target as (
      select q.asset_key_hash from public.velmere_provider_observation_quarantine q
      join stable s using(asset_key_hash)
      where q.state='revalidation_pending'
      order by q.updated_at,q.asset_key_hash
      limit v_max
      for update of q skip locked
    ), changed as (
      update public.velmere_provider_observation_quarantine q
         set state='released',reason_code='stable_release',operator_hash=p_operator_hash,reason_hash=p_reason_hash,
             approval_digest=p_approval_digest,released_at=now(),updated_at=now()
        from target t where q.asset_key_hash=t.asset_key_hash
      returning 1
    ) select count(*)::integer into v_affected from changed;
  end if;

  return query select v_affected,
    count(*) filter(where state='quarantined')::integer,
    count(*) filter(where state='revalidation_pending')::integer
  from public.velmere_provider_observation_quarantine;
end $$;

alter table public.velmere_durable_computation_deployment_ledger
  add column if not exists provider_quality_digest text;
update public.velmere_durable_computation_deployment_ledger
   set provider_quality_digest=capability_digest
 where provider_quality_digest is null;
alter table public.velmere_durable_computation_deployment_ledger
  alter column provider_quality_digest set not null;
alter table public.velmere_durable_computation_deployment_ledger
  drop constraint if exists velmere_durable_computation_provider_quality_digest_check;
alter table public.velmere_durable_computation_deployment_ledger
  add constraint velmere_durable_computation_provider_quality_digest_check
  check (provider_quality_digest ~ '^[a-f0-9]{64}$');

-- Replace promotion RPC signatures so the quality digest is cryptographically bound into the deployment ledger.
drop function if exists public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,integer,text,text);
drop function if exists public.velmere_rollback_durable_computation_deployment(text,uuid,text,text,text,text,text,integer,text,text);

create or replace function public.velmere_promote_durable_computation_deployment(
  p_idempotency_key text,
  p_deployment_fingerprint text,
  p_capability_digest text,
  p_provider_quality_digest text,
  p_source_sha256 text,
  p_build_sha256 text,
  p_build_id_hash text,
  p_exact_checkpoint integer,
  p_operator_hash text,
  p_reason_hash text
) returns table(deployment_id uuid,state text,idempotent boolean)
language plpgsql security definer set search_path = public as $$
declare v_existing public.velmere_durable_computation_deployment_ledger%rowtype;v_id uuid:=gen_random_uuid();
begin
  if p_idempotency_key !~ '^[a-f0-9]{64}$' or p_deployment_fingerprint !~ '^[a-f0-9]{64}$'
     or p_capability_digest !~ '^[a-f0-9]{64}$' or p_provider_quality_digest !~ '^[a-f0-9]{64}$'
     or p_source_sha256 !~ '^[a-f0-9]{64}$' or p_build_sha256 !~ '^[a-f0-9]{64}$'
     or p_build_id_hash !~ '^[a-f0-9]{64}$' or p_operator_hash !~ '^[a-f0-9]{64}$' or p_reason_hash !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_promotion_evidence'; end if;
  if p_exact_checkpoint<4725 or p_exact_checkpoint>999999 then raise exception 'invalid_exact_checkpoint'; end if;
  perform pg_advisory_xact_lock(hashtext('velmere_durable_computation_deployment_promotion'));
  select * into v_existing from public.velmere_durable_computation_deployment_ledger where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.deployment_id,v_existing.state,true;return;end if;
  update public.velmere_durable_computation_deployment_ledger set is_active=false,superseded_at=now() where is_active=true;
  insert into public.velmere_durable_computation_deployment_ledger(
    deployment_id,idempotency_key,action,state,is_active,deployment_fingerprint,capability_digest,provider_quality_digest,
    source_sha256,build_sha256,build_id_hash,exact_checkpoint,operator_hash,reason_hash
  ) values(v_id,p_idempotency_key,'promote','promoted',true,p_deployment_fingerprint,p_capability_digest,p_provider_quality_digest,
    p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_operator_hash,p_reason_hash);
  return query select v_id,'promoted'::text,false;
end $$;

create or replace function public.velmere_rollback_durable_computation_deployment(
  p_idempotency_key text,
  p_target_deployment_id uuid,
  p_deployment_fingerprint text,
  p_capability_digest text,
  p_provider_quality_digest text,
  p_source_sha256 text,
  p_build_sha256 text,
  p_build_id_hash text,
  p_exact_checkpoint integer,
  p_operator_hash text,
  p_reason_hash text
) returns table(deployment_id uuid,state text,idempotent boolean)
language plpgsql security definer set search_path = public as $$
declare v_existing public.velmere_durable_computation_deployment_ledger%rowtype;v_target public.velmere_durable_computation_deployment_ledger%rowtype;v_id uuid:=gen_random_uuid();
begin
  if p_idempotency_key !~ '^[a-f0-9]{64}$' or p_provider_quality_digest !~ '^[a-f0-9]{64}$' then raise exception 'invalid_rollback_evidence'; end if;
  perform pg_advisory_xact_lock(hashtext('velmere_durable_computation_deployment_promotion'));
  select * into v_existing from public.velmere_durable_computation_deployment_ledger where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.deployment_id,v_existing.state,true;return;end if;
  select * into v_target from public.velmere_durable_computation_deployment_ledger where deployment_id=p_target_deployment_id for update;
  if not found or not v_target.is_active or v_target.state<>'promoted' then raise exception 'rollback_target_not_active'; end if;
  update public.velmere_durable_computation_deployment_ledger set is_active=false,superseded_at=now() where deployment_id=p_target_deployment_id;
  insert into public.velmere_durable_computation_deployment_ledger(
    deployment_id,idempotency_key,action,state,is_active,deployment_fingerprint,capability_digest,provider_quality_digest,
    source_sha256,build_sha256,build_id_hash,exact_checkpoint,operator_hash,reason_hash,target_deployment_id
  ) values(v_id,p_idempotency_key,'rollback','rolled_back',false,p_deployment_fingerprint,p_capability_digest,p_provider_quality_digest,
    p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_operator_hash,p_reason_hash,p_target_deployment_id);
  return query select v_id,'rolled_back'::text,false;
end $$;

-- Expand the staging capability proof so promotion cannot pass without provider history and quarantine controls.
create or replace function public.velmere_probe_durable_computation_capabilities(
  p_expected_schema text,
  p_deployment_fingerprint text
) returns table(
  state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,
  service_role_table_grants integer,required_functions integer,present_functions integer,
  service_role_function_grants integer,deployment_fingerprint text,capability_digest text
)
language plpgsql security definer set search_path = public stable as $$
declare
  v_tables text[]:=array[
    'velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events',
    'velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger',
    'velmere_provider_observations','velmere_provider_observation_quarantine'
  ];
  v_functions text[]:=array[
    'velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation',
    'velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned',
    'velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance',
    'velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert',
    'velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter',
    'velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts',
    'velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities',
    'velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment',
    'velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation',
    'velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert',
    'velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action'
  ];
  v_present_tables integer;v_rls_tables integer;v_table_grants integer;v_present_functions integer;v_function_grants integer;v_payload jsonb;
begin
  if p_expected_schema<>'velmere.durable-computation.schema.4758' then raise exception 'unexpected_schema_version'; end if;
  if p_deployment_fingerprint is null or p_deployment_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint'; end if;
  select count(*)::integer,count(*) filter(where c.relrowsecurity)::integer,
    count(*) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_table_privilege('service_role',c.oid,'SELECT'))::integer
    into v_present_tables,v_rls_tables,v_table_grants
  from unnest(v_tables)t(name) join pg_class c on c.oid=to_regclass('public.'||t.name);
  select count(distinct p.proname)::integer,
    count(distinct p.proname) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer
    into v_present_functions,v_function_grants
  from unnest(v_functions)f(name) join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
  v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4758','requiredTables',cardinality(v_tables),
    'presentTables',v_present_tables,'rlsTables',v_rls_tables,'serviceRoleTableGrants',v_table_grants,
    'requiredFunctions',cardinality(v_functions),'presentFunctions',v_present_functions,'serviceRoleFunctionGrants',v_function_grants,
    'deploymentFingerprint',p_deployment_fingerprint);
  return query select case when v_present_tables=cardinality(v_tables) and v_rls_tables=cardinality(v_tables)
    and v_table_grants=cardinality(v_tables) and v_present_functions=cardinality(v_functions)
    and v_function_grants=cardinality(v_functions) then 'ready' else 'mismatch' end,
    'velmere.durable-computation.schema.4758'::text,cardinality(v_tables),v_present_tables,v_rls_tables,v_table_grants,
    cardinality(v_functions),v_present_functions,v_function_grants,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end $$;

revoke all on function public.velmere_reconcile_provider_observation_quarantine(integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_apply_provider_observation_quarantine_action(text,integer,text,text,text) from public,anon,authenticated;
revoke all on function public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,integer,text,text) from public,anon,authenticated;
revoke all on function public.velmere_rollback_durable_computation_deployment(text,uuid,text,text,text,text,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.velmere_reconcile_provider_observation_quarantine(integer,integer) to service_role;
grant execute on function public.velmere_apply_provider_observation_quarantine_action(text,integer,text,text,text) to service_role;
grant execute on function public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,integer,text,text) to service_role;
grant execute on function public.velmere_rollback_durable_computation_deployment(text,uuid,text,text,text,text,text,text,integer,text,text) to service_role;
