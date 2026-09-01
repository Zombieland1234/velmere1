begin;

create extension if not exists pgcrypto;

-- PASS4824 CUSTOMER ARTIFACT EXACT PDF BLOB BEGIN
alter table public.velmere_customer_artifact_snapshots
  add column if not exists pdf_storage text default 'legacy_deterministic_rerender';

-- Every row which predates this contract is an explicit grandfathered legacy
-- rerender. ADD COLUMN DEFAULT backfills them without firing the existing
-- immutable row trigger. New inserts are atomic exact-PDF bundles only.

alter table public.velmere_customer_artifact_snapshots
  alter column pdf_storage set not null,
  alter column pdf_storage drop default,
  drop constraint if exists velmere_customer_artifact_pdf_storage_check,
  add constraint velmere_customer_artifact_pdf_storage_check check (
    (pdf_storage = 'legacy_deterministic_rerender' and not (snapshot ? 'pdfStorage'))
    or
    (pdf_storage = 'exact_immutable_blob' and snapshot->>'pdfStorage' = 'exact_immutable_blob')
  );

-- Runtime writes use the atomic security-definer RPC. A service-role caller can
-- read snapshots but cannot create a snapshot-only durable state.
revoke insert, update, delete on table public.velmere_customer_artifact_snapshots from service_role;
grant select on table public.velmere_customer_artifact_snapshots to service_role;

create or replace function public.velmere_customer_artifact_immutable_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'customer_artifact_snapshot_immutable' using errcode = '23514';
  end if;
  if new.pdf_storage <> 'exact_immutable_blob'
     or new.snapshot->>'pdfStorage' is distinct from 'exact_immutable_blob' then
    raise exception 'customer_artifact_new_snapshot_requires_exact_pdf_bundle' using errcode = '23514';
  end if;
  if new.snapshot->>'snapshotId' is distinct from new.snapshot_id
     or new.snapshot->>'snapshotDigest' is distinct from new.snapshot_digest
     or new.snapshot->'canonicalArtifact'->>'artifactDigest' is distinct from new.artifact_digest
     or new.snapshot->>'accountIdHash' is distinct from new.account_id_hash
     or new.snapshot->>'surface' is distinct from new.surface
     or new.snapshot->>'payloadKind' is distinct from new.payload_kind
     or new.snapshot->>'reportId' is distinct from new.report_id
     or (new.snapshot->>'generatedAt')::timestamptz is distinct from new.generated_at then
    raise exception 'customer_artifact_snapshot_contract_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.velmere_customer_artifact_immutable_guard() from public, anon, authenticated, service_role;

create table if not exists public.velmere_customer_artifact_pdf_blobs (
  schema_version text not null,
  blob_id text primary key,
  snapshot_id text not null references public.velmere_customer_artifact_snapshots(snapshot_id) on delete restrict,
  account_id text not null,
  account_id_hash text not null,
  surface text not null,
  report_id text not null,
  artifact_digest text not null,
  pdf_digest text not null,
  pdf_byte_length integer not null,
  mime_type text not null,
  pdf_bytes bytea not null,
  created_at timestamptz not null,
  record_digest text not null,
  constraint velmere_customer_artifact_pdf_blob_owner_artifact_unique unique (account_id_hash, artifact_digest)
);

