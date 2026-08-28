-- Run only after applying the reviewed migration to an isolated Supabase branch.
-- Every intentional test write uses an explicit negative ledger_id and the
-- entire verification transaction ends in ROLLBACK, so sequences and ledgers
-- remain unchanged.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local search_path = pg_catalog;

do $r7_verify_owner$
begin
  if current_user <> 'postgres' then
    raise exception 'r7_verification_must_run_as_postgres:%', current_user
      using errcode = '42501';
  end if;
end;
$r7_verify_owner$;

-- Exact registry rows.
select product_ordinal, product_slug
from velmere_private.r7_customer_final_registry
order by product_ordinal;

select transition_ordinal, transition_slug, family_slug, from_tier, to_tier
from velmere_private.r7_paid_value_transition_registry
order by transition_ordinal;

-- Effective privileges must remain false.
select
  role_name,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_customer_final_ledger',
    'INSERT'
  ) as customer_insert,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_customer_final_ledger',
    'UPDATE'
  ) as customer_update,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_customer_final_ledger',
    'DELETE'
  ) as customer_delete,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_customer_final_ledger',
    'TRUNCATE'
  ) as customer_truncate,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_customer_final_ledger',
    'TRIGGER'
  ) as customer_trigger,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_customer_final_ledger',
    'REFERENCES'
  ) as customer_references,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_customer_final_ledger',
    'MAINTAIN'
  ) as customer_maintain,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_paid_value_final_ledger',
    'INSERT'
  ) as paid_insert,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_paid_value_final_ledger',
    'UPDATE'
  ) as paid_update,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_paid_value_final_ledger',
    'DELETE'
  ) as paid_delete,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_paid_value_final_ledger',
    'TRUNCATE'
  ) as paid_truncate,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_paid_value_final_ledger',
    'TRIGGER'
  ) as paid_trigger,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_paid_value_final_ledger',
    'REFERENCES'
  ) as paid_references,
  pg_catalog.has_table_privilege(
    role_name,
    'public.velmere_r7_paid_value_final_ledger',
    'MAINTAIN'
  ) as paid_maintain,
  pg_catalog.has_table_privilege(
    role_name,
    'velmere_private.r7_customer_final_registry',
    'SELECT'
  ) as customer_registry_select,
  pg_catalog.has_table_privilege(
    role_name,
    'velmere_private.r7_customer_final_registry',
    'INSERT'
  ) as customer_registry_insert,
  pg_catalog.has_table_privilege(
    role_name,
    'velmere_private.r7_paid_value_transition_registry',
    'SELECT'
  ) as paid_registry_select,
  pg_catalog.has_table_privilege(
    role_name,
    'velmere_private.r7_paid_value_transition_registry',
    'INSERT'
  ) as paid_registry_insert,
  pg_catalog.has_sequence_privilege(
    role_name,
    'public.velmere_r7_customer_final_ledger_ledger_id_seq',
    'USAGE'
  ) as customer_sequence_usage,
  pg_catalog.has_sequence_privilege(
    role_name,
    'public.velmere_r7_paid_value_final_ledger_ledger_id_seq',
    'USAGE'
  ) as paid_sequence_usage,
  pg_catalog.has_function_privilege(
    role_name,
    'public.velmere_r7_finalize_paid_value_transition_v1(integer,text,jsonb,text,text)',
    'EXECUTE'
  ) as unsafe_paid_finalizer_execute
from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name)
order by role_name;

-- Make privilege drift a hard verification failure, not merely visible output.
do $r7_privilege_verification$
declare
  v_role text;
