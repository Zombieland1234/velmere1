begin;

-- Live staging received the first source-authority shape before the complete
-- execution-slice and package binding landed in source. Upgrade either that
-- v1 shape or a fresh v2 installation without rewriting historical migrations.
alter table velmere_private.r7_source_authority
  add column if not exists execution_slice_aggregate_sha256 text;
alter table velmere_private.r7_source_authority
  add column if not exists execution_slice_manifest_sha256 text;
alter table velmere_private.r7_source_authority
  add column if not exists package_json_sha256 text;
alter table velmere_private.r7_source_authority
  add column if not exists package_lock_sha256 text;
alter table velmere_private.r7_source_authority
  add column if not exists test_denominator integer;
alter table velmere_private.r7_source_authority
  add column if not exists exact_windows_run_attempt integer;

-- A legacy row cannot prove fields which did not exist when it was recorded.
-- Remove that incomplete singleton and require a new physical Windows PASS to
-- repopulate every binding atomically through the server-only RPC below.
delete from velmere_private.r7_source_authority;

alter table velmere_private.r7_source_authority
  alter column candidate set not null,
  alter column source_aggregate_sha256 set not null,
  alter column execution_slice_aggregate_sha256 set not null,
  alter column execution_slice_manifest_sha256 set not null,
  alter column execution_bundle_sha256 set not null,
  alter column package_json_sha256 set not null,
  alter column package_lock_sha256 set not null,
  alter column test_denominator set not null,
  alter column github_sha set not null,
  alter column workflow_sha256 set not null,
  alter column exact_windows_run_id set not null,
  alter column exact_windows_run_attempt set not null,
  alter column exact_windows_status set not null,
  alter column exact_windows_status drop default;

do $constraints$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_candidate_bound_check'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_candidate_bound_check
      check (candidate = 'R7_MERGED_CURRENT_SOURCE');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_full_source_sha256_check'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_full_source_sha256_check
      check (source_aggregate_sha256 ~ '^[a-f0-9]{64}$');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_execution_slice_sha256_check'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_execution_slice_sha256_check
      check (execution_slice_aggregate_sha256 ~ '^[a-f0-9]{64}$');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_execution_manifest_sha256_check'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_execution_manifest_sha256_check
      check (execution_slice_manifest_sha256 ~ '^[a-f0-9]{64}$');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_execution_bundle_sha256_check'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_execution_bundle_sha256_check
      check (execution_bundle_sha256 ~ '^[a-f0-9]{64}$');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_package_json_sha256_check'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_package_json_sha256_check
      check (package_json_sha256 ~ '^[a-f0-9]{64}$');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_package_lock_sha256_check'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_package_lock_sha256_check
      check (package_lock_sha256 ~ '^[a-f0-9]{64}$');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_test_denominator_check'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_test_denominator_check
      check (test_denominator = 52);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_github_sha_check_v3'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_github_sha_check_v3
      check (github_sha ~ '^[a-f0-9]{40}$');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_workflow_sha256_check_v3'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_workflow_sha256_check_v3
      check (workflow_sha256 ~ '^[a-f0-9]{64}$');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_windows_run_id_check'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_windows_run_id_check
      check (exact_windows_run_id ~ '^[1-9][0-9]*$');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_windows_run_attempt_check'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_windows_run_attempt_check
      check (exact_windows_run_attempt >= 1);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'velmere_private.r7_source_authority'::regclass
      and conname = 'r7_source_authority_final_pass_only_check'
  ) then
    alter table velmere_private.r7_source_authority
      add constraint r7_source_authority_final_pass_only_check
      check (exact_windows_status = 'PASS');
  end if;
end
$constraints$;

alter table velmere_private.r7_source_authority enable row level security;
revoke all on table velmere_private.r7_source_authority
  from public, anon, authenticated, service_role;

-- Remove both historical call shapes so no incomplete authority RPC remains.
drop function if exists public.velmere_r7_record_source_authority(
  text, text, text, text, text, text, text
);
drop function if exists public.velmere_r7_record_source_authority(
  text, text, text, text, text, text, text, integer, text, text, text, text
);

