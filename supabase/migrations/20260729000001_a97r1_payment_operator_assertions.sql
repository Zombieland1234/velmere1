-- PASS36 A97R1: body-bound, single-use payment operator assertions.
create table if not exists public.velmere_payment_operator_action_assertions (
  primary_assertion_id_hash text primary key,
  scope text not null check (scope in ('payment:reconcile','payment:requeue')),
  action_digest text not null,
  body_sha256 text not null,
  actor_id_hash text not null,
  session_id_hash text not null,
  independent_approval_id_hash text unique,
  approver_actor_id_hash text,
  expires_at_ms bigint not null,
  consumed_at timestamptz not null default now(),
  check (primary_assertion_id_hash ~ '^[a-f0-9]{64}$'),
  check (action_digest ~ '^[a-f0-9]{64}$'),
  check (body_sha256 ~ '^[a-f0-9]{64}$'),
  check (actor_id_hash ~ '^[a-f0-9]{64}$'),
  check (session_id_hash ~ '^[a-f0-9]{64}$'),
  check (independent_approval_id_hash is null or independent_approval_id_hash ~ '^[a-f0-9]{64}$'),
  check (approver_actor_id_hash is null or approver_actor_id_hash ~ '^[a-f0-9]{64}$'),
  check (
    (scope = 'payment:reconcile' and independent_approval_id_hash is null and approver_actor_id_hash is null)
    or
    (scope = 'payment:requeue' and independent_approval_id_hash is not null and approver_actor_id_hash is not null and approver_actor_id_hash <> actor_id_hash)
  )
);

alter table public.velmere_payment_operator_action_assertions enable row level security;
revoke all on table public.velmere_payment_operator_action_assertions from public, anon, authenticated;

create or replace function public.velmere_consume_payment_operator_action_assertion(
  p_primary_assertion_id_hash text,
  p_scope text,
  p_action_digest text,
  p_body_sha256 text,
  p_actor_id_hash text,
  p_session_id_hash text,
  p_independent_approval_id_hash text default null,
  p_approver_actor_id_hash text default null,
  p_expires_at_ms bigint default 0
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_primary_assertion_id_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_primary_assertion_id_hash'; end if;
  if p_scope not in ('payment:reconcile','payment:requeue') then raise exception 'invalid_payment_operator_scope'; end if;
  if p_action_digest !~ '^[a-f0-9]{64}$' or p_body_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'invalid_payment_operator_action_digest'; end if;
  if p_actor_id_hash !~ '^[a-f0-9]{64}$' or p_session_id_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_payment_operator_identity'; end if;
  if p_expires_at_ms <= floor(extract(epoch from clock_timestamp()) * 1000)::bigint then raise exception 'payment_operator_assertion_expired'; end if;

  if p_scope = 'payment:requeue' then
    if p_independent_approval_id_hash is null or p_independent_approval_id_hash !~ '^[a-f0-9]{64}$' then raise exception 'independent_approval_required'; end if;
    if p_approver_actor_id_hash is null or p_approver_actor_id_hash !~ '^[a-f0-9]{64}$' or p_approver_actor_id_hash = p_actor_id_hash then raise exception 'independent_approver_invalid'; end if;
  elsif p_independent_approval_id_hash is not null or p_approver_actor_id_hash is not null then
    raise exception 'unexpected_independent_approval';
  end if;

  begin
    insert into public.velmere_payment_operator_action_assertions(
      primary_assertion_id_hash, scope, action_digest, body_sha256,
      actor_id_hash, session_id_hash, independent_approval_id_hash,
      approver_actor_id_hash, expires_at_ms
    ) values (
      p_primary_assertion_id_hash, p_scope, p_action_digest, p_body_sha256,
      p_actor_id_hash, p_session_id_hash, p_independent_approval_id_hash,
      p_approver_actor_id_hash, p_expires_at_ms
    );
  exception when unique_violation then
    return 'already_consumed';
  end;
  return 'consumed';
end;
$$;

revoke all on function public.velmere_consume_payment_operator_action_assertion(text,text,text,text,text,text,text,text,bigint) from public, anon, authenticated;
grant execute on function public.velmere_consume_payment_operator_action_assertion(text,text,text,text,text,text,text,text,bigint) to service_role;
