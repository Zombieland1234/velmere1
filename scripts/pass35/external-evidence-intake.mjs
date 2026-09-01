#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_CANDIDATE_ID = "VELMERE_PASS35_OFFLINE_CANDIDATE_R3";
const GLOBAL_DENOMINATOR = 3074;
const EXPECTED_WORKSTREAMS = Object.freeze({
  PROVIDER_COMMERCIAL_RIGHTS: 21,
  MERCHANT_LEGAL_FIELDS: 26,
  STAGING_RLS_REAL_REPLAYS: 19,
});
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[a-z0-9][a-z0-9._:@/-]{7,159}$/u;
const KEY_ID = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{7,159}$/u;
const FORBIDDEN_ORIGIN = /(?:^|[^a-z])(local(?:host)?|fixture|synthetic|mock|offline|example|test-only)(?:[^a-z]|$)/iu;
const ENVELOPE_KEYS = new Set(["schemaVersion", "candidateId", "batchId", "evidence"]);
const EVIDENCE_KEYS = new Set([
  "evidenceId", "workstreamId", "workstreamItemId", "evidenceKind", "environment",
  "sourceUri", "sourceSha256", "issuedAt", "expiresAt", "ttlSeconds", "subjectOrganizationId",
  "issuer", "signatureReference", "fixture", "synthetic", "locallyAuthored", "unsigned",
]);
const ISSUER_KEYS = new Set([
  "issuerId", "organizationId", "organizationName", "issuerType", "independent", "conflictDeclared",
]);
const SIGNATURE_KEYS = new Set([
  "referenceUri", "algorithm", "keyId", "signatureSha256", "signedPayloadSha256",
  "verificationReceiptSha256", "verifiedAt", "verificationStatus",
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function canonicalIso(value) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString() === value ? timestamp : null;
}

function unknownKeys(value, allowed) {
  return isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)).sort() : [];
}

function externalReference(value) {
  if (typeof value !== "string" || value.length < 12 || value.length > 2048 || FORBIDDEN_ORIGIN.test(value)) return false;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:") return parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1" && parsed.hostname !== "::1";
    return parsed.protocol === "urn:" && parsed.pathname.length >= 8;
  } catch {
    return false;
  }
}

function validatePolicy(policy) {
  const blockers = [];
  if (!isRecord(policy) || policy.schemaVersion !== "velmere.pass35.external-evidence-intake-policy.v1") blockers.push("policy_schema_invalid");
  if (policy?.candidateId !== EXPECTED_CANDIDATE_ID) blockers.push("policy_candidate_invalid");
  if (policy?.globalExternalEvidenceDenominator !== GLOBAL_DENOMINATOR) blockers.push("policy_global_denominator_invalid");
  if (!Number.isInteger(policy?.maximumInputBytes) || policy.maximumInputBytes < 1024 || policy.maximumInputBytes > 2_097_152) blockers.push("policy_input_limit_invalid");
  if (!Number.isInteger(policy?.maximumBatchRecords) || policy.maximumBatchRecords < 1 || policy.maximumBatchRecords > 66) blockers.push("policy_batch_limit_invalid");
  if (!Number.isInteger(policy?.clockSkewSeconds) || policy.clockSkewSeconds < 0 || policy.clockSkewSeconds > 900) blockers.push("policy_clock_skew_invalid");
  if (!Number.isInteger(policy?.minimumTtlSeconds) || policy.minimumTtlSeconds < 60) blockers.push("policy_minimum_ttl_invalid");
  if (policy?.directRegisterMutationAllowed !== false || policy?.metadataAloneMayIncrementVerifiedDenominator !== false || policy?.metadataAloneMayAllowPromotion !== false) {
    blockers.push("policy_fail_closed_boundary_invalid");
  }
  for (const [workstreamId, requiredCount] of Object.entries(EXPECTED_WORKSTREAMS)) {
    const row = policy?.workstreams?.[workstreamId];
    if (!isRecord(row) || row.requiredCount !== requiredCount) blockers.push(`policy_workstream_count_invalid:${workstreamId}`);
    if (typeof row?.itemIdPrefix !== "string" || !row.itemIdPrefix.length) blockers.push(`policy_item_prefix_invalid:${workstreamId}`);
    if (typeof row?.environment !== "string" || typeof row?.issuerType !== "string") blockers.push(`policy_external_binding_invalid:${workstreamId}`);
    if (!Number.isInteger(row?.maximumTtlSeconds) || row.maximumTtlSeconds < policy?.minimumTtlSeconds) blockers.push(`policy_maximum_ttl_invalid:${workstreamId}`);
  }
  if (Object.keys(policy?.workstreams ?? {}).sort().join("|") !== Object.keys(EXPECTED_WORKSTREAMS).sort().join("|")) blockers.push("policy_workstream_scope_invalid");
  if (!Array.isArray(policy?.acceptedSignatureAlgorithms) || policy.acceptedSignatureAlgorithms.length === 0) blockers.push("policy_signature_algorithms_invalid");
  return [...new Set(blockers)].sort();
}

