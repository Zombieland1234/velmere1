\set ON_ERROR_STOP on
begin;

-- PASS36 A96: destructive-safe row fixture replay for the exact 19-table RLS
-- denominator. All fixture writes are rolled back. This script must run only on
-- an explicitly disposable staging database through the A96 runner.

create or replace function pg_temp.a96_assert(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'A96_RLS_ASSERTION_FAILED: %', p_message;
  end if;
end;
$$;

create temporary table a96_case_results(
  case_id text not null,
  table_name text not null,
  checks integer not null,
  passed boolean not null,
  detail text not null
) on commit drop;

-- Exact identities. No real email, customer identifier or provider token is used.
\set tenant_a_subject '10000000-0000-4000-8000-000000000001'
\set tenant_b_subject '20000000-0000-4000-8000-000000000002'
\set owner_subject    '30000000-0000-4000-8000-000000000003'
\set operator_subject '31000000-0000-4000-8000-000000000003'
\set support_subject  '32000000-0000-4000-8000-000000000003'
\set viewer_subject   '40000000-0000-4000-8000-000000000004'
\set viewer2_subject  '41000000-0000-4000-8000-000000000004'
\set unbound_subject  '50000000-0000-4000-8000-000000000005'
\set tenant_a_account 'acct_pass36_a96_tenant_a'
\set tenant_b_account 'acct_pass36_a96_tenant_b'

-- Promote psql variables into transaction-local custom settings before any
-- dollar-quoted PL/pgSQL block. psql does not interpolate variables inside
-- dollar-quoted bodies; current_setting keeps the exact identities available.
select set_config('a96.tenant_a_subject', :'tenant_a_subject', true);
select set_config('a96.tenant_b_subject', :'tenant_b_subject', true);
select set_config('a96.owner_subject', :'owner_subject', true);
select set_config('a96.operator_subject', :'operator_subject', true);
select set_config('a96.support_subject', :'support_subject', true);
select set_config('a96.viewer_subject', :'viewer_subject', true);
select set_config('a96.viewer2_subject', :'viewer2_subject', true);
select set_config('a96.unbound_subject', :'unbound_subject', true);
select set_config('a96.tenant_a_account', :'tenant_a_account', true);
select set_config('a96.tenant_b_account', :'tenant_b_account', true);

-- Structural denominator must still be exact before fixture creation.
select pg_temp.a96_assert(
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
  'expected exact effective 19 RLS policies after A102R2'
);

select pg_temp.a96_assert(
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

select pg_temp.a96_assert(
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

-- Server-owned bindings and operator identities.
insert into public.velmere_admin_roles(actor_id,actor_email,role,status)
values
 ('a96_owner','a96-owner@invalid.local','owner','active'),
 ('a96_operator','a96-operator@invalid.local','operator','active'),
 ('a96_support','a96-support@invalid.local','support','active'),
 ('a96_viewer','a96-viewer@invalid.local','viewer','active'),
 ('a96_viewer2','a96-viewer2@invalid.local','viewer','active')
on conflict(actor_id) do update set actor_email=excluded.actor_email,role=excluded.role,status='active';

select public.velmere_bind_account_to_supabase_subject(current_setting('a96.tenant_a_account'), current_setting('a96.tenant_a_subject')::uuid, 'a96_req_tenant_a', 'operator_aaaaaaaaaaaaaaaaaaaa');
select public.velmere_bind_account_to_supabase_subject(current_setting('a96.tenant_b_account'), current_setting('a96.tenant_b_subject')::uuid, 'a96_req_tenant_b', 'operator_aaaaaaaaaaaaaaaaaaaa');
select public.velmere_bind_admin_subject(current_setting('a96.owner_subject')::uuid, 'a96_owner', 'a96_req_owner', 'operator_aaaaaaaaaaaaaaaaaaaa');
select public.velmere_bind_admin_subject(current_setting('a96.operator_subject')::uuid, 'a96_operator', 'a96_req_operator', 'operator_aaaaaaaaaaaaaaaaaaaa');
select public.velmere_bind_admin_subject(current_setting('a96.support_subject')::uuid, 'a96_support', 'a96_req_support', 'operator_aaaaaaaaaaaaaaaaaaaa');
select public.velmere_bind_admin_subject(current_setting('a96.viewer_subject')::uuid, 'a96_viewer', 'a96_req_viewer', 'operator_aaaaaaaaaaaaaaaaaaaa');
select public.velmere_bind_admin_subject(current_setting('a96.viewer2_subject')::uuid, 'a96_viewer2', 'a96_req_viewer2', 'operator_aaaaaaaaaaaaaaaaaaaa');

insert into public.velmere_admin_sessions(actor_id,actor_email,role,session_hash,expires_at)
values
 ('a96_owner','a96-owner@invalid.local','owner','a96_session_owner',now()+interval '1 hour'),
 ('a96_operator','a96-operator@invalid.local','operator','a96_session_operator',now()+interval '1 hour'),
 ('a96_support','a96-support@invalid.local','support','a96_session_support',now()+interval '1 hour'),
 ('a96_viewer','a96-viewer@invalid.local','viewer','a96_session_viewer',now()+interval '1 hour'),
 ('a96_viewer2','a96-viewer2@invalid.local','viewer','a96_session_viewer2',now()+interval '1 hour')
on conflict(session_hash) do nothing;

-- Owner fixtures.
insert into public.velmere_angel_memories(session_hash,locale,lane,summary,recent_topics,turn_count)
values('a96_angel_session_a','en','general','a96 fixture','[]'::jsonb,1)
on conflict(session_hash) do nothing;
select public.velmere_bind_account_resource('angel_session','a96_angel_session_a',current_setting('a96.tenant_a_account'),'a96_req_angel','operator_aaaaaaaaaaaaaaaaaaaa');

insert into public.velmere_audit_intake_cases(
 case_id,case_ref,request_id,target_kind,target_private,target_hash,display_label,tier,locale,status,
 account_id,account_email,entitlement_required,entitlement_verified,analysis_started,intake_receipt
) values(
 'a96_case_id','a96_case_ref','a96_req_audit_intake','contract','0x0000000000000000000000000000000000000001',
 'sha256:a96','A96 fixture','basic','en','queued_basic_prescreen',current_setting('a96.tenant_a_account'),null,false,false,false,'{}'::jsonb
) on conflict(case_id) do nothing;

insert into public.velmere_audit_pdf_token_consumptions(
 token_hash,nonce_hash,account_id_hash,entitlement_id_hash,report_id,report_version_hash,token_expires_at,
 consumed_at,state,attempt_count
) values(
 repeat('a',64),repeat('b',64),encode(digest('velmere-account-binding-v1:' || current_setting('a96.tenant_a_account'),'sha256'),'hex'),repeat('c',64),
 'a96_report_pdf','sha256:'||repeat('d',64),now()+interval '1 hour',now(),'consumed',1
) on conflict(token_hash) do nothing;

insert into public.velmere_audit_report_snapshots(
 report_id,case_ref,request_id,account_id_hash,entitlement_id,tier,target_hash,report_version_hash,
 snapshot_digest,source_receipt_root,pdf_digest,snapshot_json,created_at
) values(
 'a96_audit_report','a96_case_ref','a96_req_audit_report',encode(digest('velmere-account-binding-v1:' || current_setting('a96.tenant_a_account'),'sha256'),'hex'),
 'a96_entitlement_ref','pro','sha256:'||repeat('1',64),'sha256:'||repeat('2',64),
 'sha256:'||repeat('3',64),'sha256:'||repeat('4',64),'sha256:'||repeat('5',64),
 jsonb_build_object('a96Fixture',true),date_trunc('milliseconds',now())
) on conflict(report_id) do nothing;

-- Exact customer artifact snapshot + PDF blob. Values satisfy current immutable contract.
do $$
declare
  v_account text := current_setting('a96.tenant_a_account');
  v_account_hash text := encode(digest('velmere-account-binding-v1:' || v_account,'sha256'),'hex');
  v_artifact text := 'sha256:'||repeat('6',64);
  v_snapshot_digest text := 'sha256:'||repeat('7',64);
  v_pdf bytea := convert_to(E'%PDF-1.4\\n1 0 obj<<>>endobj\\ntrailer<<>>\\n%%EOF\\n','UTF8');
  v_pdf_digest text;
  v_snapshot_id text;
  v_blob_id text;
  v_generated timestamptz := date_trunc('milliseconds',now());
  v_created timestamptz := date_trunc('milliseconds',now());
  v_snapshot jsonb;
  v_record_digest text;
begin
  v_pdf_digest := 'sha256:'||encode(digest(v_pdf,'sha256'),'hex');
  v_snapshot_id := 'artifact-lens-'||left(v_account_hash,16)||'-'||substring(v_artifact from 8);
  v_blob_id := 'pdf-'||left(v_account_hash,16)||'-'||substring(v_artifact from 8);
  v_snapshot := jsonb_build_object(
    'schemaVersion','pass4822-account-customer-artifact-snapshot-v1',
    'snapshotId',v_snapshot_id,'accountIdHash',v_account_hash,'surface','lens','payloadKind','lens_report_v1',
    'reportId','a96_customer_report','requestedTier','basic','deliveredTier','basic','locale','en',
    'title','A96 fixture','subject','A96 fixture','generatedAt',to_char(v_generated at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'payload',jsonb_build_object('a96Fixture',true),'payloadDigest','sha256:'||repeat('8',64),
    'canonicalArtifact',jsonb_build_object('artifactDigest',v_artifact),'pdfStorage','exact_immutable_blob',
    'snapshotDigest',v_snapshot_digest
  );
  insert into public.velmere_customer_artifact_snapshots(
    snapshot_id,account_id,account_id_hash,surface,payload_kind,report_id,artifact_digest,snapshot_digest,
    pdf_storage,snapshot,generated_at
  ) values(v_snapshot_id,v_account,v_account_hash,'lens','lens_report_v1','a96_customer_report',v_artifact,
    v_snapshot_digest,'exact_immutable_blob',v_snapshot,v_generated)
  on conflict(snapshot_id) do nothing;

  v_record_digest := 'sha256:' || encode(digest(
      '{"accountIdHash":' || to_jsonb(v_account_hash)::text
      || ',"artifactDigest":' || to_jsonb(v_artifact)::text
      || ',"blobId":' || to_jsonb(v_blob_id)::text
      || ',"createdAt":' || to_jsonb(to_char(v_created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))::text
      || ',"mimeType":' || to_jsonb('application/pdf'::text)::text
      || ',"pdfByteLength":' || octet_length(v_pdf)::text
      || ',"pdfDigest":' || to_jsonb(v_pdf_digest)::text
      || ',"reportId":' || to_jsonb('a96_customer_report'::text)::text
      || ',"schemaVersion":' || to_jsonb('pass4824-account-customer-artifact-pdf-blob-v1'::text)::text
      || ',"snapshotId":' || to_jsonb(v_snapshot_id)::text
      || ',"surface":' || to_jsonb('lens'::text)::text || '}',
      'sha256'
    ), 'hex');
  insert into public.velmere_customer_artifact_pdf_blobs(
    schema_version,blob_id,snapshot_id,account_id,account_id_hash,surface,report_id,artifact_digest,
    pdf_digest,pdf_byte_length,mime_type,pdf_bytes,created_at,record_digest
  ) values(
    'pass4824-account-customer-artifact-pdf-blob-v1',v_blob_id,v_snapshot_id,v_account,v_account_hash,
    'lens','a96_customer_report',v_artifact,v_pdf_digest,octet_length(v_pdf),'application/pdf',v_pdf,v_created,v_record_digest
  ) on conflict(blob_id) do nothing;
end $$;

-- Commerce and entitlement fixtures.
insert into public.velmere_order_drafts(id,status,locale,cart_hash,expected_amount_total,expected_currency,line_items,source_route,idempotency_key)
values('a96_order_draft_a','draft','en',repeat('a',64),100,'EUR','[]'::jsonb,'a96','a96_idem_draft')
on conflict(id) do nothing;
select public.velmere_bind_account_resource('order_draft','a96_order_draft_a',current_setting('a96.tenant_a_account'),'a96_req_order_draft','operator_aaaaaaaaaaaaaaaaaaaa');

insert into public.velmere_orders(id,stripe_session_id,status,locale,currency,amount_total,metadata)
values('60000000-0000-4000-8000-000000000006'::uuid,'cs_test_a96_order','checkout_completed','en','EUR',100,'{}'::jsonb)
on conflict(id) do nothing;
select public.velmere_bind_account_resource('order','60000000-0000-4000-8000-000000000006',current_setting('a96.tenant_a_account'),'a96_req_order','operator_aaaaaaaaaaaaaaaaaaaa');

insert into public.velmere_order_items(order_id,line_index,product_id,quantity,title,unit_amount,currency,metadata)
values('60000000-0000-4000-8000-000000000006'::uuid,0,'a96_product',1,'A96 fixture',100,'EUR','{}'::jsonb)
on conflict(order_id,line_index) do nothing;

insert into public.velmere_order_events(order_id,order_public_id,event_type,severity,source,message,redacted_payload,idempotency_key)
values('60000000-0000-4000-8000-000000000006'::uuid,'a96_public','a96_fixture','info','a96','A96 fixture','{}'::jsonb,'a96_idem_event')
on conflict(idempotency_key) do nothing;

insert into public.velmere_order_state_events(order_draft_id,event_type,status_before,status_after,severity,source_route,idempotency_key,redacted_payload)
values('a96_order_draft_a','a96_fixture','draft','draft','info','a96','a96_idem_state','{}'::jsonb)
on conflict(idempotency_key) do nothing;

insert into public.velmere_vlm_paid_entitlements(
 id,stripe_session_id,product_id,access_scope,status,context_hash,context,locale,amount_total,currency,
 payment_status,source,expires_at
) values(
 'a96_entitlement_a','cs_test_a96_entitlement','vlm_pro_analysis_single','analysis','active',repeat('e',64),
 jsonb_build_object('a96Fixture',true),'en',100,'EUR','paid','stripe_webhook',now()+interval '1 hour'
) on conflict(id) do nothing;
select public.velmere_bind_account_resource('entitlement','a96_entitlement_a',current_setting('a96.tenant_a_account'),'a96_req_entitlement','operator_aaaaaaaaaaaaaaaaaaaa');

-- Operator fixtures.
insert into public.velmere_audit_logs(actor_id,actor_role,action,target_type,target_id,redacted_payload,request_id,receipt_id)
values('a96_operator','operator','a96_rls_fixture','a96','a96_target','{}'::jsonb,'a96_req_audit_log','a96_receipt')
on conflict do nothing;

insert into public.velmere_fulfilment_outbox_recovery_actions(request_id,event_id,action,reason_code,evidence_reference,operator_fingerprint)
values('a96_req_recovery','a96_event','discard','a96_fixture','a96_evidence','operator_aaaaaaaaaaaaaaaaaaaa')
on conflict(request_id) do nothing;

insert into public.velmere_support_handoff_event_ledger(
 id,event_id,event_type,locale,support_handoff_status,actor,project,route_health,event_summary,checksum,safe_boundary,record
) values(
 'a96_support_ledger','a96_support_event','support_route_open','en','watch','{}'::jsonb,'{}'::jsonb,'{}'::jsonb,
 'A96 fixture','a96_checksum','A96 fixture contains no customer data','{}'::jsonb
) on conflict(id) do nothing;

insert into public.velmere_vlm_audit_human_queue(id,stripe_session_id,status,locale,project_name,request_id,context)
values('a96_human_queue','cs_test_a96_human','paid_waiting_human_review','en','A96 fixture','a96_req_human','{}'::jsonb)
on conflict(id) do nothing;

-- Helpers: switch identity and evaluate a single query under RLS.
create or replace function pg_temp.a96_set_authenticated(p_subject uuid)
returns void language plpgsql as $$
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub',p_subject::text,true);
end $$;
create or replace function pg_temp.a96_set_anon()
returns void language plpgsql as $$
begin
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub','',true);
end $$;

-- Each DO block performs positive and negative checks for one exact case.
-- 01 account subject binding
do $$ declare c int:=0; begin
 perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_account_supabase_subject_bindings where account_id=current_setting('a96.tenant_a_account'); perform pg_temp.a96_assert(c=1,'01 tenant A positive');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_account_supabase_subject_bindings where account_id=current_setting('a96.tenant_a_account'); perform pg_temp.a96_assert(c=0,'01 tenant B denied');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_account_supabase_subject_bindings where account_id=current_setting('a96.tenant_a_account'); perform pg_temp.a96_assert(c=0,'01 unbound denied');
 reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_account_supabase_subject_bindings where account_id=current_setting('a96.tenant_a_account'); perform pg_temp.a96_assert(c=0,'01 anon denied'); reset role;
 insert into a96_case_results values('rls23_01_velmere_account_supabase_subject_bindings','velmere_account_supabase_subject_bindings',4,true,'1 positive + 3 denied');
end $$;

-- Operator-case assertion helper is expanded explicitly to preserve exact roles.
-- 02 admin roles
do $$ declare c int:=0; begin
 perform pg_temp.a96_set_authenticated(current_setting('a96.owner_subject')::uuid); select count(*) into c from public.velmere_admin_roles where actor_id like 'a96_%'; perform pg_temp.a96_assert(c>=1,'02 owner positive');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.operator_subject')::uuid); select count(*) into c from public.velmere_admin_roles where actor_id='a96_operator'; perform pg_temp.a96_assert(c=1,'02 operator self positive');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.support_subject')::uuid); select count(*) into c from public.velmere_admin_roles where actor_id='a96_support'; perform pg_temp.a96_assert(c=1,'02 support self positive');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.viewer_subject')::uuid); select count(*) into c from public.velmere_admin_roles where actor_id='a96_viewer'; perform pg_temp.a96_assert(c=1,'02 viewer self positive');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.viewer2_subject')::uuid); select count(*) into c from public.velmere_admin_roles where actor_id='a96_owner'; perform pg_temp.a96_assert(c=0,'02 viewer non-self denied');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_admin_roles where actor_id like 'a96_%'; perform pg_temp.a96_assert(c=0,'02 unbound denied');
 reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_admin_roles where actor_id like 'a96_%'; perform pg_temp.a96_assert(c=0,'02 anon denied'); reset role;
 insert into a96_case_results values('rls23_02_velmere_admin_roles','velmere_admin_roles',7,true,'4 positive + 3 denied');
