-- PASS4768: public independently-verifiable release proof packages with key transparency and package-chain continuity.
create extension if not exists pgcrypto;
create table if not exists public.velmere_release_proof_packages(
  proof_package_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check(idempotency_key~'^[a-f0-9]{64}$'),
  package_id_hash text not null check(package_id_hash~'^[a-f0-9]{64}$'),
  state text not null check(state in('recorded','verified','consumed','expired','revoked','blocked')),
  environment text not null check(environment in('staging','production')),
  audience_hash text not null check(audience_hash~'^[a-f0-9]{64}$'),
  sequence integer not null check(sequence>=1),
  previous_package_digest text check(previous_package_digest is null or previous_package_digest~'^[a-f0-9]{64}$'),
  index_digest text not null unique check(index_digest~'^[a-f0-9]{64}$'),
  key_registry_digest text not null check(key_registry_digest~'^[a-f0-9]{64}$'),
  signature_count integer not null check(signature_count between 2 and 8),
  signature_threshold integer not null check(signature_threshold between 2 and 5 and signature_count>=signature_threshold),
  package_digest text not null unique check(package_digest~'^[a-f0-9]{64}$'),
  package_json jsonb not null check(octet_length(package_json::text)<=524288),
  issued_at timestamptz not null,expires_at timestamptz not null,recorded_at timestamptz not null default now(),verified_at timestamptz,consumed_at timestamptz,updated_at timestamptz not null default now(),
  unique(environment,audience_hash,sequence)
);
alter table public.velmere_release_proof_packages enable row level security;
revoke all on public.velmere_release_proof_packages from public,anon,authenticated;
grant select,insert,update on public.velmere_release_proof_packages to service_role;
create index if not exists velmere_release_proof_packages_chain_idx on public.velmere_release_proof_packages(environment,audience_hash,sequence desc);

