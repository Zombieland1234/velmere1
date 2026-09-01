-- PASS4802: cross-instance provider quota/circuit state.
-- Service-role only. One atomic lease per outbound provider attempt.

create table if not exists public.velmere_provider_reliability_state (
  endpoint_key text primary key,
  provider_id text not null,
  endpoint_id text not null,
  quota_window_started_at timestamptz not null,
  quota_used integer not null default 0 check (quota_used >= 0),
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  opened_at timestamptz,
  half_open_lease_id uuid,
  half_open_lease_expires_at timestamptz,
  state_version bigint not null default 0 check (state_version >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.velmere_provider_reliability_leases (
  lease_id uuid primary key,
  endpoint_key text not null references public.velmere_provider_reliability_state(endpoint_key) on delete cascade,
  request_id_hash text not null check (request_id_hash ~ '^[a-f0-9]{64}$'),
  lease_mode text not null check (lease_mode in ('normal','half_open')),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  settled_at timestamptz,
  success boolean,
  provider_failure boolean,
  unique(endpoint_key, request_id_hash)
);

create index if not exists velmere_provider_reliability_leases_endpoint_idx
  on public.velmere_provider_reliability_leases(endpoint_key, issued_at desc);
create index if not exists velmere_provider_reliability_leases_unsettled_idx
  on public.velmere_provider_reliability_leases(expires_at)
  where settled_at is null;

alter table public.velmere_provider_reliability_state enable row level security;
alter table public.velmere_provider_reliability_leases enable row level security;
revoke all on public.velmere_provider_reliability_state from public, anon, authenticated;
revoke all on public.velmere_provider_reliability_leases from public, anon, authenticated;
grant select, insert, update, delete on public.velmere_provider_reliability_state to service_role;
grant select, insert, update, delete on public.velmere_provider_reliability_leases to service_role;

create or replace function public.velmere_acquire_provider_reliability_lease(
  p_provider_id text,
  p_endpoint_id text,
  p_request_id_hash text,
  p_quota_limit integer,
  p_quota_window_seconds integer,
  p_cooldown_seconds integer,
  p_lease_seconds integer,
  p_now timestamptz default now()
)
returns table(
  allowed boolean,
  reason text,
  lease_id uuid,
  circuit_state text,
  consecutive_failures integer,
  quota_limit integer,
  quota_remaining integer,
  quota_reset_at timestamptz,
  state_version bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_id text := lower(trim(coalesce(p_provider_id, '')));
  v_endpoint_id text := lower(trim(coalesce(p_endpoint_id, '')));
  v_endpoint_key text;
  v_state public.velmere_provider_reliability_state%rowtype;
  v_existing public.velmere_provider_reliability_leases%rowtype;
  v_lease_id uuid;
  v_mode text := 'normal';
  v_quota_limit integer := greatest(1, least(coalesce(p_quota_limit, 120), 1000000));
  v_quota_window_seconds integer := greatest(1, least(coalesce(p_quota_window_seconds, 60), 86400));
  v_cooldown_seconds integer := greatest(1, least(coalesce(p_cooldown_seconds, 30), 86400));
  v_lease_seconds integer := greatest(1, least(coalesce(p_lease_seconds, 15), 120));
  v_now timestamptz := coalesce(p_now, now());
begin
  if v_provider_id !~ '^[a-z0-9][a-z0-9:._/-]{0,119}$'
     or v_endpoint_id !~ '^[a-z0-9][a-z0-9:._/-]{0,119}$'
     or p_request_id_hash !~ '^[a-f0-9]{64}$' then
    return query select false, 'invalid_request', null::uuid, 'open', 0, v_quota_limit, 0, v_now, 0::bigint;
    return;
  end if;

  v_endpoint_key := v_provider_id || '::' || v_endpoint_id;
  perform pg_advisory_xact_lock(hashtextextended('provider-reliability:' || v_endpoint_key, 4802));

  insert into public.velmere_provider_reliability_state(
    endpoint_key, provider_id, endpoint_id, quota_window_started_at
  ) values (
    v_endpoint_key, v_provider_id, v_endpoint_id, v_now
  ) on conflict(endpoint_key) do nothing;

  select * into v_state
  from public.velmere_provider_reliability_state
  where endpoint_key = v_endpoint_key
  for update;

  if v_state.quota_window_started_at + make_interval(secs => v_quota_window_seconds) <= v_now then
    v_state.quota_window_started_at := v_now;
    v_state.quota_used := 0;
  end if;

  if v_state.half_open_lease_expires_at is not null and v_state.half_open_lease_expires_at <= v_now then
    v_state.half_open_lease_id := null;
    v_state.half_open_lease_expires_at := null;
  end if;

  delete from public.velmere_provider_reliability_leases
  where endpoint_key = v_endpoint_key
    and settled_at is null
    and expires_at < v_now - interval '7 days';

  select * into v_existing
  from public.velmere_provider_reliability_leases
  where endpoint_key = v_endpoint_key and request_id_hash = p_request_id_hash;

  if found then
    return query select
      v_existing.settled_at is null and v_existing.expires_at > v_now,
      case when v_existing.settled_at is null and v_existing.expires_at > v_now then null::text else 'request_replayed' end,
      v_existing.lease_id,
      case when v_state.opened_at is null then 'closed' when v_state.half_open_lease_id is not null then 'half_open' else 'open' end,
      v_state.consecutive_failures,
      v_quota_limit,
      greatest(0, v_quota_limit - v_state.quota_used),
      v_state.quota_window_started_at + make_interval(secs => v_quota_window_seconds),
      v_state.state_version;
    return;
  end if;

  if v_state.opened_at is not null then
    if v_state.opened_at + make_interval(secs => v_cooldown_seconds) > v_now then
      update public.velmere_provider_reliability_state set
        quota_window_started_at = v_state.quota_window_started_at,
        quota_used = v_state.quota_used,
        half_open_lease_id = v_state.half_open_lease_id,
        half_open_lease_expires_at = v_state.half_open_lease_expires_at,
        updated_at = v_now
      where endpoint_key = v_endpoint_key;
      return query select false, 'circuit_open', null::uuid, 'open', v_state.consecutive_failures,
        v_quota_limit, greatest(0, v_quota_limit - v_state.quota_used),
        v_state.quota_window_started_at + make_interval(secs => v_quota_window_seconds), v_state.state_version;
      return;
    end if;
    if v_state.half_open_lease_id is not null then
      return query select false, 'half_open_busy', null::uuid, 'half_open', v_state.consecutive_failures,
        v_quota_limit, greatest(0, v_quota_limit - v_state.quota_used),
        v_state.quota_window_started_at + make_interval(secs => v_quota_window_seconds), v_state.state_version;
      return;
    end if;
    v_mode := 'half_open';
  end if;

  if v_state.quota_used >= v_quota_limit then
    update public.velmere_provider_reliability_state set
      quota_window_started_at = v_state.quota_window_started_at,
      quota_used = v_state.quota_used,
      half_open_lease_id = v_state.half_open_lease_id,
      half_open_lease_expires_at = v_state.half_open_lease_expires_at,
      updated_at = v_now
    where endpoint_key = v_endpoint_key;
    return query select false, 'quota_limited', null::uuid,
      case when v_state.opened_at is null then 'closed' when v_state.half_open_lease_id is not null then 'half_open' else 'open' end,
      v_state.consecutive_failures, v_quota_limit, 0,
      v_state.quota_window_started_at + make_interval(secs => v_quota_window_seconds), v_state.state_version;
    return;
  end if;

  v_lease_id := gen_random_uuid();
  v_state.quota_used := v_state.quota_used + 1;
  v_state.state_version := v_state.state_version + 1;
  if v_mode = 'half_open' then
    v_state.half_open_lease_id := v_lease_id;
    v_state.half_open_lease_expires_at := v_now + make_interval(secs => v_lease_seconds);
  end if;

  update public.velmere_provider_reliability_state set
    quota_window_started_at = v_state.quota_window_started_at,
    quota_used = v_state.quota_used,
    half_open_lease_id = v_state.half_open_lease_id,
    half_open_lease_expires_at = v_state.half_open_lease_expires_at,
    state_version = v_state.state_version,
    updated_at = v_now
  where endpoint_key = v_endpoint_key;

  insert into public.velmere_provider_reliability_leases(
    lease_id, endpoint_key, request_id_hash, lease_mode, issued_at, expires_at
  ) values (
    v_lease_id, v_endpoint_key, p_request_id_hash, v_mode, v_now,
    v_now + make_interval(secs => v_lease_seconds)
  );

  return query select true, null::text, v_lease_id,
    case when v_mode = 'half_open' then 'half_open' else case when v_state.opened_at is null then 'closed' else 'open' end end,
    v_state.consecutive_failures, v_quota_limit,
    greatest(0, v_quota_limit - v_state.quota_used),
    v_state.quota_window_started_at + make_interval(secs => v_quota_window_seconds),
    v_state.state_version;
end;
$$;

create or replace function public.velmere_settle_provider_reliability_lease(
  p_lease_id uuid,
  p_success boolean,
  p_provider_failure boolean,
  p_failure_threshold integer,
  p_completed_at timestamptz default now()
)
returns table(
  settled boolean,
  reason text,
  circuit_state text,
  consecutive_failures integer,
  state_version bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lease public.velmere_provider_reliability_leases%rowtype;
  v_state public.velmere_provider_reliability_state%rowtype;
  v_threshold integer := greatest(1, least(coalesce(p_failure_threshold, 3), 100));
  v_completed_at timestamptz := coalesce(p_completed_at, now());
begin
  if p_lease_id is null then
    return query select false, 'lease_missing', 'open', 0, 0::bigint;
    return;
  end if;

  select * into v_lease
  from public.velmere_provider_reliability_leases
  where lease_id = p_lease_id
  for update;

  if not found then
    return query select false, 'lease_not_found', 'open', 0, 0::bigint;
    return;
  end if;

  select * into v_state
  from public.velmere_provider_reliability_state
  where endpoint_key = v_lease.endpoint_key
  for update;

  if not found then
    return query select false, 'state_not_found', 'open', 0, 0::bigint;
    return;
  end if;

  if v_lease.settled_at is not null then
    return query select true, null::text,
      case when v_state.opened_at is null then 'closed' when v_state.half_open_lease_id is not null then 'half_open' else 'open' end,
      v_state.consecutive_failures, v_state.state_version;
    return;
  end if;

  if v_lease.expires_at <= v_completed_at then
    if v_state.half_open_lease_id = v_lease.lease_id then
      v_state.half_open_lease_id := null;
      v_state.half_open_lease_expires_at := null;
    end if;
    v_state.state_version := v_state.state_version + 1;
    update public.velmere_provider_reliability_state set
      half_open_lease_id = v_state.half_open_lease_id,
      half_open_lease_expires_at = v_state.half_open_lease_expires_at,
      state_version = v_state.state_version,
      updated_at = v_completed_at
    where endpoint_key = v_lease.endpoint_key;
    update public.velmere_provider_reliability_leases set
      settled_at = v_completed_at,
      success = false,
      provider_failure = false
    where lease_id = v_lease.lease_id;
    return query select false, 'lease_expired',
      case when v_state.opened_at is null then 'closed' when v_state.half_open_lease_id is not null then 'half_open' else 'open' end,
      v_state.consecutive_failures, v_state.state_version;
    return;
  end if;

  if coalesce(p_success, false) then
    v_state.consecutive_failures := 0;
    v_state.opened_at := null;
  elsif coalesce(p_provider_failure, false) then
    v_state.consecutive_failures := v_state.consecutive_failures + 1;
    if v_state.consecutive_failures >= v_threshold then
      v_state.opened_at := v_completed_at;
    end if;
  end if;

  if v_state.half_open_lease_id = v_lease.lease_id then
    v_state.half_open_lease_id := null;
    v_state.half_open_lease_expires_at := null;
  end if;
  v_state.state_version := v_state.state_version + 1;

  update public.velmere_provider_reliability_state set
    consecutive_failures = v_state.consecutive_failures,
    opened_at = v_state.opened_at,
    half_open_lease_id = v_state.half_open_lease_id,
    half_open_lease_expires_at = v_state.half_open_lease_expires_at,
    state_version = v_state.state_version,
    updated_at = v_completed_at
  where endpoint_key = v_lease.endpoint_key;

  update public.velmere_provider_reliability_leases set
    settled_at = v_completed_at,
    success = coalesce(p_success, false),
    provider_failure = coalesce(p_provider_failure, false)
  where lease_id = v_lease.lease_id;

  delete from public.velmere_provider_reliability_leases
  where settled_at is not null and settled_at < v_completed_at - interval '7 days';

  return query select true, null::text,
    case when v_state.opened_at is null then 'closed' when v_state.half_open_lease_id is not null then 'half_open' else 'open' end,
    v_state.consecutive_failures, v_state.state_version;
end;
$$;

revoke all on function public.velmere_acquire_provider_reliability_lease(text,text,text,integer,integer,integer,integer,timestamptz)
  from public, anon, authenticated;
revoke all on function public.velmere_settle_provider_reliability_lease(uuid,boolean,boolean,integer,timestamptz)
  from public, anon, authenticated;
grant execute on function public.velmere_acquire_provider_reliability_lease(text,text,text,integer,integer,integer,integer,timestamptz)
  to service_role;
grant execute on function public.velmere_settle_provider_reliability_lease(uuid,boolean,boolean,integer,timestamptz)
  to service_role;

comment on function public.velmere_acquire_provider_reliability_lease(text,text,text,integer,integer,integer,integer,timestamptz)
is 'PASS4802 atomic cross-instance provider quota and circuit admission. Raw provider payloads are not stored.';
comment on function public.velmere_settle_provider_reliability_lease(uuid,boolean,boolean,integer,timestamptz)
is 'PASS4802 idempotent lease settlement that updates shared circuit health without counting local quota/concurrency failures as provider failures.';
