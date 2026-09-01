-- PASS4707: incident resolution and support workflow enqueue must commit atomically.
create table if not exists public.velmere_fulfilment_incident_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  case_id text not null,
  order_draft_id text,
  event_type text not null,
  status text not null default 'pending',
  resolution text not null,
  operator_fingerprint text not null,
  request_id text not null unique,
  redacted_payload jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_fulfilment_incident_outbox_status_check
    check (status in ('pending','processing','delivered','retryable_failed','dead_letter')),
  constraint velmere_fulfilment_incident_outbox_resolution_check
    check (resolution in ('provider_draft_confirmed','manual_fulfilment_assigned','order_cancelled_refund_pending','false_positive_closed'))
);

create index if not exists velmere_fulfilment_incident_outbox_pending_idx
  on public.velmere_fulfilment_incident_outbox(status, next_attempt_at, created_at)
  where status in ('pending','retryable_failed');

alter table public.velmere_fulfilment_incident_outbox enable row level security;
revoke all on table public.velmere_fulfilment_incident_outbox from public, anon, authenticated;
grant select, insert, update on table public.velmere_fulfilment_incident_outbox to service_role;

create or replace function public.velmere_resolve_fulfilment_incident(
  p_case_id text,
  p_resolution text,
  p_request_id text,
  p_operator_fingerprint text
)
returns table(status text, outbox_event_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident public.velmere_fulfilment_incidents%rowtype;
  v_event_id text;
begin
  if p_resolution not in (
    'provider_draft_confirmed',
    'manual_fulfilment_assigned',
    'order_cancelled_refund_pending',
    'false_positive_closed'
  ) then
    raise exception 'invalid_resolution';
  end if;

  select * into v_incident
  from public.velmere_fulfilment_incidents
  where case_id = p_case_id
  for update;

  if not found then
    return query select 'not_found'::text, null::text;
    return;
  end if;

  select event_id into v_event_id
  from public.velmere_fulfilment_incident_outbox
  where request_id = p_request_id;

  if v_event_id is not null then
    return query select 'already_resolved'::text, v_event_id;
    return;
  end if;

  if v_incident.status = 'resolved' then
    return query select 'conflict'::text, null::text;
    return;
  end if;

  v_event_id := 'fulfilment_outbox_' || substr(
    encode(digest(p_case_id || ':' || p_request_id || ':' || p_resolution, 'sha256'), 'hex'),
    1,
    24
  );

  update public.velmere_fulfilment_incidents
  set status = 'resolved',
      decision = p_resolution,
      updated_at = now()
  where case_id = p_case_id;

  insert into public.velmere_fulfilment_incident_outbox (
    event_id,
    case_id,
    order_draft_id,
    event_type,
    resolution,
    operator_fingerprint,
    request_id,
    redacted_payload
  ) values (
    v_event_id,
    p_case_id,
    v_incident.order_draft_id,
    'fulfilment_incident_resolved',
    p_resolution,
    p_operator_fingerprint,
    p_request_id,
    jsonb_build_object(
      'caseId', p_case_id,
      'orderDraftId', v_incident.order_draft_id,
      'resolution', p_resolution
    )
  );

  return query select 'resolved'::text, v_event_id;
end;
$$;

revoke all on function public.velmere_resolve_fulfilment_incident(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.velmere_resolve_fulfilment_incident(text, text, text, text)
  to service_role;
