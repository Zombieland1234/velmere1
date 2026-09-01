create extension if not exists pgcrypto with schema extensions;

create table if not exists public.velmere_account_supabase_subject_bindings (
  account_id text primary key check (account_id ~ '^[A-Za-z0-9][A-Za-z0-9:._-]{5,119}$'),
  supabase_subject uuid not null unique references auth.users(id) on delete cascade,
  request_id text not null unique,
  operator_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.velmere_account_supabase_subject_bindings enable row level security;
revoke all on public.velmere_account_supabase_subject_bindings from public, anon, authenticated;
grant select, insert, update, delete on public.velmere_account_supabase_subject_bindings to service_role;

create or replace function public.velmere_current_account_id() returns text
language sql stable security definer set search_path=pg_catalog,public as $$
  select account_id from public.velmere_account_supabase_subject_bindings
  where supabase_subject=(select auth.uid()) limit 1
$$;
revoke all on function public.velmere_current_account_id() from public,anon;
grant execute on function public.velmere_current_account_id() to authenticated,service_role;

create or replace function public.velmere_current_account_binding_hash() returns text
language sql stable security definer set search_path=pg_catalog,public as $$
  select case when public.velmere_current_account_id() is null then null
  else encode(extensions.digest('velmere-account-binding-v1:'||public.velmere_current_account_id(),'sha256'),'hex') end
$$;
revoke all on function public.velmere_current_account_binding_hash() from public,anon;
grant execute on function public.velmere_current_account_binding_hash() to authenticated,service_role;

create table if not exists public.velmere_customer_artifact_snapshots (
  snapshot_id text primary key,
  account_id text not null,
  account_id_hash text not null check (account_id_hash ~ '^[a-f0-9]{64}$'),
  surface text not null check (surface in ('audit','shield','real_markets','lens')),
  payload_kind text not null check (payload_kind in ('audit_customer_report_v1','market_customer_report_v1','lens_report_v1')),
  report_id text not null,
  artifact_digest text not null check (artifact_digest ~ '^sha256:[a-f0-9]{64}$'),
  snapshot_digest text not null check (snapshot_digest ~ '^sha256:[a-f0-9]{64}$'),
  pdf_storage text not null check (pdf_storage='exact_immutable_blob'),
  snapshot jsonb not null,
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(account_id_hash,artifact_digest),
  check (snapshot->>'snapshotId'=snapshot_id),
  check (snapshot->>'snapshotDigest'=snapshot_digest),
  check (snapshot->>'accountIdHash'=account_id_hash),
  check (snapshot->>'surface'=surface),
  check (snapshot->>'payloadKind'=payload_kind),
  check (snapshot->>'reportId'=report_id),
  check (snapshot->>'pdfStorage'='exact_immutable_blob'),
  check (snapshot->'canonicalArtifact'->>'artifactDigest'=artifact_digest)
);

create table if not exists public.velmere_customer_artifact_pdf_blobs (
  schema_version text not null check (schema_version='pass4824-account-customer-artifact-pdf-blob-v1'),
  blob_id text primary key,
  snapshot_id text not null references public.velmere_customer_artifact_snapshots(snapshot_id) on delete cascade,
  account_id text not null,
  account_id_hash text not null check (account_id_hash ~ '^[a-f0-9]{64}$'),
  surface text not null,
  report_id text not null,
  artifact_digest text not null check (artifact_digest ~ '^sha256:[a-f0-9]{64}$'),
  pdf_digest text not null check (pdf_digest ~ '^sha256:[a-f0-9]{64}$'),
  pdf_byte_length integer not null check (pdf_byte_length between 1 and 8388608),
  mime_type text not null check (mime_type='application/pdf'),
  pdf_bytes bytea not null,
  created_at timestamptz not null,
  record_digest text not null check (record_digest ~ '^sha256:[a-f0-9]{64}$'),
  unique(account_id_hash,artifact_digest),
  check (octet_length(pdf_bytes)=pdf_byte_length),
  check (substring(pdf_bytes from 1 for 5)=decode('255044462d','hex')),
  check (pdf_digest='sha256:'||encode(extensions.digest(pdf_bytes,'sha256'),'hex'))
);

alter table public.velmere_customer_artifact_snapshots enable row level security;
alter table public.velmere_customer_artifact_pdf_blobs enable row level security;
revoke all on public.velmere_customer_artifact_snapshots from public,anon,authenticated,service_role;
revoke all on public.velmere_customer_artifact_pdf_blobs from public,anon,authenticated,service_role;
grant select on public.velmere_customer_artifact_snapshots to authenticated,service_role;
grant select on public.velmere_customer_artifact_pdf_blobs to authenticated,service_role;

drop policy if exists r7_customer_artifact_snapshot_owner_select on public.velmere_customer_artifact_snapshots;
create policy r7_customer_artifact_snapshot_owner_select on public.velmere_customer_artifact_snapshots
for select to authenticated using (
  account_id=public.velmere_current_account_id()
  and account_id_hash=public.velmere_current_account_binding_hash()
);
drop policy if exists r7_customer_artifact_pdf_owner_select on public.velmere_customer_artifact_pdf_blobs;
create policy r7_customer_artifact_pdf_owner_select on public.velmere_customer_artifact_pdf_blobs
for select to authenticated using (
  account_id=public.velmere_current_account_id()
  and account_id_hash=public.velmere_current_account_binding_hash()
);

create or replace function public.velmere_r7_artifact_immutable_guard() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if current_setting('velmere.r7_authorized_erasure',true)='on' and tg_op='DELETE' then return old; end if;
  raise exception 'customer_artifact_immutable' using errcode='23514';
end $$;
drop trigger if exists r7_snapshot_immutable on public.velmere_customer_artifact_snapshots;
create trigger r7_snapshot_immutable before update or delete on public.velmere_customer_artifact_snapshots
for each row execute function public.velmere_r7_artifact_immutable_guard();
drop trigger if exists r7_pdf_immutable on public.velmere_customer_artifact_pdf_blobs;
create trigger r7_pdf_immutable before update or delete on public.velmere_customer_artifact_pdf_blobs
for each row execute function public.velmere_r7_artifact_immutable_guard();
revoke all on function public.velmere_r7_artifact_immutable_guard() from public,anon,authenticated,service_role;

create or replace function public.velmere_store_customer_artifact_pdf_bundle_v1(
 p_account_id text,p_snapshot jsonb,p_payload_canonical text,p_blob jsonb,p_pdf_base64 text
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare
 v_hash text:=encode(extensions.digest('velmere-account-binding-v1:'||p_account_id,'sha256'),'hex');
 v_pdf bytea:=decode(p_pdf_base64,'base64'); v_created boolean:=false;
 v_sid text:=p_snapshot->>'snapshotId'; v_art text:=p_snapshot->'canonicalArtifact'->>'artifactDigest';
 v_existing_snapshot jsonb; v_existing_pdf bytea;
begin
 if p_account_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{5,119}$' then raise exception 'account_invalid' using errcode='22023'; end if;
 if p_snapshot->>'schemaVersion'<>'pass4822-account-customer-artifact-snapshot-v1'
    or p_snapshot->>'accountIdHash'<>v_hash or p_snapshot->>'pdfStorage'<>'exact_immutable_blob'
    or p_snapshot->>'surface'<>'lens' or p_snapshot->>'payloadKind'<>'lens_report_v1'
    or p_snapshot->'canonicalArtifact'->>'surface'<>'lens'
    or p_snapshot->'canonicalArtifact'->>'reportId'<>p_snapshot->>'reportId'
    or p_snapshot->'canonicalArtifact'->>'payloadDigest'<>p_snapshot->>'payloadDigest'
    or p_snapshot->'canonicalArtifact'->>'pdfDigest'<>'sha256:'||encode(extensions.digest(v_pdf,'sha256'),'hex')
    or (p_snapshot->'canonicalArtifact'->>'pdfByteLength')::integer<>octet_length(v_pdf)
    or substring(v_pdf from 1 for 5)<>decode('255044462d','hex')
    or v_sid<>'artifact-lens-'||left(v_hash,16)||'-'||substring(v_art from 8)
 then raise exception 'customer_artifact_pdf_bundle_snapshot_contract_invalid' using errcode='23514'; end if;
 if p_blob->>'schemaVersion'<>'pass4824-account-customer-artifact-pdf-blob-v1'
    or p_blob->>'snapshotId'<>v_sid or p_blob->>'accountIdHash'<>v_hash
    or p_blob->>'artifactDigest'<>v_art or p_blob->>'pdfDigest'<>p_snapshot->'canonicalArtifact'->>'pdfDigest'
    or (p_blob->>'pdfByteLength')::integer<>octet_length(v_pdf)
    or p_blob->>'mimeType'<>'application/pdf'
 then raise exception 'customer_artifact_pdf_bundle_blob_contract_invalid' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtext(v_sid));
 select snapshot into v_existing_snapshot from public.velmere_customer_artifact_snapshots where snapshot_id=v_sid;
 select pdf_bytes into v_existing_pdf from public.velmere_customer_artifact_pdf_blobs where snapshot_id=v_sid;
 if v_existing_snapshot is null and v_existing_pdf is null then
   insert into public.velmere_customer_artifact_snapshots(snapshot_id,account_id,account_id_hash,surface,payload_kind,report_id,artifact_digest,snapshot_digest,pdf_storage,snapshot,generated_at)
   values(v_sid,p_account_id,v_hash,'lens','lens_report_v1',p_snapshot->>'reportId',v_art,p_snapshot->>'snapshotDigest','exact_immutable_blob',p_snapshot,(p_snapshot->>'generatedAt')::timestamptz);
   insert into public.velmere_customer_artifact_pdf_blobs(schema_version,blob_id,snapshot_id,account_id,account_id_hash,surface,report_id,artifact_digest,pdf_digest,pdf_byte_length,mime_type,pdf_bytes,created_at,record_digest)
   values(p_blob->>'schemaVersion',p_blob->>'blobId',v_sid,p_account_id,v_hash,'lens',p_blob->>'reportId',v_art,p_blob->>'pdfDigest',(p_blob->>'pdfByteLength')::integer,'application/pdf',v_pdf,(p_blob->>'createdAt')::timestamptz,p_blob->>'recordDigest');
   v_created:=true;
 elsif v_existing_snapshot is distinct from p_snapshot or v_existing_pdf is distinct from v_pdf then
   raise exception 'customer_artifact_pdf_bundle_immutable_conflict' using errcode='23514';
 end if;
 return jsonb_build_object('schemaVersion','pass4824-account-customer-artifact-pdf-bundle-rpc-v1','created',v_created,'snapshot',p_snapshot,'blob',p_blob||jsonb_build_object('pdfBase64',encode(v_pdf,'base64')));
end $$;
revoke all on function public.velmere_store_customer_artifact_pdf_bundle_v1(text,jsonb,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.velmere_store_customer_artifact_pdf_bundle_v1(text,jsonb,text,jsonb,text) to service_role;

create or replace function public.velmere_list_owner_visible_customer_artifacts_v1(p_limit integer default 24)
returns table(visibility_schema_version text,publication_state text,publication_link jsonb,snapshot_id text,account_id text,account_id_hash text,surface text,payload_kind text,report_id text,artifact_digest text,snapshot_digest text,pdf_storage text,snapshot jsonb,generated_at timestamptz)
language sql stable security invoker set search_path=pg_catalog,public as $$
 select 'p85-owner-visible-customer-artifact-read-v1','not_applicable',null::jsonb,s.snapshot_id,s.account_id,s.account_id_hash,s.surface,s.payload_kind,s.report_id,s.artifact_digest,s.snapshot_digest,s.pdf_storage,s.snapshot,s.generated_at
 from public.velmere_customer_artifact_snapshots s
 where s.surface<>'audit' order by s.generated_at desc,s.snapshot_id desc limit least(greatest(p_limit,1),50)
$$;
create or replace function public.velmere_get_owner_visible_customer_artifact_v1(p_snapshot_id text)
returns table(visibility_schema_version text,publication_state text,publication_link jsonb,snapshot_id text,account_id text,account_id_hash text,surface text,payload_kind text,report_id text,artifact_digest text,snapshot_digest text,pdf_storage text,snapshot jsonb,generated_at timestamptz)
language sql stable security invoker set search_path=pg_catalog,public as $$
 select 'p85-owner-visible-customer-artifact-read-v1','not_applicable',null::jsonb,s.snapshot_id,s.account_id,s.account_id_hash,s.surface,s.payload_kind,s.report_id,s.artifact_digest,s.snapshot_digest,s.pdf_storage,s.snapshot,s.generated_at
 from public.velmere_customer_artifact_snapshots s where s.snapshot_id=p_snapshot_id and s.surface<>'audit' limit 1
$$;
revoke all on function public.velmere_list_owner_visible_customer_artifacts_v1(integer) from public,anon,authenticated,service_role;
revoke all on function public.velmere_get_owner_visible_customer_artifact_v1(text) from public,anon,authenticated,service_role;
grant execute on function public.velmere_list_owner_visible_customer_artifacts_v1(integer) to authenticated;
grant execute on function public.velmere_get_owner_visible_customer_artifact_v1(text) to authenticated;

create or replace function public.velmere_r7_export_current_account_artifacts() returns jsonb
language sql stable security invoker set search_path=pg_catalog,public as $$
 select jsonb_build_object('schemaVersion','velmere.r7.account-artifact-export.v1','accountId',public.velmere_current_account_id(),'artifacts',coalesce(jsonb_agg(snapshot order by generated_at),'[]'::jsonb))
 from public.velmere_customer_artifact_snapshots
$$;
revoke all on function public.velmere_r7_export_current_account_artifacts() from public,anon,authenticated,service_role;
grant execute on function public.velmere_r7_export_current_account_artifacts() to authenticated;

create or replace function public.velmere_r7_erase_account_artifacts(p_account_id text) returns integer
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare n integer;
begin
 if not exists(select 1 from public.velmere_account_supabase_subject_bindings where account_id=p_account_id) then raise exception 'account_unbound'; end if;
 perform set_config('velmere.r7_authorized_erasure','on',true);
 delete from public.velmere_customer_artifact_pdf_blobs where account_id=p_account_id;
 delete from public.velmere_customer_artifact_snapshots where account_id=p_account_id;
 get diagnostics n=row_count; return n;
end $$;
revoke all on function public.velmere_r7_erase_account_artifacts(text) from public,anon,authenticated;
grant execute on function public.velmere_r7_erase_account_artifacts(text) to service_role;

create schema if not exists velmere_private;
revoke all on schema velmere_private from public,anon,authenticated;
create table if not exists velmere_private.r7_jwt_signing_key(id boolean primary key default true check(id),secret bytea not null,created_at timestamptz not null default now());
insert into velmere_private.r7_jwt_signing_key(id,secret) values(true,extensions.gen_random_bytes(32)) on conflict(id) do nothing;
create table if not exists velmere_private.r7_jwt_contexts(context_name text primary key,user_id uuid not null,session_id uuid not null,token text not null,claims jsonb not null,token_sha256 text not null,issued_at timestamptz not null,expires_at timestamptz not null);
revoke all on all tables in schema velmere_private from public,anon,authenticated,service_role;

create or replace function velmere_private.b64url(p bytea) returns text language sql immutable as $$select rtrim(translate(encode(p,'base64'),'+/','-_'),'=')$$;
create or replace function velmere_private.issue_r7_jwt(p_context text,p_user uuid,p_session uuid,p_ttl integer default 3600) returns text
language plpgsql security definer set search_path=pg_catalog,velmere_private,auth as $$
declare h text; c jsonb; p text; i text; s text; t text; k bytea; now_epoch bigint:=extract(epoch from now())::bigint;
begin
 select secret into k from velmere_private.r7_jwt_signing_key where id;
 if not exists(select 1 from auth.sessions where id=p_session and user_id=p_user and (not_after is null or not_after>now())) then raise exception 'session_invalid'; end if;
 h:=velmere_private.b64url(convert_to('{"alg":"HS256","typ":"JWT"}','utf8'));
 c:=jsonb_build_object('iss','velmere-r7-staging','aud','authenticated','role','authenticated','sub',p_user::text,'session_id',p_session::text,'iat',now_epoch,'exp',now_epoch+p_ttl,'jti',extensions.gen_random_uuid()::text);
 p:=velmere_private.b64url(convert_to(c::text,'utf8')); i:=h||'.'||p; s:=velmere_private.b64url(extensions.hmac(convert_to(i,'utf8'),k,'sha256')); t:=i||'.'||s;
 insert into velmere_private.r7_jwt_contexts values(p_context,p_user,p_session,t,c,'sha256:'||encode(extensions.digest(t,'sha256'),'hex'),now(),now()+make_interval(secs=>p_ttl))
 on conflict(context_name) do update set user_id=excluded.user_id,session_id=excluded.session_id,token=excluded.token,claims=excluded.claims,token_sha256=excluded.token_sha256,issued_at=excluded.issued_at,expires_at=excluded.expires_at;
 return 'issued';
end $$;
create or replace function velmere_private.verified_r7_claims(p_context text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,velmere_private,auth as $$
declare r velmere_private.r7_jwt_contexts%rowtype; k bytea; parts text[]; expected text;
begin
 select * into r from velmere_private.r7_jwt_contexts where context_name=p_context;
 if not found or r.expires_at<=now() then raise exception 'jwt_context_missing_or_expired'; end if;
 select secret into k from velmere_private.r7_jwt_signing_key where id;
 parts:=string_to_array(r.token,'.');
 if array_length(parts,1)<>3 then raise exception 'jwt_shape_invalid'; end if;
 expected:=velmere_private.b64url(extensions.hmac(convert_to(parts[1]||'.'||parts[2],'utf8'),k,'sha256'));
 if expected<>parts[3] or r.token_sha256<>'sha256:'||encode(extensions.digest(r.token,'sha256'),'hex') then raise exception 'jwt_signature_invalid'; end if;
 if (r.claims->>'exp')::bigint<=extract(epoch from now())::bigint then raise exception 'jwt_expired'; end if;
 if not exists(select 1 from auth.sessions where id=r.session_id and user_id=r.user_id and (not_after is null or not_after>now())) then raise exception 'jwt_session_invalid'; end if;
 return r.claims;
end $$;
revoke all on all functions in schema velmere_private from public,anon,authenticated,service_role;
