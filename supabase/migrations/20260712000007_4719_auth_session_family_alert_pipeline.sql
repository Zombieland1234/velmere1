-- PASS4719 MEGA: rotating auth session-family, reuse detection, durable security alerts and worker leases.

create table if not exists public.velmere_auth_session_families (
  family_id uuid primary key,
  subject_fingerprint text not null check (subject_fingerprint ~ '^[a-f0-9]{32}$'),
  generation integer not null default 1 check (generation between 1 and 1000000000),
  status text not null default 'active' check (status in ('active','revoked','compromised','expired')),
  expires_at timestamptz not null,
  last_rotated_at timestamptz not null default now(),
  compromised_at timestamptz,
  revoke_reason_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.velmere_auth_session_families enable row level security;
revoke all on table public.velmere_auth_session_families from public, anon, authenticated;
grant select, insert, update on table public.velmere_auth_session_families to service_role;

create table if not exists public.velmere_auth_security_alerts (
  id bigint generated always as identity primary key,
  alert_key text not null unique,
  event_family text not null check (event_family in ('session','oauth','recovery','binding','rls')),
  outcome text not null check (outcome in ('success','rejected','pending','conflict','unavailable')),
  severity text not null check (severity in ('medium','high','critical')),
  event_count integer not null check (event_count between 1 and 1000000),
  time_bucket timestamptz not null,
  status text not null default 'queued' check (status in ('queued','processing','delivered','retry','dead_letter')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 1000),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  delivered_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists velmere_auth_security_alerts_ready_idx on public.velmere_auth_security_alerts(status, next_attempt_at, id);
alter table public.velmere_auth_security_alerts enable row level security;
revoke all on table public.velmere_auth_security_alerts from public, anon, authenticated;
grant select, insert, update on table public.velmere_auth_security_alerts to service_role;

create or replace function public.velmere_issue_auth_session_family(
  p_family_id uuid,
  p_subject_fingerprint text,
  p_expires_at timestamptz
) returns table(status text, generation integer)
language plpgsql security definer set search_path = public as $$
begin
  if p_subject_fingerprint !~ '^[a-f0-9]{32}$' or p_expires_at <= now() then
    raise exception 'invalid_auth_session_family';
  end if;
  insert into public.velmere_auth_session_families(family_id, subject_fingerprint, generation, status, expires_at)
  values (p_family_id, p_subject_fingerprint, 1, 'active', p_expires_at)
  on conflict (family_id) do nothing;
  return query select 'issued'::text, f.generation from public.velmere_auth_session_families f where f.family_id = p_family_id;
end;
$$;
revoke all on function public.velmere_issue_auth_session_family(uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.velmere_issue_auth_session_family(uuid,text,timestamptz) to service_role;

create or replace function public.velmere_rotate_auth_session_family(
  p_family_id uuid,
  p_expected_generation integer,
  p_expires_at timestamptz
) returns table(status text, generation integer)
language plpgsql security definer set search_path = public as $$
declare
  current_row public.velmere_auth_session_families%rowtype;
begin
  select * into current_row from public.velmere_auth_session_families where family_id = p_family_id for update;
  if not found then return query select 'missing'::text, 0; return; end if;
  if current_row.expires_at <= now() then
    update public.velmere_auth_session_families set status='expired', updated_at=now() where family_id=p_family_id;
    return query select 'expired'::text, current_row.generation; return;
  end if;
  if current_row.status <> 'active' then return query select current_row.status::text, current_row.generation; return; end if;
  if p_expected_generation = current_row.generation then
    update public.velmere_auth_session_families
      set generation = generation + 1, expires_at = greatest(expires_at, p_expires_at), last_rotated_at=now(), updated_at=now()
      where family_id=p_family_id
      returning velmere_auth_session_families.generation into current_row.generation;
    return query select 'rotated'::text, current_row.generation; return;
  end if;
  if p_expected_generation = current_row.generation - 1 and current_row.last_rotated_at >= now() - interval '30 seconds' then
    return query select 'grace_replay'::text, current_row.generation; return;
  end if;
  update public.velmere_auth_session_families
    set status='compromised', compromised_at=now(), revoke_reason_code='generation_reuse', updated_at=now()
    where family_id=p_family_id;
  perform public.velmere_record_auth_security_event('session','conflict');
  return query select 'reuse_detected'::text, current_row.generation;
end;
$$;
revoke all on function public.velmere_rotate_auth_session_family(uuid,integer,timestamptz) from public, anon, authenticated;
grant execute on function public.velmere_rotate_auth_session_family(uuid,integer,timestamptz) to service_role;

create or replace function public.velmere_revoke_auth_session_family(
  p_family_id uuid,
  p_reason_code text
) returns table(status text, generation integer)
language plpgsql security definer set search_path = public as $$
declare current_generation integer;
begin
  update public.velmere_auth_session_families
    set status='revoked', revoke_reason_code=left(regexp_replace(coalesce(p_reason_code,''),'[^a-zA-Z0-9_-]','','g'),40), updated_at=now()
    where family_id=p_family_id and status in ('active','compromised')
    returning generation into current_generation;
  if current_generation is null then
    select generation into current_generation from public.velmere_auth_session_families where family_id=p_family_id;
    return query select case when current_generation is null then 'missing' else 'revoked' end::text, coalesce(current_generation,0);
  end if;
  return query select 'revoked'::text, current_generation;
end;
$$;
revoke all on function public.velmere_revoke_auth_session_family(uuid,text) from public, anon, authenticated;
grant execute on function public.velmere_revoke_auth_session_family(uuid,text) to service_role;

create or replace function public.velmere_record_auth_security_event(p_event_family text, p_outcome text)
returns void language plpgsql security definer set search_path = public as $$
declare bucket timestamptz := date_trunc('hour', now());
declare current_count integer;
declare threshold integer;
declare alert_severity text;
begin
  if p_event_family not in ('session','oauth','recovery','binding','rls') or p_outcome not in ('success','rejected','pending','conflict','unavailable') then
    raise exception 'invalid_auth_security_event';
  end if;
  insert into public.velmere_auth_security_events(event_family,outcome,time_bucket,count)
  values(p_event_family,p_outcome,bucket,1)
  on conflict(event_family,outcome,time_bucket) do update set count=least(1000000,public.velmere_auth_security_events.count+1)
  returning count into current_count;
  threshold := case when p_outcome='conflict' then 2 when p_outcome in ('rejected','unavailable') then 5 else 0 end;
  alert_severity := case when p_outcome='conflict' then 'critical' when current_count >= 20 then 'critical' when current_count >= 10 then 'high' else 'medium' end;
  if threshold > 0 and current_count >= threshold then
    insert into public.velmere_auth_security_alerts(alert_key,event_family,outcome,severity,event_count,time_bucket)
    values(p_event_family||':'||p_outcome||':'||extract(epoch from bucket)::bigint,p_event_family,p_outcome,alert_severity,current_count,bucket)
    on conflict(alert_key) do update set event_count=excluded.event_count,severity=excluded.severity,updated_at=now(),status=case when public.velmere_auth_security_alerts.status='delivered' then 'delivered' else 'queued' end;
  end if;
end;
$$;

create or replace function public.velmere_claim_auth_security_alerts(p_limit integer, p_lease_seconds integer, p_worker_token uuid)
returns table(id bigint,event_family text,outcome text,severity text,event_count integer,time_bucket timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with picked as (
    select a.id from public.velmere_auth_security_alerts a
    where (a.status in ('queued','retry') and a.next_attempt_at <= now()) or (a.status='processing' and a.lease_expires_at < now())
    order by case a.severity when 'critical' then 0 when 'high' then 1 else 2 end, a.id
    for update skip locked limit greatest(1,least(coalesce(p_limit,20),100))
  ), updated as (
    update public.velmere_auth_security_alerts a set status='processing',lease_token=p_worker_token,lease_expires_at=now()+make_interval(secs=>greatest(15,least(coalesce(p_lease_seconds,60),300))),attempt_count=attempt_count+1,updated_at=now()
    from picked where a.id=picked.id
    returning a.*
  ) select u.id,u.event_family,u.outcome,u.severity,u.event_count,u.time_bucket from updated u;
end;
$$;
revoke all on function public.velmere_claim_auth_security_alerts(integer,integer,uuid) from public, anon, authenticated;
grant execute on function public.velmere_claim_auth_security_alerts(integer,integer,uuid) to service_role;

create or replace function public.velmere_settle_auth_security_alert(p_id bigint,p_worker_token uuid,p_delivered boolean,p_error_code text)
returns text language plpgsql security definer set search_path = public as $$
declare attempts integer;
begin
  select attempt_count into attempts from public.velmere_auth_security_alerts where id=p_id and lease_token=p_worker_token and status='processing' for update;
  if attempts is null then return 'lease_mismatch'; end if;
  if p_delivered then
    update public.velmere_auth_security_alerts set status='delivered',delivered_at=now(),lease_token=null,lease_expires_at=null,last_error_code=null,updated_at=now() where id=p_id;
    return 'delivered';
  end if;
  update public.velmere_auth_security_alerts
    set status=case when attempts>=8 then 'dead_letter' else 'retry' end,
        next_attempt_at=now()+make_interval(secs=>least(3600,30*power(2,least(attempts,7))::integer)),
        lease_token=null,lease_expires_at=null,last_error_code=left(regexp_replace(coalesce(p_error_code,''),'[^a-zA-Z0-9:_-]','_','g'),120),updated_at=now()
    where id=p_id;
  return case when attempts>=8 then 'dead_letter' else 'retry' end;
end;
$$;
revoke all on function public.velmere_settle_auth_security_alert(bigint,uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.velmere_settle_auth_security_alert(bigint,uuid,boolean,text) to service_role;
