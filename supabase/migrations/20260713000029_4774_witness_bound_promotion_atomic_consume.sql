-- PASS4774: witness quorum becomes a mandatory promotion hard gate with atomic consume and exact release binding.
create extension if not exists pgcrypto;

alter table public.velmere_durable_computation_deployment_ledger
  add column if not exists release_transparency_witness_quorum_digest text
  check (release_transparency_witness_quorum_digest is null or release_transparency_witness_quorum_digest ~ '^[a-f0-9]{64}$');

alter table public.velmere_release_transparency_witness_quorums
  add column if not exists promotion_request_digest text check (promotion_request_digest is null or promotion_request_digest ~ '^[a-f0-9]{64}$'),
  add column if not exists consumed_at timestamptz;
alter table public.velmere_release_transparency_witness_quorums drop constraint if exists velmere_release_transparency_witness_quorums_state_check;
alter table public.velmere_release_transparency_witness_quorums add constraint velmere_release_transparency_witness_quorums_state_check check(state in('recorded','verified','consumed','blocked','split_view'));

drop function if exists public.velmere_get_release_transparency_witness_quorum_status(text);
create function public.velmere_get_release_transparency_witness_quorum_status(p_quorum_digest text)
returns table(
 state text,quorum_digest text,environment text,audience_hash text,checkpoint_digest text,checkpoint_sequence integer,tree_size integer,entries_root text,
 witness_set_digest text,witness_count integer,organization_count integer,signature_threshold integer,expires_at timestamptz,verified_at timestamptz,consumed_at timestamptz,
 provenance_index_digest text,source_sha256 text,build_sha256 text,exact_checkpoint integer
) language sql security definer set search_path=public stable as $$
 select q.state,q.quorum_digest,q.environment,q.audience_hash,q.checkpoint_digest,q.checkpoint_sequence,q.tree_size,q.entries_root,
        q.witness_set_digest,q.witness_count,q.organization_count,q.signature_threshold,q.expires_at,q.verified_at,q.consumed_at,
        e.provenance_index_digest,e.source_sha256,e.build_sha256,e.exact_checkpoint
 from public.velmere_release_transparency_witness_quorums q
 join public.velmere_release_transparency_checkpoints c on c.checkpoint_digest=q.checkpoint_digest and c.state='verified'
 join public.velmere_release_transparency_entries e on e.entry_digest=c.last_entry_digest and e.state='verified'
 where q.quorum_digest=p_quorum_digest
$$;
revoke all on function public.velmere_get_release_transparency_witness_quorum_status(text) from public,anon,authenticated;
grant execute on function public.velmere_get_release_transparency_witness_quorum_status(text) to service_role;