begin
  foreach v_role in array array['anon', 'authenticated', 'service_role']::text[]
  loop
    if pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_customer_final_ledger', 'INSERT'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_customer_final_ledger', 'UPDATE'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_customer_final_ledger', 'DELETE'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_customer_final_ledger', 'TRUNCATE'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_customer_final_ledger', 'REFERENCES'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_customer_final_ledger', 'TRIGGER'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_customer_final_ledger', 'MAINTAIN'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_paid_value_final_ledger', 'INSERT'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_paid_value_final_ledger', 'UPDATE'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_paid_value_final_ledger', 'DELETE'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_paid_value_final_ledger', 'TRUNCATE'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_paid_value_final_ledger', 'REFERENCES'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_paid_value_final_ledger', 'TRIGGER'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'public.velmere_r7_paid_value_final_ledger', 'MAINTAIN'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'velmere_private.r7_customer_final_registry', 'SELECT'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'velmere_private.r7_customer_final_registry', 'INSERT'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'velmere_private.r7_customer_final_registry', 'UPDATE'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'velmere_private.r7_customer_final_registry', 'DELETE'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'velmere_private.r7_customer_final_registry', 'TRUNCATE'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'velmere_private.r7_paid_value_transition_registry', 'SELECT'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'velmere_private.r7_paid_value_transition_registry', 'INSERT'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'velmere_private.r7_paid_value_transition_registry', 'UPDATE'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'velmere_private.r7_paid_value_transition_registry', 'DELETE'
       )
       or pg_catalog.has_table_privilege(
         v_role, 'velmere_private.r7_paid_value_transition_registry', 'TRUNCATE'
       )
       or pg_catalog.has_sequence_privilege(
         v_role, 'public.velmere_r7_customer_final_ledger_ledger_id_seq', 'USAGE'
       )
       or pg_catalog.has_sequence_privilege(
         v_role, 'public.velmere_r7_customer_final_ledger_ledger_id_seq', 'SELECT'
       )
       or pg_catalog.has_sequence_privilege(
         v_role, 'public.velmere_r7_customer_final_ledger_ledger_id_seq', 'UPDATE'
       )
       or pg_catalog.has_sequence_privilege(
         v_role, 'public.velmere_r7_paid_value_final_ledger_ledger_id_seq', 'USAGE'
       )
       or pg_catalog.has_sequence_privilege(
         v_role, 'public.velmere_r7_paid_value_final_ledger_ledger_id_seq', 'SELECT'
       )
       or pg_catalog.has_sequence_privilege(
         v_role, 'public.velmere_r7_paid_value_final_ledger_ledger_id_seq', 'UPDATE'
       )
       or pg_catalog.has_function_privilege(
         v_role,
         'public.velmere_r7_finalize_paid_value_transition_v1(integer,text,jsonb,text,text)',
         'EXECUTE'
       )
    then
      raise exception 'r7_verification_application_privilege_effective:%', v_role
        using errcode = '42501';
    end if;
  end loop;
end;
$r7_privilege_verification$;

-- FK and trigger installation.
select
  conrelid::pg_catalog.regclass as table_name,
  conname,
  contype,
  convalidated,
  pg_catalog.pg_get_constraintdef(oid, true) as definition
from pg_catalog.pg_constraint
where conname in (
  'r7_customer_final_ledger_registry_fkey',
  'r7_paid_value_final_ledger_registry_fkey'
)
order by conname;

select
  tgrelid::pg_catalog.regclass as table_name,
  tgname,
  tgenabled,
  pg_catalog.pg_get_triggerdef(oid, true) as definition
from pg_catalog.pg_trigger
where not tgisinternal
  and tgname in (
    'r7_customer_final_registry_no_row_mutation',
    'r7_customer_final_registry_no_truncate',
    'r7_paid_value_registry_no_row_mutation',
    'r7_paid_value_registry_no_truncate',
    'r7_customer_final_ledger_no_row_mutation_v2',
    'r7_customer_final_ledger_no_truncate_v2',
    'r7_paid_value_final_ledger_no_row_mutation',
    'r7_paid_value_final_ledger_no_truncate'
  )
order by tgrelid::pg_catalog.regclass::text, tgname;

-- Negative guard tests. Expected failures are caught and asserted by SQLSTATE.
do $r7_negative_tests$
declare
  v_paid_ordinal integer;
  v_fixture_id bigint := -9223372036854775800;
  v_rollback_sentinel constant text := 'r7_paid_fixture_rollback';
