begin;

-- Supabase's platform defaults can grant sequence USAGE/SELECT/UPDATE to
-- public API roles.  These identity sequences are implementation details:
-- GENERATED ALWAYS table INSERT allocates IDs without direct sequence access.
do $function$
declare
  v_sequence text;
begin
  foreach v_sequence in array array[
    'public.velmere_auth_security_events_id_seq',
    'public.velmere_auth_security_alerts_id_seq'
  ]
  loop
    if pg_catalog.to_regclass(v_sequence) is null then
      raise exception 'r7_sequence_acl_closure_missing:%', v_sequence
        using errcode = '42P01';
    end if;
  end loop;
end
$function$;

revoke all privileges on sequence
  public.velmere_auth_security_events_id_seq,
  public.velmere_auth_security_alerts_id_seq
from public, anon, authenticated, service_role;

commit;
