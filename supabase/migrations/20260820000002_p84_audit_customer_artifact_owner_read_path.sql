begin;

-- P84 AUDIT CUSTOMER ARTIFACT OWNER READ PATH BEGIN
-- P83 correctly made publication atomic, but its copied P4823/P4824 DDL also
-- revoked the authenticated SELECT grants required by the server-side
-- owner-token read path. Audit link validation additionally queried the full
-- service-role-only message table. P84 restores owner reads without exposing
-- operator fields by introducing one minimal immutable link ledger.

alter table public.velmere_customer_artifact_snapshots enable row level security;
alter table public.velmere_customer_artifact_pdf_blobs enable row level security;

revoke all on table public.velmere_customer_artifact_snapshots from public, anon, authenticated;
revoke all on table public.velmere_customer_artifact_pdf_blobs from public, anon, authenticated;
grant select on table public.velmere_customer_artifact_snapshots to authenticated;
grant select on table public.velmere_customer_artifact_pdf_blobs to authenticated;

-- Rebind the current salted owner policies after the P83 privilege reset.
drop policy if exists pass22_customer_artifact_snapshot_owner_select on public.velmere_customer_artifact_snapshots;
drop policy if exists a102r2_customer_artifact_snapshot_owner_select on public.velmere_customer_artifact_snapshots;
drop policy if exists p84_customer_artifact_snapshot_owner_select on public.velmere_customer_artifact_snapshots;
create policy p84_customer_artifact_snapshot_owner_select
on public.velmere_customer_artifact_snapshots
for select to authenticated
using (
  account_id = public.velmere_current_account_id()
  and account_id_hash = public.velmere_current_account_binding_hash()
);

drop policy if exists pass22_customer_artifact_pdf_owner_select on public.velmere_customer_artifact_pdf_blobs;
drop policy if exists a102r2_customer_artifact_pdf_owner_select on public.velmere_customer_artifact_pdf_blobs;
drop policy if exists p84_customer_artifact_pdf_owner_select on public.velmere_customer_artifact_pdf_blobs;
create policy p84_customer_artifact_pdf_owner_select
on public.velmere_customer_artifact_pdf_blobs
for select to authenticated
using (
  account_id = public.velmere_current_account_id()
  and account_id_hash = public.velmere_current_account_binding_hash()
);

-- The full Audit message ledger remains server/operator only. Customer routes
-- receive only the closed link row below, never operator_note, admin_route,
-- action_log, payment evidence or the complete internal message record.
revoke all on table public.velmere_audit_account_messages from public, anon, authenticated;
grant select, insert, update, delete on table public.velmere_audit_account_messages to service_role;

create table if not exists public.velmere_audit_customer_artifact_links (
  schema_version text not null,
  snapshot_id text primary key
    references public.velmere_customer_artifact_snapshots(snapshot_id)
    on update restrict on delete restrict,
  message_id text not null unique
    references public.velmere_audit_account_messages(message_id)
    on update restrict on delete restrict,
  account_id text not null,
  account_id_hash text not null,
  audit_snapshot_digest text not null,
  artifact_snapshot_digest text not null,
  artifact_digest text not null,
  pdf_blob_id text not null unique
    references public.velmere_customer_artifact_pdf_blobs(blob_id)
    on update restrict on delete restrict,
  pdf_digest text not null,
  linked_at timestamptz not null,
  created_at timestamptz not null,
  constraint velmere_audit_customer_artifact_links_schema_check
    check (schema_version = 'p84-audit-customer-artifact-link-v1'),
  constraint velmere_audit_customer_artifact_links_owner_check
    check (
      length(account_id) between 1 and 120
      and account_id not like 'preview:%'
      and account_id_hash ~ '^[a-f0-9]{64}$'
    ),
  constraint velmere_audit_customer_artifact_links_identity_check
    check (
      snapshot_id ~ '^artifact-audit-[a-f0-9]{16}-[a-f0-9]{64}$'
      and length(message_id) between 1 and 160
      and pdf_blob_id ~ '^pdf-[a-f0-9]{16}-[a-f0-9]{64}$'
    ),
  constraint velmere_audit_customer_artifact_links_digest_check
    check (
      audit_snapshot_digest ~ '^sha256:[a-f0-9]{64}$'
      and artifact_snapshot_digest ~ '^sha256:[a-f0-9]{64}$'
      and artifact_digest ~ '^sha256:[a-f0-9]{64}$'
      and pdf_digest ~ '^sha256:[a-f0-9]{64}$'
    ),
  constraint velmere_audit_customer_artifact_links_time_check
    check (created_at = linked_at)
);

