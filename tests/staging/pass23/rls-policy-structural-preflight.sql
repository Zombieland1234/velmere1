\set ON_ERROR_STOP on
begin;

-- PASS23 structural staging preflight. This validates deployed metadata and the
-- canonical subject/account/operator helpers. It does NOT replace the 19-case
-- row-fixture isolation replay recorded in config/pass23/rls-staging-case-matrix.json.

create or replace function pg_temp.pass23_assert(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'PASS23_RLS_ASSERTION_FAILED: %', p_message;
  end if;
end;
$$;

select pg_temp.pass23_assert(
  (
    select count(*) = 19
    from pg_policies
    where schemaname='public'
      and policyname = any(array[
        'pass22_account_subject_owner_select','pass22_audit_intake_owner_select',
        'a102r2_audit_pdf_consumption_owner_select','a102r2_audit_report_snapshot_owner_select',
        'a102r2_customer_artifact_snapshot_owner_select','a102r2_customer_artifact_pdf_owner_select',
        'pass22_angel_memory_owner_select','pass22_order_draft_owner_select','pass22_order_owner_select',
        'pass22_order_item_owner_select','pass22_order_event_owner_select','pass22_order_state_event_owner_select',
        'pass22_entitlement_owner_select','pass22_admin_role_self_or_owner_select',
        'pass22_admin_session_self_or_owner_select','pass22_audit_log_operator_select',
        'pass22_fulfilment_recovery_operator_select','pass22_support_handoff_operator_select',
        'pass22_human_audit_queue_operator_select'
      ])
  ),
  'expected exact effective 19 owner/operator policies after A102R2'
);

select pg_temp.pass23_assert(
  not exists (
    select 1 from pg_policies
    where schemaname='public'
      and policyname = any(array[
        'pass22_audit_pdf_consumption_owner_select','pass22_audit_report_snapshot_owner_select',
        'pass22_customer_artifact_snapshot_owner_select','pass22_customer_artifact_pdf_owner_select'
      ])
  ),
  'superseded plain-hash PASS22 policies must be absent'
);

select pg_temp.pass23_assert(
  not exists (
    select 1
    from (values
      ('velmere_account_supabase_subject_bindings'),('velmere_admin_roles'),('velmere_admin_sessions'),
      ('velmere_angel_memories'),('velmere_audit_intake_cases'),('velmere_audit_logs'),
      ('velmere_audit_pdf_token_consumptions'),('velmere_audit_report_snapshots'),
      ('velmere_customer_artifact_pdf_blobs'),('velmere_customer_artifact_snapshots'),
      ('velmere_fulfilment_outbox_recovery_actions'),('velmere_order_drafts'),('velmere_order_events'),
      ('velmere_order_items'),('velmere_order_state_events'),('velmere_orders'),
      ('velmere_support_handoff_event_ledger'),('velmere_vlm_audit_human_queue'),
      ('velmere_vlm_paid_entitlements')
    ) required(table_name)
    left join pg_class c on c.relname=required.table_name
    left join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
    where c.oid is null or not c.relrowsecurity
  ),
  'all 19 tables must exist with RLS enabled'
);

select pg_temp.pass23_assert(
  not has_table_privilege('authenticated','public.velmere_admin_sessions','INSERT')
  and not has_table_privilege('authenticated','public.velmere_admin_sessions','UPDATE')
  and not has_table_privilege('authenticated','public.velmere_admin_sessions','DELETE'),
  'authenticated admin_sessions must remain read-only'
);

select pg_temp.pass23_assert(
  not has_column_privilege('authenticated','public.velmere_admin_sessions','session_hash','SELECT'),
  'session_hash must not be selectable by authenticated operators'
);

-- Helper-level two-tenant and operator-binding preflight. Fixed UUIDs are
-- redacted synthetic principals. All writes are rolled back.
insert into public.velmere_admin_roles(actor_id,actor_email,role,status)
values
 ('pass23_owner','pass23-owner@invalid.local','owner','active'),
 ('pass23_operator','pass23-operator@invalid.local','operator','active'),
 ('pass23_support','pass23-support@invalid.local','support','active'),
 ('pass23_viewer','pass23-viewer@invalid.local','viewer','active')
on conflict(actor_id) do update set role=excluded.role,status='active';

select public.velmere_bind_account_to_supabase_subject(
 'acct_pass23_a','10000000-0000-4000-8000-000000000001'::uuid,'pass23_req_account_a','operator_aaaaaaaaaaaaaaaaaaaa'
);
select public.velmere_bind_account_to_supabase_subject(
 'acct_pass23_b','20000000-0000-4000-8000-000000000002'::uuid,'pass23_req_account_b','operator_aaaaaaaaaaaaaaaaaaaa'
);
select public.velmere_bind_admin_subject(
 '30000000-0000-4000-8000-000000000003'::uuid,'pass23_owner','pass23_req_admin_owner','operator_aaaaaaaaaaaaaaaaaaaa'
);
select public.velmere_bind_admin_subject(
 '40000000-0000-4000-8000-000000000004'::uuid,'pass23_viewer','pass23_req_admin_viewer','operator_aaaaaaaaaaaaaaaaaaaa'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select pg_temp.pass23_assert(public.velmere_current_account_id()='acct_pass23_a','tenant A account binding');
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';
select pg_temp.pass23_assert(public.velmere_current_account_id()='acct_pass23_b','tenant B account binding');
set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000005';
select pg_temp.pass23_assert(public.velmere_current_account_id() is null,'unbound user must fail closed');
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000003';
select pg_temp.pass23_assert(public.velmere_current_operator_role()='owner','owner operator binding');
set local request.jwt.claim.sub = '40000000-0000-4000-8000-000000000004';
select pg_temp.pass23_assert(public.velmere_current_operator_role()='viewer','viewer operator binding');
reset role;

rollback;
