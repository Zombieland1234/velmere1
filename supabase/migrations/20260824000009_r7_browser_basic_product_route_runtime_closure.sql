begin;

-- R7 Browser Basic product-route closure.
--
-- This additive successor repairs objects that are required by the current
-- GoTrue session boundary and durable Lens/PDF route but were absent from the
-- owner-authorized staging schema. Historical migrations remain immutable.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- -------------------------------------------------------------------------
-- GoTrue subject -> Velmere account binding (owner-readable, server-written)
-- -------------------------------------------------------------------------

create table if not exists public.velmere_account_supabase_subject_bindings (
  account_id text primary key,
  supabase_subject uuid not null unique,
  request_id text not null unique,
  operator_fingerprint text not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

alter table public.velmere_account_supabase_subject_bindings enable row level security;
revoke all on table public.velmere_account_supabase_subject_bindings
  from public, anon, authenticated;
grant select, insert, update on table public.velmere_account_supabase_subject_bindings
  to service_role;
grant select (account_id, supabase_subject)
  on table public.velmere_account_supabase_subject_bindings to authenticated;

drop policy if exists r7_account_binding_owner_select
  on public.velmere_account_supabase_subject_bindings;
create policy r7_account_binding_owner_select
  on public.velmere_account_supabase_subject_bindings
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and supabase_subject = (select auth.uid())
  );

-- Accepted request IDs are immutable replay identities.  They live in a
-- separate server-only ledger so a fresh login/refresh can be acknowledged
-- without rewriting the canonical binding's historical request/operator.
create table if not exists public.velmere_account_supabase_subject_binding_requests (
  request_id text primary key,
  account_id text not null,
  supabase_subject uuid not null,
  operator_fingerprint text not null,
  created_at timestamptz not null default pg_catalog.now()
);

alter table public.velmere_account_supabase_subject_binding_requests enable row level security;
revoke all on table public.velmere_account_supabase_subject_binding_requests
  from public, anon, authenticated;
grant select on table public.velmere_account_supabase_subject_binding_requests
  to service_role;

insert into public.velmere_account_supabase_subject_binding_requests(
  request_id,
  account_id,
  supabase_subject,
  operator_fingerprint,
  created_at
)
select
  bindings.request_id,
  bindings.account_id,
  bindings.supabase_subject,
  bindings.operator_fingerprint,
  bindings.created_at
from public.velmere_account_supabase_subject_bindings as bindings
on conflict (request_id) do nothing;

do $$
begin
  if exists (
    select 1
      from public.velmere_account_supabase_subject_bindings as bindings
      join public.velmere_account_supabase_subject_binding_requests as requests
        on requests.request_id = bindings.request_id
     where requests.account_id is distinct from bindings.account_id
        or requests.supabase_subject is distinct from bindings.supabase_subject
        or requests.operator_fingerprint is distinct from bindings.operator_fingerprint
  ) then
    raise exception 'account_subject_binding_request_backfill_conflict'
      using errcode = '23505';
  end if;
end;
$$;

