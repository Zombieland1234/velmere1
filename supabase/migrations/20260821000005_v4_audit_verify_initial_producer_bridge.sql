begin;

-- V4 Audit -> Verify producer bridge. Audit completion remains its own durable
-- truth. Verify becomes active only after this transaction has independently
-- re-read and cross-bound the exact immutable Audit snapshot/PDF, current
-- deployment observation, canonical chain+contract and (for a public mode) the
-- latest authenticated owner consent. A failed bridge never creates a fallback
-- identity, event or green projection.

create table if not exists public.velmere_audit_verify_visibility_consent_events (
  consent_digest text primary key check (consent_digest ~ '^[a-f0-9]{64}$'),
  case_ref text not null references public.velmere_audit_intake_cases(case_ref) on delete restrict,
  consent_sequence bigint not null check (consent_sequence >= 1),
  previous_consent_digest text
    references public.velmere_audit_verify_visibility_consent_events(consent_digest) on delete restrict,
  report_id text not null,
  snapshot_digest text not null check (snapshot_digest ~ '^sha256:[a-f0-9]{64}$'),
  account_id_hash text not null check (account_id_hash ~ '^[a-f0-9]{64}$'),
  visibility text not null check (visibility in (
    'PUBLIC', 'PUBLIC_SUMMARY_PRIVATE_REPORT', 'PRIVATE'
  )),
  consented_at timestamptz not null default clock_timestamp(),
  unique (case_ref, consent_sequence),
  check (
    (consent_sequence = 1 and previous_consent_digest is null)
    or (consent_sequence > 1 and previous_consent_digest is not null)
  )
);

