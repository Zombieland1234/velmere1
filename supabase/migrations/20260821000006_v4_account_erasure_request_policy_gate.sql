-- V4 account erasure boundary: durable owner request, cancellation and status.
-- This migration intentionally DOES NOT implement data deletion. Irreversible
-- execution remains blocked until the owner and legal reviewer approve an exact
-- data-class retention/legal-hold/deletion topology and a separate executor is
-- implemented and tested against that signed policy.

begin;

create extension if not exists pgcrypto;

create table if not exists public.velmere_account_erasure_requests (
  schema_version text not null default 'velmere.account-erasure-request-record.v1',
  request_id uuid primary key,
  account_id text not null,
  account_id_hash text not null,
  idempotency_key_hash text not null,
  export_id uuid not null,
  export_payload_sha256 text not null,
  export_generated_at timestamptz not null,
  export_expires_at timestamptz not null,
  state text not null default 'SESSION_REVOCATION_PENDING',
  session_revocation_state text not null default 'PENDING',
  session_revocation_receipt_sha256 text,
  execution_policy_state text not null default 'OWNER_LEGAL_POLICY_REQUIRED',
  requested_at timestamptz not null default now(),
  session_revocation_confirmed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (account_id_hash, idempotency_key_hash),
  constraint velmere_account_erasure_request_contract_check check (
    schema_version = 'velmere.account-erasure-request-record.v1'
    and account_id ~ '^[A-Za-z0-9][A-Za-z0-9:._-]{5,119}$'
    and account_id not like 'preview:%'
    and account_id_hash ~ '^[a-f0-9]{64}$'
    and account_id_hash = encode(digest('velmere-account-binding-v1:' || account_id, 'sha256'), 'hex')
    and idempotency_key_hash ~ '^[a-f0-9]{64}$'
    and export_payload_sha256 ~ '^sha256:[a-f0-9]{64}$'
    and export_generated_at < export_expires_at
    and state in ('SESSION_REVOCATION_PENDING', 'POLICY_BLOCKED', 'CANCELLED')
    and session_revocation_state in ('PENDING', 'CONFIRMED')
    and execution_policy_state = 'OWNER_LEGAL_POLICY_REQUIRED'
    and (
      (session_revocation_state = 'PENDING'
        and session_revocation_receipt_sha256 is null
        and session_revocation_confirmed_at is null
        and state in ('SESSION_REVOCATION_PENDING', 'CANCELLED'))
      or
      (session_revocation_state = 'CONFIRMED'
        and session_revocation_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
        and session_revocation_confirmed_at is not null
        and state in ('POLICY_BLOCKED', 'CANCELLED'))
    )
    and (
      (state = 'CANCELLED' and cancelled_at is not null)
      or (state <> 'CANCELLED' and cancelled_at is null)
    )
    and requested_at <= updated_at
  )
);

create unique index if not exists velmere_account_erasure_one_active_request_idx
  on public.velmere_account_erasure_requests(account_id_hash)
  where state <> 'CANCELLED';
create index if not exists velmere_account_erasure_owner_time_idx
  on public.velmere_account_erasure_requests(account_id_hash, requested_at desc);

create table if not exists public.velmere_account_erasure_events (
  schema_version text not null default 'velmere.account-erasure-event.v1',
  event_id uuid primary key,
  request_id uuid not null references public.velmere_account_erasure_requests(request_id) on delete restrict,
  account_id_hash text not null,
  event_type text not null,
  event_binding_sha256 text not null,
  event_at timestamptz not null default now(),
  constraint velmere_account_erasure_event_contract_check check (
    schema_version = 'velmere.account-erasure-event.v1'
    and account_id_hash ~ '^[a-f0-9]{64}$'
    and event_type in ('REQUESTED', 'SESSION_REVOCATION_CONFIRMED', 'CANCELLED')
    and event_binding_sha256 ~ '^sha256:[a-f0-9]{64}$'
  )
);

create index if not exists velmere_account_erasure_events_request_time_idx
  on public.velmere_account_erasure_events(request_id, event_at);
create index if not exists velmere_account_erasure_events_owner_time_idx
  on public.velmere_account_erasure_events(account_id_hash, event_at desc);

alter table public.velmere_account_erasure_requests enable row level security;
alter table public.velmere_account_erasure_events enable row level security;

revoke all on table public.velmere_account_erasure_requests
  from public, anon, authenticated, service_role;
revoke all on table public.velmere_account_erasure_events
  from public, anon, authenticated, service_role;
grant select on table public.velmere_account_erasure_requests to authenticated;
grant select on table public.velmere_account_erasure_events to authenticated;

drop policy if exists v4_account_erasure_request_owner_select
  on public.velmere_account_erasure_requests;
create policy v4_account_erasure_request_owner_select
on public.velmere_account_erasure_requests
for select to authenticated
using (
  account_id = public.velmere_current_account_id()
  and account_id_hash = public.velmere_current_account_binding_hash()
);

drop policy if exists v4_account_erasure_event_owner_select
  on public.velmere_account_erasure_events;
