-- PASS4709: fulfilment dead-letter recovery + account/Supabase subject binding.

alter table public.velmere_fulfilment_incident_outbox
  drop constraint if exists velmere_fulfilment_incident_outbox_status_check;
alter table public.velmere_fulfilment_incident_outbox
  add constraint velmere_fulfilment_incident_outbox_status_check
  check (status in ('pending','processing','delivered','retryable_failed','dead_letter','discarded'));

alter table public.velmere_fulfilment_incident_outbox
  add column if not exists discarded_at timestamptz,
  add column if not exists discarded_reason_code text;

create table if not exists public.velmere_fulfilment_outbox_recovery_actions (
  request_id text primary key,
  event_id text not null,
  action text not null check (action in ('requeue','discard')),
  reason_code text not null,
  evidence_reference text not null,
  operator_fingerprint text not null,
  created_at timestamptz not null default now()
);
alter table public.velmere_fulfilment_outbox_recovery_actions enable row level security;
revoke all on table public.velmere_fulfilment_outbox_recovery_actions from public,anon,authenticated;

create or replace function public.velmere_recover_fulfilment_outbox_dead_letter(
  p_event_id text,
  p_action text,
  p_request_id text,
  p_reason_code text,
  p_evidence_reference text,
  p_operator_fingerprint text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.velmere_fulfilment_outbox_recovery_actions%rowtype;
  v_row public.velmere_fulfilment_incident_outbox%rowtype;
begin
  if p_action not in ('requeue','discard') then raise exception 'invalid_action'; end if;
  if p_event_id !~ '^fulfilment_outbox_[a-f0-9]{24}$' then raise exception 'invalid_event_id'; end if;
  if p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9:_-]{7,119}$' then raise exception 'invalid_request_id'; end if;
  if p_reason_code !~ '^[a-z0-9][a-z0-9:_-]{2,79}$' then raise exception 'invalid_reason_code'; end if;
  if p_evidence_reference !~ '^[A-Za-z0-9][A-Za-z0-9:._/-]{3,159}$' then raise exception 'invalid_evidence_reference'; end if;
  if p_operator_fingerprint !~ '^operator_[a-f0-9]{20}$' then raise exception 'invalid_operator'; end if;

  select * into v_existing
  from public.velmere_fulfilment_outbox_recovery_actions
  where request_id = p_request_id;
  if found then
    if v_existing.event_id = p_event_id and v_existing.action = p_action
       and v_existing.reason_code = p_reason_code
       and v_existing.evidence_reference = p_evidence_reference then
      return 'already_applied';
    end if;
    return 'conflict';
  end if;

  select * into v_row
  from public.velmere_fulfilment_incident_outbox
  where event_id = p_event_id
  for update;
  if not found then return 'not_found'; end if;
  if v_row.status <> 'dead_letter' then return 'conflict'; end if;

  if p_action = 'requeue' then
    update public.velmere_fulfilment_incident_outbox
    set status='retryable_failed', attempt_count=0, next_attempt_at=now(),
        lease_token=null, claimed_at=null, dead_lettered_at=null,
        dead_letter_reason_code=null, last_error_code='operator_requeued_dead_letter',
        updated_at=now()
    where event_id=p_event_id and status='dead_letter';
  else
    update public.velmere_fulfilment_incident_outbox
    set status='discarded', next_attempt_at=null, lease_token=null, claimed_at=null,
        discarded_at=now(), discarded_reason_code=left(p_reason_code,80),
        last_error_code='operator_discarded_dead_letter', updated_at=now()
    where event_id=p_event_id and status='dead_letter';
  end if;

  insert into public.velmere_fulfilment_outbox_recovery_actions(
    request_id,event_id,action,reason_code,evidence_reference,operator_fingerprint
  ) values (
    p_request_id,p_event_id,p_action,p_reason_code,p_evidence_reference,p_operator_fingerprint
  );
  return case when p_action='requeue' then 'requeued' else 'discarded' end;
end;
$$;

create or replace function public.velmere_fulfilment_outbox_dead_letter_summary()
returns table(dead_letter_count integer, overdue_count integer, oldest_age_seconds integer)
language sql
security definer
set search_path = public
as $$
  select
    count(*)::integer,
    count(*) filter (where dead_lettered_at < now() - interval '1 hour')::integer,
    coalesce(extract(epoch from now() - min(dead_lettered_at)),0)::integer
  from public.velmere_fulfilment_incident_outbox
  where status='dead_letter';
$$;

revoke all on function public.velmere_recover_fulfilment_outbox_dead_letter(text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.velmere_fulfilment_outbox_dead_letter_summary() from public,anon,authenticated;
grant execute on function public.velmere_recover_fulfilment_outbox_dead_letter(text,text,text,text,text,text) to service_role;
grant execute on function public.velmere_fulfilment_outbox_dead_letter_summary() to service_role;

create table if not exists public.velmere_account_supabase_subject_bindings (
  account_id text primary key,
  supabase_subject uuid not null unique,
  request_id text not null unique,
  operator_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.velmere_account_supabase_subject_bindings enable row level security;
revoke all on table public.velmere_account_supabase_subject_bindings from public,anon,authenticated;

create or replace function public.velmere_bind_account_to_supabase_subject(
  p_account_id text,
  p_supabase_subject uuid,
  p_request_id text,
  p_operator_fingerprint text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_account text; v_subject uuid; v_request text;
begin
  if p_account_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{5,119}$' then raise exception 'invalid_account_id'; end if;
  if p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9:_-]{7,119}$' then raise exception 'invalid_request_id'; end if;
  if p_operator_fingerprint !~ '^operator_[a-f0-9]{20}$' then raise exception 'invalid_operator'; end if;

  select account_id into v_request from public.velmere_account_supabase_subject_bindings where request_id=p_request_id;
  if found then return case when v_request=p_account_id then 'already_bound' else 'conflict' end; end if;
  select account_id into v_account from public.velmere_account_supabase_subject_bindings where supabase_subject=p_supabase_subject;
  if found and v_account<>p_account_id then return 'conflict'; end if;
  select supabase_subject into v_subject from public.velmere_account_supabase_subject_bindings where account_id=p_account_id;
  if found and v_subject<>p_supabase_subject then return 'conflict'; end if;

  insert into public.velmere_account_supabase_subject_bindings(account_id,supabase_subject,request_id,operator_fingerprint)
  values(p_account_id,p_supabase_subject,p_request_id,p_operator_fingerprint)
  on conflict(account_id) do update set updated_at=now();
  return 'bound';
end;
$$;

create or replace function public.velmere_current_account_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select account_id
  from public.velmere_account_supabase_subject_bindings
  where supabase_subject=auth.uid()
  limit 1;
$$;

revoke all on function public.velmere_bind_account_to_supabase_subject(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.velmere_bind_account_to_supabase_subject(text,uuid,text,text) to service_role;
revoke all on function public.velmere_current_account_id() from public,anon;
grant execute on function public.velmere_current_account_id() to authenticated,service_role;
