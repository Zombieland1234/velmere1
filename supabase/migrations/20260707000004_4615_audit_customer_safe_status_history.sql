-- PASS4615 — durable append-only, customer-safe audit case history.
-- No canonical target, account data, checkout/session IDs, entitlement IDs,
-- provider event IDs, operator identity or private review notes are stored here.

create table if not exists public.velmere_audit_case_status_history (
  history_id uuid primary key default gen_random_uuid(),
  case_id text not null references public.velmere_audit_intake_cases(case_id) on delete restrict,
  case_ref text not null,
  case_sequence integer not null check (case_sequence > 0),
  event_type text not null check (event_type in (
    'case_created', 'checkout_bound', 'payment_verified', 'queued_for_review',
    'payment_blocked', 'access_revoked', 'analysis_started', 'analysis_completed',
    'status_changed', 'migration_snapshot'
  )),
  previous_status text null,
  next_status text not null,
  queue_lane text not null check (queue_lane in ('basic_prescreen', 'payment_verification', 'pro_review', 'advanced_human_review', 'blocked')),
  payment_state text not null check (payment_state in ('not_required', 'awaiting', 'pending', 'verified', 'failed', 'expired', 'refunded', 'chargeback')),
  analysis_started boolean not null default false,
  reason_code text null check (reason_code is null or reason_code in ('checkout_expired', 'payment_failed', 'refund', 'chargeback')),
  previous_event_hash text null,
  event_hash text not null unique,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(case_id, case_sequence)
);

create index if not exists velmere_audit_case_status_history_case_idx
  on public.velmere_audit_case_status_history(case_id, case_sequence desc);

alter table public.velmere_audit_case_status_history enable row level security;
revoke all on table public.velmere_audit_case_status_history from public, anon, authenticated;
grant select, insert on table public.velmere_audit_case_status_history to service_role;

comment on table public.velmere_audit_case_status_history is
  'PASS4615 immutable customer-safe lifecycle projection with per-case hash chaining. Private target, payment IDs, account IDs and operator data are forbidden.';

create or replace function public.velmere_audit_history_queue_lane(p_tier text, p_status text)
returns text language sql immutable as $$
  select case
    when p_status = 'queued_basic_prescreen' then 'basic_prescreen'
    when p_status = 'queued_paid_review' and p_tier = 'advanced' then 'advanced_human_review'
    when p_status = 'queued_paid_review' then 'pro_review'
    when p_status in ('awaiting_entitlement', 'checkout_pending') then 'payment_verification'
    else 'blocked'
  end;
$$;
revoke all on function public.velmere_audit_history_queue_lane(text,text) from public, anon, authenticated;

create or replace function public.velmere_audit_history_payment_state(
  p_status text,
  p_entitlement_required boolean,
  p_entitlement_verified boolean,
  p_blocked_reason text
) returns text language sql immutable as $$
  select case
    when p_status = 'access_revoked' and p_blocked_reason = 'chargeback' then 'chargeback'
    when p_status = 'access_revoked' then 'refunded'
    when p_status = 'payment_blocked' and p_blocked_reason = 'checkout_expired' then 'expired'
    when p_status = 'payment_blocked' then 'failed'
    when p_entitlement_verified then 'verified'
    when p_status = 'checkout_pending' then 'pending'
    when p_entitlement_required then 'awaiting'
    else 'not_required'
  end;
$$;
revoke all on function public.velmere_audit_history_payment_state(text,boolean,boolean,text) from public, anon, authenticated;

