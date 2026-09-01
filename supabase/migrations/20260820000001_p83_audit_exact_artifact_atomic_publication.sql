begin;

-- P83 migration reachability repair: bring P80 Audit exact-artifact DDL into the ordered Supabase migration chain.
alter table public.velmere_audit_account_messages
  add column if not exists canonical_customer_snapshot jsonb,
  add column if not exists canonical_customer_snapshot_digest text,
  add column if not exists exact_account_artifact_snapshot_id text
    generated always as (canonical_customer_snapshot #>> '{exactAccountArtifact,snapshotId}') stored;

update public.velmere_audit_account_messages
set canonical_customer_snapshot_digest = canonical_customer_snapshot->>'snapshotDigest'
where canonical_customer_snapshot is not null
  and canonical_customer_snapshot_digest is null
  and canonical_customer_snapshot->>'snapshotDigest' ~ '^sha256:[a-f0-9]{64}$';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'velmere_audit_account_messages_snapshot_pair_check'
      and conrelid = 'public.velmere_audit_account_messages'::regclass
  ) then
    alter table public.velmere_audit_account_messages
      add constraint velmere_audit_account_messages_snapshot_pair_check
      check (
        (canonical_customer_snapshot is null and canonical_customer_snapshot_digest is null)
        or (
          canonical_customer_snapshot is not null
          and canonical_customer_snapshot_digest ~ '^sha256:[a-f0-9]{64}$'
          and canonical_customer_snapshot->>'snapshotDigest' = canonical_customer_snapshot_digest
          and canonical_customer_snapshot->>'schemaVersion' = 'pass4821-audit-account-customer-snapshot-v1'
        )
      );
  end if;
end $$;

create index if not exists velmere_audit_account_messages_snapshot_digest_idx
  on public.velmere_audit_account_messages(canonical_customer_snapshot_digest)
  where canonical_customer_snapshot_digest is not null;

create unique index if not exists velmere_audit_account_messages_exact_artifact_snapshot_uidx
  on public.velmere_audit_account_messages(exact_account_artifact_snapshot_id)
  where exact_account_artifact_snapshot_id is not null;

create or replace function public.velmere_enforce_audit_customer_snapshot_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exact_snapshot record;
  v_exact_blob record;
  v_exact jsonb;
  v_expected_account_hash text;
