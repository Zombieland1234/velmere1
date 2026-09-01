-- PASS4747 hardens multi-instance worker ownership.
-- Existing RPCs remain available for compatibility; the worker uses the strict owned-heartbeat RPC below.

create or replace function public.velmere_heartbeat_durable_computation_worker_owned(
  p_job_ids text[],
  p_lease_token text,
  p_lease_seconds integer
) returns table(job_id text)
language plpgsql security definer set search_path = public as $$
begin
  if p_job_ids is null or cardinality(p_job_ids)<1 or cardinality(p_job_ids)>25 then raise exception 'invalid_job_batch'; end if;
  if p_lease_token is null or length(p_lease_token)<24 or length(p_lease_token)>120 then raise exception 'invalid_lease_token'; end if;

  return query
  update public.velmere_durable_computation_jobs as jobs
    set lease_expires_at=now()+make_interval(secs=>greatest(30,least(600,p_lease_seconds))),
        heartbeat_at=now(),
        updated_at=now()
    where jobs.job_id=any(p_job_ids)
      and jobs.state='processing'
      and jobs.lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex')
      and jobs.worker_id_hash is not null
      and jobs.lease_expires_at>now()
    returning jobs.job_id;
end $$;

-- Completion clears worker ownership metadata and remains strictly fenced by a live lease.
create or replace function public.velmere_complete_durable_computation(
  p_job_id text,
  p_lease_token text,
  p_result_payload jsonb
) returns table(state text)
language plpgsql security definer set search_path=public as $$
begin
  if pg_column_size(p_result_payload)>4194304 then raise exception 'result_payload_too_large'; end if;
  update public.velmere_durable_computation_jobs
    set state='completed',result_payload=p_result_payload,completed_at=now(),
        lease_token_hash=null,lease_expires_at=null,worker_id_hash=null,
        worker_claimed_at=null,heartbeat_at=null,updated_at=now()
    where job_id=p_job_id and state='processing'
      and lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex')
      and lease_expires_at>now();
  if not found then return query select 'conflict'::text; else return query select 'completed'::text; end if;
end $$;

-- Failure is now symmetric with completion: an expired worker cannot mutate the job.
create or replace function public.velmere_fail_durable_computation(
  p_job_id text,
  p_lease_token text,
  p_error_code text,
  p_retry_after_seconds integer
) returns table(state text)
language plpgsql security definer set search_path=public as $$
declare v_attempt integer; v_max integer;
begin
  select attempt_count,max_attempts into v_attempt,v_max
    from public.velmere_durable_computation_jobs
    where job_id=p_job_id and state='processing'
      and lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex')
      and lease_expires_at>now()
    for update;
  if not found then return query select 'conflict'::text; return; end if;
  if v_attempt>=v_max then
    update public.velmere_durable_computation_jobs
      set state='dead_letter',dead_lettered_at=now(),last_error_code=left(p_error_code,120),
          lease_token_hash=null,lease_expires_at=null,worker_id_hash=null,
          worker_claimed_at=null,heartbeat_at=null,updated_at=now()
      where job_id=p_job_id;
    return query select 'dead_letter'::text;
  else
    update public.velmere_durable_computation_jobs
      set state='retry_wait',next_attempt_at=now()+make_interval(secs=>greatest(1,least(300,p_retry_after_seconds))),
          last_error_code=left(p_error_code,120),lease_token_hash=null,lease_expires_at=null,
          worker_id_hash=null,worker_claimed_at=null,heartbeat_at=null,updated_at=now()
      where job_id=p_job_id;
    return query select 'retry_wait'::text;
  end if;
end $$;

revoke all on function public.velmere_heartbeat_durable_computation_worker_owned(text[],text,integer) from public,anon,authenticated;
grant execute on function public.velmere_heartbeat_durable_computation_worker_owned(text[],text,integer) to service_role;

-- Fair batch claim prevents one subject/account from monopolizing a worker batch.
create or replace function public.velmere_claim_durable_computation_worker_batch_fair(
  p_worker_id_hash text,
  p_lease_token text,
  p_lease_seconds integer,
  p_limit integer,
  p_per_subject_limit integer,
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
  v_per_subject integer := greatest(1,least(4,p_per_subject_limit));
  v_row public.velmere_durable_computation_jobs%rowtype;
  v_attempt integer;
begin
  if p_worker_id_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_worker_id_hash'; end if;
  if p_lease_token is null or length(p_lease_token)<24 or length(p_lease_token)>120 then raise exception 'invalid_lease_token'; end if;
  if p_kinds is null or array_length(p_kinds,1) is null or not (p_kinds <@ array['vlm_analysis','lens_pdf_render','audit_pdf_render']::text[]) then raise exception 'invalid_worker_kinds'; end if;

  for v_row in
    with ranked as (
      select jobs.job_id,
        row_number() over (
          partition by jobs.subject_hash
          order by coalesce(jobs.next_attempt_at,jobs.lease_expires_at,jobs.created_at),jobs.created_at,jobs.job_id
        ) as subject_rank
      from public.velmere_durable_computation_jobs as jobs
      where jobs.sealed_payload is not null
        and jobs.kind = any(p_kinds)
        and (
          (jobs.state='retry_wait' and coalesce(jobs.next_attempt_at,v_now)<=v_now)
          or (jobs.state='processing' and coalesce(jobs.lease_expires_at,v_now)<=v_now)
        )
    )
    select jobs.*
      from public.velmere_durable_computation_jobs as jobs
      join ranked on ranked.job_id=jobs.job_id
      where ranked.subject_rank<=v_per_subject
      order by coalesce(jobs.next_attempt_at,jobs.lease_expires_at,jobs.created_at),jobs.created_at,jobs.job_id
      limit v_limit
      for update of jobs skip locked
  loop
    v_attempt := v_row.attempt_count + 1;
    if v_attempt > v_row.max_attempts then
      update public.velmere_durable_computation_jobs
        set state='dead_letter',dead_lettered_at=v_now,lease_token_hash=null,lease_expires_at=null,
            worker_id_hash=null,worker_claimed_at=null,heartbeat_at=null,updated_at=v_now
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

revoke all on function public.velmere_claim_durable_computation_worker_batch_fair(text,text,integer,integer,integer,text[]) from public,anon,authenticated;
grant execute on function public.velmere_claim_durable_computation_worker_batch_fair(text,text,integer,integer,integer,text[]) to service_role;