drop function if exists public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text);
create or replace function public.velmere_promote_durable_computation_deployment(
  p_idempotency_key text,p_deployment_fingerprint text,p_capability_digest text,p_provider_quality_digest text,p_recovery_proof_digest text,
  p_release_certificate_digest text,p_release_bundle_digest text,p_release_candidate_attestation_digest text,p_release_provenance_index_digest text,
  p_release_transparency_witness_quorum_digest text,p_source_sha256 text,p_build_sha256 text,p_build_id_hash text,p_exact_checkpoint integer,p_operator_hash text,p_reason_hash text
) returns table(deployment_id uuid,state text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare
  v_existing public.velmere_durable_computation_deployment_ledger%rowtype;
  v_id uuid:=gen_random_uuid();
  v_recovery_required boolean;
  v_certificate public.velmere_provider_recovery_release_certificates%rowtype;
  v_bundle public.velmere_provider_recovery_release_bundles%rowtype;
  v_attestation public.velmere_release_candidate_attestations%rowtype;
  v_provenance public.velmere_release_provenance_indexes%rowtype;
  v_witness public.velmere_release_transparency_witness_quorums%rowtype;
  v_checkpoint public.velmere_release_transparency_checkpoints%rowtype;
  v_entry public.velmere_release_transparency_entries%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_durable_computation_deployment_promotion'));
  perform pg_advisory_xact_lock(hashtext('velmere_provider_recovery_release_certificate'));
  perform pg_advisory_xact_lock(hashtext('velmere_provider_recovery_release_bundle'));
  perform pg_advisory_xact_lock(hashtext('velmere_release_candidate_attestation'));
  perform pg_advisory_xact_lock(hashtext('velmere_release_provenance_index'));
  perform pg_advisory_xact_lock(hashtext('velmere_release_transparency_witness_promotion'));

  select * into v_existing from public.velmere_durable_computation_deployment_ledger where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.deployment_id,v_existing.state,true;return;end if;

  if p_release_provenance_index_digest is null then raise exception 'promotion_release_provenance_index_required';end if;
  if p_release_transparency_witness_quorum_digest is null then raise exception 'promotion_release_transparency_witness_quorum_required';end if;
  select * into v_provenance from public.velmere_release_provenance_indexes where index_digest=p_release_provenance_index_digest for update;
  if not found or v_provenance.state<>'verified' or v_provenance.expires_at<=now() then raise exception 'promotion_release_provenance_index_not_verified';end if;
  if v_provenance.source_sha256<>p_source_sha256 or v_provenance.build_sha256<>p_build_sha256 or v_provenance.build_id_hash<>p_build_id_hash
     or v_provenance.exact_checkpoint<>p_exact_checkpoint or v_provenance.signature_count<v_provenance.signature_threshold or v_provenance.signature_threshold<2 then
    raise exception 'promotion_release_provenance_index_mismatch';
  end if;

  select * into v_witness from public.velmere_release_transparency_witness_quorums where quorum_digest=p_release_transparency_witness_quorum_digest for update;
  if not found or v_witness.state<>'verified' or v_witness.expires_at<=now() then raise exception 'promotion_release_transparency_witness_quorum_not_verified';end if;
  if v_witness.organization_count<v_witness.signature_threshold or v_witness.witness_count<v_witness.signature_threshold or v_witness.signature_threshold<2 then
    raise exception 'promotion_release_transparency_witness_threshold_not_met';
  end if;
  select * into v_checkpoint from public.velmere_release_transparency_checkpoints where checkpoint_digest=v_witness.checkpoint_digest and state='verified';
  if not found or v_checkpoint.environment<>v_witness.environment or v_checkpoint.audience_hash<>v_witness.audience_hash
     or v_checkpoint.tree_size<>v_witness.tree_size or v_checkpoint.entries_root<>v_witness.entries_root then
    raise exception 'promotion_release_transparency_witness_checkpoint_mismatch';
  end if;
  select * into v_entry from public.velmere_release_transparency_entries where entry_digest=v_checkpoint.last_entry_digest and state='verified';
  if not found or v_entry.environment<>v_witness.environment or v_entry.audience_hash<>v_witness.audience_hash
     or v_entry.provenance_index_digest<>p_release_provenance_index_digest or v_entry.source_sha256<>p_source_sha256
     or v_entry.build_sha256<>p_build_sha256 or v_entry.exact_checkpoint<>p_exact_checkpoint then
    raise exception 'promotion_release_transparency_witness_release_mismatch';
  end if;

  select exists(select 1 from public.velmere_provider_quality_rollback_executions where state='verified') into v_recovery_required;
  if v_recovery_required then
    if p_recovery_proof_digest is null or p_release_certificate_digest is null or p_release_bundle_digest is null or p_release_candidate_attestation_digest is null then
      raise exception 'promotion_recovery_chain_required';
    end if;
    select * into v_certificate from public.velmere_provider_recovery_release_certificates where certificate_digest=p_release_certificate_digest for update;
    if not found or v_certificate.state<>'verified' or v_certificate.expires_at<=now() then raise exception 'promotion_recovery_certificate_not_verified';end if;
    select * into v_bundle from public.velmere_provider_recovery_release_bundles where bundle_digest=p_release_bundle_digest for update;
    if not found or v_bundle.state<>'verified' or v_bundle.expires_at<=now() then raise exception 'promotion_recovery_bundle_not_verified';end if;
    select * into v_attestation from public.velmere_release_candidate_attestations where attestation_digest=p_release_candidate_attestation_digest for update;
    if not found or v_attestation.state<>'verified' or v_attestation.expires_at<=now() then raise exception 'promotion_release_candidate_attestation_not_verified';end if;
    if v_bundle.release_certificate_digest<>p_release_certificate_digest or v_bundle.recovery_proof_digest<>p_recovery_proof_digest
       or v_bundle.deployment_fingerprint<>p_deployment_fingerprint or v_bundle.quality_digest<>p_provider_quality_digest
       or v_bundle.capability_digest<>p_capability_digest or v_bundle.source_sha256<>p_source_sha256 or v_bundle.build_sha256<>p_build_sha256
       or v_bundle.build_id_hash<>p_build_id_hash or v_bundle.exact_checkpoint<>p_exact_checkpoint then raise exception 'promotion_recovery_bundle_mismatch';end if;
    if v_attestation.release_bundle_digest<>p_release_bundle_digest or v_attestation.release_certificate_digest<>p_release_certificate_digest
       or v_attestation.recovery_proof_digest<>p_recovery_proof_digest or v_attestation.deployment_fingerprint<>p_deployment_fingerprint
       or v_attestation.quality_digest<>p_provider_quality_digest or v_attestation.capability_digest<>p_capability_digest
       or v_attestation.source_sha256<>p_source_sha256 or v_attestation.build_sha256<>p_build_sha256
       or v_attestation.build_id_hash<>p_build_id_hash or v_attestation.exact_checkpoint<>p_exact_checkpoint then raise exception 'promotion_release_candidate_attestation_mismatch';end if;
    if v_provenance.candidate_attestation_digest<>p_release_candidate_attestation_digest or v_provenance.release_bundle_digest<>p_release_bundle_digest then
      raise exception 'promotion_release_provenance_index_mismatch';
    end if;
  end if;

  if exists(select 1 from public.velmere_provider_quality_incidents where incident_key='provider_quality'
    and(state not in('healthy','resolved') or release_hold or rollback_required or rollback_execution_required)) then
    raise exception 'promotion_provider_incident_not_recovered';
  end if;

  update public.velmere_durable_computation_deployment_ledger set is_active=false,superseded_at=now() where is_active=true;
  insert into public.velmere_durable_computation_deployment_ledger(
    deployment_id,idempotency_key,action,state,is_active,deployment_fingerprint,capability_digest,provider_quality_digest,recovery_proof_digest,
    release_certificate_digest,release_bundle_digest,release_candidate_attestation_digest,release_provenance_index_digest,release_transparency_witness_quorum_digest,
    source_sha256,build_sha256,build_id_hash,exact_checkpoint,operator_hash,reason_hash
  ) values(
    v_id,p_idempotency_key,'promote','promoted',true,p_deployment_fingerprint,p_capability_digest,p_provider_quality_digest,p_recovery_proof_digest,
    p_release_certificate_digest,p_release_bundle_digest,p_release_candidate_attestation_digest,p_release_provenance_index_digest,p_release_transparency_witness_quorum_digest,
    p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_operator_hash,p_reason_hash
  );
  if v_recovery_required then
    update public.velmere_provider_recovery_release_certificates set state='consumed',promotion_request_digest=p_idempotency_key,consumed_at=now(),updated_at=now() where certificate_digest=p_release_certificate_digest;
    update public.velmere_provider_recovery_release_bundles set state='consumed',promotion_request_digest=p_idempotency_key,consumed_at=now(),updated_at=now() where bundle_digest=p_release_bundle_digest;
    update public.velmere_release_candidate_attestations set state='consumed',promotion_request_digest=p_idempotency_key,consumed_at=now(),updated_at=now() where attestation_digest=p_release_candidate_attestation_digest;
  end if;
  update public.velmere_release_provenance_indexes set state='consumed',consumed_at=now(),updated_at=now() where index_digest=p_release_provenance_index_digest;
  update public.velmere_release_transparency_witness_quorums set state='consumed',promotion_request_digest=p_idempotency_key,consumed_at=now() where quorum_digest=p_release_transparency_witness_quorum_digest;
  return query select v_id,'promoted'::text,false;
end $$;
revoke all on function public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text) to service_role;

