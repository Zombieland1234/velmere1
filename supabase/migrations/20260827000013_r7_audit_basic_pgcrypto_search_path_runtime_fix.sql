-- Current forward-only reconciliation: Audit Basic worker functions use pgcrypto
-- from Supabase's extensions schema. Historical migrations remain immutable.
begin;

alter function public.velmere_claim_basic_audit_worker_lease(text,text,text,text,integer)
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.velmere_preflight_basic_audit_worker_lease(text,text,text)
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.velmere_settle_basic_audit_worker_lease(text,text,text,text,text)
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.velmere_complete_basic_audit_with_exact_pdf_v1(
  text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,jsonb,timestamptz
) set search_path = pg_catalog, public, extensions, pg_temp;

commit;
