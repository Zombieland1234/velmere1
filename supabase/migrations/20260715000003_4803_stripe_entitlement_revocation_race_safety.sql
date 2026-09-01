-- PASS4803: Stripe refund/chargeback -> paid entitlement revocation, replay safety,
-- irreversible chargeback/manual revoke, and a durable release-hold receipt.

create unique index if not exists velmere_vlm_paid_entitlement_events_source_unique
  on public.velmere_vlm_paid_entitlement_events(source_event_hash)
  where source_event_hash is not null;

create table if not exists public.velmere_vlm_paid_entitlement_release_holds (
  entitlement_id text primary key references public.velmere_vlm_paid_entitlements(id) on delete restrict,
  entitlement_id_hash text not null check (entitlement_id_hash ~ '^[a-f0-9]{64}$'),
  blocked boolean not null,
  terminal_event_type text check (terminal_event_type is null or terminal_event_type in ('refund','chargeback','manual_revoke')),
  source_event_hash text,
  updated_at timestamptz not null default now()
);

create index if not exists velmere_vlm_paid_entitlement_release_holds_blocked_idx
  on public.velmere_vlm_paid_entitlement_release_holds(blocked, updated_at desc);

alter table public.velmere_vlm_paid_entitlement_release_holds enable row level security;
revoke all on table public.velmere_vlm_paid_entitlement_release_holds from public, anon, authenticated;
grant select, insert, update on table public.velmere_vlm_paid_entitlement_release_holds to service_role;

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
  v_event_at timestamptz := coalesce(p_event_at, now());
begin
  if p_entitlement_id is null or length(trim(p_entitlement_id)) < 1
     or p_event_id_hash !~ '^[a-f0-9]{64}$'
     or p_event_type not in ('expire','refund','chargeback','manual_revoke','restore') then
    return query select false, 'invalid_entitlement_lifecycle_request', false, false,
      p_event_type, null::text, null::text, null::text, p_event_id_hash;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('vlm-entitlement:' || p_entitlement_id, 4803));

  select * into v_existing
  from public.velmere_vlm_paid_entitlement_events
  where event_id_hash = p_event_id_hash
     or (p_source_event_hash is not null and source_event_hash = p_source_event_hash)
  order by created_at asc
  limit 1;

  if found then
    return query select true, null::text, false, true,
      v_existing.event_type, v_existing.previous_status, v_existing.next_status,
      encode(digest(v_existing.entitlement_id, 'sha256'), 'hex'), v_existing.event_id_hash;
    return;
  end if;

  select * into v_entitlement
  from public.velmere_vlm_paid_entitlements
  where id = p_entitlement_id
  for update;

  if not found then
    return query select false, 'entitlement_not_found', true, false,
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
    -- PASS4803: a chargeback/manual revoke is irreversible through this generic
    -- lifecycle RPC. A future re-grant must create a new entitlement and evidence chain.
    when p_event_type = 'restore' and v_entitlement.status = 'expired' then 'active'
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
          payment_status = case
            when p_event_type = 'refund' then 'refunded'
            when p_event_type = 'chargeback' then 'chargeback'
            when p_event_type = 'manual_revoke' then coalesce(payment_status, 'paid')
            else payment_status
          end,
          updated_at = greatest(v_event_at, updated_at)
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
    v_event_at
  );

  if p_event_type in ('refund','chargeback','manual_revoke') then
    insert into public.velmere_vlm_paid_entitlement_release_holds(
      entitlement_id, entitlement_id_hash, blocked, terminal_event_type, source_event_hash, updated_at
    ) values (
      v_entitlement.id, encode(digest(v_entitlement.id, 'sha256'), 'hex'), true,
      p_event_type, case when p_source_event_hash ~ '^[a-f0-9]{64}$' then p_source_event_hash else null end,
      v_event_at
    )
    on conflict (entitlement_id) do update
      set blocked = true,
          terminal_event_type = excluded.terminal_event_type,
          source_event_hash = excluded.source_event_hash,
          updated_at = greatest(public.velmere_vlm_paid_entitlement_release_holds.updated_at, excluded.updated_at);
  elsif p_event_type = 'restore' then
    update public.velmere_vlm_paid_entitlement_release_holds
      set blocked = false, terminal_event_type = null, source_event_hash = null, updated_at = v_event_at
      where entitlement_id = v_entitlement.id;
  end if;

  return query select true, null::text, false, v_next_status = v_entitlement.status,
    p_event_type, v_entitlement.status, v_next_status,
    encode(digest(v_entitlement.id, 'sha256'), 'hex'), p_event_id_hash;
exception
  when unique_violation then
    select * into v_existing
    from public.velmere_vlm_paid_entitlement_events
    where event_id_hash = p_event_id_hash
       or (p_source_event_hash is not null and source_event_hash = p_source_event_hash)
    order by created_at asc
    limit 1;
    if found then
      return query select true, null::text, false, true,
        v_existing.event_type, v_existing.previous_status, v_existing.next_status,
        encode(digest(v_existing.entitlement_id, 'sha256'), 'hex'), v_existing.event_id_hash;
      return;
    end if;
    return query select false, 'entitlement_lifecycle_conflict', true, false,
      p_event_type, null::text, null::text,
      encode(digest(coalesce(p_entitlement_id,''), 'sha256'), 'hex'), p_event_id_hash;
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
