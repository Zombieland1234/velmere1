-- PASS4772: signed transparency audit checkpoints, Merkle inclusion proofs and anti-equivocation
create table if not exists public.velmere_release_transparency_checkpoints(
 id uuid primary key default gen_random_uuid(),
 idempotency_key text not null unique check(idempotency_key~'^[a-f0-9]{64}$'),
 checkpoint_digest text not null unique check(checkpoint_digest~'^[a-f0-9]{64}$'),
 environment text not null check(environment in('staging','production')),
 audience_hash text not null check(audience_hash~'^[a-f0-9]{64}$'),
 sequence integer not null check(sequence>=1),
 previous_checkpoint_digest text check(previous_checkpoint_digest is null or previous_checkpoint_digest~'^[a-f0-9]{64}$'),
 previous_tree_size integer not null default 0 check(previous_tree_size>=0),
 previous_entries_root text check(previous_entries_root is null or previous_entries_root~'^[a-f0-9]{64}$'),
 tree_size integer not null check(tree_size>=1 and tree_size<=4096),
 first_entry_digest text not null check(first_entry_digest~'^[a-f0-9]{64}$'),
 last_entry_digest text not null check(last_entry_digest~'^[a-f0-9]{64}$'),
 latest_log_root text not null check(latest_log_root~'^[a-f0-9]{64}$'),
 entries_root text not null check(entries_root~'^[a-f0-9]{64}$'),
 consistency_digest text not null unique check(consistency_digest~'^[a-f0-9]{64}$'),
 trust_checkpoint_digest text not null check(trust_checkpoint_digest~'^[a-f0-9]{64}$'),
 signature_count integer not null check(signature_count between 2 and 8),
 signature_threshold integer not null check(signature_threshold between 2 and 5 and signature_count>=signature_threshold),
 state text not null default 'recorded' check(state in('recorded','verified','blocked')),
 checkpoint_json jsonb not null,
 issued_at timestamptz not null,
 expires_at timestamptz not null,
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 unique(environment,audience_hash,sequence),
 unique(environment,audience_hash,tree_size),
 unique(environment,audience_hash,entries_root)
);
alter table public.velmere_release_transparency_checkpoints enable row level security;
revoke all on public.velmere_release_transparency_checkpoints from public,anon,authenticated;
grant select,insert,update on public.velmere_release_transparency_checkpoints to service_role;

create or replace function public.velmere_record_release_transparency_checkpoint(
 p_idempotency_key text,p_checkpoint_digest text,p_environment text,p_audience_hash text,p_sequence integer,
 p_previous_checkpoint_digest text,p_previous_tree_size integer,p_previous_entries_root text,p_tree_size integer,
 p_first_entry_digest text,p_last_entry_digest text,p_latest_log_root text,p_entries_root text,p_consistency_digest text,
 p_trust_checkpoint_digest text,p_signature_count integer,p_signature_threshold integer,p_checkpoint_json jsonb,
 p_issued_at timestamptz,p_expires_at timestamptz)