export function loadExternalEvidenceIntakePolicy(rootPath = process.cwd()) {
  const policyPath = path.join(path.resolve(rootPath), "config/pass35/external-evidence-intake-policy.json");
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  const blockers = validatePolicy(policy);
  if (blockers.length) throw new Error(`external_evidence_intake_policy_invalid:${blockers.join("|")}`);
  return policy;
}

function validateEvidence(record, index, evaluatedAt, policy) {
  const prefix = `evidence[${index}]`;
  const blockers = [];
  const fail = (condition, code) => { if (!condition) blockers.push(`${prefix}:${code}`); };
  if (!isRecord(record)) return { evidenceId: null, workstreamId: null, workstreamItemId: null, intakeEligible: false, blockers: [`${prefix}:not_object`] };
  for (const key of unknownKeys(record, EVIDENCE_KEYS)) blockers.push(`${prefix}:unknown_field:${key}`);
  fail(typeof record.evidenceId === "string" && SAFE_ID.test(record.evidenceId), "evidence_id_invalid");
  const workstream = policy.workstreams[record.workstreamId];
  fail(Boolean(workstream), "workstream_not_supported_exactly");
  fail(typeof record.workstreamItemId === "string" && Boolean(workstream) && record.workstreamItemId.startsWith(workstream.itemIdPrefix) && SAFE_ID.test(record.workstreamItemId), "workstream_item_id_invalid");
  fail(record.evidenceKind === "REAL_EXTERNAL", "evidence_kind_not_real_external");
  fail(Boolean(workstream) && record.environment === workstream.environment && !FORBIDDEN_ORIGIN.test(String(record.environment ?? "")), "environment_not_exact_external");
  fail(externalReference(record.sourceUri), "source_uri_not_external");
  fail(typeof record.sourceSha256 === "string" && SHA256.test(record.sourceSha256), "source_sha256_invalid");
  fail(record.fixture === false, "fixture_must_be_false");
  fail(record.synthetic === false, "synthetic_must_be_false");
  fail(record.locallyAuthored === false, "locally_authored_must_be_false");
  fail(record.unsigned === false, "unsigned_must_be_false");
  fail(typeof record.subjectOrganizationId === "string" && SAFE_ID.test(record.subjectOrganizationId), "subject_organization_id_invalid");

  const issuedAt = canonicalIso(record.issuedAt);
  const expiresAt = canonicalIso(record.expiresAt);
  const ttlValid = Number.isInteger(record.ttlSeconds)
    && record.ttlSeconds >= policy.minimumTtlSeconds
    && Boolean(workstream)
    && record.ttlSeconds <= workstream.maximumTtlSeconds;
  fail(issuedAt !== null, "issued_at_invalid");
  fail(expiresAt !== null, "expires_at_invalid");
  fail(ttlValid, "ttl_invalid");
  if (issuedAt !== null) fail(issuedAt <= evaluatedAt + policy.clockSkewSeconds * 1000, "issued_in_future");
  if (expiresAt !== null) fail(expiresAt > evaluatedAt, "evidence_expired");
  if (issuedAt !== null && expiresAt !== null && ttlValid) {
    fail(expiresAt === issuedAt + record.ttlSeconds * 1000, "ttl_expiry_binding_invalid");
  }

  const issuer = record.issuer;
  if (!isRecord(issuer)) blockers.push(`${prefix}:issuer_not_object`);
  else {
    for (const key of unknownKeys(issuer, ISSUER_KEYS)) blockers.push(`${prefix}:issuer_unknown_field:${key}`);
    fail(typeof issuer.issuerId === "string" && SAFE_ID.test(issuer.issuerId) && !FORBIDDEN_ORIGIN.test(issuer.issuerId), "issuer_id_invalid");
    fail(typeof issuer.organizationId === "string" && SAFE_ID.test(issuer.organizationId) && !FORBIDDEN_ORIGIN.test(issuer.organizationId), "issuer_organization_id_invalid");
    fail(typeof issuer.organizationName === "string" && issuer.organizationName.trim().length >= 3 && issuer.organizationName.length <= 200 && !FORBIDDEN_ORIGIN.test(issuer.organizationName), "issuer_organization_name_invalid");
    fail(Boolean(workstream) && issuer.issuerType === workstream.issuerType, "issuer_type_not_exact");
    fail(issuer.independent === true, "issuer_not_independent");
    fail(issuer.conflictDeclared === false, "issuer_conflict_not_clear");
    fail(typeof record.subjectOrganizationId === "string" && issuer.organizationId !== record.subjectOrganizationId, "issuer_same_as_subject");
  }

  const signature = record.signatureReference;
  if (!isRecord(signature)) blockers.push(`${prefix}:signature_reference_not_object`);
  else {
    for (const key of unknownKeys(signature, SIGNATURE_KEYS)) blockers.push(`${prefix}:signature_unknown_field:${key}`);
    fail(externalReference(signature.referenceUri), "signature_reference_uri_not_external");
    fail(policy.acceptedSignatureAlgorithms.includes(signature.algorithm), "signature_algorithm_not_allowed");
    fail(typeof signature.keyId === "string" && KEY_ID.test(signature.keyId) && !FORBIDDEN_ORIGIN.test(signature.keyId), "signature_key_id_invalid");
    fail(typeof signature.signatureSha256 === "string" && SHA256.test(signature.signatureSha256), "signature_sha256_invalid");
    fail(typeof signature.signedPayloadSha256 === "string" && signature.signedPayloadSha256 === record.sourceSha256, "signature_payload_not_source_bound");
    fail(typeof signature.verificationReceiptSha256 === "string" && SHA256.test(signature.verificationReceiptSha256), "signature_verification_receipt_invalid");
    fail(signature.verificationStatus === "EXTERNAL_REFERENCE_REPORTED_VERIFIED", "signature_verification_status_invalid");
    const verifiedAt = canonicalIso(signature.verifiedAt);
    fail(verifiedAt !== null, "signature_verified_at_invalid");
    if (verifiedAt !== null) {
      fail(verifiedAt <= evaluatedAt + policy.clockSkewSeconds * 1000, "signature_verified_in_future");
      if (issuedAt !== null) fail(verifiedAt >= issuedAt, "signature_verified_before_issue");
    }
  }
  return {
    evidenceId: typeof record.evidenceId === "string" ? record.evidenceId : null,
    workstreamId: typeof record.workstreamId === "string" ? record.workstreamId : null,
    workstreamItemId: typeof record.workstreamItemId === "string" ? record.workstreamItemId : null,
    intakeEligible: blockers.length === 0,
    blockers: [...new Set(blockers)].sort(),
  };
}

