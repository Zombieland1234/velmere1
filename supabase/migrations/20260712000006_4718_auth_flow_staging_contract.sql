-- PASS4718 MEGA: staging-safe auth/RLS contract snapshot and privacy-safe auth event ledger.

create table if not exists public.velmere_auth_security_events (
  id bigint generated always as identity primary key,
  event_family text not null check (event_family in ('session','oauth','recovery','binding','rls')),
  outcome text not null check (outcome in ('success','rejected','pending','conflict','unavailable')),
  time_bucket timestamptz not null default date_trunc('hour', now()),
  count integer not null default 1 check (count between 1 and 1000000),
  created_at timestamptz not null default now(),
  unique (event_family, outcome, time_bucket)
);

alter table public.velmere_auth_security_events enable row level security;
revoke all on table public.velmere_auth_security_events from public, anon, authenticated;
grant select, insert, update on table public.velmere_auth_security_events to service_role;

create or replace function public.velmere_record_auth_security_event(
  p_event_family text,
  p_outcome text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_family not in ('session','oauth','recovery','binding','rls')
     or p_outcome not in ('success','rejected','pending','conflict','unavailable') then
    raise exception 'invalid_auth_security_event';
  end if;
  insert into public.velmere_auth_security_events(event_family, outcome, time_bucket, count)
  values (p_event_family, p_outcome, date_trunc('hour', now()), 1)
  on conflict (event_family, outcome, time_bucket)
  do update set count = least(1000000, public.velmere_auth_security_events.count + 1);
end;
$$;
revoke all on function public.velmere_record_auth_security_event(text,text) from public, anon, authenticated;
grant execute on function public.velmere_record_auth_security_event(text,text) to service_role;

create or replace function public.velmere_auth_rls_contract_snapshot()
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'schemaVersion', 'velmere.auth-rls-contract-snapshot.v1',
    'profilesRls', coalesce((select relrowsecurity from pg_class where oid = 'public.velmere_profiles'::regclass), false),
    'postsRls', coalesce((select relrowsecurity from pg_class where oid = 'public.velmere_square_posts'::regclass), false),
    'commentsRls', coalesce((select relrowsecurity from pg_class where oid = 'public.velmere_square_comments'::regclass), false),
    'profileOwnerPolicies', (select count(*) from pg_policies where schemaname='public' and tablename='velmere_profiles' and policyname like 'velmere_profiles_owner_%'),
    'postOwnerPolicies', (select count(*) from pg_policies where schemaname='public' and tablename='velmere_square_posts' and policyname like 'velmere_square_posts_owner_%'),
    'commentOwnerPolicies', (select count(*) from pg_policies where schemaname='public' and tablename='velmere_square_comments' and policyname like 'velmere_square_comments_owner_%'),
    'publicPostPolicyApprovedOnly', exists(select 1 from pg_policies where schemaname='public' and tablename='velmere_square_posts' and policyname='Public can read approved Velmere Square posts' and qual ilike '%approved%'),
    'publicCommentPolicyApprovedOnly', exists(select 1 from pg_policies where schemaname='public' and tablename='velmere_square_comments' and policyname='Public can read approved Velmere Square comments' and qual ilike '%approved%')
  );
$$;
revoke all on function public.velmere_auth_rls_contract_snapshot() from public, anon, authenticated;
grant execute on function public.velmere_auth_rls_contract_snapshot() to service_role;
