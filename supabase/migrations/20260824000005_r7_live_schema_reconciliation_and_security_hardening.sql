begin;

-- R7 source/live reconciliation: these objects were exercised on the
-- owner-authorized staging project and must remain represented in current source.
create schema if not exists velmere_private;
revoke all on schema velmere_private from public, anon, authenticated;

create table if not exists velmere_private.r7_one_time_authorities (
  authority_name text primary key,
  token_sha256 text not null check (token_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  transient_token text
);

create table if not exists velmere_private.r7_source_authority (
  singleton boolean primary key default true check (singleton),
  candidate text not null,
  source_aggregate_sha256 text not null check (source_aggregate_sha256 ~ '^[a-f0-9]{64}$'),
  execution_slice_aggregate_sha256 text not null check (execution_slice_aggregate_sha256 ~ '^[a-f0-9]{64}$'),
  execution_slice_manifest_sha256 text not null check (execution_slice_manifest_sha256 ~ '^[a-f0-9]{64}$'),
  execution_bundle_sha256 text not null check (execution_bundle_sha256 ~ '^[a-f0-9]{64}$'),
  package_json_sha256 text not null check (package_json_sha256 ~ '^[a-f0-9]{64}$'),
  package_lock_sha256 text not null check (package_lock_sha256 ~ '^[a-f0-9]{64}$'),
  test_denominator integer not null check (test_denominator = 52),
  github_sha text check (github_sha is null or github_sha ~ '^[a-f0-9]{40}$'),
  workflow_sha256 text check (workflow_sha256 is null or workflow_sha256 ~ '^[a-f0-9]{64}$'),
  exact_windows_run_id text,
  exact_windows_status text not null default 'NOT_EXECUTED'
    check (exact_windows_status in ('NOT_EXECUTED','PASS','FAIL','WITHHELD')),
  updated_at timestamptz not null default now()
);
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

-- Private staging control-plane tables are server-only. RLS is enabled as
-- defense in depth; there are deliberately no anon/authenticated policies.
alter table if exists velmere_private.r7_jwt_signing_key enable row level security;
alter table if exists velmere_private.r7_jwt_contexts enable row level security;
alter table if exists velmere_private.r7_artifact_backups enable row level security;
alter table if exists velmere_private.r7_staging_receipts enable row level security;
alter table if exists velmere_private.r7_concurrency_restore_results enable row level security;
alter table if exists velmere_private.r7_one_time_authorities enable row level security;
alter table if exists velmere_private.r7_http_config enable row level security;
alter table if exists velmere_private.r7_source_authority enable row level security;

revoke all on all tables in schema velmere_private from public, anon, authenticated, service_role;
revoke all on all sequences in schema velmere_private from public, anon, authenticated, service_role;
revoke execute on all functions in schema velmere_private from public, anon, authenticated, service_role;

-- The account-binding lookup no longer needs elevated privileges. The caller
-- may read only its own binding row, and only the two columns required by the
-- helper. This removes an authenticated-callable SECURITY DEFINER surface.
grant select (account_id, supabase_subject)
  on public.velmere_account_supabase_subject_bindings to authenticated;

drop policy if exists r7_account_binding_owner_select
  on public.velmere_account_supabase_subject_bindings;
create policy r7_account_binding_owner_select
  on public.velmere_account_supabase_subject_bindings
  for select to authenticated
  using ((select auth.uid()) is not null and supabase_subject = (select auth.uid()));

alter function public.velmere_current_account_id() security invoker;
alter function public.velmere_current_account_binding_hash() security invoker;

-- Fix the mutable search_path warning without changing token encoding.
alter function velmere_private.b64url(bytea) set search_path = pg_catalog;

-- Cover the PDF->snapshot foreign key and the two RLS lookup dimensions.
create index if not exists r7_customer_artifact_pdf_snapshot_id_idx
  on public.velmere_customer_artifact_pdf_blobs(snapshot_id);
create index if not exists r7_customer_artifact_snapshot_owner_idx
  on public.velmere_customer_artifact_snapshots(account_id, account_id_hash);
create index if not exists r7_customer_artifact_pdf_owner_idx
  on public.velmere_customer_artifact_pdf_blobs(account_id, account_id_hash);

-- Exact Windows authority can be recorded only after a real bound PASS. Full
-- source identity, execution projection and transported bytes remain distinct.
create or replace function public.velmere_r7_record_source_authority(
  p_candidate text,
  p_source_aggregate_sha256 text,
  p_execution_slice_aggregate_sha256 text,
  p_execution_slice_manifest_sha256 text,
  p_execution_bundle_sha256 text,
  p_package_json_sha256 text,
  p_package_lock_sha256 text,
  p_test_denominator integer,
  p_github_sha text,
  p_workflow_sha256 text,
  p_exact_windows_run_id text,
  p_exact_windows_status text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, velmere_private
as $$
begin
  if p_candidate <> 'R7_MERGED_CURRENT_SOURCE'
     or p_source_aggregate_sha256 !~ '^[a-f0-9]{64}$'
     or p_execution_slice_aggregate_sha256 !~ '^[a-f0-9]{64}$'
     or p_execution_slice_manifest_sha256 !~ '^[a-f0-9]{64}$'
     or p_execution_bundle_sha256 !~ '^[a-f0-9]{64}$'
     or p_package_json_sha256 !~ '^[a-f0-9]{64}$'
     or p_package_lock_sha256 !~ '^[a-f0-9]{64}$'
     or p_test_denominator <> 52
     or p_github_sha !~ '^[a-f0-9]{40}$'
     or p_workflow_sha256 !~ '^[a-f0-9]{64}$'
     or nullif(btrim(p_exact_windows_run_id), '') is null
     or p_exact_windows_status <> 'PASS'
  then
    raise exception 'r7_source_authority_requires_exact_windows_pass'
      using errcode = '23514';
  end if;

  insert into velmere_private.r7_source_authority(
    singleton, candidate, source_aggregate_sha256,
    execution_slice_aggregate_sha256, execution_slice_manifest_sha256,
    execution_bundle_sha256, package_json_sha256, package_lock_sha256,
    test_denominator, github_sha, workflow_sha256, exact_windows_run_id,
    exact_windows_status, updated_at
  ) values (
    true, p_candidate, p_source_aggregate_sha256,
    p_execution_slice_aggregate_sha256, p_execution_slice_manifest_sha256,
    p_execution_bundle_sha256, p_package_json_sha256, p_package_lock_sha256,
    p_test_denominator, p_github_sha, p_workflow_sha256,
    p_exact_windows_run_id, p_exact_windows_status, now()
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
    exact_windows_status = excluded.exact_windows_status,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'schemaVersion', 'velmere.r7.source-authority.v2',
    'candidate', p_candidate,
    'sourceAggregateSha256', p_source_aggregate_sha256,
    'executionSliceAggregateSha256', p_execution_slice_aggregate_sha256,
    'executionSliceManifestSha256', p_execution_slice_manifest_sha256,
    'executionBundleSha256', p_execution_bundle_sha256,
    'packageJsonSha256', p_package_json_sha256,
    'packageLockSha256', p_package_lock_sha256,
    'testDenominator', p_test_denominator,
    'githubSha', p_github_sha,
    'workflowSha256', p_workflow_sha256,
    'exactWindowsRunId', p_exact_windows_run_id,
    'exactWindowsStatus', p_exact_windows_status,
    'customerFinalCredit', false
  );
end
$$;
revoke all on function public.velmere_r7_record_source_authority(text,text,text,text,text,text,text,integer,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.velmere_r7_record_source_authority(text,text,text,text,text,text,text,integer,text,text,text,text)
  to service_role;

-- Redacted deployed receipt. It reports counts and gates, never JWTs, keys,
-- account IDs, provider errors, service-role credentials, or private payloads.
create or replace function public.velmere_r7_common_staging_summary()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, velmere_private, auth
as $$
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
    select exact_windows_status, github_sha, exact_windows_run_id,
           source_aggregate_sha256, execution_slice_aggregate_sha256,
           execution_slice_manifest_sha256, execution_bundle_sha256,
           package_json_sha256, package_lock_sha256, test_denominator
    from velmere_private.r7_source_authority where singleton
  )
select jsonb_build_object(
  'schemaVersion', 'velmere.r7.common-staging-runtime-summary.v2',
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
  'exactWindowsStatus', coalesce(sa.exact_windows_status, 'NOT_EXECUTED'),
  'fullSourceIdentityBound', sa.source_aggregate_sha256 is not null,
  'executionSliceIdentityBound', sa.execution_slice_aggregate_sha256 is not null and sa.execution_slice_manifest_sha256 is not null,
  'executionBundleBound', sa.execution_bundle_sha256 is not null,
  'packageIdentityBound', sa.package_json_sha256 is not null and sa.package_lock_sha256 is not null,
  'testDenominator', coalesce(sa.test_denominator, 52),
  'githubShaBound', sa.github_sha is not null,
  'exactWindowsRunBound', sa.exact_windows_run_id is not null,
  'rawTokensReturned', false,
  'serviceRoleReturned', false,
  'customerFinalCredit', false,
  'truthBoundary', 'Owner-authorized staging summary only. Browser Basic FINAL additionally requires exact current R7 Windows PASS and the bound customer route.'
)
from gotrue g
cross join artifacts a
cross join private_rls pr
cross join helper_security hs
left join source_authority sa on true
$$;
revoke all on function public.velmere_r7_common_staging_summary()
  from public, anon, authenticated;
grant execute on function public.velmere_r7_common_staging_summary()
  to service_role;

comment on table velmere_private.r7_source_authority is
  'Fail-closed exact source/Windows authority. Empty until a physical bound Windows PASS is recorded.';
comment on function public.velmere_r7_common_staging_summary() is
  'Redacted staging receipt surface. It never grants Customer FINAL by itself.';

commit;
