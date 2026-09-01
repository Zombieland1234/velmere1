-- PASS4752: idempotent paid-entitlement lifecycle for expiry, refund, chargeback,
-- manual revoke and controlled restore. Service-role only. No raw operator/reason IDs.

alter table public.velmere_vlm_paid_entitlements
  drop constraint if exists velmere_vlm_paid_entitlements_status_check;
alter table public.velmere_vlm_paid_entitlements
  add constraint velmere_vlm_paid_entitlements_status_check
  check (status in ('paid','active','expired','refunded','revoked','consumed'));

create table if not exists public.velmere_vlm_paid_entitlement_events (
  id uuid primary key default gen_random_uuid(),
  entitlement_id text not null references public.velmere_vlm_paid_entitlements(id) on delete restrict,
  event_id_hash text not null,
  event_type text not null check (event_type in ('expire','refund','chargeback','manual_revoke','restore')),
  previous_status text not null,
  next_status text not null,
  source_event_hash text,
  operator_hash text,
  reason_hash text,
  event_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(event_id_hash)
);

create index if not exists velmere_vlm_paid_entitlement_events_entitlement_idx
  on public.velmere_vlm_paid_entitlement_events(entitlement_id, created_at desc);
create index if not exists velmere_vlm_paid_entitlement_events_source_idx
  on public.velmere_vlm_paid_entitlement_events(source_event_hash)
  where source_event_hash is not null;

alter table public.velmere_vlm_paid_entitlement_events enable row level security;
revoke all on table public.velmere_vlm_paid_entitlement_events from public, anon, authenticated;
grant select, insert on table public.velmere_vlm_paid_entitlement_events to service_role;

create or replace function public.velmere_apply_vlm_paid_entitlement_lifecycle_event(
  p_entitlement_id text,
  p_event_id_hash text,
  p_event_type text,
  p_source_event_hash text default null,
  p_operator_hash text default null,
  p_reason_hash text default null,
  p_event_at timestamptz default now()
)
returns table(
  ok boolean,
  error text,
  retryable boolean,
  idempotent boolean,
  event_type text,
  previous_status text,
  next_status text,
  entitlement_id_hash text,
  event_id_hash text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.velmere_vlm_paid_entitlements%rowtype;
  v_existing public.velmere_vlm_paid_entitlement_events%rowtype;
  v_next_status text;
begin
  if p_entitlement_id is null or length(trim(p_entitlement_id)) < 1
     or p_event_id_hash !~ '^[a-f0-9]{64}$'
     or p_event_type not in ('expire','refund','chargeback','manual_revoke','restore') then
    return query select false, 'invalid_entitlement_lifecycle_request', false, false,
      p_event_type, null::text, null::text, null::text, p_event_id_hash;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('vlm-entitlement:' || p_entitlement_id, 4752));

  select * into v_existing
  from public.velmere_vlm_paid_entitlement_events
  where event_id_hash = p_event_id_hash;

  if found then
    return query select true, null::text, false, true,
      v_existing.event_type,
      v_existing.previous_status,
      v_existing.next_status,
      encode(digest(v_existing.entitlement_id, 'sha256'), 'hex'),
      v_existing.event_id_hash;
    return;
  end if;

  select * into v_entitlement
  from public.velmere_vlm_paid_entitlements
  where id = p_entitlement_id
  for update;

  if not found then
    return query select false, 'entitlement_not_found', false, false,
      p_event_type, null::text, null::text,
      encode(digest(p_entitlement_id, 'sha256'), 'hex'), p_event_id_hash;
    return;
  end if;

  v_next_status := case
    when p_event_type = 'expire' and v_entitlement.status in ('paid','active') then 'expired'
    when p_event_type = 'expire' and v_entitlement.status = 'expired' then 'expired'
    when p_event_type = 'refund' and v_entitlement.status in ('paid','active','expired') then 'refunded'
    when p_event_type = 'refund' and v_entitlement.status = 'refunded' then 'refunded'
    when p_event_type in ('chargeback','manual_revoke') and v_entitlement.status in ('paid','active','expired','refunded') then 'revoked'
    when p_event_type in ('chargeback','manual_revoke') and v_entitlement.status = 'revoked' then 'revoked'
    when p_event_type = 'restore' and v_entitlement.status in ('expired','refunded','revoked') then 'active'
    when p_event_type = 'restore' and v_entitlement.status = 'active' then 'active'
    else null
  end;

  if v_next_status is null then
    return query select false, 'invalid_entitlement_state_transition', false, false,
      p_event_type, v_entitlement.status, null::text,
      encode(digest(v_entitlement.id, 'sha256'), 'hex'), p_event_id_hash;
    return;
  end if;

  if v_next_status <> v_entitlement.status then
    update public.velmere_vlm_paid_entitlements
      set status = v_next_status,
          updated_at = greatest(coalesce(p_event_at, now()), updated_at)
      where id = v_entitlement.id;
  end if;

  insert into public.velmere_vlm_paid_entitlement_events(
    entitlement_id, event_id_hash, event_type, previous_status, next_status,
    source_event_hash, operator_hash, reason_hash, event_at
  ) values (
    v_entitlement.id, p_event_id_hash, p_event_type, v_entitlement.status, v_next_status,
    case when p_source_event_hash ~ '^[a-f0-9]{64}$' then p_source_event_hash else null end,
    case when p_operator_hash ~ '^[a-f0-9]{64}$' then p_operator_hash else null end,
    case when p_reason_hash ~ '^[a-f0-9]{64}$' then p_reason_hash else null end,
    coalesce(p_event_at, now())
  );

  return query select true, null::text, false, v_next_status = v_entitlement.status,
    p_event_type, v_entitlement.status, v_next_status,
    encode(digest(v_entitlement.id, 'sha256'), 'hex'), p_event_id_hash;
exception
  when unique_violation then
    select * into v_existing
    from public.velmere_vlm_paid_entitlement_events
    where event_id_hash = p_event_id_hash;
    return query select true, null::text, false, true,
      v_existing.event_type, v_existing.previous_status, v_existing.next_status,
      encode(digest(v_existing.entitlement_id, 'sha256'), 'hex'), v_existing.event_id_hash;
  when others then
    return query select false, 'entitlement_lifecycle_store_failed', true, false,
      p_event_type, null::text, null::text,
      encode(digest(coalesce(p_entitlement_id,''), 'sha256'), 'hex'), p_event_id_hash;
end;
$$;

revoke all on function public.velmere_apply_vlm_paid_entitlement_lifecycle_event(text,text,text,text,text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.velmere_apply_vlm_paid_entitlement_lifecycle_event(text,text,text,text,text,text,timestamptz)
  to service_role;

comment on function public.velmere_apply_vlm_paid_entitlement_lifecycle_event(text,text,text,text,text,text,timestamptz)
is 'PASS4752 service-role-only idempotent entitlement lifecycle transition. Operator, reason and provider event values are stored only as SHA-256 hashes.';