alter table public.velmere_customer_artifact_pdf_blobs
  drop constraint if exists velmere_customer_artifact_pdf_blob_contract_check,
  add constraint velmere_customer_artifact_pdf_blob_contract_check check (
    schema_version = 'pass4824-account-customer-artifact-pdf-blob-v1'
    and blob_id = 'pdf-' || left(account_id_hash, 16) || '-' || substring(artifact_digest from 8)
    and blob_id ~ '^pdf-[a-f0-9]{16}-[a-f0-9]{64}$'
    and account_id_hash ~ '^[a-f0-9]{64}$'
    and surface in ('shield','real_markets','lens')
    and artifact_digest ~ '^sha256:[a-f0-9]{64}$'
    and pdf_digest ~ '^sha256:[a-f0-9]{64}$'
    and record_digest ~ '^sha256:[a-f0-9]{64}$'
    and mime_type = 'application/pdf'
    and pdf_byte_length between 1 and 8388608
    and octet_length(pdf_bytes) = pdf_byte_length
    and substring(pdf_bytes from 1 for 5) = decode('255044462d', 'hex')
    and pdf_digest = 'sha256:' || encode(digest(pdf_bytes, 'sha256'), 'hex')
    and record_digest = 'sha256:' || encode(digest(
      '{"accountIdHash":' || to_jsonb(account_id_hash)::text
      || ',"artifactDigest":' || to_jsonb(artifact_digest)::text
      || ',"blobId":' || to_jsonb(blob_id)::text
      || ',"createdAt":' || to_jsonb(to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))::text
      || ',"mimeType":' || to_jsonb(mime_type)::text
      || ',"pdfByteLength":' || pdf_byte_length::text
      || ',"pdfDigest":' || to_jsonb(pdf_digest)::text
      || ',"reportId":' || to_jsonb(report_id)::text
      || ',"schemaVersion":' || to_jsonb(schema_version)::text
      || ',"snapshotId":' || to_jsonb(snapshot_id)::text
      || ',"surface":' || to_jsonb(surface)::text || '}',
      'sha256'
    ), 'hex')
  );

alter table public.velmere_customer_artifact_pdf_blobs enable row level security;
revoke all on table public.velmere_customer_artifact_pdf_blobs from anon, authenticated;
revoke all on table public.velmere_customer_artifact_pdf_blobs from service_role;
grant select on table public.velmere_customer_artifact_pdf_blobs to service_role;

create index if not exists velmere_customer_artifact_pdf_blob_account_snapshot_idx
  on public.velmere_customer_artifact_pdf_blobs(account_id, snapshot_id);

create or replace function public.velmere_customer_artifact_pdf_blob_immutable_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  raise exception 'customer_artifact_pdf_blob_immutable' using errcode = '23514';
end;
$$;

drop trigger if exists velmere_customer_artifact_pdf_blob_immutable
  on public.velmere_customer_artifact_pdf_blobs;
create trigger velmere_customer_artifact_pdf_blob_immutable
before update or delete on public.velmere_customer_artifact_pdf_blobs
for each row execute function public.velmere_customer_artifact_pdf_blob_immutable_guard();

revoke all on function public.velmere_customer_artifact_pdf_blob_immutable_guard() from public, anon, authenticated, service_role;

create or replace function public.velmere_customer_artifact_exact_pdf_pair_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_snapshot public.velmere_customer_artifact_snapshots%rowtype;
  v_blob public.velmere_customer_artifact_pdf_blobs%rowtype;
begin
  if tg_table_name = 'velmere_customer_artifact_snapshots' then
    if new.pdf_storage <> 'exact_immutable_blob' then
      raise exception 'customer_artifact_new_snapshot_requires_exact_pdf_bundle' using errcode = '23514';
    end if;
    select * into v_blob from public.velmere_customer_artifact_pdf_blobs where snapshot_id = new.snapshot_id;
    if not found
       or v_blob.account_id <> new.account_id
       or v_blob.account_id_hash <> new.account_id_hash
       or v_blob.surface <> new.surface
       or v_blob.report_id <> new.report_id
       or v_blob.artifact_digest <> new.artifact_digest
       or v_blob.pdf_digest <> new.snapshot->'canonicalArtifact'->>'pdfDigest'
       or v_blob.pdf_byte_length <> (new.snapshot->'canonicalArtifact'->>'pdfByteLength')::integer
       or v_blob.created_at <> new.generated_at then
      raise exception 'customer_artifact_exact_pdf_pair_invariant' using errcode = '23514';
    end if;
  else
    select * into v_snapshot from public.velmere_customer_artifact_snapshots where snapshot_id = new.snapshot_id;
    if not found
       or v_snapshot.pdf_storage <> 'exact_immutable_blob'
       or v_snapshot.account_id <> new.account_id
       or v_snapshot.account_id_hash <> new.account_id_hash
       or v_snapshot.surface <> new.surface
       or v_snapshot.report_id <> new.report_id
       or v_snapshot.artifact_digest <> new.artifact_digest
       or v_snapshot.snapshot->'canonicalArtifact'->>'pdfDigest' <> new.pdf_digest
       or (v_snapshot.snapshot->'canonicalArtifact'->>'pdfByteLength')::integer <> new.pdf_byte_length
       or v_snapshot.generated_at <> new.created_at then
      raise exception 'customer_artifact_exact_pdf_pair_invariant' using errcode = '23514';
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists velmere_customer_artifact_snapshot_exact_pdf_pair
  on public.velmere_customer_artifact_snapshots;