create or replace function public.velmere_bind_account_to_supabase_subject(
  p_account_id text,
  p_supabase_subject uuid,
  p_request_id text,
  p_operator_fingerprint text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_existing_binding public.velmere_account_supabase_subject_bindings%rowtype;
  v_existing_request public.velmere_account_supabase_subject_binding_requests%rowtype;
  v_request_inserted integer := 0;
  v_inserted integer := 0;
begin
  if p_account_id is null
     or p_account_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{5,119}$'
  then
    raise exception 'invalid_account_id' using errcode = '22023';
  end if;
  if p_supabase_subject is null then
    raise exception 'invalid_supabase_subject' using errcode = '22023';
  end if;
  if p_request_id is null
     or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9:_-]{7,119}$'
  then
    raise exception 'invalid_request_id' using errcode = '22023';
  end if;
  if p_operator_fingerprint is null
     or p_operator_fingerprint !~ '^operator_[a-f0-9]{20}$'
  then
    raise exception 'invalid_operator' using errcode = '22023';
  end if;

  if not exists (
    select 1
      from auth.users as users
     where users.id = p_supabase_subject
       and users.deleted_at is null
  ) then
    return 'not_found';
  end if;

  select requests.*
    into v_existing_request
    from public.velmere_account_supabase_subject_binding_requests as requests
   where requests.request_id = p_request_id;
  if found then
    if v_existing_request.account_id = p_account_id
       and v_existing_request.supabase_subject = p_supabase_subject
       and v_existing_request.operator_fingerprint = p_operator_fingerprint
       and exists (
         select 1
           from public.velmere_account_supabase_subject_bindings as bindings
          where bindings.account_id = p_account_id
            and bindings.supabase_subject = p_supabase_subject
       )
    then
      return 'already_bound';
    end if;
    return 'conflict';
  end if;

  -- Reserve the new replay identity before resolving the canonical pair.
  -- ON CONFLICT plus the immediate read makes concurrent reuse deterministic.
  insert into public.velmere_account_supabase_subject_binding_requests(
    request_id,
    account_id,
    supabase_subject,
    operator_fingerprint
  ) values (
    p_request_id,
    p_account_id,
    p_supabase_subject,
    p_operator_fingerprint
  )
  on conflict (request_id) do nothing;
  get diagnostics v_request_inserted = row_count;

  select requests.*
    into v_existing_request
    from public.velmere_account_supabase_subject_binding_requests as requests
   where requests.request_id = p_request_id;
  if not found
     or v_existing_request.account_id is distinct from p_account_id
     or v_existing_request.supabase_subject is distinct from p_supabase_subject
     or v_existing_request.operator_fingerprint is distinct from p_operator_fingerprint
  then
    return 'conflict';
  end if;

  if exists (
    select 1
      from public.velmere_account_supabase_subject_bindings as bindings
     where bindings.account_id = p_account_id
       and bindings.supabase_subject <> p_supabase_subject
  ) or exists (
    select 1
      from public.velmere_account_supabase_subject_bindings as bindings
     where bindings.supabase_subject = p_supabase_subject
       and bindings.account_id <> p_account_id
  ) then
    if v_request_inserted = 1 then
      delete from public.velmere_account_supabase_subject_binding_requests as requests
       where requests.request_id = p_request_id
         and requests.account_id = p_account_id
         and requests.supabase_subject = p_supabase_subject
         and requests.operator_fingerprint = p_operator_fingerprint;
    end if;
    return 'conflict';
  end if;

  insert into public.velmere_account_supabase_subject_bindings(
    account_id,
    supabase_subject,
    request_id,
    operator_fingerprint
  ) values (
    p_account_id,
    p_supabase_subject,
    p_request_id,
    p_operator_fingerprint
  )
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    return 'bound';
  end if;

  -- A concurrent insert may have won a unique key.  Re-read request identity
  -- first: any mismatch must fail closed before pair-level idempotence.
  select requests.*
    into v_existing_request
    from public.velmere_account_supabase_subject_binding_requests as requests
   where requests.request_id = p_request_id;
  if not found
     or v_existing_request.account_id is distinct from p_account_id
     or v_existing_request.supabase_subject is distinct from p_supabase_subject
     or v_existing_request.operator_fingerprint is distinct from p_operator_fingerprint
  then
    return 'conflict';
  end if;

  select bindings.*
    into v_existing_binding
    from public.velmere_account_supabase_subject_bindings as bindings
   where bindings.account_id = p_account_id
     and bindings.supabase_subject = p_supabase_subject;
  if found then
    return 'already_bound';
  end if;

  if v_request_inserted = 1 then
    delete from public.velmere_account_supabase_subject_binding_requests as requests
     where requests.request_id = p_request_id
       and requests.account_id = p_account_id
       and requests.supabase_subject = p_supabase_subject
       and requests.operator_fingerprint = p_operator_fingerprint;
  end if;
  return 'conflict';
end;
$$;

create or replace function public.velmere_current_account_id()
returns text
language sql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  select bindings.account_id
    from public.velmere_account_supabase_subject_bindings as bindings
   where bindings.supabase_subject = auth.uid()
   limit 1;
$$;

-- Sensitive operations must not rely on JWT expiry alone.  The function
-- derives both identity values from the authenticated request context and
-- requires the GoTrue session row to remain live before returning an account.
create or replace function public.velmere_current_active_session_account_id()
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_subject uuid := auth.uid();
  v_session_id_text text := auth.jwt() ->> 'session_id';
  v_session_id uuid;
  v_account_id text;
begin
  if v_subject is null
     or v_session_id_text is null
     or v_session_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    return null;
  end if;
  v_session_id := v_session_id_text::uuid;

  if not exists (
    select 1
      from auth.sessions as sessions
     where sessions.id = v_session_id
       and sessions.user_id = v_subject
       and (sessions.not_after is null or sessions.not_after > pg_catalog.now())
  ) then
    return null;
  end if;

  select bindings.account_id
    into v_account_id
    from public.velmere_account_supabase_subject_bindings as bindings
   where bindings.supabase_subject = v_subject
   limit 1;
  return v_account_id;
