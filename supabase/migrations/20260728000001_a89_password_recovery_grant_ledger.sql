-- PASS36 A89 password-recovery grant single-use ledger.
create table if not exists public.velmere_password_recovery_grants (
  nonce_hash text primary key,
  subject_fingerprint text not null,
  family_id uuid not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint velmere_password_recovery_grants_nonce_hash_check check (nonce_hash ~ '^[a-f0-9]{64}$'),
  constraint velmere_password_recovery_grants_subject_check check (subject_fingerprint ~ '^[a-f0-9]{32}$'),
  constraint velmere_password_recovery_grants_expiry_check check (expires_at > issued_at and expires_at <= issued_at + interval '10 minutes')
);

alter table public.velmere_password_recovery_grants enable row level security;
revoke all on table public.velmere_password_recovery_grants from public, anon, authenticated;
grant select, insert, update, delete on table public.velmere_password_recovery_grants to service_role;

create index if not exists velmere_password_recovery_grants_expiry_idx
  on public.velmere_password_recovery_grants (expires_at)
  where consumed_at is null;

create or replace function public.velmere_issue_password_recovery_grant(
  p_nonce_hash text,
  p_subject_fingerprint text,
  p_family_id uuid,
  p_expires_at timestamptz
)
returns table(status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'password_recovery_grant_service_role_required';
  end if;
  if p_nonce_hash is null or p_nonce_hash !~ '^[a-f0-9]{64}$'
    or p_subject_fingerprint is null or p_subject_fingerprint !~ '^[a-f0-9]{32}$'
    or p_family_id is null
    or p_expires_at is null
    or p_expires_at <= now()
    or p_expires_at > now() + interval '10 minutes'
  then
    raise exception 'password_recovery_grant_issue_input_invalid';
  end if;
  insert into public.velmere_password_recovery_grants (
    nonce_hash, subject_fingerprint, family_id, issued_at, expires_at, consumed_at
  ) values (
    p_nonce_hash, p_subject_fingerprint, p_family_id, now(), p_expires_at, null
  );
  return query select 'issued'::text;
exception
  when unique_violation then
    return query select 'duplicate'::text;
end;
$$;

create or replace function public.velmere_consume_password_recovery_grant(
  p_nonce_hash text,
  p_subject_fingerprint text,
  p_family_id uuid
)
returns table(status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'password_recovery_grant_service_role_required';
  end if;
  if p_nonce_hash is null or p_nonce_hash !~ '^[a-f0-9]{64}$'
    or p_subject_fingerprint is null or p_subject_fingerprint !~ '^[a-f0-9]{32}$'
    or p_family_id is null
  then
    raise exception 'password_recovery_grant_consume_input_invalid';
  end if;

  update public.velmere_password_recovery_grants
  set consumed_at = now()
  where nonce_hash = p_nonce_hash
    and subject_fingerprint = p_subject_fingerprint
    and family_id = p_family_id
    and consumed_at is null
    and expires_at >= now();
  if found then
    return query select 'consumed'::text;
    return;
  end if;

  if exists (
    select 1 from public.velmere_password_recovery_grants
    where nonce_hash = p_nonce_hash
      and subject_fingerprint = p_subject_fingerprint
      and family_id = p_family_id
      and consumed_at is not null
  ) then
    return query select 'replayed'::text;
  elsif exists (
    select 1 from public.velmere_password_recovery_grants
    where nonce_hash = p_nonce_hash
      and subject_fingerprint = p_subject_fingerprint
      and family_id = p_family_id
      and expires_at < now()
  ) then
    return query select 'expired'::text;
  end if;
  return query select 'missing'::text;
end;
$$;

revoke all on function public.velmere_issue_password_recovery_grant(text,text,uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.velmere_consume_password_recovery_grant(text,text,uuid) from public, anon, authenticated;
grant execute on function public.velmere_issue_password_recovery_grant(text,text,uuid,timestamptz) to service_role;
grant execute on function public.velmere_consume_password_recovery_grant(text,text,uuid) to service_role;

comment on table public.velmere_password_recovery_grants is
  'Single-use, service-role-only password recovery grant nonce ledger. Raw recovery tokens are never stored.';
comment on function public.velmere_issue_password_recovery_grant(text,text,uuid,timestamptz) is
  'Issues one hash-only recovery nonce bound to an auth-session subject and family for at most ten minutes.';
comment on function public.velmere_consume_password_recovery_grant(text,text,uuid) is
  'Atomically consumes a recovery grant once. Replays, expired grants and mismatched subject/family fail closed.';
