begin;

-- V4 Verify continuous monitoring. This is mutable worker-control state only;
-- customer/public truth remains the append-only publication event chain.
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

-- A daily 03:00 UTC trigger may arrive anywhere in the documented 59-minute
-- delivery window. A successful observation remains current only through the
-- end of the next physically reachable window; it is never extended by a
-- generic 24-hour TTL that can skip an arbitrary publication phase.
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

create table if not exists public.velmere_verify_monitor_jobs (
  job_id uuid primary key default gen_random_uuid(),
  public_proof_id text not null unique
    references public.velmere_verify_publication_identities(public_proof_id),
  expected_event_digest text not null
    references public.velmere_verify_publication_events(event_digest),
  due_at timestamptz,
  state text not null check (
    state in ('queued', 'processing', 'awaiting_revalidation', 'dead_letter')
  ),
  attempt_count integer not null default 0 check (attempt_count between 0 and 1000000),
  lease_generation bigint not null default 0 check (lease_generation >= 0),
  lease_token_digest text check (
    lease_token_digest is null or lease_token_digest ~ '^[a-f0-9]{64}$'
  ),
  lease_expires_at timestamptz,
  claimed_at timestamptz,
  last_failure_code text check (
    last_failure_code is null or last_failure_code ~ '^[a-z0-9_]{3,80}$'
  ),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (
    (state = 'processing' and lease_token_digest is not null
      and lease_expires_at is not null and claimed_at is not null)
    or
    (state <> 'processing' and lease_token_digest is null
      and lease_expires_at is null and claimed_at is null)
  ),
  check (
    (state in ('awaiting_revalidation', 'dead_letter') and due_at is null)
    or (state not in ('awaiting_revalidation', 'dead_letter') and due_at is not null)
  )
);

create index if not exists velmere_verify_monitor_jobs_due_idx
  on public.velmere_verify_monitor_jobs(state, due_at, job_id);
create index if not exists velmere_verify_monitor_jobs_lease_idx
  on public.velmere_verify_monitor_jobs(lease_expires_at)
  where state = 'processing';

alter table public.velmere_verify_monitor_jobs enable row level security;
revoke all on table public.velmere_verify_monitor_jobs
  from public, anon, authenticated, service_role;

create or replace function public.velmere_schedule_verify_monitor_job_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_state text;
  v_due_at timestamptz;
  v_identity_bound boolean;
begin
  select exists (
    select 1 from public.velmere_verify_deployment_identity_bindings b
    where b.public_proof_id = new.public_proof_id
      and b.deployment_identity_digest = new.audited_deployment_digest
      and b.identity_schema_version = 'velmere.verify-canonical-deployment-identity.v1'
  ) into v_identity_bound;
  v_state := case
    when v_identity_bound
      and new.current_status in ('VERIFIED', 'VERIFIED_AGAIN', 'MONITORING_UNAVAILABLE')
      then 'queued'
    else 'awaiting_revalidation'
  end;
  v_due_at := case
    when not v_identity_bound then null
    when new.current_status in ('VERIFIED', 'VERIFIED_AGAIN') then new.monitor_due_at
    when new.current_status = 'MONITORING_UNAVAILABLE'
      then greatest(new.monitor_due_at, new.event_at + interval '5 minutes')
    else null
  end;

  insert into public.velmere_verify_monitor_jobs(
    public_proof_id, expected_event_digest, due_at, state, updated_at
  ) values (
    new.public_proof_id, new.event_digest, v_due_at, v_state, new.event_at
  )
  on conflict on constraint velmere_verify_monitor_jobs_public_proof_id_key do update set
    expected_event_digest = excluded.expected_event_digest,
    due_at = excluded.due_at,
    state = excluded.state,
    lease_token_digest = null,
    lease_expires_at = null,
    claimed_at = null,
    attempt_count = 0,
    last_failure_code = null,
    updated_at = excluded.updated_at
  where public.velmere_verify_monitor_jobs.state <> 'processing';
  return null;
end;
$$;

revoke all on function public.velmere_schedule_verify_monitor_job_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists schedule_verify_monitor_job_after_event
  on public.velmere_verify_publication_events;
create trigger schedule_verify_monitor_job_after_event
after insert on public.velmere_verify_publication_events
for each row execute function public.velmere_schedule_verify_monitor_job_v1();