create or replace function public.velmere_probe_durable_computation_capabilities(p_expected_schema text,p_deployment_fingerprint text)
returns table(state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,service_role_table_grants integer,required_functions integer,present_functions integer,service_role_function_grants integer,deployment_fingerprint text,capability_digest text)
language plpgsql security definer set search_path=public stable as $$
declare
 v_tables text[]:=array['velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events','velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger','velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents','velmere_provider_quality_rollback_executions','velmere_provider_quality_recovery_proofs','velmere_provider_recovery_smoke_receipts','velmere_provider_recovery_release_certificates','velmere_provider_recovery_release_bundles','velmere_release_candidate_attestations','velmere_release_provenance_indexes','velmere_release_proof_packages','velmere_release_trust_checkpoints','velmere_release_trust_consistency_proofs','velmere_release_transparency_entries','velmere_release_transparency_checkpoints','velmere_release_transparency_witness_quorums'];
 v_functions text[]:=array['velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation','velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned','velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance','velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert','velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter','velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts','velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities','velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment','velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation','velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert','velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action','velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action','velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback','velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status','velmere_record_provider_quality_recovery_proof','velmere_verify_provider_quality_recovery_proof','velmere_get_provider_quality_recovery_proof_status','velmere_record_provider_recovery_smoke_receipt','velmere_get_provider_recovery_smoke_receipt_status','velmere_record_provider_recovery_release_certificate','velmere_verify_provider_recovery_release_certificate','velmere_get_provider_recovery_release_certificate_status','velmere_record_provider_recovery_release_bundle','velmere_verify_provider_recovery_release_bundle','velmere_get_provider_recovery_release_bundle_status','velmere_record_release_candidate_attestation','velmere_verify_release_candidate_attestation','velmere_get_release_candidate_attestation_status','velmere_record_release_provenance_index','velmere_verify_release_provenance_index','velmere_get_release_provenance_index_status','velmere_get_public_release_provenance_feed','velmere_record_release_proof_package','velmere_verify_release_proof_package','velmere_get_release_proof_package_status','velmere_get_public_release_proof_packages','velmere_record_release_trust_checkpoint','velmere_verify_release_trust_checkpoint','velmere_get_release_trust_checkpoint_status','velmere_get_public_release_trust_checkpoints','velmere_record_release_trust_consistency_proof','velmere_verify_release_trust_consistency_proof','velmere_get_release_trust_consistency_status','velmere_get_public_release_trust_consistency_proofs','velmere_record_release_transparency_entry','velmere_verify_release_transparency_entry','velmere_get_release_transparency_entry_status','velmere_get_public_release_transparency_entries','velmere_record_release_transparency_checkpoint','velmere_verify_release_transparency_checkpoint','velmere_get_release_transparency_checkpoint_status','velmere_get_public_release_transparency_checkpoints','velmere_record_release_transparency_witness_quorum','velmere_verify_release_transparency_witness_quorum','velmere_get_release_transparency_witness_quorum_status','velmere_get_public_release_transparency_witness_quorums'];
 v_pt integer;v_rt integer;v_tg integer;v_pf integer;v_fg integer;v_payload jsonb;