create constraint trigger velmere_customer_artifact_snapshot_exact_pdf_pair
after insert on public.velmere_customer_artifact_snapshots
deferrable initially deferred
for each row execute function public.velmere_customer_artifact_exact_pdf_pair_guard();

drop trigger if exists velmere_customer_artifact_blob_exact_pdf_pair
  on public.velmere_customer_artifact_pdf_blobs;
create constraint trigger velmere_customer_artifact_blob_exact_pdf_pair
after insert on public.velmere_customer_artifact_pdf_blobs
deferrable initially deferred
for each row execute function public.velmere_customer_artifact_exact_pdf_pair_guard();

revoke all on function public.velmere_customer_artifact_exact_pdf_pair_guard() from public, anon, authenticated, service_role;

-- Remove the pre-hardening overload if this migration is replayed over an
-- earlier PASS4824 candidate. Keeping it would preserve a weaker write path.
drop function if exists public.velmere_store_customer_artifact_pdf_bundle_v1(text, jsonb, jsonb, text);

create or replace function public.velmere_store_customer_artifact_pdf_bundle_v1(
  p_account_id text,
  p_snapshot jsonb,
  p_payload_canonical text,
  p_blob jsonb,
  p_pdf_base64 text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_snapshot_id text := p_snapshot->>'snapshotId';
  v_account_id_hash text := p_snapshot->>'accountIdHash';
  v_artifact_digest text := p_snapshot->'canonicalArtifact'->>'artifactDigest';
  v_pdf_digest text := p_snapshot->'canonicalArtifact'->>'pdfDigest';
  v_pdf_byte_length integer;
  v_snapshot_pdf_byte_length integer;
  v_blob_pdf_byte_length integer;
  v_artifact_page_count integer;
  v_artifact_rendered_row_count integer;
  v_snapshot_generated_at timestamptz;
  v_blob_created_at timestamptz;
  v_pdf_bytes bytea;
  v_payload_from_canonical jsonb;
  v_payload_digest_expected text;
  v_artifact_canonical text;
  v_snapshot_artifact_canonical text;
  v_artifact_digest_expected text;
  v_snapshot_canonical text;
  v_snapshot_digest_expected text;
  v_record_canonical text;
  v_record_digest_expected text;
  v_snapshot public.velmere_customer_artifact_snapshots%rowtype;
  v_blob public.velmere_customer_artifact_pdf_blobs%rowtype;
  v_snapshot_exists boolean := false;
  v_blob_exists boolean := false;
  v_created boolean := false;
begin
  if p_account_id is null or length(p_account_id) < 1 or length(p_account_id) > 120
     or p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object'
     or p_blob is null or jsonb_typeof(p_blob) <> 'object'
     or p_payload_canonical is null or octet_length(p_payload_canonical) > 16777216
     or v_snapshot_id is null or length(v_snapshot_id) > 180 then
    raise exception 'customer_artifact_pdf_bundle_identity_invalid' using errcode = '23514';
  end if;

  begin
    v_payload_from_canonical := p_payload_canonical::jsonb;
  exception when others then
    raise exception 'customer_artifact_pdf_bundle_payload_canonical_invalid' using errcode = '22023';
  end;
  if v_payload_from_canonical is distinct from p_snapshot->'payload' then
    raise exception 'customer_artifact_pdf_bundle_payload_canonical_mismatch' using errcode = '23514';
  end if;
  v_payload_digest_expected := 'sha256:' || encode(digest(p_payload_canonical, 'sha256'), 'hex');

  if p_pdf_base64 is null or length(p_pdf_base64) > 11184816
     or p_pdf_base64 !~ '^[A-Za-z0-9+/]*={0,2}$' then
    raise exception 'customer_artifact_pdf_bundle_encoding_invalid' using errcode = '22023';
  end if;
  begin
    v_pdf_bytes := decode(p_pdf_base64, 'base64');
  exception when others then
    raise exception 'customer_artifact_pdf_bundle_encoding_invalid' using errcode = '22023';
  end;
  v_pdf_byte_length := octet_length(v_pdf_bytes);
  begin
    v_snapshot_pdf_byte_length := (p_snapshot->'canonicalArtifact'->>'pdfByteLength')::integer;
    v_blob_pdf_byte_length := (p_blob->>'pdfByteLength')::integer;
    v_artifact_page_count := (p_snapshot->'canonicalArtifact'->>'pageCount')::integer;
    v_artifact_rendered_row_count := (p_snapshot->'canonicalArtifact'->>'renderedRowCount')::integer;
    v_snapshot_generated_at := (p_snapshot->>'generatedAt')::timestamptz;
    v_blob_created_at := (p_blob->>'createdAt')::timestamptz;
  exception when others then
    raise exception 'customer_artifact_pdf_bundle_metadata_encoding_invalid' using errcode = '22023';
  end;

  v_artifact_canonical := '{"deliveredTier":' || coalesce((p_snapshot->'canonicalArtifact'->'deliveredTier')::text, 'null')
    || ',"layoutDigest":' || to_jsonb(p_snapshot->'canonicalArtifact'->>'layoutDigest')::text
    || ',"pageCount":' || v_artifact_page_count::text
    || ',"payloadDigest":' || to_jsonb(p_snapshot->'canonicalArtifact'->>'payloadDigest')::text
    || ',"pdfByteLength":' || v_snapshot_pdf_byte_length::text
    || ',"pdfDigest":' || to_jsonb(v_pdf_digest)::text
    || ',"renderPlanDigest":' || to_jsonb(p_snapshot->'canonicalArtifact'->>'renderPlanDigest')::text
    || ',"renderedRowCount":' || v_artifact_rendered_row_count::text
    || ',"rendererId":' || to_jsonb(p_snapshot->'canonicalArtifact'->>'rendererId')::text
    || ',"reportId":' || to_jsonb(p_snapshot->'canonicalArtifact'->>'reportId')::text
    || ',"requestedTier":' || to_jsonb(p_snapshot->'canonicalArtifact'->>'requestedTier')::text
    || ',"schemaVersion":' || to_jsonb(p_snapshot->'canonicalArtifact'->>'schemaVersion')::text
    || ',"surface":' || to_jsonb(p_snapshot->'canonicalArtifact'->>'surface')::text || '}';
  v_artifact_digest_expected := 'sha256:' || encode(digest(v_artifact_canonical, 'sha256'), 'hex');
  v_snapshot_artifact_canonical := '{"artifactDigest":' || to_jsonb(v_artifact_digest)::text
    || ',' || substring(v_artifact_canonical from 2);

  v_snapshot_canonical := '{"accountIdHash":' || to_jsonb(v_account_id_hash)::text
    || ',"canonicalArtifact":' || v_snapshot_artifact_canonical
    || ',"deliveredTier":' || coalesce((p_snapshot->'deliveredTier')::text, 'null')
    || ',"generatedAt":' || to_jsonb(p_snapshot->>'generatedAt')::text
    || ',"locale":' || to_jsonb(p_snapshot->>'locale')::text
    || ',"payload":' || p_payload_canonical
    || ',"payloadDigest":' || to_jsonb(p_snapshot->>'payloadDigest')::text
    || ',"payloadKind":' || to_jsonb(p_snapshot->>'payloadKind')::text
    || ',"pdfStorage":"exact_immutable_blob"'
    || ',"reportId":' || to_jsonb(p_snapshot->>'reportId')::text
    || ',"requestedTier":' || to_jsonb(p_snapshot->>'requestedTier')::text
    || ',"schemaVersion":' || to_jsonb(p_snapshot->>'schemaVersion')::text
    || ',"snapshotId":' || to_jsonb(v_snapshot_id)::text
    || ',"subject":' || to_jsonb(p_snapshot->>'subject')::text
    || ',"surface":' || to_jsonb(p_snapshot->>'surface')::text
    || ',"title":' || to_jsonb(p_snapshot->>'title')::text || '}';
  v_snapshot_digest_expected := 'sha256:' || encode(digest(v_snapshot_canonical, 'sha256'), 'hex');

  v_record_canonical := '{"accountIdHash":' || to_jsonb(v_account_id_hash)::text
    || ',"artifactDigest":' || to_jsonb(v_artifact_digest)::text
    || ',"blobId":' || to_jsonb(p_blob->>'blobId')::text
    || ',"createdAt":' || to_jsonb(p_blob->>'createdAt')::text
    || ',"mimeType":' || to_jsonb(p_blob->>'mimeType')::text
    || ',"pdfByteLength":' || v_blob_pdf_byte_length::text
    || ',"pdfDigest":' || to_jsonb(p_blob->>'pdfDigest')::text
    || ',"reportId":' || to_jsonb(p_blob->>'reportId')::text
    || ',"schemaVersion":' || to_jsonb(p_blob->>'schemaVersion')::text
    || ',"snapshotId":' || to_jsonb(p_blob->>'snapshotId')::text
    || ',"surface":' || to_jsonb(p_blob->>'surface')::text || '}';
  v_record_digest_expected := 'sha256:' || encode(digest(v_record_canonical, 'sha256'), 'hex');

  perform pg_advisory_xact_lock(hashtext(v_snapshot_id));

  if coalesce(p_snapshot->>'schemaVersion', '') <> 'pass4822-account-customer-artifact-snapshot-v1'
     or coalesce(p_snapshot->>'pdfStorage', '') <> 'exact_immutable_blob'
     or (select count(*) from jsonb_object_keys(p_snapshot)) <> 17
     or v_snapshot_digest_expected is null
     or coalesce(p_snapshot->>'snapshotDigest', '') <> v_snapshot_digest_expected
     or coalesce(p_snapshot->>'payloadDigest', '') <> v_payload_digest_expected
     or coalesce(v_account_id_hash, '') !~ '^[a-f0-9]{64}$'
     or v_account_id_hash <> encode(digest('velmere-account-binding-v1:' || p_account_id, 'sha256'), 'hex')
     or coalesce(p_snapshot->>'surface', '') not in ('shield','real_markets','lens')
     or coalesce(p_snapshot->>'payloadKind', '') not in ('market_customer_report_v1','lens_report_v1')
     or (p_snapshot->>'surface' = 'lens') <> (p_snapshot->>'payloadKind' = 'lens_report_v1')
     or coalesce(p_snapshot->>'reportId', '') = '' or length(p_snapshot->>'reportId') > 180
     or coalesce(p_snapshot->>'requestedTier', '') = '' or length(p_snapshot->>'requestedTier') > 48
     or coalesce(p_snapshot->>'title', '') = '' or length(p_snapshot->>'title') > 240
     or coalesce(p_snapshot->>'subject', '') = '' or length(p_snapshot->>'subject') > 180
     or coalesce(p_snapshot->>'locale', '') not in ('pl','en','de')
     or not (p_snapshot ? 'deliveredTier')
     or jsonb_typeof(p_snapshot->'deliveredTier') not in ('string','null')
     or (jsonb_typeof(p_snapshot->'deliveredTier') = 'string' and coalesce(p_snapshot->>'deliveredTier', '') = '')
     or coalesce(p_snapshot->'canonicalArtifact'->>'schemaVersion', '') <> 'pass4821-canonical-customer-artifact-v1'
     or (select count(*) from jsonb_object_keys(p_snapshot->'canonicalArtifact')) <> 14
     or not (p_snapshot->'canonicalArtifact' ? 'deliveredTier')
     or v_artifact_digest_expected is null
     or p_snapshot->'canonicalArtifact'->>'surface' <> p_snapshot->>'surface'
     or p_snapshot->'canonicalArtifact'->>'reportId' <> p_snapshot->>'reportId'
     or p_snapshot->'canonicalArtifact'->>'requestedTier' <> p_snapshot->>'requestedTier'
     or p_snapshot->'canonicalArtifact'->'deliveredTier' is distinct from p_snapshot->'deliveredTier'
     or p_snapshot->'canonicalArtifact'->>'payloadDigest' <> v_payload_digest_expected
     or coalesce(p_snapshot->'canonicalArtifact'->>'rendererId', '') = ''
     or coalesce(p_snapshot->'canonicalArtifact'->>'layoutDigest', '') !~ '^sha256:[a-f0-9]{64}$'
     or coalesce(p_snapshot->'canonicalArtifact'->>'renderPlanDigest', '') !~ '^sha256:[a-f0-9]{64}$'
     or coalesce(v_artifact_digest, '') <> v_artifact_digest_expected
     or coalesce(v_pdf_digest, '') !~ '^sha256:[a-f0-9]{64}$'
     or v_snapshot_id <> 'artifact-' || (p_snapshot->>'surface') || '-' || left(v_account_id_hash, 16) || '-' || substring(v_artifact_digest from 8)
     or v_pdf_byte_length is null or v_pdf_byte_length < 1 or v_pdf_byte_length > 8388608
     or substring(v_pdf_bytes from 1 for 5) <> decode('255044462d', 'hex')
     or v_pdf_digest <> 'sha256:' || encode(digest(v_pdf_bytes, 'sha256'), 'hex')
     or v_snapshot_pdf_byte_length is null or v_snapshot_pdf_byte_length <> v_pdf_byte_length
     or v_artifact_page_count < 1 or v_artifact_rendered_row_count < 1
     or v_snapshot_generated_at is null
     or p_snapshot->>'generatedAt' <> to_char(v_snapshot_generated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') then
    raise exception 'customer_artifact_pdf_bundle_snapshot_contract_invalid' using errcode = '23514';
  end if;

  if coalesce(p_blob->>'schemaVersion', '') <> 'pass4824-account-customer-artifact-pdf-blob-v1'
     or (select count(*) from jsonb_object_keys(p_blob)) <> 12
     or v_record_digest_expected is null
     or coalesce(p_blob->>'blobId', '') <> 'pdf-' || left(v_account_id_hash, 16) || '-' || substring(v_artifact_digest from 8)
     or coalesce(p_blob->>'snapshotId', '') <> v_snapshot_id
     or coalesce(p_blob->>'accountIdHash', '') <> v_account_id_hash
     or coalesce(p_blob->>'surface', '') <> p_snapshot->>'surface'
     or coalesce(p_blob->>'reportId', '') <> p_snapshot->>'reportId'
     or coalesce(p_blob->>'artifactDigest', '') <> v_artifact_digest
     or coalesce(p_blob->>'pdfDigest', '') <> v_pdf_digest
     or v_blob_pdf_byte_length is null or v_blob_pdf_byte_length <> v_pdf_byte_length
     or coalesce(p_blob->>'mimeType', '') <> 'application/pdf'
     or v_blob_created_at is null or v_blob_created_at <> v_snapshot_generated_at
     or p_blob->>'createdAt' <> p_snapshot->>'generatedAt'
     or coalesce(p_blob->>'recordDigest', '') <> v_record_digest_expected then
    raise exception 'customer_artifact_pdf_bundle_blob_contract_invalid' using errcode = '23514';
  end if;

  select * into v_snapshot
    from public.velmere_customer_artifact_snapshots
    where snapshot_id = v_snapshot_id;
  v_snapshot_exists := found;
  select * into v_blob
    from public.velmere_customer_artifact_pdf_blobs
    where snapshot_id = v_snapshot_id;
  v_blob_exists := found;

  if v_snapshot_exists and not v_blob_exists and v_snapshot.pdf_storage = 'legacy_deterministic_rerender' then
    raise exception 'customer_artifact_pdf_bundle_legacy_snapshot_conflict' using errcode = '23514';
  end if;
  if v_snapshot_exists <> v_blob_exists then
    raise exception 'customer_artifact_pdf_bundle_partial_state_conflict' using errcode = '23514';
  end if;

  if v_snapshot_exists then
    if v_snapshot.pdf_storage <> 'exact_immutable_blob'
       or v_snapshot.account_id <> p_account_id
       or v_snapshot.account_id_hash <> v_account_id_hash
       or v_snapshot.snapshot_digest <> v_snapshot_digest_expected
       or v_snapshot.artifact_digest <> v_artifact_digest_expected
       or v_snapshot.snapshot <> p_snapshot
       or v_blob.account_id <> p_account_id
       or v_blob.account_id_hash <> v_account_id_hash
       or v_blob.schema_version <> p_blob->>'schemaVersion'
       or v_blob.blob_id <> p_blob->>'blobId'
       or v_blob.snapshot_id <> v_snapshot_id
       or v_blob.surface <> p_blob->>'surface'
       or v_blob.report_id <> p_blob->>'reportId'
       or v_blob.artifact_digest <> v_artifact_digest_expected
       or v_blob.pdf_digest <> v_pdf_digest
       or v_blob.pdf_byte_length <> v_pdf_byte_length
       or v_blob.mime_type <> 'application/pdf'
       or v_blob.created_at <> v_blob_created_at
       or v_blob.record_digest <> v_record_digest_expected
       or v_blob.pdf_bytes <> v_pdf_bytes then
      raise exception 'customer_artifact_pdf_bundle_immutable_conflict' using errcode = '23514';
    end if;
  else
    insert into public.velmere_customer_artifact_snapshots (
      snapshot_id, account_id, account_id_hash, surface, payload_kind, report_id,
      artifact_digest, snapshot_digest, pdf_storage, snapshot, generated_at
    ) values (
      v_snapshot_id, p_account_id, v_account_id_hash, p_snapshot->>'surface',
      p_snapshot->>'payloadKind', p_snapshot->>'reportId', v_artifact_digest_expected,
      v_snapshot_digest_expected, 'exact_immutable_blob', p_snapshot, v_snapshot_generated_at
    ) returning * into v_snapshot;

    insert into public.velmere_customer_artifact_pdf_blobs (
      schema_version, blob_id, snapshot_id, account_id, account_id_hash, surface,
      report_id, artifact_digest, pdf_digest, pdf_byte_length, mime_type, pdf_bytes,
      created_at, record_digest
    ) values (
      p_blob->>'schemaVersion', p_blob->>'blobId', v_snapshot_id, p_account_id,
      v_account_id_hash, p_blob->>'surface', p_blob->>'reportId', v_artifact_digest_expected,
      v_pdf_digest, v_pdf_byte_length, p_blob->>'mimeType', v_pdf_bytes,
      v_blob_created_at, v_record_digest_expected
    ) returning * into v_blob;
    v_created := true;
  end if;

  return jsonb_build_object(
    'schemaVersion', 'pass4824-account-customer-artifact-pdf-bundle-rpc-v1',
    'created', v_created,
    'snapshot', v_snapshot.snapshot,
    'blob', jsonb_build_object(
      'schemaVersion', v_blob.schema_version,
      'blobId', v_blob.blob_id,
      'snapshotId', v_blob.snapshot_id,
      'accountIdHash', v_blob.account_id_hash,
      'surface', v_blob.surface,
      'reportId', v_blob.report_id,
      'artifactDigest', v_blob.artifact_digest,
      'pdfDigest', v_blob.pdf_digest,
      'pdfByteLength', v_blob.pdf_byte_length,
      'mimeType', v_blob.mime_type,
      'createdAt', to_char(v_blob.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'recordDigest', v_blob.record_digest,
      'pdfBase64', encode(v_blob.pdf_bytes, 'base64')
    )
  );
end;
$$;

revoke all on function public.velmere_store_customer_artifact_pdf_bundle_v1(text, jsonb, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.velmere_store_customer_artifact_pdf_bundle_v1(text, jsonb, text, jsonb, text)
  to service_role;

comment on table public.velmere_customer_artifact_pdf_blobs is
  'PASS4824 insert-once exact PDF bytes, account/snapshot/report/digest bound; reads and atomic writes are service-role only.';
comment on function public.velmere_store_customer_artifact_pdf_bundle_v1(text, jsonb, text, jsonb, text) is
  'PASS4824 atomic exact snapshot plus PDF insert/read-existing RPC. Server recomputes payload, artifact, snapshot, PDF and metadata digests; deferred pair invariants fail closed.';
-- PASS4824 CUSTOMER ARTIFACT EXACT PDF BLOB END

commit;
