begin;

-- P86 CUSTOMER ARTIFACT EXACT-PDF NEW-WRITE GATE BEGIN
-- Historical rows tagged legacy_deterministic_rerender remain readable as
-- metadata, but they can no longer be served as PDFs and no new legacy row may
-- be inserted. Every current account artifact payload kind is PDF-bearing and
-- must arrive through the atomic exact snapshot + blob bundle path.

create or replace function public.velmere_reject_new_legacy_customer_artifact_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.pdf_storage is distinct from 'exact_immutable_blob'
     or new.snapshot->>'pdfStorage' is distinct from 'exact_immutable_blob' then
    raise exception 'customer_artifact_new_write_exact_pdf_required'
      using errcode = '23514';
  end if;

  if new.payload_kind not in (
    'market_customer_report_v1',
    'lens_report_v1',
    'audit_customer_report_v1'
  ) then
    raise exception 'customer_artifact_payload_kind_unsupported'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.velmere_reject_new_legacy_customer_artifact_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists p86_customer_artifact_exact_pdf_new_write_gate
  on public.velmere_customer_artifact_snapshots;
create trigger p86_customer_artifact_exact_pdf_new_write_gate
before insert on public.velmere_customer_artifact_snapshots
for each row execute function public.velmere_reject_new_legacy_customer_artifact_v1();

comment on function public.velmere_reject_new_legacy_customer_artifact_v1() is
  'P86 insert-only gate. Existing legacy rows are preserved as history, while every new Lens/Shield/Real Markets/Audit account artifact must bind exact immutable PDF bytes.';

-- P86 CUSTOMER ARTIFACT EXACT-PDF NEW-WRITE GATE END

commit;
