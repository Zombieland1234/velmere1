-- PASS4770: public trust consistency proofs + emergency rebootstrap evidence
create table if not exists public.velmere_release_trust_consistency_proofs(
 id uuid primary key default gen_random_uuid(),
 idempotency_key text not null unique check(idempotency_key~'^[a-f0-9]{64}$'),
 proof_digest text not null unique check(proof_digest~'^[a-f0-9]{64}$'),
 environment text not null check(environment in('staging','production')),
 audience_hash text not null check(audience_hash~'^[a-f0-9]{64}$'),
 mode text not null check(mode in('continuous','emergency_rebootstrap')),
 from_checkpoint_digest text not null check(from_checkpoint_digest~'^[a-f0-9]{64}$'),
 to_checkpoint_digest text not null check(to_checkpoint_digest~'^[a-f0-9]{64}$'),
 from_sequence integer not null check(from_sequence>=1),
 to_sequence integer not null check(to_sequence>from_sequence),
 consistency_root text not null unique check(consistency_root~'^[a-f0-9]{64}$'),
 trust_epoch_start integer not null check(trust_epoch_start>=1),
 trust_epoch_end integer not null check(trust_epoch_end>=trust_epoch_start),
 signature_count integer not null check(signature_count between 2 and 8),
 signature_threshold integer not null check(signature_threshold between 2 and 5 and signature_count>=signature_threshold),
 state text not null default 'recorded' check(state in('recorded','verified','blocked')),
 proof_json jsonb not null,
 issued_at timestamptz not null,
 expires_at timestamptz not null,
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 unique(environment,audience_hash,from_checkpoint_digest,to_checkpoint_digest)
);
alter table public.velmere_release_trust_consistency_proofs enable row level security;
revoke all on public.velmere_release_trust_consistency_proofs from public,anon,authenticated;
grant select,insert,update on public.velmere_release_trust_consistency_proofs to service_role;

create or replace function public.velmere_record_release_trust_consistency_proof(
 p_idempotency_key text,p_proof_digest text,p_environment text,p_audience_hash text,p_mode text,
 p_from_checkpoint_digest text,p_to_checkpoint_digest text,p_from_sequence integer,p_to_sequence integer,
 p_consistency_root text,p_trust_epoch_start integer,p_trust_epoch_end integer,p_signature_count integer,
 p_signature_threshold integer,p_proof_json jsonb,p_issued_at timestamptz,p_expires_at timestamptz)
