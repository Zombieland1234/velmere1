-- PASS4746 expands sealed worker execution to VLM, Lens PDF and Pro Audit PDF.
-- It intentionally keeps the same service-role-only RPC boundary and lease fencing.
alter table public.velmere_durable_computation_jobs
  add column if not exists sealed_payload jsonb,
  add column if not exists worker_id_hash text,
  add column if not exists worker_claimed_at timestamptz,
  add column if not exists heartbeat_at timestamptz;

alter table public.velmere_durable_computation_jobs
  drop constraint if exists velmere_durable_computation_jobs_sealed_payload_size;
alter table public.velmere_durable_computation_jobs
  add constraint velmere_durable_computation_jobs_sealed_payload_size
  check (sealed_payload is null or pg_column_size(sealed_payload) <= 786432);

create index if not exists velmere_durable_computation_worker_ready_idx
  on public.velmere_durable_computation_jobs(state, next_attempt_at, lease_expires_at, kind)
  where sealed_payload is not null;

drop function if exists public.velmere_claim_durable_computation(text,text,text,text,text,integer,integer);

create or replace function public.velmere_claim_durable_computation(
  p_job_id text,
  p_kind text,
  p_input_hash text,
  p_subject_hash text,
  p_lease_token text,
  p_lease_seconds integer,
  p_max_attempts integer,
  p_sealed_payload jsonb
) returns table(state text, attempt_count integer, retry_after_ms integer, result_payload jsonb)
language plpgsql security definer set search_path = public as $$
declare
  v_row public.velmere_durable_computation_jobs%rowtype;
  v_now timestamptz := now();
  v_attempt integer;
begin
  if p_job_id !~ '^dcj_[0-9a-f]{48}$' then raise exception 'invalid_job_id'; end if;
  if p_kind not in ('vlm_analysis','lens_pdf_render','audit_pdf_render') then raise exception 'invalid_job_kind'; end if;
  if p_input_hash !~ '^[0-9a-f]{64}$' or p_subject_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_job_hash'; end if;
  if p_lease_token is null or length(p_lease_token) < 24 or length(p_lease_token) > 120 then raise exception 'invalid_lease_token'; end if;
  if p_sealed_payload is not null then
    if pg_column_size(p_sealed_payload) > 786432 then raise exception 'sealed_payload_too_large'; end if;
    if p_kind not in ('vlm_analysis','lens_pdf_render','audit_pdf_render') then raise exception 'sealed_payload_kind_not_enabled'; end if;
    if coalesce(p_sealed_payload->>'schemaVersion','') <> 'velmere.durable-computation.sealed-payload.v1' then raise exception 'sealed_payload_schema_invalid'; end if;
    if coalesce(p_sealed_payload->>'algorithm','') <> 'A256GCM' then raise exception 'sealed_payload_algorithm_invalid'; end if;
  end if;

  insert into public.velmere_durable_computation_jobs(
    job_id,kind,input_hash,subject_hash,state,attempt_count,max_attempts,sealed_payload
  ) values(
    p_job_id,p_kind,p_input_hash,p_subject_hash,'retry_wait',0,greatest(1,least(8,p_max_attempts)),p_sealed_payload
  ) on conflict (job_id) do nothing;

  select * into v_row from public.velmere_durable_computation_jobs where job_id=p_job_id for update;
  if v_row.kind<>p_kind or v_row.input_hash<>p_input_hash or v_row.subject_hash<>p_subject_hash then
    return query select 'conflict'::text,v_row.attempt_count,0,null::jsonb; return;
  end if;
  if v_row.sealed_payload is null and p_sealed_payload is not null then
    update public.velmere_durable_computation_jobs set sealed_payload=p_sealed_payload,updated_at=v_now where job_id=p_job_id;
  elsif v_row.sealed_payload is not null and p_sealed_payload is not null
    and encode(digest(v_row.sealed_payload::text,'sha256'),'hex') <> encode(digest(p_sealed_payload::text,'sha256'),'hex') then
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
    update public.velmere_durable_computation_jobs
      set state='dead_letter',dead_lettered_at=v_now,lease_token_hash=null,lease_expires_at=null,
          worker_id_hash=null,heartbeat_at=null,updated_at=v_now
      where job_id=p_job_id;
    return query select 'dead_letter'::text,v_row.attempt_count,0,null::jsonb; return;
  end if;
  update public.velmere_durable_computation_jobs
    set state='processing',attempt_count=v_attempt,lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex'),
        lease_expires_at=v_now+make_interval(secs=>greatest(15,least(600,p_lease_seconds))),next_attempt_at=null,
        worker_id_hash=null,worker_claimed_at=null,heartbeat_at=v_now,updated_at=v_now
    where job_id=p_job_id;
  return query select 'claimed'::text,v_attempt,0,null::jsonb;
