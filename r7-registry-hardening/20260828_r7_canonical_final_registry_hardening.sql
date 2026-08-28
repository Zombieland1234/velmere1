-- Reviewed canonical migration for the Velmère R7 final ledgers.
-- Apply only through the Supabase migration authority after an exact live rollback dry-run.
--
-- Intent:
--   * install immutable canonical registries for all 20 Customer FINAL rows
--     and all 10 Paid Value transitions;
--   * bind every future ledger INSERT to those exact registries by FK;
--   * preserve every pre-existing ledger row byte-for-byte;
--   * make both ledgers append-only and remove direct application DML;
--   * disable the unsafe generic paid finalizer without replacing it with
--     another assertion-trusting generic finalizer.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local check_function_bodies = on;
set local search_path = pg_catalog;

-- Object/role preflight. Drift aborts the whole transaction before any DDL.
do $r7_object_preflight$
begin
  if current_user <> 'postgres' then
    raise exception 'r7_registry_hardening_must_run_as_postgres:%', current_user
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_namespace where nspname = 'velmere_private'
  ) then
    raise exception 'r7_registry_hardening_private_schema_missing'
      using errcode = '55000';
  end if;

  if pg_catalog.to_regclass('public.velmere_r7_customer_final_ledger') is null then
    raise exception 'r7_registry_hardening_customer_ledger_missing'
      using errcode = '55000';
  end if;

  if pg_catalog.to_regclass('public.velmere_r7_paid_value_final_ledger') is null then
    raise exception 'r7_registry_hardening_paid_ledger_missing'
      using errcode = '55000';
  end if;

  if pg_catalog.to_regclass('public.velmere_r7_customer_final_ledger_ledger_id_seq') is null
     or pg_catalog.to_regclass('public.velmere_r7_paid_value_final_ledger_ledger_id_seq') is null
  then
    raise exception 'r7_registry_hardening_ledger_sequence_missing'
      using errcode = '55000';
  end if;

  if pg_catalog.to_regprocedure(
       'public.velmere_r7_finalize_paid_value_transition_v1(integer,text,jsonb,text,text)'
     ) is null
  then
    raise exception 'r7_registry_hardening_unsafe_paid_finalizer_signature_missing'
      using errcode = '55000';
  end if;

  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon')
     or not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated')
     or not exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role')
  then
    raise exception 'r7_registry_hardening_expected_supabase_roles_missing'
      using errcode = '55000';
  end if;
end;
$r7_object_preflight$;

-- Prevent concurrent ledger writes between preflight and guard installation.
lock table
  public.velmere_r7_customer_final_ledger,
  public.velmere_r7_paid_value_final_ledger
in share row exclusive mode;

-- Validate every existing pair before creating any registry. The five known
-- Customer FINAL rows must exist, but additional already-FINAL canonical rows
-- are preserved if this proposal is deployed after further legitimate closure.
do $r7_live_ledger_preflight$
declare
  v_bad integer;
  v_required integer;
