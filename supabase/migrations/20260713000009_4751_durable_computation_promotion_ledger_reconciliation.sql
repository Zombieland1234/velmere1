create extension if not exists pgcrypto;

create table if not exists public.velmere_durable_computation_deployment_ledger (
  deployment_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  action text not null check (action in ('promote','rollback')),
  state text not null check (state in ('promoted','rolled_back')),
  is_active boolean not null default false,
  deployment_fingerprint text not null check (deployment_fingerprint ~ '^[0-9a-f]{64}$'),
  capability_digest text not null check (capability_digest ~ '^[0-9a-f]{64}$'),
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  build_sha256 text not null check (build_sha256 ~ '^[0-9a-f]{64}$'),
  build_id_hash text not null check (build_id_hash ~ '^[0-9a-f]{64}$'),
  exact_checkpoint integer not null check (exact_checkpoint between 4725 and 999999),
  operator_hash text not null check (operator_hash ~ '^[0-9a-f]{64}$'),
  reason_hash text not null check (reason_hash ~ '^[0-9a-f]{64}$'),
  target_deployment_id uuid references public.velmere_durable_computation_deployment_ledger(deployment_id),
  created_at timestamptz not null default now(),
  applied_at timestamptz not null default now(),
  superseded_at timestamptz
);

alter table public.velmere_durable_computation_deployment_ledger enable row level security;
revoke all on table public.velmere_durable_computation_deployment_ledger from public, anon, authenticated;
grant select, insert, update on table public.velmere_durable_computation_deployment_ledger to service_role;

create unique index if not exists velmere_durable_computation_one_active_deployment_idx
  on public.velmere_durable_computation_deployment_ledger((is_active))
  where is_active = true;
create index if not exists velmere_durable_computation_deployment_history_idx
  on public.velmere_durable_computation_deployment_ledger(created_at desc);

