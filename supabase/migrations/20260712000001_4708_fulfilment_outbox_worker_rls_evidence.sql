-- PASS4708: enforce resolution-specific evidence and drain the fulfilment incident
-- outbox with a globally leased, bounded, service-role-only worker.

alter table public.velmere_fulfilment_incident_outbox
  add column if not exists lease_token text,
  add column if not exists claimed_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists dead_lettered_at timestamptz,
  add column if not exists dead_letter_reason_code text,
  add column if not exists delivery_receipt jsonb,
  add column if not exists run_id text;

create table if not exists public.velmere_fulfilment_outbox_worker_lease (
  singleton_id smallint primary key default 1 check (singleton_id = 1),
  lease_token text,
  run_id text,
  claimed_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.velmere_fulfilment_outbox_worker_lease(singleton_id)
values (1) on conflict (singleton_id) do nothing;

create table if not exists public.velmere_fulfilment_outbox_worker_runs (
  run_id text primary key,
  lease_token_hash text not null,
  lease_acquired boolean not null,
  claimed_count integer not null default 0,
  delivered_count integer not null default 0,
  retryable_failed_count integer not null default 0,
  dead_lettered_count integer not null default 0,
  skipped_by_deadline_count integer not null default 0,
  severity text not null check (severity in ('none','warning','critical')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.velmere_fulfilment_outbox_worker_lease enable row level security;
alter table public.velmere_fulfilment_outbox_worker_runs enable row level security;
revoke all on table public.velmere_fulfilment_outbox_worker_lease from public, anon, authenticated;
revoke all on table public.velmere_fulfilment_outbox_worker_runs from public, anon, authenticated;
grant select, insert, update on table public.velmere_fulfilment_outbox_worker_lease to service_role;
grant select, insert, update on table public.velmere_fulfilment_outbox_worker_runs to service_role;

create or replace function public.velmere_resolve_fulfilment_incident(
  p_case_id text,
  p_resolution text,
  p_request_id text,
  p_operator_fingerprint text,
  p_evidence jsonb
)
returns table(status text, outbox_event_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident public.velmere_fulfilment_incidents%rowtype;
  v_event_id text;
  v_existing_resolution text;
begin
  if p_resolution not in (
    'provider_draft_confirmed',
    'manual_fulfilment_assigned',
    'order_cancelled_refund_pending',
    'false_positive_closed'
  ) then raise exception 'invalid_resolution'; end if;
  if p_evidence is null or jsonb_typeof(p_evidence) <> 'object' then
    raise exception 'invalid_evidence';
  end if;
  if octet_length(p_evidence::text) > 4096 then raise exception 'evidence_too_large'; end if;
  if p_evidence ?| array['rawProviderPayload','customerDetails','email','phone','address','token','secret','authorization'] then
    raise exception 'unsafe_evidence_key';
  end if;

  if p_resolution = 'provider_draft_confirmed' and (
    coalesce(p_evidence->>'providerOrderId','') = '' or
    coalesce(p_evidence->>'providerStatus','') not in ('draft','pending','confirmed','inprocess')
  ) then raise exception 'missing_provider_evidence'; end if;

  if p_resolution = 'manual_fulfilment_assigned' and (
    coalesce(p_evidence->>'assignmentReference','') = '' or
    coalesce(p_evidence->>'assigneeFingerprint','') = ''
  ) then raise exception 'missing_assignment_evidence'; end if;

  if p_resolution = 'order_cancelled_refund_pending' and (
    coalesce(p_evidence->>'paymentActionReference','') = '' or
    coalesce(p_evidence->>'refundState','') <> 'pending'
  ) then raise exception 'missing_refund_evidence'; end if;

  if p_resolution = 'false_positive_closed' and (
    coalesce(p_evidence->>'evidenceReference','') = '' or
    coalesce(p_evidence->>'reasonCode','') = ''
  ) then raise exception 'missing_closure_evidence'; end if;

  select * into v_incident
  from public.velmere_fulfilment_incidents
  where case_id = p_case_id
  for update;

  if not found then
    return query select 'not_found'::text, null::text;
    return;
  end if;

  select event_id, resolution into v_event_id, v_existing_resolution
  from public.velmere_fulfilment_incident_outbox
  where request_id = p_request_id;

  if v_event_id is not null then
    if v_existing_resolution = p_resolution then
      return query select 'already_resolved'::text, v_event_id;
    else
      return query select 'conflict'::text, null::text;
    end if;
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
  set status = 'resolved', decision = p_resolution, updated_at = now()
  where case_id = p_case_id;

  insert into public.velmere_fulfilment_incident_outbox (
    event_id, case_id, order_draft_id, event_type, resolution,
    operator_fingerprint, request_id, redacted_payload
  ) values (
    v_event_id, p_case_id, v_incident.order_draft_id,
    'fulfilment_incident_resolved', p_resolution,
    p_operator_fingerprint, p_request_id, p_evidence
  );

  return query select 'resolved'::text, v_event_id;
end;
$$;

revoke all on function public.velmere_resolve_fulfilment_incident(text,text,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.velmere_resolve_fulfilment_incident(text,text,text,text,jsonb)
  to service_role;
revoke all on function public.velmere_resolve_fulfilment_incident(text,text,text,text)
  from public, anon, authenticated;
drop function if exists public.velmere_resolve_fulfilment_incident(text,text,text,text);

create or replace function public.velmere_claim_fulfilment_incident_outbox_worker(
  p_run_id text,
  p_lease_token text,
  p_limit integer,
  p_stale_after_seconds integer,
  p_retry_threshold integer
)
returns table(
  worker_lease_acquired boolean,
  event_id text,
  case_id text,
  order_draft_id text,
  resolution text,
  redacted_payload jsonb,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_lease_acquired boolean := false;
  v_row public.velmere_fulfilment_incident_outbox%rowtype;
  v_count integer := 0;
begin
  if p_run_id is null or length(p_run_id) > 120 then raise exception 'invalid_run_id'; end if;
  if p_lease_token is null or length(p_lease_token) < 16 or length(p_lease_token) > 120 then raise exception 'invalid_lease_token'; end if;
  p_limit := greatest(1, least(coalesce(p_limit,25),100));
  p_stale_after_seconds := greatest(60, least(coalesce(p_stale_after_seconds,300),86400));
  p_retry_threshold := greatest(2, least(coalesce(p_retry_threshold,5),20));

  update public.velmere_fulfilment_outbox_worker_lease
  set lease_token = p_lease_token,
      run_id = p_run_id,
      claimed_at = v_now,
      expires_at = v_now + make_interval(secs => p_stale_after_seconds),
      updated_at = v_now
  where singleton_id = 1
    and (expires_at is null or expires_at <= v_now or lease_token = p_lease_token);
  get diagnostics v_count = row_count;
  v_lease_acquired := v_count = 1;

  insert into public.velmere_fulfilment_outbox_worker_runs(
    run_id, lease_token_hash, lease_acquired, severity
  ) values (
    p_run_id, encode(digest(p_lease_token,'sha256'),'hex'), v_lease_acquired, 'none'
  ) on conflict(run_id) do nothing;

  if not v_lease_acquired then
    return query select false, null::text, null::text, null::text, null::text, null::jsonb, null::integer;
    return;
  end if;

  update public.velmere_fulfilment_incident_outbox
  set status = 'retryable_failed',
      lease_token = null,
      claimed_at = null,
      next_attempt_at = v_now,
      last_error_code = 'stale_worker_lease_released',
      updated_at = v_now
  where status = 'processing'
    and claimed_at < v_now - make_interval(secs => p_stale_after_seconds);

  v_count := 0;
  for v_row in
    select * from public.velmere_fulfilment_incident_outbox
    where status in ('pending','retryable_failed')
      and coalesce(next_attempt_at, created_at) <= v_now
      and attempt_count < p_retry_threshold
    order by created_at asc
    for update skip locked
    limit p_limit
  loop
    update public.velmere_fulfilment_incident_outbox
    set status = 'processing',
        attempt_count = attempt_count + 1,
        lease_token = p_lease_token,
        claimed_at = v_now,
        run_id = p_run_id,
        next_attempt_at = null,
        updated_at = v_now
    where id = v_row.id
    returning * into v_row;
    v_count := v_count + 1;
    return query select true, v_row.event_id, v_row.case_id, v_row.order_draft_id,
      v_row.resolution, v_row.redacted_payload, v_row.attempt_count;
  end loop;

  if v_count = 0 then
    return query select true, null::text, null::text, null::text, null::text, null::jsonb, null::integer;
  end if;
end;
$$;

create or replace function public.velmere_complete_fulfilment_incident_outbox_event(
  p_event_id text,
  p_lease_token text,
  p_delivery_receipt jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_updated integer := 0;
begin
  if p_delivery_receipt is null or octet_length(p_delivery_receipt::text) > 4096 then
    raise exception 'invalid_delivery_receipt';
  end if;
  update public.velmere_fulfilment_incident_outbox
  set status = 'delivered',
      delivery_receipt = p_delivery_receipt,
      delivered_at = now(),
      lease_token = null,
      claimed_at = null,
      last_error_code = null,
      updated_at = now()
  where event_id = p_event_id and status = 'processing' and lease_token = p_lease_token;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then return 'stale_lease'; end if;
  return 'delivered';
end;
$$;

create or replace function public.velmere_fail_fulfilment_incident_outbox_event(
  p_event_id text,
  p_lease_token text,
  p_error_code text,
  p_retry_threshold integer,
  p_retry_after_seconds integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.velmere_fulfilment_incident_outbox%rowtype;
begin
  p_retry_threshold := greatest(2, least(coalesce(p_retry_threshold,5),20));
  p_retry_after_seconds := greatest(5, least(coalesce(p_retry_after_seconds,60),3600));
  select * into v_row from public.velmere_fulfilment_incident_outbox
  where event_id = p_event_id and status = 'processing' and lease_token = p_lease_token
  for update;
  if not found then return 'stale_lease'; end if;

  if v_row.attempt_count >= p_retry_threshold then
    update public.velmere_fulfilment_incident_outbox
    set status = 'dead_letter',
        dead_lettered_at = now(),
        dead_letter_reason_code = left(p_error_code,120),
        last_error_code = left(p_error_code,120),
        lease_token = null,
        claimed_at = null,
        updated_at = now()
    where id = v_row.id;
    return 'dead_letter';
  end if;

  update public.velmere_fulfilment_incident_outbox
  set status = 'retryable_failed',
      next_attempt_at = now() + make_interval(secs => p_retry_after_seconds),
      last_error_code = left(p_error_code,120),
      lease_token = null,
      claimed_at = null,
      updated_at = now()
  where id = v_row.id;
  return 'retryable_failed';
end;
$$;

create or replace function public.velmere_finish_fulfilment_incident_outbox_worker(
  p_run_id text,
  p_lease_token text,
  p_summary jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.velmere_fulfilment_outbox_worker_runs
  set claimed_count = coalesce((p_summary->>'claimedCount')::integer,0),
      delivered_count = coalesce((p_summary->>'deliveredCount')::integer,0),
      retryable_failed_count = coalesce((p_summary->>'retryableFailedCount')::integer,0),
      dead_lettered_count = coalesce((p_summary->>'deadLetteredCount')::integer,0),
      skipped_by_deadline_count = coalesce((p_summary->>'skippedByDeadlineCount')::integer,0),
      severity = case when p_summary->>'severity' in ('none','warning','critical')
        then p_summary->>'severity' else 'critical' end,
      completed_at = now()
  where run_id = p_run_id and lease_token_hash = encode(digest(p_lease_token,'sha256'),'hex');

  update public.velmere_fulfilment_outbox_worker_lease
  set lease_token = null, run_id = null, expires_at = now(), updated_at = now()
  where singleton_id = 1 and lease_token = p_lease_token and run_id = p_run_id;
end;
$$;

revoke all on function public.velmere_claim_fulfilment_incident_outbox_worker(text,text,integer,integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_complete_fulfilment_incident_outbox_event(text,text,jsonb) from public,anon,authenticated;
revoke all on function public.velmere_fail_fulfilment_incident_outbox_event(text,text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_finish_fulfilment_incident_outbox_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.velmere_claim_fulfilment_incident_outbox_worker(text,text,integer,integer,integer) to service_role;
grant execute on function public.velmere_complete_fulfilment_incident_outbox_event(text,text,jsonb) to service_role;
grant execute on function public.velmere_fail_fulfilment_incident_outbox_event(text,text,text,integer,integer) to service_role;
grant execute on function public.velmere_finish_fulfilment_incident_outbox_worker(text,text,jsonb) to service_role;

create or replace function public.velmere_release_fulfilment_incident_outbox_event(
  p_event_id text,
  p_lease_token text,
  p_reason_code text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_updated integer := 0;
begin
  update public.velmere_fulfilment_incident_outbox
  set status = 'retryable_failed',
      next_attempt_at = now(),
      last_error_code = left(coalesce(p_reason_code,'worker_released'),120),
      lease_token = null,
      claimed_at = null,
      updated_at = now()
  where event_id = p_event_id and status = 'processing' and lease_token = p_lease_token;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then return 'stale_lease'; end if;
  return 'released';
end;
$$;

revoke all on function public.velmere_release_fulfilment_incident_outbox_event(text,text,text)
  from public,anon,authenticated;
grant execute on function public.velmere_release_fulfilment_incident_outbox_event(text,text,text)
  to service_role;
