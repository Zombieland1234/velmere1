-- PASS2223: Advanced paid entitlement fail-closed hardening.
-- Goal: Advanced VLM/Angel/Audit access must be server-verified. Public clients must not read or mutate paid entitlement rows.

revoke all on table public.velmere_vlm_paid_entitlements from anon;
revoke all on table public.velmere_vlm_paid_entitlements from authenticated;
revoke all on table public.velmere_vlm_audit_human_queue from anon;
revoke all on table public.velmere_vlm_audit_human_queue from authenticated;

grant select, insert, update on table public.velmere_vlm_paid_entitlements to service_role;
grant select, insert, update on table public.velmere_vlm_audit_human_queue to service_role;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'velmere_vlm_paid_entitlements_status_check') then
    alter table public.velmere_vlm_paid_entitlements
      add constraint velmere_vlm_paid_entitlements_status_check
      check (status in ('paid','active','expired','refunded','consumed'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'velmere_vlm_paid_entitlements_source_check') then
    alter table public.velmere_vlm_paid_entitlements
      add constraint velmere_vlm_paid_entitlements_source_check
      check (source in ('stripe_webhook','checkout_verify','manual_repair'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'velmere_vlm_paid_entitlements_context_hash_shape_check') then
    alter table public.velmere_vlm_paid_entitlements
      add constraint velmere_vlm_paid_entitlements_context_hash_shape_check
      check (context_hash ~ '^[a-f0-9]{64}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'velmere_vlm_paid_entitlements_product_check') then
    alter table public.velmere_vlm_paid_entitlements
      add constraint velmere_vlm_paid_entitlements_product_check
      check (product_id in ('vlm_advanced_analysis_single','vlm_advanced_pdf_single','vlm_advanced_audit_human_review'));
  end if;
end $$;

create index if not exists velmere_vlm_paid_entitlements_active_lookup_idx
  on public.velmere_vlm_paid_entitlements (stripe_session_id, product_id, context_hash, expires_at)
  where status in ('paid','active');

comment on table public.velmere_vlm_paid_entitlements is 'PASS2223 fail-closed paid Advanced entitlement ledger. Server/service-role only. No client read/write; Advanced requires signed token plus durable entitlement in production.';
comment on table public.velmere_vlm_audit_human_queue is 'PASS2223 service-role audit queue created only after paid Advanced audit entitlement. Public clients must use API surfaces only.';