alter table public.velmere_audit_customer_artifact_links enable row level security;
create index if not exists velmere_audit_customer_artifact_links_owner_idx
  on public.velmere_audit_customer_artifact_links(account_id, linked_at desc);
create index if not exists velmere_audit_customer_artifact_links_owner_hash_idx
  on public.velmere_audit_customer_artifact_links(account_id_hash, linked_at desc);

revoke all on table public.velmere_audit_customer_artifact_links from public, anon, authenticated, service_role;
grant select on table public.velmere_audit_customer_artifact_links to authenticated, service_role;

drop policy if exists p84_audit_customer_artifact_link_owner_select on public.velmere_audit_customer_artifact_links;
create policy p84_audit_customer_artifact_link_owner_select
on public.velmere_audit_customer_artifact_links
for select to authenticated
using (
  account_id = public.velmere_current_account_id()
  and account_id_hash = public.velmere_current_account_binding_hash()
);

create or replace function public.velmere_audit_customer_artifact_link_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_message public.velmere_audit_account_messages%rowtype;
  v_snapshot public.velmere_customer_artifact_snapshots%rowtype;
  v_blob public.velmere_customer_artifact_pdf_blobs%rowtype;
  v_exact jsonb;
  v_expected_account_hash text;
begin
  if tg_op <> 'INSERT' then
    raise exception 'audit_customer_artifact_link_immutable' using errcode = '23514';
  end if;

  v_expected_account_hash := encode(digest('velmere-account-binding-v1:' || new.account_id, 'sha256'), 'hex');

  select * into v_message
  from public.velmere_audit_account_messages
  where message_id = new.message_id;
  if not found then
    raise exception 'audit_customer_artifact_link_message_missing' using errcode = '23514';
  end if;

  select * into v_snapshot
  from public.velmere_customer_artifact_snapshots
  where snapshot_id = new.snapshot_id;
  if not found then
    raise exception 'audit_customer_artifact_link_snapshot_missing' using errcode = '23514';
  end if;

  select * into v_blob
  from public.velmere_customer_artifact_pdf_blobs
  where blob_id = new.pdf_blob_id
    and snapshot_id = new.snapshot_id;
  if not found then
    raise exception 'audit_customer_artifact_link_pdf_missing' using errcode = '23514';
  end if;

  v_exact := v_message.canonical_customer_snapshot->'exactAccountArtifact';
  if new.schema_version <> 'p84-audit-customer-artifact-link-v1'
     or new.account_id like 'preview:%'
     or new.account_id_hash <> v_expected_account_hash
     or new.linked_at is distinct from v_message.updated_at
     or new.created_at is distinct from v_message.updated_at
     or v_message.account_id <> new.account_id
     or v_message.canonical_customer_snapshot is null
     or v_message.canonical_customer_snapshot_digest <> new.audit_snapshot_digest
     or v_message.canonical_customer_snapshot->>'snapshotDigest' <> new.audit_snapshot_digest
     or v_message.exact_account_artifact_snapshot_id <> new.snapshot_id
     or jsonb_typeof(v_exact) <> 'object'
     or v_exact->>'snapshotId' <> new.snapshot_id
     or v_exact->>'pdfBlobId' <> new.pdf_blob_id
     or v_exact->>'artifactDigest' <> new.artifact_digest
     or v_exact->>'pdfDigest' <> new.pdf_digest
     or v_snapshot.account_id <> new.account_id
     or v_snapshot.account_id_hash <> new.account_id_hash
     or v_snapshot.surface <> 'audit'
     or v_snapshot.payload_kind <> 'audit_customer_report_v1'
     or v_snapshot.snapshot_digest <> new.artifact_snapshot_digest
     or v_snapshot.artifact_digest <> new.artifact_digest
     or v_blob.account_id <> new.account_id
     or v_blob.account_id_hash <> new.account_id_hash
     or v_blob.surface <> 'audit'
     or v_blob.snapshot_id <> new.snapshot_id
     or v_blob.artifact_digest <> new.artifact_digest
     or v_blob.pdf_digest <> new.pdf_digest
     or v_blob.record_digest <> v_exact->>'pdfBlobRecordDigest'
     or v_blob.pdf_byte_length::text <> v_exact->>'pdfByteLength'
     or octet_length(v_blob.pdf_bytes) <> v_blob.pdf_byte_length
     or 'sha256:' || encode(digest(v_blob.pdf_bytes, 'sha256'), 'hex') <> v_blob.pdf_digest then
    raise exception 'audit_customer_artifact_link_cross_binding_failed' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists velmere_audit_customer_artifact_link_immutable
  on public.velmere_audit_customer_artifact_links;
