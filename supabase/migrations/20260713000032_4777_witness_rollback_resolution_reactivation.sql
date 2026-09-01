-- PASS4777: signed post-rollback witness revalidation, rollback resolution certificate and atomic return-to-service eligibility.
create extension if not exists pgcrypto;

alter table public.velmere_release_transparency_witness_health_events
  drop constraint if exists velmere_release_transparency_witness_health_events_state_check;
alter table public.velmere_release_transparency_witness_health_events
  add constraint velmere_release_transparency_witness_health_events_state_check
  check(state in('healthy','suspended','rollback_required','recovery_pending','rollback_resolved'));
alter table public.velmere_release_transparency_witness_health_events
  add column if not exists rollback_resolution_digest text check(rollback_resolution_digest is null or rollback_resolution_digest~'^[a-f0-9]{64}$'),
  add column if not exists rollback_resolved_at timestamptz;

alter table public.velmere_durable_computation_deployment_ledger
  add column if not exists witness_rollback_resolution_digest text check(witness_rollback_resolution_digest is null or witness_rollback_resolution_digest~'^[a-f0-9]{64}$'),
  add column if not exists witness_rollback_resolved_at timestamptz;

create table if not exists public.velmere_release_transparency_witness_rollback_resolutions(
  resolution_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check(idempotency_key~'^[a-f0-9]{64}$'),
  resolution_digest text not null unique check(resolution_digest~'^[a-f0-9]{64}$'),
  target_deployment_id uuid not null references public.velmere_durable_computation_deployment_ledger(deployment_id),
  rollback_deployment_id uuid not null references public.velmere_durable_computation_deployment_ledger(deployment_id),
  environment text not null check(environment in('staging','production')),
  audience_hash text not null check(audience_hash~'^[a-f0-9]{64}$'),
  health_digest text not null check(health_digest~'^[a-f0-9]{64}$'),
  quorum_digest text not null check(quorum_digest~'^[a-f0-9]{64}$'),
  checkpoint_digest text not null check(checkpoint_digest~'^[a-f0-9]{64}$'),
  rollback_ledger_digest text not null check(rollback_ledger_digest~'^[a-f0-9]{64}$'),
  state text not null default 'pending' check(state in('pending','verified','blocked')),
  min_stable_seconds integer not null check(min_stable_seconds between 300 and 86400),
  stable_started_at timestamptz not null default now(),
  operator_hash text not null check(operator_hash~'^[a-f0-9]{64}$'),
  reason_hash text not null check(reason_hash~'^[a-f0-9]{64}$'),
  approval_digest text not null check(approval_digest~'^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  blocked_at timestamptz,
  unique(environment,audience_hash,rollback_deployment_id)
);
alter table public.velmere_release_transparency_witness_rollback_resolutions enable row level security;
revoke all on public.velmere_release_transparency_witness_rollback_resolutions from public,anon,authenticated;
grant select,insert,update on public.velmere_release_transparency_witness_rollback_resolutions to service_role;
create index if not exists velmere_witness_rollback_resolution_environment_idx
  on public.velmere_release_transparency_witness_rollback_resolutions(environment,created_at desc);

create or replace function public.velmere_record_release_transparency_witness_rollback_resolution(
  p_idempotency_key text,p_resolution_digest text,p_environment text,p_audience_hash text,p_health_digest text,
  p_quorum_digest text,p_checkpoint_digest text,p_rollback_ledger_digest text,p_min_stable_seconds integer,
  p_operator_hash text,p_reason_hash text,p_approval_digest text
) returns table(state text,resolution_digest text,rollback_ledger_digest text,stable_started_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare
  v_existing public.velmere_release_transparency_witness_rollback_resolutions%rowtype;
  v_health public.velmere_release_transparency_witness_health_events%rowtype;
  v_target public.velmere_durable_computation_deployment_ledger%rowtype;
  v_rollback public.velmere_durable_computation_deployment_ledger%rowtype;
  v_quorum public.velmere_release_transparency_witness_quorums%rowtype;
  v_rollback_digest text;
begin
  if p_idempotency_key!~'^[a-f0-9]{64}$' or p_resolution_digest!~'^[a-f0-9]{64}$' or p_audience_hash!~'^[a-f0-9]{64}$' then raise exception 'release_witness_rollback_resolution_identity_invalid';end if;
  if p_environment not in('staging','production') or p_health_digest!~'^[a-f0-9]{64}$' or p_quorum_digest!~'^[a-f0-9]{64}$' or p_checkpoint_digest!~'^[a-f0-9]{64}$' or p_rollback_ledger_digest!~'^[a-f0-9]{64}$' then raise exception 'release_witness_rollback_resolution_evidence_invalid';end if;
  if p_min_stable_seconds<300 or p_min_stable_seconds>86400 then raise exception 'release_witness_rollback_resolution_stability_invalid';end if;
  if p_operator_hash!~'^[a-f0-9]{64}$' or p_reason_hash!~'^[a-f0-9]{64}$' or p_approval_digest!~'^[a-f0-9]{64}$' then raise exception 'release_witness_rollback_resolution_approval_invalid';end if;
  perform pg_advisory_xact_lock(hashtext('velmere_witness_rollback_resolution:'||p_environment||':'||p_audience_hash));
  select * into v_existing from public.velmere_release_transparency_witness_rollback_resolutions where idempotency_key=p_idempotency_key for update;
  if found then return query select v_existing.state,v_existing.resolution_digest,v_existing.rollback_ledger_digest,v_existing.stable_started_at;return;end if;
  if exists(select 1 from public.velmere_durable_computation_deployment_ledger where is_active=true and action='promote' and state='promoted') then raise exception 'release_witness_rollback_resolution_active_deployment_present';end if;
  select * into v_health from public.velmere_release_transparency_witness_health_events where environment=p_environment and audience_hash=p_audience_hash and state='rollback_required' and rollback_required=true order by rollback_required_at desc nulls last limit 1 for update;
  if not found or v_health.health_digest<>p_health_digest then raise exception 'release_witness_rollback_resolution_health_mismatch';end if;
  select * into v_target from public.velmere_durable_computation_deployment_ledger where deployment_id=v_health.deployment_id for update;
  if not found or v_target.is_active or not coalesce(v_target.witness_rollback_required,false) then raise exception 'release_witness_rollback_resolution_target_invalid';end if;
  select * into v_rollback from public.velmere_durable_computation_deployment_ledger where action='rollback' and state='rolled_back' and target_deployment_id=v_target.deployment_id order by applied_at desc limit 1 for update;
  if not found then raise exception 'release_witness_rollback_resolution_rollback_missing';end if;
  v_rollback_digest:=encode(digest(concat_ws('|','velmere.release-witness-rollback-ledger.v1',v_rollback.deployment_id::text,v_target.deployment_id::text,v_rollback.deployment_fingerprint,v_rollback.capability_digest,v_rollback.source_sha256,v_rollback.build_sha256,v_rollback.build_id_hash,v_rollback.exact_checkpoint,extract(epoch from v_rollback.applied_at)::bigint),'sha256'),'hex');
  if v_rollback_digest<>p_rollback_ledger_digest then raise exception 'release_witness_rollback_resolution_rollback_digest_mismatch';end if;
  select * into v_quorum from public.velmere_release_transparency_witness_quorums where quorum_digest=p_quorum_digest and checkpoint_digest=p_checkpoint_digest and environment=p_environment and audience_hash=p_audience_hash and state='verified' order by verified_at desc limit 1 for update;
  if not found or v_quorum.expires_at<=now() or v_quorum.organization_count<v_quorum.signature_threshold then raise exception 'release_witness_rollback_resolution_quorum_not_ready';end if;
  insert into public.velmere_release_transparency_witness_rollback_resolutions(idempotency_key,resolution_digest,target_deployment_id,rollback_deployment_id,environment,audience_hash,health_digest,quorum_digest,checkpoint_digest,rollback_ledger_digest,min_stable_seconds,operator_hash,reason_hash,approval_digest)
  values(p_idempotency_key,p_resolution_digest,v_target.deployment_id,v_rollback.deployment_id,p_environment,p_audience_hash,p_health_digest,p_quorum_digest,p_checkpoint_digest,p_rollback_ledger_digest,p_min_stable_seconds,p_operator_hash,p_reason_hash,p_approval_digest)
  returning * into v_existing;
  return query select v_existing.state,v_existing.resolution_digest,v_existing.rollback_ledger_digest,v_existing.stable_started_at;
end$$;

create or replace function public.velmere_verify_release_transparency_witness_rollback_resolution(p_resolution_digest text)
returns table(state text,resolution_digest text,rollback_ledger_digest text,stable_seconds integer,verified_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare
  v public.velmere_release_transparency_witness_rollback_resolutions%rowtype;
  v_health public.velmere_release_transparency_witness_health_events%rowtype;
  v_target public.velmere_durable_computation_deployment_ledger%rowtype;
  v_quorum public.velmere_release_transparency_witness_quorums%rowtype;
  v_stable integer;
begin
  if p_resolution_digest!~'^[a-f0-9]{64}$' then raise exception 'release_witness_rollback_resolution_digest_invalid';end if;
  select * into v from public.velmere_release_transparency_witness_rollback_resolutions where resolution_digest=p_resolution_digest for update;
  if not found then raise exception 'release_witness_rollback_resolution_not_found';end if;
  if v.state='verified' then return query select v.state,v.resolution_digest,v.rollback_ledger_digest,greatest(0,extract(epoch from coalesce(v.verified_at,now())-v.stable_started_at)::integer),v.verified_at;return;end if;
  if v.state<>'pending' then raise exception 'release_witness_rollback_resolution_not_pending';end if;
  v_stable:=greatest(0,extract(epoch from now()-v.stable_started_at)::integer);
  if v_stable<v.min_stable_seconds then raise exception 'release_witness_rollback_resolution_stability_incomplete';end if;
  if exists(select 1 from public.velmere_durable_computation_deployment_ledger where is_active=true and action='promote' and state='promoted') then raise exception 'release_witness_rollback_resolution_active_deployment_present';end if;
  select * into v_health from public.velmere_release_transparency_witness_health_events where deployment_id=v.target_deployment_id for update;
  select * into v_target from public.velmere_durable_computation_deployment_ledger where deployment_id=v.target_deployment_id for update;
  select * into v_quorum from public.velmere_release_transparency_witness_quorums where quorum_digest=v.quorum_digest and checkpoint_digest=v.checkpoint_digest and state='verified' for update;
  if v_health.state<>'rollback_required' or not v_health.rollback_required or v_health.health_digest<>v.health_digest then raise exception 'release_witness_rollback_resolution_health_changed';end if;
  if v_target.is_active or not coalesce(v_target.witness_rollback_required,false) then raise exception 'release_witness_rollback_resolution_target_changed';end if;
  if v_quorum.id is null or v_quorum.expires_at<=now() or v_quorum.organization_count<v_quorum.signature_threshold then raise exception 'release_witness_rollback_resolution_quorum_changed';end if;
  update public.velmere_release_transparency_witness_rollback_resolutions set state='verified',verified_at=now() where resolution_id=v.resolution_id returning * into v;
  update public.velmere_release_transparency_witness_health_events set state='rollback_resolved',release_suspended=false,rollback_required=false,rollback_resolution_digest=v.resolution_digest,rollback_resolved_at=now(),updated_at=now() where health_event_id=v_health.health_event_id;
  update public.velmere_durable_computation_deployment_ledger set release_suspended=false,witness_rollback_required=false,witness_rollback_resolution_digest=v.resolution_digest,witness_rollback_resolved_at=now() where deployment_id=v_target.deployment_id;
  return query select v.state,v.resolution_digest,v.rollback_ledger_digest,v_stable,v.verified_at;
end$$;

create or replace function public.velmere_get_release_transparency_witness_rollback_resolution_status(p_environment text default null)
returns table(environment text,state text,resolution_digest text,health_digest text,quorum_digest text,checkpoint_digest text,rollback_ledger_digest text,stable_seconds integer,verified_at timestamptz)
language sql security definer set search_path=public stable as $$
 select environment,state,resolution_digest,health_digest,quorum_digest,checkpoint_digest,rollback_ledger_digest,greatest(0,extract(epoch from coalesce(verified_at,now())-stable_started_at)::integer),verified_at from public.velmere_release_transparency_witness_rollback_resolutions where(p_environment is null or environment=p_environment) order by created_at desc limit 1
$$;

create or replace function public.velmere_get_public_release_transparency_witness_rollback_resolutions(p_environment text default null,p_limit integer default 10)
returns table(environment text,state text,resolution_digest text,health_digest text,quorum_digest text,checkpoint_digest text,rollback_ledger_digest text,stable_seconds integer,verified_at timestamptz)
language sql security definer set search_path=public stable as $$
 select environment,state,resolution_digest,health_digest,quorum_digest,checkpoint_digest,rollback_ledger_digest,greatest(0,extract(epoch from coalesce(verified_at,now())-stable_started_at)::integer),verified_at from public.velmere_release_transparency_witness_rollback_resolutions where(p_environment is null or environment=p_environment) order by created_at desc limit greatest(1,least(coalesce(p_limit,10),50))
$$;

revoke all on function public.velmere_record_release_transparency_witness_rollback_resolution(text,text,text,text,text,text,text,text,integer,text,text,text) from public,anon,authenticated;
revoke all on function public.velmere_verify_release_transparency_witness_rollback_resolution(text) from public,anon,authenticated;
revoke all on function public.velmere_get_release_transparency_witness_rollback_resolution_status(text) from public,anon,authenticated;
revoke all on function public.velmere_get_public_release_transparency_witness_rollback_resolutions(text,integer) from public,anon,authenticated;
grant execute on function public.velmere_record_release_transparency_witness_rollback_resolution(text,text,text,text,text,text,text,text,integer,text,text,text) to service_role;
grant execute on function public.velmere_verify_release_transparency_witness_rollback_resolution(text) to service_role;
grant execute on function public.velmere_get_release_transparency_witness_rollback_resolution_status(text) to service_role;
grant execute on function public.velmere_get_public_release_transparency_witness_rollback_resolutions(text,integer) to service_role;

-- Schema 4777: signed post-rollback witness revalidation and atomic return-to-service eligibility.
create or replace function public.velmere_probe_durable_computation_capabilities(p_expected_schema text,p_deployment_fingerprint text)
returns table(state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,service_role_table_grants integer,required_functions integer,present_functions integer,service_role_function_grants integer,deployment_fingerprint text,capability_digest text)
language plpgsql security definer set search_path=public stable as $$
declare
 v_tables text[]:=array['velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events','velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger','velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents','velmere_provider_quality_rollback_executions','velmere_provider_quality_recovery_proofs','velmere_provider_recovery_smoke_receipts','velmere_provider_recovery_release_certificates','velmere_provider_recovery_release_bundles','velmere_release_candidate_attestations','velmere_release_provenance_indexes','velmere_release_proof_packages','velmere_release_trust_checkpoints','velmere_release_trust_consistency_proofs','velmere_release_transparency_entries','velmere_release_transparency_checkpoints','velmere_release_transparency_witness_quorums','velmere_release_transparency_witness_health_policies','velmere_release_transparency_witness_health_events','velmere_release_transparency_witness_health_recoveries','velmere_release_transparency_witness_rollback_resolutions'];
 v_functions text[]:=array['velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation','velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned','velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance','velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert','velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter','velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts','velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities','velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment','velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation','velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert','velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action','velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action','velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback','velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status','velmere_record_provider_quality_recovery_proof','velmere_verify_provider_quality_recovery_proof','velmere_get_provider_quality_recovery_proof_status','velmere_record_provider_recovery_smoke_receipt','velmere_get_provider_recovery_smoke_receipt_status','velmere_record_provider_recovery_release_certificate','velmere_verify_provider_recovery_release_certificate','velmere_get_provider_recovery_release_certificate_status','velmere_record_provider_recovery_release_bundle','velmere_verify_provider_recovery_release_bundle','velmere_get_provider_recovery_release_bundle_status','velmere_record_release_candidate_attestation','velmere_verify_release_candidate_attestation','velmere_get_release_candidate_attestation_status','velmere_record_release_provenance_index','velmere_verify_release_provenance_index','velmere_get_release_provenance_index_status','velmere_get_public_release_provenance_feed','velmere_record_release_proof_package','velmere_verify_release_proof_package','velmere_get_release_proof_package_status','velmere_get_public_release_proof_packages','velmere_record_release_trust_checkpoint','velmere_verify_release_trust_checkpoint','velmere_get_release_trust_checkpoint_status','velmere_get_public_release_trust_checkpoints','velmere_record_release_trust_consistency_proof','velmere_verify_release_trust_consistency_proof','velmere_get_release_trust_consistency_status','velmere_get_public_release_trust_consistency_proofs','velmere_record_release_transparency_entry','velmere_verify_release_transparency_entry','velmere_get_release_transparency_entry_status','velmere_get_public_release_transparency_entries','velmere_record_release_transparency_checkpoint','velmere_verify_release_transparency_checkpoint','velmere_get_release_transparency_checkpoint_status','velmere_get_public_release_transparency_checkpoints','velmere_record_release_transparency_witness_quorum','velmere_verify_release_transparency_witness_quorum','velmere_get_release_transparency_witness_quorum_status','velmere_get_public_release_transparency_witness_quorums','velmere_apply_release_transparency_witness_health_policy','velmere_reconcile_release_transparency_witness_health','velmere_verify_release_transparency_witness_health','velmere_get_release_transparency_witness_health_status','velmere_get_public_release_transparency_witness_health','velmere_apply_release_transparency_witness_health_recovery','velmere_verify_release_transparency_witness_health_recovery','velmere_get_release_transparency_witness_health_recovery_status','velmere_get_public_release_transparency_witness_health_recoveries','velmere_record_release_transparency_witness_rollback_resolution','velmere_verify_release_transparency_witness_rollback_resolution','velmere_get_release_transparency_witness_rollback_resolution_status','velmere_get_public_release_transparency_witness_rollback_resolutions'];
 v_pt integer;v_rt integer;v_tg integer;v_pf integer;v_fg integer;v_payload jsonb;
begin
 if p_expected_schema<>'velmere.durable-computation.schema.4777' then raise exception 'unexpected_schema_version';end if;
 if p_deployment_fingerprint is null or p_deployment_fingerprint!~'^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint';end if;
 select count(*)::integer,count(*)filter(where c.relrowsecurity)::integer,count(*)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_table_privilege('service_role',c.oid,'SELECT'))::integer into v_pt,v_rt,v_tg from unnest(v_tables)t(name)join pg_class c on c.oid=to_regclass('public.'||t.name);
 select count(distinct p.proname)::integer,count(distinct p.proname)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer into v_pf,v_fg from unnest(v_functions)f(name)join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
 v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4777','requiredTables',cardinality(v_tables),'presentTables',v_pt,'rlsTables',v_rt,'serviceRoleTableGrants',v_tg,'requiredFunctions',cardinality(v_functions),'presentFunctions',v_pf,'serviceRoleFunctionGrants',v_fg,'deploymentFingerprint',p_deployment_fingerprint);
 return query select case when v_pt=cardinality(v_tables)and v_rt=cardinality(v_tables)and v_tg=cardinality(v_tables)and v_pf=cardinality(v_functions)and v_fg=cardinality(v_functions)then'ready'else'mismatch'end,'velmere.durable-computation.schema.4777'::text,cardinality(v_tables),v_pt,v_rt,v_tg,cardinality(v_functions),v_pf,v_fg,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end$$;
revoke all on function public.velmere_probe_durable_computation_capabilities(text,text) from public,anon,authenticated;
grant execute on function public.velmere_probe_durable_computation_capabilities(text,text) to service_role;