create or replace function public.velmere_promote_durable_computation_deployment(
  p_idempotency_key text,
  p_deployment_fingerprint text,
  p_capability_digest text,
  p_source_sha256 text,
  p_build_sha256 text,
  p_build_id_hash text,
  p_exact_checkpoint integer,
  p_operator_hash text,
  p_reason_hash text
) returns table(deployment_id uuid, state text, idempotent boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_existing public.velmere_durable_computation_deployment_ledger%rowtype;
  v_id uuid := gen_random_uuid();
begin
  if p_idempotency_key !~ '^[0-9a-f]{64}$' then raise exception 'invalid_idempotency_key'; end if;
  if p_deployment_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'invalid_deployment_fingerprint'; end if;
  if p_capability_digest !~ '^[0-9a-f]{64}$' then raise exception 'invalid_capability_digest'; end if;
  if p_source_sha256 !~ '^[0-9a-f]{64}$' or p_build_sha256 !~ '^[0-9a-f]{64}$' or p_build_id_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_build_evidence'; end if;
  if p_exact_checkpoint < 4725 or p_exact_checkpoint > 999999 then raise exception 'invalid_exact_checkpoint'; end if;
  if p_operator_hash !~ '^[0-9a-f]{64}$' or p_reason_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_operator_evidence'; end if;

  perform pg_advisory_xact_lock(hashtext('velmere_durable_computation_deployment_promotion'));
  select * into v_existing from public.velmere_durable_computation_deployment_ledger where idempotency_key=p_idempotency_key;
  if found then
    return query select v_existing.deployment_id,v_existing.state,true;
    return;
  end if;

  update public.velmere_durable_computation_deployment_ledger
    set is_active=false,superseded_at=now()
    where is_active=true;

  insert into public.velmere_durable_computation_deployment_ledger(
    deployment_id,idempotency_key,action,state,is_active,deployment_fingerprint,capability_digest,
    source_sha256,build_sha256,build_id_hash,exact_checkpoint,operator_hash,reason_hash
  ) values(
    v_id,p_idempotency_key,'promote','promoted',true,p_deployment_fingerprint,p_capability_digest,
    p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_operator_hash,p_reason_hash
  );
  return query select v_id,'promoted'::text,false;
end $$;

create or replace function public.velmere_rollback_durable_computation_deployment(
  p_idempotency_key text,
  p_target_deployment_id uuid,
  p_deployment_fingerprint text,
  p_capability_digest text,
  p_source_sha256 text,
  p_build_sha256 text,
  p_build_id_hash text,
  p_exact_checkpoint integer,
  p_operator_hash text,
  p_reason_hash text
) returns table(deployment_id uuid, state text, idempotent boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_existing public.velmere_durable_computation_deployment_ledger%rowtype;
  v_target public.velmere_durable_computation_deployment_ledger%rowtype;
  v_id uuid := gen_random_uuid();
begin
  if p_idempotency_key !~ '^[0-9a-f]{64}$' then raise exception 'invalid_idempotency_key'; end if;
  if p_deployment_fingerprint !~ '^[0-9a-f]{64}$' or p_capability_digest !~ '^[0-9a-f]{64}$' then raise exception 'invalid_deployment_evidence'; end if;
  if p_source_sha256 !~ '^[0-9a-f]{64}$' or p_build_sha256 !~ '^[0-9a-f]{64}$' or p_build_id_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_build_evidence'; end if;
  if p_exact_checkpoint < 4725 or p_exact_checkpoint > 999999 then raise exception 'invalid_exact_checkpoint'; end if;
  if p_operator_hash !~ '^[0-9a-f]{64}$' or p_reason_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_operator_evidence'; end if;

  perform pg_advisory_xact_lock(hashtext('velmere_durable_computation_deployment_promotion'));
  select * into v_existing from public.velmere_durable_computation_deployment_ledger where idempotency_key=p_idempotency_key;
  if found then
    return query select v_existing.deployment_id,v_existing.state,true;
    return;
  end if;

  select * into v_target
    from public.velmere_durable_computation_deployment_ledger
    where deployment_id=p_target_deployment_id and action='promote' and state='promoted' and is_active=true
    for update;
  if not found then
    return query select null::uuid,'conflict'::text,false;
    return;
  end if;

  update public.velmere_durable_computation_deployment_ledger
    set is_active=false,superseded_at=now()
    where deployment_id=p_target_deployment_id;

  insert into public.velmere_durable_computation_deployment_ledger(
    deployment_id,idempotency_key,action,state,is_active,deployment_fingerprint,capability_digest,
    source_sha256,build_sha256,build_id_hash,exact_checkpoint,operator_hash,reason_hash,target_deployment_id
  ) values(
    v_id,p_idempotency_key,'rollback','rolled_back',false,p_deployment_fingerprint,p_capability_digest,
    p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_operator_hash,p_reason_hash,p_target_deployment_id
  );
  return query select v_id,'rolled_back'::text,false;
end $$;

create or replace function public.velmere_reconcile_durable_computation_alert_outbox()
returns table(
  pending_count integer,
  processing_count integer,
  retry_wait_count integer,
  delivered_count integer,
  dead_letter_count integer,
  expired_processing_count integer,
  oldest_retry_age_seconds integer,
  distinct_destination_hashes integer,
  delivered_without_destination_hash integer
)
language sql security definer set search_path = public stable as $$
  select
    count(*) filter(where state='pending')::integer,
    count(*) filter(where state='processing')::integer,
    count(*) filter(where state='retry_wait')::integer,
    count(*) filter(where state='delivered')::integer,
    count(*) filter(where state='dead_letter')::integer,
    count(*) filter(where state='processing' and lease_expires_at <= now())::integer,
    coalesce(extract(epoch from now()-min(updated_at) filter(where state='retry_wait'))::integer,0),
    count(distinct destination_hash) filter(where destination_hash is not null)::integer,
    count(*) filter(where state='delivered' and destination_hash is null)::integer
  from public.velmere_durable_computation_alert_outbox;
$$;

revoke all on function public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,integer,text,text) from public,anon,authenticated;
revoke all on function public.velmere_rollback_durable_computation_deployment(text,uuid,text,text,text,text,text,integer,text,text) from public,anon,authenticated;
revoke all on function public.velmere_reconcile_durable_computation_alert_outbox() from public,anon,authenticated;
grant execute on function public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,integer,text,text) to service_role;
grant execute on function public.velmere_rollback_durable_computation_deployment(text,uuid,text,text,text,text,text,integer,text,text) to service_role;
grant execute on function public.velmere_reconcile_durable_computation_alert_outbox() to service_role;

