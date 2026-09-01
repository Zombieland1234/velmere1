-- PASS4773: independent witness quorum, split-view prevention and public witness feed
create table if not exists public.velmere_release_transparency_witness_quorums(
 id uuid primary key default gen_random_uuid(),
 idempotency_key text not null unique check(idempotency_key~'^[a-f0-9]{64}$'),
 quorum_digest text not null unique check(quorum_digest~'^[a-f0-9]{64}$'),
 environment text not null check(environment in('staging','production')),
 audience_hash text not null check(audience_hash~'^[a-f0-9]{64}$'),
 checkpoint_digest text not null unique check(checkpoint_digest~'^[a-f0-9]{64}$'),
 checkpoint_sequence integer not null check(checkpoint_sequence>=1),
 tree_size integer not null check(tree_size>=1 and tree_size<=4096),
 entries_root text not null check(entries_root~'^[a-f0-9]{64}$'),
 latest_log_root text not null check(latest_log_root~'^[a-f0-9]{64}$'),
 consistency_digest text not null check(consistency_digest~'^[a-f0-9]{64}$'),
 witness_set_digest text not null check(witness_set_digest~'^[a-f0-9]{64}$'),
 witness_count integer not null check(witness_count between 2 and 16),
 organization_count integer not null check(organization_count between 2 and 16),
 signature_threshold integer not null check(signature_threshold between 2 and 8 and witness_count>=signature_threshold and organization_count>=signature_threshold),
 state text not null default 'recorded' check(state in('recorded','verified','blocked','split_view')),
 quorum_json jsonb not null,
 issued_at timestamptz not null,
 expires_at timestamptz not null,
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 unique(environment,audience_hash,tree_size),
 unique(environment,audience_hash,checkpoint_sequence)
);
alter table public.velmere_release_transparency_witness_quorums enable row level security;
revoke all on public.velmere_release_transparency_witness_quorums from public,anon,authenticated;
grant select,insert,update on public.velmere_release_transparency_witness_quorums to service_role;

create or replace function public.velmere_record_release_transparency_witness_quorum(
 p_idempotency_key text,p_quorum_digest text,p_environment text,p_audience_hash text,p_checkpoint_digest text,
 p_checkpoint_sequence integer,p_tree_size integer,p_entries_root text,p_latest_log_root text,p_consistency_digest text,
 p_witness_set_digest text,p_witness_count integer,p_organization_count integer,p_signature_threshold integer,
 p_quorum_json jsonb,p_issued_at timestamptz,p_expires_at timestamptz)
