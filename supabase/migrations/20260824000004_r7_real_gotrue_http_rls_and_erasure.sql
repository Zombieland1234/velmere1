begin;
create table if not exists velmere_private.r7_http_config(config_name text primary key,project_url text not null,publishable_key text not null,created_at timestamptz not null default now());
revoke all on velmere_private.r7_http_config from public,anon,authenticated,service_role;

create or replace function public.velmere_r7_store_gotrue_context(p_context text,p_user uuid,p_session uuid,p_token text,p_claims jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,velmere_private,auth,extensions as $$
declare v_hash text; v_account_id text:='supabase:'||p_user::text;
begin
 if p_context not in ('USER_A_REAL_GOTRUE','USER_B_REAL_GOTRUE') then raise exception 'r7_gotrue_context_invalid'; end if;
 if array_length(string_to_array(p_token,'.'),1)<>3 then raise exception 'r7_gotrue_token_shape_invalid'; end if;
 if p_claims->>'sub'<>p_user::text or nullif(p_claims->>'session_id','')::uuid<>p_session then raise exception 'r7_gotrue_claim_binding_invalid'; end if;
 if p_claims->>'role'<>'authenticated' or p_claims->>'aud'<>'authenticated' then raise exception 'r7_gotrue_role_invalid'; end if;
 if (p_claims->>'exp')::bigint<=extract(epoch from now())::bigint then raise exception 'r7_gotrue_token_expired'; end if;
 if not exists(select 1 from auth.users where id=p_user and deleted_at is null) or not exists(select 1 from auth.sessions where id=p_session and user_id=p_user and (not_after is null or not_after>now())) then raise exception 'r7_gotrue_identity_missing'; end if;
 v_hash:='sha256:'||encode(extensions.digest(p_token,'sha256'),'hex');
 insert into public.velmere_account_supabase_subject_bindings(account_id,supabase_subject,request_id,operator_fingerprint)
 values(v_account_id,p_user,'r7-gotrue-'||replace(extensions.gen_random_uuid()::text,'-',''),'r7_gotrue_provisioner')
 on conflict(supabase_subject) do update set account_id=excluded.account_id,updated_at=now();
 insert into velmere_private.r7_jwt_contexts(context_name,user_id,session_id,token,claims,token_sha256,issued_at,expires_at)
 values(p_context,p_user,p_session,p_token,p_claims,v_hash,to_timestamp((p_claims->>'iat')::bigint),to_timestamp((p_claims->>'exp')::bigint))
 on conflict(context_name) do update set user_id=excluded.user_id,session_id=excluded.session_id,token=excluded.token,claims=excluded.claims,token_sha256=excluded.token_sha256,issued_at=excluded.issued_at,expires_at=excluded.expires_at;
 return jsonb_build_object('schemaVersion','velmere.r7.real-gotrue-context.v1','status','PASS','contextName',p_context,'userId',p_user,'sessionId',p_session,'tokenSha256',v_hash,'expiresAt',to_timestamp((p_claims->>'exp')::bigint),'rawTokenReturned',false);
end $$;
revoke all on function public.velmere_r7_store_gotrue_context(text,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.velmere_r7_store_gotrue_context(text,uuid,uuid,text,jsonb) to service_role;

create or replace function public.velmere_r7_erase_account_artifacts_with_receipt(p_account_id text,p_expected_snapshot_id text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,velmere_private,extensions as $$
declare before_s integer; before_b integer; after_s integer; after_b integer; erased_s integer; receipt jsonb;
begin
 if not exists(select 1 from velmere_private.r7_artifact_backups where snapshot_id=p_expected_snapshot_id and account_id=p_account_id) then raise exception 'backup_required_before_erasure'; end if;
 select count(*) into before_s from public.velmere_customer_artifact_snapshots where account_id=p_account_id;
 select count(*) into before_b from public.velmere_customer_artifact_pdf_blobs where account_id=p_account_id;
 perform set_config('velmere.r7_authorized_erasure','on',true);
 delete from public.velmere_customer_artifact_pdf_blobs where account_id=p_account_id;
 delete from public.velmere_customer_artifact_snapshots where account_id=p_account_id;
 get diagnostics erased_s=row_count;
 select count(*) into after_s from public.velmere_customer_artifact_snapshots where account_id=p_account_id;
 select count(*) into after_b from public.velmere_customer_artifact_pdf_blobs where account_id=p_account_id;
 receipt:=jsonb_build_object('schemaVersion','velmere.r7.account-erasure-runtime-receipt.v1','status',case when erased_s=before_s and after_s=0 and after_b=0 then 'PASS' else 'FAIL' end,'accountIdHash',encode(extensions.digest('velmere-account-binding-v1:'||p_account_id,'sha256'),'hex'),'expectedSnapshotId',p_expected_snapshot_id,'snapshotsBefore',before_s,'pdfBlobsBefore',before_b,'snapshotsErased',erased_s,'snapshotsAfter',after_s,'pdfBlobsAfter',after_b,'backupPresent',true,'rawAccountIdReturned',false,'customerFinalCredit',false);
 insert into velmere_private.r7_staging_receipts(receipt_id,receipt) values('R7_ERASURE_'||encode(extensions.digest(p_account_id,'sha256'),'hex'),receipt) on conflict(receipt_id) do update set receipt=excluded.receipt,created_at=now();
 if receipt->>'status'<>'PASS' then raise exception 'r7_erasure_receipt_failed'; end if; return receipt;
end $$;
revoke all on function public.velmere_r7_erase_account_artifacts_with_receipt(text,text) from public,anon,authenticated;
grant execute on function public.velmere_r7_erase_account_artifacts_with_receipt(text,text) to service_role;
commit;