create table if not exists public.velmere_audit_verify_publication_bridges (
  case_ref text primary key references public.velmere_audit_intake_cases(case_ref) on delete restrict,
  report_id text not null unique,
  snapshot_digest text not null unique check (snapshot_digest ~ '^sha256:[a-f0-9]{64}$'),
  artifact_binding_digest text not null unique check (artifact_binding_digest ~ '^[a-f0-9]{64}$'),
  public_proof_id text not null unique
    references public.velmere_verify_publication_identities(public_proof_id) on delete restrict,
  initial_event_digest text not null unique
    references public.velmere_verify_publication_events(event_digest) on delete restrict,
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists velmere_audit_verify_consent_latest_idx
  on public.velmere_audit_verify_visibility_consent_events(case_ref, consent_sequence desc);

alter table public.velmere_audit_verify_visibility_consent_events enable row level security;
alter table public.velmere_audit_verify_publication_bridges enable row level security;
revoke all on table public.velmere_audit_verify_visibility_consent_events
  from public, anon, authenticated, service_role;
revoke all on table public.velmere_audit_verify_publication_bridges
  from public, anon, authenticated, service_role;

create or replace function public.velmere_reject_audit_verify_bridge_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  -- Same immutable boundary as verify_publication_event_immutable: append a
  -- consent/event or create a new audit report; never rewrite source truth.
  raise exception 'audit_verify_bridge_immutable' using errcode = '55000';
end;
$$;

revoke all on function public.velmere_reject_audit_verify_bridge_mutation_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists reject_audit_verify_consent_mutation
  on public.velmere_audit_verify_visibility_consent_events;
create trigger reject_audit_verify_consent_mutation
before update or delete on public.velmere_audit_verify_visibility_consent_events
for each row execute function public.velmere_reject_audit_verify_bridge_mutation_v1();

drop trigger if exists reject_audit_verify_publication_bridge_mutation
  on public.velmere_audit_verify_publication_bridges;
create trigger reject_audit_verify_publication_bridge_mutation
before update or delete on public.velmere_audit_verify_publication_bridges
for each row execute function public.velmere_reject_audit_verify_bridge_mutation_v1();

create or replace function public.velmere_resolve_completed_audit_verify_binding_v1(
  p_case_ref text
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_review public.velmere_audit_review_orchestration%rowtype;
  v_snapshot jsonb;
  v_report_id text;
  v_request_id text;
  v_account_id_hash text;
  v_target_hash text;
  v_report_version_hash text;
  v_snapshot_digest text;
  v_source_receipt_root text;
  v_pdf_digest text;
  v_pdf_byte_length integer;
  v_render_contract_id text;
  v_pdf_record_digest text;
  v_pdf_bytes bytea;
  v_created_at timestamptz;
  v_release jsonb;
  v_release_canonical text;
  v_expected_release_binding_digest text;
  v_deployment_line text;
  v_deployment_line_count integer;
  v_deployment_match text[];
  v_deployment_identity_digest text;
  v_checked_at timestamptz;
  v_risk_score numeric;
  v_risk_label text;
  v_risk_status text;
  v_artifact_binding_digest text;
begin
  if p_case_ref is null
     or length(p_case_ref) not between 8 and 160
     or p_case_ref !~ '^[A-Za-z0-9:_-]+$' then
    raise exception 'audit_verify_case_ref_invalid' using errcode = '22023';
  end if;

  select * into v_case
  from public.velmere_audit_intake_cases
  where case_ref = p_case_ref;
  if not found then
    raise exception 'audit_verify_completed_audit_missing' using errcode = 'P0002';
  end if;

  select * into v_review
  from public.velmere_audit_review_orchestration
  where case_id = v_case.case_id;
  if not found or v_review.review_state <> 'completed'
     or v_review.completed_at is null or v_review.tier <> v_case.tier then
    raise exception 'audit_verify_completed_audit_required' using errcode = '23514';
  end if;

  if v_case.account_id is null
     or v_case.target_kind <> 'contract'
     or v_case.target_chain_id is null
     or v_case.target_chain_id !~ '^[1-9][0-9]{0,19}$'
     or v_case.target_chain_name is null
     or v_case.target_private !~* '^0x[a-f0-9]{40}$'
     or v_case.target_hash <> 'sha256:' || encode(digest(
       'velmere-audit-contract-target-v1:' || v_case.target_chain_id || ':' || lower(v_case.target_private),
       'sha256'
     ), 'hex') then
    raise exception 'audit_verify_canonical_chain_contract_binding_required' using errcode = '23514';
  end if;

  if v_case.tier = 'basic' then
    select
      a.snapshot_json, a.report_id, a.request_id, a.account_id_hash,
      a.target_hash, a.report_version_hash, a.snapshot_digest,
      a.source_receipt_root, a.pdf_digest, a.pdf_byte_length,
      a.render_contract_id, a.record_digest, a.pdf_bytes, a.created_at
    into
      v_snapshot, v_report_id, v_request_id, v_account_id_hash,
      v_target_hash, v_report_version_hash, v_snapshot_digest,
      v_source_receipt_root, v_pdf_digest, v_pdf_byte_length,
      v_render_contract_id, v_pdf_record_digest, v_pdf_bytes, v_created_at
    from public.velmere_audit_basic_report_artifacts a
    where a.case_ref = p_case_ref;
  else
    select
      s.snapshot_json, s.report_id, s.request_id, s.account_id_hash,
      s.target_hash, s.report_version_hash, s.snapshot_digest,
      s.source_receipt_root, b.pdf_digest, b.pdf_byte_length,
      b.render_contract_id, b.record_digest, b.pdf_bytes, s.created_at
    into
      v_snapshot, v_report_id, v_request_id, v_account_id_hash,
      v_target_hash, v_report_version_hash, v_snapshot_digest,
      v_source_receipt_root, v_pdf_digest, v_pdf_byte_length,
      v_render_contract_id, v_pdf_record_digest, v_pdf_bytes, v_created_at
    from public.velmere_audit_report_snapshots s
    join public.velmere_audit_report_pdf_blobs b
      on b.report_id = s.report_id
     and b.case_ref = s.case_ref
     and b.request_id = s.request_id
     and b.account_id_hash = s.account_id_hash
     and b.entitlement_id = s.entitlement_id
     and b.tier = s.tier
     and b.target_hash = s.target_hash
     and b.report_version_hash = s.report_version_hash
     and b.snapshot_digest = s.snapshot_digest
     and b.source_receipt_root = s.source_receipt_root
     and b.pdf_digest = s.pdf_digest
     and b.created_at = s.created_at
    where s.case_ref = p_case_ref and s.tier = v_case.tier;
  end if;

  if v_snapshot is null
     or jsonb_typeof(v_snapshot) <> 'object'
     or v_report_id is null
     or v_request_id <> v_case.request_id
     or v_account_id_hash <> encode(digest(
       'velmere-account-binding-v1:' || v_case.account_id,
       'sha256'
     ), 'hex')
     or v_target_hash <> v_case.target_hash
     or v_report_version_hash !~ '^sha256:[a-f0-9]{64}$'
     or v_snapshot_digest !~ '^sha256:[a-f0-9]{64}$'
     or v_source_receipt_root !~ '^sha256:[a-f0-9]{64}$'
     or v_pdf_digest !~ '^sha256:[a-f0-9]{64}$'
     or v_pdf_byte_length not between 1000 and 4194304
     or v_render_contract_id <> 'pass4808-deterministic-latin-extended-pagination-v1'
     or v_pdf_record_digest !~ '^sha256:[a-f0-9]{64}$'
     or octet_length(v_pdf_bytes) <> v_pdf_byte_length
     or substring(v_pdf_bytes from 1 for 5) <> decode('255044462d', 'hex')
     or encode(substring(v_pdf_bytes from greatest(1, octet_length(v_pdf_bytes) - 2048)), 'escape') !~ '%%EOF[[:space:]]*$'
     or encode(v_pdf_bytes, 'escape') ~ '/(JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA)([^A-Za-z0-9_]|$)'
     or v_pdf_digest <> 'sha256:' || encode(digest(v_pdf_bytes, 'sha256'), 'hex')
     or v_snapshot->>'schemaVersion' <> 'velmere.audit-pdf-snapshot.v1'
     or v_snapshot->>'requestId' <> v_request_id
     or v_snapshot->>'tier' <> v_case.tier
     or lower(v_snapshot->>'target') <> lower(v_case.target_private)
     or v_snapshot->>'chain' <> v_case.target_chain_name
     or v_snapshot->>'digest' <> v_snapshot_digest
     or v_snapshot->>'sourceReceiptRoot' <> v_source_receipt_root
     or v_snapshot#>>'{evidenceRoots,aggregateRoot}' <> v_source_receipt_root
     or v_snapshot->>'canonicalEvidenceDigest' !~ '^sha256:[a-f0-9]{64}$'
     or length(coalesce(v_snapshot->>'canonicalEvidencePacketId', '')) not between 8 and 180
     or v_snapshot#>>'{renderContract,id}' <> v_render_contract_id
     or v_snapshot#>>'{renderContract,pdfDigest}' <> v_pdf_digest
     or coalesce(v_snapshot#>>'{renderContract,pdfByteLength}', '') !~ '^[0-9]{4,7}$'
     or (v_snapshot#>>'{renderContract,pdfByteLength}')::integer <> v_pdf_byte_length
     or v_snapshot#>>'{customerEligibility,commercialUseReady}' <> 'true'
     or (v_case.tier = 'pro' and v_snapshot#>>'{evidenceReadiness,proReady}' <> 'true')
     or (v_case.tier = 'advanced' and v_snapshot#>>'{evidenceReadiness,advancedReady}' <> 'true') then
    raise exception 'audit_verify_exact_customer_artifact_required' using errcode = '23514';
  end if;

  v_release := v_snapshot->'auditExecutionRelease';
  if jsonb_typeof(v_release) <> 'object'
     or v_release->>'schemaVersion' <> 'velmere.audit-execution-release-gate.v1'
     or v_release->>'decision' <> 'ALLOW_COMPLETE'
     or v_release->>'completionAllowed' <> 'true'
     or v_release->>'persistAllowed' <> 'true'
     or v_release->>'expectedTier' <> v_case.tier
     or v_release->>'caseRef' <> p_case_ref
     or v_release->>'packetDigest' !~ '^sha256:[a-f0-9]{64}$'
     or v_release->>'currentDeploymentReceiptDigest' !~ '^sha256:[a-f0-9]{64}$'
     or v_release->>'matchedInputDigest' !~ '^sha256:[a-f0-9]{64}$'
     or v_release->>'releaseBindingDigest' !~ '^sha256:[a-f0-9]{64}$' then
    raise exception 'audit_verify_exact_release_packet_required' using errcode = '23514';
  end if;

  -- TypeScript canonicalJson sorts object keys. Rebuild that exact compact
  -- payload so the release binding is independently verified in PostgreSQL.
  v_release_canonical := '{'
    || '"blockers":[],'
    || '"caseRef":' || to_jsonb(p_case_ref)::text || ','
    || '"completionAllowed":true,'
    || '"currentDeploymentReceiptDigest":' || to_jsonb(v_release->>'currentDeploymentReceiptDigest')::text || ','
    || '"expectedTier":' || to_jsonb(v_case.tier)::text || ','
    || '"matchedInputDigest":' || to_jsonb(v_release->>'matchedInputDigest')::text || ','
    || '"packetDigest":' || to_jsonb(v_release->>'packetDigest')::text || ','
    || '"schemaVersion":"velmere.audit-execution-release-gate.v1"}';
  v_expected_release_binding_digest := 'sha256:' || encode(digest(
    convert_to(v_release_canonical, 'UTF8'),
    'sha256'
  ), 'hex');
  if v_release->>'releaseBindingDigest' <> v_expected_release_binding_digest then
    raise exception 'audit_verify_release_binding_digest_invalid' using errcode = '23514';
  end if;

  if jsonb_typeof(v_snapshot->'lines') <> 'array' then
    raise exception 'audit_verify_current_deployment_line_invalid' using errcode = '23514';
  end if;
  select count(*), min(line)
  into v_deployment_line_count, v_deployment_line
  from jsonb_array_elements_text(v_snapshot->'lines') as lines(line)
  where line ~ '^currentDeployment=0x[a-fA-F0-9]{40}; snapshotBlock=[0-9]+; blockHash=0x[a-fA-F0-9]{64}; stateRoot=0x[a-fA-F0-9]{64}; runtimeSha256=sha256:[a-f0-9]{64}; proxy=EIP_1167_COMPATIBLE_MINIMAL_PROXY; implementation=0x[a-fA-F0-9]{40}; implementationSha256=sha256:[a-f0-9]{64}; trustedForwarder=0x[a-fA-F0-9]{40}; trustedForwarderState=(ACTIVE|INACTIVE); negativeControl=INACTIVE; currentExploitabilityProven=false; independentReplay=false$';
  if v_deployment_line_count <> 1 then
    raise exception 'audit_verify_current_deployment_line_invalid' using errcode = '23514';
  end if;
  v_deployment_match := regexp_match(
    v_deployment_line,
    '^currentDeployment=(0x[a-fA-F0-9]{40}); snapshotBlock=([0-9]+); blockHash=(0x[a-fA-F0-9]{64}); stateRoot=0x[a-fA-F0-9]{64}; runtimeSha256=(sha256:[a-f0-9]{64}); proxy=(EIP_1167_COMPATIBLE_MINIMAL_PROXY); implementation=(0x[a-fA-F0-9]{40}); implementationSha256=(sha256:[a-f0-9]{64}); trustedForwarder=(0x[a-fA-F0-9]{40}); trustedForwarderState=(ACTIVE|INACTIVE); negativeControl=(INACTIVE); currentExploitabilityProven=false; independentReplay=false$'
  );
  if v_deployment_match is null
     or lower(v_deployment_match[1]) <> lower(v_case.target_private)
     or v_deployment_match[2] !~ '^(0|[1-9][0-9]{0,77})$'
     or lower(v_deployment_match[3]) !~ '^0x[a-f0-9]{64}$' then
    raise exception 'audit_verify_current_deployment_line_invalid' using errcode = '23514';
  end if;

  -- The receipt digest remains provenance. Initial publication and every
  -- monitor use this one domain-separated canonical deployment identity.
  v_deployment_identity_digest := public.velmere_verify_canonical_deployment_identity_digest_v1(
    v_case.target_chain_id,
    lower(v_deployment_match[1]),
    lower(v_deployment_match[4]),
    v_deployment_match[5],
    lower(v_deployment_match[6]),
    lower(v_deployment_match[7]),
    lower(v_deployment_match[8]),
    v_deployment_match[9],
    v_deployment_match[10]
  );

  begin
    v_checked_at := (v_snapshot->>'generatedAt')::timestamptz;
  exception when others then
    raise exception 'audit_verify_checked_at_invalid' using errcode = '22007';
  end;
  -- Preserve the immutable completed-artifact binding for exact replay. The
  -- Verify append RPC independently enforces freshness for INITIAL; an older
  -- replay therefore resolves to historical/WITHHELD instead of minting or
  -- silently rebinding a proof.
  if v_checked_at is distinct from v_created_at
     or v_checked_at > statement_timestamp() + interval '1 minute' then
    raise exception 'audit_verify_checked_at_invalid' using errcode = '23514';
  end if;

  v_risk_label := v_snapshot#>>'{verdict,riskLabel}';
  begin
    v_risk_score := nullif(v_snapshot#>>'{verdict,riskScore}', '')::numeric;
  exception when others then
    raise exception 'audit_verify_risk_binding_invalid' using errcode = '22023';
  end;
  if (v_risk_score is null and v_risk_label <> 'Unknown')
     or (v_risk_score is not null and (v_risk_score < 0 or v_risk_score > 100))
     or (v_risk_score is not null and v_risk_score >= 72 and v_risk_label <> 'High')
     or (v_risk_score is not null and v_risk_score >= 48 and v_risk_score < 72 and v_risk_label <> 'Medium')
     or (v_risk_score is not null and v_risk_score >= 18 and v_risk_score < 48 and v_risk_label <> 'Low')
     or (v_risk_score is not null and v_risk_score < 18 and v_risk_label <> 'Unknown') then
    raise exception 'audit_verify_risk_binding_invalid' using errcode = '23514';
  end if;
  v_risk_status := case v_risk_label
    when 'High' then 'HIGH_RISK'
    when 'Medium' then 'ELEVATED_RISK'
    when 'Low' then 'LOW_DETECTED_RISK'
    else 'INSUFFICIENT_EVIDENCE'
  end;

  v_artifact_binding_digest := encode(digest(concat_ws(E'\x1f',
    p_case_ref, v_report_id, v_request_id, v_account_id_hash,
    v_case.target_chain_id, lower(v_case.target_private), v_target_hash,
    v_report_version_hash, v_snapshot_digest, v_source_receipt_root,
    v_pdf_digest, v_pdf_byte_length::text, v_render_contract_id,
    v_pdf_record_digest, v_release->>'packetDigest',
    v_release->>'currentDeploymentReceiptDigest',
    v_release->>'matchedInputDigest', v_release->>'releaseBindingDigest',
    lower(v_deployment_match[1]), v_deployment_match[2],
    lower(v_deployment_match[3]), v_deployment_identity_digest,
    v_checked_at::text
  ), 'sha256'), 'hex');

  return jsonb_build_object(
    'schemaVersion', 'velmere.audit-verify-completed-binding.v1',
    'caseRef', p_case_ref,
    'reportId', v_report_id,
    'snapshotDigest', v_snapshot_digest,
    'accountIdHash', v_account_id_hash,
    'tier', v_case.tier,
    'chainId', v_case.target_chain_id,
    'contractAddress', lower(v_case.target_private),
    'projectName', null,
    'reportTitle', 'Velmere Audit ' || upper(v_case.tier),
    'publicSummary', 'Immutable Audit artifact matched the exact chain, contract and deployment receipt at publication.',
    'riskStatus', v_risk_status,
    'reportDigest', substring(v_snapshot_digest from 8),
    'deploymentDigest', v_deployment_identity_digest,
    'deploymentReceiptDigest', v_release->>'currentDeploymentReceiptDigest',
    'deploymentIdentitySchemaVersion', 'velmere.verify-canonical-deployment-identity.v1',
    'checkedBlockNumber', v_deployment_match[2],
    'checkedBlockHash', lower(v_deployment_match[3]),
    'checkedAt', v_checked_at,
    'artifactBindingDigest', v_artifact_binding_digest
  );
end;
$$;

revoke all on function public.velmere_resolve_completed_audit_verify_binding_v1(text)
  from public, anon, authenticated, service_role;

create or replace function public.velmere_record_audit_verify_visibility_consent_v1(
  p_case_ref text,
  p_visibility text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_binding jsonb;
  v_account_id text;
  v_account_hash text;
  v_latest public.velmere_audit_verify_visibility_consent_events%rowtype;
  v_sequence bigint;
  v_now timestamptz := clock_timestamp();
  v_digest text;
begin
  if p_visibility is null or p_visibility not in (
    'PUBLIC', 'PUBLIC_SUMMARY_PRIVATE_REPORT', 'PRIVATE'
  ) then
    raise exception 'audit_verify_visibility_invalid' using errcode = '22023';
  end if;
  v_account_id := public.velmere_current_account_id();
  v_account_hash := public.velmere_current_account_binding_hash();
  if v_account_id is null or v_account_hash is null then
    raise exception 'audit_verify_visibility_owner_auth_required' using errcode = '28000';
  end if;
  v_binding := public.velmere_resolve_completed_audit_verify_binding_v1(p_case_ref);
  if v_binding->>'accountIdHash' <> v_account_hash then
    raise exception 'audit_verify_visibility_owner_mismatch' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('audit-verify-consent:' || p_case_ref, 0));
  select * into v_latest
  from public.velmere_audit_verify_visibility_consent_events
  where case_ref = p_case_ref
  order by consent_sequence desc
  limit 1;
  if found and v_latest.report_id = v_binding->>'reportId'
     and v_latest.snapshot_digest = v_binding->>'snapshotDigest'
     and v_latest.account_id_hash = v_account_hash
     and v_latest.visibility = p_visibility then
    return jsonb_build_object(
      'schemaVersion', 'velmere.audit-verify-visibility-consent-receipt.v1',
      'caseRef', p_case_ref,
      'visibility', p_visibility,
      'consentDigest', v_latest.consent_digest,
      'consentSequence', v_latest.consent_sequence,
      'idempotent', true,
      'consentedAt', v_latest.consented_at
    );
  end if;

  v_sequence := coalesce(v_latest.consent_sequence, 0) + 1;
  v_digest := encode(digest(concat_ws(E'\x1f',
    p_case_ref, v_binding->>'reportId', v_binding->>'snapshotDigest',
    v_account_hash, p_visibility, v_sequence::text,
    coalesce(v_latest.consent_digest, ''), v_now::text,
    encode(gen_random_bytes(16), 'hex')
  ), 'sha256'), 'hex');
  insert into public.velmere_audit_verify_visibility_consent_events(
    consent_digest, case_ref, consent_sequence, previous_consent_digest,
    report_id, snapshot_digest, account_id_hash, visibility, consented_at
  ) values (
    v_digest, p_case_ref, v_sequence, v_latest.consent_digest,
    v_binding->>'reportId', v_binding->>'snapshotDigest', v_account_hash,
    p_visibility, v_now
  );
  return jsonb_build_object(
    'schemaVersion', 'velmere.audit-verify-visibility-consent-receipt.v1',
    'caseRef', p_case_ref,
    'visibility', p_visibility,
    'consentDigest', v_digest,
    'consentSequence', v_sequence,
    'idempotent', false,
    'consentedAt', v_now
  );
end;
$$;

create or replace function public.velmere_publish_completed_audit_to_verify_v1(
  p_case_ref text,
  p_requested_visibility text default 'PRIVATE'
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_binding jsonb;
  v_bridge public.velmere_audit_verify_publication_bridges%rowtype;
  v_consent public.velmere_audit_verify_visibility_consent_events%rowtype;
  v_latest public.velmere_verify_publication_events%rowtype;
  v_append jsonb;
  v_public_proof_id text;
  v_idempotency_key text;
  v_verification_receipt_digest text;
  v_actor_digest text;
  v_now timestamptz := clock_timestamp();
  v_monitoring_ttl_seconds integer;
  v_effective_status text;
  v_idempotent boolean := false;
begin
  if p_requested_visibility is null or p_requested_visibility not in (
    'PUBLIC', 'PUBLIC_SUMMARY_PRIVATE_REPORT', 'PRIVATE'
  ) then
    raise exception 'audit_verify_visibility_invalid' using errcode = '22023';
  end if;
  v_binding := public.velmere_resolve_completed_audit_verify_binding_v1(p_case_ref);
  perform pg_advisory_xact_lock(hashtextextended('audit-verify-publish:' || p_case_ref, 0));

  select * into v_bridge
  from public.velmere_audit_verify_publication_bridges
  where case_ref = p_case_ref;

  if p_requested_visibility <> 'PRIVATE' then
    select * into v_consent
    from public.velmere_audit_verify_visibility_consent_events
    where case_ref = p_case_ref
    order by consent_sequence desc
    limit 1;
    if not found
       or v_consent.report_id <> v_binding->>'reportId'
       or v_consent.snapshot_digest <> v_binding->>'snapshotDigest'
       or v_consent.account_id_hash <> v_binding->>'accountIdHash'
       or v_consent.visibility <> p_requested_visibility then
      raise exception 'audit_verify_public_visibility_consent_required' using errcode = '42501';
    end if;
  end if;

  if v_bridge.case_ref is null then
    v_public_proof_id := 'pubidx-' || encode(gen_random_bytes(24), 'hex');
    v_verification_receipt_digest := encode(digest(concat_ws(E'\x1f',
      'velmere-audit-verify-initial-receipt-v1',
      v_binding->>'artifactBindingDigest',
      coalesce(v_consent.consent_digest, 'private-default')
    ), 'sha256'), 'hex');
    v_actor_digest := encode(digest(concat_ws(E'\x1f',
      'velmere-audit-verify-trusted-producer-v1',
      v_binding->>'accountIdHash',
      coalesce(v_consent.consent_digest, 'private-default')
    ), 'sha256'), 'hex');
    v_idempotency_key := encode(digest(concat_ws(E'\x1f',
      'velmere-audit-verify-initial-idempotency-v1',
      v_binding->>'artifactBindingDigest', v_public_proof_id,
      p_requested_visibility
    ), 'sha256'), 'hex');
    v_monitoring_ttl_seconds := ceil(extract(epoch from (
      public.velmere_verify_next_daily_monitor_window_end_v1(
        (v_binding->>'checkedAt')::timestamptz
      ) - (v_binding->>'checkedAt')::timestamptz
    )))::integer;
    v_append := public.velmere_append_verify_publication_event_v1(
      v_idempotency_key,
      v_public_proof_id,
      v_binding->>'chainId',
      v_binding->>'contractAddress',
      'INITIAL_VERIFICATION',
      p_requested_visibility,
      null,
      v_binding->>'reportTitle',
      v_binding->>'publicSummary',
      v_binding->>'riskStatus',
      v_binding->>'reportDigest',
      v_binding->>'deploymentDigest',
      v_verification_receipt_digest,
      v_actor_digest,
      v_binding->>'checkedBlockNumber',
      v_binding->>'checkedBlockHash',
      (v_binding->>'checkedAt')::timestamptz,
      v_monitoring_ttl_seconds,
      null
    );
    insert into public.velmere_verify_deployment_identity_bindings(
      public_proof_id, initial_event_digest, identity_schema_version,
      deployment_identity_digest, provenance_receipt_digest, created_at
    ) values (
      v_public_proof_id, v_append->>'eventDigest',
      'velmere.verify-canonical-deployment-identity.v1',
      v_binding->>'deploymentDigest',
      substring(v_binding->>'deploymentReceiptDigest' from 8),
      v_now
    );
    insert into public.velmere_audit_verify_publication_bridges(
      case_ref, report_id, snapshot_digest, artifact_binding_digest,
      public_proof_id, initial_event_digest, created_at
    ) values (
      p_case_ref, v_binding->>'reportId', v_binding->>'snapshotDigest',
      v_binding->>'artifactBindingDigest', v_public_proof_id,
      v_append->>'eventDigest', v_now
    ) returning * into v_bridge;
  else
    if v_bridge.report_id <> v_binding->>'reportId'
       or v_bridge.snapshot_digest <> v_binding->>'snapshotDigest'
       or v_bridge.artifact_binding_digest <> v_binding->>'artifactBindingDigest' then
      raise exception 'audit_verify_bridge_immutable_conflict' using errcode = '23505';
    end if;
    v_public_proof_id := v_bridge.public_proof_id;
    select * into strict v_latest
    from public.velmere_verify_publication_events
    where public_proof_id = v_public_proof_id
    order by publication_version desc
    limit 1;

    if v_latest.visibility = p_requested_visibility then
      v_append := jsonb_build_object(
        'eventDigest', v_latest.event_digest,
        'currentStatus', v_latest.current_status,
        'visibility', v_latest.visibility,
        'idempotent', true
      );
      v_idempotent := true;
    else
      if p_requested_visibility = 'PRIVATE' then
        select * into v_consent
        from public.velmere_audit_verify_visibility_consent_events
        where case_ref = p_case_ref
        order by consent_sequence desc
        limit 1;
        if not found
           or v_consent.report_id <> v_binding->>'reportId'
           or v_consent.snapshot_digest <> v_binding->>'snapshotDigest'
           or v_consent.account_id_hash <> v_binding->>'accountIdHash'
           or v_consent.visibility <> 'PRIVATE' then
          raise exception 'audit_verify_public_visibility_consent_required' using errcode = '42501';
        end if;
      end if;
      v_verification_receipt_digest := encode(digest(concat_ws(E'\x1f',
        'velmere-audit-verify-visibility-receipt-v1',
        v_binding->>'artifactBindingDigest', v_consent.consent_digest,
        v_latest.event_digest
      ), 'sha256'), 'hex');
      v_actor_digest := encode(digest(concat_ws(E'\x1f',
        'velmere-audit-verify-owner-visibility-v1',
        v_binding->>'accountIdHash', v_consent.consent_digest
      ), 'sha256'), 'hex');
      v_idempotency_key := encode(digest(concat_ws(E'\x1f',
        'velmere-audit-verify-visibility-idempotency-v1',
        v_consent.consent_digest, v_latest.event_digest
      ), 'sha256'), 'hex');
      v_append := public.velmere_append_verify_publication_event_v1(
        v_idempotency_key,
        v_public_proof_id,
        v_binding->>'chainId',
        v_binding->>'contractAddress',
        'VISIBILITY_CHANGED',
        p_requested_visibility,
        null, null, null, null, null, null,
        v_verification_receipt_digest,
        v_actor_digest,
        null, null, null, null,
        v_latest.event_digest
      );
    end if;
  end if;

  select * into strict v_latest
  from public.velmere_verify_publication_events
  where public_proof_id = v_public_proof_id
  order by publication_version desc
  limit 1;
  v_effective_status := case
    when v_latest.current_status in ('VERIFIED', 'VERIFIED_AGAIN')
         and v_latest.monitor_due_at <= statement_timestamp()
      then 'MONITORING_UNAVAILABLE'
    else v_latest.current_status
  end;

  return jsonb_build_object(
    'schemaVersion', 'velmere.audit-verify-initial-producer-receipt.v1',
    'ok', true,
    'verifyActive', v_effective_status in ('VERIFIED', 'VERIFIED_AGAIN'),
    'publiclyVisible', v_latest.visibility <> 'PRIVATE',
    'publicProofId', v_public_proof_id,
    'visibility', v_latest.visibility,
    'currentStatus', v_effective_status,
    'eventDigest', v_latest.event_digest,
    'reportId', v_bridge.report_id,
    'snapshotDigest', v_bridge.snapshot_digest,
    'artifactBindingDigest', v_bridge.artifact_binding_digest,
    'idempotent', v_idempotent or coalesce((v_append->>'idempotent')::boolean, false),
    'reason', case
      when v_effective_status in ('VERIFIED', 'VERIFIED_AGAIN') then null
      else 'VERIFY_MONITORING_NOT_CURRENT'
    end,
    'truthBoundary', 'Trusted current-source bridge only; no staging, deployment, uptime, customer, FINAL, GO_PAID or LIVE credit.'
  );
end;
$$;

revoke all on function public.velmere_record_audit_verify_visibility_consent_v1(text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.velmere_publish_completed_audit_to_verify_v1(text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_record_audit_verify_visibility_consent_v1(text,text)
  to authenticated;
grant execute on function public.velmere_publish_completed_audit_to_verify_v1(text,text)
  to service_role;

comment on table public.velmere_audit_verify_visibility_consent_events is
  'Append-only authenticated owner visibility consent. The latest exact report/snapshot-bound event is authoritative; absent consent means PRIVATE.';
comment on table public.velmere_audit_verify_publication_bridges is
  'Immutable one-report/one-proof bridge. A completed Audit report and exact customer PDF may never be duplicated under a second Verify identity.';
comment on function public.velmere_publish_completed_audit_to_verify_v1(text,text) is
  'Service-role trusted producer. PRIVATE is the only consent-free initial mode; any public or later visibility transition requires the latest exact owner consent. Initial monitoring due time is the daily cadence plus documented scheduler jitter; observed append-only event time remains authoritative.';

commit;