export function evaluateExternalEvidenceIntake(envelope, { evaluatedAt = new Date().toISOString(), policy } = {}) {
  const activePolicy = policy ?? loadExternalEvidenceIntakePolicy();
  const policyBlockers = validatePolicy(activePolicy);
  if (policyBlockers.length) throw new Error(`external_evidence_intake_policy_invalid:${policyBlockers.join("|")}`);
  const evaluationTime = canonicalIso(evaluatedAt);
  if (evaluationTime === null) throw new Error("external_evidence_evaluation_time_invalid");
  const envelopeBlockers = [];
  if (!isRecord(envelope)) envelopeBlockers.push("intake:not_object");
  else {
    for (const key of unknownKeys(envelope, ENVELOPE_KEYS)) envelopeBlockers.push(`intake:unknown_field:${key}`);
    if (envelope.schemaVersion !== "velmere.pass35.external-evidence-intake.v1") envelopeBlockers.push("intake:schema_invalid");
    if (envelope.candidateId !== EXPECTED_CANDIDATE_ID) envelopeBlockers.push("intake:candidate_invalid");
    if (typeof envelope.batchId !== "string" || !SAFE_ID.test(envelope.batchId)) envelopeBlockers.push("intake:batch_id_invalid");
    if (!Array.isArray(envelope.evidence) || envelope.evidence.length === 0) envelopeBlockers.push("intake:evidence_empty_or_invalid");
    if (Array.isArray(envelope.evidence) && envelope.evidence.length > activePolicy.maximumBatchRecords) envelopeBlockers.push("intake:batch_record_limit_exceeded");
  }
  const evidence = Array.isArray(envelope?.evidence) ? envelope.evidence : [];
  const records = evidence.map((record, index) => validateEvidence(record, index, evaluationTime, activePolicy));
  const evidenceIds = new Map();
  const workstreamItems = new Map();
  for (const [index, record] of records.entries()) {
    if (record.evidenceId) {
      if (evidenceIds.has(record.evidenceId)) {
        record.blockers.push(`evidence[${index}]:duplicate_evidence_id`);
        records[evidenceIds.get(record.evidenceId)].blockers.push(`evidence[${evidenceIds.get(record.evidenceId)}]:duplicate_evidence_id`);
      } else evidenceIds.set(record.evidenceId, index);
    }
    if (record.workstreamId && record.workstreamItemId) {
      const key = `${record.workstreamId}\0${record.workstreamItemId}`;
      if (workstreamItems.has(key)) {
        record.blockers.push(`evidence[${index}]:duplicate_workstream_item`);
        records[workstreamItems.get(key)].blockers.push(`evidence[${workstreamItems.get(key)}]:duplicate_workstream_item`);
      } else workstreamItems.set(key, index);
    }
  }
  for (const record of records) {
    record.blockers = [...new Set(record.blockers)].sort();
    record.intakeEligible = record.blockers.length === 0;
  }
  for (const [workstreamId, requiredCount] of Object.entries(EXPECTED_WORKSTREAMS)) {
    const count = records.filter((record) => record.intakeEligible && record.workstreamId === workstreamId).length;
    if (count > requiredCount) envelopeBlockers.push(`intake:workstream_count_exceeded:${workstreamId}`);
  }
  const structurallyEligibleRecordCount = records.filter((record) => record.intakeEligible).length;
  const batchAccepted = envelopeBlockers.length === 0 && structurallyEligibleRecordCount === records.length && records.length > 0;
  const intakeEligibleCount = batchAccepted ? structurallyEligibleRecordCount : 0;
  const rejectedCount = batchAccepted ? 0 : records.length;
  for (const record of records) record.acceptedInBatch = batchAccepted && record.intakeEligible;
  return {
    schemaVersion: "velmere.pass35.external-evidence-intake-evaluation.v1",
    candidateId: EXPECTED_CANDIDATE_ID,
    evaluatedAt,
    status: batchAccepted ? "PASS_METADATA_INTAKE_REQUIRES_INDEPENDENT_CRYPTOGRAPHIC_VERIFICATION" : "REJECTED_FAIL_CLOSED",
    batchAccepted,
    globalExternalEvidenceDenominator: GLOBAL_DENOMINATOR,
    scopedRequiredCount: Object.values(EXPECTED_WORKSTREAMS).reduce((sum, count) => sum + count, 0),
    submittedCount: records.length,
    structurallyEligibleRecordCount,
    intakeEligibleCount,
    rejectedCount,
    verifiedDenominatorIncrement: 0,
    promotionCreditGranted: false,
    promotionAllowed: false,
    directRegisterMutationPerformed: false,
    envelopeBlockers: [...new Set(envelopeBlockers)].sort(),
    records,
    requiredNextStep: batchAccepted ? "Resolve and cryptographically verify the referenced source, signature, issuer independence and verification receipt in an authorized external verification workflow." : "Correct every blocker and resubmit metadata; rejected records receive no denominator or promotion credit.",
    truthBoundary: "This read-only intake validates metadata shape, exact workstream binding, external-origin declarations, freshness and signature references. It does not fetch evidence, validate a signature, verify issuer independence, mutate the external register, increment the verified 3074 denominator, or allow promotion.",
  };
}