returns table(state text,quorum_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.velmere_release_transparency_witness_quorums%rowtype;v_conflict public.velmere_release_transparency_witness_quorums%rowtype;v_checkpoint public.velmere_release_transparency_checkpoints%rowtype;
begin
 if p_idempotency_key!~'^[a-f0-9]{64}$' or p_quorum_digest!~'^[a-f0-9]{64}$' or p_checkpoint_digest!~'^[a-f0-9]{64}$' or p_entries_root!~'^[a-f0-9]{64}$' then raise exception 'release_transparency_witness_digest_invalid';end if;
 if p_environment not in('staging','production') or p_tree_size<1 or p_checkpoint_sequence<1 or p_signature_threshold<2 or p_witness_count<p_signature_threshold or p_organization_count<p_signature_threshold then raise exception 'release_transparency_witness_identity_invalid';end if;
 if p_issued_at<now()-interval '5 minutes' or p_issued_at>now()+interval '1 minute' or p_expires_at<=now() or p_expires_at>p_issued_at+interval '30 minutes' then raise exception 'release_transparency_witness_freshness_invalid';end if;
 if octet_length(p_quorum_json::text)>1048576 then raise exception 'release_transparency_witness_payload_too_large';end if;
 perform pg_advisory_xact_lock(hashtext('velmere_release_transparency_witness:'||p_environment||':'||p_audience_hash||':'||p_tree_size::text));
 select * into v_existing from public.velmere_release_transparency_witness_quorums where idempotency_key=p_idempotency_key;
 if found then return query select v_existing.state,v_existing.quorum_digest,true;return;end if;
 select * into v_checkpoint from public.velmere_release_transparency_checkpoints where checkpoint_digest=p_checkpoint_digest and state='verified';
 if v_checkpoint.id is null or v_checkpoint.environment<>p_environment or v_checkpoint.audience_hash<>p_audience_hash or v_checkpoint.sequence<>p_checkpoint_sequence or v_checkpoint.tree_size<>p_tree_size or v_checkpoint.entries_root<>p_entries_root or v_checkpoint.latest_log_root<>p_latest_log_root or v_checkpoint.consistency_digest<>p_consistency_digest then raise exception 'release_transparency_witness_checkpoint_not_verified';end if;
 select * into v_conflict from public.velmere_release_transparency_witness_quorums where environment=p_environment and audience_hash=p_audience_hash and tree_size=p_tree_size;
 if found and(v_conflict.checkpoint_digest<>p_checkpoint_digest or v_conflict.entries_root<>p_entries_root or v_conflict.latest_log_root<>p_latest_log_root) then
  update public.velmere_release_transparency_witness_quorums set state='split_view' where id=v_conflict.id;
  raise exception 'release_transparency_witness_split_view_detected';
 end if;
 insert into public.velmere_release_transparency_witness_quorums(idempotency_key,quorum_digest,environment,audience_hash,checkpoint_digest,checkpoint_sequence,tree_size,entries_root,latest_log_root,consistency_digest,witness_set_digest,witness_count,organization_count,signature_threshold,quorum_json,issued_at,expires_at)
 values(p_idempotency_key,p_quorum_digest,p_environment,p_audience_hash,p_checkpoint_digest,p_checkpoint_sequence,p_tree_size,p_entries_root,p_latest_log_root,p_consistency_digest,p_witness_set_digest,p_witness_count,p_organization_count,p_signature_threshold,p_quorum_json,p_issued_at,p_expires_at);
 return query select 'recorded'::text,p_quorum_digest,false;
end$$;

create or replace function public.velmere_verify_release_transparency_witness_quorum(p_quorum_digest text)
returns table(state text,quorum_digest text,checkpoint_digest text,tree_size integer,witness_count integer,organization_count integer,signature_threshold integer)
language plpgsql security definer set search_path=public as $$
declare v_row public.velmere_release_transparency_witness_quorums%rowtype;
begin
 perform pg_advisory_xact_lock(hashtext('velmere_release_transparency_witness_verify:'||p_quorum_digest));
 select * into v_row from public.velmere_release_transparency_witness_quorums where velmere_release_transparency_witness_quorums.quorum_digest=p_quorum_digest for update;
 if v_row.id is null then raise exception 'release_transparency_witness_not_found';end if;
 if v_row.state='split_view' then raise exception 'release_transparency_witness_split_view_detected';end if;
 if v_row.expires_at<=now() then update public.velmere_release_transparency_witness_quorums set state='blocked' where id=v_row.id;raise exception 'release_transparency_witness_expired';end if;
 if v_row.witness_count<v_row.signature_threshold or v_row.organization_count<v_row.signature_threshold then raise exception 'release_transparency_witness_threshold_not_met';end if;
 update public.velmere_release_transparency_witness_quorums set state='verified',verified_at=coalesce(verified_at,now()) where id=v_row.id;
 return query select 'verified'::text,v_row.quorum_digest,v_row.checkpoint_digest,v_row.tree_size,v_row.witness_count,v_row.organization_count,v_row.signature_threshold;
end$$;

create or replace function public.velmere_get_release_transparency_witness_quorum_status(p_quorum_digest text)
returns table(state text,quorum_digest text,environment text,checkpoint_digest text,checkpoint_sequence integer,tree_size integer,entries_root text,witness_set_digest text,witness_count integer,organization_count integer,signature_threshold integer,verified_at timestamptz)
language sql security definer set search_path=public stable as $$
 select state,quorum_digest,environment,checkpoint_digest,checkpoint_sequence,tree_size,entries_root,witness_set_digest,witness_count,organization_count,signature_threshold,verified_at from public.velmere_release_transparency_witness_quorums where quorum_digest=p_quorum_digest
$$;

create or replace function public.velmere_get_public_release_transparency_witness_quorums(p_environment text default null,p_limit integer default 10)
returns table(quorum_digest text,environment text,checkpoint_digest text,checkpoint_sequence integer,tree_size integer,entries_root text,latest_log_root text,witness_set_digest text,witness_count integer,organization_count integer,signature_threshold integer,verified_at timestamptz)
language sql security definer set search_path=public stable as $$
 select quorum_digest,environment,checkpoint_digest,checkpoint_sequence,tree_size,entries_root,latest_log_root,witness_set_digest,witness_count,organization_count,signature_threshold,verified_at
 from public.velmere_release_transparency_witness_quorums where state='verified' and(p_environment is null or environment=p_environment) order by checkpoint_sequence desc limit greatest(1,least(coalesce(p_limit,10),50))
$$;

revoke all on function public.velmere_record_release_transparency_witness_quorum(text,text,text,text,text,integer,integer,text,text,text,text,integer,integer,integer,jsonb,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.velmere_verify_release_transparency_witness_quorum(text) from public,anon,authenticated;
revoke all on function public.velmere_get_release_transparency_witness_quorum_status(text) from public,anon,authenticated;
revoke all on function public.velmere_get_public_release_transparency_witness_quorums(text,integer) from public,anon,authenticated;
grant execute on function public.velmere_record_release_transparency_witness_quorum(text,text,text,text,text,integer,integer,text,text,text,text,integer,integer,integer,jsonb,timestamptz,timestamptz) to service_role;
grant execute on function public.velmere_verify_release_transparency_witness_quorum(text) to service_role;
grant execute on function public.velmere_get_release_transparency_witness_quorum_status(text) to service_role;
grant execute on function public.velmere_get_public_release_transparency_witness_quorums(text,integer) to service_role;

create or replace function public.velmere_probe_durable_computation_capabilities(p_expected_schema text,p_deployment_fingerprint text)
returns table(state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,service_role_table_grants integer,required_functions integer,present_functions integer,service_role_function_grants integer,deployment_fingerprint text,capability_digest text)
language plpgsql security definer set search_path=public stable as $$
declare
 v_tables text[]:=array['velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events','velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger','velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents','velmere_provider_quality_rollback_executions','velmere_provider_quality_recovery_proofs','velmere_provider_recovery_smoke_receipts','velmere_provider_recovery_release_certificates','velmere_provider_recovery_release_bundles','velmere_release_candidate_attestations','velmere_release_provenance_indexes','velmere_release_proof_packages','velmere_release_trust_checkpoints','velmere_release_trust_consistency_proofs','velmere_release_transparency_entries','velmere_release_transparency_checkpoints','velmere_release_transparency_witness_quorums'];
 v_functions text[]:=array['velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation','velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned','velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance','velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert','velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter','velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts','velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities','velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment','velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation','velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert','velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action','velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action','velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback','velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status','velmere_record_provider_quality_recovery_proof','velmere_verify_provider_quality_recovery_proof','velmere_get_provider_quality_recovery_proof_status','velmere_record_provider_recovery_smoke_receipt','velmere_get_provider_recovery_smoke_receipt_status','velmere_record_provider_recovery_release_certificate','velmere_verify_provider_recovery_release_certificate','velmere_get_provider_recovery_release_certificate_status','velmere_record_provider_recovery_release_bundle','velmere_verify_provider_recovery_release_bundle','velmere_get_provider_recovery_release_bundle_status','velmere_record_release_candidate_attestation','velmere_verify_release_candidate_attestation','velmere_get_release_candidate_attestation_status','velmere_record_release_provenance_index','velmere_verify_release_provenance_index','velmere_get_release_provenance_index_status','velmere_get_public_release_provenance_feed','velmere_record_release_proof_package','velmere_verify_release_proof_package','velmere_get_release_proof_package_status','velmere_get_public_release_proof_packages','velmere_record_release_trust_checkpoint','velmere_verify_release_trust_checkpoint','velmere_get_release_trust_checkpoint_status','velmere_get_public_release_trust_checkpoints','velmere_record_release_trust_consistency_proof','velmere_verify_release_trust_consistency_proof','velmere_get_release_trust_consistency_status','velmere_get_public_release_trust_consistency_proofs','velmere_record_release_transparency_entry','velmere_verify_release_transparency_entry','velmere_get_release_transparency_entry_status','velmere_get_public_release_transparency_entries','velmere_record_release_transparency_checkpoint','velmere_verify_release_transparency_checkpoint','velmere_get_release_transparency_checkpoint_status','velmere_get_public_release_transparency_checkpoints','velmere_record_release_transparency_witness_quorum','velmere_verify_release_transparency_witness_quorum','velmere_get_release_transparency_witness_quorum_status','velmere_get_public_release_transparency_witness_quorums'];
 v_pt integer;v_rt integer;v_tg integer;v_pf integer;v_fg integer;v_payload jsonb;
begin
 if p_expected_schema<>'velmere.durable-computation.schema.4773' then raise exception 'unexpected_schema_version';end if;
 if p_deployment_fingerprint is null or p_deployment_fingerprint!~'^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint';end if;
 select count(*)::integer,count(*)filter(where c.relrowsecurity)::integer,count(*)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_table_privilege('service_role',c.oid,'SELECT'))::integer into v_pt,v_rt,v_tg from unnest(v_tables)t(name)join pg_class c on c.oid=to_regclass('public.'||t.name);
 select count(distinct p.proname)::integer,count(distinct p.proname)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer into v_pf,v_fg from unnest(v_functions)f(name)join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
 v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4773','requiredTables',cardinality(v_tables),'presentTables',v_pt,'rlsTables',v_rt,'serviceRoleTableGrants',v_tg,'requiredFunctions',cardinality(v_functions),'presentFunctions',v_pf,'serviceRoleFunctionGrants',v_fg,'deploymentFingerprint',p_deployment_fingerprint);
 return query select case when v_pt=cardinality(v_tables)and v_rt=cardinality(v_tables)and v_tg=cardinality(v_tables)and v_pf=cardinality(v_functions)and v_fg=cardinality(v_functions)then'ready'else'mismatch'end,'velmere.durable-computation.schema.4773'::text,cardinality(v_tables),v_pt,v_rt,v_tg,cardinality(v_functions),v_pf,v_fg,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end$$;
revoke all on function public.velmere_probe_durable_computation_capabilities(text,text) from public,anon,authenticated;
grant execute on function public.velmere_probe_durable_computation_capabilities(text,text) to service_role;