create or replace function public.velmere_activate_bound_verify_monitor_job_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_latest public.velmere_verify_publication_events%rowtype;
begin
  select * into strict v_latest
  from public.velmere_verify_publication_events e
  where e.public_proof_id = new.public_proof_id
  order by e.publication_version desc
  limit 1;
  update public.velmere_verify_monitor_jobs j
  set expected_event_digest = v_latest.event_digest,
      due_at = case
        when v_latest.current_status in ('VERIFIED', 'VERIFIED_AGAIN') then v_latest.monitor_due_at
        when v_latest.current_status = 'MONITORING_UNAVAILABLE'
          then greatest(v_latest.monitor_due_at, clock_timestamp() + interval '5 minutes')
        else null
      end,
      state = case
        when v_latest.current_status in ('VERIFIED', 'VERIFIED_AGAIN', 'MONITORING_UNAVAILABLE')
          then 'queued'
        else 'awaiting_revalidation'
      end,
      attempt_count = 0,
      lease_token_digest = null,
      lease_expires_at = null,
      claimed_at = null,
      last_failure_code = null,
      updated_at = clock_timestamp()
  where j.public_proof_id = new.public_proof_id
    and j.state <> 'processing';
  return null;
end;
$$;

revoke all on function public.velmere_activate_bound_verify_monitor_job_v1()
  from public, anon, authenticated, service_role;
drop trigger if exists activate_bound_verify_monitor_job
  on public.velmere_verify_deployment_identity_bindings;
create trigger activate_bound_verify_monitor_job
after insert on public.velmere_verify_deployment_identity_bindings
for each row execute function public.velmere_activate_bound_verify_monitor_job_v1();

-- Existing Verify heads are admitted without rewriting their immutable event
-- history. A private proof is queued exactly like a public proof but remains
-- inaccessible to every public projection.
with latest as (
  select distinct on (e.public_proof_id) e.*
  from public.velmere_verify_publication_events e
  order by e.public_proof_id, e.publication_version desc
)
insert into public.velmere_verify_monitor_jobs(
  public_proof_id, expected_event_digest, due_at, state, updated_at
)
select
  latest.public_proof_id,
  latest.event_digest,
  case
    when binding.public_proof_id is null then null
    when latest.current_status in ('VERIFIED', 'VERIFIED_AGAIN') then latest.monitor_due_at
    when latest.current_status = 'MONITORING_UNAVAILABLE'
      then greatest(latest.monitor_due_at, clock_timestamp() + interval '5 minutes')
    else null
  end,
  case
    when binding.public_proof_id is not null
      and latest.current_status in ('VERIFIED', 'VERIFIED_AGAIN', 'MONITORING_UNAVAILABLE')
      then 'queued'
    else 'awaiting_revalidation'
  end,
  clock_timestamp()
from latest
left join public.velmere_verify_deployment_identity_bindings binding
  on binding.public_proof_id = latest.public_proof_id
 and binding.deployment_identity_digest = latest.audited_deployment_digest
on conflict on constraint velmere_verify_monitor_jobs_public_proof_id_key do nothing;

