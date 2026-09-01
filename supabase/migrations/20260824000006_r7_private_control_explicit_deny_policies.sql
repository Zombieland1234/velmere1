begin;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'r7_jwt_signing_key',
    'r7_jwt_contexts',
    'r7_artifact_backups',
    'r7_staging_receipts',
    'r7_concurrency_restore_results',
    'r7_one_time_authorities',
    'r7_http_config',
    'r7_source_authority'
  ]
  loop
    execute format('drop policy if exists r7_private_explicit_deny_all on velmere_private.%I', table_name);
    execute format(
      'create policy r7_private_explicit_deny_all on velmere_private.%I for all to public using (false) with check (false)',
      table_name
    );
  end loop;
end
$$;

comment on schema velmere_private is
  'Server-only R7 staging control plane. No anon/authenticated privileges; explicit deny-all RLS policies provide defense in depth.';

commit;
