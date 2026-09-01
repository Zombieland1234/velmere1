begin;

-- Supabase can grant service_role broad table privileges from its platform
-- CREATE TABLE hook before an application migration reaches its own GRANT
-- statements.  A narrower GRANT is additive and therefore does not remove
-- DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN inherited from that hook.
--
-- Revoke first, then rebuild the exact table ACL required by the server-side
-- functions.  Keep the pre-existing bindings DELETE capability used by the
-- owner-authorized erasure contract; the immutable replay ledger remains
-- SELECT-only and is mutated exclusively through SECURITY DEFINER code.
do $function$
declare
  v_relation text;
  v_columns text;
begin
  foreach v_relation in array array[
    'public.velmere_account_supabase_subject_bindings',
    'public.velmere_account_supabase_subject_binding_requests',
    'public.velmere_auth_security_events',
    'public.velmere_auth_security_alerts',
    'public.velmere_auth_session_families',
    'public.velmere_durable_computation_jobs'
  ]
  loop
    if pg_catalog.to_regclass(v_relation) is null then
      raise exception 'r7_acl_closure_relation_missing:%', v_relation
        using errcode = '42P01';
    end if;

    select pg_catalog.string_agg(
      pg_catalog.quote_ident(attributes.attname),
      ', ' order by attributes.attnum
    )
      into v_columns
      from pg_catalog.pg_attribute as attributes
     where attributes.attrelid = pg_catalog.to_regclass(v_relation)
       and attributes.attnum > 0
       and not attributes.attisdropped;

    if v_columns is null then
      raise exception 'r7_acl_closure_relation_has_no_columns:%', v_relation
        using errcode = '55000';
    end if;

    -- Table-level REVOKE does not remove a separately granted column ACL.
    -- Clear every current column before rebuilding the effective table ACL.
    execute pg_catalog.format(
      'revoke all privileges (%s) on table %s from service_role',
      v_columns,
      pg_catalog.to_regclass(v_relation)
    );
  end loop;

  foreach v_relation in array array[
    'public.velmere_auth_security_events_id_seq',
    'public.velmere_auth_security_alerts_id_seq'
  ]
  loop
    if pg_catalog.to_regclass(v_relation) is null then
      raise exception 'r7_acl_closure_sequence_missing:%', v_relation
        using errcode = '42P01';
    end if;
  end loop;
end
$function$;

revoke all privileges on table
  public.velmere_account_supabase_subject_bindings,
  public.velmere_account_supabase_subject_binding_requests,
  public.velmere_auth_security_events,
  public.velmere_auth_security_alerts,
  public.velmere_auth_session_families,
  public.velmere_durable_computation_jobs
from service_role;

-- GENERATED ALWAYS AS IDENTITY does not require a caller to invoke nextval
-- directly.  Keep both implementation-detail sequences inaccessible even to
-- service_role; table INSERT remains the only supported allocation path.
revoke all privileges on sequence
  public.velmere_auth_security_events_id_seq,
  public.velmere_auth_security_alerts_id_seq
from service_role;

grant select, insert, update, delete
  on table public.velmere_account_supabase_subject_bindings
  to service_role;

grant select
  on table public.velmere_account_supabase_subject_binding_requests
  to service_role;

grant select, insert, update
  on table
    public.velmere_auth_security_events,
    public.velmere_auth_security_alerts,
    public.velmere_auth_session_families
  to service_role;

grant select, insert, update, delete
  on table public.velmere_durable_computation_jobs
  to service_role;

commit;
