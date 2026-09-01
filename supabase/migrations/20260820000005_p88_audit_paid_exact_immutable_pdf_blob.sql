begin;

-- P88 AUDIT PAID EXACT IMMUTABLE PDF BLOB BEGIN
-- New Pro/Advanced completions persist the first rendered customer PDF bytes in
-- the same transaction as the immutable snapshot and review completion. Legacy
-- snapshot-only rows remain history and fail closed; they are never backfilled
-- by rendering later bytes and calling them original.

create table if not exists public.velmere_audit_report_pdf_blobs (
  schema_version text not null default 'p88-audit-paid-exact-immutable-pdf-artifact-v1'
    check (schema_version = 'p88-audit-paid-exact-immutable-pdf-artifact-v1'),
  report_id text primary key references public.velmere_audit_report_snapshots(report_id) on delete restrict,
  case_ref text not null,
  request_id text not null,
  account_id_hash text not null check (account_id_hash ~ '^[a-f0-9]{64}$'),
  entitlement_id text not null,
  tier text not null check (tier in ('pro', 'advanced')),
  target_hash text not null check (target_hash ~ '^sha256:[a-f0-9]{64}$'),
  report_version_hash text not null check (report_version_hash ~ '^sha256:[a-f0-9]{64}$'),
  snapshot_digest text not null check (snapshot_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_receipt_root text not null check (source_receipt_root ~ '^sha256:[a-f0-9]{64}$'),
  pdf_digest text not null check (pdf_digest ~ '^sha256:[a-f0-9]{64}$'),
  pdf_byte_length integer not null check (pdf_byte_length between 1000 and 4194304),
  render_contract_id text not null
    check (render_contract_id = 'pass4808-deterministic-latin-extended-pagination-v1'),
  pdf_bytes bytea not null,
  created_at timestamptz not null,
  record_digest text not null check (record_digest ~ '^sha256:[a-f0-9]{64}$'),
  unique (case_ref, tier),
  check (octet_length(pdf_bytes) = pdf_byte_length),
  check (substring(pdf_bytes from 1 for 5) = decode('255044462d', 'hex')),
  check (pdf_digest = 'sha256:' || encode(digest(pdf_bytes, 'sha256'), 'hex'))
);

create index if not exists velmere_audit_report_pdf_blobs_entitlement_idx
  on public.velmere_audit_report_pdf_blobs(entitlement_id, case_ref, tier);

alter table public.velmere_audit_report_pdf_blobs enable row level security;
revoke all on public.velmere_audit_report_pdf_blobs from public, anon, authenticated;
grant select, insert on public.velmere_audit_report_pdf_blobs to service_role;

create or replace function public.velmere_validate_audit_report_pdf_blob_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_snapshot public.velmere_audit_report_snapshots%rowtype;
  v_created_at_text text;
  v_expected_record_digest text;
begin
  select * into v_snapshot
  from public.velmere_audit_report_snapshots
  where report_id = new.report_id
  for key share;

  if not found then
    raise exception 'audit_exact_pdf_snapshot_missing' using errcode = '23514';
  end if;

  if v_snapshot.case_ref <> new.case_ref
     or v_snapshot.request_id <> new.request_id
     or v_snapshot.account_id_hash <> new.account_id_hash
     or v_snapshot.entitlement_id <> new.entitlement_id
     or v_snapshot.tier <> new.tier
     or v_snapshot.target_hash <> new.target_hash
     or v_snapshot.report_version_hash <> new.report_version_hash
     or v_snapshot.snapshot_digest <> new.snapshot_digest
     or v_snapshot.source_receipt_root <> new.source_receipt_root
     or v_snapshot.pdf_digest <> new.pdf_digest
     or v_snapshot.created_at <> new.created_at then
    raise exception 'audit_exact_pdf_snapshot_cross_binding_mismatch' using errcode = '23514';
  end if;

  if v_snapshot.snapshot_json->>'requestId' <> new.request_id
     or v_snapshot.snapshot_json->>'tier' <> new.tier
     or v_snapshot.snapshot_json->>'digest' <> new.snapshot_digest
     or v_snapshot.snapshot_json->>'sourceReceiptRoot' <> new.source_receipt_root
     or v_snapshot.snapshot_json#>>'{renderContract,id}' <> new.render_contract_id
     or v_snapshot.snapshot_json#>>'{renderContract,pdfDigest}' <> new.pdf_digest
     or coalesce(v_snapshot.snapshot_json#>>'{renderContract,pdfByteLength}', '') !~ '^[0-9]+$'
     or (v_snapshot.snapshot_json#>>'{renderContract,pdfByteLength}')::integer <> new.pdf_byte_length then
    raise exception 'audit_exact_pdf_render_contract_cross_binding_mismatch' using errcode = '23514';
  end if;

  if octet_length(new.pdf_bytes) <> new.pdf_byte_length
     or substring(new.pdf_bytes from 1 for 5) <> decode('255044462d', 'hex')
     or convert_from(substring(new.pdf_bytes from greatest(1, octet_length(new.pdf_bytes) - 2048)), 'LATIN1') !~ '%%EOF[[:space:]]*$'
     or convert_from(new.pdf_bytes, 'LATIN1') ~ '/(JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA)([^A-Za-z0-9_]|$)'
     or new.pdf_digest <> 'sha256:' || encode(digest(new.pdf_bytes, 'sha256'), 'hex') then
    raise exception 'audit_exact_pdf_bytes_invalid' using errcode = '23514';
  end if;

  v_created_at_text := to_char(new.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_expected_record_digest := 'sha256:' || encode(digest(convert_to(concat_ws(E'\n',
    new.schema_version,
    new.report_id,
    new.case_ref,
    new.request_id,
    new.account_id_hash,
    new.entitlement_id,
    new.tier,
    new.target_hash,
    new.report_version_hash,
    new.snapshot_digest,
    new.source_receipt_root,
    new.pdf_digest,
    new.pdf_byte_length::text,
    new.render_contract_id,
    v_created_at_text
  ), 'UTF8'), 'sha256'), 'hex');
  if new.record_digest <> v_expected_record_digest then
    raise exception 'audit_exact_pdf_record_digest_invalid' using errcode = '23514';
  end if;

  return new;
end;
$$;
revoke all on function public.velmere_validate_audit_report_pdf_blob_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists p88_validate_audit_report_pdf_blob
  on public.velmere_audit_report_pdf_blobs;
create trigger p88_validate_audit_report_pdf_blob
before insert on public.velmere_audit_report_pdf_blobs
for each row execute function public.velmere_validate_audit_report_pdf_blob_v1();

create or replace function public.velmere_reject_audit_report_pdf_blob_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  raise exception 'audit_exact_pdf_blob_immutable' using errcode = '55000';
end;
$$;
revoke all on function public.velmere_reject_audit_report_pdf_blob_mutation_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists p88_reject_audit_report_pdf_blob_mutation
  on public.velmere_audit_report_pdf_blobs;
create trigger p88_reject_audit_report_pdf_blob_mutation
before update or delete on public.velmere_audit_report_pdf_blobs
for each row execute function public.velmere_reject_audit_report_pdf_blob_mutation_v1();

create or replace function public.velmere_complete_paid_audit_with_exact_pdf_v2(
  p_tier text,
  p_case_ref text,
  p_worker_principal text,
  p_lease_token text,
  p_reason_code text,
  p_report_id text,
  p_request_id text,
  p_account_id_hash text,
  p_entitlement_id text,
  p_target_hash text,
  p_report_version_hash text,
  p_snapshot_digest text,
  p_source_receipt_root text,
  p_pdf_digest text,
  p_pdf_byte_length integer,
  p_render_contract_id text,
  p_pdf_record_digest text,
  p_pdf_base64 text,
  p_snapshot_json jsonb,
  p_created_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_pdf_bytes bytea;
  v_snapshot public.velmere_audit_report_snapshots%rowtype;
  v_blob public.velmere_audit_report_pdf_blobs%rowtype;
  v_snapshot_found boolean := false;
  v_blob_found boolean := false;
  v_legacy_result jsonb;
  v_created_at_text text;
  v_expected_record_digest text;
begin
  if p_tier is null or p_tier not in ('pro', 'advanced')
     or coalesce(trim(p_case_ref), '') = ''
     or coalesce(trim(p_worker_principal), '') = ''
     or length(coalesce(p_lease_token, '')) < 24
     or coalesce(trim(p_reason_code), '') = ''
     or coalesce(trim(p_report_id), '') = ''
     or coalesce(trim(p_request_id), '') = ''
     or coalesce(trim(p_entitlement_id), '') = ''
     or p_account_id_hash is null or p_account_id_hash !~ '^[a-f0-9]{64}$'
     or p_target_hash is null or p_target_hash !~ '^sha256:[a-f0-9]{64}$'
     or p_report_version_hash is null or p_report_version_hash !~ '^sha256:[a-f0-9]{64}$'
     or p_snapshot_digest is null or p_snapshot_digest !~ '^sha256:[a-f0-9]{64}$'
     or p_source_receipt_root is null or p_source_receipt_root !~ '^sha256:[a-f0-9]{64}$'
     or p_pdf_digest is null or p_pdf_digest !~ '^sha256:[a-f0-9]{64}$'
     or p_pdf_record_digest is null or p_pdf_record_digest !~ '^sha256:[a-f0-9]{64}$'
     or p_pdf_byte_length is null or p_pdf_byte_length < 1000 or p_pdf_byte_length > 4194304
     or p_render_contract_id is null or p_render_contract_id <> 'pass4808-deterministic-latin-extended-pagination-v1'
     or p_snapshot_json is null or jsonb_typeof(p_snapshot_json) <> 'object'
     or coalesce(p_snapshot_json->>'requestId', '') <> p_request_id
     or coalesce(p_snapshot_json->>'tier', '') <> p_tier
     or coalesce(p_snapshot_json->>'digest', '') <> p_snapshot_digest
     or coalesce(p_snapshot_json->>'sourceReceiptRoot', '') <> p_source_receipt_root
     or coalesce(p_snapshot_json#>>'{renderContract,id}', '') <> p_render_contract_id
     or coalesce(p_snapshot_json#>>'{renderContract,pdfDigest}', '') <> p_pdf_digest
     or coalesce(p_snapshot_json#>>'{renderContract,pdfByteLength}', '') !~ '^[0-9]+$'
     or (p_snapshot_json#>>'{renderContract,pdfByteLength}')::integer <> p_pdf_byte_length
     or p_created_at is null
     or coalesce(p_snapshot_json->>'generatedAt', '') <> to_char(p_created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
     or p_pdf_base64 is null
     or length(p_pdf_base64) < 4
     or length(p_pdf_base64) % 4 <> 0
     or p_pdf_base64 !~ '^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$' then
    return jsonb_build_object('ok', false, 'error', p_tier || '_exact_pdf_completion_invalid_request');
  end if;

  begin
    v_pdf_bytes := decode(p_pdf_base64, 'base64');
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'audit_exact_pdf_base64_noncanonical');
  end;
  if replace(encode(v_pdf_bytes, 'base64'), E'\n', '') <> p_pdf_base64 then
    return jsonb_build_object('ok', false, 'error', 'audit_exact_pdf_base64_noncanonical');
  end if;
  if octet_length(v_pdf_bytes) <> p_pdf_byte_length
     or substring(v_pdf_bytes from 1 for 5) <> decode('255044462d', 'hex')
     or convert_from(substring(v_pdf_bytes from greatest(1, octet_length(v_pdf_bytes) - 2048)), 'LATIN1') !~ '%%EOF[[:space:]]*$'
     or convert_from(v_pdf_bytes, 'LATIN1') ~ '/(JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA)([^A-Za-z0-9_]|$)'
     or p_pdf_digest <> 'sha256:' || encode(digest(v_pdf_bytes, 'sha256'), 'hex') then
    return jsonb_build_object('ok', false, 'error', 'audit_exact_pdf_bytes_invalid');
  end if;

  v_created_at_text := to_char(p_created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_expected_record_digest := 'sha256:' || encode(digest(convert_to(concat_ws(E'\n',
    'p88-audit-paid-exact-immutable-pdf-artifact-v1',
    p_report_id,
    p_case_ref,
    p_request_id,
    p_account_id_hash,
    p_entitlement_id,
    p_tier,
    p_target_hash,
    p_report_version_hash,
    p_snapshot_digest,
    p_source_receipt_root,
    p_pdf_digest,
    p_pdf_byte_length::text,
    p_render_contract_id,
    v_created_at_text
  ), 'UTF8'), 'sha256'), 'hex');
  if p_pdf_record_digest <> v_expected_record_digest then
    return jsonb_build_object('ok', false, 'error', 'audit_exact_pdf_record_digest_invalid');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('p88-audit-exact-pdf:' || p_case_ref || ':' || p_tier, 0));

  select * into v_snapshot
  from public.velmere_audit_report_snapshots
  where case_ref = p_case_ref and tier = p_tier
  for update;
  v_snapshot_found := found;

  select * into v_blob
  from public.velmere_audit_report_pdf_blobs
  where report_id = p_report_id
  for update;
  v_blob_found := found;

  if v_snapshot_found and not v_blob_found then
    return jsonb_build_object('ok', false, 'error', 'audit_report_exact_pdf_bytes_withheld');
  end if;
  if v_blob_found and not v_snapshot_found then
    return jsonb_build_object('ok', false, 'error', 'audit_exact_pdf_orphan_integrity_failure');
  end if;

  if v_snapshot_found and (
       v_snapshot.report_id <> p_report_id
       or v_snapshot.request_id <> p_request_id
       or v_snapshot.account_id_hash <> p_account_id_hash
       or v_snapshot.entitlement_id <> p_entitlement_id
       or v_snapshot.target_hash <> p_target_hash
       or v_snapshot.report_version_hash <> p_report_version_hash
       or v_snapshot.snapshot_digest <> p_snapshot_digest
       or v_snapshot.source_receipt_root <> p_source_receipt_root
       or v_snapshot.pdf_digest <> p_pdf_digest
       or v_snapshot.snapshot_json <> p_snapshot_json
       or v_snapshot.created_at <> p_created_at
     ) then
    return jsonb_build_object('ok', false, 'error', 'audit_report_snapshot_immutable_conflict');
  end if;

  if v_blob_found and (
       v_blob.schema_version <> 'p88-audit-paid-exact-immutable-pdf-artifact-v1'
       or v_blob.case_ref <> p_case_ref
       or v_blob.request_id <> p_request_id
       or v_blob.account_id_hash <> p_account_id_hash
       or v_blob.entitlement_id <> p_entitlement_id
       or v_blob.tier <> p_tier
       or v_blob.target_hash <> p_target_hash
       or v_blob.report_version_hash <> p_report_version_hash
       or v_blob.snapshot_digest <> p_snapshot_digest
       or v_blob.source_receipt_root <> p_source_receipt_root
       or v_blob.pdf_digest <> p_pdf_digest
       or v_blob.pdf_byte_length <> p_pdf_byte_length
       or v_blob.render_contract_id <> p_render_contract_id
       or v_blob.record_digest <> p_pdf_record_digest
       or v_blob.created_at <> p_created_at
       or v_blob.pdf_bytes <> v_pdf_bytes
     ) then
    return jsonb_build_object('ok', false, 'error', 'audit_exact_pdf_blob_immutable_conflict');
  end if;

  if p_tier = 'advanced' then
    v_legacy_result := public.velmere_complete_advanced_audit_with_snapshot(
      p_case_ref,p_worker_principal,p_lease_token,p_reason_code,p_report_id,p_request_id,
      p_account_id_hash,p_entitlement_id,p_target_hash,p_report_version_hash,p_snapshot_digest,
      p_source_receipt_root,p_pdf_digest,p_snapshot_json,p_created_at
    );
  else
    v_legacy_result := public.velmere_complete_pro_audit_with_snapshot(
      p_case_ref,p_worker_principal,p_lease_token,p_reason_code,p_report_id,p_request_id,
      p_account_id_hash,p_entitlement_id,p_target_hash,p_report_version_hash,p_snapshot_digest,
      p_source_receipt_root,p_pdf_digest,p_snapshot_json,p_created_at
    );
  end if;
  if coalesce((v_legacy_result->>'ok')::boolean, false) is not true then
    return v_legacy_result;
  end if;

  if not v_blob_found then
    insert into public.velmere_audit_report_pdf_blobs(
      schema_version, report_id, case_ref, request_id, account_id_hash, entitlement_id, tier,
      target_hash, report_version_hash, snapshot_digest, source_receipt_root, pdf_digest,
      pdf_byte_length, render_contract_id, pdf_bytes, created_at, record_digest
    ) values (
      'p88-audit-paid-exact-immutable-pdf-artifact-v1', p_report_id, p_case_ref, p_request_id,
      p_account_id_hash, p_entitlement_id, p_tier, p_target_hash, p_report_version_hash,
      p_snapshot_digest, p_source_receipt_root, p_pdf_digest, p_pdf_byte_length,
      p_render_contract_id, v_pdf_bytes, p_created_at, p_pdf_record_digest
    );
  end if;

  select * into strict v_blob
  from public.velmere_audit_report_pdf_blobs
  where report_id = p_report_id;
  if v_blob.pdf_bytes <> v_pdf_bytes
     or v_blob.pdf_digest <> p_pdf_digest
     or v_blob.pdf_byte_length <> p_pdf_byte_length
     or v_blob.record_digest <> p_pdf_record_digest then
    raise exception 'audit_exact_pdf_post_insert_verification_failed' using errcode = '23514';
  end if;

  return v_legacy_result || jsonb_build_object(
    'pdfByteLength', p_pdf_byte_length,
    'renderContractId', p_render_contract_id,
    'pdfRecordDigest', p_pdf_record_digest,
    'exactPdfStorage', 'render_once_immutable_blob'
  );
end;
$$;
revoke all on function public.velmere_complete_paid_audit_with_exact_pdf_v2(
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,jsonb,timestamptz
) from public, anon, authenticated, service_role;

create or replace function public.velmere_complete_pro_audit_with_exact_pdf_v2(
  p_case_ref text,
  p_worker_principal text,
  p_lease_token text,
  p_reason_code text,
  p_report_id text,
  p_request_id text,
  p_account_id_hash text,
  p_entitlement_id text,
  p_target_hash text,
  p_report_version_hash text,
  p_snapshot_digest text,
  p_source_receipt_root text,
  p_pdf_digest text,
  p_pdf_byte_length integer,
  p_render_contract_id text,
  p_pdf_record_digest text,
  p_pdf_base64 text,
  p_snapshot_json jsonb,
  p_created_at timestamptz
) returns jsonb
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.velmere_complete_paid_audit_with_exact_pdf_v2(
    'pro',p_case_ref,p_worker_principal,p_lease_token,p_reason_code,p_report_id,p_request_id,
    p_account_id_hash,p_entitlement_id,p_target_hash,p_report_version_hash,p_snapshot_digest,
    p_source_receipt_root,p_pdf_digest,p_pdf_byte_length,p_render_contract_id,p_pdf_record_digest,
    p_pdf_base64,p_snapshot_json,p_created_at
  );
$$;
revoke all on function public.velmere_complete_pro_audit_with_exact_pdf_v2(
  text,text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,jsonb,timestamptz
) from public, anon, authenticated;
grant execute on function public.velmere_complete_pro_audit_with_exact_pdf_v2(
  text,text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,jsonb,timestamptz
) to service_role;

create or replace function public.velmere_complete_advanced_audit_with_exact_pdf_v2(
  p_case_ref text,
  p_worker_principal text,
  p_lease_token text,
  p_reason_code text,
  p_report_id text,
  p_request_id text,
  p_account_id_hash text,
  p_entitlement_id text,
  p_target_hash text,
  p_report_version_hash text,
  p_snapshot_digest text,
  p_source_receipt_root text,
  p_pdf_digest text,
  p_pdf_byte_length integer,
  p_render_contract_id text,
  p_pdf_record_digest text,
  p_pdf_base64 text,
  p_snapshot_json jsonb,
  p_created_at timestamptz
) returns jsonb
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.velmere_complete_paid_audit_with_exact_pdf_v2(
    'advanced',p_case_ref,p_worker_principal,p_lease_token,p_reason_code,p_report_id,p_request_id,
    p_account_id_hash,p_entitlement_id,p_target_hash,p_report_version_hash,p_snapshot_digest,
    p_source_receipt_root,p_pdf_digest,p_pdf_byte_length,p_render_contract_id,p_pdf_record_digest,
    p_pdf_base64,p_snapshot_json,p_created_at
  );
$$;
revoke all on function public.velmere_complete_advanced_audit_with_exact_pdf_v2(
  text,text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,jsonb,timestamptz
) from public, anon, authenticated;
grant execute on function public.velmere_complete_advanced_audit_with_exact_pdf_v2(
  text,text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,jsonb,timestamptz
) to service_role;

comment on table public.velmere_audit_report_pdf_blobs is
  'P88 immutable first-render Audit Pro/Advanced PDF bytes. Snapshot-only historical rows are deliberately not backfilled.';
comment on function public.velmere_complete_pro_audit_with_exact_pdf_v2(
  text,text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,jsonb,timestamptz
) is 'P88 Pro atomic completion: active lease, immutable snapshot, exact first-render PDF bytes and completed review in one transaction.';
comment on function public.velmere_complete_advanced_audit_with_exact_pdf_v2(
  text,text,text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,jsonb,timestamptz
) is 'P88 Advanced atomic completion: active lease, immutable snapshot, exact first-render PDF bytes and completed review in one transaction.';

-- P88 AUDIT PAID EXACT IMMUTABLE PDF BLOB END

commit;
