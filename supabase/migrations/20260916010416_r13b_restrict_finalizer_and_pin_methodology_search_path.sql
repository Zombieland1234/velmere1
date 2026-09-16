-- R13B: narrow security-only change. No business rows are read or written.
-- Refuse stale-source changes rather than overwriting a concurrent edit.
DO $guard$
BEGIN
  IF (SELECT md5(pg_get_functiondef('public.velmere_r7_finalize_angel_v1(text,text,text,jsonb)'::regprocedure))) IS DISTINCT FROM '3e1f6188a93c9ea72676c4984cec59c2' THEN
    RAISE EXCEPTION 'R13B finalizer source changed; review required';
  END IF;
  IF (SELECT md5(pg_get_functiondef('velmere_private.r7_chain_surface_methodology_sha_v1()'::regprocedure))) IS DISTINCT FROM '2d56222e8a77c86e2acced51e66c90ce' THEN
    RAISE EXCEPTION 'R13B methodology source changed; review required';
  END IF;
END
$guard$;
REVOKE EXECUTE ON FUNCTION public.velmere_r7_finalize_angel_v1(text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
-- service_role already has an explicit grant. Preserve it; do not broaden any other access.
ALTER FUNCTION velmere_private.r7_chain_surface_methodology_sha_v1() SET search_path = pg_catalog, pg_temp;
DO $verify$
BEGIN
  IF has_function_privilege('anon','public.velmere_r7_finalize_angel_v1(text,text,text,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.velmere_r7_finalize_angel_v1(text,text,text,jsonb)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.velmere_r7_finalize_angel_v1(text,text,text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'R13B finalizer privilege postcondition failed';
  END IF;
END
$verify$;