begin
  -- Customer ordinal/slug mismatch must be rejected by the registry FK.
  begin
    insert into public.velmere_r7_customer_final_ledger(
      ledger_id,
      product_ordinal,
      product_slug,
      final_status,
      full_source_aggregate_sha256,
      execution_slice_aggregate_sha256,
      evidence,
      finalized_at
    ) overriding system value values (
      -9223372036854775799,
      1,
      'audit-not-canonical',
      'FINAL',
      pg_catalog.repeat('0', 64),
      pg_catalog.repeat('1', 64),
      '{"verificationFixture":true}'::jsonb,
      pg_catalog.clock_timestamp()
    );
    raise exception 'r7_negative_customer_pair_was_accepted';
  exception
    when foreign_key_violation then null;
  end;

  -- Paid ordinal/tuple mismatch must be rejected by the registry FK.
  begin
    insert into public.velmere_r7_paid_value_final_ledger(
      ledger_id,
      transition_ordinal,
      transition_slug,
      family_slug,
      from_tier,
      to_tier,
      final_status,
      evidence,
      full_source_aggregate_sha256,
      execution_slice_aggregate_sha256,
      finalized_at
    ) values (
      -9223372036854775798,
      1,
      'audit-not-canonical',
      'audit',
      'basic',
      'pro',
      'FINAL',
      '{"verificationFixture":true}'::jsonb,
      pg_catalog.repeat('2', 64),
      pg_catalog.repeat('3', 64),
      pg_catalog.clock_timestamp()
    );
    raise exception 'r7_negative_paid_tuple_was_accepted';
  exception
    when foreign_key_violation then null;
  end;

  -- Registry is closed after canonical seed.
  begin
    insert into velmere_private.r7_customer_final_registry(
      product_ordinal,
      product_slug
    ) values (21, 'not-canonical');
    raise exception 'r7_negative_registry_insert_was_accepted';
  exception
    when sqlstate '55000' then null;
  end;

  -- Exercise UPDATE, DELETE, and TRUNCATE on a paid row inside a nested
  -- exception subtransaction. The sentinel rolls back a temporary canonical
  -- fixture when the real paid ledger is still empty.
  begin
    select pg_catalog.min(transition_ordinal)
      into v_paid_ordinal
      from public.velmere_r7_paid_value_final_ledger;

    if v_paid_ordinal is null then
      if exists (
        select 1
        from public.velmere_r7_paid_value_final_ledger
        where ledger_id = v_fixture_id
      ) then
        raise exception 'r7_negative_fixture_id_already_present';
      end if;

      insert into public.velmere_r7_paid_value_final_ledger(
        ledger_id,
        transition_ordinal,
        transition_slug,
        family_slug,
        from_tier,
        to_tier,
        final_status,
        evidence,
        full_source_aggregate_sha256,
        execution_slice_aggregate_sha256,
        finalized_at
      ) values (
        v_fixture_id,
        1,
        'audit-basic-to-pro',
        'audit',
        'basic',
        'pro',
        'FINAL',
        '{"verificationFixture":true}'::jsonb,
        pg_catalog.repeat('4', 64),
        pg_catalog.repeat('5', 64),
        pg_catalog.clock_timestamp()
      );
      v_paid_ordinal := 1;
    end if;

    begin
      update public.velmere_r7_paid_value_final_ledger
         set evidence = evidence || '{"mutationAttempt":true}'::jsonb
       where transition_ordinal = v_paid_ordinal;
      raise exception 'r7_negative_paid_update_was_accepted';
    exception
      when sqlstate '55000' then null;
    end;

    begin
      delete from public.velmere_r7_paid_value_final_ledger
       where transition_ordinal = v_paid_ordinal;
      raise exception 'r7_negative_paid_delete_was_accepted';
    exception
      when sqlstate '55000' then null;
    end;

    begin
      truncate table public.velmere_r7_paid_value_final_ledger;
      raise exception 'r7_negative_paid_truncate_was_accepted';
    exception
      when sqlstate '55000' then null;
    end;

    raise exception using
      errcode = 'P0001',
      message = v_rollback_sentinel;
  exception
    when raise_exception then
      if sqlerrm is distinct from v_rollback_sentinel then
        raise;
      end if;
  end;
end;
$r7_negative_tests$;

-- Confirm the sentinel subtransaction left no fixture behind.
do $r7_fixture_postflight$
begin
  if exists (
    select 1
    from public.velmere_r7_paid_value_final_ledger
    where ledger_id = -9223372036854775800
  ) then
    raise exception 'r7_negative_fixture_not_rolled_back'
      using errcode = '23514';
  end if;
end;
$r7_fixture_postflight$;

rollback;