returns table(state text,proof_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.velmere_release_trust_consistency_proofs%rowtype;v_from public.velmere_release_trust_checkpoints%rowtype;v_to public.velmere_release_trust_checkpoints%rowtype;
begin
 if p_idempotency_key!~'^[a-f0-9]{64}$' or p_proof_digest!~'^[a-f0-9]{64}$' or p_consistency_root!~'^[a-f0-9]{64}$' then raise exception 'release_consistency_digest_invalid';end if;
 if p_environment not in('staging','production') or p_mode not in('continuous','emergency_rebootstrap') then raise exception 'release_consistency_identity_invalid';end if;
 if p_to_sequence<=p_from_sequence or p_signature_count<p_signature_threshold or p_signature_threshold<2 then raise exception 'release_consistency_threshold_invalid';end if;
 if p_issued_at<now()-interval '5 minutes' or p_issued_at>now()+interval '1 minute' or p_expires_at<=now() or p_expires_at>p_issued_at+interval '30 minutes' then raise exception 'release_consistency_freshness_invalid';end if;
 perform pg_advisory_xact_lock(hashtext('velmere_release_trust_consistency:'||p_environment||':'||p_audience_hash));
 select * into v_existing from public.velmere_release_trust_consistency_proofs where idempotency_key=p_idempotency_key;
 if found then return query select v_existing.state,v_existing.proof_digest,true;return;end if;
 select * into v_from from public.velmere_release_trust_checkpoints where checkpoint_digest=p_from_checkpoint_digest and state='verified';
 select * into v_to from public.velmere_release_trust_checkpoints where checkpoint_digest=p_to_checkpoint_digest and state='verified';
 if v_from.id is null or v_to.id is null then raise exception 'release_consistency_checkpoint_not_verified';end if;
 if v_from.environment<>p_environment or v_to.environment<>p_environment or v_from.audience_hash<>p_audience_hash or v_to.audience_hash<>p_audience_hash then raise exception 'release_consistency_checkpoint_binding_mismatch';end if;
 if v_from.sequence<>p_from_sequence or v_to.sequence<>p_to_sequence then raise exception 'release_consistency_sequence_mismatch';end if;
 if p_mode='emergency_rebootstrap' and p_trust_epoch_end<=p_trust_epoch_start then raise exception 'release_consistency_emergency_epoch_required';end if;
 insert into public.velmere_release_trust_consistency_proofs(idempotency_key,proof_digest,environment,audience_hash,mode,from_checkpoint_digest,to_checkpoint_digest,from_sequence,to_sequence,consistency_root,trust_epoch_start,trust_epoch_end,signature_count,signature_threshold,proof_json,issued_at,expires_at)
 values(p_idempotency_key,p_proof_digest,p_environment,p_audience_hash,p_mode,p_from_checkpoint_digest,p_to_checkpoint_digest,p_from_sequence,p_to_sequence,p_consistency_root,p_trust_epoch_start,p_trust_epoch_end,p_signature_count,p_signature_threshold,p_proof_json,p_issued_at,p_expires_at);
 return query select 'recorded'::text,p_proof_digest,false;
end$$;

create or replace function public.velmere_verify_release_trust_consistency_proof(p_proof_digest text)
returns table(state text,proof_digest text,from_sequence integer,to_sequence integer,mode text,signature_count integer,signature_threshold integer)
language plpgsql security definer set search_path=public as $$
declare v_row public.velmere_release_trust_consistency_proofs%rowtype;
begin
 perform pg_advisory_xact_lock(hashtext('velmere_release_trust_consistency_verify:'||p_proof_digest));
 select * into v_row from public.velmere_release_trust_consistency_proofs where velmere_release_trust_consistency_proofs.proof_digest=p_proof_digest for update;
 if v_row.id is null then raise exception 'release_consistency_not_found';end if;
 if v_row.expires_at<=now() then update public.velmere_release_trust_consistency_proofs set state='blocked' where id=v_row.id;raise exception 'release_consistency_expired';end if;
 if v_row.signature_count<v_row.signature_threshold then raise exception 'release_consistency_threshold_not_met';end if;
 update public.velmere_release_trust_consistency_proofs set state='verified',verified_at=coalesce(verified_at,now()) where id=v_row.id;
 return query select 'verified'::text,v_row.proof_digest,v_row.from_sequence,v_row.to_sequence,v_row.mode,v_row.signature_count,v_row.signature_threshold;
end$$;

create or replace function public.velmere_get_release_trust_consistency_status(p_proof_digest text)
returns table(state text,proof_digest text,environment text,mode text,from_sequence integer,to_sequence integer,consistency_root text,verified_at timestamptz)
language sql security definer set search_path=public stable as $$select state,proof_digest,environment,mode,from_sequence,to_sequence,consistency_root,verified_at from public.velmere_release_trust_consistency_proofs where proof_digest=p_proof_digest$$;

create or replace function public.velmere_get_public_release_trust_consistency_proofs(p_environment text default null,p_limit integer default 10)
returns table(proof_digest text,environment text,mode text,from_checkpoint_digest text,to_checkpoint_digest text,from_sequence integer,to_sequence integer,consistency_root text,trust_epoch_start integer,trust_epoch_end integer,signature_count integer,signature_threshold integer,verified_at timestamptz)
language sql security definer set search_path=public stable as $$
 select proof_digest,environment,mode,from_checkpoint_digest,to_checkpoint_digest,from_sequence,to_sequence,consistency_root,trust_epoch_start,trust_epoch_end,signature_count,signature_threshold,verified_at
 from public.velmere_release_trust_consistency_proofs where state='verified' and(p_environment is null or environment=p_environment) order by to_sequence desc limit greatest(1,least(coalesce(p_limit,10),50))
$$;

revoke all on function public.velmere_record_release_trust_consistency_proof(text,text,text,text,text,text,text,integer,integer,text,integer,integer,integer,integer,jsonb,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.velmere_verify_release_trust_consistency_proof(text) from public,anon,authenticated;
revoke all on function public.velmere_get_release_trust_consistency_status(text) from public,anon,authenticated;
revoke all on function public.velmere_get_public_release_trust_consistency_proofs(text,integer) from public,anon,authenticated;
grant execute on function public.velmere_record_release_trust_consistency_proof(text,text,text,text,text,text,text,integer,integer,text,integer,integer,integer,integer,jsonb,timestamptz,timestamptz) to service_role;
grant execute on function public.velmere_verify_release_trust_consistency_proof(text) to service_role;
grant execute on function public.velmere_get_release_trust_consistency_status(text) to service_role;
grant execute on function public.velmere_get_public_release_trust_consistency_proofs(text,integer) to service_role;

create or replace function public.velmere_probe_durable_computation_capabilities(p_expected_schema text,p_deployment_fingerprint text)
returns table(state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,service_role_table_grants integer,required_functions integer,present_functions integer,service_role_function_grants integer,deployment_fingerprint text,capability_digest text)
language plpgsql security definer set search_path=public stable as $$
declare
 v_tables text[]:=array['velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events','velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger','velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents','velmere_provider_quality_rollback_executions','velmere_provider_quality_recovery_proofs','velmere_provider_recovery_smoke_receipts','velmere_provider_recovery_release_certificates','velmere_provider_recovery_release_bundles','velmere_release_candidate_attestations','velmere_release_provenance_indexes','velmere_release_proof_packages','velmere_release_trust_checkpoints','velmere_release_trust_consistency_proofs'];
 v_functions text[]:=array['velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation','velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned','velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance','velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert','velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter','velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts','velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities','velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment','velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation','velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert','velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action','velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action','velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback','velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status','velmere_record_provider_quality_recovery_proof','velmere_verify_provider_quality_recovery_proof','velmere_get_provider_quality_recovery_proof_status','velmere_record_provider_recovery_smoke_receipt','velmere_get_provider_recovery_smoke_receipt_status','velmere_record_provider_recovery_release_certificate','velmere_verify_provider_recovery_release_certificate','velmere_get_provider_recovery_release_certificate_status','velmere_record_provider_recovery_release_bundle','velmere_verify_provider_recovery_release_bundle','velmere_get_provider_recovery_release_bundle_status','velmere_record_release_candidate_attestation','velmere_verify_release_candidate_attestation','velmere_get_release_candidate_attestation_status','velmere_record_release_provenance_index','velmere_verify_release_provenance_index','velmere_get_release_provenance_index_status','velmere_get_public_release_provenance_feed','velmere_record_release_proof_package','velmere_verify_release_proof_package','velmere_get_release_proof_package_status','velmere_get_public_release_proof_packages','velmere_record_release_trust_checkpoint','velmere_verify_release_trust_checkpoint','velmere_get_release_trust_checkpoint_status','velmere_get_public_release_trust_checkpoints','velmere_record_release_trust_consistency_proof','velmere_verify_release_trust_consistency_proof','velmere_get_release_trust_consistency_status','velmere_get_public_release_trust_consistency_proofs'];
 v_pt integer;v_rt integer;v_tg integer;v_pf integer;v_fg integer;v_payload jsonb;
begin
 if p_expected_schema<>'velmere.durable-computation.schema.4770' then raise exception 'unexpected_schema_version';end if;
 if p_deployment_fingerprint is null or p_deployment_fingerprint!~'^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint';end if;
 select count(*)::integer,count(*)filter(where c.relrowsecurity)::integer,count(*)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_table_privilege('service_role',c.oid,'SELECT'))::integer into v_pt,v_rt,v_tg from unnest(v_tables)t(name)join pg_class c on c.oid=to_regclass('public.'||t.name);
 select count(distinct p.proname)::integer,count(distinct p.proname)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer into v_pf,v_fg from unnest(v_functions)f(name)join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
 v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4770','requiredTables',cardinality(v_tables),'presentTables',v_pt,'rlsTables',v_rt,'serviceRoleTableGrants',v_tg,'requiredFunctions',cardinality(v_functions),'presentFunctions',v_pf,'serviceRoleFunctionGrants',v_fg,'deploymentFingerprint',p_deployment_fingerprint);
 return query select case when v_pt=cardinality(v_tables)and v_rt=cardinality(v_tables)and v_tg=cardinality(v_tables)and v_pf=cardinality(v_functions)and v_fg=cardinality(v_functions)then'ready'else'mismatch'end,'velmere.durable-computation.schema.4770'::text,cardinality(v_tables),v_pt,v_rt,v_tg,cardinality(v_functions),v_pf,v_fg,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end$$;
revoke all on function public.velmere_probe_durable_computation_capabilities(text,text) from public,anon,authenticated;
grant execute on function public.velmere_probe_durable_computation_capabilities(text,text) to service_role;
