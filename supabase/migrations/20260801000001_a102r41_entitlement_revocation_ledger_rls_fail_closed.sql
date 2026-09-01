-- A102R41: close the historical PASS2649 entitlement-revocation ledger exposure.
-- The historical migration remains immutable. This descendant migration removes
-- the definer-view/public-read surface and permits only account-owner reads.

revoke all on table public.audit_entitlement_revocation_ledger
  from public, anon, authenticated;

revoke all on table public.audit_entitlement_revocation_public_receipts
  from public, anon, authenticated;
drop view if exists public.audit_entitlement_revocation_public_receipts;

drop policy if exists audit_entitlement_revocation_public_select
  on public.audit_entitlement_revocation_ledger;
drop policy if exists audit_entitlement_revocation_owner_select
  on public.audit_entitlement_revocation_ledger;

create policy audit_entitlement_revocation_owner_select
  on public.audit_entitlement_revocation_ledger
  for select
  to authenticated
  using (
    account_id is not null
    and public.velmere_current_account_id() is not null
    and account_id = public.velmere_current_account_id()
  );

grant select (
  receipt_hash,
  report_id,
  entitlement_id,
  reason_class,
  status,
  safe_pdf_locked,
  duplicate_replay_denied,
  stale_replay_denied,
  created_at,
  updated_at
) on public.audit_entitlement_revocation_ledger to authenticated;

grant select, insert, update on public.audit_entitlement_revocation_ledger
  to service_role;

comment on table public.audit_entitlement_revocation_ledger is
  'Private entitlement-revocation ledger. Authenticated reads are owner-scoped through velmere_current_account_id(); anonymous and cross-account reads are forbidden.';