create or replace function public.velmere_claim_verify_monitor_jobs_v1(
  p_worker_token text,
  p_limit integer default 1,
  p_lease_seconds integer default 60,
  p_lookahead_seconds integer default 0
) returns table (
  job_id text,
  public_proof_id text,
  chain_id text,
  contract_address text,
  expected_event_digest text,
  audited_deployment_digest text,
  current_status text,
  visibility text,
  due_at timestamptz,
  attempt_count integer,
  lease_generation bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_token_digest text;
begin
  if p_worker_token is null
     or length(p_worker_token) not between 16 and 160
     or p_worker_token !~ '^[A-Za-z0-9._:@-]+$' then
    raise exception 'verify_monitor_worker_token_invalid' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 5 then
    raise exception 'verify_monitor_claim_limit_invalid' using errcode = '22023';
  end if;
  if p_lease_seconds is null or p_lease_seconds not between 30 and 300 then
    raise exception 'verify_monitor_lease_invalid' using errcode = '22023';
  end if;
  if p_lookahead_seconds is null or p_lookahead_seconds not between 0 and 3540 then
    raise exception 'verify_monitor_lookahead_invalid' using errcode = '22023';
  end if;
  v_token_digest := encode(digest(p_worker_token, 'sha256'), 'hex');

  -- Recover only expired leases. A still-owned claim is never stolen.
  update public.velmere_verify_monitor_jobs j
  set state = case when j.attempt_count >= 8 then 'dead_letter' else 'queued' end,
      due_at = case
        when j.attempt_count >= 8 then null
        else least(coalesce(j.due_at, v_now), v_now)
      end,
      lease_token_digest = null,
      lease_expires_at = null,
    claimed_at = null,
      last_failure_code = case
        when j.attempt_count >= 8 then 'lease_expired_dead_letter'
        else 'lease_expired'
      end,
      updated_at = v_now
  where j.state = 'processing'
    and j.lease_expires_at <= v_now;

  -- Reconcile any event appended outside this worker (visibility or completed
  -- revalidation) before claiming. Active leases are left untouched so settle
  -- detects the exact-head race and rolls back.
  with latest as (
    select distinct on (e.public_proof_id) e.*
    from public.velmere_verify_publication_events e
    order by e.public_proof_id, e.publication_version desc
  )
  insert into public.velmere_verify_monitor_jobs(
    public_proof_id, expected_event_digest, due_at, state, updated_at
  )
  select
    latest.public_proof_id,
    latest.event_digest,
    case
      when binding.public_proof_id is null then null
      when latest.current_status in ('VERIFIED', 'VERIFIED_AGAIN') then latest.monitor_due_at
      when latest.current_status = 'MONITORING_UNAVAILABLE'
        then greatest(latest.monitor_due_at, v_now + interval '5 minutes')
      else null
    end,
    case
      when binding.public_proof_id is not null
        and latest.current_status in ('VERIFIED', 'VERIFIED_AGAIN', 'MONITORING_UNAVAILABLE')
        then 'queued'
      else 'awaiting_revalidation'
    end,
    v_now
  from latest
  left join public.velmere_verify_deployment_identity_bindings binding
    on binding.public_proof_id = latest.public_proof_id
   and binding.deployment_identity_digest = latest.audited_deployment_digest
  on conflict on constraint velmere_verify_monitor_jobs_public_proof_id_key do update set
    expected_event_digest = excluded.expected_event_digest,
    due_at = excluded.due_at,
    state = excluded.state,
    lease_token_digest = null,
    lease_expires_at = null,
    claimed_at = null,
    attempt_count = 0,
    last_failure_code = null,
    updated_at = excluded.updated_at
  where public.velmere_verify_monitor_jobs.state <> 'processing'
    and public.velmere_verify_monitor_jobs.expected_event_digest
      <> excluded.expected_event_digest;

  return query
  with candidates as (
    select j.job_id
    from public.velmere_verify_monitor_jobs j
    where j.state = 'queued'
      and j.due_at <= v_now + make_interval(secs => p_lookahead_seconds)
    order by j.due_at, j.job_id
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.velmere_verify_monitor_jobs j
    set state = 'processing',
        lease_token_digest = v_token_digest,
        lease_expires_at = v_now + make_interval(secs => p_lease_seconds),
        claimed_at = v_now,
        attempt_count = j.attempt_count + 1,
        lease_generation = j.lease_generation + 1,
        updated_at = v_now
    from candidates c
    where j.job_id = c.job_id
    returning j.*
  )
  select
    c.job_id::text,
    c.public_proof_id,
    i.chain_id,
    i.contract_address,
    c.expected_event_digest,
    e.audited_deployment_digest,
    e.current_status,
    e.visibility,
    c.due_at,
    c.attempt_count,
    c.lease_generation
  from claimed c
  join public.velmere_verify_publication_identities i
    on i.public_proof_id = c.public_proof_id
  join public.velmere_verify_publication_events e
    on e.event_digest = c.expected_event_digest
  join public.velmere_verify_deployment_identity_bindings b
    on b.public_proof_id = c.public_proof_id
   and b.deployment_identity_digest = e.audited_deployment_digest
  order by c.due_at, c.job_id;
end;
$$;

create or replace function public.velmere_settle_verify_monitor_job_v1(
  p_job_id uuid,
  p_worker_token text,
  p_expected_event_digest text,
  p_observation_outcome text,
  p_observed_deployment_digest text,
  p_verification_receipt_digest text,
  p_checked_block_number text,
  p_checked_block_hash text,
  p_checked_at timestamptz,
  p_monitoring_ttl_seconds integer,
  p_failure_code text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_job public.velmere_verify_monitor_jobs%rowtype;
  v_identity public.velmere_verify_publication_identities%rowtype;
  v_latest public.velmere_verify_publication_events%rowtype;
  v_append jsonb;
  v_required jsonb;
  v_actor_digest text := encode(digest('velmere-verify-continuous-monitor-v1', 'sha256'), 'hex');
  v_idempotency_key text;
  v_required_idempotency_key text;
  v_token_digest text;
  v_head_digest text;
  v_now timestamptz := clock_timestamp();
  v_retry_seconds integer;
begin
  if p_job_id is null then
    raise exception 'verify_monitor_job_id_invalid' using errcode = '22023';
  end if;
  if p_worker_token is null
     or length(p_worker_token) not between 16 and 160
     or p_worker_token !~ '^[A-Za-z0-9._:@-]+$' then
    raise exception 'verify_monitor_worker_token_invalid' using errcode = '22023';
  end if;
  if p_expected_event_digest is null
     or p_expected_event_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'verify_monitor_expected_event_invalid' using errcode = '22023';
  end if;
  if p_verification_receipt_digest is null
     or p_verification_receipt_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'verify_monitor_receipt_digest_invalid' using errcode = '22023';
  end if;
  if p_observation_outcome not in ('UNCHANGED', 'CHANGED', 'FAILURE') then
    raise exception 'verify_monitor_outcome_invalid' using errcode = '22023';
  end if;
  if p_observation_outcome = 'FAILURE' then
    if p_observed_deployment_digest is not null
       or p_checked_block_number is not null
       or p_checked_block_hash is not null
       or p_monitoring_ttl_seconds is not null
       or p_checked_at is null
       or p_failure_code not in (
         'configuration_unavailable', 'provider_unavailable', 'provider_timeout',
         'receipt_invalid', 'observation_unavailable'
       ) then
      raise exception 'verify_monitor_failure_payload_invalid' using errcode = '22023';
    end if;
  else
    if p_observed_deployment_digest is null
       or p_observed_deployment_digest !~ '^[a-f0-9]{64}$'
       or p_checked_block_number is null
       or p_checked_block_number !~ '^(0|[1-9][0-9]{0,77})$'
       or p_checked_block_hash is null
       or p_checked_block_hash !~ '^0x[a-f0-9]{64}$'
       or p_checked_at is null
       or p_monitoring_ttl_seconds is null
       or p_monitoring_ttl_seconds not between 300 and 89940
       or p_monitoring_ttl_seconds <> ceil(extract(epoch from (
         public.velmere_verify_next_daily_monitor_window_end_v1(p_checked_at)
           - p_checked_at
       )))::integer
       or p_failure_code is not null then
      raise exception 'verify_monitor_observation_payload_invalid' using errcode = '22023';
    end if;
  end if;

  v_token_digest := encode(digest(p_worker_token, 'sha256'), 'hex');
  select * into v_job
  from public.velmere_verify_monitor_jobs j
  where j.job_id = p_job_id
  for update;
  if not found then
    raise exception 'verify_monitor_job_missing' using errcode = 'P0002';
  end if;
  if v_job.state <> 'processing'
     or v_job.lease_token_digest <> v_token_digest
     or v_job.lease_expires_at <= v_now then
    raise exception 'verify_monitor_lease_not_owned' using errcode = '42501';
  end if;
  if v_job.expected_event_digest <> p_expected_event_digest then
    raise exception 'verify_monitor_claim_replay' using errcode = '40001';
  end if;

  select * into v_latest
  from public.velmere_verify_publication_events e
  where e.public_proof_id = v_job.public_proof_id
  order by e.publication_version desc
  limit 1;
  if not found or v_latest.event_digest <> p_expected_event_digest then
    raise exception 'verify_monitor_head_changed' using errcode = '40001';
  end if;
  select * into v_identity
  from public.velmere_verify_publication_identities i
  where i.public_proof_id = v_job.public_proof_id;
  if not found then
    raise exception 'verify_monitor_identity_missing' using errcode = '23503';
  end if;
  perform 1
  from public.velmere_verify_deployment_identity_bindings b
  where b.public_proof_id = v_job.public_proof_id
    and b.deployment_identity_digest = v_latest.audited_deployment_digest
    and b.identity_schema_version = 'velmere.verify-canonical-deployment-identity.v1';
  if not found then
    raise exception 'verify_monitor_canonical_identity_binding_missing' using errcode = '23514';
  end if;

  if p_observation_outcome = 'UNCHANGED'
     and p_observed_deployment_digest <> v_latest.audited_deployment_digest then
    raise exception 'verify_monitor_unchanged_digest_mismatch' using errcode = '23514';
  end if;
  if p_observation_outcome = 'CHANGED'
     and p_observed_deployment_digest = v_latest.audited_deployment_digest then
    raise exception 'verify_monitor_changed_digest_replay' using errcode = '23514';
  end if;

  v_idempotency_key := encode(digest(concat_ws(E'\x1f',
    'velmere-verify-monitor-settle-v1', p_job_id::text,
    p_expected_event_digest, p_observation_outcome,
    p_verification_receipt_digest, coalesce(p_observed_deployment_digest, ''),
    coalesce(p_checked_block_number, ''), coalesce(p_checked_block_hash, ''),
    p_checked_at::text, coalesce(p_failure_code, '')
  ), 'sha256'), 'hex');

  if p_observation_outcome = 'FAILURE' then
    v_append := public.velmere_append_verify_publication_event_v1(
      v_idempotency_key, v_job.public_proof_id, v_identity.chain_id,
      v_identity.contract_address, 'MONITORING_FAILURE', v_latest.visibility,
      null, null, null, null, null, null, p_verification_receipt_digest,
      v_actor_digest, null, null, p_checked_at, null,
      p_expected_event_digest
    );
    v_head_digest := v_append->>'eventDigest';
    v_retry_seconds := least(3600, 300 * power(
      2, least(greatest(v_job.attempt_count - 1, 0), 3)
    )::integer);
    update public.velmere_verify_monitor_jobs j
    set expected_event_digest = v_head_digest,
        due_at = case
          when v_job.attempt_count >= 8 then null
          else v_now + make_interval(secs => v_retry_seconds)
        end,
        state = case
          when v_job.attempt_count >= 8 then 'dead_letter'
          else 'queued'
        end,
        lease_token_digest = null,
        lease_expires_at = null,
        claimed_at = null,
        last_failure_code = p_failure_code,
        updated_at = v_now
    where j.job_id = p_job_id
      and j.state = 'processing'
      and j.lease_token_digest = v_token_digest;
    if not found then
      raise exception 'verify_monitor_settle_conflict' using errcode = '40001';
    end if;
    return jsonb_build_object(
      'schemaVersion', 'velmere.verify-monitor-settle-receipt.v1',
      'state', 'MONITORING_UNAVAILABLE',
      'currentStatus', v_append->>'currentStatus',
      'eventDigest', v_head_digest,
      'publicationVersion', (v_append->>'publicationVersion')::bigint,
      'idempotent', (v_append->>'idempotent')::boolean,
      'retryScheduled', v_job.attempt_count < 8,
      'deadLettered', v_job.attempt_count >= 8
    );
  end if;

  v_append := public.velmere_append_verify_publication_event_v1(
    v_idempotency_key, v_job.public_proof_id, v_identity.chain_id,
    v_identity.contract_address, 'MONITOR_CHECK', v_latest.visibility,
    null, null, null, null, null, p_observed_deployment_digest,
    p_verification_receipt_digest, v_actor_digest, p_checked_block_number,
    p_checked_block_hash, p_checked_at, p_monitoring_ttl_seconds,
    p_expected_event_digest
  );
  v_head_digest := v_append->>'eventDigest';

  if p_observation_outcome = 'CHANGED' then
    if v_append->>'currentStatus' <> 'CHANGE_DETECTED' then
      raise exception 'verify_monitor_change_transition_invalid' using errcode = '23514';
    end if;
    v_required_idempotency_key := encode(digest(concat_ws(E'\x1f',
      'velmere-verify-monitor-revalidation-required-v1', p_job_id::text,
      v_head_digest, p_verification_receipt_digest
    ), 'sha256'), 'hex');
    v_required := public.velmere_append_verify_publication_event_v1(
      v_required_idempotency_key, v_job.public_proof_id, v_identity.chain_id,
      v_identity.contract_address, 'REVALIDATION_REQUIRED', v_latest.visibility,
      null, null, null, null, null, p_observed_deployment_digest,
      p_verification_receipt_digest, v_actor_digest, p_checked_block_number,
      p_checked_block_hash, p_checked_at, null, v_head_digest
    );
    v_head_digest := v_required->>'eventDigest';
    update public.velmere_verify_monitor_jobs j
    set expected_event_digest = v_head_digest,
        due_at = null,
        state = 'awaiting_revalidation',
        lease_token_digest = null,
        lease_expires_at = null,
        claimed_at = null,
        attempt_count = 0,
        last_failure_code = null,
        updated_at = v_now
    where j.job_id = p_job_id
      and j.state = 'processing'
      and j.lease_token_digest = v_token_digest;
    if not found then
      raise exception 'verify_monitor_settle_conflict' using errcode = '40001';
    end if;
    return jsonb_build_object(
      'schemaVersion', 'velmere.verify-monitor-settle-receipt.v1',
      'state', 'REVALIDATION_REQUIRED',
      'currentStatus', v_required->>'currentStatus',
      'eventDigest', v_head_digest,
      'publicationVersion', (v_required->>'publicationVersion')::bigint,
      'idempotent', (v_required->>'idempotent')::boolean,
      'retryScheduled', false,
      'deadLettered', false
    );
  end if;

  update public.velmere_verify_monitor_jobs j
  set expected_event_digest = v_head_digest,
      due_at = p_checked_at + make_interval(secs => p_monitoring_ttl_seconds),
      state = 'queued',
      lease_token_digest = null,
      lease_expires_at = null,
      claimed_at = null,
      attempt_count = 0,
      last_failure_code = null,
      updated_at = v_now
  where j.job_id = p_job_id
    and j.state = 'processing'
    and j.lease_token_digest = v_token_digest;
  if not found then
    raise exception 'verify_monitor_settle_conflict' using errcode = '40001';
  end if;
  return jsonb_build_object(
    'schemaVersion', 'velmere.verify-monitor-settle-receipt.v1',
    'state', 'MONITORED_UNCHANGED',
    'currentStatus', v_append->>'currentStatus',
    'eventDigest', v_head_digest,
    'publicationVersion', (v_append->>'publicationVersion')::bigint,
    'idempotent', (v_append->>'idempotent')::boolean,
    'retryScheduled', false,
    'deadLettered', false
  );
end;
$$;

create or replace function public.velmere_get_verify_monitor_health_v1()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'schemaVersion', 'velmere.verify-monitor-health.v1',
    'total', count(*)::integer,
    'queuedTotal', count(*) filter (
      where state = 'queued'
    )::integer,
    'queuedDue', count(*) filter (
      where state = 'queued' and due_at <= statement_timestamp()
    )::integer,
    'queuedClaimable', count(*) filter (
      where state = 'queued'
        and due_at <= statement_timestamp() + make_interval(secs => case
          when (statement_timestamp() at time zone 'UTC')::time
            between time '03:00:00' and time '03:59:00'
            then ceil(extract(epoch from (
              date_trunc('day', statement_timestamp() at time zone 'UTC')
                + interval '3 hours 59 minutes'
                - (statement_timestamp() at time zone 'UTC')
            )))::integer
          else 0
        end)
    )::integer,
    'processingActive', count(*) filter (
      where state = 'processing' and lease_expires_at > statement_timestamp()
    )::integer,
    'processingExpired', count(*) filter (
      where state = 'processing' and lease_expires_at <= statement_timestamp()
    )::integer,
    'awaitingRevalidation', count(*) filter (
      where state = 'awaiting_revalidation'
    )::integer,
    'deadLettered', count(*) filter (
      where state = 'dead_letter'
    )::integer,
    'observedAt', statement_timestamp()
  )
  from public.velmere_verify_monitor_jobs;
$$;

revoke all on function public.velmere_claim_verify_monitor_jobs_v1(text, integer, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.velmere_settle_verify_monitor_job_v1(
  uuid, text, text, text, text, text, text, text, timestamptz, integer, text
) from public, anon, authenticated, service_role;
revoke all on function public.velmere_get_verify_monitor_health_v1()
  from public, anon, authenticated, service_role;

grant execute on function public.velmere_claim_verify_monitor_jobs_v1(text, integer, integer, integer)
  to service_role;
grant execute on function public.velmere_settle_verify_monitor_job_v1(
  uuid, text, text, text, text, text, text, text, timestamptz, integer, text
) to service_role;
grant execute on function public.velmere_get_verify_monitor_health_v1()
  to service_role;

comment on table public.velmere_verify_monitor_jobs is
  'Private service-role-only due/lease control plane for V4 Verify monitoring. Public truth remains the immutable event registry.';

commit;
