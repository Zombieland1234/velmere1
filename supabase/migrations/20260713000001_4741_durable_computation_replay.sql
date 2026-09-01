create table if not exists public.velmere_durable_computation_jobs (
  job_id text primary key,
  kind text not null check (kind in ('vlm_analysis','lens_pdf_render','audit_pdf_render')),
  input_hash text not null,
  subject_hash text not null,
  state text not null check (state in ('processing','completed','retry_wait','dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 8),
  lease_token_hash text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  result_payload jsonb,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  dead_lettered_at timestamptz
);

alter table public.velmere_durable_computation_jobs enable row level security;
revoke all on table public.velmere_durable_computation_jobs from public, anon, authenticated;
grant all on table public.velmere_durable_computation_jobs to service_role;

create index if not exists velmere_durable_computation_jobs_state_next_idx
  on public.velmere_durable_computation_jobs(state, next_attempt_at, lease_expires_at);

create or replace function public.velmere_claim_durable_computation(
  p_job_id text,
  p_kind text,
  p_input_hash text,
  p_subject_hash text,
  p_lease_token text,
  p_lease_seconds integer,
  p_max_attempts integer
) returns table(state text, attempt_count integer, retry_after_ms integer, result_payload jsonb)
language plpgsql security definer set search_path = public as $$
declare
  v_row public.velmere_durable_computation_jobs%rowtype;
  v_now timestamptz := now();
  v_attempt integer;
begin
  if p_job_id is null or length(p_job_id) < 20 or length(p_job_id) > 80 then raise exception 'invalid_job_id'; end if;
  if p_kind not in ('vlm_analysis','lens_pdf_render','audit_pdf_render') then raise exception 'invalid_job_kind'; end if;
  if p_input_hash !~ '^[0-9a-f]{64}$' or p_subject_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_job_hash'; end if;
  if p_lease_token is null or length(p_lease_token) < 24 or length(p_lease_token) > 120 then raise exception 'invalid_lease_token'; end if;

  insert into public.velmere_durable_computation_jobs(job_id,kind,input_hash,subject_hash,state,attempt_count,max_attempts)
  values(p_job_id,p_kind,p_input_hash,p_subject_hash,'retry_wait',0,greatest(1,least(8,p_max_attempts)))
  on conflict (job_id) do nothing;

  select * into v_row from public.velmere_durable_computation_jobs where job_id=p_job_id for update;
  if v_row.kind<>p_kind or v_row.input_hash<>p_input_hash or v_row.subject_hash<>p_subject_hash then
    return query select 'conflict'::text,v_row.attempt_count,0,null::jsonb; return;
  end if;
  if v_row.state='completed' then return query select 'completed'::text,v_row.attempt_count,0,v_row.result_payload; return; end if;
  if v_row.state='dead_letter' then return query select 'dead_letter'::text,v_row.attempt_count,0,null::jsonb; return; end if;
  if v_row.state='processing' and v_row.lease_expires_at>v_now then
    return query select 'in_progress'::text,v_row.attempt_count,greatest(1000,(extract(epoch from (v_row.lease_expires_at-v_now))*1000)::integer),null::jsonb; return;
  end if;
  if v_row.state='retry_wait' and v_row.next_attempt_at is not null and v_row.next_attempt_at>v_now then
    return query select 'retry_wait'::text,v_row.attempt_count,greatest(1000,(extract(epoch from (v_row.next_attempt_at-v_now))*1000)::integer),null::jsonb; return;
  end if;
  v_attempt := v_row.attempt_count + 1;
  if v_attempt>v_row.max_attempts then
    update public.velmere_durable_computation_jobs set state='dead_letter',dead_lettered_at=v_now,lease_token_hash=null,lease_expires_at=null,updated_at=v_now where job_id=p_job_id;
    return query select 'dead_letter'::text,v_row.attempt_count,0,null::jsonb; return;
  end if;
  update public.velmere_durable_computation_jobs
    set state='processing',attempt_count=v_attempt,lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex'),
        lease_expires_at=v_now+make_interval(secs=>greatest(15,least(600,p_lease_seconds))),next_attempt_at=null,updated_at=v_now
    where job_id=p_job_id;
  return query select 'claimed'::text,v_attempt,0,null::jsonb;
end $$;

create or replace function public.velmere_complete_durable_computation(p_job_id text,p_lease_token text,p_result_payload jsonb)
returns table(state text) language plpgsql security definer set search_path=public as $$
begin
  if pg_column_size(p_result_payload)>4194304 then raise exception 'result_payload_too_large'; end if;
  update public.velmere_durable_computation_jobs
    set state='completed',result_payload=p_result_payload,completed_at=now(),lease_token_hash=null,lease_expires_at=null,updated_at=now()
    where job_id=p_job_id and state='processing' and lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex') and lease_expires_at>now();
  if not found then return query select 'conflict'::text; else return query select 'completed'::text; end if;
end $$;

create or replace function public.velmere_fail_durable_computation(p_job_id text,p_lease_token text,p_error_code text,p_retry_after_seconds integer)
returns table(state text) language plpgsql security definer set search_path=public as $$
declare v_attempt integer; v_max integer;
begin
  select attempt_count,max_attempts into v_attempt,v_max from public.velmere_durable_computation_jobs
    where job_id=p_job_id and state='processing' and lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex') for update;
  if not found then return query select 'conflict'::text; return; end if;
  if v_attempt>=v_max then
    update public.velmere_durable_computation_jobs set state='dead_letter',dead_lettered_at=now(),last_error_code=left(p_error_code,120),lease_token_hash=null,lease_expires_at=null,updated_at=now() where job_id=p_job_id;
    return query select 'dead_letter'::text;
  else
    update public.velmere_durable_computation_jobs set state='retry_wait',next_attempt_at=now()+make_interval(secs=>greatest(1,least(300,p_retry_after_seconds))),last_error_code=left(p_error_code,120),lease_token_hash=null,lease_expires_at=null,updated_at=now() where job_id=p_job_id;
    return query select 'retry_wait'::text;
  end if;
end $$;

revoke all on function public.velmere_claim_durable_computation(text,text,text,text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_complete_durable_computation(text,text,jsonb) from public,anon,authenticated;
revoke all on function public.velmere_fail_durable_computation(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.velmere_claim_durable_computation(text,text,text,text,text,integer,integer) to service_role;
grant execute on function public.velmere_complete_durable_computation(text,text,jsonb) to service_role;
grant execute on function public.velmere_fail_durable_computation(text,text,text,integer) to service_role;
