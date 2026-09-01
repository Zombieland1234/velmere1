-- PASS4766: threshold multi-signer release provenance index, chain-of-custody and key-rotation-safe verification.
create extension if not exists pgcrypto;

create table if not exists public.velmere_release_provenance_indexes (
  provenance_index_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (idempotency_key ~ '^[a-f0-9]{64}$'),
  index_id_hash text not null check (index_id_hash ~ '^[a-f0-9]{64}$'),
  state text not null check (state in ('recorded','verified','consumed','expired','revoked','blocked')),
  environment text not null check (environment in ('staging','production')),
  audience_hash text not null check (audience_hash ~ '^[a-f0-9]{64}$'),
  candidate_attestation_digest text not null check (candidate_attestation_digest ~ '^[a-f0-9]{64}$'),
  release_bundle_digest text not null check (release_bundle_digest ~ '^[a-f0-9]{64}$'),
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  build_sha256 text not null check (build_sha256 ~ '^[a-f0-9]{64}$'),
  build_id_hash text not null check (build_id_hash ~ '^[a-f0-9]{64}$'),
  exact_checkpoint integer not null check (exact_checkpoint between 4725 and 999999),
  sequence integer not null check (sequence >= 1),
  previous_index_digest text check (previous_index_digest is null or previous_index_digest ~ '^[a-f0-9]{64}$'),
  artifacts_root text not null check (artifacts_root ~ '^[a-f0-9]{64}$'),
  chain_root text not null check (chain_root ~ '^[a-f0-9]{64}$'),
  signer_set_digest text not null check (signer_set_digest ~ '^[a-f0-9]{64}$'),
  signature_count integer not null check (signature_count between 2 and 8),
  signature_threshold integer not null check (signature_threshold between 2 and 5 and signature_count >= signature_threshold),
  index_digest text not null unique check (index_digest ~ '^[a-f0-9]{64}$'),
  operator_hash text not null check (operator_hash ~ '^[a-f0-9]{64}$'),
  reason_hash text not null check (reason_hash ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  verified_at timestamptz,
  consumed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(environment,audience_hash,sequence),
  unique(environment,audience_hash,chain_root)
);
alter table public.velmere_release_provenance_indexes enable row level security;
revoke all on public.velmere_release_provenance_indexes from public,anon,authenticated;
grant select,insert,update on public.velmere_release_provenance_indexes to service_role;
create index if not exists velmere_release_provenance_candidate_idx on public.velmere_release_provenance_indexes(candidate_attestation_digest,state,expires_at desc);
create index if not exists velmere_release_provenance_chain_idx on public.velmere_release_provenance_indexes(environment,audience_hash,sequence desc);

create or replace function public.velmere_record_release_provenance_index(
  p_idempotency_key text,p_index_id_hash text,p_environment text,p_audience_hash text,p_candidate_attestation_digest text,
  p_release_bundle_digest text,p_source_sha256 text,p_build_sha256 text,p_build_id_hash text,p_exact_checkpoint integer,
  p_sequence integer,p_previous_index_digest text,p_artifacts_root text,p_chain_root text,p_signer_set_digest text,
  p_signature_count integer,p_signature_threshold integer,p_index_digest text,p_operator_hash text,p_reason_hash text,
  p_issued_at timestamptz,p_expires_at timestamptz
) returns table(state text,index_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.velmere_release_provenance_indexes%rowtype;v_candidate public.velmere_release_candidate_attestations%rowtype;v_previous public.velmere_release_provenance_indexes%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_release_provenance:'||p_environment||':'||p_audience_hash));
  if p_environment not in ('staging','production') then raise exception 'release_provenance_environment_invalid';end if;
  if array[p_idempotency_key,p_index_id_hash,p_audience_hash,p_candidate_attestation_digest,p_release_bundle_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_artifacts_root,p_chain_root,p_signer_set_digest,p_index_digest,p_operator_hash,p_reason_hash]::text[] @> array[null]::text[] then raise exception 'release_provenance_evidence_missing';end if;
  if exists(select 1 from unnest(array[p_idempotency_key,p_index_id_hash,p_audience_hash,p_candidate_attestation_digest,p_release_bundle_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_artifacts_root,p_chain_root,p_signer_set_digest,p_index_digest,p_operator_hash,p_reason_hash]) v where v !~ '^[a-f0-9]{64}$') then raise exception 'release_provenance_evidence_invalid';end if;
  if p_exact_checkpoint<4725 or p_sequence<1 or p_signature_threshold<2 or p_signature_threshold>5 or p_signature_count<p_signature_threshold or p_signature_count>8 then raise exception 'release_provenance_threshold_invalid';end if;
  if p_issued_at>now()+interval '1 minute' or p_issued_at<now()-interval '5 minutes' or p_expires_at<=now() or p_expires_at>p_issued_at+interval '30 minutes' then raise exception 'release_provenance_freshness_invalid';end if;
  select * into v_existing from public.velmere_release_provenance_indexes where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.state,v_existing.index_digest,true;return;end if;
  select * into v_candidate from public.velmere_release_candidate_attestations where attestation_digest=p_candidate_attestation_digest for update;
  if not found or v_candidate.state<>'verified' or v_candidate.expires_at<=now() then raise exception 'release_provenance_candidate_not_verified';end if;
  if v_candidate.environment<>p_environment or v_candidate.audience_hash<>p_audience_hash or v_candidate.release_bundle_digest<>p_release_bundle_digest or v_candidate.source_sha256<>p_source_sha256 or v_candidate.build_sha256<>p_build_sha256 or v_candidate.build_id_hash<>p_build_id_hash or v_candidate.exact_checkpoint<>p_exact_checkpoint then raise exception 'release_provenance_candidate_mismatch';end if;
  if p_sequence=1 then
    if p_previous_index_digest is not null then raise exception 'release_provenance_genesis_previous_forbidden';end if;
  else
    if p_previous_index_digest is null then raise exception 'release_provenance_previous_required';end if;
    select * into v_previous from public.velmere_release_provenance_indexes where environment=p_environment and audience_hash=p_audience_hash and sequence=p_sequence-1 for update;
    if not found or v_previous.state not in ('verified','consumed') or v_previous.index_digest<>p_previous_index_digest then raise exception 'release_provenance_previous_mismatch';end if;
    if v_previous.candidate_attestation_digest=p_candidate_attestation_digest then raise exception 'release_provenance_candidate_reuse_forbidden';end if;
  end if;
  insert into public.velmere_release_provenance_indexes(idempotency_key,index_id_hash,state,environment,audience_hash,candidate_attestation_digest,release_bundle_digest,source_sha256,build_sha256,build_id_hash,exact_checkpoint,sequence,previous_index_digest,artifacts_root,chain_root,signer_set_digest,signature_count,signature_threshold,index_digest,operator_hash,reason_hash,issued_at,expires_at)
  values(p_idempotency_key,p_index_id_hash,'recorded',p_environment,p_audience_hash,p_candidate_attestation_digest,p_release_bundle_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_sequence,p_previous_index_digest,p_artifacts_root,p_chain_root,p_signer_set_digest,p_signature_count,p_signature_threshold,p_index_digest,p_operator_hash,p_reason_hash,p_issued_at,p_expires_at);
  return query select 'recorded'::text,p_index_digest,false;
end $$;
revoke all on function public.velmere_record_release_provenance_index(text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,text,integer,integer,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.velmere_record_release_provenance_index(text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,text,integer,integer,text,text,text,timestamptz,timestamptz) to service_role;

create or replace function public.velmere_verify_release_provenance_index(p_index_digest text)
returns table(state text,index_digest text,sequence integer,signature_count integer,signature_threshold integer)
language plpgsql security definer set search_path=public as $$
declare v_row public.velmere_release_provenance_indexes%rowtype;
begin
  if p_index_digest is null or p_index_digest !~ '^[a-f0-9]{64}$' then raise exception 'release_provenance_digest_invalid';end if;
  select * into v_row from public.velmere_release_provenance_indexes where index_digest=p_index_digest for update;
  if not found then raise exception 'release_provenance_not_found';end if;
  if v_row.state in ('consumed','revoked','blocked') then return query select v_row.state,v_row.index_digest,v_row.sequence,v_row.signature_count,v_row.signature_threshold;return;end if;
  if v_row.expires_at<=now() then update public.velmere_release_provenance_indexes set state='expired',updated_at=now() where provenance_index_id=v_row.provenance_index_id;return query select 'expired'::text,v_row.index_digest,v_row.sequence,v_row.signature_count,v_row.signature_threshold;return;end if;
  if v_row.signature_count<v_row.signature_threshold then update public.velmere_release_provenance_indexes set state='blocked',updated_at=now() where provenance_index_id=v_row.provenance_index_id;return query select 'blocked'::text,v_row.index_digest,v_row.sequence,v_row.signature_count,v_row.signature_threshold;return;end if;
  update public.velmere_release_provenance_indexes set state='verified',verified_at=coalesce(verified_at,now()),updated_at=now() where provenance_index_id=v_row.provenance_index_id;
  return query select 'verified'::text,v_row.index_digest,v_row.sequence,v_row.signature_count,v_row.signature_threshold;
end $$;
revoke all on function public.velmere_verify_release_provenance_index(text) from public,anon,authenticated;
grant execute on function public.velmere_verify_release_provenance_index(text) to service_role;

create or replace function public.velmere_get_release_provenance_index_status(p_candidate_attestation_digest text default null)
returns table(state text,index_digest text,candidate_attestation_digest text,release_bundle_digest text,source_sha256 text,build_sha256 text,exact_checkpoint integer,artifacts_root text,signer_set_digest text,signature_count integer,signature_threshold integer,sequence integer,expires_at timestamptz)
language sql security definer set search_path=public stable as $$
  select i.state,i.index_digest,i.candidate_attestation_digest,i.release_bundle_digest,i.source_sha256,i.build_sha256,i.exact_checkpoint,i.artifacts_root,i.signer_set_digest,i.signature_count,i.signature_threshold,i.sequence,i.expires_at
  from public.velmere_release_provenance_indexes i
  where (p_candidate_attestation_digest is null or i.candidate_attestation_digest=p_candidate_attestation_digest)
  order by i.sequence desc limit 1
$$;
revoke all on function public.velmere_get_release_provenance_index_status(text) from public,anon,authenticated;
grant execute on function public.velmere_get_release_provenance_index_status(text) to service_role;

-- Schema 4766: provenance index table and three RPC controls.
create or replace function public.velmere_probe_durable_computation_capabilities(p_expected_schema text,p_deployment_fingerprint text)
returns table(state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,service_role_table_grants integer,required_functions integer,present_functions integer,service_role_function_grants integer,deployment_fingerprint text,capability_digest text)
language plpgsql security definer set search_path=public stable as $$
declare
  v_tables text[]:=array['velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events','velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger','velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents','velmere_provider_quality_rollback_executions','velmere_provider_quality_recovery_proofs','velmere_provider_recovery_smoke_receipts','velmere_provider_recovery_release_certificates','velmere_provider_recovery_release_bundles','velmere_release_candidate_attestations','velmere_release_provenance_indexes'];
  v_functions text[]:=array['velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation','velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned','velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance','velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert','velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter','velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts','velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities','velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment','velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation','velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert','velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action','velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action','velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback','velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status','velmere_record_provider_quality_recovery_proof','velmere_verify_provider_quality_recovery_proof','velmere_get_provider_quality_recovery_proof_status','velmere_record_provider_recovery_smoke_receipt','velmere_get_provider_recovery_smoke_receipt_status','velmere_record_provider_recovery_release_certificate','velmere_verify_provider_recovery_release_certificate','velmere_get_provider_recovery_release_certificate_status','velmere_record_provider_recovery_release_bundle','velmere_verify_provider_recovery_release_bundle','velmere_get_provider_recovery_release_bundle_status','velmere_record_release_candidate_attestation','velmere_verify_release_candidate_attestation','velmere_get_release_candidate_attestation_status','velmere_record_release_provenance_index','velmere_verify_release_provenance_index','velmere_get_release_provenance_index_status'];
  v_present_tables integer;v_rls_tables integer;v_table_grants integer;v_present_functions integer;v_function_grants integer;v_payload jsonb;
begin
  if p_expected_schema<>'velmere.durable-computation.schema.4766' then raise exception 'unexpected_schema_version';end if;
  if p_deployment_fingerprint is null or p_deployment_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint';end if;
  select count(*)::integer,count(*) filter(where c.relrowsecurity)::integer,count(*) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_table_privilege('service_role',c.oid,'SELECT'))::integer into v_present_tables,v_rls_tables,v_table_grants from unnest(v_tables)t(name) join pg_class c on c.oid=to_regclass('public.'||t.name);
  select count(distinct p.proname)::integer,count(distinct p.proname) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer into v_present_functions,v_function_grants from unnest(v_functions)f(name) join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
  v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4766','requiredTables',cardinality(v_tables),'presentTables',v_present_tables,'rlsTables',v_rls_tables,'serviceRoleTableGrants',v_table_grants,'requiredFunctions',cardinality(v_functions),'presentFunctions',v_present_functions,'serviceRoleFunctionGrants',v_function_grants,'deploymentFingerprint',p_deployment_fingerprint);
  return query select case when v_present_tables=cardinality(v_tables) and v_rls_tables=cardinality(v_tables) and v_table_grants=cardinality(v_tables) and v_present_functions=cardinality(v_functions) and v_function_grants=cardinality(v_functions) then 'ready' else 'mismatch' end,'velmere.durable-computation.schema.4766'::text,cardinality(v_tables),v_present_tables,v_rls_tables,v_table_grants,cardinality(v_functions),v_present_functions,v_function_grants,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end $$;