function runCli() {
  const argv = process.argv.slice(2);
  const validShape = argv.length === 1 || (argv.length === 3 && argv[1] === "--at");
  if (!validShape || argv[0].startsWith("--")) throw new Error("usage: external-evidence-intake.mjs <input.json> [--at <canonical-ISO-timestamp>]");
  const inputArgument = argv[0];
  const evaluatedAt = argv.length === 3 ? argv[2] : new Date().toISOString();
  const policy = loadExternalEvidenceIntakePolicy(process.cwd());
  const inputPath = path.resolve(process.cwd(), inputArgument);
  const stat = lstatSync(inputPath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("external_evidence_input_must_be_regular_non_symlink_file");
  if (stat.size <= 0 || stat.size > policy.maximumInputBytes) throw new Error("external_evidence_input_size_invalid");
  const source = readFileSync(inputPath, "utf8");
  const envelope = JSON.parse(source);
  const result = evaluateExternalEvidenceIntake(envelope, { evaluatedAt, policy });
  console.log(JSON.stringify({ ...result, inputSha256: sha256(source) }, null, 2));
  if (!result.batchAccepted) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    console.error(JSON.stringify({
      schemaVersion: "velmere.pass35.external-evidence-intake-evaluation.v1",
      status: "REJECTED_FAIL_CLOSED",
      promotionAllowed: false,
      verifiedDenominatorIncrement: 0,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  }
}