create or replace function public.velmere_record_release_proof_package(
 p_idempotency_key text,p_package_id_hash text,p_environment text,p_audience_hash text,p_sequence integer,p_previous_package_digest text,p_index_digest text,p_key_registry_digest text,p_signature_count integer,p_signature_threshold integer,p_package_digest text,p_package_json jsonb,p_issued_at timestamptz,p_expires_at timestamptz
) returns table(state text,package_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.velmere_release_proof_packages%rowtype;v_index public.velmere_release_provenance_indexes%rowtype;v_prev public.velmere_release_proof_packages%rowtype;
begin
 perform pg_advisory_xact_lock(hashtext('velmere_release_proof:'||p_environment||':'||p_audience_hash));
 if p_environment not in('staging','production') then raise exception 'release_proof_environment_invalid';end if;
 if exists(select 1 from unnest(array[p_idempotency_key,p_package_id_hash,p_audience_hash,p_index_digest,p_key_registry_digest,p_package_digest])v where v is null or v!~'^[a-f0-9]{64}$') then raise exception 'release_proof_digest_invalid';end if;
 if p_sequence<1 or p_signature_threshold<2 or p_signature_threshold>5 or p_signature_count<p_signature_threshold or p_signature_count>8 then raise exception 'release_proof_threshold_invalid';end if;
 if p_issued_at>now()+interval '1 minute' or p_issued_at<now()-interval '5 minutes' or p_expires_at<=now() or p_expires_at>p_issued_at+interval '30 minutes' then raise exception 'release_proof_freshness_invalid';end if;
 if p_package_json is null or octet_length(p_package_json::text)>524288 then raise exception 'release_proof_package_size_invalid';end if;
 select * into v_existing from public.velmere_release_proof_packages where idempotency_key=p_idempotency_key;if found then return query select v_existing.state,v_existing.package_digest,true;return;end if;
 select * into v_index from public.velmere_release_provenance_indexes where index_digest=p_index_digest for update;
 if not found or v_index.state not in('verified','consumed') then raise exception 'release_proof_index_not_verified';end if;
 if v_index.environment<>p_environment or v_index.audience_hash<>p_audience_hash or v_index.sequence<>p_sequence then raise exception 'release_proof_index_mismatch';end if;
 if p_sequence=1 then if p_previous_package_digest is not null then raise exception 'release_proof_genesis_previous_forbidden';end if;
 else
  if p_previous_package_digest is null then raise exception 'release_proof_previous_required';end if;
  select * into v_prev from public.velmere_release_proof_packages where environment=p_environment and audience_hash=p_audience_hash and sequence=p_sequence-1 for update;
  if not found or v_prev.state not in('verified','consumed') or v_prev.package_digest<>p_previous_package_digest then raise exception 'release_proof_previous_mismatch';end if;
 end if;
 insert into public.velmere_release_proof_packages(idempotency_key,package_id_hash,state,environment,audience_hash,sequence,previous_package_digest,index_digest,key_registry_digest,signature_count,signature_threshold,package_digest,package_json,issued_at,expires_at)
 values(p_idempotency_key,p_package_id_hash,'recorded',p_environment,p_audience_hash,p_sequence,p_previous_package_digest,p_index_digest,p_key_registry_digest,p_signature_count,p_signature_threshold,p_package_digest,p_package_json,p_issued_at,p_expires_at);
 return query select 'recorded'::text,p_package_digest,false;
end$$;
revoke all on function public.velmere_record_release_proof_package(text,text,text,text,integer,text,text,text,integer,integer,text,jsonb,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.velmere_record_release_proof_package(text,text,text,text,integer,text,text,text,integer,integer,text,jsonb,timestamptz,timestamptz) to service_role;

create or replace function public.velmere_verify_release_proof_package(p_package_digest text)
returns table(state text,package_digest text,sequence integer,signature_count integer,signature_threshold integer)
language plpgsql security definer set search_path=public as $$declare v public.velmere_release_proof_packages%rowtype;begin
 if p_package_digest is null or p_package_digest!~'^[a-f0-9]{64}$' then raise exception 'release_proof_digest_invalid';end if;
 select * into v from public.velmere_release_proof_packages where package_digest=p_package_digest for update;if not found then raise exception 'release_proof_not_found';end if;
 if v.state in('consumed','revoked','blocked') then return query select v.state,v.package_digest,v.sequence,v.signature_count,v.signature_threshold;return;end if;
 if v.expires_at<=now() then update public.velmere_release_proof_packages set state='expired',updated_at=now() where proof_package_id=v.proof_package_id;return query select 'expired'::text,v.package_digest,v.sequence,v.signature_count,v.signature_threshold;return;end if;
 if v.signature_count<v.signature_threshold then update public.velmere_release_proof_packages set state='blocked',updated_at=now() where proof_package_id=v.proof_package_id;return query select 'blocked'::text,v.package_digest,v.sequence,v.signature_count,v.signature_threshold;return;end if;
 update public.velmere_release_proof_packages set state='verified',verified_at=coalesce(verified_at,now()),updated_at=now() where proof_package_id=v.proof_package_id;
 return query select 'verified'::text,v.package_digest,v.sequence,v.signature_count,v.signature_threshold;
end$$;
revoke all on function public.velmere_verify_release_proof_package(text) from public,anon,authenticated;grant execute on function public.velmere_verify_release_proof_package(text) to service_role;

create or replace function public.velmere_get_release_proof_package_status(p_index_digest text default null)
returns table(state text,package_digest text,index_digest text,key_registry_digest text,sequence integer,signature_count integer,signature_threshold integer,expires_at timestamptz)
language sql security definer set search_path=public stable as $$select state,package_digest,index_digest,key_registry_digest,sequence,signature_count,signature_threshold,expires_at from public.velmere_release_proof_packages where(p_index_digest is null or index_digest=p_index_digest) order by sequence desc limit 1$$;
revoke all on function public.velmere_get_release_proof_package_status(text) from public,anon,authenticated;grant execute on function public.velmere_get_release_proof_package_status(text) to service_role;

create or replace function public.velmere_get_public_release_proof_packages(p_environment text default null,p_limit integer default 5)
returns table(package_json jsonb,package_digest text,sequence integer)
language sql security definer set search_path=public stable as $$select package_json,package_digest,sequence from public.velmere_release_proof_packages where state in('verified','consumed','expired') and(p_environment is null or environment=p_environment) order by sequence desc limit greatest(1,least(coalesce(p_limit,5),20))$$;
revoke all on function public.velmere_get_public_release_proof_packages(text,integer) from public,anon,authenticated;grant execute on function public.velmere_get_public_release_proof_packages(text,integer) to service_role;

-- Schema 4768: 17 tables and 54 required RPCs including public proof packages.
create or replace function public.velmere_probe_durable_computation_capabilities(p_expected_schema text,p_deployment_fingerprint text)
returns table(state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,service_role_table_grants integer,required_functions integer,present_functions integer,service_role_function_grants integer,deployment_fingerprint text,capability_digest text)
language plpgsql security definer set search_path=public stable as $$
declare v_tables text[]:=array['velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events','velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger','velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents','velmere_provider_quality_rollback_executions','velmere_provider_quality_recovery_proofs','velmere_provider_recovery_smoke_receipts','velmere_provider_recovery_release_certificates','velmere_provider_recovery_release_bundles','velmere_release_candidate_attestations','velmere_release_provenance_indexes','velmere_release_proof_packages'];
 v_functions text[]:=array['velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation','velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned','velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance','velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert','velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter','velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts','velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities','velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment','velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation','velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert','velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action','velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action','velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback','velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status','velmere_record_provider_quality_recovery_proof','velmere_verify_provider_quality_recovery_proof','velmere_get_provider_quality_recovery_proof_status','velmere_record_provider_recovery_smoke_receipt','velmere_get_provider_recovery_smoke_receipt_status','velmere_record_provider_recovery_release_certificate','velmere_verify_provider_recovery_release_certificate','velmere_get_provider_recovery_release_certificate_status','velmere_record_provider_recovery_release_bundle','velmere_verify_provider_recovery_release_bundle','velmere_get_provider_recovery_release_bundle_status','velmere_record_release_candidate_attestation','velmere_verify_release_candidate_attestation','velmere_get_release_candidate_attestation_status','velmere_record_release_provenance_index','velmere_verify_release_provenance_index','velmere_get_release_provenance_index_status','velmere_get_public_release_provenance_feed','velmere_record_release_proof_package','velmere_verify_release_proof_package','velmere_get_release_proof_package_status','velmere_get_public_release_proof_packages'];
 v_pt integer;v_rt integer;v_tg integer;v_pf integer;v_fg integer;v_payload jsonb;
begin if p_expected_schema<>'velmere.durable-computation.schema.4768' then raise exception 'unexpected_schema_version';end if;if p_deployment_fingerprint is null or p_deployment_fingerprint!~'^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint';end if;
 select count(*)::integer,count(*)filter(where c.relrowsecurity)::integer,count(*)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_table_privilege('service_role',c.oid,'SELECT'))::integer into v_pt,v_rt,v_tg from unnest(v_tables)t(name)join pg_class c on c.oid=to_regclass('public.'||t.name);
 select count(distinct p.proname)::integer,count(distinct p.proname)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer into v_pf,v_fg from unnest(v_functions)f(name)join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
 v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4768','requiredTables',cardinality(v_tables),'presentTables',v_pt,'rlsTables',v_rt,'serviceRoleTableGrants',v_tg,'requiredFunctions',cardinality(v_functions),'presentFunctions',v_pf,'serviceRoleFunctionGrants',v_fg,'deploymentFingerprint',p_deployment_fingerprint);
 return query select case when v_pt=cardinality(v_tables)and v_rt=cardinality(v_tables)and v_tg=cardinality(v_tables)and v_pf=cardinality(v_functions)and v_fg=cardinality(v_functions)then'ready'else'mismatch'end,'velmere.durable-computation.schema.4768'::text,cardinality(v_tables),v_pt,v_rt,v_tg,cardinality(v_functions),v_pf,v_fg,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');end$$;
revoke all on function public.velmere_probe_durable_computation_capabilities(text,text) from public,anon,authenticated;grant execute on function public.velmere_probe_durable_computation_capabilities(text,text) to service_role;