end $$;

-- 03 admin sessions, including forbidden secret column.
do $$ declare c int:=0; begin
 perform pg_temp.a96_set_authenticated(current_setting('a96.owner_subject')::uuid); select count(*) into c from public.velmere_admin_sessions where actor_id like 'a96_%'; perform pg_temp.a96_assert(c>=1,'03 owner positive');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.operator_subject')::uuid); select count(*) into c from public.velmere_admin_sessions where actor_id='a96_operator'; perform pg_temp.a96_assert(c=1,'03 operator self positive');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.support_subject')::uuid); select count(*) into c from public.velmere_admin_sessions where actor_id='a96_support'; perform pg_temp.a96_assert(c=1,'03 support self positive');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.viewer_subject')::uuid); select count(*) into c from public.velmere_admin_sessions where actor_id='a96_viewer'; perform pg_temp.a96_assert(c=1,'03 viewer self positive');
 perform pg_temp.a96_assert(not has_column_privilege('authenticated','public.velmere_admin_sessions','session_hash','SELECT'),'03 session_hash forbidden');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.viewer2_subject')::uuid); select count(*) into c from public.velmere_admin_sessions where actor_id='a96_owner'; perform pg_temp.a96_assert(c=0,'03 viewer non-self denied');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_admin_sessions where actor_id like 'a96_%'; perform pg_temp.a96_assert(c=0,'03 unbound denied');
 reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_admin_sessions where actor_id like 'a96_%'; perform pg_temp.a96_assert(c=0,'03 anon denied'); reset role;
 insert into a96_case_results values('rls23_03_velmere_admin_sessions','velmere_admin_sessions',8,true,'4 positive + column deny + 3 denied');