end;
$$;

revoke all on function public.velmere_bind_account_to_supabase_subject(text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.velmere_bind_account_to_supabase_subject(text, uuid, text, text)
  to service_role;
revoke all on function public.velmere_current_account_id() from public, anon;
grant execute on function public.velmere_current_account_id() to authenticated, service_role;
revoke all on function public.velmere_current_active_session_account_id()
  from public, anon;
grant execute on function public.velmere_current_active_session_account_id()
  to authenticated, service_role;

-- -------------------------------------------------------------------------
-- Privacy-safe auth telemetry and rotating server-side session families
-- -------------------------------------------------------------------------

create table if not exists public.velmere_auth_security_events (
  id bigint generated always as identity primary key,
  event_family text not null
    check (event_family in ('session', 'oauth', 'recovery', 'binding', 'rls')),
  outcome text not null
    check (outcome in ('success', 'rejected', 'pending', 'conflict', 'unavailable')),
  time_bucket timestamptz not null default pg_catalog.date_trunc('hour', pg_catalog.now()),
  count integer not null default 1 check (count between 1 and 1000000),
  created_at timestamptz not null default pg_catalog.now(),
  unique (event_family, outcome, time_bucket)
);

create table if not exists public.velmere_auth_security_alerts (
  id bigint generated always as identity primary key,
  alert_key text not null unique,
  event_family text not null
    check (event_family in ('session', 'oauth', 'recovery', 'binding', 'rls')),
  outcome text not null
    check (outcome in ('success', 'rejected', 'pending', 'conflict', 'unavailable')),
  severity text not null check (severity in ('medium', 'high', 'critical')),
  event_count integer not null check (event_count between 1 and 1000000),
  time_bucket timestamptz not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'delivered', 'retry', 'dead_letter')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 1000),
  next_attempt_at timestamptz not null default pg_catalog.now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  delivered_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create index if not exists velmere_auth_security_alerts_ready_idx
  on public.velmere_auth_security_alerts(status, next_attempt_at, id);