begin
  if tg_op = 'UPDATE' and new.account_id is distinct from old.account_id then
    raise exception 'audit_account_message_owner_immutable_conflict' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and old.canonical_customer_snapshot is not null then
    if new.canonical_customer_snapshot is distinct from old.canonical_customer_snapshot
       or new.canonical_customer_snapshot_digest is distinct from old.canonical_customer_snapshot_digest then
      raise exception 'audit_customer_snapshot_immutable_conflict' using errcode = '23514';
    end if;
  end if;

  if new.canonical_customer_snapshot is not null then
    if new.canonical_customer_snapshot_digest is null
       or new.canonical_customer_snapshot->>'snapshotDigest' is distinct from new.canonical_customer_snapshot_digest
       or new.canonical_customer_snapshot->>'schemaVersion' <> 'pass4821-audit-account-customer-snapshot-v1' then
      raise exception 'audit_customer_snapshot_integrity_failed' using errcode = '23514';
    end if;
  end if;

  if (new.operator_status in ('customer_safe_ready', 'delivered')
      or new.delivery_status = 'ready_for_download'
      or new.message_status = 'ready') then
    v_exact := new.canonical_customer_snapshot->'exactAccountArtifact';
    v_expected_account_hash := encode(digest('velmere-account-binding-v1:' || new.account_id, 'sha256'), 'hex');

    if new.canonical_customer_snapshot is null
       or jsonb_typeof(v_exact) <> 'object'
       or (select count(*) from jsonb_object_keys(v_exact)) <> 9
       or coalesce(v_exact->>'schemaVersion', '') <> 'p80-audit-exact-account-artifact-binding-v1'
       or coalesce(v_exact->>'storage', '') <> 'exact_immutable_blob'
       or coalesce(v_exact->>'snapshotId', '') !~ '^artifact-audit-[a-f0-9]{16}-[a-f0-9]{64}$'
       or coalesce(v_exact->>'pdfBlobId', '') !~ '^pdf-[a-f0-9]{16}-[a-f0-9]{64}$'
       or coalesce(v_exact->>'artifactDigest', '') <> coalesce(new.canonical_customer_snapshot->'canonicalArtifact'->>'artifactDigest', '')
       or coalesce(v_exact->>'pdfDigest', '') <> coalesce(new.canonical_customer_snapshot->'canonicalArtifact'->>'pdfDigest', '')
       or coalesce(v_exact->>'pdfByteLength', '') <> coalesce(new.canonical_customer_snapshot->'canonicalArtifact'->>'pdfByteLength', '')
       or coalesce(v_exact->>'snapshotDigest', '') !~ '^sha256:[a-f0-9]{64}$'
       or coalesce(v_exact->>'pdfBlobRecordDigest', '') !~ '^sha256:[a-f0-9]{64}$'
       or coalesce(new.canonical_customer_snapshot->>'accountIdHash', '') <> v_expected_account_hash
       or v_exact->>'snapshotId' <> 'artifact-audit-' || left(v_expected_account_hash, 16) || '-' || substring(v_exact->>'artifactDigest' from 8)
       or v_exact->>'pdfBlobId' <> 'pdf-' || left(v_expected_account_hash, 16) || '-' || substring(v_exact->>'artifactDigest' from 8) then
      raise exception 'exact_account_pdf_artifact_required_before_ready' using errcode = '23514';
    end if;

    select * into v_exact_snapshot
      from public.velmere_customer_artifact_snapshots
      where snapshot_id = v_exact->>'snapshotId';
    if not found then
      raise exception 'exact_account_pdf_snapshot_missing_before_ready' using errcode = '23514';
    end if;

    select * into v_exact_blob
      from public.velmere_customer_artifact_pdf_blobs
      where blob_id = v_exact->>'pdfBlobId'
        and snapshot_id = v_exact->>'snapshotId';
    if not found then
      raise exception 'exact_account_pdf_blob_missing_before_ready' using errcode = '23514';
    end if;

    if v_exact_snapshot.account_id <> new.account_id
       or v_exact_snapshot.account_id_hash <> v_expected_account_hash
       or v_exact_snapshot.surface <> 'audit'
       or v_exact_snapshot.payload_kind <> 'audit_customer_report_v1'
       or v_exact_snapshot.report_id <> new.canonical_customer_snapshot->>'reportId'
       or v_exact_snapshot.artifact_digest <> v_exact->>'artifactDigest'
       or v_exact_snapshot.snapshot_digest <> v_exact->>'snapshotDigest'
       or v_exact_snapshot.pdf_storage <> 'exact_immutable_blob'
       or v_exact_snapshot.snapshot->>'generatedAt' <> new.canonical_customer_snapshot->>'generatedAt'
       or v_exact_snapshot.snapshot->>'payloadDigest' <> new.canonical_customer_snapshot->>'customerReportDigest'
       or v_exact_blob.account_id <> new.account_id
       or v_exact_blob.account_id_hash <> v_expected_account_hash
       or v_exact_blob.surface <> 'audit'
       or v_exact_blob.report_id <> new.canonical_customer_snapshot->>'reportId'
       or v_exact_blob.artifact_digest <> v_exact->>'artifactDigest'
       or v_exact_blob.pdf_digest <> v_exact->>'pdfDigest'
       or v_exact_blob.pdf_byte_length::text <> v_exact->>'pdfByteLength'
       or v_exact_blob.record_digest <> v_exact->>'pdfBlobRecordDigest'
       or octet_length(v_exact_blob.pdf_bytes) <> v_exact_blob.pdf_byte_length
       or 'sha256:' || encode(digest(v_exact_blob.pdf_bytes, 'sha256'), 'hex') <> v_exact_blob.pdf_digest then
      raise exception 'exact_account_pdf_cross_binding_failed_before_ready' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists velmere_audit_customer_snapshot_immutability on public.velmere_audit_account_messages;