end $$;

-- Generic owner cases 04,05,07,08,09,10,12,13,14,15,16,19.
-- Each retains one exact positive and tenant-B/unbound/anon denials.
\set owner_cases 12

do $$ declare c int:=0; begin
 perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_angel_memories where session_hash='a96_angel_session_a'; perform pg_temp.a96_assert(c=1,'04 positive');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_angel_memories where session_hash='a96_angel_session_a'; perform pg_temp.a96_assert(c=0,'04 tenant B');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_angel_memories where session_hash='a96_angel_session_a'; perform pg_temp.a96_assert(c=0,'04 unbound');
 reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_angel_memories where session_hash='a96_angel_session_a'; perform pg_temp.a96_assert(c=0,'04 anon'); reset role;
 insert into a96_case_results values('rls23_04_velmere_angel_memories','velmere_angel_memories',4,true,'owner isolation'); end $$;

do $$ declare c int:=0; begin
 perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_audit_intake_cases where case_id='a96_case_id'; perform pg_temp.a96_assert(c=1,'05 positive');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_audit_intake_cases where case_id='a96_case_id'; perform pg_temp.a96_assert(c=0,'05 tenant B');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_audit_intake_cases where case_id='a96_case_id'; perform pg_temp.a96_assert(c=0,'05 unbound');
 reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_audit_intake_cases where case_id='a96_case_id'; perform pg_temp.a96_assert(c=0,'05 anon'); reset role;
 insert into a96_case_results values('rls23_05_velmere_audit_intake_cases','velmere_audit_intake_cases',4,true,'owner isolation'); end $$;

