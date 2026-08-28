-- Shared paid-entitlement E2E prerequisites only.
-- This packet creates no Customer FINAL or Paid Value FINAL ledger entry.
-- It deliberately preserves the active Pro grant while adding Advanced so that
-- revoking Advanced cannot erase a still-valid, independently held Pro grant.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;
set local search_path = pg_catalog;

do $preflight$
begin
  if current_user <> 'postgres' then
    raise exception 'r7_entitlement_helper_postgres_owner_required' using errcode = '42501';
  end if;
  if pg_catalog.to_regnamespace('velmere_private') is null
     or pg_catalog.to_regnamespace('extensions') is null
     or pg_catalog.to_regrole('anon') is null
     or pg_catalog.to_regrole('authenticated') is null
     or pg_catalog.to_regrole('service_role') is null
     or pg_catalog.to_regclass('velmere_private.r7_browser_paid_entitlements') is null
     or pg_catalog.to_regclass('public.velmere_account_supabase_subject_bindings') is null
     or pg_catalog.to_regclass('auth.users') is null
     or pg_catalog.to_regprocedure('extensions.gen_random_bytes(integer)') is null
  then
    raise exception 'r7_entitlement_helper_dependency_missing' using errcode = '55000';
  end if;
  if pg_catalog.to_regclass('velmere_private.r7_entitlement_oidc_jti_consumptions') is not null
     or pg_catalog.to_regprocedure('public.velmere_r7_consume_shared_entitlement_oidc_jti_v1(text,text,integer,text,text,text,timestamp with time zone,timestamp with time zone)') is not null
     or pg_catalog.to_regprocedure('public.velmere_r7_grant_browser_advanced_preserving_pro_test_v1(text,text)') is not null
     or pg_catalog.to_regprocedure('public.velmere_r7_verify_browser_test_entitlement_cleanup_v1(text)') is not null
     or pg_catalog.to_regprocedure('public.velmere_r7_verify_shared_entitlement_user_cleanup_v1(uuid[])') is not null
  then
    raise exception 'r7_entitlement_helper_target_already_exists' using errcode = '55000';
  end if;
end;
$preflight$;

create table velmere_private.r7_entitlement_oidc_jti_consumptions (
  jti_sha256 text primary key
    check (jti_sha256 ~ '^[a-f0-9]{64}$'),
  github_run_id text not null
    check (github_run_id ~ '^[1-9][0-9]{0,19}$'),
  run_attempt integer not null
    check (run_attempt between 1 and 100),
  head_sha text not null
    check (head_sha ~ '^[a-f0-9]{40}$'),
  action text not null
    check (action in ('provision', 'resolve', 'grant_advanced', 'revoke', 'cleanup')),
  request_sha256 text not null
    check (request_sha256 ~ '^[a-f0-9]{64}$'),
  token_issued_at timestamptz not null,
  token_expires_at timestamptz not null,
  consumed_at timestamptz not null default pg_catalog.clock_timestamp(),
  check (token_expires_at > token_issued_at),
  check (token_expires_at - token_issued_at <= interval '10 minutes')
);

alter table velmere_private.r7_entitlement_oidc_jti_consumptions enable row level security;
alter table velmere_private.r7_entitlement_oidc_jti_consumptions force row level security;
alter table velmere_private.r7_entitlement_oidc_jti_consumptions owner to postgres;
revoke all on table velmere_private.r7_entitlement_oidc_jti_consumptions
  from public, anon, authenticated, service_role;