create function public.velmere_r7_record_source_authority(
  p_candidate text,
  p_full_source_aggregate_sha256 text,
  p_execution_slice_aggregate_sha256 text,
  p_execution_slice_manifest_sha256 text,
  p_execution_bundle_sha256 text,
  p_package_json_sha256 text,
  p_package_lock_sha256 text,
  p_test_denominator integer,
  p_github_sha text,
  p_workflow_sha256 text,
  p_exact_windows_run_id text,
  p_exact_windows_run_attempt integer,
  p_exact_windows_status text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if p_candidate is distinct from 'R7_MERGED_CURRENT_SOURCE'
     or not coalesce(p_full_source_aggregate_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_execution_slice_aggregate_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_execution_slice_manifest_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_execution_bundle_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_package_json_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_package_lock_sha256 ~ '^[a-f0-9]{64}$', false)
     or p_test_denominator is distinct from 52
     or not coalesce(p_github_sha ~ '^[a-f0-9]{40}$', false)
     or not coalesce(p_workflow_sha256 ~ '^[a-f0-9]{64}$', false)
     or not coalesce(p_exact_windows_run_id ~ '^[1-9][0-9]*$', false)
     or p_exact_windows_run_attempt is null
     or p_exact_windows_run_attempt < 1
     or p_exact_windows_status is distinct from 'PASS'
  then
    raise exception 'r7_source_authority_requires_exact_windows_pass_and_run_attempt'
      using errcode = '23514';
  end if;

  insert into velmere_private.r7_source_authority(
    singleton,
    candidate,
    source_aggregate_sha256,
    execution_slice_aggregate_sha256,
    execution_slice_manifest_sha256,
    execution_bundle_sha256,
    package_json_sha256,
    package_lock_sha256,
    test_denominator,
    github_sha,
    workflow_sha256,
    exact_windows_run_id,
    exact_windows_run_attempt,
    exact_windows_status,
    updated_at
  ) values (
    true,
    p_candidate,
    p_full_source_aggregate_sha256,
    p_execution_slice_aggregate_sha256,
    p_execution_slice_manifest_sha256,
    p_execution_bundle_sha256,
    p_package_json_sha256,
    p_package_lock_sha256,
    p_test_denominator,
    p_github_sha,
    p_workflow_sha256,
    p_exact_windows_run_id,
    p_exact_windows_run_attempt,
    p_exact_windows_status,
    now()
  )
  on conflict (singleton) do update set
    candidate = excluded.candidate,
    source_aggregate_sha256 = excluded.source_aggregate_sha256,
    execution_slice_aggregate_sha256 = excluded.execution_slice_aggregate_sha256,
    execution_slice_manifest_sha256 = excluded.execution_slice_manifest_sha256,
    execution_bundle_sha256 = excluded.execution_bundle_sha256,
    package_json_sha256 = excluded.package_json_sha256,
    package_lock_sha256 = excluded.package_lock_sha256,
    test_denominator = excluded.test_denominator,
    github_sha = excluded.github_sha,
    workflow_sha256 = excluded.workflow_sha256,
    exact_windows_run_id = excluded.exact_windows_run_id,
    exact_windows_run_attempt = excluded.exact_windows_run_attempt,
    exact_windows_status = excluded.exact_windows_status,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'schemaVersion', 'velmere.r7.source-authority.v3',
    'candidate', p_candidate,
    'fullSourceAggregateSha256', p_full_source_aggregate_sha256,
    'executionSliceAggregateSha256', p_execution_slice_aggregate_sha256,
    'executionSliceManifestSha256', p_execution_slice_manifest_sha256,
    'executionBundleSha256', p_execution_bundle_sha256,
    'packageJsonSha256', p_package_json_sha256,
    'packageLockSha256', p_package_lock_sha256,
    'testDenominator', p_test_denominator,
    'githubSha', p_github_sha,
    'workflowSha256', p_workflow_sha256,
    'exactWindowsRunId', p_exact_windows_run_id,
    'exactWindowsRunAttempt', p_exact_windows_run_attempt,
    'exactWindowsStatus', p_exact_windows_status,
    'finalPass', true,
    'customerFinalCredit', false
  );