-- 06 operator audit logs
do $$ declare c int:=0; begin
 perform pg_temp.a96_set_authenticated(current_setting('a96.owner_subject')::uuid); select count(*) into c from public.velmere_audit_logs where request_id='a96_req_audit_log'; perform pg_temp.a96_assert(c=1,'06 owner');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.operator_subject')::uuid); select count(*) into c from public.velmere_audit_logs where request_id='a96_req_audit_log'; perform pg_temp.a96_assert(c=1,'06 operator');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.support_subject')::uuid); select count(*) into c from public.velmere_audit_logs where request_id='a96_req_audit_log'; perform pg_temp.a96_assert(c=1,'06 support');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.viewer_subject')::uuid); select count(*) into c from public.velmere_audit_logs where request_id='a96_req_audit_log'; perform pg_temp.a96_assert(c=0,'06 viewer denied');
 reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_audit_logs where request_id='a96_req_audit_log'; perform pg_temp.a96_assert(c=0,'06 unbound denied');
 reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_audit_logs where request_id='a96_req_audit_log'; perform pg_temp.a96_assert(c=0,'06 anon denied'); reset role;
 insert into a96_case_results values('rls23_06_velmere_audit_logs','velmere_audit_logs',6,true,'3 positive + 3 denied'); end $$;

