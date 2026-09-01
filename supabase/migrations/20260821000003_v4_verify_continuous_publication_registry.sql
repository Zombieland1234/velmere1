begin;

-- V4 Verify: durable canonical identities plus an append-only publication and
-- monitoring history. The tables are never browser-readable. Public surfaces
-- use the bounded service-role projections at the end of this migration.
create extension if not exists pgcrypto;


-- R7 portability bridge: hosted Supabase exposes pgcrypto in `extensions`,
-- while disposable PGlite exposes it in `public`. Create only the missing
-- `extensions` wrappers so all later current migrations use one explicit path.
create schema if not exists extensions;
do $compat$
begin
  if to_regprocedure('extensions.digest(text,text)') is null
     and to_regprocedure('public.digest(text,text)') is not null then
    execute $sql$
      create function extensions.digest(text,text) returns bytea
      language sql immutable strict as $fn$
        select public.digest($1,$2)
      $fn$
    $sql$;
  end if;
  if to_regprocedure('extensions.digest(bytea,text)') is null
     and to_regprocedure('public.digest(bytea,text)') is not null then
    execute $sql$
      create function extensions.digest(bytea,text) returns bytea
      language sql immutable strict as $fn$
        select public.digest($1,$2)
      $fn$
    $sql$;
  end if;
  if to_regprocedure('extensions.hmac(bytea,bytea,text)') is null
     and to_regprocedure('public.hmac(bytea,bytea,text)') is not null then
    execute $sql$
      create function extensions.hmac(bytea,bytea,text) returns bytea
      language sql immutable strict as $fn$
        select public.hmac($1,$2,$3)
      $fn$
    $sql$;
  end if;
  if to_regprocedure('extensions.hmac(text,bytea,text)') is null
     and to_regprocedure('public.hmac(bytea,bytea,text)') is not null then
    execute $sql$
      create function extensions.hmac(text,bytea,text) returns bytea
      language sql immutable strict as $fn$
        select public.hmac(convert_to($1,'UTF8'),$2,$3)
      $fn$
    $sql$;
  end if;
  if to_regprocedure('extensions.gen_random_bytes(integer)') is null
     and to_regprocedure('public.gen_random_bytes(integer)') is not null then
    execute $sql$
      create function extensions.gen_random_bytes(integer) returns bytea
      language sql volatile strict as $fn$
        select public.gen_random_bytes($1)
      $fn$
    $sql$;
  end if;
end
$compat$;

-- R7 producer-order bridge: the initial producer (00005) invokes this primitive.
create or replace function public.velmere_verify_canonical_deployment_identity_digest_v1(
  p_chain_id text,
  p_contract_address text,
  p_runtime_bytecode_sha256 text,
  p_proxy_kind text,
  p_implementation_address text,
  p_implementation_bytecode_sha256 text,
  p_trusted_forwarder_address text,
  p_trusted_forwarder_state text,
  p_negative_control_state text
) returns text
language plpgsql
immutable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_identity text;
begin
  if p_chain_id is null or p_chain_id !~ '^[1-9][0-9]{0,19}$'
     or p_contract_address is null or lower(p_contract_address) !~ '^0x[a-f0-9]{40}$'
     or p_runtime_bytecode_sha256 is null or lower(p_runtime_bytecode_sha256) !~ '^sha256:[a-f0-9]{64}$'
     or p_trusted_forwarder_address is null or lower(p_trusted_forwarder_address) !~ '^0x[a-f0-9]{40}$'
     or p_proxy_kind is null
     or p_trusted_forwarder_state is null
     or p_trusted_forwarder_state not in ('ACTIVE', 'INACTIVE')
     or p_negative_control_state is null
     or p_negative_control_state <> 'INACTIVE'
     or lower(p_contract_address) = '0x0000000000000000000000000000000000000001'
     or lower(p_trusted_forwarder_address) = '0x0000000000000000000000000000000000000001'
     or (
       p_proxy_kind = 'EIP_1167_COMPATIBLE_MINIMAL_PROXY'
       and (
         p_implementation_address is null
         or lower(p_implementation_address) !~ '^0x[a-f0-9]{40}$'
         or p_implementation_bytecode_sha256 is null
         or lower(p_implementation_bytecode_sha256) !~ '^sha256:[a-f0-9]{64}$'
       )
     )
     or (
       p_proxy_kind = 'NO_PROXY'
       and (p_implementation_address is not null or p_implementation_bytecode_sha256 is not null)
     )
     or p_proxy_kind not in ('EIP_1167_COMPATIBLE_MINIMAL_PROXY', 'NO_PROXY') then
    raise exception 'verify_canonical_deployment_identity_invalid' using errcode = '22023';
  end if;
  v_identity := '{'
    || '"chainId":' || to_jsonb(p_chain_id)::text || ','
    || '"contractAddress":' || to_jsonb(lower(p_contract_address))::text || ','
    || '"implementationAddress":' || case when p_implementation_address is null
      then 'null' else to_jsonb(lower(p_implementation_address))::text end || ','
    || '"implementationBytecodeSha256":' || case when p_implementation_bytecode_sha256 is null
      then 'null' else to_jsonb(lower(p_implementation_bytecode_sha256))::text end || ','
    || '"negativeControlAddress":"0x0000000000000000000000000000000000000001",'
    || '"negativeControlState":"INACTIVE",'
    || '"proxyKind":' || to_jsonb(p_proxy_kind)::text || ','
    || '"runtimeBytecodeSha256":' || to_jsonb(lower(p_runtime_bytecode_sha256))::text || ','
    || '"schemaVersion":"velmere.verify-canonical-deployment-identity.v1",'
    || '"trustedForwarderAddress":' || to_jsonb(lower(p_trusted_forwarder_address))::text || ','
    || '"trustedForwarderSelector":"0x572b6c05",'
    || '"trustedForwarderState":' || to_jsonb(p_trusted_forwarder_state)::text
    || '}';
  return encode(extensions.digest(convert_to(
    'velmere.verify-canonical-deployment-identity.v1' || chr(31) || v_identity,
    'UTF8'
  ), 'sha256'), 'hex');
