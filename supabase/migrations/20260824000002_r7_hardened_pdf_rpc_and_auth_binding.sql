create or replace function public.velmere_store_customer_artifact_pdf_bundle_v1(
  p_account_id text,
  p_snapshot jsonb,
  p_payload_canonical text,
  p_blob jsonb,
  p_pdf_base64 text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
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
  v_payload_digest_expected := 'sha256:' || encode(extensions.digest(p_payload_canonical, 'sha256'), 'hex');

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
  v_artifact_digest_expected := 'sha256:' || encode(extensions.digest(v_artifact_canonical, 'sha256'), 'hex');
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
  v_snapshot_digest_expected := 'sha256:' || encode(extensions.digest(v_snapshot_canonical, 'sha256'), 'hex');

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
  v_record_digest_expected := 'sha256:' || encode(extensions.digest(v_record_canonical, 'sha256'), 'hex');

  perform pg_advisory_xact_lock(hashtext(v_snapshot_id));

  if coalesce(p_snapshot->>'schemaVersion', '') <> 'pass4822-account-customer-artifact-snapshot-v1'
     or coalesce(p_snapshot->>'pdfStorage', '') <> 'exact_immutable_blob'
     or (select count(*) from jsonb_object_keys(p_snapshot)) <> 17
     or v_snapshot_digest_expected is null
     or coalesce(p_snapshot->>'snapshotDigest', '') <> v_snapshot_digest_expected
     or coalesce(p_snapshot->>'payloadDigest', '') <> v_payload_digest_expected
     or coalesce(v_account_id_hash, '') !~ '^[a-f0-9]{64}$'
     or v_account_id_hash <> encode(extensions.digest('velmere-account-binding-v1:' || p_account_id, 'sha256'), 'hex')
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
     or v_pdf_digest <> 'sha256:' || encode(extensions.digest(v_pdf_bytes, 'sha256'), 'hex')
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

create or replace function public.velmere_r7_bind_current_auth_account_v1(
  p_run_id text,
  p_label text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_account_id text;
  v_hash text;
begin
  if v_uid is null then
    raise exception 'authenticated_user_required' using errcode = '42501';
  end if;
  if p_run_id is null or p_run_id !~ '^[A-Za-z0-9._:-]{4,120}$'
     or p_label not in ('USER_A','USER_B') then
    raise exception 'staging_binding_input_invalid' using errcode = '22023';
  end if;
  v_account_id := 'supabase:' || v_uid::text;
  v_hash := encode(extensions.digest('velmere-account-binding-v1:' || v_account_id, 'sha256'), 'hex');
  insert into public.velmere_account_supabase_subject_bindings(
    account_id, supabase_subject, request_id, operator_fingerprint, created_at, updated_at
  ) values (
    v_account_id, v_uid, p_run_id || ':' || p_label,
    'sha256:' || encode(extensions.digest('r7-owner-controlled-staging:' || p_run_id || ':' || p_label, 'sha256'), 'hex'),
    now(), now()
  )
  on conflict (supabase_subject) do update set
    request_id = excluded.request_id,
    operator_fingerprint = excluded.operator_fingerprint,
    updated_at = now()
  where public.velmere_account_supabase_subject_bindings.account_id = excluded.account_id;
  if not found then
    raise exception 'staging_binding_conflict' using errcode = '23505';
  end if;
  return jsonb_build_object(
    'schemaVersion','velmere.r7.auth-account-self-binding.v1',
    'runId',p_run_id,
    'label',p_label,
    'userId',v_uid,
    'accountId',v_account_id,
    'accountIdHash',v_hash
  );
end;
$$;
revoke all on function public.velmere_r7_bind_current_auth_account_v1(text,text) from public, anon, service_role;
grant execute on function public.velmere_r7_bind_current_auth_account_v1(text,text) to authenticated;

create or replace function velmere_private.issue_r7_jwt(
  p_context text,
  p_user uuid,
  p_session uuid,
  p_ttl integer default 3600
) returns text
language plpgsql
security definer
set search_path = pg_catalog, velmere_private, extensions, auth
as $$
declare
  h text; c jsonb; p text; i text; s text; t text; k bytea;
  now_epoch bigint := extract(epoch from now())::bigint;
begin
  select secret into k from velmere_private.r7_jwt_signing_key where id;
  if not exists(select 1 from auth.sessions where id=p_session and user_id=p_user and (not_after is null or not_after>now())) then
    raise exception 'session_invalid';
  end if;
  h := velmere_private.b64url(convert_to('{"alg":"HS256","typ":"JWT"}','utf8'));
  c := jsonb_build_object(
    'iss','velmere-r7-staging','aud','authenticated','role','authenticated',
    'sub',p_user::text,'session_id',p_session::text,'aal','aal1',
    'iat',now_epoch,'exp',now_epoch+p_ttl,'jti',extensions.gen_random_uuid()::text
  );
  p := velmere_private.b64url(convert_to(c::text,'utf8'));
  i := h || '.' || p;
  s := velmere_private.b64url(extensions.hmac(convert_to(i,'utf8'),k,'sha256'));
  t := i || '.' || s;
  insert into velmere_private.r7_jwt_contexts values(
    p_context,p_user,p_session,t,c,
    'sha256:'||encode(extensions.digest(t,'sha256'),'hex'),now(),now()+make_interval(secs=>p_ttl)
  ) on conflict(context_name) do update set
    user_id=excluded.user_id,session_id=excluded.session_id,token=excluded.token,
    claims=excluded.claims,token_sha256=excluded.token_sha256,
    issued_at=excluded.issued_at,expires_at=excluded.expires_at;
  return 'issued';
end;
$$;

create or replace function velmere_private.verified_r7_claims(p_context text) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, velmere_private, extensions, auth
as $$
declare
  r velmere_private.r7_jwt_contexts%rowtype; k bytea; parts text[]; expected text;
begin
  select * into r from velmere_private.r7_jwt_contexts where context_name=p_context;
  if not found or r.expires_at<=now() then raise exception 'jwt_context_missing_or_expired'; end if;
  select secret into k from velmere_private.r7_jwt_signing_key where id;
  parts := string_to_array(r.token,'.');
  if array_length(parts,1)<>3 then raise exception 'jwt_shape_invalid'; end if;
  expected := velmere_private.b64url(extensions.hmac(convert_to(parts[1]||'.'||parts[2],'utf8'),k,'sha256'));
  if expected<>parts[3] or r.token_sha256<>'sha256:'||encode(extensions.digest(r.token,'sha256'),'hex') then
    raise exception 'jwt_signature_invalid';
  end if;
  if (r.claims->>'exp')::bigint<=extract(epoch from now())::bigint then raise exception 'jwt_expired'; end if;
  if not exists(select 1 from auth.sessions where id=r.session_id and user_id=r.user_id and (not_after is null or not_after>now())) then
    raise exception 'jwt_session_invalid';
  end if;
  return r.claims;
end;
$$;
revoke all on function velmere_private.issue_r7_jwt(text,uuid,uuid,integer) from public,anon,authenticated,service_role;
revoke all on function velmere_private.verified_r7_claims(text) from public,anon,authenticated,service_role;

