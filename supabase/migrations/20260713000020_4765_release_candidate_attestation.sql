-- PASS4765: Ed25519 release-candidate attestation, independent verification and atomic promotion consumption.
create extension if not exists pgcrypto;

create table if not exists public.velmere_release_candidate_attestations (
  attestation_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (idempotency_key ~ '^[a-f0-9]{64}$'),
  candidate_id_hash text not null check (candidate_id_hash ~ '^[a-f0-9]{64}$'),
  state text not null check (state in ('recorded','verified','consumed','expired','revoked','blocked')),
  environment text not null check (environment in ('staging','production')),
  audience_hash text not null check (audience_hash ~ '^[a-f0-9]{64}$'),
  deployment_fingerprint text not null check (deployment_fingerprint ~ '^[a-f0-9]{64}$'),
  rollback_execution_digest text not null check (rollback_execution_digest ~ '^[a-f0-9]{64}$'),
  incident_digest text not null check (incident_digest ~ '^[a-f0-9]{64}$'),
  quality_digest text not null check (quality_digest ~ '^[a-f0-9]{64}$'),
  capability_digest text not null check (capability_digest ~ '^[a-f0-9]{64}$'),
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  build_sha256 text not null check (build_sha256 ~ '^[a-f0-9]{64}$'),
  build_id_hash text not null check (build_id_hash ~ '^[a-f0-9]{64}$'),
  exact_checkpoint integer not null check (exact_checkpoint between 4725 and 999999),
  recovery_proof_digest text not null check (recovery_proof_digest ~ '^[a-f0-9]{64}$'),
  customer_smoke_digest text not null check (customer_smoke_digest ~ '^[a-f0-9]{64}$'),
  provider_smoke_digest text not null check (provider_smoke_digest ~ '^[a-f0-9]{64}$'),
  release_certificate_digest text not null check (release_certificate_digest ~ '^[a-f0-9]{64}$'),
  release_bundle_digest text not null check (release_bundle_digest ~ '^[a-f0-9]{64}$'),
  manifest_root text not null check (manifest_root ~ '^[a-f0-9]{64}$'),
  key_id_hash text not null check (key_id_hash ~ '^[a-f0-9]{64}$'),
  public_key_fingerprint text not null check (public_key_fingerprint ~ '^[a-f0-9]{64}$'),
  signature_digest text not null check (signature_digest ~ '^[a-f0-9]{64}$'),
  attestation_digest text not null unique check (attestation_digest ~ '^[a-f0-9]{64}$'),
  operator_hash text not null check (operator_hash ~ '^[a-f0-9]{64}$'),
  reason_hash text not null check (reason_hash ~ '^[a-f0-9]{64}$'),
  promotion_request_digest text check (promotion_request_digest is null or promotion_request_digest ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  verified_at timestamptz,
  consumed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(environment,audience_hash,release_bundle_digest,manifest_root)
);
alter table public.velmere_release_candidate_attestations enable row level security;
revoke all on public.velmere_release_candidate_attestations from public,anon,authenticated;
grant select,insert,update on public.velmere_release_candidate_attestations to service_role;
create index if not exists velmere_release_candidate_attestation_state_idx on public.velmere_release_candidate_attestations(environment,state,expires_at desc);

create or replace function public.velmere_record_release_candidate_attestation(
  p_idempotency_key text,p_candidate_id_hash text,p_environment text,p_audience_hash text,p_deployment_fingerprint text,
  p_rollback_execution_digest text,p_incident_digest text,p_quality_digest text,p_capability_digest text,p_source_sha256 text,
  p_build_sha256 text,p_build_id_hash text,p_exact_checkpoint integer,p_recovery_proof_digest text,p_customer_smoke_digest text,
  p_provider_smoke_digest text,p_release_certificate_digest text,p_release_bundle_digest text,p_manifest_root text,p_key_id_hash text,
  p_public_key_fingerprint text,p_signature_digest text,p_attestation_digest text,p_operator_hash text,p_reason_hash text,
  p_issued_at timestamptz,p_expires_at timestamptz
) returns table(state text,attestation_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.velmere_release_candidate_attestations%rowtype;v_bundle public.velmere_provider_recovery_release_bundles%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_release_candidate_attestation:'||p_environment));
  if p_environment not in ('staging','production') then raise exception 'release_candidate_environment_invalid';end if;
  if array[p_idempotency_key,p_candidate_id_hash,p_audience_hash,p_deployment_fingerprint,p_rollback_execution_digest,p_incident_digest,p_quality_digest,p_capability_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_recovery_proof_digest,p_customer_smoke_digest,p_provider_smoke_digest,p_release_certificate_digest,p_release_bundle_digest,p_manifest_root,p_key_id_hash,p_public_key_fingerprint,p_signature_digest,p_attestation_digest,p_operator_hash,p_reason_hash]::text[] @> array[null]::text[] then raise exception 'release_candidate_evidence_missing';end if;
  if exists(select 1 from unnest(array[p_idempotency_key,p_candidate_id_hash,p_audience_hash,p_deployment_fingerprint,p_rollback_execution_digest,p_incident_digest,p_quality_digest,p_capability_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_recovery_proof_digest,p_customer_smoke_digest,p_provider_smoke_digest,p_release_certificate_digest,p_release_bundle_digest,p_manifest_root,p_key_id_hash,p_public_key_fingerprint,p_signature_digest,p_attestation_digest,p_operator_hash,p_reason_hash]) v where v !~ '^[a-f0-9]{64}$') then raise exception 'release_candidate_evidence_invalid';end if;
  if p_exact_checkpoint<4725 or p_issued_at>now()+interval '1 minute' or p_issued_at<now()-interval '5 minutes' or p_expires_at<=now() or p_expires_at>p_issued_at+interval '30 minutes' then raise exception 'release_candidate_freshness_invalid';end if;
  select * into v_existing from public.velmere_release_candidate_attestations where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.state,v_existing.attestation_digest,true;return;end if;
  select * into v_bundle from public.velmere_provider_recovery_release_bundles where bundle_digest=p_release_bundle_digest for update;
  if not found or v_bundle.state<>'verified' or v_bundle.expires_at<=now() then raise exception 'release_candidate_bundle_not_verified';end if;
  if v_bundle.environment<>p_environment or v_bundle.audience_hash<>p_audience_hash or v_bundle.deployment_fingerprint<>p_deployment_fingerprint or v_bundle.rollback_execution_digest<>p_rollback_execution_digest or v_bundle.incident_digest<>p_incident_digest or v_bundle.quality_digest<>p_quality_digest or v_bundle.capability_digest<>p_capability_digest or v_bundle.source_sha256<>p_source_sha256 or v_bundle.build_sha256<>p_build_sha256 or v_bundle.build_id_hash<>p_build_id_hash or v_bundle.exact_checkpoint<>p_exact_checkpoint or v_bundle.recovery_proof_digest<>p_recovery_proof_digest or v_bundle.customer_smoke_digest<>p_customer_smoke_digest or v_bundle.provider_smoke_digest<>p_provider_smoke_digest or v_bundle.release_certificate_digest<>p_release_certificate_digest then raise exception 'release_candidate_bundle_mismatch';end if;
  if exists(select 1 from public.velmere_durable_computation_deployment_ledger where is_active=true and state='promoted') then raise exception 'release_candidate_active_deployment_present';end if;
  insert into public.velmere_release_candidate_attestations(idempotency_key,candidate_id_hash,state,environment,audience_hash,deployment_fingerprint,rollback_execution_digest,incident_digest,quality_digest,capability_digest,source_sha256,build_sha256,build_id_hash,exact_checkpoint,recovery_proof_digest,customer_smoke_digest,provider_smoke_digest,release_certificate_digest,release_bundle_digest,manifest_root,key_id_hash,public_key_fingerprint,signature_digest,attestation_digest,operator_hash,reason_hash,issued_at,expires_at)
  values(p_idempotency_key,p_candidate_id_hash,'recorded',p_environment,p_audience_hash,p_deployment_fingerprint,p_rollback_execution_digest,p_incident_digest,p_quality_digest,p_capability_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_recovery_proof_digest,p_customer_smoke_digest,p_provider_smoke_digest,p_release_certificate_digest,p_release_bundle_digest,p_manifest_root,p_key_id_hash,p_public_key_fingerprint,p_signature_digest,p_attestation_digest,p_operator_hash,p_reason_hash,p_issued_at,p_expires_at);
  return query select 'recorded'::text,p_attestation_digest,false;
end $$;

create or replace function public.velmere_verify_release_candidate_attestation(
  p_idempotency_key text,p_candidate_id_hash text,p_environment text,p_audience_hash text,p_deployment_fingerprint text,
  p_rollback_execution_digest text,p_incident_digest text,p_quality_digest text,p_capability_digest text,p_source_sha256 text,
  p_build_sha256 text,p_build_id_hash text,p_exact_checkpoint integer,p_recovery_proof_digest text,p_customer_smoke_digest text,
  p_provider_smoke_digest text,p_release_certificate_digest text,p_release_bundle_digest text,p_manifest_root text,p_key_id_hash text,
  p_public_key_fingerprint text,p_signature_digest text,p_attestation_digest text,p_operator_hash text,p_reason_hash text,
  p_issued_at timestamptz,p_expires_at timestamptz
) returns table(state text,attestation_digest text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_row public.velmere_release_candidate_attestations%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_release_candidate_attestation:'||p_environment));
  select * into v_row from public.velmere_release_candidate_attestations where attestation_digest=p_attestation_digest for update;
  if not found then raise exception 'release_candidate_not_recorded';end if;
  if v_row.state='verified' then return query select v_row.state,v_row.attestation_digest,true;return;end if;
  if v_row.state<>'recorded' or v_row.expires_at<=now() then raise exception 'release_candidate_not_verifiable';end if;
  if v_row.idempotency_key<>p_idempotency_key or v_row.candidate_id_hash<>p_candidate_id_hash or v_row.environment<>p_environment or v_row.audience_hash<>p_audience_hash or v_row.deployment_fingerprint<>p_deployment_fingerprint or v_row.rollback_execution_digest<>p_rollback_execution_digest or v_row.incident_digest<>p_incident_digest or v_row.quality_digest<>p_quality_digest or v_row.capability_digest<>p_capability_digest or v_row.source_sha256<>p_source_sha256 or v_row.build_sha256<>p_build_sha256 or v_row.build_id_hash<>p_build_id_hash or v_row.exact_checkpoint<>p_exact_checkpoint or v_row.recovery_proof_digest<>p_recovery_proof_digest or v_row.customer_smoke_digest<>p_customer_smoke_digest or v_row.provider_smoke_digest<>p_provider_smoke_digest or v_row.release_certificate_digest<>p_release_certificate_digest or v_row.release_bundle_digest<>p_release_bundle_digest or v_row.manifest_root<>p_manifest_root or v_row.key_id_hash<>p_key_id_hash or v_row.public_key_fingerprint<>p_public_key_fingerprint or v_row.signature_digest<>p_signature_digest or v_row.operator_hash<>p_operator_hash or v_row.reason_hash<>p_reason_hash or v_row.issued_at<>p_issued_at or v_row.expires_at<>p_expires_at then raise exception 'release_candidate_verification_mismatch';end if;
  update public.velmere_release_candidate_attestations set state='verified',verified_at=now(),updated_at=now() where attestation_id=v_row.attestation_id;
  return query select 'verified'::text,v_row.attestation_digest,false;
end $$;

create or replace function public.velmere_get_release_candidate_attestation_status(
  p_environment text,p_audience_hash text,p_deployment_fingerprint text,p_rollback_execution_digest text,p_incident_digest text,
  p_quality_digest text,p_capability_digest text,p_source_sha256 text,p_build_sha256 text,p_build_id_hash text,p_exact_checkpoint integer,
  p_recovery_proof_digest text,p_customer_smoke_digest text,p_provider_smoke_digest text,p_release_certificate_digest text,
  p_release_bundle_digest text,p_key_id_hash text,p_public_key_fingerprint text,p_now timestamptz
) returns table(state text,attestation_digest text,manifest_root text,expires_at timestamptz,blockers text[])
language plpgsql security definer set search_path=public stable as $$
declare v_row public.velmere_release_candidate_attestations%rowtype;
begin
  select * into v_row from public.velmere_release_candidate_attestations where environment=p_environment and audience_hash=p_audience_hash and deployment_fingerprint=p_deployment_fingerprint and rollback_execution_digest=p_rollback_execution_digest and incident_digest=p_incident_digest and quality_digest=p_quality_digest and capability_digest=p_capability_digest and source_sha256=p_source_sha256 and build_sha256=p_build_sha256 and build_id_hash=p_build_id_hash and exact_checkpoint=p_exact_checkpoint and recovery_proof_digest=p_recovery_proof_digest and customer_smoke_digest=p_customer_smoke_digest and provider_smoke_digest=p_provider_smoke_digest and release_certificate_digest=p_release_certificate_digest and release_bundle_digest=p_release_bundle_digest and key_id_hash=p_key_id_hash and public_key_fingerprint=p_public_key_fingerprint order by recorded_at desc limit 1;
  if not found then return query select 'missing'::text,null::text,null::text,null::timestamptz,array['release_candidate_attestation_missing']::text[];return;end if;
  if v_row.expires_at<=p_now then return query select 'expired'::text,v_row.attestation_digest,v_row.manifest_root,v_row.expires_at,array['release_candidate_attestation_expired']::text[];return;end if;
  return query select v_row.state,v_row.attestation_digest,v_row.manifest_root,v_row.expires_at,case when v_row.state='verified' then array[]::text[] else array['release_candidate_attestation_not_verified']::text[] end;
end $$;

revoke all on function public.velmere_record_release_candidate_attestation(text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.velmere_verify_release_candidate_attestation(text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.velmere_get_release_candidate_attestation_status(text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.velmere_record_release_candidate_attestation(text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz) to service_role;
grant execute on function public.velmere_verify_release_candidate_attestation(text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz) to service_role;
grant execute on function public.velmere_get_release_candidate_attestation_status(text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,timestamptz) to service_role;

alter table public.velmere_durable_computation_deployment_ledger add column if not exists release_candidate_attestation_digest text;
alter table public.velmere_durable_computation_deployment_ledger drop constraint if exists velmere_durable_computation_release_candidate_attestation_digest_check;
alter table public.velmere_durable_computation_deployment_ledger add constraint velmere_durable_computation_release_candidate_attestation_digest_check check (release_candidate_attestation_digest is null or release_candidate_attestation_digest ~ '^[a-f0-9]{64}$');

drop function if exists public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,text,text,text,integer,text,text);
create or replace function public.velmere_promote_durable_computation_deployment(
  p_idempotency_key text,p_deployment_fingerprint text,p_capability_digest text,p_provider_quality_digest text,p_recovery_proof_digest text,
  p_release_certificate_digest text,p_release_bundle_digest text,p_release_candidate_attestation_digest text,p_source_sha256 text,p_build_sha256 text,
  p_build_id_hash text,p_exact_checkpoint integer,p_operator_hash text,p_reason_hash text
) returns table(deployment_id uuid,state text,idempotent boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.velmere_durable_computation_deployment_ledger%rowtype;v_id uuid:=gen_random_uuid();v_recovery_required boolean;v_certificate public.velmere_provider_recovery_release_certificates%rowtype;v_bundle public.velmere_provider_recovery_release_bundles%rowtype;v_attestation public.velmere_release_candidate_attestations%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_durable_computation_deployment_promotion'));
  perform pg_advisory_xact_lock(hashtext('velmere_provider_recovery_release_certificate'));
  perform pg_advisory_xact_lock(hashtext('velmere_provider_recovery_release_bundle'));
  perform pg_advisory_xact_lock(hashtext('velmere_release_candidate_attestation'));
  select * into v_existing from public.velmere_durable_computation_deployment_ledger where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.deployment_id,v_existing.state,true;return;end if;
  select exists(select 1 from public.velmere_provider_quality_rollback_executions where state='verified') into v_recovery_required;
  if v_recovery_required then
    if p_recovery_proof_digest is null or p_release_certificate_digest is null or p_release_bundle_digest is null or p_release_candidate_attestation_digest is null then raise exception 'promotion_release_candidate_attestation_required';end if;
    select * into v_certificate from public.velmere_provider_recovery_release_certificates where certificate_digest=p_release_certificate_digest for update;
    if not found or v_certificate.state<>'verified' or v_certificate.expires_at<=now() then raise exception 'promotion_recovery_certificate_not_verified';end if;
    select * into v_bundle from public.velmere_provider_recovery_release_bundles where bundle_digest=p_release_bundle_digest for update;
    if not found or v_bundle.state<>'verified' or v_bundle.expires_at<=now() then raise exception 'promotion_recovery_bundle_not_verified';end if;
    select * into v_attestation from public.velmere_release_candidate_attestations where attestation_digest=p_release_candidate_attestation_digest for update;
    if not found or v_attestation.state<>'verified' or v_attestation.expires_at<=now() then raise exception 'promotion_release_candidate_attestation_not_verified';end if;
    if v_bundle.release_certificate_digest<>p_release_certificate_digest or v_bundle.recovery_proof_digest<>p_recovery_proof_digest or v_bundle.deployment_fingerprint<>p_deployment_fingerprint or v_bundle.quality_digest<>p_provider_quality_digest or v_bundle.capability_digest<>p_capability_digest or v_bundle.source_sha256<>p_source_sha256 or v_bundle.build_sha256<>p_build_sha256 or v_bundle.build_id_hash<>p_build_id_hash or v_bundle.exact_checkpoint<>p_exact_checkpoint then raise exception 'promotion_recovery_bundle_mismatch';end if;
    if v_attestation.release_bundle_digest<>p_release_bundle_digest or v_attestation.release_certificate_digest<>p_release_certificate_digest or v_attestation.recovery_proof_digest<>p_recovery_proof_digest or v_attestation.deployment_fingerprint<>p_deployment_fingerprint or v_attestation.quality_digest<>p_provider_quality_digest or v_attestation.capability_digest<>p_capability_digest or v_attestation.source_sha256<>p_source_sha256 or v_attestation.build_sha256<>p_build_sha256 or v_attestation.build_id_hash<>p_build_id_hash or v_attestation.exact_checkpoint<>p_exact_checkpoint then raise exception 'promotion_release_candidate_attestation_mismatch';end if;
  end if;
  if exists(select 1 from public.velmere_provider_quality_incidents where incident_key='provider_quality' and (state not in ('healthy','resolved') or release_hold or rollback_required or rollback_execution_required)) then raise exception 'promotion_provider_incident_not_recovered';end if;
  update public.velmere_durable_computation_deployment_ledger set is_active=false,superseded_at=now() where is_active=true;
  insert into public.velmere_durable_computation_deployment_ledger(deployment_id,idempotency_key,action,state,is_active,deployment_fingerprint,capability_digest,provider_quality_digest,recovery_proof_digest,release_certificate_digest,release_bundle_digest,release_candidate_attestation_digest,source_sha256,build_sha256,build_id_hash,exact_checkpoint,operator_hash,reason_hash)
  values(v_id,p_idempotency_key,'promote','promoted',true,p_deployment_fingerprint,p_capability_digest,p_provider_quality_digest,p_recovery_proof_digest,p_release_certificate_digest,p_release_bundle_digest,p_release_candidate_attestation_digest,p_source_sha256,p_build_sha256,p_build_id_hash,p_exact_checkpoint,p_operator_hash,p_reason_hash);
  if v_recovery_required then
    update public.velmere_provider_recovery_release_certificates set state='consumed',promotion_request_digest=p_idempotency_key,consumed_at=now(),updated_at=now() where certificate_digest=p_release_certificate_digest;
    update public.velmere_provider_recovery_release_bundles set state='consumed',promotion_request_digest=p_idempotency_key,consumed_at=now(),updated_at=now() where bundle_digest=p_release_bundle_digest;
    update public.velmere_release_candidate_attestations set state='consumed',promotion_request_digest=p_idempotency_key,consumed_at=now(),updated_at=now() where attestation_digest=p_release_candidate_attestation_digest;
  end if;
  return query select v_id,'promoted'::text,false;
end $$;
revoke all on function public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,text,text,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.velmere_promote_durable_computation_deployment(text,text,text,text,text,text,text,text,text,text,text,integer,text,text) to service_role;

-- Schema 4765: release candidate attestation table and three RPC controls.
create or replace function public.velmere_probe_durable_computation_capabilities(p_expected_schema text,p_deployment_fingerprint text)
returns table(state text,schema_version text,required_tables integer,present_tables integer,rls_tables integer,service_role_table_grants integer,required_functions integer,present_functions integer,service_role_function_grants integer,deployment_fingerprint text,capability_digest text)
language plpgsql security definer set search_path=public stable as $$
declare
  v_tables text[]:=array['velmere_durable_computation_jobs','velmere_durable_computation_maintenance_runs','velmere_durable_computation_operator_events','velmere_durable_computation_cycle_receipts','velmere_durable_computation_alert_outbox','velmere_durable_computation_deployment_ledger','velmere_provider_observations','velmere_provider_observation_quarantine','velmere_provider_quality_incidents','velmere_provider_quality_rollback_executions','velmere_provider_quality_recovery_proofs','velmere_provider_recovery_smoke_receipts','velmere_provider_recovery_release_certificates','velmere_provider_recovery_release_bundles','velmere_release_candidate_attestations'];
  v_functions text[]:=array['velmere_claim_durable_computation','velmere_complete_durable_computation','velmere_fail_durable_computation','velmere_claim_durable_computation_worker_batch_budgeted','velmere_heartbeat_durable_computation_worker_owned','velmere_release_durable_computation_worker_claims_budget','velmere_claim_durable_computation_maintenance','velmere_get_durable_computation_metrics','velmere_cleanup_durable_computations','velmere_record_durable_computation_alert','velmere_finish_durable_computation_maintenance','velmere_requeue_durable_computation_dead_letter','velmere_record_durable_computation_cycle_receipt','velmere_claim_durable_computation_alerts','velmere_settle_durable_computation_alert','velmere_probe_durable_computation_capabilities','velmere_promote_durable_computation_deployment','velmere_rollback_durable_computation_deployment','velmere_reconcile_durable_computation_alert_outbox','velmere_record_provider_observation','velmere_reconcile_provider_observations','velmere_compact_provider_observations','velmere_record_provider_observation_alert','velmere_reconcile_provider_observation_quarantine','velmere_apply_provider_observation_quarantine_action','velmere_reconcile_provider_quality_incident','velmere_get_provider_quality_incident_snapshot','velmere_apply_provider_quality_incident_action','velmere_get_provider_quality_auto_rollback_context','velmere_execute_provider_quality_auto_rollback','velmere_verify_provider_quality_auto_rollback','velmere_get_provider_quality_auto_rollback_status','velmere_record_provider_quality_recovery_proof','velmere_verify_provider_quality_recovery_proof','velmere_get_provider_quality_recovery_proof_status','velmere_record_provider_recovery_smoke_receipt','velmere_get_provider_recovery_smoke_receipt_status','velmere_record_provider_recovery_release_certificate','velmere_verify_provider_recovery_release_certificate','velmere_get_provider_recovery_release_certificate_status','velmere_record_provider_recovery_release_bundle','velmere_verify_provider_recovery_release_bundle','velmere_get_provider_recovery_release_bundle_status','velmere_record_release_candidate_attestation','velmere_verify_release_candidate_attestation','velmere_get_release_candidate_attestation_status'];
  v_present_tables integer;v_rls_tables integer;v_table_grants integer;v_present_functions integer;v_function_grants integer;v_payload jsonb;
begin
  if p_expected_schema<>'velmere.durable-computation.schema.4765' then raise exception 'unexpected_schema_version';end if;
  if p_deployment_fingerprint is null or p_deployment_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid_deployment_fingerprint';end if;
  select count(*)::integer,count(*) filter(where c.relrowsecurity)::integer,count(*) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_table_privilege('service_role',c.oid,'SELECT'))::integer into v_present_tables,v_rls_tables,v_table_grants from unnest(v_tables)t(name) join pg_class c on c.oid=to_regclass('public.'||t.name);
  select count(distinct p.proname)::integer,count(distinct p.proname) filter(where exists(select 1 from pg_roles r where r.rolname='service_role') and has_function_privilege('service_role',p.oid,'EXECUTE'))::integer into v_present_functions,v_function_grants from unnest(v_functions)f(name) join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=f.name;
  v_payload:=jsonb_build_object('schema','velmere.durable-computation.schema.4765','requiredTables',cardinality(v_tables),'presentTables',v_present_tables,'rlsTables',v_rls_tables,'serviceRoleTableGrants',v_table_grants,'requiredFunctions',cardinality(v_functions),'presentFunctions',v_present_functions,'serviceRoleFunctionGrants',v_function_grants,'deploymentFingerprint',p_deployment_fingerprint);
  return query select case when v_present_tables=cardinality(v_tables) and v_rls_tables=cardinality(v_tables) and v_table_grants=cardinality(v_tables) and v_present_functions=cardinality(v_functions) and v_function_grants=cardinality(v_functions) then 'ready' else 'mismatch' end,'velmere.durable-computation.schema.4765'::text,cardinality(v_tables),v_present_tables,v_rls_tables,v_table_grants,cardinality(v_functions),v_present_functions,v_function_grants,p_deployment_fingerprint,encode(digest(v_payload::text,'sha256'),'hex');
end $$;
