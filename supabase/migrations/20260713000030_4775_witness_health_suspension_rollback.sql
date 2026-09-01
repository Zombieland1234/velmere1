-- PASS4775: post-promotion witness health, signed revocation policy, release suspension and rollback escalation
create table if not exists public.velmere_release_transparency_witness_health_policies(
 policy_id uuid primary key default gen_random_uuid(),
 idempotency_key text not null unique check(idempotency_key~'^[a-f0-9]{64}$'),
 policy_digest text not null unique check(policy_digest~'^[a-f0-9]{64}$'),
 environment text not null check(environment in('staging','production')),
 audience_hash text not null check(audience_hash~'^[a-f0-9]{64}$'),
 state text not null default 'active' check(state in('active','superseded','revoked')),
 revoked_witness_fingerprints text[] not null default '{}',
 max_degraded_seconds integer not null check(max_degraded_seconds between 60 and 86400),
 operator_hash text not null check(operator_hash~'^[a-f0-9]{64}$'),
 reason_hash text not null check(reason_hash~'^[a-f0-9]{64}$'),
 approval_digest text not null check(approval_digest~'^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 superseded_at timestamptz,
 check(cardinality(revoked_witness_fingerprints)<=64)
);
alter table public.velmere_release_transparency_witness_health_policies enable row level security;
revoke all on public.velmere_release_transparency_witness_health_policies from public,anon,authenticated;
grant select,insert,update on public.velmere_release_transparency_witness_health_policies to service_role;
create unique index if not exists velmere_witness_health_one_active_policy_idx on public.velmere_release_transparency_witness_health_policies(environment,audience_hash) where state='active';

create table if not exists public.velmere_release_transparency_witness_health_events(
 health_event_id uuid primary key default gen_random_uuid(),
 deployment_id uuid not null unique references public.velmere_durable_computation_deployment_ledger(deployment_id),
 environment text not null check(environment in('staging','production')),
 audience_hash text not null check(audience_hash~'^[a-f0-9]{64}$'),
 quorum_digest text not null check(quorum_digest~'^[a-f0-9]{64}$'),
 checkpoint_digest text not null check(checkpoint_digest~'^[a-f0-9]{64}$'),
 policy_digest text check(policy_digest is null or policy_digest~'^[a-f0-9]{64}$'),
 state text not null check(state in('healthy','suspended','rollback_required')),
 health_digest text not null unique check(health_digest~'^[a-f0-9]{64}$'),
 blocker_codes text[] not null default '{}',
 valid_organization_count integer not null default 0 check(valid_organization_count between 0 and 16),
 signature_threshold integer not null default 2 check(signature_threshold between 2 and 8),
 revoked_witness_count integer not null default 0 check(revoked_witness_count between 0 and 16),
 expired_witness_count integer not null default 0 check(expired_witness_count between 0 and 16),
 release_suspended boolean not null default false,
 rollback_required boolean not null default false,
 first_observed_at timestamptz not null default now(),
 last_observed_at timestamptz not null default now(),
 suspended_at timestamptz,
 rollback_required_at timestamptz,
 verified_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.velmere_release_transparency_witness_health_events enable row level security;
revoke all on public.velmere_release_transparency_witness_health_events from public,anon,authenticated;
grant select,insert,update on public.velmere_release_transparency_witness_health_events to service_role;
create index if not exists velmere_witness_health_state_idx on public.velmere_release_transparency_witness_health_events(environment,state,last_observed_at desc);

alter table public.velmere_durable_computation_deployment_ledger
 add column if not exists release_suspended boolean not null default false,
 add column if not exists witness_health_digest text check(witness_health_digest is null or witness_health_digest~'^[a-f0-9]{64}$'),
 add column if not exists witness_suspended_at timestamptz,
 add column if not exists witness_rollback_required boolean not null default false;

create or replace function public.velmere_apply_release_transparency_witness_health_policy(
 p_idempotency_key text,p_policy_digest text,p_environment text,p_audience_hash text,p_revoked_witness_fingerprints text[],p_max_degraded_seconds integer,p_operator_hash text,p_reason_hash text,p_approval_digest text)
returns table(state text,policy_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.velmere_release_transparency_witness_health_policies%rowtype;begin
 if p_idempotency_key!~'^[a-f0-9]{64}$' or p_policy_digest!~'^[a-f0-9]{64}$' or p_audience_hash!~'^[a-f0-9]{64}$' then raise exception 'release_witness_health_policy_digest_invalid';end if;
 if p_environment not in('staging','production') or p_max_degraded_seconds<60 or p_max_degraded_seconds>86400 then raise exception 'release_witness_health_policy_invalid';end if;
 if cardinality(coalesce(p_revoked_witness_fingerprints,'{}'))>64 or exists(select 1 from unnest(coalesce(p_revoked_witness_fingerprints,'{}')) x where x!~'^[a-f0-9]{64}$') then raise exception 'release_witness_health_policy_revocations_invalid';end if;
 if p_operator_hash!~'^[a-f0-9]{64}$' or p_reason_hash!~'^[a-f0-9]{64}$' or p_approval_digest!~'^[a-f0-9]{64}$' then raise exception 'release_witness_health_policy_evidence_invalid';end if;
 perform pg_advisory_xact_lock(hashtext('velmere_witness_health_policy:'||p_environment||':'||p_audience_hash));
 select * into v_existing from public.velmere_release_transparency_witness_health_policies where idempotency_key=p_idempotency_key;
 if found then return query select v_existing.state,v_existing.policy_digest,true;return;end if;
 update public.velmere_release_transparency_witness_health_policies set state='superseded',superseded_at=now() where environment=p_environment and audience_hash=p_audience_hash and state='active';
 insert into public.velmere_release_transparency_witness_health_policies(idempotency_key,policy_digest,environment,audience_hash,revoked_witness_fingerprints,max_degraded_seconds,operator_hash,reason_hash,approval_digest)
 values(p_idempotency_key,p_policy_digest,p_environment,p_audience_hash,coalesce(p_revoked_witness_fingerprints,'{}'),p_max_degraded_seconds,p_operator_hash,p_reason_hash,p_approval_digest);
 return query select 'active'::text,p_policy_digest,false;
end$$;

create or replace function public.velmere_reconcile_release_transparency_witness_health(p_environment text,p_audience_hash text,p_max_degraded_seconds integer default 900)
returns table(state text,release_suspended boolean,rollback_required boolean,valid_organization_count integer,signature_threshold integer,health_digest text,blockers text[])
language plpgsql security definer set search_path=public as $$
declare
 v_deployment public.velmere_durable_computation_deployment_ledger%rowtype;
 v_quorum public.velmere_release_transparency_witness_quorums%rowtype;
 v_policy public.velmere_release_transparency_witness_health_policies%rowtype;
 v_previous public.velmere_release_transparency_witness_health_events%rowtype;
 v_valid_orgs integer:=0;v_revoked integer:=0;v_expired integer:=0;v_blockers text[]:='{}';v_state text:='healthy';v_suspend boolean:=false;v_rollback boolean:=false;v_digest text;v_first timestamptz:=now();
begin
 if p_environment not in('staging','production') or p_audience_hash!~'^[a-f0-9]{64}$' then raise exception 'release_witness_health_identity_invalid';end if;
 perform pg_advisory_xact_lock(hashtext('velmere_witness_health:'||p_environment||':'||p_audience_hash));
 select * into v_deployment from public.velmere_durable_computation_deployment_ledger where is_active=true and action='promote' and state='promoted' order by applied_at desc limit 1 for update;
 if v_deployment.deployment_id is null then return query select 'no_active_deployment'::text,false,false,0,2,null::text,'{}'::text[];return;end if;
 select * into v_policy from public.velmere_release_transparency_witness_health_policies where environment=p_environment and audience_hash=p_audience_hash and state='active' order by created_at desc limit 1;
 if v_policy.policy_id is null then v_blockers:=array_append(v_blockers,'witness_health_policy_missing');end if;
 select * into v_quorum from public.velmere_release_transparency_witness_quorums where quorum_digest=v_deployment.release_transparency_witness_quorum_digest for update;
 if v_quorum.id is null then v_blockers:=array_append(v_blockers,'witness_quorum_missing');
 else
  if v_quorum.state<>'consumed' then v_blockers:=array_append(v_blockers,'witness_quorum_not_consumed');end if;
  if v_quorum.state='split_view' then v_blockers:=array_append(v_blockers,'witness_split_view_detected');end if;
  select count(distinct x->>'organizationHash') filter(
           where not(coalesce(x->>'publicKeyFingerprint','')=any(coalesce(v_policy.revoked_witness_fingerprints,'{}')))
             and (nullif(x->>'validUntil','') is null or to_timestamp((x->>'validUntil')::double precision/1000)>now())
         )::integer,
         count(*) filter(where coalesce(x->>'publicKeyFingerprint','')=any(coalesce(v_policy.revoked_witness_fingerprints,'{}')))::integer,
         count(*) filter(where nullif(x->>'validUntil','') is not null and to_timestamp((x->>'validUntil')::double precision/1000)<=now())::integer
    into v_valid_orgs,v_revoked,v_expired
    from jsonb_array_elements(coalesce(v_quorum.quorum_json->'witnesses','[]'::jsonb)) x;
  if v_revoked>0 then v_blockers:=array_append(v_blockers,'witness_key_revoked');end if;
  if v_expired>0 then v_blockers:=array_append(v_blockers,'witness_key_expired');end if;
  if coalesce(v_valid_orgs,0)<v_quorum.signature_threshold then v_blockers:=array_append(v_blockers,'witness_organization_threshold_lost');end if;
 end if;
 select * into v_previous from public.velmere_release_transparency_witness_health_events where deployment_id=v_deployment.deployment_id for update;
 if v_previous.health_event_id is not null and v_previous.state<>'healthy' then v_first:=v_previous.first_observed_at;end if;
 if cardinality(v_blockers)>0 then
  v_suspend:=true;v_state:='suspended';
  if 'witness_split_view_detected'=any(v_blockers) or now()-v_first>=make_interval(secs=>coalesce(v_policy.max_degraded_seconds,p_max_degraded_seconds,900)) then v_rollback:=true;v_state:='rollback_required';end if;
 end if;
 v_digest:=encode(digest(jsonb_build_object('deployment',v_deployment.deployment_id::text,'quorum',coalesce(v_quorum.quorum_digest,''),'policy',coalesce(v_policy.policy_digest,''),'state',v_state,'blockers',v_blockers,'validOrganizations',coalesce(v_valid_orgs,0),'threshold',coalesce(v_quorum.signature_threshold,2),'revoked',v_revoked,'expired',v_expired)::text,'sha256'),'hex');
 insert into public.velmere_release_transparency_witness_health_events(deployment_id,environment,audience_hash,quorum_digest,checkpoint_digest,policy_digest,state,health_digest,blocker_codes,valid_organization_count,signature_threshold,revoked_witness_count,expired_witness_count,release_suspended,rollback_required,first_observed_at,last_observed_at,suspended_at,rollback_required_at)
 values(v_deployment.deployment_id,p_environment,p_audience_hash,coalesce(v_quorum.quorum_digest,repeat('0',64)),coalesce(v_quorum.checkpoint_digest,repeat('0',64)),v_policy.policy_digest,v_state,v_digest,v_blockers,coalesce(v_valid_orgs,0),coalesce(v_quorum.signature_threshold,2),v_revoked,v_expired,v_suspend,v_rollback,v_first,now(),case when v_suspend then coalesce(v_previous.suspended_at,now()) end,case when v_rollback then coalesce(v_previous.rollback_required_at,now()) end)
 on conflict(deployment_id) do update set policy_digest=excluded.policy_digest,state=excluded.state,health_digest=excluded.health_digest,blocker_codes=excluded.blocker_codes,valid_organization_count=excluded.valid_organization_count,signature_threshold=excluded.signature_threshold,revoked_witness_count=excluded.revoked_witness_count,expired_witness_count=excluded.expired_witness_count,release_suspended=excluded.release_suspended,rollback_required=excluded.rollback_required,first_observed_at=case when excluded.state='healthy' then now() else velmere_release_transparency_witness_health_events.first_observed_at end,last_observed_at=now(),suspended_at=case when excluded.release_suspended then coalesce(velmere_release_transparency_witness_health_events.suspended_at,now()) else null end,rollback_required_at=case when excluded.rollback_required then coalesce(velmere_release_transparency_witness_health_events.rollback_required_at,now()) else null end,updated_at=now();
 update public.velmere_durable_computation_deployment_ledger set release_suspended=v_suspend,witness_health_digest=v_digest,witness_suspended_at=case when v_suspend then coalesce(witness_suspended_at,now()) else null end,witness_rollback_required=v_rollback where deployment_id=v_deployment.deployment_id;
 return query select v_state,v_suspend,v_rollback,coalesce(v_valid_orgs,0),coalesce(v_quorum.signature_threshold,2),v_digest,v_blockers;
end$$;

create or replace function public.velmere_verify_release_transparency_witness_health(p_health_digest text)
returns table(state text,health_digest text,release_suspended boolean,rollback_required boolean,verified_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v public.velmere_release_transparency_witness_health_events%rowtype;v_d public.velmere_durable_computation_deployment_ledger%rowtype;begin
 if p_health_digest!~'^[a-f0-9]{64}$' then raise exception 'release_witness_health_digest_invalid';end if;
 select * into v from public.velmere_release_transparency_witness_health_events where health_digest=p_health_digest for update;
 if v.health_event_id is null then raise exception 'release_witness_health_not_found';end if;
 select * into v_d from public.velmere_durable_computation_deployment_ledger where deployment_id=v.deployment_id;
 if v_d.witness_health_digest<>v.health_digest or v_d.release_suspended<>v.release_suspended or v_d.witness_rollback_required<>v.rollback_required then raise exception 'release_witness_health_deployment_state_mismatch';end if;
 update public.velmere_release_transparency_witness_health_events set verified_at=coalesce(verified_at,now()),updated_at=now() where health_event_id=v.health_event_id;
 return query select v.state,v.health_digest,v.release_suspended,v.rollback_required,coalesce(v.verified_at,now());
end$$;

create or replace function public.velmere_get_release_transparency_witness_health_status(p_environment text default null)
returns table(environment text,state text,release_suspended boolean,rollback_required boolean,health_digest text,quorum_digest text,checkpoint_digest text,valid_organization_count integer,signature_threshold integer,last_observed_at timestamptz)
language sql security definer set search_path=public stable as $$
 select environment,state,release_suspended,rollback_required,health_digest,quorum_digest,checkpoint_digest,valid_organization_count,signature_threshold,last_observed_at
 from public.velmere_release_transparency_witness_health_events where(p_environment is null or environment=p_environment) order by last_observed_at desc limit 1
$$;

create or replace function public.velmere_get_public_release_transparency_witness_health(p_environment text default null,p_limit integer default 10)
returns table(environment text,state text,release_suspended boolean,rollback_required boolean,health_digest text,quorum_digest text,checkpoint_digest text,valid_organization_count integer,signature_threshold integer,last_observed_at timestamptz)
language sql security definer set search_path=public stable as $$
 select environment,state,release_suspended,rollback_required,health_digest,quorum_digest,checkpoint_digest,valid_organization_count,signature_threshold,last_observed_at
 from public.velmere_release_transparency_witness_health_events where(p_environment is null or environment=p_environment) order by last_observed_at desc limit greatest(1,least(coalesce(p_limit,10),50))
$$;

revoke all on function public.velmere_apply_release_transparency_witness_health_policy(text,text,text,text,text[],integer,text,text,text) from public,anon,authenticated;
revoke all on function public.velmere_reconcile_release_transparency_witness_health(text,text,integer) from public,anon,authenticated;
revoke all on function public.velmere_verify_release_transparency_witness_health(text) from public,anon,authenticated;
revoke all on function public.velmere_get_release_transparency_witness_health_status(text) from public,anon,authenticated;
revoke all on function public.velmere_get_public_release_transparency_witness_health(text,integer) from public,anon,authenticated;
grant execute on function public.velmere_apply_release_transparency_witness_health_policy(text,text,text,text,text[],integer,text,text,text) to service_role;
grant execute on function public.velmere_reconcile_release_transparency_witness_health(text,text,integer) to service_role;
grant execute on function public.velmere_verify_release_transparency_witness_health(text) to service_role;
grant execute on function public.velmere_get_release_transparency_witness_health_status(text) to service_role;
grant execute on function public.velmere_get_public_release_transparency_witness_health(text,integer) to service_role;

-- Schema 4775: post-promotion witness health policy, suspension and rollback escalation.
create or replace function public.velmere_probe_durable_computation_capabilities(p_expected_schema text,p_deployment_fingerprint text)
returns table(state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,service_role_table_grants integer,required_functions integer,present_functions integer,service_role_function_grants integer,deployment_fingerprint text,capability_digest text)
language plpgsql security definer set search_path=public stable as $$
declare
 v_tables text[]:=array['velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events','velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger','velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents','velmere_provider_quality_rollback_executions','velmere_provider_quality_recovery_proofs','velmere_provider_recovery_smoke_receipts','velmere_provider_recovery_release_certificates','velmere_provider_recovery_release_bundles','velmere_release_candidate_attestations','velmere_release_provenance_indexes','velmere_release_proof_packages','velmere_release_trust_checkpoints','velmere_release_trust_consistency_proofs','velmere_release_transparency_entries','velmere_release_transparency_checkpoints','velmere_release_transparency_witness_quorums','velmere_release_transparency_witness_health_policies','velmere_release_transparency_witness_health_events'];
 v_functions text[]:=array['velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation','velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned','velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance','velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert','velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter','velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts','velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities','velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment','velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation','velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert','velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action','velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action','velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback','velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status','velmere_record_provider_quality_recovery_proof','velmere_verify_provider_quality_recovery_proof','velmere_get_provider_quality_recovery_proof_status','velmere_record_provider_recovery_smoke_receipt','velmere_get_provider_recovery_smoke_receipt_status','velmere_record_provider_recovery_release_certificate','velmere_verify_provider_recovery_release_certificate','velmere_get_provider_recovery_release_certificate_status','velmere_record_provider_recovery_release_bundle','velmere_verify_provider_recovery_release_bundle','velmere_get_provider_recovery_release_bundle_status','velmere_record_release_candidate_attestation','velmere_verify_release_candidate_attestation','velmere_get_release_candidate_attestation_status','velmere_record_release_provenance_index','velmere_verify_release_provenance_index','velmere_get_release_provenance_index_status','velmere_get_public_release_provenance_feed','velmere_record_release_proof_package','velmere_verify_release_proof_package','velmere_get_release_proof_package_status','velmere_get_public_release_proof_packages','velmere_record_release_trust_checkpoint','velmere_verify_release_trust_checkpoint','velmere_get_release_trust_checkpoint_status','velmere_get_public_release_trust_checkpoints','velmere_record_release_trust_consistency_proof','velmere_verify_release_trust_consistency_proof','velmere_get_release_trust_consistency_status','velmere_get_public_release_trust_consistency_proofs','velmere_record_release_transparency_entry','velmere_verify_release_transparency_entry','velmere_get_release_transparency_entry_status','velmere_get_public_release_transparency_entries','velmere_record_release_transparency_checkpoint','velmere_verify_release_transparency_checkpoint','velmere_get_release_transparency_checkpoint_status','velmere_get_public_release_transparency_checkpoints','velmere_record_release_transparency_witness_quorum','velmere_verify_release_transparency_witness_quorum','velmere_get_release_transparency_witness_quorum_status','velmere_get_public_release_transparency_witness_quorums','velmere_apply_release_transparency_witness_health_policy','velmere_reconcile_release_transparency_witness_health','velmere_verify_release_transparency_witness_health','velmere_get_release_transparency_witness_health_status','velmere_get_public_release_transparency_witness_health'];
 v_pt integer;v_rt integer;v_tg integer;v_pf integer;v_fg integer;v_payload jsonb;
begin
 if p_expected_schema<>'velmere.durable-computation.schema.4775' then raise exception 'unexpected_schema_version';end if;
 if p_deployment_fingerprint is null or p_deployment_fingerprint!~'^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint';end if;
 select count(*)::integer,count(*)filter(where c.relrowsecurity)::integer,count(*)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_table_privilege('service_role',c.oid,'SELECT'))::integer into v_pt,v_rt,v_tg from unnest(v_tables)t(name)join pg_class c on c.oid=to_regclass('public.'||t.name);
 select count(distinct p.proname)::integer,count(distinct p.proname)filter(where exists(select 1 from pg_roles r where r.rolname='service_role')and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer into v_pf,v_fg from unnest(v_functions)f(name)join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
 v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4775','requiredTables',cardinality(v_tables),'presentTables',v_pt,'rlsTables',v_rt,'serviceRoleTableGrants',v_tg,'requiredFunctions',cardinality(v_functions),'presentFunctions',v_pf,'serviceRoleFunctionGrants',v_fg,'deploymentFingerprint',p_deployment_fingerprint);
 return query select case when v_pt=cardinality(v_tables)and v_rt=cardinality(v_tables)and v_tg=cardinality(v_tables)and v_pf=cardinality(v_functions)and v_fg=cardinality(v_functions)then'ready'else'mismatch'end,'velmere.durable-computation.schema.4775'::text,cardinality(v_tables),v_pt,v_rt,v_tg,cardinality(v_functions),v_pf,v_fg,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end$$;
revoke all on function public.velmere_probe_durable_computation_capabilities(text,text) from public,anon,authenticated;
grant execute on function public.velmere_probe_durable_computation_capabilities(text,text) to service_role;