end;
$$;

revoke all on function public.velmere_verify_canonical_deployment_identity_digest_v1(
  text, text, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.velmere_verify_canonical_deployment_identity_digest_v1(
  text, text, text, text, text, text, text, text, text
) to service_role;


create table if not exists public.velmere_verify_publication_identities (
  public_proof_id text primary key
    check (public_proof_id ~ '^pubidx-[a-f0-9]{48}$'),
  chain_id text not null
    check (chain_id ~ '^[1-9][0-9]{0,19}$'),
  contract_address text not null
    check (contract_address ~ '^0x[a-f0-9]{40}$'),
  identity_digest text not null unique
    check (identity_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  unique (chain_id, contract_address)
);

create table if not exists public.velmere_verify_publication_events (
  event_digest text primary key
    check (event_digest ~ '^[a-f0-9]{64}$'),
  request_digest text not null
    check (request_digest ~ '^[a-f0-9]{64}$'),
  idempotency_key text not null unique
    check (idempotency_key ~ '^[a-f0-9]{64}$'),
  public_proof_id text not null
    references public.velmere_verify_publication_identities(public_proof_id),
  publication_version bigint not null check (publication_version >= 1),
  audit_version integer not null check (audit_version >= 1),
  previous_event_digest text
    references public.velmere_verify_publication_events(event_digest),
  event_kind text not null check (event_kind in (
    'INITIAL_VERIFICATION',
    'MONITOR_CHECK',
    'MONITORING_FAILURE',
    'REVALIDATION_REQUIRED',
    'REVALIDATION_STARTED',
    'REVALIDATION_COMPLETED',
    'VISIBILITY_CHANGED'
  )),
  current_status text not null check (current_status in (
    'VERIFIED',
    'CHANGE_DETECTED',
    'REVALIDATION_REQUIRED',
    'REVALIDATING',
    'VERIFIED_AGAIN',
    'MONITORING_UNAVAILABLE'
  )),
  visibility text not null check (visibility in (
    'PUBLIC',
    'PUBLIC_SUMMARY_PRIVATE_REPORT',
    'PRIVATE'
  )),
  project_name text check (
    project_name is null
    or (length(btrim(project_name)) between 2 and 120
      and project_name = btrim(project_name)
      and project_name !~ '[[:cntrl:]]')
  ),
  report_title text not null check (
    length(btrim(report_title)) between 4 and 160
    and report_title = btrim(report_title)
    and report_title !~ '[[:cntrl:]]'
  ),
  public_summary text not null check (
    length(btrim(public_summary)) between 8 and 600
    and public_summary = btrim(public_summary)
    and public_summary !~ '[[:cntrl:]]'
  ),
  risk_status text not null check (risk_status in (
    'LOW_DETECTED_RISK',
    'ELEVATED_RISK',
    'HIGH_RISK',
    'CRITICAL_RISK',
    'INSUFFICIENT_EVIDENCE',
    'WITHHELD'
  )),
  report_digest text not null check (report_digest ~ '^[a-f0-9]{64}$'),
  current_deployment_digest text not null
    check (current_deployment_digest ~ '^[a-f0-9]{64}$'),
  audited_deployment_digest text not null
    check (audited_deployment_digest ~ '^[a-f0-9]{64}$'),
  verification_receipt_digest text not null
    check (verification_receipt_digest ~ '^[a-f0-9]{64}$'),
  actor_digest text not null check (actor_digest ~ '^[a-f0-9]{64}$'),
  checked_block_number text not null
    check (checked_block_number ~ '^(0|[1-9][0-9]{0,77})$'),
  checked_block_hash text not null
    check (checked_block_hash ~ '^0x[a-f0-9]{64}$'),
  checked_at timestamptz not null,
  monitor_due_at timestamptz not null,
  event_at timestamptz not null default clock_timestamp(),
  status_changed_at timestamptz not null check (status_changed_at <= event_at),
  unique (public_proof_id, publication_version),
  check (
    (publication_version = 1 and previous_event_digest is null and event_kind = 'INITIAL_VERIFICATION')
    or (publication_version > 1 and previous_event_digest is not null and event_kind <> 'INITIAL_VERIFICATION')
  ),
  check (monitor_due_at >= checked_at)
);

create index if not exists velmere_verify_publication_events_latest_idx
  on public.velmere_verify_publication_events(public_proof_id, publication_version desc);
create index if not exists velmere_verify_publication_events_project_idx
  on public.velmere_verify_publication_events(lower(project_name), public_proof_id, publication_version desc)
  where project_name is not null;
create index if not exists velmere_verify_publication_events_status_idx
  on public.velmere_verify_publication_events(current_status, monitor_due_at);

alter table public.velmere_verify_publication_identities enable row level security;
alter table public.velmere_verify_publication_events enable row level security;

revoke all on table public.velmere_verify_publication_identities
  from public, anon, authenticated, service_role;
revoke all on table public.velmere_verify_publication_events
  from public, anon, authenticated, service_role;

create or replace function public.velmere_reject_verify_publication_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  raise exception 'verify_publication_event_immutable' using errcode = '55000';
end;
$$;

revoke all on function public.velmere_reject_verify_publication_mutation_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists reject_verify_publication_identity_mutation
  on public.velmere_verify_publication_identities;
create trigger reject_verify_publication_identity_mutation
before update or delete on public.velmere_verify_publication_identities
for each row execute function public.velmere_reject_verify_publication_mutation_v1();

drop trigger if exists reject_verify_publication_event_mutation
  on public.velmere_verify_publication_events;
create trigger reject_verify_publication_event_mutation
before update or delete on public.velmere_verify_publication_events
for each row execute function public.velmere_reject_verify_publication_mutation_v1();

-- R7 initial-producer dependency bridge: 00005 must be independently executable
-- with 00003 and must not depend on later monitor-worker migration 00007.
create or replace function public.velmere_verify_next_daily_monitor_window_end_v1(
  p_observed_at timestamptz
) returns timestamptz
language plpgsql
immutable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_observed_utc timestamp without time zone;
  v_window_start_utc timestamp without time zone;
  v_window_end_utc timestamp without time zone;
begin
  if p_observed_at is null then
    raise exception 'verify_monitor_observed_at_invalid' using errcode = '22023';
  end if;
  v_observed_utc := p_observed_at at time zone 'UTC';
  v_window_start_utc := date_trunc('day', v_observed_utc) + interval '3 hours';
  v_window_end_utc := case
    when v_observed_utc < v_window_start_utc
      then v_window_start_utc + interval '59 minutes'
    else v_window_start_utc + interval '1 day 59 minutes'
  end;
  return v_window_end_utc at time zone 'UTC';
end;
$$;

revoke all on function public.velmere_verify_next_daily_monitor_window_end_v1(timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_verify_next_daily_monitor_window_end_v1(timestamptz)
  to service_role;

create table if not exists public.velmere_verify_deployment_identity_bindings (
  public_proof_id text primary key
    references public.velmere_verify_publication_identities(public_proof_id),
  initial_event_digest text not null unique
    references public.velmere_verify_publication_events(event_digest),
  identity_schema_version text not null
    check (identity_schema_version = 'velmere.verify-canonical-deployment-identity.v1'),
  deployment_identity_digest text not null
    check (deployment_identity_digest ~ '^[a-f0-9]{64}$'),
  provenance_receipt_digest text not null
    check (provenance_receipt_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default clock_timestamp()
);

alter table public.velmere_verify_deployment_identity_bindings enable row level security;
revoke all on table public.velmere_verify_deployment_identity_bindings
  from public, anon, authenticated, service_role;

create or replace function public.velmere_validate_verify_deployment_identity_binding_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_initial public.velmere_verify_publication_events%rowtype;
begin
  select * into v_initial
  from public.velmere_verify_publication_events e
  where e.event_digest = new.initial_event_digest;
  if not found
     or v_initial.public_proof_id <> new.public_proof_id
     or v_initial.publication_version <> 1
     or v_initial.event_kind <> 'INITIAL_VERIFICATION'
     or v_initial.audited_deployment_digest <> new.deployment_identity_digest
     or v_initial.current_deployment_digest <> new.deployment_identity_digest then
    raise exception 'verify_deployment_identity_binding_invalid' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.velmere_reject_verify_deployment_identity_binding_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  raise exception 'verify_deployment_identity_binding_immutable' using errcode = '55000';
end;
$$;

revoke all on function public.velmere_validate_verify_deployment_identity_binding_v1()
  from public, anon, authenticated, service_role;
revoke all on function public.velmere_reject_verify_deployment_identity_binding_mutation_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists validate_verify_deployment_identity_binding
  on public.velmere_verify_deployment_identity_bindings;
create trigger validate_verify_deployment_identity_binding
before insert on public.velmere_verify_deployment_identity_bindings
for each row execute function public.velmere_validate_verify_deployment_identity_binding_v1();
drop trigger if exists reject_verify_deployment_identity_binding_mutation
  on public.velmere_verify_deployment_identity_bindings;
create trigger reject_verify_deployment_identity_binding_mutation
before update or delete on public.velmere_verify_deployment_identity_bindings
for each row execute function public.velmere_reject_verify_deployment_identity_binding_mutation_v1();



create or replace function public.velmere_build_verify_public_projection_v1(
  p_public_proof_id text,
  p_now timestamptz default statement_timestamp()
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_identity public.velmere_verify_publication_identities%rowtype;
  v_event public.velmere_verify_publication_events%rowtype;
  v_effective_status text;
  v_effective_risk_status text;
begin
  if p_public_proof_id is null
     or p_public_proof_id !~ '^pubidx-[a-f0-9]{48}$'
     or p_now is null then
    return null;
  end if;

  select i.* into v_identity
  from public.velmere_verify_publication_identities i
  where i.public_proof_id = p_public_proof_id;
  if not found then return null; end if;

  select e.* into v_event
  from public.velmere_verify_publication_events e
  where e.public_proof_id = p_public_proof_id
  order by e.publication_version desc
  limit 1;
  if not found or v_event.visibility = 'PRIVATE' then return null; end if;

  v_effective_status := case
    when v_event.current_status in ('VERIFIED', 'VERIFIED_AGAIN')
         and v_event.monitor_due_at <= p_now
      then 'MONITORING_UNAVAILABLE'
    else v_event.current_status
  end;
  v_effective_risk_status := case
    when v_effective_status in ('VERIFIED', 'VERIFIED_AGAIN') then v_event.risk_status
    else 'WITHHELD'
  end;

  return jsonb_build_object(
    'schemaVersion', 'velmere.verify-public-projection.v1',
    'publicProofId', v_identity.public_proof_id,
    'visibility', v_event.visibility,
    'currentStatus', v_effective_status,
    'riskStatus', v_effective_risk_status,
    'chainId', v_identity.chain_id,
    'contractAddress', v_identity.contract_address,
    'projectName', v_event.project_name,
    'reportTitle', v_event.report_title,
    'publicSummary', v_event.public_summary,
    'auditVersion', v_event.audit_version,
    'publicationVersion', v_event.publication_version,
    'reportDigest', case
      when v_event.visibility = 'PUBLIC'
           and v_effective_status in ('VERIFIED', 'VERIFIED_AGAIN')
        then v_event.report_digest
      else null
    end,
    'currentDeploymentDigest', v_event.current_deployment_digest,
    'lastCheckedAt', v_event.checked_at,
    'monitorDueAt', v_event.monitor_due_at,
    'statusChangedAt', case
      when v_event.current_status in ('VERIFIED', 'VERIFIED_AGAIN')
           and v_event.monitor_due_at <= p_now
        then v_event.monitor_due_at
      else v_event.status_changed_at
    end,
    'historyVisibility', case when v_event.visibility = 'PUBLIC' then 'PUBLIC' else 'PRIVATE' end,
    'headEventDigest', v_event.event_digest,
    'canonicalPath', '/proof/market-integrity/' || v_identity.public_proof_id,
    'materialChangeDetected', v_effective_status in ('CHANGE_DETECTED', 'REVALIDATION_REQUIRED', 'REVALIDATING'),
    'monitoringCurrent', v_effective_status in ('VERIFIED', 'VERIFIED_AGAIN'),
    'reportCurrent', v_effective_status in ('VERIFIED', 'VERIFIED_AGAIN')
  );
end;
$$;

revoke all on function public.velmere_build_verify_public_projection_v1(text, timestamptz)
  from public, anon, authenticated, service_role;

create or replace function public.velmere_append_verify_publication_event_v1(
  p_idempotency_key text,
  p_public_proof_id text,
  p_chain_id text,
  p_contract_address text,
  p_event_kind text,
  p_visibility text,
  p_project_name text,
  p_report_title text,
  p_public_summary text,
  p_risk_status text,
  p_report_digest text,
  p_deployment_digest text,
  p_verification_receipt_digest text,
  p_actor_digest text,
  p_checked_block_number text,
  p_checked_block_hash text,
  p_checked_at timestamptz,
  p_monitoring_ttl_seconds integer,
  p_expected_previous_event_digest text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_identity public.velmere_verify_publication_identities%rowtype;
  v_identity_owner text;
  v_latest public.velmere_verify_publication_events%rowtype;
  v_existing public.velmere_verify_publication_events%rowtype;
  v_now timestamptz := clock_timestamp();
  v_request_digest text;
  v_identity_digest text;
  v_event_digest text;
  v_publication_version bigint;
  v_audit_version integer;
  v_status text;
  v_visibility text;
  v_project_name text;
  v_report_title text;
  v_public_summary text;
  v_risk_status text;
  v_report_digest text;
  v_current_deployment_digest text;
  v_audited_deployment_digest text;
  v_verification_receipt_digest text;
  v_checked_block_number text;
  v_checked_block_hash text;
  v_checked_at timestamptz;
  v_monitor_due_at timestamptz;
  v_status_changed_at timestamptz;
begin
  if p_idempotency_key is null or p_idempotency_key !~ '^[a-f0-9]{64}$' then
    raise exception 'verify_idempotency_key_invalid' using errcode = '22023';
  end if;
  if p_public_proof_id is null
     or p_public_proof_id !~ '^pubidx-[a-f0-9]{48}$' then
    raise exception 'verify_public_proof_id_invalid' using errcode = '22023';
  end if;
  if p_chain_id is null or p_chain_id !~ '^[1-9][0-9]{0,19}$' then
    raise exception 'verify_chain_id_invalid' using errcode = '22023';
  end if;
  if p_contract_address is null or p_contract_address !~ '^0x[a-f0-9]{40}$' then
    raise exception 'verify_contract_address_not_canonical' using errcode = '22023';
  end if;
  if p_event_kind is null or p_event_kind not in (
    'INITIAL_VERIFICATION', 'MONITOR_CHECK', 'MONITORING_FAILURE',
    'REVALIDATION_REQUIRED', 'REVALIDATION_STARTED',
    'REVALIDATION_COMPLETED', 'VISIBILITY_CHANGED'
  ) then
    raise exception 'verify_event_kind_invalid' using errcode = '22023';
  end if;
  if p_visibility is null or p_visibility not in (
    'PUBLIC', 'PUBLIC_SUMMARY_PRIVATE_REPORT', 'PRIVATE'
  ) then
    raise exception 'verify_visibility_invalid' using errcode = '22023';
  end if;
  if p_actor_digest is null or p_actor_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'verify_actor_digest_invalid' using errcode = '22023';
  end if;
  if p_verification_receipt_digest is null
     or p_verification_receipt_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'verify_receipt_digest_invalid' using errcode = '22023';
  end if;
  if p_expected_previous_event_digest is not null
     and p_expected_previous_event_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'verify_previous_event_digest_invalid' using errcode = '22023';
  end if;

  v_request_digest := encode(digest(concat_ws(E'\x1f',
    p_public_proof_id, p_chain_id, p_contract_address, p_event_kind,
    p_visibility, coalesce(p_project_name, ''), coalesce(p_report_title, ''),
    coalesce(p_public_summary, ''), coalesce(p_risk_status, ''),
    coalesce(p_report_digest, ''), coalesce(p_deployment_digest, ''),
    p_verification_receipt_digest, p_actor_digest,
    coalesce(p_checked_block_number, ''), coalesce(p_checked_block_hash, ''),
    coalesce(p_checked_at::text, ''), coalesce(p_monitoring_ttl_seconds::text, ''),
    coalesce(p_expected_previous_event_digest, '')
  ), 'sha256'), 'hex');

  select e.* into v_existing
  from public.velmere_verify_publication_events e
  where e.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_digest <> v_request_digest
       or v_existing.public_proof_id <> p_public_proof_id then
      raise exception 'verify_idempotency_conflict' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'schemaVersion', 'velmere.verify-publication-append-receipt.v1',
      'publicProofId', v_existing.public_proof_id,
      'publicationVersion', v_existing.publication_version,
      'auditVersion', v_existing.audit_version,
      'currentStatus', v_existing.current_status,
      'visibility', v_existing.visibility,
      'eventDigest', v_existing.event_digest,
      'previousEventDigest', v_existing.previous_event_digest,
      'idempotent', true,
      'eventAt', v_existing.event_at
    );
  end if;

  perform pg_advisory_xact_lock(hashtext(
    'velmere_verify_idempotency:' || p_idempotency_key
  ));
  perform pg_advisory_xact_lock(hashtext(
    'velmere_verify_identity:' || p_chain_id || ':' || p_contract_address
  ));
  perform pg_advisory_xact_lock(hashtext(
    'velmere_verify_public_proof:' || p_public_proof_id
  ));

  -- A concurrent retry can pass the optimistic lookup above while the first
  -- transaction is still pending. Re-read under the identity/proof locks so
  -- the loser receives the same durable receipt instead of a unique-key error.
  select e.* into v_existing
  from public.velmere_verify_publication_events e
  where e.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_digest <> v_request_digest
       or v_existing.public_proof_id <> p_public_proof_id then
      raise exception 'verify_idempotency_conflict' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'schemaVersion', 'velmere.verify-publication-append-receipt.v1',
      'publicProofId', v_existing.public_proof_id,
      'publicationVersion', v_existing.publication_version,
      'auditVersion', v_existing.audit_version,
      'currentStatus', v_existing.current_status,
      'visibility', v_existing.visibility,
      'eventDigest', v_existing.event_digest,
      'previousEventDigest', v_existing.previous_event_digest,
      'idempotent', true,
      'eventAt', v_existing.event_at
    );
  end if;

  v_identity_digest := encode(digest(
    p_chain_id || E'\x1f' || p_contract_address,
    'sha256'
  ), 'hex');

  select i.* into v_identity
  from public.velmere_verify_publication_identities i
  where i.public_proof_id = p_public_proof_id;

  if not found then
    if p_event_kind <> 'INITIAL_VERIFICATION' then
      raise exception 'verify_identity_missing' using errcode = '23503';
    end if;
    select i.public_proof_id into v_identity_owner
    from public.velmere_verify_publication_identities i
    where i.chain_id = p_chain_id and i.contract_address = p_contract_address;
    if found and v_identity_owner <> p_public_proof_id then
      raise exception 'verify_wrong_chain_address_collision' using errcode = '23505';
    end if;
    insert into public.velmere_verify_publication_identities(
      public_proof_id, chain_id, contract_address, identity_digest, created_at
    ) values (
      p_public_proof_id, p_chain_id, p_contract_address, v_identity_digest, v_now
    );
  elsif v_identity.chain_id <> p_chain_id
        or v_identity.contract_address <> p_contract_address
        or v_identity.identity_digest <> v_identity_digest then
    raise exception 'verify_identity_mismatch' using errcode = '23514';
  end if;

  select e.* into v_latest
  from public.velmere_verify_publication_events e
  where e.public_proof_id = p_public_proof_id
  order by e.publication_version desc
  limit 1;

  if not found then
    if p_event_kind <> 'INITIAL_VERIFICATION'
       or p_expected_previous_event_digest is not null then
      raise exception 'verify_initial_transition_invalid' using errcode = '23514';
    end if;
    v_publication_version := 1;
    v_audit_version := 1;
  else
    if p_event_kind = 'INITIAL_VERIFICATION'
       or p_expected_previous_event_digest is null
       or p_expected_previous_event_digest <> v_latest.event_digest then
      raise exception 'verify_status_replay_or_chain_conflict' using errcode = '40001';
    end if;
    v_publication_version := v_latest.publication_version + 1;
    v_audit_version := v_latest.audit_version;
    if p_event_kind <> 'VISIBILITY_CHANGED' and p_visibility <> v_latest.visibility then
      raise exception 'verify_visibility_requires_explicit_event' using errcode = '23514';
    end if;
  end if;

  if p_event_kind in ('INITIAL_VERIFICATION', 'REVALIDATION_COMPLETED') then
    if p_project_name is not null and (
      length(btrim(p_project_name)) not between 2 and 120
      or p_project_name <> btrim(p_project_name)
    ) then
      raise exception 'verify_project_name_invalid' using errcode = '22023';
    end if;
    if p_report_title is null
       or length(btrim(p_report_title)) not between 4 and 160
       or p_report_title <> btrim(p_report_title) then
      raise exception 'verify_report_title_invalid' using errcode = '22023';
    end if;
    if p_public_summary is null
       or length(btrim(p_public_summary)) not between 8 and 600
       or p_public_summary <> btrim(p_public_summary) then
      raise exception 'verify_public_summary_invalid' using errcode = '22023';
    end if;
    if p_risk_status is null or p_risk_status not in (
      'LOW_DETECTED_RISK', 'ELEVATED_RISK', 'HIGH_RISK', 'CRITICAL_RISK',
      'INSUFFICIENT_EVIDENCE', 'WITHHELD'
    ) then
      raise exception 'verify_risk_status_invalid' using errcode = '22023';
    end if;
    if p_report_digest is null or p_report_digest !~ '^[a-f0-9]{64}$' then
      raise exception 'verify_report_digest_invalid' using errcode = '22023';
    end if;
    v_project_name := p_project_name;
    v_report_title := p_report_title;
    v_public_summary := p_public_summary;
    v_risk_status := p_risk_status;
    v_report_digest := p_report_digest;
  else
    if p_project_name is not null or p_report_title is not null
       or p_public_summary is not null or p_risk_status is not null
       or p_report_digest is not null then
      raise exception 'verify_non_report_event_contains_report_fields' using errcode = '22023';
    end if;
    v_project_name := v_latest.project_name;
    v_report_title := v_latest.report_title;
    v_public_summary := v_latest.public_summary;
    v_risk_status := v_latest.risk_status;
    v_report_digest := v_latest.report_digest;
  end if;

  if p_event_kind = 'VISIBILITY_CHANGED' then
    if p_visibility = v_latest.visibility
       or p_deployment_digest is not null
       or p_checked_block_number is not null
       or p_checked_block_hash is not null
       or p_checked_at is not null
       or p_monitoring_ttl_seconds is not null then
      raise exception 'verify_visibility_transition_invalid' using errcode = '22023';
    end if;
    v_current_deployment_digest := v_latest.current_deployment_digest;
    v_audited_deployment_digest := v_latest.audited_deployment_digest;
    v_checked_block_number := v_latest.checked_block_number;
    v_checked_block_hash := v_latest.checked_block_hash;
    v_checked_at := v_latest.checked_at;
    v_monitor_due_at := v_latest.monitor_due_at;
  elsif p_event_kind = 'MONITORING_FAILURE' then
    if p_deployment_digest is not null
       or p_checked_block_number is not null
       or p_checked_block_hash is not null
       or p_monitoring_ttl_seconds is not null
       or p_checked_at is null
       or p_checked_at < v_now - interval '5 minutes'
       or p_checked_at > v_now + interval '1 minute' then
      raise exception 'verify_monitoring_failure_observation_invalid' using errcode = '22023';
    end if;
    v_current_deployment_digest := v_latest.current_deployment_digest;
    v_audited_deployment_digest := v_latest.audited_deployment_digest;
    v_checked_block_number := v_latest.checked_block_number;
    v_checked_block_hash := v_latest.checked_block_hash;
    v_checked_at := p_checked_at;
    v_monitor_due_at := p_checked_at;
  else
    if p_deployment_digest is null or p_deployment_digest !~ '^[a-f0-9]{64}$'
       or p_checked_block_number is null
       or p_checked_block_number !~ '^(0|[1-9][0-9]{0,77})$'
       or p_checked_block_hash is null
       or p_checked_block_hash !~ '^0x[a-f0-9]{64}$'
       or p_checked_at is null
       or p_checked_at < v_now - interval '5 minutes'
       or p_checked_at > v_now + interval '1 minute' then
      raise exception 'verify_current_deployment_observation_invalid' using errcode = '22023';
    end if;
    v_current_deployment_digest := p_deployment_digest;
    v_audited_deployment_digest := case
      when p_event_kind in ('INITIAL_VERIFICATION', 'REVALIDATION_COMPLETED')
        then p_deployment_digest
      else v_latest.audited_deployment_digest
    end;
    v_checked_block_number := p_checked_block_number;
    v_checked_block_hash := p_checked_block_hash;
    v_checked_at := p_checked_at;
    if p_event_kind in ('INITIAL_VERIFICATION', 'MONITOR_CHECK', 'REVALIDATION_COMPLETED') then
      if p_monitoring_ttl_seconds is null or p_monitoring_ttl_seconds not between 300 and 89940 then
        raise exception 'verify_monitoring_ttl_invalid' using errcode = '22023';
      end if;
      v_monitor_due_at := p_checked_at + make_interval(secs => p_monitoring_ttl_seconds);
    else
      if p_monitoring_ttl_seconds is not null then
        raise exception 'verify_non_monitor_event_ttl_invalid' using errcode = '22023';
      end if;
      v_monitor_due_at := greatest(v_latest.monitor_due_at, p_checked_at);
    end if;
  end if;

  -- A later publication event may not rewind the observation clock or the
  -- canonical block height. Visibility-only and monitoring-failure events
  -- inherit the last block, so the same invariant safely covers every
  -- non-initial transition without treating an idempotent retry as a new row.
  if v_latest.public_proof_id is not null and (
    v_checked_at < v_latest.checked_at
    or v_checked_block_number::numeric < v_latest.checked_block_number::numeric
  ) then
    raise exception 'verify_observation_regression' using errcode = '23514';
  end if;

  v_visibility := p_visibility;
  v_verification_receipt_digest := p_verification_receipt_digest;

  if p_event_kind = 'INITIAL_VERIFICATION' then
    v_status := 'VERIFIED';
  elsif p_event_kind = 'MONITOR_CHECK' then
    if v_current_deployment_digest <> v_latest.audited_deployment_digest then
      v_status := 'CHANGE_DETECTED';
    elsif v_latest.current_status in ('VERIFIED', 'VERIFIED_AGAIN') then
      v_status := v_latest.current_status;
    elsif v_latest.current_status = 'MONITORING_UNAVAILABLE' then
      v_status := 'VERIFIED_AGAIN';
    else
      v_status := 'REVALIDATION_REQUIRED';
    end if;
  elsif p_event_kind = 'MONITORING_FAILURE' then
    v_status := 'MONITORING_UNAVAILABLE';
  elsif p_event_kind = 'REVALIDATION_REQUIRED' then
    if v_latest.current_status not in ('CHANGE_DETECTED', 'MONITORING_UNAVAILABLE') then
      raise exception 'verify_revalidation_required_transition_invalid' using errcode = '23514';
    end if;
    v_status := 'REVALIDATION_REQUIRED';
  elsif p_event_kind = 'REVALIDATION_STARTED' then
    if v_latest.current_status not in ('CHANGE_DETECTED', 'REVALIDATION_REQUIRED') then
      raise exception 'verify_revalidation_started_transition_invalid' using errcode = '23514';
    end if;
    v_status := 'REVALIDATING';
  elsif p_event_kind = 'REVALIDATION_COMPLETED' then
    if v_latest.current_status not in (
      'CHANGE_DETECTED', 'REVALIDATION_REQUIRED', 'REVALIDATING', 'MONITORING_UNAVAILABLE'
    ) or p_report_digest = v_latest.report_digest then
      raise exception 'verify_revalidation_completed_transition_invalid' using errcode = '23514';
    end if;
    v_status := 'VERIFIED_AGAIN';
    v_audit_version := v_latest.audit_version + 1;
  elsif p_event_kind = 'VISIBILITY_CHANGED' then
    v_status := v_latest.current_status;
  else
    raise exception 'verify_transition_unreachable' using errcode = '23514';
  end if;

  v_status_changed_at := case
    when p_event_kind = 'INITIAL_VERIFICATION' then v_now
    when v_status <> v_latest.current_status then v_now
    else v_latest.status_changed_at
  end;

  v_event_digest := encode(digest(concat_ws(E'\x1f',
    p_public_proof_id, v_publication_version::text, v_audit_version::text,
    coalesce(p_expected_previous_event_digest, ''), p_event_kind, v_status,
    v_visibility, coalesce(v_project_name, ''), v_report_title,
    v_public_summary, v_risk_status, v_report_digest,
    v_current_deployment_digest, v_audited_deployment_digest,
    v_verification_receipt_digest, p_actor_digest,
    v_checked_block_number, v_checked_block_hash, v_checked_at::text,
    v_monitor_due_at::text, v_now::text, v_status_changed_at::text,
    v_request_digest
  ), 'sha256'), 'hex');

  insert into public.velmere_verify_publication_events(
    event_digest, request_digest, idempotency_key, public_proof_id,
    publication_version, audit_version, previous_event_digest, event_kind,
    current_status, visibility, project_name, report_title, public_summary,
    risk_status, report_digest, current_deployment_digest,
    audited_deployment_digest, verification_receipt_digest, actor_digest,
    checked_block_number, checked_block_hash, checked_at, monitor_due_at, event_at,
    status_changed_at
  ) values (
    v_event_digest, v_request_digest, p_idempotency_key, p_public_proof_id,
    v_publication_version, v_audit_version, p_expected_previous_event_digest,
    p_event_kind, v_status, v_visibility, v_project_name, v_report_title,
    v_public_summary, v_risk_status, v_report_digest,
    v_current_deployment_digest, v_audited_deployment_digest,
    v_verification_receipt_digest, p_actor_digest, v_checked_block_number,
    v_checked_block_hash, v_checked_at, v_monitor_due_at, v_now,
    v_status_changed_at
  );

  return jsonb_build_object(
    'schemaVersion', 'velmere.verify-publication-append-receipt.v1',
    'publicProofId', p_public_proof_id,
    'publicationVersion', v_publication_version,
    'auditVersion', v_audit_version,
    'currentStatus', v_status,
    'visibility', v_visibility,
    'eventDigest', v_event_digest,
    'previousEventDigest', p_expected_previous_event_digest,
    'idempotent', false,
    'eventAt', v_now
  );
end;
$$;

create or replace function public.velmere_resolve_verify_publication_exact_v1(
  p_public_proof_id text
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  return public.velmere_build_verify_public_projection_v1(
    p_public_proof_id,
    statement_timestamp()
  );
end;
$$;

create or replace function public.velmere_search_verify_publications_v1(
  p_chain_id text default null,
  p_contract_address text default null,
  p_project_name text default null,
  p_limit integer default 5
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if p_limit is null or p_limit not between 1 and 10 then
    raise exception 'verify_search_limit_invalid' using errcode = '22023';
  end if;

  if p_chain_id is not null or p_contract_address is not null then
    if p_chain_id is null or p_chain_id !~ '^[1-9][0-9]{0,19}$'
       or p_contract_address is null or p_contract_address !~ '^0x[a-f0-9]{40}$'
       or p_project_name is not null then
      raise exception 'verify_search_identity_invalid' using errcode = '22023';
    end if;
    select coalesce(jsonb_agg(projection), '[]'::jsonb) into v_result
    from (
      select public.velmere_build_verify_public_projection_v1(i.public_proof_id, statement_timestamp()) as projection
      from public.velmere_verify_publication_identities i
      where i.chain_id = p_chain_id and i.contract_address = p_contract_address
      limit 1
    ) q
    where projection is not null;
  else
    if p_project_name is null
       or length(btrim(p_project_name)) not between 2 and 120
       or p_project_name <> btrim(p_project_name) then
      raise exception 'verify_search_project_name_invalid' using errcode = '22023';
    end if;
    select coalesce(jsonb_agg(projection order by public_proof_id), '[]'::jsonb) into v_result
    from (
      select e.public_proof_id,
        public.velmere_build_verify_public_projection_v1(e.public_proof_id, statement_timestamp()) as projection
      from public.velmere_verify_publication_events e
      where e.publication_version = (
        select max(e2.publication_version)
        from public.velmere_verify_publication_events e2
        where e2.public_proof_id = e.public_proof_id
      )
        and e.visibility <> 'PRIVATE'
        and lower(e.project_name) = lower(p_project_name)
      order by e.public_proof_id
      limit p_limit
    ) q
    where projection is not null;
  end if;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

create or replace function public.velmere_get_verify_publication_history_v1(
  p_public_proof_id text,
  p_limit integer default 50
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_projection jsonb;
  v_history jsonb;
  v_history_visibility text;
begin
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'verify_history_limit_invalid' using errcode = '22023';
  end if;
  v_projection := public.velmere_build_verify_public_projection_v1(
    p_public_proof_id,
    statement_timestamp()
  );
  if v_projection is null then return '[]'::jsonb; end if;

  v_history_visibility := v_projection->>'historyVisibility';
  select coalesce(jsonb_agg(entry order by publication_version desc), '[]'::jsonb)
  into v_history
  from (
    select e.publication_version,
      jsonb_build_object(
        'schemaVersion', 'velmere.verify-public-history-entry.v1',
        'publicProofId', e.public_proof_id,
        'publicationVersion', e.publication_version,
        'auditVersion', e.audit_version,
        'eventKind', e.event_kind,
        'status', e.current_status,
        'riskStatus', case
          when e.current_status in ('VERIFIED', 'VERIFIED_AGAIN') then e.risk_status
          else 'WITHHELD'
        end,
        'reportDigest', case
          when v_history_visibility = 'PUBLIC' and e.visibility = 'PUBLIC'
            then e.report_digest
          else null
        end,
        'currentDeploymentDigest', e.current_deployment_digest,
        'checkedBlockNumber', e.checked_block_number,
        'checkedBlockHash', e.checked_block_hash,
        'checkedAt', e.checked_at,
        'monitorDueAt', e.monitor_due_at,
        'eventAt', e.event_at,
        'eventDigest', e.event_digest,
        'previousEventDigest', e.previous_event_digest,
        'historicalReportVisibility', case
          when v_history_visibility = 'PUBLIC' and e.visibility = 'PUBLIC'
            then 'PUBLIC'
          else 'PRIVATE'
        end
      ) as entry
    from public.velmere_verify_publication_events e
    where e.public_proof_id = p_public_proof_id
    order by e.publication_version desc
    limit p_limit
  ) q;

  return coalesce(v_history, '[]'::jsonb);
end;
$$;

revoke all on function public.velmere_append_verify_publication_event_v1(
  text, text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, timestamptz, integer, text
) from public, anon, authenticated, service_role;
revoke all on function public.velmere_resolve_verify_publication_exact_v1(text)
  from public, anon, authenticated, service_role;
revoke all on function public.velmere_search_verify_publications_v1(text, text, text, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.velmere_get_verify_publication_history_v1(text, integer)
  from public, anon, authenticated, service_role;

grant execute on function public.velmere_append_verify_publication_event_v1(
  text, text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, timestamptz, integer, text
) to service_role;
grant execute on function public.velmere_resolve_verify_publication_exact_v1(text)
  to service_role;
grant execute on function public.velmere_search_verify_publications_v1(text, text, text, integer)
  to service_role;
grant execute on function public.velmere_get_verify_publication_history_v1(text, integer)
  to service_role;

comment on table public.velmere_verify_publication_identities is
  'V4 immutable canonical chain-id plus contract-address registry. One identity can have exactly one public proof id.';
comment on table public.velmere_verify_publication_events is
  'V4 append-only Verify publication, revalidation and monitoring history. Current truth is always the highest chained publication version.';
comment on function public.velmere_append_verify_publication_event_v1(
  text, text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, timestamptz, integer, text
) is 'V4 service-role-only append transaction. Derives status, rejects stale previous-event replay, and binds every green status to a fresh exact deployment observation.';
comment on function public.velmere_resolve_verify_publication_exact_v1(text) is
  'V4 service-role-only exact redacted public projection. Unknown and PRIVATE identities both return null; expired green monitoring resolves as MONITORING_UNAVAILABLE.';
comment on function public.velmere_search_verify_publications_v1(text, text, text, integer) is
  'V4 bounded public search projection: exact chain plus canonical address, or exact public project name. PRIVATE identities are never returned.';
comment on function public.velmere_get_verify_publication_history_v1(text, integer) is
  'V4 bounded versioned public history. PUBLIC_SUMMARY_PRIVATE_REPORT hides historical report digests; PRIVATE and unknown both return an empty array.';

commit;