begin
  with expected(product_ordinal, product_slug) as (
    values
      (1,  'audit-basic'),
      (2,  'audit-pro'),
      (3,  'audit-advanced'),
      (4,  'browser-basic'),
      (5,  'browser-pro'),
      (6,  'browser-advanced'),
      (7,  'shield-basic'),
      (8,  'shield-pro'),
      (9,  'shield-advanced'),
      (10, 'shield-pro-basic'),
      (11, 'shield-pro-pro'),
      (12, 'shield-pro-advanced'),
      (13, 'real-markets-basic'),
      (14, 'real-markets-pro'),
      (15, 'real-markets-advanced'),
      (16, 'shield-map'),
      (17, 'market-impact'),
      (18, 'whale-watch'),
      (19, 'angel'),
      (20, 'risk-indicator')
  )
  select pg_catalog.count(*)::integer
    into v_bad
    from public.velmere_r7_customer_final_ledger as l
    left join expected as e
      on e.product_ordinal = l.product_ordinal
     and e.product_slug = l.product_slug
   where e.product_ordinal is null;

  if v_bad <> 0 then
    raise exception 'r7_registry_hardening_noncanonical_customer_rows:%', v_bad
      using errcode = '23514';
  end if;

  with required(product_ordinal, product_slug) as (
    values
      (4, 'browser-basic'),
      (7, 'shield-basic'),
      (17, 'market-impact'),
      (18, 'whale-watch'),
      (20, 'risk-indicator')
  )
  select pg_catalog.count(*)::integer
    into v_required
    from required as r
    join public.velmere_r7_customer_final_ledger as l
      on l.product_ordinal = r.product_ordinal
     and l.product_slug = r.product_slug
     and l.final_status = 'FINAL';

  if v_required <> 5 then
    raise exception 'r7_registry_hardening_existing_five_final_rows_missing:%', v_required
      using errcode = '23514';
  end if;

  with expected(
    transition_ordinal,
    transition_slug,
    family_slug,
    from_tier,
    to_tier
  ) as (
    values
      (1,  'audit-basic-to-pro',             'audit',        'basic', 'pro'),
      (2,  'audit-pro-to-advanced',          'audit',        'pro',   'advanced'),
      (3,  'browser-basic-to-pro',           'browser',      'basic', 'pro'),
      (4,  'browser-pro-to-advanced',        'browser',      'pro',   'advanced'),
      (5,  'shield-basic-to-pro',            'shield',       'basic', 'pro'),
      (6,  'shield-pro-to-advanced',         'shield',       'pro',   'advanced'),
      (7,  'shield-pro-basic-to-pro',        'shield-pro',   'basic', 'pro'),
      (8,  'shield-pro-pro-to-advanced',     'shield-pro',   'pro',   'advanced'),
      (9,  'real-markets-basic-to-pro',      'real-markets', 'basic', 'pro'),
      (10, 'real-markets-pro-to-advanced',   'real-markets', 'pro',   'advanced')
  )
  select pg_catalog.count(*)::integer
    into v_bad
    from public.velmere_r7_paid_value_final_ledger as l
    left join expected as e
      on e.transition_ordinal = l.transition_ordinal
     and e.transition_slug = l.transition_slug
     and e.family_slug = l.family_slug
     and e.from_tier = l.from_tier
     and e.to_tier = l.to_tier
   where e.transition_ordinal is null;

  if v_bad <> 0 then
    raise exception 'r7_registry_hardening_noncanonical_paid_rows:%', v_bad
      using errcode = '23514';
  end if;
end;
$r7_live_ledger_preflight$;

-- Transaction-local exact snapshots prove this migration never rewrites,
-- deletes, or inserts a ledger row.
create temporary table r7_customer_final_ledger_before
on commit drop
as select * from public.velmere_r7_customer_final_ledger;

create temporary table r7_paid_value_final_ledger_before
on commit drop
as select * from public.velmere_r7_paid_value_final_ledger;