create trigger velmere_audit_customer_artifact_link_immutable
before insert or update or delete on public.velmere_audit_customer_artifact_links
for each row execute function public.velmere_audit_customer_artifact_link_guard();

revoke all on function public.velmere_audit_customer_artifact_link_guard()
  from public, anon, authenticated, service_role;

-- Deterministic, fail-closed migration of any already-atomically-published P83
-- bundle. The insert trigger revalidates every cross-table binding.
insert into public.velmere_audit_customer_artifact_links (
  schema_version, snapshot_id, message_id, account_id, account_id_hash,
  audit_snapshot_digest, artifact_snapshot_digest, artifact_digest,
  pdf_blob_id, pdf_digest, linked_at, created_at
)
select
  'p84-audit-customer-artifact-link-v1',
  m.exact_account_artifact_snapshot_id,
  m.message_id,
  m.account_id,
  s.account_id_hash,
  m.canonical_customer_snapshot_digest,
  s.snapshot_digest,
  s.artifact_digest,
  b.blob_id,
  b.pdf_digest,
  m.updated_at,
  m.updated_at
from public.velmere_audit_account_messages m
join public.velmere_customer_artifact_snapshots s
  on s.snapshot_id = m.exact_account_artifact_snapshot_id
join public.velmere_customer_artifact_pdf_blobs b
  on b.snapshot_id = s.snapshot_id
 and b.blob_id = m.canonical_customer_snapshot->'exactAccountArtifact'->>'pdfBlobId'
where m.exact_account_artifact_snapshot_id is not null
on conflict (snapshot_id) do nothing;

do $$
begin
  if exists (
    select 1
    from public.velmere_audit_account_messages m
    where m.exact_account_artifact_snapshot_id is not null
      and not exists (
        select 1
        from public.velmere_audit_customer_artifact_links l
        where l.snapshot_id = m.exact_account_artifact_snapshot_id
          and l.message_id = m.message_id
          and l.account_id = m.account_id
          and l.audit_snapshot_digest = m.canonical_customer_snapshot_digest
      )
  ) then
    raise exception 'audit_customer_artifact_link_backfill_incomplete' using errcode = '23514';
  end if;
end $$;