create table if not exists public.velmere_auth_session_families (
  family_id uuid primary key,
  subject_fingerprint text not null check (subject_fingerprint ~ '^[a-f0-9]{32}$'),
  generation integer not null default 1 check (generation between 1 and 1000000000),
  status text not null default 'active'
    check (status in ('active', 'revoked', 'compromised', 'expired')),
  expires_at timestamptz not null,
  last_rotated_at timestamptz not null default pg_catalog.now(),
  compromised_at timestamptz,
  revoke_reason_code text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create index if not exists velmere_auth_session_families_subject_status_idx
  on public.velmere_auth_session_families(subject_fingerprint, status);

alter table public.velmere_auth_security_events enable row level security;
alter table public.velmere_auth_security_alerts enable row level security;
alter table public.velmere_auth_session_families enable row level security;
revoke all on table public.velmere_auth_security_events from public, anon, authenticated;
revoke all on table public.velmere_auth_security_alerts from public, anon, authenticated;
revoke all on table public.velmere_auth_session_families from public, anon, authenticated;
grant select, insert, update on table public.velmere_auth_security_events to service_role;
grant select, insert, update on table public.velmere_auth_security_alerts to service_role;
grant select, insert, update on table public.velmere_auth_session_families to service_role;

create or replace function public.velmere_record_auth_security_event(
  p_event_family text,
  p_outcome text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_bucket timestamptz := pg_catalog.date_trunc('hour', pg_catalog.now());
  v_current_count integer;
  v_threshold integer;
  v_alert_severity text;
begin
  if p_event_family not in ('session', 'oauth', 'recovery', 'binding', 'rls')
     or p_outcome not in ('success', 'rejected', 'pending', 'conflict', 'unavailable')
  then
    raise exception 'invalid_auth_security_event' using errcode = '22023';
  end if;

  insert into public.velmere_auth_security_events(
    event_family,
    outcome,
    time_bucket,
    count
  ) values (
    p_event_family,
    p_outcome,
    v_bucket,
    1
  )
  on conflict (event_family, outcome, time_bucket)
  do update set count = least(
    1000000,
    public.velmere_auth_security_events.count + 1
  )
  returning count into v_current_count;

  v_threshold := case
    when p_outcome = 'conflict' then 2
    when p_outcome in ('rejected', 'unavailable') then 5
    else 0
  end;
  v_alert_severity := case
    when p_outcome = 'conflict' then 'critical'
    when v_current_count >= 20 then 'critical'
    when v_current_count >= 10 then 'high'
    else 'medium'
  end;

  if v_threshold > 0 and v_current_count >= v_threshold then
    insert into public.velmere_auth_security_alerts(
      alert_key,
      event_family,
      outcome,
      severity,
      event_count,
      time_bucket
    ) values (
      p_event_family || ':' || p_outcome || ':' ||
        extract(epoch from v_bucket)::bigint,
      p_event_family,
      p_outcome,
      v_alert_severity,
      v_current_count,
      v_bucket
    )
    on conflict (alert_key) do update set
      event_count = excluded.event_count,
      severity = excluded.severity,
      updated_at = pg_catalog.now(),
      status = case
        when public.velmere_auth_security_alerts.status = 'delivered' then 'delivered'
        else 'queued'
      end;
  end if;
end;
$$;

create or replace function public.velmere_issue_auth_session_family(
  p_family_id uuid,
  p_subject_fingerprint text,
  p_expires_at timestamptz
)
returns table(status text, generation integer)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_row public.velmere_auth_session_families%rowtype;
begin
  if p_family_id is null
     or p_subject_fingerprint is null
     or p_subject_fingerprint !~ '^[a-f0-9]{32}$'
     or p_expires_at is null
     or p_expires_at <= pg_catalog.now()
  then
    raise exception 'invalid_auth_session_family' using errcode = '22023';
  end if;

  insert into public.velmere_auth_session_families(
    family_id,
    subject_fingerprint,
    generation,
    status,
    expires_at
  ) values (
    p_family_id,
    p_subject_fingerprint,
    1,
    'active',
    p_expires_at
  )
  on conflict (family_id) do nothing;

  select families.*
    into v_row
    from public.velmere_auth_session_families as families
   where families.family_id = p_family_id;
  if v_row.subject_fingerprint is distinct from p_subject_fingerprint
     or v_row.expires_at is distinct from p_expires_at
  then
    raise exception 'auth_session_family_identity_conflict' using errcode = '23505';
  end if;
  return query select 'issued'::text, v_row.generation;
end;
$$;

create or replace function public.velmere_rotate_auth_session_family(
  p_family_id uuid,
  p_expected_generation integer,
  p_expires_at timestamptz
)
returns table(status text, generation integer)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_row public.velmere_auth_session_families%rowtype;
begin
  if p_family_id is null
     or p_expected_generation is null
     or p_expected_generation < 1
     or p_expires_at is null
     or p_expires_at <= pg_catalog.now()
  then
    raise exception 'invalid_auth_session_family_rotation' using errcode = '22023';
  end if;

  select families.*
    into v_row
    from public.velmere_auth_session_families as families
   where families.family_id = p_family_id
   for update;
  if not found then
    return query select 'missing'::text, 0;
    return;
  end if;
  if v_row.expires_at <= pg_catalog.now() then
    update public.velmere_auth_session_families as families
       set status = 'expired', updated_at = pg_catalog.now()
     where families.family_id = p_family_id;
    return query select 'expired'::text, v_row.generation;
    return;
  end if;
  if v_row.status <> 'active' then
    return query select v_row.status::text, v_row.generation;
    return;
  end if;
  if p_expected_generation = v_row.generation then
    update public.velmere_auth_session_families as families
       set generation = families.generation + 1,
           expires_at = greatest(families.expires_at, p_expires_at),
           last_rotated_at = pg_catalog.now(),
           updated_at = pg_catalog.now()
     where families.family_id = p_family_id
     returning families.generation into v_row.generation;
    return query select 'rotated'::text, v_row.generation;
    return;
  end if;
  if p_expected_generation = v_row.generation - 1
     and v_row.last_rotated_at >= pg_catalog.now() - interval '30 seconds'
  then
    return query select 'grace_replay'::text, v_row.generation;
    return;
  end if;

  update public.velmere_auth_session_families as families
     set status = 'compromised',
         compromised_at = pg_catalog.now(),
         revoke_reason_code = 'generation_reuse',
         updated_at = pg_catalog.now()
   where families.family_id = p_family_id;
  perform public.velmere_record_auth_security_event('session', 'conflict');
  return query select 'reuse_detected'::text, v_row.generation;
end;
$$;

create or replace function public.velmere_revoke_auth_session_family(
  p_family_id uuid,
  p_reason_code text
)
returns table(status text, generation integer)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_generation integer;
begin
  if p_family_id is null then
    raise exception 'invalid_auth_session_family' using errcode = '22023';
  end if;
  update public.velmere_auth_session_families as families
     set status = 'revoked',
         revoke_reason_code = pg_catalog.left(
           pg_catalog.regexp_replace(
             coalesce(p_reason_code, ''),
             '[^a-zA-Z0-9_-]',
             '',
             'g'
           ),
           40
         ),
         updated_at = pg_catalog.now()
   where families.family_id = p_family_id
     and families.status in ('active', 'compromised')
  returning families.generation into v_generation;

  if v_generation is null then
    select families.generation
      into v_generation
      from public.velmere_auth_session_families as families
     where families.family_id = p_family_id;
    return query select
      case when v_generation is null then 'missing' else 'revoked' end::text,
      coalesce(v_generation, 0);
    return;
  end if;
  return query select 'revoked'::text, v_generation;
end;
$$;

create or replace function public.velmere_verify_auth_session_family(
  p_family_id uuid,
  p_subject_fingerprint text,
  p_expected_generation integer,
  p_expected_expires_at timestamptz
)
returns table(
  status text,
  family_id uuid,
  subject_fingerprint text,
  generation integer,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select
    case
      when families.status <> 'active' then families.status
      when families.expires_at <= pg_catalog.now() then 'expired'
      when families.subject_fingerprint is distinct from p_subject_fingerprint then 'subject_mismatch'
      when families.generation is distinct from p_expected_generation then 'generation_mismatch'
      when families.expires_at is distinct from p_expected_expires_at then 'expiry_mismatch'
      else 'active'
    end::text,
    families.family_id,
    families.subject_fingerprint,
    families.generation,
    families.expires_at
  from public.velmere_auth_session_families as families
  where families.family_id = p_family_id;
$$;

create or replace function public.velmere_revoke_auth_session_subject(
  p_subject_fingerprint text,
  p_reason_code text
)
returns table(status text, revoked_count integer)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_changed_count integer := 0;
  v_subject_known boolean := false;
begin
  if p_subject_fingerprint is null
     or p_subject_fingerprint !~ '^[a-f0-9]{32}$'
  then
    raise exception 'invalid_auth_session_subject' using errcode = '22023';
  end if;

  update public.velmere_auth_session_families as families
     set status = 'revoked',
         revoke_reason_code = pg_catalog.left(
           pg_catalog.regexp_replace(
             coalesce(p_reason_code, ''),
             '[^a-zA-Z0-9_-]',
             '',
             'g'
           ),
           40
         ),
         updated_at = pg_catalog.now()
   where families.subject_fingerprint = p_subject_fingerprint
     and families.status in ('active', 'compromised');
  get diagnostics v_changed_count = row_count;

  select exists(
    select 1
      from public.velmere_auth_session_families as families
     where families.subject_fingerprint = p_subject_fingerprint
  ) into v_subject_known;

  return query select
    case when v_subject_known then 'revoked' else 'missing' end::text,
    v_changed_count;
end;
$$;

revoke all on function public.velmere_record_auth_security_event(text, text)
  from public, anon, authenticated;
revoke all on function public.velmere_issue_auth_session_family(uuid, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.velmere_rotate_auth_session_family(uuid, integer, timestamptz)
  from public, anon, authenticated;
revoke all on function public.velmere_revoke_auth_session_family(uuid, text)
  from public, anon, authenticated;
revoke all on function public.velmere_verify_auth_session_family(uuid, text, integer, timestamptz)
  from public, anon, authenticated;
revoke all on function public.velmere_revoke_auth_session_subject(text, text)
  from public, anon, authenticated;
grant execute on function public.velmere_record_auth_security_event(text, text) to service_role;
grant execute on function public.velmere_issue_auth_session_family(uuid, text, timestamptz) to service_role;
grant execute on function public.velmere_rotate_auth_session_family(uuid, integer, timestamptz) to service_role;
grant execute on function public.velmere_revoke_auth_session_family(uuid, text) to service_role;
grant execute on function public.velmere_verify_auth_session_family(uuid, text, integer, timestamptz) to service_role;
grant execute on function public.velmere_revoke_auth_session_subject(text, text) to service_role;

-- -------------------------------------------------------------------------
-- Durable, replay-safe Lens/PDF computation route
-- -------------------------------------------------------------------------

create table if not exists public.velmere_durable_computation_jobs (
  job_id text primary key,
  kind text not null check (kind in ('vlm_analysis', 'lens_pdf_render', 'audit_pdf_render')),
  input_hash text not null,
  subject_hash text not null,
  state text not null check (state in ('processing', 'completed', 'retry_wait', 'dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 8),
  lease_token_hash text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  result_payload jsonb,
  last_error_code text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  completed_at timestamptz,
  dead_lettered_at timestamptz,
  operator_replay_count integer not null default 0 check (operator_replay_count >= 0),
  last_operator_hash text,
  last_requeue_reason_hash text,
  last_operator_requeued_at timestamptz,
  sealed_payload jsonb,
  worker_id_hash text,
  worker_claimed_at timestamptz,
  heartbeat_at timestamptz,
  constraint velmere_durable_computation_jobs_sealed_payload_size
    check (sealed_payload is null or pg_catalog.pg_column_size(sealed_payload) <= 786432)
);

alter table public.velmere_durable_computation_jobs
  add column if not exists operator_replay_count integer not null default 0,
  add column if not exists last_operator_hash text,
  add column if not exists last_requeue_reason_hash text,
  add column if not exists last_operator_requeued_at timestamptz,
  add column if not exists sealed_payload jsonb,
  add column if not exists worker_id_hash text,
  add column if not exists worker_claimed_at timestamptz,
  add column if not exists heartbeat_at timestamptz;

alter table public.velmere_durable_computation_jobs enable row level security;
revoke all on table public.velmere_durable_computation_jobs from public, anon, authenticated;
grant select, insert, update, delete on table public.velmere_durable_computation_jobs to service_role;

create index if not exists velmere_durable_computation_jobs_state_next_idx
  on public.velmere_durable_computation_jobs(state, next_attempt_at, lease_expires_at);
create index if not exists velmere_durable_computation_worker_ready_idx
  on public.velmere_durable_computation_jobs(state, next_attempt_at, lease_expires_at, kind)
  where sealed_payload is not null;

create or replace function public.velmere_claim_durable_computation(
  p_job_id text,
  p_kind text,
  p_input_hash text,
  p_subject_hash text,
  p_lease_token text,
  p_lease_seconds integer,
  p_max_attempts integer,
  p_sealed_payload jsonb
)
returns table(
  state text,
  attempt_count integer,
  retry_after_ms integer,
  result_payload jsonb
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_row public.velmere_durable_computation_jobs%rowtype;
  v_now timestamptz := pg_catalog.now();
  v_attempt integer;
begin
  if p_job_id is null or p_job_id !~ '^dcj_[0-9a-f]{48}$' then
    raise exception 'invalid_job_id' using errcode = '22023';
  end if;
  if p_kind not in ('vlm_analysis', 'lens_pdf_render', 'audit_pdf_render') then
    raise exception 'invalid_job_kind' using errcode = '22023';
  end if;
  if p_input_hash is null
     or p_input_hash !~ '^[0-9a-f]{64}$'
     or p_subject_hash is null
     or p_subject_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid_job_hash' using errcode = '22023';
  end if;
  if p_lease_token is null
     or pg_catalog.length(p_lease_token) < 24
     or pg_catalog.length(p_lease_token) > 120
  then
    raise exception 'invalid_lease_token' using errcode = '22023';
  end if;
  if p_lease_seconds is null or p_max_attempts is null then
    raise exception 'invalid_job_limits' using errcode = '22023';
  end if;
  if p_sealed_payload is not null then
    if pg_catalog.pg_column_size(p_sealed_payload) > 786432 then
      raise exception 'sealed_payload_too_large' using errcode = '22001';
    end if;
    if coalesce(p_sealed_payload ->> 'schemaVersion', '')
         <> 'velmere.durable-computation.sealed-payload.v1'
    then
      raise exception 'sealed_payload_schema_invalid' using errcode = '22023';
    end if;
    if coalesce(p_sealed_payload ->> 'algorithm', '') <> 'A256GCM' then
      raise exception 'sealed_payload_algorithm_invalid' using errcode = '22023';
    end if;
  end if;

  insert into public.velmere_durable_computation_jobs(
    job_id,
    kind,
    input_hash,
    subject_hash,
    state,
    attempt_count,
    max_attempts,
    sealed_payload
  ) values (
    p_job_id,
    p_kind,
    p_input_hash,
    p_subject_hash,
    'retry_wait',
    0,
    greatest(1, least(8, p_max_attempts)),
    p_sealed_payload
  )
  on conflict (job_id) do nothing;

  select jobs.*
    into v_row
    from public.velmere_durable_computation_jobs as jobs
   where jobs.job_id = p_job_id
   for update;
  if v_row.kind <> p_kind
     or v_row.input_hash <> p_input_hash
     or v_row.subject_hash <> p_subject_hash
  then
    return query select 'conflict'::text, v_row.attempt_count, 0, null::jsonb;
    return;
  end if;
  if v_row.sealed_payload is null and p_sealed_payload is not null then
    update public.velmere_durable_computation_jobs
       set sealed_payload = p_sealed_payload, updated_at = v_now
     where job_id = p_job_id;
  elsif v_row.sealed_payload is not null
        and p_sealed_payload is not null
        and pg_catalog.encode(
          extensions.digest(v_row.sealed_payload::text, 'sha256'),
          'hex'
        ) <> pg_catalog.encode(
          extensions.digest(p_sealed_payload::text, 'sha256'),
          'hex'
        )
  then
    return query select 'conflict'::text, v_row.attempt_count, 0, null::jsonb;
    return;
  end if;
  if v_row.state = 'completed' then
    return query select 'completed'::text, v_row.attempt_count, 0, v_row.result_payload;
    return;
  end if;
  if v_row.state = 'dead_letter' then
    return query select 'dead_letter'::text, v_row.attempt_count, 0, null::jsonb;
    return;
  end if;
  if v_row.state = 'processing' and v_row.lease_expires_at > v_now then
    return query select
      'in_progress'::text,
      v_row.attempt_count,
      greatest(
        1000,
        (extract(epoch from (v_row.lease_expires_at - v_now)) * 1000)::integer
      ),
      null::jsonb;
    return;
  end if;
  if v_row.state = 'retry_wait'
     and v_row.next_attempt_at is not null
     and v_row.next_attempt_at > v_now
  then
    return query select
      'retry_wait'::text,
      v_row.attempt_count,
      greatest(
        1000,
        (extract(epoch from (v_row.next_attempt_at - v_now)) * 1000)::integer
      ),
      null::jsonb;
    return;
  end if;

  v_attempt := v_row.attempt_count + 1;
  if v_attempt > v_row.max_attempts then
    update public.velmere_durable_computation_jobs
       set state = 'dead_letter',
           dead_lettered_at = v_now,
           lease_token_hash = null,
           lease_expires_at = null,
           worker_id_hash = null,
           worker_claimed_at = null,
           heartbeat_at = null,
           updated_at = v_now
     where job_id = p_job_id;
    return query select 'dead_letter'::text, v_row.attempt_count, 0, null::jsonb;
    return;
  end if;

  update public.velmere_durable_computation_jobs
     set state = 'processing',
         attempt_count = v_attempt,
         lease_token_hash = pg_catalog.encode(
           extensions.digest(p_lease_token, 'sha256'),
           'hex'
         ),
         lease_expires_at = v_now + pg_catalog.make_interval(
           secs => greatest(15, least(600, p_lease_seconds))
         ),
         next_attempt_at = null,
         worker_id_hash = null,
         worker_claimed_at = null,
         heartbeat_at = v_now,
         updated_at = v_now
   where job_id = p_job_id;
  return query select 'claimed'::text, v_attempt, 0, null::jsonb;
end;
$$;

create or replace function public.velmere_complete_durable_computation(
  p_job_id text,
  p_lease_token text,
  p_result_payload jsonb
)
returns table(state text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
begin
  if p_job_id is null or p_job_id !~ '^dcj_[0-9a-f]{48}$'
     or p_lease_token is null
     or pg_catalog.length(p_lease_token) < 24
     or pg_catalog.length(p_lease_token) > 120
  then
    raise exception 'invalid_durable_completion' using errcode = '22023';
  end if;
  if p_result_payload is null then
    raise exception 'result_payload_required' using errcode = '22004';
  end if;
  if pg_catalog.pg_column_size(p_result_payload) > 4194304 then
    raise exception 'result_payload_too_large' using errcode = '22001';
  end if;

  update public.velmere_durable_computation_jobs as jobs
     set state = 'completed',
         result_payload = p_result_payload,
         completed_at = pg_catalog.now(),
         lease_token_hash = null,
         lease_expires_at = null,
         worker_id_hash = null,
         worker_claimed_at = null,
         heartbeat_at = null,
         updated_at = pg_catalog.now()
   where jobs.job_id = p_job_id
     and jobs.state = 'processing'
     and jobs.lease_token_hash = pg_catalog.encode(
       extensions.digest(p_lease_token, 'sha256'),
       'hex'
     )
     and jobs.lease_expires_at > pg_catalog.now();
  if not found then
    return query select 'conflict'::text;
  else
    return query select 'completed'::text;
  end if;
end;
$$;

create or replace function public.velmere_fail_durable_computation(
  p_job_id text,
  p_lease_token text,
  p_error_code text,
  p_retry_after_seconds integer
)
returns table(state text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_attempt integer;
  v_max integer;
  v_safe_error text;
begin
  if p_job_id is null or p_job_id !~ '^dcj_[0-9a-f]{48}$'
     or p_lease_token is null
     or pg_catalog.length(p_lease_token) < 24
     or pg_catalog.length(p_lease_token) > 120
     or p_retry_after_seconds is null
  then
    raise exception 'invalid_durable_failure' using errcode = '22023';
  end if;
  v_safe_error := pg_catalog.left(
    pg_catalog.regexp_replace(
      coalesce(p_error_code, 'durable_computation_failed'),
      '[^a-zA-Z0-9:_-]',
      '_',
      'g'
    ),
    120
  );

  select jobs.attempt_count, jobs.max_attempts
    into v_attempt, v_max
    from public.velmere_durable_computation_jobs as jobs
   where jobs.job_id = p_job_id
     and jobs.state = 'processing'
     and jobs.lease_token_hash = pg_catalog.encode(
       extensions.digest(p_lease_token, 'sha256'),
       'hex'
     )
     and jobs.lease_expires_at > pg_catalog.now()
   for update;
  if not found then
    return query select 'conflict'::text;
    return;
  end if;

  if v_attempt >= v_max then
    update public.velmere_durable_computation_jobs as jobs
       set state = 'dead_letter',
           dead_lettered_at = pg_catalog.now(),
           last_error_code = v_safe_error,
           lease_token_hash = null,
           lease_expires_at = null,
           worker_id_hash = null,
           worker_claimed_at = null,
           heartbeat_at = null,
           updated_at = pg_catalog.now()
     where jobs.job_id = p_job_id;
    return query select 'dead_letter'::text;
  else
    update public.velmere_durable_computation_jobs as jobs
       set state = 'retry_wait',
           next_attempt_at = pg_catalog.now() + pg_catalog.make_interval(
             secs => greatest(
               1,
               least(300, p_retry_after_seconds)
             )
           ),
           last_error_code = v_safe_error,
           lease_token_hash = null,
           lease_expires_at = null,
           worker_id_hash = null,
           worker_claimed_at = null,
           heartbeat_at = null,
           updated_at = pg_catalog.now()
     where jobs.job_id = p_job_id;
    return query select 'retry_wait'::text;
  end if;
end;
$$;

revoke all on function public.velmere_claim_durable_computation(
  text, text, text, text, text, integer, integer, jsonb
) from public, anon, authenticated;
revoke all on function public.velmere_complete_durable_computation(text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.velmere_fail_durable_computation(text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.velmere_claim_durable_computation(
  text, text, text, text, text, integer, integer, jsonb
) to service_role;
grant execute on function public.velmere_complete_durable_computation(text, text, jsonb)
  to service_role;
grant execute on function public.velmere_fail_durable_computation(text, text, text, integer)
  to service_role;

-- -------------------------------------------------------------------------
-- Atomic owner-bound restore for the deployed staging control plane
-- -------------------------------------------------------------------------

do $$
begin
  if pg_catalog.to_regclass('velmere_private.r7_artifact_backups') is null
     or pg_catalog.to_regprocedure(
       'public.velmere_r7_restore_artifact_from_backup(text)'
     ) is null
  then
    raise exception 'r7_restore_foundation_missing' using errcode = '55000';
  end if;
end;
$$;

create or replace function public.velmere_r7_restore_artifact_from_backup_for_owner(
  p_backup_id text,
  p_expected_account_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, velmere_private, extensions, pg_temp
as $$
declare
  v_backup_account_id text;
begin
  if p_backup_id is null
     or p_backup_id !~ '^r7-backup-[a-f0-9]{64}$'
     or p_expected_account_id is null
     or p_expected_account_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{5,119}$'
  then
    raise exception 'r7_restore_owner_request_invalid' using errcode = '22023';
  end if;

  select backups.account_id
    into v_backup_account_id
    from velmere_private.r7_artifact_backups as backups
   where backups.backup_id = p_backup_id
   for share;
  if not found then
    raise exception 'r7_restore_backup_not_found' using errcode = 'P0002';
  end if;
  if v_backup_account_id is distinct from p_expected_account_id then
    raise exception 'r7_restore_backup_not_owned' using errcode = '42501';
  end if;

  return public.velmere_r7_restore_artifact_from_backup(p_backup_id);
end;
$$;

revoke all on function public.velmere_r7_restore_artifact_from_backup_for_owner(text, text)
  from public, anon, authenticated;
grant execute on function public.velmere_r7_restore_artifact_from_backup_for_owner(text, text)
  to service_role;

commit;