create function public.velmere_r7_consume_shared_entitlement_oidc_jti_v1(
  p_jti_sha256 text,
  p_github_run_id text,
  p_run_attempt integer,
  p_head_sha text,
  p_action text,
  p_request_sha256 text,
  p_token_issued_at timestamptz,
  p_token_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_inserted integer;
begin
  if coalesce(
       nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
       ''
     ) <> 'service_role' then
    raise exception 'r7_entitlement_oidc_service_role_required' using errcode = '42501';
  end if;
  if p_jti_sha256 is null or p_jti_sha256 !~ '^[a-f0-9]{64}$'
     or p_github_run_id is null or p_github_run_id !~ '^[1-9][0-9]{0,19}$'
     or p_run_attempt is null or p_run_attempt not between 1 and 100
     or p_head_sha is null or p_head_sha !~ '^[a-f0-9]{40}$'
     or p_action is null or p_action not in ('provision', 'resolve', 'grant_advanced', 'revoke', 'cleanup')
     or p_request_sha256 is null or p_request_sha256 !~ '^[a-f0-9]{64}$'
     or p_token_issued_at is null or p_token_expires_at is null
     or p_token_issued_at < pg_catalog.now() - interval '10 minutes'
     or p_token_issued_at > pg_catalog.now() + interval '30 seconds'
     or p_token_expires_at <= pg_catalog.now() - interval '15 seconds'
     or p_token_expires_at <= p_token_issued_at
     or p_token_expires_at - p_token_issued_at > interval '10 minutes'
  then
    raise exception 'r7_entitlement_oidc_consumption_invalid' using errcode = '22023';
  end if;

  delete from velmere_private.r7_entitlement_oidc_jti_consumptions
   where token_expires_at < pg_catalog.now() - interval '30 days';

  insert into velmere_private.r7_entitlement_oidc_jti_consumptions(
    jti_sha256,
    github_run_id,
    run_attempt,
    head_sha,
    action,
    request_sha256,
    token_issued_at,
    token_expires_at
  ) values (
    p_jti_sha256,
    p_github_run_id,
    p_run_attempt,
    p_head_sha,
    p_action,
    p_request_sha256,
    p_token_issued_at,
    p_token_expires_at
  )
  on conflict (jti_sha256) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$function$;

create function public.velmere_r7_grant_browser_advanced_preserving_pro_test_v1(
  p_github_run_id text,
  p_account_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_entitlement_id text;
  v_existing velmere_private.r7_browser_paid_entitlements%rowtype;
  v_pro_expires_at timestamptz;
begin
  if coalesce(
       nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
       ''
     ) <> 'service_role' then
    raise exception 'r7_browser_paid_service_role_required' using errcode = '42501';
  end if;
  if p_github_run_id is null or p_github_run_id !~ '^[1-9][0-9]{0,19}$' then
    raise exception 'r7_browser_paid_run_invalid' using errcode = '22023';
  end if;
  if p_account_id is null or p_account_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{5,119}$' then
    raise exception 'r7_browser_paid_account_invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1
      from public.velmere_account_supabase_subject_bindings as binding
     where binding.account_id = p_account_id
  ) then
    raise exception 'r7_browser_paid_account_unbound' using errcode = '42501';
  end if;

  -- Serialize the run/account test transition. Repeated delivery while the
  -- Advanced grant is active is idempotent; delivery after revocation is denied.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_github_run_id || ':' || p_account_id, 0)
  );

  select entitlement.expires_at
    into v_pro_expires_at
    from velmere_private.r7_browser_paid_entitlements as entitlement
   where entitlement.github_run_id = p_github_run_id
     and entitlement.account_id = p_account_id
     and entitlement.product_slug = 'browser'
     and entitlement.tier = 'pro'
     and entitlement.active = true
     and entitlement.revoked_at is null
     and entitlement.expires_at > pg_catalog.now()
   order by entitlement.created_at desc
   limit 1;
  if v_pro_expires_at is null then
    raise exception 'r7_browser_active_pro_prerequisite_missing' using errcode = '42501';
  end if;

  select entitlement.*
    into v_existing
    from velmere_private.r7_browser_paid_entitlements as entitlement
   where entitlement.github_run_id = p_github_run_id
     and entitlement.account_id = p_account_id
     and entitlement.product_slug = 'browser'
     and entitlement.tier = 'advanced'
   order by entitlement.created_at desc
   limit 1;
  if found then
    if v_existing.active = true
       and v_existing.revoked_at is null
       and v_existing.expires_at > pg_catalog.now()
    then
      return pg_catalog.jsonb_build_object(
        'entitlementId', v_existing.entitlement_id,
        'state', 'IDEMPOTENT_ACTIVE'
      );
    end if;
    raise exception 'r7_browser_advanced_regrant_after_revocation_denied' using errcode = '42501';
  end if;

  v_entitlement_id := 'ent_' || pg_catalog.encode(extensions.gen_random_bytes(24), 'hex');
  insert into velmere_private.r7_browser_paid_entitlements(
    entitlement_id,
    github_run_id,
    account_id,
    product_slug,
    tier,
    active,
    created_at,
    expires_at
  ) values (
    v_entitlement_id,
    p_github_run_id,
    p_account_id,
    'browser',
    'advanced',
    true,
    pg_catalog.now(),
    v_pro_expires_at
  );
  return pg_catalog.jsonb_build_object(
    'entitlementId', v_entitlement_id,
    'state', 'CREATED'
  );