create or replace function public.velmere_probe_durable_computation_capabilities(
  p_expected_schema text,
  p_deployment_fingerprint text
) returns table(
  state text,
  schema_version text,
  required_tables integer,
  present_tables integer,
  rls_tables integer,
  service_role_table_grants integer,
  required_functions integer,
  present_functions integer,
  service_role_function_grants integer,
  deployment_fingerprint text,
  capability_digest text
)
language plpgsql security definer set search_path = public stable as $$
declare
  v_tables text[] := array[
    'velmere_durable_computation_jobs',
    'velmere_durable_computation_maintenance_runs',
    'velmere_durable_computation_operator_events',
    'velmere_durable_computation_cycle_receipts',
    'velmere_durable_computation_alert_outbox',
    'velmere_durable_computation_deployment_ledger'
  ];
  v_functions text[] := array[
    'velmere_claim_durable_computation',
    'velmere_complete_durable_computation',
    'velmere_fail_durable_computation',
    'velmere_claim_durable_computation_worker_batch_budgeted',
    'velmere_heartbeat_durable_computation_worker_owned',
    'velmere_release_durable_computation_worker_claims_budget',
    'velmere_claim_durable_computation_maintenance',
    'velmere_get_durable_computation_metrics',
    'velmere_cleanup_durable_computations',
    'velmere_record_durable_computation_alert',
    'velmere_finish_durable_computation_maintenance',
    'velmere_requeue_durable_computation_dead_letter',
    'velmere_record_durable_computation_cycle_receipt',
    'velmere_claim_durable_computation_alerts',
    'velmere_settle_durable_computation_alert',
    'velmere_probe_durable_computation_capabilities',
    'velmere_promote_durable_computation_deployment',
    'velmere_rollback_durable_computation_deployment',
    'velmere_reconcile_durable_computation_alert_outbox'
  ];
  v_present_tables integer;
  v_rls_tables integer;
  v_table_grants integer;
  v_present_functions integer;
  v_function_grants integer;
  v_payload jsonb;
begin
  if p_expected_schema <> 'velmere.durable-computation.schema.4751' then raise exception 'unexpected_schema_version'; end if;
  if p_deployment_fingerprint is null or p_deployment_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'invalid_deployment_fingerprint'; end if;

  select count(*)::integer,
         count(*) filter(where c.relrowsecurity)::integer,
         count(*) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_table_privilege('service_role',c.oid,'SELECT'))::integer
    into v_present_tables,v_rls_tables,v_table_grants
  from unnest(v_tables) t(name)
  join pg_class c on c.oid=to_regclass('public.'||t.name);

  select count(distinct p.proname)::integer,
         count(distinct p.proname) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer
    into v_present_functions,v_function_grants
  from unnest(v_functions) f(name)
  join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;

  v_payload := jsonb_build_object(
    'schema','velmere.durable-computation.schema.4751',
    'requiredTables',cardinality(v_tables),
    'presentTables',v_present_tables,
    'rlsTables',v_rls_tables,
    'serviceRoleTableGrants',v_table_grants,
    'requiredFunctions',cardinality(v_functions),
    'presentFunctions',v_present_functions,
    'serviceRoleFunctionGrants',v_function_grants,
    'deploymentFingerprint',p_deployment_fingerprint
  );

  return query select
    case when v_present_tables=cardinality(v_tables)
           and v_rls_tables=cardinality(v_tables)
           and v_table_grants=cardinality(v_tables)
           and v_present_functions=cardinality(v_functions)
           and v_function_grants=cardinality(v_functions)
         then 'ready' else 'mismatch' end,
    'velmere.durable-computation.schema.4751'::text,
    cardinality(v_tables),v_present_tables,v_rls_tables,v_table_grants,
    cardinality(v_functions),v_present_functions,v_function_grants,
    p_deployment_fingerprint,
    encode(digest(v_payload::text,'sha256'),'hex');
end $$;

revoke all on function public.velmere_probe_durable_computation_capabilities(text,text) from public,anon,authenticated;
grant execute on function public.velmere_probe_durable_computation_capabilities(text,text) to service_role;