-- Macro-free repeated owner checks for remaining tables.
do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_audit_pdf_token_consumptions where token_hash=repeat('a',64); perform pg_temp.a96_assert(c=1,'07 positive'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_audit_pdf_token_consumptions where token_hash=repeat('a',64); perform pg_temp.a96_assert(c=0,'07 B'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_audit_pdf_token_consumptions where token_hash=repeat('a',64); perform pg_temp.a96_assert(c=0,'07 U'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_audit_pdf_token_consumptions where token_hash=repeat('a',64); perform pg_temp.a96_assert(c=0,'07 A'); reset role; insert into a96_case_results values('rls23_07_velmere_audit_pdf_token_consumptions','velmere_audit_pdf_token_consumptions',4,true,'owner isolation'); end $$;
do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_audit_report_snapshots where report_id='a96_audit_report'; perform pg_temp.a96_assert(c=1,'08 positive'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_audit_report_snapshots where report_id='a96_audit_report'; perform pg_temp.a96_assert(c=0,'08 B'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_audit_report_snapshots where report_id='a96_audit_report'; perform pg_temp.a96_assert(c=0,'08 U'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_audit_report_snapshots where report_id='a96_audit_report'; perform pg_temp.a96_assert(c=0,'08 A'); reset role; insert into a96_case_results values('rls23_08_velmere_audit_report_snapshots','velmere_audit_report_snapshots',4,true,'owner isolation'); end $$;
do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_customer_artifact_pdf_blobs where report_id='a96_customer_report'; perform pg_temp.a96_assert(c=1,'09 positive'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_customer_artifact_pdf_blobs where report_id='a96_customer_report'; perform pg_temp.a96_assert(c=0,'09 B'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_customer_artifact_pdf_blobs where report_id='a96_customer_report'; perform pg_temp.a96_assert(c=0,'09 U'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_customer_artifact_pdf_blobs where report_id='a96_customer_report'; perform pg_temp.a96_assert(c=0,'09 A'); reset role; insert into a96_case_results values('rls23_09_velmere_customer_artifact_pdf_blobs','velmere_customer_artifact_pdf_blobs',4,true,'owner isolation'); end $$;
do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_customer_artifact_snapshots where report_id='a96_customer_report'; perform pg_temp.a96_assert(c=1,'10 positive'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_customer_artifact_snapshots where report_id='a96_customer_report'; perform pg_temp.a96_assert(c=0,'10 B'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_customer_artifact_snapshots where report_id='a96_customer_report'; perform pg_temp.a96_assert(c=0,'10 U'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_customer_artifact_snapshots where report_id='a96_customer_report'; perform pg_temp.a96_assert(c=0,'10 A'); reset role; insert into a96_case_results values('rls23_10_velmere_customer_artifact_snapshots','velmere_customer_artifact_snapshots',4,true,'owner isolation'); end $$;

-- 11 fulfilment recovery operator roles.
do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.owner_subject')::uuid); select count(*) into c from public.velmere_fulfilment_outbox_recovery_actions where request_id='a96_req_recovery'; perform pg_temp.a96_assert(c=1,'11 owner'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.operator_subject')::uuid); select count(*) into c from public.velmere_fulfilment_outbox_recovery_actions where request_id='a96_req_recovery'; perform pg_temp.a96_assert(c=1,'11 operator'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.viewer_subject')::uuid); select count(*) into c from public.velmere_fulfilment_outbox_recovery_actions where request_id='a96_req_recovery'; perform pg_temp.a96_assert(c=0,'11 viewer'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_fulfilment_outbox_recovery_actions where request_id='a96_req_recovery'; perform pg_temp.a96_assert(c=0,'11 unbound'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_fulfilment_outbox_recovery_actions where request_id='a96_req_recovery'; perform pg_temp.a96_assert(c=0,'11 anon'); reset role; insert into a96_case_results values('rls23_11_velmere_fulfilment_outbox_recovery_actions','velmere_fulfilment_outbox_recovery_actions',5,true,'2 positive + 3 denied'); end $$;

do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_order_drafts where id='a96_order_draft_a'; perform pg_temp.a96_assert(c=1,'12 positive'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_order_drafts where id='a96_order_draft_a'; perform pg_temp.a96_assert(c=0,'12 B'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_order_drafts where id='a96_order_draft_a'; perform pg_temp.a96_assert(c=0,'12 U'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_order_drafts where id='a96_order_draft_a'; perform pg_temp.a96_assert(c=0,'12 A'); reset role; insert into a96_case_results values('rls23_12_velmere_order_drafts','velmere_order_drafts',4,true,'owner isolation'); end $$;
do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_order_events where idempotency_key='a96_idem_event'; perform pg_temp.a96_assert(c=1,'13 positive'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_order_events where idempotency_key='a96_idem_event'; perform pg_temp.a96_assert(c=0,'13 B'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_order_events where idempotency_key='a96_idem_event'; perform pg_temp.a96_assert(c=0,'13 U'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_order_events where idempotency_key='a96_idem_event'; perform pg_temp.a96_assert(c=0,'13 A'); reset role; insert into a96_case_results values('rls23_13_velmere_order_events','velmere_order_events',4,true,'owner isolation'); end $$;
do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_order_items where order_id='60000000-0000-4000-8000-000000000006'::uuid; perform pg_temp.a96_assert(c=1,'14 positive'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_order_items where order_id='60000000-0000-4000-8000-000000000006'::uuid; perform pg_temp.a96_assert(c=0,'14 B'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_order_items where order_id='60000000-0000-4000-8000-000000000006'::uuid; perform pg_temp.a96_assert(c=0,'14 U'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_order_items where order_id='60000000-0000-4000-8000-000000000006'::uuid; perform pg_temp.a96_assert(c=0,'14 A'); reset role; insert into a96_case_results values('rls23_14_velmere_order_items','velmere_order_items',4,true,'owner isolation'); end $$;
do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_order_state_events where idempotency_key='a96_idem_state'; perform pg_temp.a96_assert(c=1,'15 positive'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_order_state_events where idempotency_key='a96_idem_state'; perform pg_temp.a96_assert(c=0,'15 B'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_order_state_events where idempotency_key='a96_idem_state'; perform pg_temp.a96_assert(c=0,'15 U'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_order_state_events where idempotency_key='a96_idem_state'; perform pg_temp.a96_assert(c=0,'15 A'); reset role; insert into a96_case_results values('rls23_15_velmere_order_state_events','velmere_order_state_events',4,true,'owner isolation'); end $$;
do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_orders where id='60000000-0000-4000-8000-000000000006'::uuid; perform pg_temp.a96_assert(c=1,'16 positive'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_orders where id='60000000-0000-4000-8000-000000000006'::uuid; perform pg_temp.a96_assert(c=0,'16 B'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_orders where id='60000000-0000-4000-8000-000000000006'::uuid; perform pg_temp.a96_assert(c=0,'16 U'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_orders where id='60000000-0000-4000-8000-000000000006'::uuid; perform pg_temp.a96_assert(c=0,'16 A'); reset role; insert into a96_case_results values('rls23_16_velmere_orders','velmere_orders',4,true,'owner isolation'); end $$;

-- 17 support handoff roles.
do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.owner_subject')::uuid); select count(*) into c from public.velmere_support_handoff_event_ledger where id='a96_support_ledger'; perform pg_temp.a96_assert(c=1,'17 owner'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.operator_subject')::uuid); select count(*) into c from public.velmere_support_handoff_event_ledger where id='a96_support_ledger'; perform pg_temp.a96_assert(c=1,'17 operator'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.support_subject')::uuid); select count(*) into c from public.velmere_support_handoff_event_ledger where id='a96_support_ledger'; perform pg_temp.a96_assert(c=1,'17 support'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.viewer_subject')::uuid); select count(*) into c from public.velmere_support_handoff_event_ledger where id='a96_support_ledger'; perform pg_temp.a96_assert(c=0,'17 viewer'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_support_handoff_event_ledger where id='a96_support_ledger'; perform pg_temp.a96_assert(c=0,'17 unbound'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_support_handoff_event_ledger where id='a96_support_ledger'; perform pg_temp.a96_assert(c=0,'17 anon'); reset role; insert into a96_case_results values('rls23_17_velmere_support_handoff_event_ledger','velmere_support_handoff_event_ledger',6,true,'3 positive + 3 denied'); end $$;

-- 18 human audit queue owner/operator only.
do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.owner_subject')::uuid); select count(*) into c from public.velmere_vlm_audit_human_queue where id='a96_human_queue'; perform pg_temp.a96_assert(c=1,'18 owner'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.operator_subject')::uuid); select count(*) into c from public.velmere_vlm_audit_human_queue where id='a96_human_queue'; perform pg_temp.a96_assert(c=1,'18 operator'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.viewer_subject')::uuid); select count(*) into c from public.velmere_vlm_audit_human_queue where id='a96_human_queue'; perform pg_temp.a96_assert(c=0,'18 viewer'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_vlm_audit_human_queue where id='a96_human_queue'; perform pg_temp.a96_assert(c=0,'18 unbound'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_vlm_audit_human_queue where id='a96_human_queue'; perform pg_temp.a96_assert(c=0,'18 anon'); reset role; insert into a96_case_results values('rls23_18_velmere_vlm_audit_human_queue','velmere_vlm_audit_human_queue',5,true,'2 positive + 3 denied'); end $$;

do $$ declare c int:=0; begin perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_a_subject')::uuid); select count(*) into c from public.velmere_vlm_paid_entitlements where id='a96_entitlement_a'; perform pg_temp.a96_assert(c=1,'19 positive'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.tenant_b_subject')::uuid); select count(*) into c from public.velmere_vlm_paid_entitlements where id='a96_entitlement_a'; perform pg_temp.a96_assert(c=0,'19 B'); reset role; perform pg_temp.a96_set_authenticated(current_setting('a96.unbound_subject')::uuid); select count(*) into c from public.velmere_vlm_paid_entitlements where id='a96_entitlement_a'; perform pg_temp.a96_assert(c=0,'19 U'); reset role; perform pg_temp.a96_set_anon(); select count(*) into c from public.velmere_vlm_paid_entitlements where id='a96_entitlement_a'; perform pg_temp.a96_assert(c=0,'19 A'); reset role; insert into a96_case_results values('rls23_19_velmere_vlm_paid_entitlements','velmere_vlm_paid_entitlements',4,true,'owner isolation'); end $$;

reset role;
select pg_temp.a96_assert((select count(*)=19 from a96_case_results),'exactly 19 cases executed');
select pg_temp.a96_assert((select bool_and(passed) from a96_case_results),'all 19 cases passed');

select 'A96_RLS_RECEIPT=' || jsonb_build_object(
  'schemaVersion','velmere.pass36.a96.rls-19-case-replay-receipt.v1',
  'decision','VERIFIED_STAGING_RLS_19_OF_19',
  'casesPrepared',19,
  'casesExecuted',(select count(*) from a96_case_results),
  'casesPassed',(select count(*) from a96_case_results where passed),
  'checksExecuted',(select sum(checks) from a96_case_results),
  'transactionRolledBack',true,
  'fixtureContainsRealCustomerData',false,
  'results',(select jsonb_agg(to_jsonb(r) order by case_id) from a96_case_results r),
  'liveProven',false,
  'saleEnabled',false
)::text;

rollback;
