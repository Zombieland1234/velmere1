-- PASS4748 bounds worker resource admission by cost units and encrypted payload bytes.
-- It also gives the worker an owned-lease release RPC for defensive over-claim rejection.

create or replace function public.velmere_claim_durable_computation_worker_batch_budgeted(
  p_worker_id_hash text,
  p_lease_token text,
  p_lease_seconds integer,
  p_limit integer,
  p_per_subject_limit integer,
  p_global_cost_limit integer,
  p_subject_cost_limit integer,
  p_max_claimed_payload_bytes integer,
  p_kinds text[]
) returns table(
  job_id text,
  kind text,
  input_hash text,
  subject_hash text,
  attempt_count integer,
  sealed_payload jsonb,
  cost_units integer,
  sealed_payload_bytes integer
)
language plpgsql security definer set search_path = public as $$
declare
  v_now timestamptz := now();
  v_limit integer := greatest(1,least(25,p_limit));
  v_per_subject integer := greatest(1,least(4,p_per_subject_limit));
  v_global_cost integer := greatest(1,least(128,p_global_cost_limit));
  v_subject_cost integer := greatest(1,least(32,p_subject_cost_limit));
  v_payload_budget integer := greatest(65536,least(8388608,p_max_claimed_payload_bytes));
  v_row public.velmere_durable_computation_jobs%rowtype;
  v_attempt integer;
  v_cost integer;
  v_payload_bytes integer;
begin
  if p_worker_id_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_worker_id_hash'; end if;
  if p_lease_token is null or length(p_lease_token)<24 or length(p_lease_token)>120 then raise exception 'invalid_lease_token'; end if;
  if p_kinds is null or array_length(p_kinds,1) is null or not (p_kinds <@ array['vlm_analysis','lens_pdf_render','audit_pdf_render']::text[]) then raise exception 'invalid_worker_kinds'; end if;

  for v_row in
    with eligible as (
      select
        jobs.job_id,
        jobs.subject_hash,
        jobs.created_at,
        coalesce(jobs.next_attempt_at,jobs.lease_expires_at,jobs.created_at) as ready_at,
        case jobs.kind
          when 'vlm_analysis' then 4
          when 'lens_pdf_render' then 3
          when 'audit_pdf_render' then 3
          else 16
        end as cost_units,
        octet_length(jobs.sealed_payload::text) as payload_bytes
      from public.velmere_durable_computation_jobs as jobs
      where jobs.sealed_payload is not null
        and jobs.kind = any(p_kinds)
        and octet_length(jobs.sealed_payload::text) <= 524288
        and (
          (jobs.state='retry_wait' and coalesce(jobs.next_attempt_at,v_now)<=v_now)
          or (jobs.state='processing' and coalesce(jobs.lease_expires_at,v_now)<=v_now)
        )
    ), subject_ranked as (
      select
        eligible.*,
        row_number() over (
          partition by eligible.subject_hash
          order by eligible.ready_at,eligible.created_at,eligible.job_id
        ) as subject_rank,
        sum(eligible.cost_units) over (
          partition by eligible.subject_hash
          order by eligible.ready_at,eligible.created_at,eligible.job_id
          rows between unbounded preceding and current row
        ) as subject_cost
      from eligible
    ), subject_bounded as (
      select *
      from subject_ranked
      where subject_rank <= v_per_subject
        and subject_cost <= v_subject_cost
    ), globally_ranked as (
      select
        subject_bounded.*,
        sum(subject_bounded.cost_units) over (
          order by subject_bounded.ready_at,subject_bounded.created_at,subject_bounded.job_id
          rows between unbounded preceding and current row
        ) as global_cost,
        sum(subject_bounded.payload_bytes) over (
          order by subject_bounded.ready_at,subject_bounded.created_at,subject_bounded.job_id
          rows between unbounded preceding and current row
        ) as global_payload_bytes
      from subject_bounded
    )
    select jobs.*
      from public.velmere_durable_computation_jobs as jobs
      join globally_ranked on globally_ranked.job_id=jobs.job_id
      where globally_ranked.global_cost<=v_global_cost
        and globally_ranked.global_payload_bytes<=v_payload_budget
      order by globally_ranked.ready_at,globally_ranked.created_at,globally_ranked.job_id
      limit v_limit
      for update of jobs skip locked
  loop
    v_attempt := v_row.attempt_count + 1;
    v_cost := case v_row.kind when 'vlm_analysis' then 4 when 'lens_pdf_render' then 3 when 'audit_pdf_render' then 3 else 16 end;
    v_payload_bytes := octet_length(v_row.sealed_payload::text);
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
      cost_units := v_cost;
      sealed_payload_bytes := v_payload_bytes;
      return next;
    end if;
  end loop;
end $$;

revoke all on function public.velmere_claim_durable_computation_worker_batch_budgeted(text,text,integer,integer,integer,integer,integer,integer,text[]) from public,anon,authenticated;
grant execute on function public.velmere_claim_durable_computation_worker_batch_budgeted(text,text,integer,integer,integer,integer,integer,integer,text[]) to service_role;

create or replace function public.velmere_release_durable_computation_worker_claims_budget(
  p_job_ids text[],
  p_lease_token text,
  p_reason_code text
) returns table(job_id text)
language plpgsql security definer set search_path = public as $$
begin
  if p_job_ids is null or array_length(p_job_ids,1) is null or array_length(p_job_ids,1)>25 then raise exception 'invalid_job_ids'; end if;
  if p_lease_token is null or length(p_lease_token)<24 or length(p_lease_token)>120 then raise exception 'invalid_lease_token'; end if;
  if p_reason_code !~ '^[a-z0-9:_-]{3,120}$' then raise exception 'invalid_reason_code'; end if;
  return query
    update public.velmere_durable_computation_jobs as jobs
      set state='retry_wait',
          attempt_count=greatest(0,jobs.attempt_count-1),
          next_attempt_at=now()+interval '1 second',
          last_error_code=left(p_reason_code,120),
          lease_token_hash=null,
          lease_expires_at=null,
          worker_id_hash=null,
          worker_claimed_at=null,
          heartbeat_at=null,
          updated_at=now()
      where jobs.job_id=any(p_job_ids)
        and jobs.state='processing'
        and jobs.lease_token_hash=encode(digest(p_lease_token,'sha256'),'hex')
        and jobs.lease_expires_at>now()
      returning jobs.job_id;
end $$;

revoke all on function public.velmere_release_durable_computation_worker_claims_budget(text[],text,text) from public,anon,authenticated;
grant execute on function public.velmere_release_durable_computation_worker_claims_budget(text[],text,text) to service_role;