returns table(state text,checkpoint_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.velmere_release_transparency_checkpoints%rowtype;v_previous public.velmere_release_transparency_checkpoints%rowtype;v_conflict public.velmere_release_transparency_checkpoints%rowtype;v_count integer;v_first public.velmere_release_transparency_entries%rowtype;v_last public.velmere_release_transparency_entries%rowtype;v_trust public.velmere_release_trust_checkpoints%rowtype;
begin
 if p_idempotency_key!~'^[a-f0-9]{64}$' or p_checkpoint_digest!~'^[a-f0-9]{64}$' or p_entries_root!~'^[a-f0-9]{64}$' or p_consistency_digest!~'^[a-f0-9]{64}$' then raise exception 'release_transparency_checkpoint_digest_invalid';end if;
 if p_environment not in('staging','production') or p_sequence<1 or p_tree_size<1 or p_tree_size>4096 or p_signature_count<p_signature_threshold or p_signature_threshold<2 then raise exception 'release_transparency_checkpoint_identity_invalid';end if;
 if p_issued_at<now()-interval '5 minutes' or p_issued_at>now()+interval '1 minute' or p_expires_at<=now() or p_expires_at>p_issued_at+interval '30 minutes' then raise exception 'release_transparency_checkpoint_freshness_invalid';end if;
 if octet_length(p_checkpoint_json::text)>1048576 then raise exception 'release_transparency_checkpoint_payload_too_large';end if;
 perform pg_advisory_xact_lock(hashtext('velmere_release_transparency_checkpoint:'||p_environment||':'||p_audience_hash));
 select * into v_existing from public.velmere_release_transparency_checkpoints where idempotency_key=p_idempotency_key;
 if found then return query select v_existing.state,v_existing.checkpoint_digest,true;return;end if;
 select * into v_conflict from public.velmere_release_transparency_checkpoints where environment=p_environment and audience_hash=p_audience_hash and tree_size=p_tree_size;
 if found and(v_conflict.entries_root<>p_entries_root or v_conflict.checkpoint_digest<>p_checkpoint_digest) then raise exception 'release_transparency_checkpoint_equivocation_detected';end if;
 select * into v_trust from public.velmere_release_trust_checkpoints where checkpoint_digest=p_trust_checkpoint_digest and state='verified';
 if v_trust.id is null or v_trust.environment<>p_environment or v_trust.audience_hash<>p_audience_hash then raise exception 'release_transparency_checkpoint_trust_not_verified';end if;
 select count(*)::integer into v_count from public.velmere_release_transparency_entries where environment=p_environment and audience_hash=p_audience_hash and state='verified' and sequence between 1 and p_tree_size;
 select * into v_first from public.velmere_release_transparency_entries where environment=p_environment and audience_hash=p_audience_hash and state='verified' and sequence=1;
 select * into v_last from public.velmere_release_transparency_entries where environment=p_environment and audience_hash=p_audience_hash and state='verified' and sequence=p_tree_size;
 if v_count<>p_tree_size or v_first.id is null or v_last.id is null then raise exception 'release_transparency_checkpoint_log_incomplete';end if;
 if v_first.entry_digest<>p_first_entry_digest or v_last.entry_digest<>p_last_entry_digest or v_last.log_root<>p_latest_log_root then raise exception 'release_transparency_checkpoint_log_binding_mismatch';end if;
 if p_sequence=1 then
  if p_previous_checkpoint_digest is not null or p_previous_tree_size<>0 or p_previous_entries_root is not null then raise exception 'release_transparency_checkpoint_genesis_invalid';end if;
 else
  select * into v_previous from public.velmere_release_transparency_checkpoints where environment=p_environment and audience_hash=p_audience_hash and sequence=p_sequence-1 and state='verified' for update;
  if v_previous.id is null or v_previous.checkpoint_digest<>p_previous_checkpoint_digest or v_previous.tree_size<>p_previous_tree_size or v_previous.entries_root<>p_previous_entries_root or v_previous.tree_size>=p_tree_size then raise exception 'release_transparency_checkpoint_previous_mismatch';end if;
 end if;
 insert into public.velmere_release_transparency_checkpoints(idempotency_key,checkpoint_digest,environment,audience_hash,sequence,previous_checkpoint_digest,previous_tree_size,previous_entries_root,tree_size,first_entry_digest,last_entry_digest,latest_log_root,entries_root,consistency_digest,trust_checkpoint_digest,signature_count,signature_threshold,checkpoint_json,issued_at,expires_at)
 values(p_idempotency_key,p_checkpoint_digest,p_environment,p_audience_hash,p_sequence,p_previous_checkpoint_digest,p_previous_tree_size,p_previous_entries_root,p_tree_size,p_first_entry_digest,p_last_entry_digest,p_latest_log_root,p_entries_root,p_consistency_digest,p_trust_checkpoint_digest,p_signature_count,p_signature_threshold,p_checkpoint_json,p_issued_at,p_expires_at);
 return query select 'recorded'::text,p_checkpoint_digest,false;
end$$;

create or replace function public.velmere_verify_release_transparency_checkpoint(p_checkpoint_digest text)
returns table(state text,checkpoint_digest text,sequence integer,tree_size integer,entries_root text,signature_count integer,signature_threshold integer)
language plpgsql security definer set search_path=public as $$
declare v_row public.velmere_release_transparency_checkpoints%rowtype;
begin
 perform pg_advisory_xact_lock(hashtext('velmere_release_transparency_checkpoint_verify:'||p_checkpoint_digest));
 select * into v_row from public.velmere_release_transparency_checkpoints where velmere_release_transparency_checkpoints.checkpoint_digest=p_checkpoint_digest for update;
 if v_row.id is null then raise exception 'release_transparency_checkpoint_not_found';end if;
 if v_row.expires_at<=now() then update public.velmere_release_transparency_checkpoints set state='blocked' where id=v_row.id;raise exception 'release_transparency_checkpoint_expired';end if;
 if v_row.signature_count<v_row.signature_threshold then raise exception 'release_transparency_checkpoint_threshold_not_met';end if;
 update public.velmere_release_transparency_checkpoints set state='verified',verified_at=coalesce(verified_at,now()) where id=v_row.id;
 return query select 'verified'::text,v_row.checkpoint_digest,v_row.sequence,v_row.tree_size,v_row.entries_root,v_row.signature_count,v_row.signature_threshold;
end$$;

create or replace function public.velmere_get_release_transparency_checkpoint_status(p_checkpoint_digest text)
returns table(state text,checkpoint_digest text,environment text,sequence integer,previous_checkpoint_digest text,tree_size integer,entries_root text,consistency_digest text,verified_at timestamptz)
language sql security definer set search_path=public stable as $$
 select state,checkpoint_digest,environment,sequence,previous_checkpoint_digest,tree_size,entries_root,consistency_digest,verified_at from public.velmere_release_transparency_checkpoints where checkpoint_digest=p_checkpoint_digest
$$;

create or replace function public.velmere_get_public_release_transparency_checkpoints(p_environment text default null,p_limit integer default 5)
returns table(checkpoint_digest text,environment text,sequence integer,previous_checkpoint_digest text,tree_size integer,entries_root text,consistency_digest text,latest_log_root text,signature_count integer,signature_threshold integer,checkpoint_json jsonb,verified_at timestamptz)
language sql security definer set search_path=public stable as $$
 select checkpoint_digest,environment,sequence,previous_checkpoint_digest,tree_size,entries_root,consistency_digest,latest_log_root,signature_count,signature_threshold,checkpoint_json,verified_at
 from public.velmere_release_transparency_checkpoints where state='verified' and(p_environment is null or environment=p_environment) order by sequence desc limit greatest(1,least(coalesce(p_limit,5),20))
$$;

revoke all on function public.velmere_record_release_transparency_checkpoint(text,text,text,text,integer,text,integer,text,integer,text,text,text,text,text,text,integer,integer,jsonb,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.velmere_verify_release_transparency_checkpoint(text) from public,anon,authenticated;
revoke all on function public.velmere_get_release_transparency_checkpoint_status(text) from public,anon,authenticated;
revoke all on function public.velmere_get_public_release_transparency_checkpoints(text,integer) from public,anon,authenticated;
grant execute on function public.velmere_record_release_transparency_checkpoint(text,text,text,text,integer,text,integer,text,integer,text,text,text,text,text,text,integer,integer,jsonb,timestamptz,timestamptz) to service_role;
grant execute on function public.velmere_verify_release_transparency_checkpoint(text) to service_role;
grant execute on function public.velmere_get_release_transparency_checkpoint_status(text) to service_role;
grant execute on function public.velmere_get_public_release_transparency_checkpoints(text,integer) to service_role;

create or replace function public.velmere_probe_durable_computation_capabilities(p_expected_schema text,p_deployment_fingerprint text)
returns table(state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,service_role_table_grants integer,required_functions integer,present_functions integer,service_role_function_grants integer,deployment_fingerprint text,capability_digest text)
language plpgsql security definer set search_path=public stable as $$
declare
 v_tables text[]:=array['velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events','velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger','velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents','velmere_provider_quality_rollback_executions','velmere_provider_quality_recovery_proofs','velmere_provider_recovery_smoke_receipts','velmere_provider_recovery_release_certificates','velmere_provider_recovery_release_bundles','velmere_release_candidate_attestations','velmere_release_provenance_indexes','velmere_release_proof_packages','velmere_release_trust_checkpoints','velmere_release_trust_consistency_proofs','velmere_release_transparency_entries','velmere_release_transparency_checkpoints'];
 v_functions text[]:=array['velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation','velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned','velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance','velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert','velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter','velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts','velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities','velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment','velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation','velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert','velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action','velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action','velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback','velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status','velmere_record_provider_quality_recovery_proof','velmere_verify_provider_quality_recovery_proof','velmere_get_provider_quality_recovery_proof_status','velmere_record_provider_recovery_smoke_receipt','velmere_get_provider_recovery_smoke_receipt_status','velmere_record_provider_recovery_release_certificate','velmere_verify_provider_recovery_release_certificate','velmere_get_provider_recovery_release_certificate_status','velmere_record_provider_recovery_release_bundle','velmere_verify_provider_recovery_release_bundle','velmere_get_provider_recovery_release_bundle_status','velmere_record_release_candidate_attestation','velmere_verify_release_candidate_attestation','velmere_get_release_candidate_attestation_status','velmere_record_release_provenance_index','velmere_verify_release_provenance_index','velmere_get_release_provenance_index_status','velmere_get_public_release_provenance_feed','velmere_record_release_proof_package','velmere_verify_release_proof_package','velmere_get_release_proof_package_status','velmere_get_public_release_proof_packages','velmere_record_release_trust_checkpoint','velmere_verify_release_trust_checkpoint','velmere_get_release_trust_checkpoint_status','velmere_get_public_release_trust_checkpoints','velmere_record_release_trust_consistency_proof','velmere_verify_release_trust_consistency_proof','velmere_get_release_trust_consistency_status','velmere_get_public_release_trust_consistency_proofs','velmere_record_release_transparency_entry','velmere_verify_release_transparency_entry','velmere_get_release_transparency_entry_status','velmere_get_public_release_transparency_entries','velmere_record_release_transparency_checkpoint','velmere_verify_release_transparency_checkpoint','velmere_get_release_transparency_checkpoint_status','velmere_get_public_release_transparency_checkpoints'];
 v_pt integer;v_rt integer;v_tg integer;v_pf integer;v_fg integer;v_payload jsonb;
begin
 if p_expected_schema<>'velmere.durable-computation.schema.4772' then raise exception 'unexpected_schema_version';end if;
 if p_deployment_fingerprint is null or p_deployment_fingerprint!~'^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint';end if;
 select count(*)::integer,count(*)filter(where c.relrowsecurity)::integer,count(*)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_table_privilege('service_role',c.oid,'SELECT'))::integer into v_pt,v_rt,v_tg from unnest(v_tables)t(name)join pg_class c on c.oid=to_regclass('public.'||t.name);
 select count(distinct p.proname)::integer,count(distinct p.proname)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer into v_pf,v_fg from unnest(v_functions)f(name)join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
 v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4772','requiredTables',cardinality(v_tables),'presentTables',v_pt,'rlsTables',v_rt,'serviceRoleTableGrants',v_tg,'requiredFunctions',cardinality(v_functions),'presentFunctions',v_pf,'serviceRoleFunctionGrants',v_fg,'deploymentFingerprint',p_deployment_fingerprint);
 return query select case when v_pt=cardinality(v_tables)and v_rt=cardinality(v_tables)and v_tg=cardinality(v_tables)and v_pf=cardinality(v_functions)and v_fg=cardinality(v_functions)then'ready'else'mismatch'end,'velmere.durable-computation.schema.4772'::text,cardinality(v_tables),v_pt,v_rt,v_tg,cardinality(v_functions),v_pf,v_fg,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end$$;
revoke all on function public.velmere_probe_durable_computation_capabilities(text,text) from public,anon,authenticated;
grant execute on function public.velmere_probe_durable_computation_capabilities(text,text) to service_role;