create table if not exists velmere_private.r7_customer_final_registry (
  product_ordinal integer not null,
  product_slug text not null,
  constraint r7_customer_final_registry_pkey
    primary key (product_ordinal),
  constraint r7_customer_final_registry_slug_key
    unique (product_slug),
  constraint r7_customer_final_registry_pair_key
    unique (product_ordinal, product_slug),
  constraint r7_customer_final_registry_ordinal_chk
    check (product_ordinal between 1 and 20),
  constraint r7_customer_final_registry_slug_chk
    check (product_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists velmere_private.r7_paid_value_transition_registry (
  transition_ordinal integer not null,
  transition_slug text not null,
  family_slug text not null,
  from_tier text not null,
  to_tier text not null,
  constraint r7_paid_value_transition_registry_pkey
    primary key (transition_ordinal),
  constraint r7_paid_value_transition_registry_slug_key
    unique (transition_slug),
  constraint r7_paid_value_transition_registry_tuple_key
    unique (transition_ordinal, transition_slug, family_slug, from_tier, to_tier),
  constraint r7_paid_value_transition_registry_ordinal_chk
    check (transition_ordinal between 1 and 10),
  constraint r7_paid_value_transition_registry_slug_chk
    check (transition_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint r7_paid_value_transition_registry_family_chk
    check (family_slug in ('audit', 'browser', 'shield', 'shield-pro', 'real-markets')),
  constraint r7_paid_value_transition_registry_tier_chk
    check (
      (from_tier = 'basic' and to_tier = 'pro')
      or (from_tier = 'pro' and to_tier = 'advanced')
    )
);

-- A retry may encounter the tables created by an earlier successful run. Pin
-- their owner before any seed/guard work so no application role can retain
-- owner-only trigger or DDL capabilities.
alter table velmere_private.r7_customer_final_registry owner to postgres;
alter table velmere_private.r7_paid_value_transition_registry owner to postgres;

-- Existing registry data, if any, may only be an exact subset. This makes a
-- retry idempotent while refusing to repair or normalize unexplained drift.
do $r7_registry_subset_preflight$
declare
  v_bad integer;
begin
  with expected(product_ordinal, product_slug) as (
    values
      (1, 'audit-basic'), (2, 'audit-pro'), (3, 'audit-advanced'),
      (4, 'browser-basic'), (5, 'browser-pro'), (6, 'browser-advanced'),
      (7, 'shield-basic'), (8, 'shield-pro'), (9, 'shield-advanced'),
      (10, 'shield-pro-basic'), (11, 'shield-pro-pro'), (12, 'shield-pro-advanced'),
      (13, 'real-markets-basic'), (14, 'real-markets-pro'), (15, 'real-markets-advanced'),
      (16, 'shield-map'), (17, 'market-impact'), (18, 'whale-watch'),
      (19, 'angel'), (20, 'risk-indicator')
  )
  select pg_catalog.count(*)::integer
    into v_bad
    from velmere_private.r7_customer_final_registry as r
    left join expected as e
      on e.product_ordinal = r.product_ordinal
     and e.product_slug = r.product_slug
   where e.product_ordinal is null;

  if v_bad <> 0 then
    raise exception 'r7_registry_hardening_customer_registry_drift:%', v_bad
      using errcode = '23514';
  end if;

  with expected(transition_ordinal, transition_slug, family_slug, from_tier, to_tier) as (
    values
      (1, 'audit-basic-to-pro', 'audit', 'basic', 'pro'),
      (2, 'audit-pro-to-advanced', 'audit', 'pro', 'advanced'),
      (3, 'browser-basic-to-pro', 'browser', 'basic', 'pro'),
      (4, 'browser-pro-to-advanced', 'browser', 'pro', 'advanced'),
      (5, 'shield-basic-to-pro', 'shield', 'basic', 'pro'),
      (6, 'shield-pro-to-advanced', 'shield', 'pro', 'advanced'),
      (7, 'shield-pro-basic-to-pro', 'shield-pro', 'basic', 'pro'),
      (8, 'shield-pro-pro-to-advanced', 'shield-pro', 'pro', 'advanced'),
      (9, 'real-markets-basic-to-pro', 'real-markets', 'basic', 'pro'),
      (10, 'real-markets-pro-to-advanced', 'real-markets', 'pro', 'advanced')
  )
  select pg_catalog.count(*)::integer
    into v_bad
    from velmere_private.r7_paid_value_transition_registry as r
    left join expected as e
      on e.transition_ordinal = r.transition_ordinal
     and e.transition_slug = r.transition_slug
     and e.family_slug = r.family_slug
     and e.from_tier = r.from_tier
     and e.to_tier = r.to_tier
   where e.transition_ordinal is null;

  if v_bad <> 0 then
    raise exception 'r7_registry_hardening_paid_registry_drift:%', v_bad
      using errcode = '23514';
  end if;
end;
$r7_registry_subset_preflight$;

insert into velmere_private.r7_customer_final_registry(product_ordinal, product_slug)
select e.product_ordinal, e.product_slug
from (
  values
    (1, 'audit-basic'), (2, 'audit-pro'), (3, 'audit-advanced'),
    (4, 'browser-basic'), (5, 'browser-pro'), (6, 'browser-advanced'),
    (7, 'shield-basic'), (8, 'shield-pro'), (9, 'shield-advanced'),
    (10, 'shield-pro-basic'), (11, 'shield-pro-pro'), (12, 'shield-pro-advanced'),
    (13, 'real-markets-basic'), (14, 'real-markets-pro'), (15, 'real-markets-advanced'),
    (16, 'shield-map'), (17, 'market-impact'), (18, 'whale-watch'),
    (19, 'angel'), (20, 'risk-indicator')
) as e(product_ordinal, product_slug)
where not exists (
  select 1
  from velmere_private.r7_customer_final_registry as r
  where r.product_ordinal = e.product_ordinal
     or r.product_slug = e.product_slug
);

insert into velmere_private.r7_paid_value_transition_registry(
  transition_ordinal,
  transition_slug,
  family_slug,
  from_tier,
  to_tier
)
select
  e.transition_ordinal,
  e.transition_slug,
  e.family_slug,
  e.from_tier,
  e.to_tier
from (
  values
    (1, 'audit-basic-to-pro', 'audit', 'basic', 'pro'),
    (2, 'audit-pro-to-advanced', 'audit', 'pro', 'advanced'),
    (3, 'browser-basic-to-pro', 'browser', 'basic', 'pro'),
    (4, 'browser-pro-to-advanced', 'browser', 'pro', 'advanced'),
    (5, 'shield-basic-to-pro', 'shield', 'basic', 'pro'),
    (6, 'shield-pro-to-advanced', 'shield', 'pro', 'advanced'),
    (7, 'shield-pro-basic-to-pro', 'shield-pro', 'basic', 'pro'),
    (8, 'shield-pro-pro-to-advanced', 'shield-pro', 'pro', 'advanced'),
    (9, 'real-markets-basic-to-pro', 'real-markets', 'basic', 'pro'),
    (10, 'real-markets-pro-to-advanced', 'real-markets', 'pro', 'advanced')
) as e(transition_ordinal, transition_slug, family_slug, from_tier, to_tier)
where not exists (
  select 1
  from velmere_private.r7_paid_value_transition_registry as r
  where r.transition_ordinal = e.transition_ordinal
     or r.transition_slug = e.transition_slug
);

do $r7_registry_exactness$
declare
  v_customer_count integer;
  v_paid_count integer;
begin
  select pg_catalog.count(*)::integer
    into v_customer_count
    from velmere_private.r7_customer_final_registry;
  select pg_catalog.count(*)::integer
    into v_paid_count
    from velmere_private.r7_paid_value_transition_registry;

  if v_customer_count <> 20 or v_paid_count <> 10 then
    raise exception 'r7_registry_hardening_registry_denominator_invalid:%/%',
      v_customer_count, v_paid_count
      using errcode = '23514';
  end if;
end;
$r7_registry_exactness$;

-- Private trigger helpers only. They reference no unqualified application
-- object and pin an empty search_path. SECURITY INVOKER is sufficient.
create or replace function velmere_private.r7_reject_registry_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $r7_function$
begin
  raise exception using
    errcode = '55000',
    message = pg_catalog.format(
      'immutable registry mutation denied: %I.%I (%s)',
      tg_table_schema,
      tg_table_name,
      tg_op
    );
  return null;
end;
$r7_function$;

create or replace function velmere_private.r7_reject_append_only_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $r7_function$
begin
  raise exception using
    errcode = '55000',
    message = pg_catalog.format(
      'append-only ledger mutation denied: %I.%I (%s)',
      tg_table_schema,
      tg_table_name,
      tg_op
    );
  return null;
end;
$r7_function$;

alter function velmere_private.r7_reject_registry_mutation_v1() owner to postgres;
alter function velmere_private.r7_reject_append_only_mutation_v1() owner to postgres;

revoke all privileges on function velmere_private.r7_reject_registry_mutation_v1()
  from public, anon, authenticated, service_role;
revoke all privileges on function velmere_private.r7_reject_append_only_mutation_v1()
  from public, anon, authenticated, service_role;

-- Seed is complete; all future registry row writes and truncation fail closed.
drop trigger if exists r7_customer_final_registry_no_row_mutation
  on velmere_private.r7_customer_final_registry;
create trigger r7_customer_final_registry_no_row_mutation
before insert or update or delete
on velmere_private.r7_customer_final_registry
for each row
execute function velmere_private.r7_reject_registry_mutation_v1();

drop trigger if exists r7_customer_final_registry_no_truncate
  on velmere_private.r7_customer_final_registry;
create trigger r7_customer_final_registry_no_truncate
before truncate
on velmere_private.r7_customer_final_registry
for each statement
execute function velmere_private.r7_reject_registry_mutation_v1();

drop trigger if exists r7_paid_value_registry_no_row_mutation
  on velmere_private.r7_paid_value_transition_registry;
create trigger r7_paid_value_registry_no_row_mutation
before insert or update or delete
on velmere_private.r7_paid_value_transition_registry
for each row
execute function velmere_private.r7_reject_registry_mutation_v1();

drop trigger if exists r7_paid_value_registry_no_truncate
  on velmere_private.r7_paid_value_transition_registry;
create trigger r7_paid_value_registry_no_truncate
before truncate
on velmere_private.r7_paid_value_transition_registry
for each statement
execute function velmere_private.r7_reject_registry_mutation_v1();

-- Declarative, immediate registry binding. Recreate by exact name atomically so
-- an idempotent retry cannot silently retain a weaker prior definition.
alter table public.velmere_r7_customer_final_ledger
  drop constraint if exists r7_customer_final_ledger_registry_fkey;
alter table public.velmere_r7_customer_final_ledger
  add constraint r7_customer_final_ledger_registry_fkey
  foreign key (product_ordinal, product_slug)
  references velmere_private.r7_customer_final_registry(product_ordinal, product_slug)
  on update restrict
  on delete restrict
  not valid;
alter table public.velmere_r7_customer_final_ledger
  validate constraint r7_customer_final_ledger_registry_fkey;

alter table public.velmere_r7_paid_value_final_ledger
  drop constraint if exists r7_paid_value_final_ledger_registry_fkey;
alter table public.velmere_r7_paid_value_final_ledger
  add constraint r7_paid_value_final_ledger_registry_fkey
  foreign key (
    transition_ordinal,
    transition_slug,
    family_slug,
    from_tier,
    to_tier
  )
  references velmere_private.r7_paid_value_transition_registry(
    transition_ordinal,
    transition_slug,
    family_slug,
    from_tier,
    to_tier
  )
  on update restrict
  on delete restrict
  not valid;
alter table public.velmere_r7_paid_value_final_ledger
  validate constraint r7_paid_value_final_ledger_registry_fkey;

-- Defense-in-depth append-only triggers. The pre-existing Customer trigger is
-- retained; this private helper additionally supplies a canonical hardening
-- control and blocks TRUNCATE, which the earlier row trigger did not cover.
drop trigger if exists r7_customer_final_ledger_no_row_mutation_v2
  on public.velmere_r7_customer_final_ledger;
create trigger r7_customer_final_ledger_no_row_mutation_v2
before update or delete
on public.velmere_r7_customer_final_ledger
for each row
execute function velmere_private.r7_reject_append_only_mutation_v1();

drop trigger if exists r7_customer_final_ledger_no_truncate_v2
  on public.velmere_r7_customer_final_ledger;
create trigger r7_customer_final_ledger_no_truncate_v2
before truncate
on public.velmere_r7_customer_final_ledger
for each statement
execute function velmere_private.r7_reject_append_only_mutation_v1();

drop trigger if exists r7_paid_value_final_ledger_no_row_mutation
  on public.velmere_r7_paid_value_final_ledger;
create trigger r7_paid_value_final_ledger_no_row_mutation
before update or delete
on public.velmere_r7_paid_value_final_ledger
for each row
execute function velmere_private.r7_reject_append_only_mutation_v1();

drop trigger if exists r7_paid_value_final_ledger_no_truncate
  on public.velmere_r7_paid_value_final_ledger;
create trigger r7_paid_value_final_ledger_no_truncate
before truncate
on public.velmere_r7_paid_value_final_ledger
for each statement
execute function velmere_private.r7_reject_append_only_mutation_v1();

alter table velmere_private.r7_customer_final_registry enable row level security;
alter table velmere_private.r7_customer_final_registry force row level security;
alter table velmere_private.r7_paid_value_transition_registry enable row level security;
alter table velmere_private.r7_paid_value_transition_registry force row level security;

-- Registries are internal control-plane data. Ledger reads remain untouched,
-- but no application role keeps direct INSERT/UPDATE/DELETE/TRUNCATE.
revoke all privileges on table velmere_private.r7_customer_final_registry
  from public, anon, authenticated, service_role;
revoke all privileges on table velmere_private.r7_paid_value_transition_registry
  from public, anon, authenticated, service_role;

revoke insert, update, delete, truncate, references, trigger, maintain
  on table public.velmere_r7_customer_final_ledger
  from public, anon, authenticated, service_role;
revoke insert, update, delete, truncate, references, trigger, maintain
  on table public.velmere_r7_paid_value_final_ledger
  from public, anon, authenticated, service_role;

revoke all privileges
  on sequence public.velmere_r7_customer_final_ledger_ledger_id_seq
  from public, anon, authenticated, service_role;
revoke all privileges
  on sequence public.velmere_r7_paid_value_final_ledger_ledger_id_seq
  from public, anon, authenticated, service_role;

-- Deliberately leave no callable generic paid finalization path. Future paid
-- rows require separate product-specific finalizers that verify authoritative
-- run/artifact/rights/entitlement/customer-output evidence themselves.
revoke execute on function
  public.velmere_r7_finalize_paid_value_transition_v1(integer, text, jsonb, text, text)
  from public, anon, authenticated, service_role;

-- In-transaction verification. Any failure rolls back all hardening DDL.
do $r7_postflight$
declare
  v_customer_count integer;
  v_paid_count integer;
  v_trigger_count integer;
  v_public_execute boolean;
  v_unexpected_acl_count integer;
  v_role text;
begin
  select pg_catalog.count(*)::integer
    into v_customer_count
    from velmere_private.r7_customer_final_registry;
  select pg_catalog.count(*)::integer
    into v_paid_count
    from velmere_private.r7_paid_value_transition_registry;

  if v_customer_count <> 20 or v_paid_count <> 10 then
    raise exception 'r7_registry_hardening_postflight_denominator_failed:%/%',
      v_customer_count, v_paid_count
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.velmere_r7_customer_final_ledger'::pg_catalog.regclass
      and conname = 'r7_customer_final_ledger_registry_fkey'
      and contype = 'f'
      and convalidated
  ) or not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.velmere_r7_paid_value_final_ledger'::pg_catalog.regclass
      and conname = 'r7_paid_value_final_ledger_registry_fkey'
      and contype = 'f'
      and convalidated
  ) then
    raise exception 'r7_registry_hardening_validated_fk_missing'
      using errcode = '55000';
  end if;

  select pg_catalog.count(*)::integer
    into v_trigger_count
    from pg_catalog.pg_trigger
   where not tgisinternal
     and tgenabled <> 'D'
     and (
       (tgrelid = 'velmere_private.r7_customer_final_registry'::pg_catalog.regclass
         and tgname in ('r7_customer_final_registry_no_row_mutation', 'r7_customer_final_registry_no_truncate'))
       or
       (tgrelid = 'velmere_private.r7_paid_value_transition_registry'::pg_catalog.regclass
         and tgname in ('r7_paid_value_registry_no_row_mutation', 'r7_paid_value_registry_no_truncate'))
       or
       (tgrelid = 'public.velmere_r7_customer_final_ledger'::pg_catalog.regclass
         and tgname in ('r7_customer_final_ledger_no_row_mutation_v2', 'r7_customer_final_ledger_no_truncate_v2'))
       or
       (tgrelid = 'public.velmere_r7_paid_value_final_ledger'::pg_catalog.regclass
         and tgname in ('r7_paid_value_final_ledger_no_row_mutation', 'r7_paid_value_final_ledger_no_truncate'))
     );

  if v_trigger_count <> 8 then
    raise exception 'r7_registry_hardening_trigger_postflight_failed:%', v_trigger_count
      using errcode = '55000';
  end if;

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
    then
      raise exception 'r7_registry_hardening_application_privilege_still_effective:%',
        v_role
        using errcode = '42501';
    end if;

    if pg_catalog.has_function_privilege(
         v_role,
         'public.velmere_r7_finalize_paid_value_transition_v1(integer,text,jsonb,text,text)',
         'EXECUTE'
       )
    then
      raise exception 'r7_registry_hardening_unsafe_paid_finalizer_still_executable:%',
        v_role
        using errcode = '42501';
    end if;
  end loop;

  -- Refuse to leave a mutation/control grant on either ledger for any
  -- non-owner role, including an unexpected group role not named above.
  select pg_catalog.count(*)::integer
    into v_unexpected_acl_count
    from pg_catalog.pg_class as c
    cross join lateral pg_catalog.aclexplode(
      coalesce(c.relacl, pg_catalog.acldefault('r', c.relowner))
    ) as a
   where c.oid in (
           'public.velmere_r7_customer_final_ledger'::pg_catalog.regclass,
           'public.velmere_r7_paid_value_final_ledger'::pg_catalog.regclass
         )
     and a.grantee <> c.relowner
     and a.privilege_type in (
       'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE',
       'REFERENCES', 'TRIGGER', 'MAINTAIN'
     );

  if v_unexpected_acl_count <> 0 then
    raise exception 'r7_registry_hardening_unexpected_ledger_acl:%',
      v_unexpected_acl_count
      using errcode = '42501';
  end if;

  -- Registries are private control-plane objects: only the owner may retain a
  -- table privilege. Fail instead of silently accepting an unknown grantee.
  select pg_catalog.count(*)::integer
    into v_unexpected_acl_count
    from pg_catalog.pg_class as c
    cross join lateral pg_catalog.aclexplode(
      coalesce(c.relacl, pg_catalog.acldefault('r', c.relowner))
    ) as a
   where c.oid in (
           'velmere_private.r7_customer_final_registry'::pg_catalog.regclass,
           'velmere_private.r7_paid_value_transition_registry'::pg_catalog.regclass
         )
     and a.grantee <> c.relowner;

  if v_unexpected_acl_count <> 0 then
    raise exception 'r7_registry_hardening_unexpected_registry_acl:%',
      v_unexpected_acl_count
      using errcode = '42501';
  end if;

  select coalesce(pg_catalog.bool_or(a.privilege_type = 'EXECUTE'), false)
    into v_public_execute
    from pg_catalog.pg_proc as p
    cross join lateral pg_catalog.aclexplode(
      coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
    ) as a
   where p.oid = 'public.velmere_r7_finalize_paid_value_transition_v1(integer,text,jsonb,text,text)'::pg_catalog.regprocedure
     and a.grantee = 0;

  if v_public_execute then
    raise exception 'r7_registry_hardening_public_paid_finalizer_execute_still_effective'
      using errcode = '42501';
  end if;

  select pg_catalog.count(*)::integer
    into v_unexpected_acl_count
    from pg_catalog.pg_proc as p
    cross join lateral pg_catalog.aclexplode(
      coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
    ) as a
   where p.oid = 'public.velmere_r7_finalize_paid_value_transition_v1(integer,text,jsonb,text,text)'::pg_catalog.regprocedure
     and a.grantee <> p.proowner
     and a.privilege_type = 'EXECUTE';

  if v_unexpected_acl_count <> 0 then
    raise exception 'r7_registry_hardening_unexpected_paid_finalizer_acl:%',
      v_unexpected_acl_count
      using errcode = '42501';
  end if;

  if exists (
    (select * from pg_temp.r7_customer_final_ledger_before
     except all
     select * from public.velmere_r7_customer_final_ledger)
    union all
    (select * from public.velmere_r7_customer_final_ledger
     except all
     select * from pg_temp.r7_customer_final_ledger_before)
  ) then
    raise exception 'r7_registry_hardening_customer_ledger_changed'
      using errcode = '23514';
  end if;

  if exists (
    (select * from pg_temp.r7_paid_value_final_ledger_before
     except all
     select * from public.velmere_r7_paid_value_final_ledger)
    union all
    (select * from public.velmere_r7_paid_value_final_ledger
     except all
     select * from pg_temp.r7_paid_value_final_ledger_before)
  ) then
    raise exception 'r7_registry_hardening_paid_ledger_changed'
      using errcode = '23514';
  end if;
end;
$r7_postflight$;

commit;
