-- PASS4824 ACCOUNT SESSION CENTRAL REVOCATION BEGIN
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

create index if not exists velmere_auth_session_families_subject_status_idx
  on public.velmere_auth_session_families(subject_fingerprint, status);

alter table public.velmere_auth_session_families enable row level security;
revoke all on table public.velmere_auth_session_families from public, anon, authenticated;
grant select, insert, update on table public.velmere_auth_session_families to service_role;

create or replace function public.velmere_verify_auth_session_family(
  p_family_id uuid,
  p_subject_fingerprint text,
  p_expected_generation integer,
  p_expected_expires_at timestamptz
) returns table(
  status text,
  family_id uuid,
  subject_fingerprint text,
  generation integer,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    case
      when f.status <> 'active' then f.status
      when f.expires_at <= now() then 'expired'
      when f.subject_fingerprint is distinct from p_subject_fingerprint then 'subject_mismatch'
      when f.generation is distinct from p_expected_generation then 'generation_mismatch'
      when f.expires_at is distinct from p_expected_expires_at then 'expiry_mismatch'
      else 'active'
    end::text as status,
    f.family_id,
    f.subject_fingerprint,
    f.generation,
    f.expires_at
  from public.velmere_auth_session_families f
  where f.family_id = p_family_id;
$$;

revoke all on function public.velmere_verify_auth_session_family(uuid,text,integer,timestamptz) from public, anon, authenticated;
grant execute on function public.velmere_verify_auth_session_family(uuid,text,integer,timestamptz) to service_role;

create or replace function public.velmere_revoke_auth_session_subject(
  p_subject_fingerprint text,
  p_reason_code text
) returns table(status text, revoked_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed_count integer := 0;
  subject_known boolean := false;
begin
  if p_subject_fingerprint !~ '^[a-f0-9]{32}$' then
    raise exception 'invalid_auth_session_subject';
  end if;

  update public.velmere_auth_session_families f
     set status = 'revoked',
         revoke_reason_code = left(regexp_replace(coalesce(p_reason_code, ''), '[^a-zA-Z0-9_-]', '', 'g'), 40),
         updated_at = now()
   where f.subject_fingerprint = p_subject_fingerprint
     and f.status in ('active', 'compromised');
  get diagnostics changed_count = row_count;

  select exists(
    select 1
      from public.velmere_auth_session_families f
     where f.subject_fingerprint = p_subject_fingerprint
  ) into subject_known;

  return query select
    case when subject_known then 'revoked' else 'missing' end::text,
    changed_count;
end;
$$;

revoke all on function public.velmere_revoke_auth_session_subject(text,text) from public, anon, authenticated;
grant execute on function public.velmere_revoke_auth_session_subject(text,text) to service_role;
-- PASS4824 ACCOUNT SESSION CENTRAL REVOCATION END