begin
 if p_expected_schema<>'velmere.durable-computation.schema.4774' then raise exception 'unexpected_schema_version';end if;
 if p_deployment_fingerprint is null or p_deployment_fingerprint!~'^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint';end if;
 select count(*)::integer,count(*)filter(where c.relrowsecurity)::integer,count(*)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_table_privilege('service_role',c.oid,'SELECT'))::integer into v_pt,v_rt,v_tg from unnest(v_tables)t(name)join pg_class c on c.oid=to_regclass('public.'||t.name);
 select count(distinct p.proname)::integer,count(distinct p.proname)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer into v_pf,v_fg from unnest(v_functions)f(name)join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
 v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4774','requiredTables',cardinality(v_tables),'presentTables',v_pt,'rlsTables',v_rt,'serviceRoleTableGrants',v_tg,'requiredFunctions',cardinality(v_functions),'presentFunctions',v_pf,'serviceRoleFunctionGrants',v_fg,'deploymentFingerprint',p_deployment_fingerprint);
 return query select case when v_pt=cardinality(v_tables)and v_rt=cardinality(v_tables)and v_tg=cardinality(v_tables)and v_pf=cardinality(v_functions)and v_fg=cardinality(v_functions)then'ready'else'mismatch'end,'velmere.durable-computation.schema.4774'::text,cardinality(v_tables),v_pt,v_rt,v_tg,cardinality(v_functions),v_pf,v_fg,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end$$;
revoke all on function public.velmere_probe_durable_computation_capabilities(text,text) from public,anon,authenticated;
grant execute on function public.velmere_probe_durable_computation_capabilities(text,text) to service_role;