create or replace function public.velmere_publish_audit_exact_artifact_v2(
  p_account_id text,
  p_snapshot jsonb,
  p_payload_canonical text,
  p_blob jsonb,
  p_pdf_base64 text,
  p_audit_snapshot jsonb,
  p_message jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_publication jsonb;
  v_message public.velmere_audit_account_messages%rowtype;
  v_snapshot public.velmere_customer_artifact_snapshots%rowtype;
  v_blob public.velmere_customer_artifact_pdf_blobs%rowtype;
  v_link public.velmere_audit_customer_artifact_links%rowtype;
  v_existing_count integer := 0;
  v_created_link boolean := false;
  v_expected_account_hash text;
begin
  v_publication := public.velmere_publish_audit_exact_artifact_v1(
    p_account_id,
    p_snapshot,
    p_payload_canonical,
    p_blob,
    p_pdf_base64,
    p_audit_snapshot,
    p_message
  );

  if jsonb_typeof(v_publication) <> 'object'
     or (select count(*) from jsonb_object_keys(v_publication)) <> 4
     or coalesce(v_publication->>'schemaVersion', '') <> 'p83-audit-exact-artifact-atomic-publication-rpc-v1'
     or jsonb_typeof(v_publication->'bundle') <> 'object'
     or (select count(*) from jsonb_object_keys(v_publication->'bundle')) <> 4
     or coalesce(v_publication->'bundle'->>'schemaVersion', '') <> 'pass4824-account-customer-artifact-pdf-bundle-rpc-v1'
     or jsonb_typeof(v_publication->'bundle'->'snapshot') <> 'object'
     or jsonb_typeof(v_publication->'bundle'->'blob') <> 'object'
     or jsonb_typeof(v_publication->'message') <> 'object' then
    raise exception 'audit_customer_artifact_link_parent_publication_invalid' using errcode = '23514';
  end if;

  select * into v_message
  from public.velmere_audit_account_messages
  where message_id = p_message->>'message_id'
  for update;
  if not found then
    raise exception 'audit_customer_artifact_link_message_missing_after_publish' using errcode = '23514';
  end if;

  select * into v_snapshot
  from public.velmere_customer_artifact_snapshots
  where snapshot_id = p_snapshot->>'snapshotId'
  for update;
  if not found then
    raise exception 'audit_customer_artifact_link_snapshot_missing_after_publish' using errcode = '23514';
  end if;

  select * into v_blob
  from public.velmere_customer_artifact_pdf_blobs
  where blob_id = p_blob->>'blobId'
    and snapshot_id = p_snapshot->>'snapshotId'
  for update;
  if not found then
    raise exception 'audit_customer_artifact_link_pdf_missing_after_publish' using errcode = '23514';
  end if;

  v_expected_account_hash := encode(digest('velmere-account-binding-v1:' || p_account_id, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(
    'p84:' || p_account_id || ':' || v_message.message_id || ':' || v_snapshot.snapshot_id,
    0
  ));

  select count(*) into v_existing_count
  from public.velmere_audit_customer_artifact_links
  where snapshot_id = v_snapshot.snapshot_id
     or message_id = v_message.message_id
     or pdf_blob_id = v_blob.blob_id;
  if v_existing_count > 1 then
    raise exception 'audit_customer_artifact_link_identity_ambiguous' using errcode = '23514';
  end if;

  if v_existing_count = 1 then
    select * into v_link
    from public.velmere_audit_customer_artifact_links
    where snapshot_id = v_snapshot.snapshot_id
       or message_id = v_message.message_id
       or pdf_blob_id = v_blob.blob_id
    for update;
  else
    insert into public.velmere_audit_customer_artifact_links (
      schema_version, snapshot_id, message_id, account_id, account_id_hash,
      audit_snapshot_digest, artifact_snapshot_digest, artifact_digest,
      pdf_blob_id, pdf_digest, linked_at, created_at
    ) values (
      'p84-audit-customer-artifact-link-v1',
      v_snapshot.snapshot_id,
      v_message.message_id,
      p_account_id,
      v_expected_account_hash,
      v_message.canonical_customer_snapshot_digest,
      v_snapshot.snapshot_digest,
      v_snapshot.artifact_digest,
      v_blob.blob_id,
      v_blob.pdf_digest,
      v_message.updated_at,
      v_message.updated_at
    ) returning * into v_link;
    v_created_link := true;
  end if;

  if v_link.schema_version <> 'p84-audit-customer-artifact-link-v1'
     or v_link.snapshot_id <> v_snapshot.snapshot_id
     or v_link.message_id <> v_message.message_id
     or v_link.account_id <> p_account_id
     or v_link.account_id_hash <> v_expected_account_hash
     or v_link.audit_snapshot_digest <> v_message.canonical_customer_snapshot_digest
     or v_link.artifact_snapshot_digest <> v_snapshot.snapshot_digest
     or v_link.artifact_digest <> v_snapshot.artifact_digest
     or v_link.pdf_blob_id <> v_blob.blob_id
     or v_link.pdf_digest <> v_blob.pdf_digest
     or v_link.linked_at is distinct from v_message.updated_at
     or v_link.created_at is distinct from v_message.updated_at then
    raise exception 'audit_customer_artifact_link_commit_verification_failed' using errcode = '23514';
  end if;

  return jsonb_build_object(
    'schemaVersion', 'p84-audit-exact-artifact-owner-readable-publication-rpc-v2',
    'createdArtifact', coalesce((v_publication->'bundle'->>'created')::boolean, false),
    'createdMessage', coalesce((v_publication->>'createdMessage')::boolean, false),
    'createdLink', v_created_link,
    'snapshot', v_publication->'bundle'->'snapshot',
    'blob', v_publication->'bundle'->'blob',
    'message', v_publication->'message',
    'link', to_jsonb(v_link)
  );
end;
$$;

revoke all on function public.velmere_publish_audit_exact_artifact_v2(text, jsonb, text, jsonb, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_publish_audit_exact_artifact_v2(text, jsonb, text, jsonb, text, jsonb, jsonb)
  to service_role;

comment on table public.velmere_audit_customer_artifact_links is
  'P84 minimal immutable owner-readable Audit artifact link. It exposes no operator note, admin route, action log, payment evidence or raw provider evidence.';
comment on function public.velmere_publish_audit_exact_artifact_v2(text, jsonb, text, jsonb, text, jsonb, jsonb) is
  'P84 service-role-only transaction wrapper. P83 bundle/message publication and the minimal owner-readable RLS link commit together or roll back together.';
-- P84 AUDIT CUSTOMER ARTIFACT OWNER READ PATH END

commit;