end
$function$;

revoke all on function public.velmere_r7_record_source_authority(
  text, text, text, text, text, text, text, integer, text, text, text, integer, text
) from public, anon, authenticated;
grant execute on function public.velmere_r7_record_source_authority(
  text, text, text, text, text, text, text, integer, text, text, text, integer, text
) to service_role;

-- Keep the public-schema summary server-only and expose booleans only for
-- identity values. A complete authority changes the common status from the
-- foundation-only PASS_PRE_WINDOWS to PASS, but never grants product FINAL.
create or replace function public.velmere_r7_common_staging_summary()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $function$
with
  gotrue as (
    select
      count(distinct user_id)::integer as user_count,
      count(distinct session_id)::integer as session_count,
      count(*) filter (where expires_at > now())::integer as active_context_count
    from velmere_private.r7_jwt_contexts
    where context_name in ('USER_A_REAL_GOTRUE','USER_B_REAL_GOTRUE')
  ),
  artifacts as (
    select
      (select count(*)::integer from public.velmere_customer_artifact_snapshots) as snapshot_count,
      (select count(*)::integer from public.velmere_customer_artifact_pdf_blobs) as pdf_count,
      (select count(*)::integer from velmere_private.r7_artifact_backups) as backup_count,
      (select count(*)::integer from velmere_private.r7_staging_receipts) as receipt_count,
      (select count(*)::integer from velmere_private.r7_concurrency_restore_results) as concurrency_result_count
  ),
  private_rls as (
    select
      count(*)::integer as table_count,
      count(*) filter (where c.relrowsecurity)::integer as rls_enabled_count
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'velmere_private' and c.relkind in ('r','p')
      and c.relname in (
        'r7_jwt_signing_key','r7_jwt_contexts','r7_artifact_backups',
        'r7_staging_receipts','r7_concurrency_restore_results',
        'r7_one_time_authorities','r7_http_config','r7_source_authority'
      )
  ),
  helper_security as (
    select count(*) filter (where not p.prosecdef)::integer as invoker_count
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('velmere_current_account_id','velmere_current_account_binding_hash')
  ),
  source_authority as (
    select
      candidate,
      source_aggregate_sha256,
      execution_slice_aggregate_sha256,
      execution_slice_manifest_sha256,
      execution_bundle_sha256,
      package_json_sha256,
      package_lock_sha256,
      test_denominator,
      github_sha,
      workflow_sha256,
      exact_windows_run_id,
      exact_windows_run_attempt,
      exact_windows_status,
      candidate = 'R7_MERGED_CURRENT_SOURCE'
        and source_aggregate_sha256 ~ '^[a-f0-9]{64}$'
        and execution_slice_aggregate_sha256 ~ '^[a-f0-9]{64}$'
        and execution_slice_manifest_sha256 ~ '^[a-f0-9]{64}$'
        and execution_bundle_sha256 ~ '^[a-f0-9]{64}$'
        and package_json_sha256 ~ '^[a-f0-9]{64}$'
        and package_lock_sha256 ~ '^[a-f0-9]{64}$'
        and test_denominator = 52
        and github_sha ~ '^[a-f0-9]{40}$'
        and workflow_sha256 ~ '^[a-f0-9]{64}$'
        and exact_windows_run_id ~ '^[1-9][0-9]*$'
        and exact_windows_run_attempt >= 1
        and exact_windows_status = 'PASS' as complete
    from velmere_private.r7_source_authority
    where singleton
  )