end;
$function$;

create function public.velmere_r7_verify_browser_test_entitlement_cleanup_v1(
  p_github_run_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if coalesce(
       nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
       ''
     ) <> 'service_role' then
    raise exception 'r7_browser_paid_service_role_required' using errcode = '42501';
  end if;
  if p_github_run_id is null or p_github_run_id !~ '^[1-9][0-9]{0,19}$' then
    return false;
  end if;
  return not exists (
    select 1
      from velmere_private.r7_browser_paid_entitlements as entitlement
     where entitlement.github_run_id = p_github_run_id
       and (
         entitlement.active = true
         or entitlement.revoked_at is null
       )
  );
end;
$function$;

create function public.velmere_r7_verify_shared_entitlement_user_cleanup_v1(
  p_user_ids uuid[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_requested integer;
begin
  if coalesce(
       nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
       ''
     ) <> 'service_role' then
    raise exception 'r7_entitlement_user_cleanup_service_role_required' using errcode = '42501';
  end if;
  v_requested := pg_catalog.cardinality(p_user_ids);
  if p_user_ids is null
     or v_requested not between 1 and 4
     or pg_catalog.array_position(p_user_ids, null) is not null
     or (
       select pg_catalog.count(distinct ids.user_id)
         from pg_catalog.unnest(p_user_ids) as ids(user_id)
     ) <> v_requested
  then
    raise exception 'r7_entitlement_user_cleanup_targets_invalid' using errcode = '22023';
  end if;
  return pg_catalog.jsonb_build_object(
    'requested', v_requested,
    'usersAbsent', not exists (
      select 1 from auth.users as users where users.id = any(p_user_ids)
    ),
    'bindingsAbsent', not exists (
      select 1
        from public.velmere_account_supabase_subject_bindings as binding
       where binding.supabase_subject = any(p_user_ids)
    )
  );
end;
$function$;

alter function public.velmere_r7_grant_browser_advanced_preserving_pro_test_v1(text, text)
  owner to postgres;
alter function public.velmere_r7_verify_browser_test_entitlement_cleanup_v1(text)
  owner to postgres;
alter function public.velmere_r7_verify_shared_entitlement_user_cleanup_v1(uuid[])
  owner to postgres;
alter function public.velmere_r7_consume_shared_entitlement_oidc_jti_v1(
  text, text, integer, text, text, text, timestamptz, timestamptz
) owner to postgres;

revoke all on function public.velmere_r7_grant_browser_advanced_preserving_pro_test_v1(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_r7_grant_browser_advanced_preserving_pro_test_v1(text, text)
  to service_role;

revoke all on function public.velmere_r7_verify_browser_test_entitlement_cleanup_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_r7_verify_browser_test_entitlement_cleanup_v1(text)
  to service_role;

revoke all on function public.velmere_r7_verify_shared_entitlement_user_cleanup_v1(uuid[])
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_r7_verify_shared_entitlement_user_cleanup_v1(uuid[])
  to service_role;

revoke all on function public.velmere_r7_consume_shared_entitlement_oidc_jti_v1(
  text, text, integer, text, text, text, timestamptz, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.velmere_r7_consume_shared_entitlement_oidc_jti_v1(
  text, text, integer, text, text, text, timestamptz, timestamptz
) to service_role;

comment on function public.velmere_r7_grant_browser_advanced_preserving_pro_test_v1(text, text)
  is 'Run-scoped E2E-only Advanced grant that preserves a valid Pro grant and denies post-revocation regrant.';
comment on function public.velmere_r7_verify_browser_test_entitlement_cleanup_v1(text)
  is 'Run-scoped E2E cleanup verifier; returns no entitlement, account, or capability data.';
comment on function public.velmere_r7_verify_shared_entitlement_user_cleanup_v1(uuid[])
  is 'Service-role-only verifier that test Auth users and their account bindings are physically absent.';
comment on function public.velmere_r7_consume_shared_entitlement_oidc_jti_v1(
  text, text, integer, text, text, text, timestamptz, timestamptz
) is 'Atomically consumes one hashed GitHub OIDC jti and binds it to the exact request-body digest and run identity.';

do $postflight$
declare
  v_table record;
  v_function record;
  v_count integer;
begin
  select
    c.oid,
    c.relrowsecurity,
    c.relforcerowsecurity,
    pg_catalog.pg_get_userbyid(c.relowner) as owner_name
  into strict v_table
  from pg_catalog.pg_class as c
  join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'velmere_private'
    and c.relname = 'r7_entitlement_oidc_jti_consumptions'
    and c.relkind = 'r';

  if not v_table.relrowsecurity
     or not v_table.relforcerowsecurity
     or v_table.owner_name <> 'postgres'
     or pg_catalog.has_table_privilege('anon', v_table.oid, 'select')
     or pg_catalog.has_table_privilege('anon', v_table.oid, 'insert')
     or pg_catalog.has_table_privilege('anon', v_table.oid, 'update')
     or pg_catalog.has_table_privilege('anon', v_table.oid, 'delete')
     or pg_catalog.has_table_privilege('authenticated', v_table.oid, 'select')
     or pg_catalog.has_table_privilege('authenticated', v_table.oid, 'insert')
     or pg_catalog.has_table_privilege('authenticated', v_table.oid, 'update')
     or pg_catalog.has_table_privilege('authenticated', v_table.oid, 'delete')
     or pg_catalog.has_table_privilege('service_role', v_table.oid, 'select')
     or pg_catalog.has_table_privilege('service_role', v_table.oid, 'insert')
     or pg_catalog.has_table_privilege('service_role', v_table.oid, 'update')
     or pg_catalog.has_table_privilege('service_role', v_table.oid, 'delete')
  then
    raise exception 'r7_entitlement_helper_table_postflight_failed' using errcode = '55000';
  end if;

  select pg_catalog.count(*)
  into v_count
  from pg_catalog.pg_proc as p
  join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = any (array[
      'velmere_r7_grant_browser_advanced_preserving_pro_test_v1',
      'velmere_r7_verify_browser_test_entitlement_cleanup_v1',
      'velmere_r7_consume_shared_entitlement_oidc_jti_v1',
      'velmere_r7_verify_shared_entitlement_user_cleanup_v1'
    ]);
  if v_count <> 4 then
    raise exception 'r7_entitlement_helper_function_count_invalid' using errcode = '55000';
  end if;

  for v_function in
    select
      p.oid,
      p.prosecdef,
      p.proconfig,
      pg_catalog.pg_get_userbyid(p.proowner) as owner_name,
      pg_catalog.has_function_privilege('anon', p.oid, 'execute') as anon_execute,
      pg_catalog.has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
      pg_catalog.has_function_privilege('service_role', p.oid, 'execute') as service_role_execute
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'velmere_r7_grant_browser_advanced_preserving_pro_test_v1',
        'velmere_r7_verify_browser_test_entitlement_cleanup_v1',
        'velmere_r7_consume_shared_entitlement_oidc_jti_v1',
        'velmere_r7_verify_shared_entitlement_user_cleanup_v1'
      ])
  loop
    if not v_function.prosecdef
       or v_function.owner_name <> 'postgres'
       or v_function.proconfig is distinct from array['search_path=""']::text[]
       or v_function.anon_execute
       or v_function.authenticated_execute
       or not v_function.service_role_execute
    then
      raise exception 'r7_entitlement_helper_function_postflight_failed' using errcode = '55000';
    end if;
  end loop;
end;
$postflight$;

commit;
