begin;

-- The current-authority table is intentionally a singleton because product
-- routes need one fail-closed current summary.  Preserve every promoted
-- Windows/source binding separately so advancing that singleton never erases
-- the previously validated checkpoint.
create table if not exists velmere_private.r7_source_authority_history (
  authority_id bigint generated always as identity primary key,
  candidate text not null
    check (candidate = 'R7_MERGED_CURRENT_SOURCE'),
  source_aggregate_sha256 text not null
    check (source_aggregate_sha256 ~ '^[a-f0-9]{64}$'),
  execution_slice_aggregate_sha256 text not null
    check (execution_slice_aggregate_sha256 ~ '^[a-f0-9]{64}$'),
  execution_slice_manifest_sha256 text not null
    check (execution_slice_manifest_sha256 ~ '^[a-f0-9]{64}$'),
  execution_bundle_sha256 text not null
    check (execution_bundle_sha256 ~ '^[a-f0-9]{64}$'),
  package_json_sha256 text not null
    check (package_json_sha256 ~ '^[a-f0-9]{64}$'),
  package_lock_sha256 text not null
    check (package_lock_sha256 ~ '^[a-f0-9]{64}$'),
  test_denominator integer not null
    check (test_denominator = 52),
  github_sha text not null
    check (github_sha ~ '^[a-f0-9]{40}$'),
  workflow_sha256 text not null
    check (workflow_sha256 ~ '^[a-f0-9]{64}$'),
  exact_windows_run_id text not null
    check (exact_windows_run_id ~ '^[1-9][0-9]*$'),
  exact_windows_run_attempt integer not null
    check (exact_windows_run_attempt >= 1),
  exact_windows_status text not null
    check (exact_windows_status = 'PASS'),
  recorded_at timestamptz not null default now(),
  unique (github_sha, exact_windows_run_id, exact_windows_run_attempt)
);

alter table velmere_private.r7_source_authority_history enable row level security;
revoke all on table velmere_private.r7_source_authority_history
  from public, anon, authenticated, service_role;
revoke all on sequence velmere_private.r7_source_authority_history_authority_id_seq
  from public, anon, authenticated, service_role;

-- Backfill the already validated v15 singleton before replacing the writer.
insert into velmere_private.r7_source_authority_history (
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
  recorded_at
)
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
  updated_at
from velmere_private.r7_source_authority
on conflict (github_sha, exact_windows_run_id, exact_windows_run_attempt)
do nothing;

create or replace function velmere_private.r7_source_authority_history_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  raise exception 'r7_source_authority_history_is_append_only'
    using errcode = '55000';
end
$function$;

revoke all on function velmere_private.r7_source_authority_history_immutable()
  from public, anon, authenticated, service_role;

drop trigger if exists r7_source_authority_history_no_update_delete
  on velmere_private.r7_source_authority_history;
create trigger r7_source_authority_history_no_update_delete
before update or delete on velmere_private.r7_source_authority_history
for each row execute function velmere_private.r7_source_authority_history_immutable();

drop trigger if exists r7_source_authority_history_no_truncate
  on velmere_private.r7_source_authority_history;
create trigger r7_source_authority_history_no_truncate
before truncate on velmere_private.r7_source_authority_history
for each statement execute function velmere_private.r7_source_authority_history_immutable();

create or replace function public.velmere_r7_record_source_authority(
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

  insert into velmere_private.r7_source_authority_history (
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
    exact_windows_status
  ) values (
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
    p_exact_windows_status
  )
  on conflict (github_sha, exact_windows_run_id, exact_windows_run_attempt)
  do nothing;

  insert into velmere_private.r7_source_authority (
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
    'schemaVersion', 'velmere.r7.source-authority.v4',
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
    'historyPreserved', true,
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

commit;