select jsonb_build_object(
  'schemaVersion', 'velmere.r7.common-staging-runtime-summary.v3',
  'candidate', 'R7_MERGED_CURRENT_SOURCE',
  'projectRef', 'yljjyowcvjgjcamffnvd',
  'status', case
    when g.user_count >= 2
     and g.session_count >= 2
     and a.snapshot_count >= 2
     and a.pdf_count >= 2
     and a.backup_count >= 2
     and pr.table_count = 8
     and pr.rls_enabled_count = 8
     and hs.invoker_count = 2
     and coalesce(sa.complete, false)
    then 'PASS'
    when g.user_count >= 2
     and g.session_count >= 2
     and a.snapshot_count >= 2
     and a.pdf_count >= 2
     and a.backup_count >= 2
     and pr.table_count = 8
     and pr.rls_enabled_count = 8
     and hs.invoker_count = 2
    then 'PASS_PRE_WINDOWS'
    else 'NON_PASS'
  end,
  'realGoTrueUsers', g.user_count,
  'distinctSessions', g.session_count,
  'activeJwtContexts', g.active_context_count,
  'snapshotCount', a.snapshot_count,
  'pdfBlobCount', a.pdf_count,
  'backupCount', a.backup_count,
  'stagingReceiptCount', a.receipt_count,
  'concurrencyResultCount', a.concurrency_result_count,
  'privateControlTables', pr.table_count,
  'privateControlTablesWithRls', pr.rls_enabled_count,
  'accountBindingHelpersSecurityInvoker', hs.invoker_count = 2,
  'sourceAuthorityCandidateBound', coalesce(sa.candidate = 'R7_MERGED_CURRENT_SOURCE', false),
  'fullSourceIdentityBound', coalesce(sa.source_aggregate_sha256 ~ '^[a-f0-9]{64}$', false),
  'executionSliceIdentityBound', coalesce(
    sa.execution_slice_aggregate_sha256 ~ '^[a-f0-9]{64}$'
    and sa.execution_slice_manifest_sha256 ~ '^[a-f0-9]{64}$',
    false
  ),
  'executionBundleBound', coalesce(sa.execution_bundle_sha256 ~ '^[a-f0-9]{64}$', false),
  'packageIdentityBound', coalesce(
    sa.package_json_sha256 ~ '^[a-f0-9]{64}$'
    and sa.package_lock_sha256 ~ '^[a-f0-9]{64}$',
    false
  ),
  'expectedTestDenominator', 52,
  'testDenominator', sa.test_denominator,
  'testDenominatorBound', coalesce(sa.test_denominator = 52, false),
  'exactWindowsStatus', coalesce(sa.exact_windows_status, 'NOT_EXECUTED'),
  'githubShaBound', coalesce(sa.github_sha ~ '^[a-f0-9]{40}$', false),
  'workflowShaBound', coalesce(sa.workflow_sha256 ~ '^[a-f0-9]{64}$', false),
  'exactWindowsRunBound', coalesce(
    sa.exact_windows_run_id ~ '^[1-9][0-9]*$'
    and sa.exact_windows_run_attempt >= 1,
    false
  ),
  'exactWindowsRunAttemptBound', coalesce(sa.exact_windows_run_attempt >= 1, false),
  'sourceAuthorityComplete', coalesce(sa.complete, false),
  'rawTokensReturned', false,
  'serviceRoleReturned', false,
  'customerFinalCredit', false,
  'truthBoundary', 'Owner-authorized staging summary only. Browser Basic FINAL additionally requires this exact bound Windows PASS and a fresh customer product-route E2E.'
)
from gotrue g
cross join artifacts a
cross join private_rls pr
cross join helper_security hs
left join source_authority sa on true
$function$;

revoke all on function public.velmere_r7_common_staging_summary()
  from public, anon, authenticated;
grant execute on function public.velmere_r7_common_staging_summary()
  to service_role;

comment on table velmere_private.r7_source_authority is
  'Fail-closed full-source, execution, package, GitHub workflow and exact Windows run-attempt authority. Empty until a physical bound PASS is recorded.';
comment on function public.velmere_r7_record_source_authority(
  text, text, text, text, text, text, text, integer, text, text, text, integer, text
) is 'Server-only atomic recorder for a physical exact Windows 52/52 x2 PASS, including GitHub run attempt.';
comment on function public.velmere_r7_common_staging_summary() is
  'Redacted common staging truth surface. PASS binds exact Windows but never grants product FINAL by itself.';

commit;
