-- PASS4749 stores privacy-safe aggregate receipts for each scheduled worker/maintenance cycle.
-- It intentionally stores no job IDs, account IDs, subject hashes, payloads, results, tokens or raw errors.

create table if not exists public.velmere_durable_computation_cycle_receipts (
  cycle_id uuid primary key,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  ok boolean not null,
  severity text not null check (severity in ('none','warning','critical')),
  drain_skipped boolean not null,
  skip_reason text not null check (skip_reason in ('none','worker_not_configured','lease_circuit_open')),
  claimed integer not null check (claimed between 0 and 25),
  completed integer not null check (completed between 0 and 25),
  retry_wait integer not null check (retry_wait between 0 and 25),
  dead_letter integer not null check (dead_letter between 0 and 25),
  conflicts integer not null check (conflicts between 0 and 100),
  lost_ownership integer not null check (lost_ownership between 0 and 50),
  store_failed integer not null check (store_failed between 0 and 50),
  budget_rejected integer not null check (budget_rejected between 0 and 25),
  cleaned_completed integer not null check (cleaned_completed between 0 and 5000),
  cleaned_dead_letter integer not null check (cleaned_dead_letter between 0 and 5000),
  deployment_fingerprint text not null check (deployment_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  check (finished_at >= started_at)
);

alter table public.velmere_durable_computation_cycle_receipts enable row level security;
revoke all on table public.velmere_durable_computation_cycle_receipts from public, anon, authenticated;
grant select, insert, delete on table public.velmere_durable_computation_cycle_receipts to service_role;

create index if not exists velmere_durable_computation_cycle_receipts_created_idx
  on public.velmere_durable_computation_cycle_receipts(created_at desc);

create or replace function public.velmere_record_durable_computation_cycle_receipt(
  p_cycle_id uuid,
  p_started_at timestamptz,
  p_finished_at timestamptz,
  p_ok boolean,
  p_severity text,
  p_drain_skipped boolean,
  p_skip_reason text,
  p_claimed integer,
  p_completed integer,
  p_retry_wait integer,
  p_dead_letter integer,
  p_conflicts integer,
  p_lost_ownership integer,
  p_store_failed integer,
  p_budget_rejected integer,
  p_cleaned_completed integer,
  p_cleaned_dead_letter integer,
  p_deployment_fingerprint text
) returns table(state text)
language plpgsql security definer set search_path = public as $$
begin
  if p_finished_at < p_started_at then raise exception 'invalid_cycle_time_range'; end if;
  if p_severity not in ('none','warning','critical') then raise exception 'invalid_cycle_severity'; end if;
  if p_skip_reason not in ('none','worker_not_configured','lease_circuit_open') then raise exception 'invalid_cycle_skip_reason'; end if;
  if p_deployment_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'invalid_deployment_fingerprint'; end if;
  if p_claimed not between 0 and 25 or p_completed not between 0 and 25 or p_retry_wait not between 0 and 25
     or p_dead_letter not between 0 and 25 or p_budget_rejected not between 0 and 25 then
    raise exception 'invalid_cycle_worker_counts';
  end if;
  if p_conflicts not between 0 and 100 or p_lost_ownership not between 0 and 50 or p_store_failed not between 0 and 50 then
    raise exception 'invalid_cycle_failure_counts';
  end if;
  if p_cleaned_completed not between 0 and 5000 or p_cleaned_dead_letter not between 0 and 5000 then
    raise exception 'invalid_cycle_cleanup_counts';
  end if;

  insert into public.velmere_durable_computation_cycle_receipts(
    cycle_id,started_at,finished_at,ok,severity,drain_skipped,skip_reason,claimed,completed,retry_wait,
    dead_letter,conflicts,lost_ownership,store_failed,budget_rejected,cleaned_completed,cleaned_dead_letter,
    deployment_fingerprint
  ) values (
    p_cycle_id,p_started_at,p_finished_at,p_ok,p_severity,p_drain_skipped,p_skip_reason,p_claimed,p_completed,
    p_retry_wait,p_dead_letter,p_conflicts,p_lost_ownership,p_store_failed,p_budget_rejected,p_cleaned_completed,
    p_cleaned_dead_letter,p_deployment_fingerprint
  ) on conflict (cycle_id) do nothing;
  return query select 'recorded'::text;
end $$;

revoke all on function public.velmere_record_durable_computation_cycle_receipt(uuid,timestamptz,timestamptz,boolean,text,boolean,text,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function public.velmere_record_durable_computation_cycle_receipt(uuid,timestamptz,timestamptz,boolean,text,boolean,text,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,text) to service_role;
