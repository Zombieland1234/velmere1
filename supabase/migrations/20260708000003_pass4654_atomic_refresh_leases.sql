alter table public.provider_evidence_refresh_targets
  add column if not exists lease_owner text,
  add column if not exists lease_until timestamptz;

create index if not exists provider_evidence_refresh_targets_lease_due_idx
  on public.provider_evidence_refresh_targets(next_refresh_at asc, lease_until asc, priority desc);

create or replace function public.claim_provider_evidence_refresh_targets(
  p_now timestamptz,
  p_limit integer,
  p_lease_owner text,
  p_lease_seconds integer
)
returns setof public.provider_evidence_refresh_targets
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select target_key
    from public.provider_evidence_refresh_targets
    where next_refresh_at <= p_now
      and (lease_until is null or lease_until <= p_now or lease_owner = p_lease_owner)
    order by priority desc, next_refresh_at asc
    for update skip locked
    limit least(250, greatest(1, p_limit))
  )
  update public.provider_evidence_refresh_targets as target
  set lease_owner = left(p_lease_owner, 160),
      lease_until = p_now + make_interval(secs => least(600, greatest(15, p_lease_seconds))),
      updated_at = now()
  from candidates
  where target.target_key = candidates.target_key
  returning target.*;
end;
$$;

revoke all on function public.claim_provider_evidence_refresh_targets(timestamptz, integer, text, integer) from public, anon, authenticated;
grant execute on function public.claim_provider_evidence_refresh_targets(timestamptz, integer, text, integer) to service_role;
