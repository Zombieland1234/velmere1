-- PASS36 A102R2: salted account-binding hashes are distinct from the legacy
-- plain resource-binding hash. Staging two-user proof remains required.

create or replace function public.velmere_current_account_binding_hash()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.velmere_current_account_id() is null then null
    else encode(
      digest(
        'velmere-account-binding-v1:' || public.velmere_current_account_id(),
        'sha256'
      ),
      'hex'
    )
  end;
$$;

revoke all on function public.velmere_current_account_binding_hash() from public, anon;
grant execute on function public.velmere_current_account_binding_hash() to authenticated, service_role;

drop policy if exists pass22_audit_pdf_consumption_owner_select on public.velmere_audit_pdf_token_consumptions;
drop policy if exists a102r2_audit_pdf_consumption_owner_select on public.velmere_audit_pdf_token_consumptions;
create policy a102r2_audit_pdf_consumption_owner_select
on public.velmere_audit_pdf_token_consumptions
for select to authenticated
using (account_id_hash = public.velmere_current_account_binding_hash());

drop policy if exists pass22_audit_report_snapshot_owner_select on public.velmere_audit_report_snapshots;
drop policy if exists a102r2_audit_report_snapshot_owner_select on public.velmere_audit_report_snapshots;
create policy a102r2_audit_report_snapshot_owner_select
on public.velmere_audit_report_snapshots
for select to authenticated
using (account_id_hash = public.velmere_current_account_binding_hash());

drop policy if exists pass22_customer_artifact_snapshot_owner_select on public.velmere_customer_artifact_snapshots;
drop policy if exists a102r2_customer_artifact_snapshot_owner_select on public.velmere_customer_artifact_snapshots;
create policy a102r2_customer_artifact_snapshot_owner_select
on public.velmere_customer_artifact_snapshots
for select to authenticated
using (
  account_id = public.velmere_current_account_id()
  and account_id_hash = public.velmere_current_account_binding_hash()
);

drop policy if exists pass22_customer_artifact_pdf_owner_select on public.velmere_customer_artifact_pdf_blobs;
drop policy if exists a102r2_customer_artifact_pdf_owner_select on public.velmere_customer_artifact_pdf_blobs;
create policy a102r2_customer_artifact_pdf_owner_select
on public.velmere_customer_artifact_pdf_blobs
for select to authenticated
using (
  account_id = public.velmere_current_account_id()
  and account_id_hash = public.velmere_current_account_binding_hash()
);
