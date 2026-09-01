begin;

alter table if exists public.velmere_audit_intake_cases
  add column if not exists source_candidates_json jsonb not null default '{}'::jsonb;

do $$
begin
  if to_regclass('public.velmere_audit_intake_cases') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'velmere_audit_source_candidates_object_chk'
     ) then
    alter table public.velmere_audit_intake_cases
      add constraint velmere_audit_source_candidates_object_chk
      check (
        jsonb_typeof(source_candidates_json) = 'object'
        and source_candidates_json - array['auditUrl','docsUrl','githubUrl','website'] = '{}'::jsonb
      );
  end if;
end $$;

comment on column public.velmere_audit_intake_cases.source_candidates_json is
  'PASS4807 private, sanitized HTTPS source candidates. Public receipts expose only count and digest; raw URLs remain account-bound.';

commit;