create or replace function public.velmere_append_audit_case_status_history(
  p_case_id text,
  p_case_ref text,
  p_event_type text,
  p_previous_status text,
  p_next_status text,
  p_tier text,
  p_entitlement_required boolean,
  p_entitlement_verified boolean,
  p_analysis_started boolean,
  p_reason_code text,
  p_occurred_at timestamptz default now()
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sequence integer;
  v_previous_hash text;
  v_hash text;
  v_queue_lane text;
  v_payment_state text;
begin
  if p_event_type not in (
    'case_created', 'checkout_bound', 'payment_verified', 'queued_for_review',
    'payment_blocked', 'access_revoked', 'analysis_started', 'analysis_completed',
    'status_changed', 'migration_snapshot'
  ) then
    raise exception 'invalid_audit_history_event_type';
  end if;

  select case_sequence, event_hash into v_sequence, v_previous_hash
  from public.velmere_audit_case_status_history
  where case_id = p_case_id
  order by case_sequence desc
  limit 1;
  v_sequence := coalesce(v_sequence, 0) + 1;
  v_queue_lane := public.velmere_audit_history_queue_lane(p_tier, p_next_status);
  v_payment_state := public.velmere_audit_history_payment_state(p_next_status, p_entitlement_required, p_entitlement_verified, p_reason_code);
  v_hash := 'sha256:' || encode(digest(concat_ws('|',
    p_case_id, v_sequence::text, p_event_type, coalesce(p_previous_status, ''), p_next_status,
    v_queue_lane, v_payment_state, p_analysis_started::text, coalesce(p_reason_code, ''),
    p_occurred_at::text, coalesce(v_previous_hash, 'root')
  ), 'sha256'), 'hex');

  insert into public.velmere_audit_case_status_history (
    case_id, case_ref, case_sequence, event_type, previous_status, next_status,
    queue_lane, payment_state, analysis_started, reason_code,
    previous_event_hash, event_hash, occurred_at
  ) values (
    p_case_id, p_case_ref, v_sequence, p_event_type, p_previous_status, p_next_status,
    v_queue_lane, v_payment_state, p_analysis_started, p_reason_code,
    v_previous_hash, v_hash, p_occurred_at
  );
end;
$$;

revoke all on function public.velmere_append_audit_case_status_history(text,text,text,text,text,text,boolean,boolean,boolean,text,timestamptz) from public, anon, authenticated;
grant execute on function public.velmere_append_audit_case_status_history(text,text,text,text,text,text,boolean,boolean,boolean,text,timestamptz) to service_role;

create or replace function public.velmere_capture_audit_case_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_captured boolean := false;
begin
  if tg_op = 'INSERT' then
    perform public.velmere_append_audit_case_status_history(
      new.case_id, new.case_ref, 'case_created', null, new.status, new.tier,
      new.entitlement_required, new.entitlement_verified, new.analysis_started,
      new.blocked_reason, new.created_at
    );
    return new;
  end if;

  if old.checkout_session_id is null and new.checkout_session_id is not null then
    perform public.velmere_append_audit_case_status_history(new.case_id, new.case_ref, 'checkout_bound', old.status, new.status, new.tier, new.entitlement_required, new.entitlement_verified, new.analysis_started, new.blocked_reason, new.updated_at);
    v_captured := true;
  end if;
  if not old.entitlement_verified and new.entitlement_verified then
    perform public.velmere_append_audit_case_status_history(new.case_id, new.case_ref, 'payment_verified', old.status, new.status, new.tier, new.entitlement_required, new.entitlement_verified, new.analysis_started, new.blocked_reason, new.updated_at);
    v_captured := true;
  end if;
  if old.status is distinct from new.status and new.status in ('queued_basic_prescreen', 'queued_paid_review') then
    perform public.velmere_append_audit_case_status_history(new.case_id, new.case_ref, 'queued_for_review', old.status, new.status, new.tier, new.entitlement_required, new.entitlement_verified, new.analysis_started, new.blocked_reason, new.updated_at);
    v_captured := true;
  end if;
  if old.status is distinct from new.status and new.status = 'payment_blocked' then
    perform public.velmere_append_audit_case_status_history(new.case_id, new.case_ref, 'payment_blocked', old.status, new.status, new.tier, new.entitlement_required, new.entitlement_verified, new.analysis_started, new.blocked_reason, new.updated_at);
    v_captured := true;
  end if;
  if old.status is distinct from new.status and new.status = 'access_revoked' then
    perform public.velmere_append_audit_case_status_history(new.case_id, new.case_ref, 'access_revoked', old.status, new.status, new.tier, new.entitlement_required, new.entitlement_verified, new.analysis_started, new.blocked_reason, new.updated_at);
    v_captured := true;
  end if;
  if not old.analysis_started and new.analysis_started then
    perform public.velmere_append_audit_case_status_history(new.case_id, new.case_ref, 'analysis_started', old.status, new.status, new.tier, new.entitlement_required, new.entitlement_verified, new.analysis_started, new.blocked_reason, new.updated_at);
    v_captured := true;
  end if;
  if old.analysis_started and not new.analysis_started and old.status = new.status then
    perform public.velmere_append_audit_case_status_history(new.case_id, new.case_ref, 'analysis_completed', old.status, new.status, new.tier, new.entitlement_required, new.entitlement_verified, new.analysis_started, new.blocked_reason, new.updated_at);
    v_captured := true;
  end if;
  if not v_captured and old.status is distinct from new.status then
    perform public.velmere_append_audit_case_status_history(new.case_id, new.case_ref, 'status_changed', old.status, new.status, new.tier, new.entitlement_required, new.entitlement_verified, new.analysis_started, new.blocked_reason, new.updated_at);
  end if;
  return new;
end;
$$;

revoke all on function public.velmere_capture_audit_case_status_history() from public, anon, authenticated;

drop trigger if exists velmere_capture_audit_case_status_history on public.velmere_audit_intake_cases;
create trigger velmere_capture_audit_case_status_history
after insert or update on public.velmere_audit_intake_cases
for each row execute function public.velmere_capture_audit_case_status_history();

-- Existing cases cannot receive a fictional full history. They receive one explicit snapshot event.
do $$
declare v_case public.velmere_audit_intake_cases%rowtype;
begin
  for v_case in select * from public.velmere_audit_intake_cases loop
    if not exists (select 1 from public.velmere_audit_case_status_history where case_id = v_case.case_id) then
      perform public.velmere_append_audit_case_status_history(
        v_case.case_id, v_case.case_ref, 'migration_snapshot', null, v_case.status, v_case.tier,
        v_case.entitlement_required, v_case.entitlement_verified, v_case.analysis_started,
        v_case.blocked_reason, v_case.updated_at
      );
    end if;
  end loop;
end $$;

create or replace function public.velmere_get_audit_case_customer_history(
  p_case_ref text,
  p_account_id text,
  p_limit integer default 40
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id text;
  v_total integer;
  v_events jsonb;
  v_first_type text;
  v_limit integer := greatest(1, least(coalesce(p_limit, 40), 50));
begin
  select case_id into v_case_id
  from public.velmere_audit_intake_cases
  where case_ref = p_case_ref and account_id = p_account_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'case_not_found'); end if;

  select count(*) into v_total from public.velmere_audit_case_status_history where case_id = v_case_id;
  select event_type into v_first_type from public.velmere_audit_case_status_history where case_id = v_case_id order by case_sequence asc limit 1;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.case_sequence asc), '[]'::jsonb) into v_events
  from (
    select case_sequence, event_type, previous_status, next_status, queue_lane,
           payment_state, analysis_started, reason_code, previous_event_hash,
           event_hash, occurred_at
    from public.velmere_audit_case_status_history
    where case_id = v_case_id
    order by case_sequence desc
    limit v_limit
  ) e;

  return jsonb_build_object(
    'ok', true,
    'complete', v_first_type = 'case_created',
    'truncated', v_total > v_limit,
    'totalEvents', v_total,
    'events', v_events
  );
end;
$$;

revoke all on function public.velmere_get_audit_case_customer_history(text,text,integer) from public, anon, authenticated;
grant execute on function public.velmere_get_audit_case_customer_history(text,text,integer) to service_role;

create or replace function public.velmere_reject_audit_history_mutation()
returns trigger language plpgsql as $$ begin raise exception 'audit_status_history_is_append_only'; end; $$;
revoke all on function public.velmere_reject_audit_history_mutation() from public, anon, authenticated;
drop trigger if exists velmere_reject_audit_history_mutation on public.velmere_audit_case_status_history;
create trigger velmere_reject_audit_history_mutation
before update or delete on public.velmere_audit_case_status_history
for each row execute function public.velmere_reject_audit_history_mutation();
