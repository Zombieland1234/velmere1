begin;
create schema if not exists velmere_private;
revoke all on schema velmere_private from public,anon,authenticated;

create table if not exists velmere_private.r7_artifact_backups (
  backup_id text primary key check (backup_id ~ '^r7-backup-[a-f0-9]{64}$'),
  snapshot_id text not null unique,
  account_id text not null,
  snapshot jsonb not null,
  payload_canonical text not null,
  blob jsonb not null,
  pdf_bytes bytea not null,
  source_snapshot_digest text not null check (source_snapshot_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_pdf_digest text not null check (source_pdf_digest ~ '^sha256:[a-f0-9]{64}$'),
  backup_digest text not null check (backup_digest ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create table if not exists velmere_private.r7_staging_receipts (
  receipt_id text primary key,
  receipt jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists velmere_private.r7_concurrency_restore_results(
  label text primary key, backup_id text not null, backend_pid integer not null,
  started_at timestamptz not null, finished_at timestamptz, created boolean,
  result_digest text, error_code text
);
revoke all on all tables in schema velmere_private from public,anon,authenticated,service_role;

create or replace function public.velmere_r7_backup_artifact(p_snapshot_id text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,velmere_private,extensions as $$
declare s public.velmere_customer_artifact_snapshots%rowtype; b public.velmere_customer_artifact_pdf_blobs%rowtype;
 v_backup_id text; v_blob jsonb; v_digest text; existing velmere_private.r7_artifact_backups%rowtype;
begin
 select * into s from public.velmere_customer_artifact_snapshots where snapshot_id=p_snapshot_id;
 if not found then raise exception 'r7_backup_snapshot_not_found'; end if;
 select * into b from public.velmere_customer_artifact_pdf_blobs where snapshot_id=p_snapshot_id;
 if not found then raise exception 'r7_backup_pdf_not_found'; end if;
 if s.account_id<>b.account_id or s.account_id_hash<>b.account_id_hash or s.artifact_digest<>b.artifact_digest then raise exception 'r7_backup_cross_row_binding_invalid'; end if;
 v_backup_id:='r7-backup-'||substring(s.snapshot_digest from 8);
 v_blob:=jsonb_build_object('schemaVersion',b.schema_version,'blobId',b.blob_id,'snapshotId',b.snapshot_id,'accountIdHash',b.account_id_hash,'surface',b.surface,'reportId',b.report_id,'artifactDigest',b.artifact_digest,'pdfDigest',b.pdf_digest,'pdfByteLength',b.pdf_byte_length,'mimeType',b.mime_type,'createdAt',to_char(b.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'recordDigest',b.record_digest);
 v_digest:='sha256:'||encode(extensions.digest(s.snapshot::text||E'\n'||v_blob::text||E'\n'||encode(b.pdf_bytes,'base64'),'sha256'),'hex');
 select * into existing from velmere_private.r7_artifact_backups where backup_id=v_backup_id;
 if found then
   if existing.backup_digest<>v_digest or existing.snapshot is distinct from s.snapshot or existing.pdf_bytes is distinct from b.pdf_bytes then raise exception 'r7_backup_immutable_conflict'; end if;
   return jsonb_build_object('schemaVersion','velmere.r7.artifact-backup.v1','created',false,'backupId',v_backup_id,'backupDigest',v_digest,'snapshotId',p_snapshot_id);
 end if;
 insert into velmere_private.r7_artifact_backups(backup_id,snapshot_id,account_id,snapshot,payload_canonical,blob,pdf_bytes,source_snapshot_digest,source_pdf_digest,backup_digest)
 values(v_backup_id,p_snapshot_id,s.account_id,s.snapshot,s.snapshot->'payload'::text,v_blob,b.pdf_bytes,s.snapshot_digest,b.pdf_digest,v_digest);
 return jsonb_build_object('schemaVersion','velmere.r7.artifact-backup.v1','created',true,'backupId',v_backup_id,'backupDigest',v_digest,'snapshotId',p_snapshot_id);
end $$;
revoke all on function public.velmere_r7_backup_artifact(text) from public,anon,authenticated;
grant execute on function public.velmere_r7_backup_artifact(text) to service_role;

create or replace function public.velmere_r7_restore_artifact_from_backup(p_backup_id text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,velmere_private,extensions as $$
declare r velmere_private.r7_artifact_backups%rowtype; result jsonb;
begin
 select * into r from velmere_private.r7_artifact_backups where backup_id=p_backup_id;
 if not found then raise exception 'r7_restore_backup_not_found'; end if;
 if r.backup_digest<>'sha256:'||encode(extensions.digest(r.snapshot::text||E'\n'||r.blob::text||E'\n'||encode(r.pdf_bytes,'base64'),'sha256'),'hex') then raise exception 'r7_restore_backup_digest_invalid'; end if;
 result:=public.velmere_store_customer_artifact_pdf_bundle_v1(r.account_id,r.snapshot,r.payload_canonical,r.blob,encode(r.pdf_bytes,'base64'));
 return result||jsonb_build_object('backupId',p_backup_id,'backupDigest',r.backup_digest);
end $$;
revoke all on function public.velmere_r7_restore_artifact_from_backup(text) from public,anon,authenticated;
grant execute on function public.velmere_r7_restore_artifact_from_backup(text) to service_role;

create or replace function velmere_private.r7_concurrency_restore_once(p_label text,p_backup_id text) returns void
language plpgsql security definer set search_path=pg_catalog,public,velmere_private,extensions as $$
declare inserted integer; r jsonb;
begin
 insert into velmere_private.r7_concurrency_restore_results(label,backup_id,backend_pid,started_at)
 values(p_label,p_backup_id,pg_backend_pid(),clock_timestamp()) on conflict(label) do nothing;
 get diagnostics inserted=row_count; if inserted=0 then return; end if;
 perform pg_sleep(1);
 begin
   r:=public.velmere_r7_restore_artifact_from_backup(p_backup_id);
   update velmere_private.r7_concurrency_restore_results set finished_at=clock_timestamp(),created=(r->>'created')::boolean,result_digest='sha256:'||encode(extensions.digest(r::text,'sha256'),'hex') where label=p_label;
 exception when others then
   update velmere_private.r7_concurrency_restore_results set finished_at=clock_timestamp(),error_code=sqlstate where label=p_label;
 end;
end $$;
revoke all on function velmere_private.r7_concurrency_restore_once(text,text) from public,anon,authenticated,service_role;
commit;