create policy v4_account_erasure_event_owner_select
on public.velmere_account_erasure_events
for select to authenticated
using (account_id_hash = public.velmere_current_account_binding_hash());

create or replace function public.velmere_account_erasure_event_immutable_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'account_erasure_event_immutable' using errcode = '23514';
end;
$$;

drop trigger if exists velmere_account_erasure_event_immutable
  on public.velmere_account_erasure_events;
create trigger velmere_account_erasure_event_immutable
before update or delete on public.velmere_account_erasure_events
for each row execute function public.velmere_account_erasure_event_immutable_guard();

revoke all on function public.velmere_account_erasure_event_immutable_guard()
  from public, anon, authenticated, service_role;

create or replace function public.velmere_request_account_erasure_v1(
  p_request_id uuid,
  p_idempotency_key_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_id text;
  v_account_hash text;
  v_auth_time_text text;
  v_auth_time timestamptz;
  v_export public.velmere_account_data_exports%rowtype;
  v_existing public.velmere_account_erasure_requests%rowtype;
  v_record public.velmere_account_erasure_requests%rowtype;
  v_event_at timestamptz;
  v_event_binding text;
begin
  if auth.role() is distinct from 'authenticated' or auth.uid() is null then
    raise exception 'account_erasure_auth_required' using errcode = '42501';
  end if;
  if p_request_id is null or p_idempotency_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'account_erasure_invalid_request' using errcode = '22023';
  end if;

  v_account_id := public.velmere_current_account_id();
  v_account_hash := public.velmere_current_account_binding_hash();
  if v_account_id is null
     or v_account_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{5,119}$'
     or v_account_id like 'preview:%'
     or v_account_hash is null
     or v_account_hash !~ '^[a-f0-9]{64}$'
     or v_account_hash <> encode(digest('velmere-account-binding-v1:' || v_account_id, 'sha256'), 'hex') then
    raise exception 'account_erasure_account_unbound' using errcode = '42501';
  end if;

  -- Account erasure is a high-risk lifecycle action. A refreshed access token
  -- is insufficient when auth_time still proves an old login: require a real
  -- authentication event no more than ten minutes old.
  v_auth_time_text := auth.jwt()->>'auth_time';
  if v_auth_time_text is null or v_auth_time_text !~ '^[0-9]{10,12}$' then
    raise exception 'account_erasure_recent_auth_required' using errcode = 'VE002';
  end if;
  v_auth_time := to_timestamp(v_auth_time_text::numeric);
  if v_auth_time < now() - interval '10 minutes'
     or v_auth_time > now() + interval '5 minutes' then
    raise exception 'account_erasure_recent_auth_required' using errcode = 'VE002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('account-erasure:' || v_account_hash, 0));

  select * into v_existing
  from public.velmere_account_erasure_requests
  where account_id_hash = v_account_hash
    and idempotency_key_hash = p_idempotency_key_hash;
  if found then
    return to_jsonb(v_existing);
  end if;

  select * into v_existing
  from public.velmere_account_erasure_requests
  where account_id_hash = v_account_hash
    and state <> 'CANCELLED'
  order by requested_at desc
  limit 1;
  if found then
    raise exception 'account_erasure_active_request_exists' using errcode = 'VE003';
  end if;

  select * into v_export
  from public.velmere_account_data_exports
  where account_id = v_account_id
    and account_id_hash = v_account_hash
    and expires_at > now()
  order by generated_at desc, export_id
  limit 1;
  if not found then
    raise exception 'account_erasure_current_export_required' using errcode = 'VE001';
  end if;

  insert into public.velmere_account_erasure_requests(
    request_id, account_id, account_id_hash, idempotency_key_hash,
    export_id, export_payload_sha256, export_generated_at, export_expires_at
  ) values (
    p_request_id, v_account_id, v_account_hash, p_idempotency_key_hash,
    v_export.export_id, v_export.payload_sha256, v_export.generated_at, v_export.expires_at
  ) returning * into v_record;

  v_event_at := v_record.requested_at;
  v_event_binding := 'sha256:' || encode(digest(convert_to(
    'velmere-account-erasure-event-v1:' || v_record.request_id::text || ':'
    || v_record.account_id_hash || ':REQUESTED:' || v_event_at::text || ':'
    || v_record.export_payload_sha256,
    'utf8'
  ), 'sha256'), 'hex');
  insert into public.velmere_account_erasure_events(
    event_id, request_id, account_id_hash, event_type, event_binding_sha256, event_at
  ) values (
    gen_random_uuid(), v_record.request_id, v_record.account_id_hash,
    'REQUESTED', v_event_binding, v_event_at
  );

  return to_jsonb(v_record);
end;
$$;

revoke all on function public.velmere_request_account_erasure_v1(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_request_account_erasure_v1(uuid, text)
  to authenticated;

create or replace function public.velmere_confirm_account_erasure_session_revocation_v1(
  p_request_id uuid,
  p_account_id_hash text,
  p_revocation_receipt_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_record public.velmere_account_erasure_requests%rowtype;
  v_event_at timestamptz;
  v_event_binding text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'account_erasure_revocation_confirmation_forbidden' using errcode = '42501';
  end if;
  if p_request_id is null
     or p_account_id_hash !~ '^[a-f0-9]{64}$'
     or p_revocation_receipt_sha256 !~ '^sha256:[a-f0-9]{64}$' then
    raise exception 'account_erasure_revocation_confirmation_invalid' using errcode = '22023';
  end if;

  select * into v_record
  from public.velmere_account_erasure_requests
  where request_id = p_request_id
    and account_id_hash = p_account_id_hash
  for update;
  if not found then
    raise exception 'account_erasure_request_not_found' using errcode = 'VE005';
  end if;
  if v_record.state = 'CANCELLED' then
    raise exception 'account_erasure_request_cancelled' using errcode = 'VE004';
  end if;
  if v_record.session_revocation_state = 'CONFIRMED' then
    return to_jsonb(v_record);
  end if;

  v_event_at := now();
  update public.velmere_account_erasure_requests
  set state = 'POLICY_BLOCKED',
      session_revocation_state = 'CONFIRMED',
      session_revocation_receipt_sha256 = p_revocation_receipt_sha256,
      session_revocation_confirmed_at = v_event_at,
      updated_at = v_event_at
  where request_id = p_request_id
  returning * into v_record;

  v_event_binding := 'sha256:' || encode(digest(convert_to(
    'velmere-account-erasure-event-v1:' || v_record.request_id::text || ':'
    || v_record.account_id_hash || ':SESSION_REVOCATION_CONFIRMED:'
    || v_event_at::text || ':' || p_revocation_receipt_sha256,
    'utf8'
  ), 'sha256'), 'hex');
  insert into public.velmere_account_erasure_events(
    event_id, request_id, account_id_hash, event_type, event_binding_sha256, event_at
  ) values (
    gen_random_uuid(), v_record.request_id, v_record.account_id_hash,
    'SESSION_REVOCATION_CONFIRMED', v_event_binding, v_event_at
  );

  return to_jsonb(v_record);
end;
$$;

revoke all on function public.velmere_confirm_account_erasure_session_revocation_v1(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_confirm_account_erasure_session_revocation_v1(uuid, text, text)
  to service_role;

create or replace function public.velmere_cancel_account_erasure_v1(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_id text;
  v_account_hash text;
  v_record public.velmere_account_erasure_requests%rowtype;
  v_event_at timestamptz;
  v_event_binding text;
begin
  if auth.role() is distinct from 'authenticated' or auth.uid() is null then
    raise exception 'account_erasure_auth_required' using errcode = '42501';
  end if;
  if p_request_id is null then
    raise exception 'account_erasure_invalid_request' using errcode = '22023';
  end if;

  v_account_id := public.velmere_current_account_id();
  v_account_hash := public.velmere_current_account_binding_hash();
  if v_account_id is null or v_account_hash is null then
    raise exception 'account_erasure_account_unbound' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('account-erasure:' || v_account_hash, 0));
  select * into v_record
  from public.velmere_account_erasure_requests
  where request_id = p_request_id
    and account_id = v_account_id
    and account_id_hash = v_account_hash
  for update;
  if not found then
    raise exception 'account_erasure_request_not_found' using errcode = 'VE005';
  end if;
  if v_record.state = 'CANCELLED' then
    return to_jsonb(v_record);
  end if;

  v_event_at := now();
  update public.velmere_account_erasure_requests
  set state = 'CANCELLED', cancelled_at = v_event_at, updated_at = v_event_at
  where request_id = p_request_id
  returning * into v_record;

  v_event_binding := 'sha256:' || encode(digest(convert_to(
    'velmere-account-erasure-event-v1:' || v_record.request_id::text || ':'
    || v_record.account_id_hash || ':CANCELLED:' || v_event_at::text,
    'utf8'
  ), 'sha256'), 'hex');
  insert into public.velmere_account_erasure_events(
    event_id, request_id, account_id_hash, event_type, event_binding_sha256, event_at
  ) values (
    gen_random_uuid(), v_record.request_id, v_record.account_id_hash,
    'CANCELLED', v_event_binding, v_event_at
  );

  return to_jsonb(v_record);
end;
$$;

revoke all on function public.velmere_cancel_account_erasure_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_cancel_account_erasure_v1(uuid)
  to authenticated;

comment on table public.velmere_account_erasure_requests is
  'Owner-bound technical erasure requests. Rows prove request/cancel/status and export/session dependencies only. No data deletion, legal conclusion, retention policy, FINAL, staging, LIVE or sale credit.';
comment on function public.velmere_request_account_erasure_v1(uuid, text) is
  'Authenticated recent-login erasure request. Requires an exact unexpired account export and creates only a policy-blocked request; it never deletes data.';
comment on function public.velmere_confirm_account_erasure_session_revocation_v1(uuid, text, text) is
  'Service-role-only confirmation of a server-executed global session revocation. It advances only to POLICY_BLOCKED and cannot authorize deletion.';

commit;