create trigger velmere_audit_customer_snapshot_immutability
before insert or update on public.velmere_audit_account_messages
for each row execute function public.velmere_enforce_audit_customer_snapshot_immutability();

revoke all on function public.velmere_enforce_audit_customer_snapshot_immutability() from public;
grant execute on function public.velmere_enforce_audit_customer_snapshot_immutability() to service_role;


-- PASS4823 CUSTOMER ARTIFACT SNAPSHOT BEGIN
create table if not exists public.velmere_customer_artifact_snapshots (
  snapshot_id text primary key,
  account_id text not null,
  account_id_hash text not null,
  surface text not null,
  payload_kind text not null,
  report_id text not null,
  artifact_digest text not null,
  snapshot_digest text not null,
  snapshot jsonb not null,
  generated_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.velmere_customer_artifact_snapshots
  drop constraint if exists velmere_customer_artifact_snapshots_surface_check,
  drop constraint if exists velmere_customer_artifact_surface_check,
  drop constraint if exists velmere_customer_artifact_snapshots_payload_kind_check,
  drop constraint if exists velmere_customer_artifact_payload_kind_check,
  drop constraint if exists velmere_customer_artifact_account_hash_check,
  drop constraint if exists velmere_customer_artifact_digest_check,
  drop constraint if exists velmere_customer_artifact_surface_payload_kind_check;

alter table public.velmere_customer_artifact_snapshots
  add constraint velmere_customer_artifact_surface_check
    check (surface in ('audit','shield','real_markets','lens')),
  add constraint velmere_customer_artifact_payload_kind_check
    check (payload_kind in ('audit_customer_report_v1','market_customer_report_v1','lens_report_v1')),
  add constraint velmere_customer_artifact_surface_payload_kind_check
    check (
      (surface = 'lens' and payload_kind = 'lens_report_v1')
      or
      (surface in ('shield','real_markets') and payload_kind = 'market_customer_report_v1')
      or
      (surface = 'audit' and payload_kind = 'audit_customer_report_v1')
    ),
  add constraint velmere_customer_artifact_account_hash_check
    check (account_id_hash ~ '^[a-f0-9]{64}$'),
  add constraint velmere_customer_artifact_digest_check
    check (
      artifact_digest ~ '^sha256:[a-f0-9]{64}$'
      and snapshot_digest ~ '^sha256:[a-f0-9]{64}$'
      and snapshot->>'snapshotId' = snapshot_id
      and snapshot->>'snapshotDigest' = snapshot_digest
      and snapshot->'canonicalArtifact'->>'artifactDigest' = artifact_digest
      and snapshot->>'accountIdHash' = account_id_hash
      and snapshot->>'surface' = surface
      and snapshot->>'payloadKind' = payload_kind
      and snapshot->>'reportId' = report_id
      and (snapshot->>'generatedAt')::timestamptz = generated_at
      and snapshot->>'schemaVersion' = 'pass4822-account-customer-artifact-snapshot-v1'
    );

alter table public.velmere_customer_artifact_snapshots enable row level security;
revoke all on table public.velmere_customer_artifact_snapshots from anon, authenticated;
grant select, insert on table public.velmere_customer_artifact_snapshots to service_role;

create index if not exists velmere_customer_artifact_account_idx
  on public.velmere_customer_artifact_snapshots(account_id, generated_at desc);
drop index if exists public.velmere_customer_artifact_digest_unique;
create unique index if not exists velmere_customer_artifact_owner_digest_unique
  on public.velmere_customer_artifact_snapshots(account_id_hash, artifact_digest);

create or replace function public.velmere_customer_artifact_immutable_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'customer_artifact_snapshot_immutable' using errcode = '23514';
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

drop trigger if exists velmere_customer_artifact_immutable on public.velmere_customer_artifact_snapshots;
create trigger velmere_customer_artifact_immutable
before insert or update on public.velmere_customer_artifact_snapshots
for each row execute function public.velmere_customer_artifact_immutable_guard();

revoke all on function public.velmere_customer_artifact_immutable_guard() from public;
grant execute on function public.velmere_customer_artifact_immutable_guard() to service_role;

comment on table public.velmere_customer_artifact_snapshots is
  'PASS4823 immutable account-bound canonical customer report snapshots. Browser-supplied reports are forbidden.';
-- PASS4823 CUSTOMER ARTIFACT SNAPSHOT END

-- PASS4824 ACCOUNT SESSION CENTRAL REVOCATION BEGIN
create table if not exists public.velmere_auth_session_families (
  family_id uuid primary key,
  subject_fingerprint text not null check (subject_fingerprint ~ '^[a-f0-9]{32}$'),
  generation integer not null default 1 check (generation between 1 and 1000000000),
  status text not null default 'active' check (status in ('active','revoked','compromised','expired')),
  expires_at timestamptz not null,
  last_rotated_at timestamptz not null default now(),
  compromised_at timestamptz,
  revoke_reason_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists velmere_auth_session_families_subject_status_idx
  on public.velmere_auth_session_families(subject_fingerprint, status);

alter table public.velmere_auth_session_families enable row level security;
revoke all on table public.velmere_auth_session_families from public, anon, authenticated;
grant select, insert, update on table public.velmere_auth_session_families to service_role;

create or replace function public.velmere_verify_auth_session_family(
  p_family_id uuid,
  p_subject_fingerprint text,
  p_expected_generation integer,
  p_expected_expires_at timestamptz
) returns table(
  status text,
  family_id uuid,
  subject_fingerprint text,
  generation integer,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    case
      when f.status <> 'active' then f.status
      when f.expires_at <= now() then 'expired'
      when f.subject_fingerprint is distinct from p_subject_fingerprint then 'subject_mismatch'
      when f.generation is distinct from p_expected_generation then 'generation_mismatch'
      when f.expires_at is distinct from p_expected_expires_at then 'expiry_mismatch'
      else 'active'
    end::text as status,
    f.family_id,
    f.subject_fingerprint,
    f.generation,
    f.expires_at
  from public.velmere_auth_session_families f
  where f.family_id = p_family_id;
$$;

revoke all on function public.velmere_verify_auth_session_family(uuid,text,integer,timestamptz) from public, anon, authenticated;
grant execute on function public.velmere_verify_auth_session_family(uuid,text,integer,timestamptz) to service_role;

create or replace function public.velmere_revoke_auth_session_subject(
  p_subject_fingerprint text,
  p_reason_code text
) returns table(status text, revoked_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed_count integer := 0;
  subject_known boolean := false;
begin
  if p_subject_fingerprint !~ '^[a-f0-9]{32}$' then
    raise exception 'invalid_auth_session_subject';
  end if;

  update public.velmere_auth_session_families f
     set status = 'revoked',
         revoke_reason_code = left(regexp_replace(coalesce(p_reason_code, ''), '[^a-zA-Z0-9_-]', '', 'g'), 40),
         updated_at = now()
   where f.subject_fingerprint = p_subject_fingerprint
     and f.status in ('active', 'compromised');
  get diagnostics changed_count = row_count;

  select exists(
    select 1
      from public.velmere_auth_session_families f
     where f.subject_fingerprint = p_subject_fingerprint
  ) into subject_known;

  return query select
    case when subject_known then 'revoked' else 'missing' end::text,
    changed_count;
end;
$$;

revoke all on function public.velmere_revoke_auth_session_subject(text,text) from public, anon, authenticated;
grant execute on function public.velmere_revoke_auth_session_subject(text,text) to service_role;
-- PASS4824 ACCOUNT SESSION CENTRAL REVOCATION END

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
    and surface in ('audit','shield','real_markets','lens')
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
     or coalesce(p_snapshot->>'surface', '') not in ('audit','shield','real_markets','lens')
     or coalesce(p_snapshot->>'payloadKind', '') not in ('audit_customer_report_v1','market_customer_report_v1','lens_report_v1')
     or not (
       (p_snapshot->>'surface' = 'lens' and p_snapshot->>'payloadKind' = 'lens_report_v1')
       or (p_snapshot->>'surface' in ('shield','real_markets') and p_snapshot->>'payloadKind' = 'market_customer_report_v1')
       or (p_snapshot->>'surface' = 'audit' and p_snapshot->>'payloadKind' = 'audit_customer_report_v1')
     )
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

-- P83 AUDIT EXACT ARTIFACT + ACCOUNT MESSAGE ATOMIC PUBLICATION BEGIN
-- One service-role RPC owns the transaction boundary. The existing exact-PDF
-- bundle function is invoked inside this transaction; any message validation or
-- insert failure rolls back a newly-created snapshot/blob pair.
create or replace function public.velmere_publish_audit_exact_artifact_v1(
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
set search_path = public, pg_temp
as $$
declare
  v_bundle jsonb;
  v_message public.velmere_audit_account_messages%rowtype;
  v_existing_count integer := 0;
  v_created_message boolean := false;
  v_expected_account_hash text;
  v_exact jsonb;
  v_created_at timestamptz;
  v_updated_at timestamptz;
  v_delivered_at timestamptz;
begin
  if p_account_id is null or length(p_account_id) < 1 or length(p_account_id) > 120
     or p_account_id like 'preview:%' then
    raise exception 'audit_exact_artifact_atomic_owner_required' using errcode = '23514';
  end if;
  if jsonb_typeof(p_snapshot) <> 'object'
     or jsonb_typeof(p_blob) <> 'object'
     or jsonb_typeof(p_audit_snapshot) <> 'object'
     or jsonb_typeof(p_message) <> 'object' then
    raise exception 'audit_exact_artifact_atomic_payload_invalid' using errcode = '23514';
  end if;

  if (select count(*) from jsonb_object_keys(p_message)) <> 29
     or exists (
       select 1 from jsonb_object_keys(p_message) as supplied(key)
       where supplied.key not in (
         'id','message_id','request_id','account_id','contact_email','locale','review_level',
         'project_name','contract_address','package_label','message_status','delivery_channel',
         'delivery_status','operator_status','operator_note','pdf_route','public_report_route',
         'admin_route','export_route','audit_queue_id','payment_evidence_refs','customer_safe_report',
         'canonical_customer_snapshot','canonical_customer_snapshot_digest','action_log','delivered_at',
         'message','created_at','updated_at'
       )
     )
     or exists (
       select 1 from unnest(array[
         'id','message_id','request_id','account_id','contact_email','locale','review_level',
         'project_name','contract_address','package_label','message_status','delivery_channel',
         'delivery_status','operator_status','operator_note','pdf_route','public_report_route',
         'admin_route','export_route','audit_queue_id','payment_evidence_refs','customer_safe_report',
         'canonical_customer_snapshot','canonical_customer_snapshot_digest','action_log','delivered_at',
         'message','created_at','updated_at'
       ]) as expected(key)
       where not (p_message ? expected.key)
     ) then
    raise exception 'audit_exact_artifact_atomic_message_shape_invalid' using errcode = '23514';
  end if;

  v_expected_account_hash := encode(digest('velmere-account-binding-v1:' || p_account_id, 'sha256'), 'hex');
  v_exact := p_audit_snapshot->'exactAccountArtifact';
  begin
    v_created_at := (p_message->>'created_at')::timestamptz;
    v_updated_at := (p_message->>'updated_at')::timestamptz;
    v_delivered_at := nullif(p_message->>'delivered_at', '')::timestamptz;
  exception when others then
    raise exception 'audit_exact_artifact_atomic_message_timestamp_invalid' using errcode = '23514';
  end;

  if coalesce(p_message->>'id', '') = '' or length(p_message->>'id') > 160
     or coalesce(p_message->>'message_id', '') = '' or length(p_message->>'message_id') > 160
     or coalesce(p_message->>'request_id', '') = '' or length(p_message->>'request_id') > 160
     or p_message->>'id' is distinct from p_message->>'message_id'
     or p_message->>'account_id' <> p_account_id
     or coalesce(p_message->>'locale', '') not in ('pl','en','de')
     or coalesce(p_message->>'package_label', '') = '' or length(p_message->>'package_label') > 240
     or coalesce(p_message->>'message_status', '') not in ('received','queued','analysis_queue','ready','needs_evidence')
     or coalesce(p_message->>'delivery_channel', '') not in ('account','account_and_email_pending')
     or coalesce(p_message->>'delivery_status', '') not in ('queued','delivered_to_account','analysis_queue','ready_for_download')
     or coalesce(p_message->>'operator_status', '') not in ('intake','analysis_queue','automated_analysis','needs_evidence','pdf_attached','customer_safe_ready','delivered','blocked_redaction')
     or jsonb_typeof(p_message->'payment_evidence_refs') <> 'array'
     or jsonb_typeof(p_message->'action_log') <> 'array'
     or jsonb_typeof(p_message->'customer_safe_report') not in ('object','null')
     or jsonb_typeof(p_message->'message') <> 'object'
     or p_message->'message' ? 'canonicalCustomerSnapshot'
     or p_message->'message'->>'id' is distinct from p_message->>'id'
     or p_message->'message'->>'requestId' is distinct from p_message->>'request_id'
     or p_message->'message'->>'accountId' is distinct from p_account_id
     or p_message->'message'->>'locale' is distinct from p_message->>'locale'
     or p_message->'message'->>'packageLabel' is distinct from p_message->>'package_label'
     or p_message->'message'->>'status' is distinct from p_message->>'message_status'
     or p_message->'message'->>'deliveryChannel' is distinct from p_message->>'delivery_channel'
     or p_message->'message'->>'deliveryStatus' is distinct from p_message->>'delivery_status'
     or p_message->'message'->>'operatorStatus' is distinct from p_message->>'operator_status'
     or p_message->'canonical_customer_snapshot' is distinct from p_audit_snapshot
     or p_message->>'canonical_customer_snapshot_digest' is distinct from p_audit_snapshot->>'snapshotDigest'
     or coalesce(p_audit_snapshot->>'schemaVersion', '') <> 'pass4821-audit-account-customer-snapshot-v1'
     or coalesce(p_audit_snapshot->>'accountIdHash', '') <> v_expected_account_hash
     or jsonb_typeof(v_exact) <> 'object'
     or (select count(*) from jsonb_object_keys(v_exact)) <> 9
     or coalesce(v_exact->>'schemaVersion', '') <> 'p80-audit-exact-account-artifact-binding-v1'
     or coalesce(v_exact->>'storage', '') <> 'exact_immutable_blob'
     or coalesce(v_exact->>'snapshotId', '') <> coalesce(p_snapshot->>'snapshotId', '')
     or coalesce(v_exact->>'snapshotDigest', '') <> coalesce(p_snapshot->>'snapshotDigest', '')
     or coalesce(v_exact->>'artifactDigest', '') <> coalesce(p_snapshot->'canonicalArtifact'->>'artifactDigest', '')
     or coalesce(v_exact->>'pdfBlobId', '') <> coalesce(p_blob->>'blobId', '')
     or coalesce(v_exact->>'pdfBlobRecordDigest', '') <> coalesce(p_blob->>'recordDigest', '')
     or coalesce(v_exact->>'pdfDigest', '') <> coalesce(p_blob->>'pdfDigest', '')
     or coalesce(v_exact->>'pdfByteLength', '') <> coalesce(p_blob->>'pdfByteLength', '')
     or coalesce(p_snapshot->>'surface', '') <> 'audit'
     or coalesce(p_snapshot->>'payloadKind', '') <> 'audit_customer_report_v1'
     or coalesce(p_snapshot->>'accountIdHash', '') <> v_expected_account_hash
     or coalesce(p_snapshot->>'reportId', '') <> coalesce(p_audit_snapshot->>'reportId', '')
     or coalesce(p_snapshot->>'generatedAt', '') <> coalesce(p_audit_snapshot->>'generatedAt', '')
     or coalesce(p_snapshot->>'payloadDigest', '') <> coalesce(p_audit_snapshot->>'customerReportDigest', '') then
    raise exception 'audit_exact_artifact_atomic_cross_binding_invalid' using errcode = '23514';
  end if;

  -- Serialize retries for the same owner/message/artifact before either durable
  -- object is touched. This is an additional race guard; unique constraints and
  -- immutable triggers remain the final authority.
  perform pg_advisory_xact_lock(hashtextextended(
    'p83:' || p_account_id || ':' || p_message->>'id' || ':' || p_snapshot->>'snapshotId',
    0
  ));

  select count(*) into v_existing_count
  from public.velmere_audit_account_messages
  where id = p_message->>'id' or message_id = p_message->>'message_id';
  if v_existing_count > 1 then
    raise exception 'audit_exact_artifact_atomic_message_identity_ambiguous' using errcode = '23514';
  end if;

  if v_existing_count = 1 then
    select * into v_message
    from public.velmere_audit_account_messages
    where id = p_message->>'id' or message_id = p_message->>'message_id'
    for update;

    if v_message.id is distinct from p_message->>'id'
       or v_message.message_id is distinct from p_message->>'message_id'
       or v_message.request_id is distinct from p_message->>'request_id'
       or v_message.account_id is distinct from p_account_id
       or v_message.contact_email is distinct from nullif(p_message->>'contact_email', '')
       or v_message.locale is distinct from p_message->>'locale'
       or v_message.review_level is distinct from nullif(p_message->>'review_level', '')
       or v_message.project_name is distinct from nullif(p_message->>'project_name', '')
       or v_message.contract_address is distinct from nullif(p_message->>'contract_address', '')
       or v_message.package_label is distinct from p_message->>'package_label'
       or v_message.message_status is distinct from p_message->>'message_status'
       or v_message.delivery_channel is distinct from p_message->>'delivery_channel'
       or v_message.delivery_status is distinct from p_message->>'delivery_status'
       or v_message.operator_status is distinct from p_message->>'operator_status'
       or v_message.operator_note is distinct from nullif(p_message->>'operator_note', '')
       or v_message.pdf_route is distinct from nullif(p_message->>'pdf_route', '')
       or v_message.public_report_route is distinct from nullif(p_message->>'public_report_route', '')
       or v_message.admin_route is distinct from nullif(p_message->>'admin_route', '')
       or v_message.export_route is distinct from nullif(p_message->>'export_route', '')
       or v_message.audit_queue_id is distinct from nullif(p_message->>'audit_queue_id', '')
       or v_message.payment_evidence_refs is distinct from p_message->'payment_evidence_refs'
       or v_message.customer_safe_report is distinct from p_message->'customer_safe_report'
       or v_message.canonical_customer_snapshot is null
       or v_message.canonical_customer_snapshot is distinct from p_audit_snapshot
       or v_message.canonical_customer_snapshot_digest is distinct from p_audit_snapshot->>'snapshotDigest'
       or v_message.action_log is distinct from p_message->'action_log'
       or v_message.delivered_at is distinct from v_delivered_at
       or v_message.message is distinct from p_message->'message'
       or v_message.created_at is distinct from v_created_at
       or v_message.updated_at is distinct from v_updated_at
       or v_message.exact_account_artifact_snapshot_id is distinct from p_snapshot->>'snapshotId' then
      raise exception 'audit_exact_artifact_atomic_preexisting_message_conflict' using errcode = '23514';
    end if;
  end if;

  -- The nested function participates in this same PostgreSQL transaction.
  -- Any later exception in this RPC rolls back a newly inserted bundle.
  v_bundle := public.velmere_store_customer_artifact_pdf_bundle_v1(
    p_account_id,
    p_snapshot,
    p_payload_canonical,
    p_blob,
    p_pdf_base64
  );

  if v_existing_count = 0 then
    insert into public.velmere_audit_account_messages (
      id, message_id, request_id, account_id, contact_email, locale, review_level,
      project_name, contract_address, package_label, message_status, delivery_channel,
      delivery_status, operator_status, operator_note, pdf_route, public_report_route,
      admin_route, export_route, audit_queue_id, payment_evidence_refs, customer_safe_report,
      canonical_customer_snapshot, canonical_customer_snapshot_digest, action_log, delivered_at,
      message, created_at, updated_at
    ) values (
      p_message->>'id', p_message->>'message_id', p_message->>'request_id', p_account_id,
      nullif(p_message->>'contact_email', ''), p_message->>'locale', nullif(p_message->>'review_level', ''),
      nullif(p_message->>'project_name', ''), nullif(p_message->>'contract_address', ''),
      p_message->>'package_label', p_message->>'message_status', p_message->>'delivery_channel',
      p_message->>'delivery_status', p_message->>'operator_status', nullif(p_message->>'operator_note', ''),
      nullif(p_message->>'pdf_route', ''), nullif(p_message->>'public_report_route', ''),
      nullif(p_message->>'admin_route', ''), nullif(p_message->>'export_route', ''),
      nullif(p_message->>'audit_queue_id', ''), p_message->'payment_evidence_refs',
      coalesce(p_message->'customer_safe_report', 'null'::jsonb), p_audit_snapshot,
      p_audit_snapshot->>'snapshotDigest', p_message->'action_log', v_delivered_at,
      p_message->'message', v_created_at, v_updated_at
    ) returning * into v_message;
    v_created_message := true;
  end if;

  if v_message.id is distinct from p_message->>'id'
     or v_message.message_id is distinct from p_message->>'message_id'
     or v_message.request_id is distinct from p_message->>'request_id'
     or v_message.account_id is distinct from p_account_id
     or v_message.contact_email is distinct from nullif(p_message->>'contact_email', '')
     or v_message.locale is distinct from p_message->>'locale'
     or v_message.review_level is distinct from nullif(p_message->>'review_level', '')
     or v_message.project_name is distinct from nullif(p_message->>'project_name', '')
     or v_message.contract_address is distinct from nullif(p_message->>'contract_address', '')
     or v_message.package_label is distinct from p_message->>'package_label'
     or v_message.message_status is distinct from p_message->>'message_status'
     or v_message.delivery_channel is distinct from p_message->>'delivery_channel'
     or v_message.delivery_status is distinct from p_message->>'delivery_status'
     or v_message.operator_status is distinct from p_message->>'operator_status'
     or v_message.operator_note is distinct from nullif(p_message->>'operator_note', '')
     or v_message.pdf_route is distinct from nullif(p_message->>'pdf_route', '')
     or v_message.public_report_route is distinct from nullif(p_message->>'public_report_route', '')
     or v_message.admin_route is distinct from nullif(p_message->>'admin_route', '')
     or v_message.export_route is distinct from nullif(p_message->>'export_route', '')
     or v_message.audit_queue_id is distinct from nullif(p_message->>'audit_queue_id', '')
     or v_message.payment_evidence_refs is distinct from p_message->'payment_evidence_refs'
     or v_message.customer_safe_report is distinct from p_message->'customer_safe_report'
     or v_message.canonical_customer_snapshot is distinct from p_audit_snapshot
     or v_message.canonical_customer_snapshot_digest is distinct from p_audit_snapshot->>'snapshotDigest'
     or v_message.action_log is distinct from p_message->'action_log'
     or v_message.delivered_at is distinct from v_delivered_at
     or v_message.message is distinct from p_message->'message'
     or v_message.created_at is distinct from v_created_at
     or v_message.updated_at is distinct from v_updated_at
     or v_message.exact_account_artifact_snapshot_id is distinct from p_snapshot->>'snapshotId' then
    raise exception 'audit_exact_artifact_atomic_commit_verification_failed' using errcode = '23514';
  end if;

  return jsonb_build_object(
    'schemaVersion', 'p83-audit-exact-artifact-atomic-publication-rpc-v1',
    'createdMessage', v_created_message,
    'bundle', v_bundle,
    'message', to_jsonb(v_message)
  );
end;
$$;

revoke all on function public.velmere_publish_audit_exact_artifact_v1(text, jsonb, text, jsonb, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_publish_audit_exact_artifact_v1(text, jsonb, text, jsonb, text, jsonb, jsonb)
  to service_role;

comment on function public.velmere_publish_audit_exact_artifact_v1(text, jsonb, text, jsonb, text, jsonb, jsonb) is
  'P83 service-role-only transaction: validates and stores an exact Audit snapshot/PDF bundle and its immutable account-message link atomically. No memory, client or two-write fallback; any failure rolls back the transaction.';
-- P83 AUDIT EXACT ARTIFACT + ACCOUNT MESSAGE ATOMIC PUBLICATION END

commit;
