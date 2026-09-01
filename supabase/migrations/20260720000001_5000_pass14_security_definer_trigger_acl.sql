-- PASS14: close the remaining static SECURITY DEFINER trigger ACL gap.
-- This is an offline migration source change only; it is not staging/LIVE proof.

begin;

do $$
declare
  role_name text;
begin
  if to_regprocedure('public.velmere_angel_memory_touch()') is not null then
    execute 'revoke all on function public.velmere_angel_memory_touch() from public';
    foreach role_name in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = role_name) then
        execute format('revoke all on function public.velmere_angel_memory_touch() from %I', role_name);
      end if;
    end loop;
  end if;
end
$$;

commit;