end $$;

create or replace function public.velmere_claim_durable_computation_worker_batch(
  p_worker_id_hash text,
  p_lease_token text,
  p_lease_seconds integer,
  p_limit integer,
  p_kinds text[]
) returns table(
  job_id text,
  kind text,
  input_hash text,
  subject_hash text,
  attempt_count integer,
  sealed_payload jsonb
)
language plpgsql security definer set search_path = public as $$
declare
  v_now timestamptz := now();
  v_limit integer := greatest(1,least(25,p_limit));
  v_row public.velmere_durable_computation_jobs%rowtype;
  v_attempt integer;
begin
  if p_worker_id_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_worker_id_hash'; end if;
  if p_lease_token is null or length(p_lease_token)<24 or length(p_lease_token)>120 then raise exception 'invalid_lease_token'; end if;
  if p_kinds is null or array_length(p_kinds,1) is null or not (p_kinds <@ array['vlm_analysis','lens_pdf_render','audit_pdf_render']::text[]) then raise exception 'invalid_worker_kinds'; end if;

  for v_row in
    select * from public.velmere_durable_computation_jobs
    where sealed_payload is not null
      and kind = any(p_kinds)
      and (
        (state='retry_wait' and coalesce(next_attempt_at,v_now)<=v_now)
        or (state='processing' and coalesce(lease_expires_at,v_now)<=v_now)
      )
    order by coalesce(next_attempt_at,lease_expires_at,created_at),created_at
    limit v_limit
    for update skip locked
  loop
    v_attempt := v_row.attempt_count + 1;
    if v_attempt > v_row.max_attempts then
      update public.velmere_durable_computation_jobs
        set state='dead_letter',dead_lettered_at=v_now,lease_token_hash=null,lease_expires_at=null,
            worker_id_hash=null,heartbeat_at=null,updated_at=v_now
        where public.velmere_durable_computation_jobs.job_id=v_row.job_id;
    else
      update public.velmere_durable_computation_jobs
        set state='processing',attempt_count=v_attempt,lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex'),
            lease_expires_at=v_now+make_interval(secs=>greatest(30,least(600,p_lease_seconds))),next_attempt_at=null,
            worker_id_hash=p_worker_id_hash,worker_claimed_at=v_now,heartbeat_at=v_now,updated_at=v_now
        where public.velmere_durable_computation_jobs.job_id=v_row.job_id;
      job_id := v_row.job_id;
      kind := v_row.kind;
      input_hash := v_row.input_hash;
      subject_hash := v_row.subject_hash;
      attempt_count := v_attempt;
      sealed_payload := v_row.sealed_payload;
      return next;
    end if;
  end loop;
end $$;

create or replace function public.velmere_heartbeat_durable_computation_worker(
  p_job_ids text[],
  p_lease_token text,
  p_lease_seconds integer
) returns table(extended_count integer)
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  if p_job_ids is null or cardinality(p_job_ids)<1 or cardinality(p_job_ids)>25 then raise exception 'invalid_job_batch'; end if;
  if p_lease_token is null or length(p_lease_token)<24 or length(p_lease_token)>120 then raise exception 'invalid_lease_token'; end if;
  update public.velmere_durable_computation_jobs
    set lease_expires_at=now()+make_interval(secs=>greatest(30,least(600,p_lease_seconds))),heartbeat_at=now(),updated_at=now()
    where job_id=any(p_job_ids) and state='processing'
      and lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex')
      and worker_id_hash is not null and lease_expires_at>now()-interval '30 seconds';
  get diagnostics v_count = row_count;
  return query select v_count;
end $$;

revoke all on function public.velmere_claim_durable_computation(text,text,text,text,text,integer,integer,jsonb) from public,anon,authenticated;
revoke all on function public.velmere_claim_durable_computation_worker_batch(text,text,integer,integer,text[]) from public,anon,authenticated;
revoke all on function public.velmere_heartbeat_durable_computation_worker(text[],text,integer) from public,anon,authenticated;
grant execute on function public.velmere_claim_durable_computation(text,text,text,text,text,integer,integer,jsonb) to service_role;
grant execute on function public.velmere_claim_durable_computation_worker_batch(text,text,integer,integer,text[]) to service_role;
grant execute on function public.velmere_heartbeat_durable_computation_worker(text[],text,integer) to service_role;
