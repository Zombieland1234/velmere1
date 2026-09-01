#!/usr/bin/env node
import crypto from "node:crypto";
import canonicalPolicy from "../../config/pass36/a102-out-of-time-repeated-slo-vendor-exit-observation-policy.json" with { type: "json" };

export const A102_BOUNDARY_ID =
  "velmere.pass36.a102.repeated-slo-vendor-exit-observation-boundary.v2";

const HEX64 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,180}$/u;
const REAL_EVIDENCE_CLASS = "REAL_DISPOSABLE_STAGING";
const SYNTHETIC_EVIDENCE_CLASS = "SYNTHETIC_TEST_ONLY";

export class A102BoundaryError extends Error {
  constructor(code, detail = null) {
    super(detail == null ? code : `${code}:${String(detail)}`);
    this.name = "A102BoundaryError";
    this.code = code;
    this.detail = detail;
  }
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export const sha256Text = (value) =>
  crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
export const sha256Bytes = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new A102BoundaryError(code);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length
    || actual.some((key, index) => key !== wanted[index])
  ) {
    throw new A102BoundaryError(code, canonicalJson({ actual, expected: wanted }));
  }
}

function safeId(value, code) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    throw new A102BoundaryError(code);
  }
  return value;
}

function hex64(value, code) {
  if (typeof value !== "string" || !HEX64.test(value)) {
    throw new A102BoundaryError(code);
  }
  return value;
}

function isoMs(value, code) {
  if (typeof value !== "string" || value.length > 64) {
    throw new A102BoundaryError(code);
  }
  const parsed = Date.parse(value);
  if (
    !Number.isSafeInteger(parsed)
    || new Date(parsed).toISOString() !== value
  ) throw new A102BoundaryError(code);
  return parsed;
}

function finitePolicyInteger(value, minimum, code) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new A102BoundaryError(code);
  }
  return value;
}

function observationPolicy(policy) {
  const value = policy?.observation;
  exactKeys(value, [
    "maximumClockSkewSeconds",
    "maximumSloWindowSeconds",
    "maximumWitnessDelaySeconds",
    "minimumAggregateWitnessOrganizations",
    "minimumDistinctAlternateControlPlanes",
    "minimumDistinctAlternateFailureDomains",
    "minimumDistinctAlternateProviders",
    "minimumDistinctAlternateVendorFamilies",
    "minimumDistinctObserverKeys",
    "minimumGapBetweenRunStartsSeconds",
    "minimumObservationSpanSeconds",
    "minimumRunObserverOrganizations",
    "minimumRuns",
    "minimumSloWindowSeconds",
  ], "a102_policy_observation_fields_invalid");
  for (const key of Object.keys(value)) {
    finitePolicyInteger(value[key], key === "maximumClockSkewSeconds" ? 0 : 1, `a102_policy_${key}_invalid`);
  }
  if (value.maximumSloWindowSeconds < value.minimumSloWindowSeconds) {
    throw new A102BoundaryError("a102_policy_slo_window_range_invalid");
  }
  return value;
}

const PREREQUISITE_FIELDS = [
  "byteLength",
  "decision",
  "path",
  "revisionId",
  "sha256",
];

function validatePrerequisite(row, expectedRevision, requiredDecision) {
  exactKeys(row, PREREQUISITE_FIELDS, "a102_prerequisite_fields_invalid");
  if (row.revisionId !== expectedRevision) {
    throw new A102BoundaryError("a102_prerequisite_revision_mismatch");
  }
  if (row.decision !== requiredDecision) {
    throw new A102BoundaryError("a102_prerequisite_not_real_verified");
  }
  if (
    typeof row.path !== "string"
    || row.path.startsWith("/")
    || row.path.includes("\\")
    || row.path.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new A102BoundaryError("a102_prerequisite_path_invalid");
  }
  finitePolicyInteger(row.byteLength, 1, "a102_prerequisite_bytes_invalid");
  hex64(row.sha256, "a102_prerequisite_digest_invalid");
  return Object.freeze({ ...row });
}

const TRUST_ROOT_FIELDS = [
  "externalAnchorPath",
  "externalAnchorSha256",
  "keyId",
  "organizationId",
  "publicKeyPem",
  "revoked",
  "validFrom",
  "validUntil",
];

function safeRelativePath(value, code) {
  if (
    typeof value !== "string"
    || !value
    || value.startsWith("/")
    || value.includes("\\")
    || value.split("/").some((part) => !part || part === "." || part === "..")
  ) throw new A102BoundaryError(code);
  return value;
}

function validateTrustRoot(row, { allowSynthetic }) {
  exactKeys(row, TRUST_ROOT_FIELDS, "a102_trust_root_fields_invalid");
  safeId(row.keyId, "a102_trust_root_key_invalid");
  safeId(row.organizationId, "a102_trust_root_org_invalid");
  safeRelativePath(row.externalAnchorPath, "a102_trust_root_anchor_path_invalid");
  hex64(row.externalAnchorSha256, "a102_trust_root_anchor_invalid");
  if (row.revoked !== false) throw new A102BoundaryError("a102_trust_root_revoked");
  if (
    typeof row.publicKeyPem !== "string"
    || !row.publicKeyPem.includes("BEGIN PUBLIC KEY")
  ) {
    throw new A102BoundaryError("a102_trust_root_public_key_invalid");
  }
  const validFromMs = isoMs(row.validFrom, "a102_trust_root_valid_from_invalid");
  const validUntilMs = isoMs(row.validUntil, "a102_trust_root_valid_until_invalid");
  if (validUntilMs <= validFromMs) {
    throw new A102BoundaryError("a102_trust_root_window_invalid");
  }
  if (!allowSynthetic) {
    throw new A102BoundaryError("a102_real_evidence_requires_external_verifier");
  }
  return Object.freeze({
    ...row,
    externalAnchorBound: false,
    publicKeySha256: sha256Text(row.publicKeyPem),
    validFromMs,
    validUntilMs,
  });
}

const RUN_CORE_FIELDS = [
  "a101Decision",
  "a101ReceiptSha256",
  "acknowledged",
  "alertDelivered",
  "alternateControlPlane",
  "alternateFailureDomain",
  "alternateProbeSetVerified",
  "alternateProviderId",
  "alternateVendorFamily",
  "completedAt",
  "credentialRevocationVerified",
  "environmentDigest",
  "finalBaselineVerified",
  "killSwitchTested",
  "observerKeyId",
  "observerOrganizationId",
  "primaryRestoreSucceeded",
  "rollbackVerified",
  "runId",
  "schemaVersion",
  "sloWindowEndedAt",
  "sloWindowStartedAt",
  "sourceArchiveSha256",
  "sourceManifestSha256",
  "sourceRevisionId",
  "startedAt",
  "vendorExitCompleted",
  "zeroProductionPayments",
];
const RUN_FIELDS = [...RUN_CORE_FIELDS, "receiptDigest", "signatureBase64"];

function validateRun(row, trustByKey, policy, expected) {
  exactKeys(row, RUN_FIELDS, "a102_run_fields_invalid");
  const core = Object.fromEntries(RUN_CORE_FIELDS.map((key) => [key, row[key]]));
  if (row.schemaVersion !== "velmere.a102.observation-run.v1") {
    throw new A102BoundaryError("a102_run_schema_invalid");
  }
  for (const key of [
    "runId",
    "sourceRevisionId",
    "observerKeyId",
    "observerOrganizationId",
    "alternateProviderId",
    "alternateVendorFamily",
    "alternateControlPlane",
    "alternateFailureDomain",
  ]) safeId(row[key], `a102_run_${key}_invalid`);
  for (const key of [
    "a101ReceiptSha256",
    "environmentDigest",
    "sourceArchiveSha256",
    "sourceManifestSha256",
  ]) hex64(row[key], `a102_run_${key}_invalid`);
  for (const key of [
    "acknowledged",
    "alertDelivered",
    "alternateProbeSetVerified",
    "credentialRevocationVerified",
    "finalBaselineVerified",
    "killSwitchTested",
    "primaryRestoreSucceeded",
    "rollbackVerified",
    "vendorExitCompleted",
    "zeroProductionPayments",
  ]) {
    if (row[key] !== true) throw new A102BoundaryError(`a102_run_${key}_not_true`);
  }
  if (row.a101Decision !== expected.requiredA101Decision) {
    throw new A102BoundaryError("a102_run_a101_decision_invalid");
  }
  if (
    row.sourceRevisionId !== expected.sourceRevisionId
    || row.sourceManifestSha256 !== expected.sourceManifestSha256
    || row.sourceArchiveSha256 !== expected.sourceArchiveSha256
  ) {
    throw new A102BoundaryError("a102_run_frozen_source_mismatch");
  }
  const startedAtMs = isoMs(row.startedAt, "a102_run_started_at_invalid");
  const completedAtMs = isoMs(row.completedAt, "a102_run_completed_at_invalid");
  const sloStartedAtMs = isoMs(row.sloWindowStartedAt, "a102_run_slo_started_at_invalid");
  const sloEndedAtMs = isoMs(row.sloWindowEndedAt, "a102_run_slo_ended_at_invalid");
  if (
    completedAtMs < startedAtMs
    || sloStartedAtMs < startedAtMs
    || sloEndedAtMs > completedAtMs
    || sloEndedAtMs < sloStartedAtMs
  ) throw new A102BoundaryError("a102_run_time_order_invalid");
  const sloSeconds = (sloEndedAtMs - sloStartedAtMs) / 1000;
  if (
    sloSeconds < policy.minimumSloWindowSeconds
    || sloSeconds > policy.maximumSloWindowSeconds
  ) throw new A102BoundaryError("a102_run_slo_window_invalid");
  const digest = sha256Text(canonicalJson(core));
  if (row.receiptDigest !== digest) {
    throw new A102BoundaryError("a102_run_receipt_digest_invalid");
  }
  const trust = trustByKey.get(row.observerKeyId);
  if (!trust || trust.organizationId !== row.observerOrganizationId) {
    throw new A102BoundaryError("a102_run_observer_binding_invalid");
  }
  if (startedAtMs < trust.validFromMs || completedAtMs > trust.validUntilMs) {
    throw new A102BoundaryError("a102_run_observer_key_outside_validity");
  }
  const signature = Buffer.from(row.signatureBase64, "base64");
  if (
    signature.length !== 64
    || signature.toString("base64") !== row.signatureBase64
    || !crypto.verify(null, Buffer.from(row.receiptDigest, "ascii"), trust.publicKeyPem, signature)
  ) throw new A102BoundaryError("a102_run_signature_invalid");
  return Object.freeze({
    ...row,
    startedAtMs,
    completedAtMs,
    sloStartedAtMs,
    sloEndedAtMs,
  });
}

const WITNESS_CORE_FIELDS = [
  "observationDigest",
  "organizationId",
  "runReceiptDigests",
  "schemaVersion",
  "sourceArchiveSha256",
  "sourceManifestSha256",
  "sourceRevisionId",
  "witnessedAt",
  "witnessKeyId",
];
const WITNESS_FIELDS = [...WITNESS_CORE_FIELDS, "receiptDigest", "signatureBase64"];

function validateWitness(row, runs, trustByKey, policy, expected) {
  exactKeys(row, WITNESS_FIELDS, "a102_witness_fields_invalid");
  const core = Object.fromEntries(WITNESS_CORE_FIELDS.map((key) => [key, row[key]]));
  if (row.schemaVersion !== "velmere.a102.aggregate-witness.v1") {
    throw new A102BoundaryError("a102_witness_schema_invalid");
  }
  safeId(row.organizationId, "a102_witness_org_invalid");
  safeId(row.witnessKeyId, "a102_witness_key_invalid");
  for (const key of [
    "observationDigest",
    "sourceArchiveSha256",
    "sourceManifestSha256",
  ]) hex64(row[key], `a102_witness_${key}_invalid`);
  const runDigests = runs.map((run) => run.receiptDigest);
  if (
    !Array.isArray(row.runReceiptDigests)
    || canonicalJson(row.runReceiptDigests) !== canonicalJson(runDigests)
  ) throw new A102BoundaryError("a102_witness_run_set_invalid");
  if (
    row.sourceRevisionId !== expected.sourceRevisionId
    || row.sourceManifestSha256 !== expected.sourceManifestSha256
    || row.sourceArchiveSha256 !== expected.sourceArchiveSha256
  ) throw new A102BoundaryError("a102_witness_source_binding_invalid");
  const expectedObservationDigest = sha256Text(canonicalJson({
    runReceiptDigests: runDigests,
    sourceArchiveSha256: expected.sourceArchiveSha256,
    sourceManifestSha256: expected.sourceManifestSha256,
    sourceRevisionId: expected.sourceRevisionId,
  }));
  if (row.observationDigest !== expectedObservationDigest) {
    throw new A102BoundaryError("a102_witness_observation_digest_invalid");
  }
  const witnessedAtMs = isoMs(row.witnessedAt, "a102_witness_time_invalid");
  const latestCompletion = Math.max(...runs.map((run) => run.completedAtMs));
  if (
    witnessedAtMs < latestCompletion
    || witnessedAtMs - latestCompletion > policy.maximumWitnessDelaySeconds * 1000
  ) throw new A102BoundaryError("a102_witness_delay_invalid");
  if (runs.some((run) => run.observerOrganizationId === row.organizationId)) {
    throw new A102BoundaryError("a102_witness_not_independent");
  }
  const digest = sha256Text(canonicalJson(core));
  if (row.receiptDigest !== digest) {
    throw new A102BoundaryError("a102_witness_receipt_digest_invalid");
  }
  const trust = trustByKey.get(row.witnessKeyId);
  if (!trust || trust.organizationId !== row.organizationId) {
    throw new A102BoundaryError("a102_witness_key_binding_invalid");
  }
  if (witnessedAtMs < trust.validFromMs || witnessedAtMs > trust.validUntilMs) {
    throw new A102BoundaryError("a102_witness_key_outside_validity");
  }
  const signature = Buffer.from(row.signatureBase64, "base64");
  if (
    signature.length !== 64
    || signature.toString("base64") !== row.signatureBase64
    || !crypto.verify(null, Buffer.from(row.receiptDigest, "ascii"), trust.publicKeyPem, signature)
  ) throw new A102BoundaryError("a102_witness_signature_invalid");
  return Object.freeze({ ...row, witnessedAtMs });
}

export function validateA102ObservationBundle(
  bundle,
  {
    trustRoots,
    nowMs,
    allowSynthetic = false,
  } = {},
) {
  const policy = canonicalPolicy;
  if (
    policy.schemaVersion !== "velmere.pass36.a102.repeated-observation-policy.v2"
    || policy.revisionId
      !== "VELMERE_PASS36_A102R1_OUT_OF_TIME_REPEATED_SLO_VENDOR_EXIT_OBSERVATION_INDEPENDENT_WITNESS_AND_FROZEN_SOURCE_DIVERSITY_TRUTH_BOUNDARY"
    || policy.parentRevisionId
      !== "VELMERE_PASS36_A102R0_OUT_OF_TIME_REPEATED_SLO_VENDOR_EXIT_OBSERVATION_INDEPENDENT_WITNESS_AND_FROZEN_SOURCE_DIVERSITY_TRUTH_BOUNDARY"
    || policy.frozenSourceRevisionId
      !== "VELMERE_PASS36_A101R0_MEASURED_SLO_ERROR_BUDGET_VENDOR_EXIT_AND_RECOVERY_TRUTH_BOUNDARY"
    || policy.checkpointClass !== "ACTION_REQUIRED_NON_PASS"
    || policy.localValidatorMode
      !== "SYNTHETIC_STRUCTURAL_ONLY_REAL_EVIDENCE_REQUIRES_EXTERNAL_VERIFIER"
    || policy.truthBoundary?.syntheticOrFixtureMayReceiveRealCredit !== false
    || policy.truthBoundary?.live !== false
    || policy.truthBoundary?.saleEnabled !== false
    || policy.truthBoundary?.productionApproved !== false
    || policy.truthBoundary?.worldClassProven !== false
  ) throw new A102BoundaryError("a102_canonical_policy_invalid");
  const observation = observationPolicy(policy);
  exactKeys(bundle, [
    "evidenceClass",
    "prerequisites",
    "runs",
    "schemaVersion",
    "sourceArchiveSha256",
    "sourceManifestSha256",
    "sourceRevisionId",
    "witness",
  ], "a102_bundle_fields_invalid");
  if (bundle.schemaVersion !== "velmere.a102.observation-bundle.v1") {
    throw new A102BoundaryError("a102_bundle_schema_invalid");
  }
  if (bundle.evidenceClass === REAL_EVIDENCE_CLASS) {
    throw new A102BoundaryError("a102_real_evidence_requires_external_verifier");
  }
  if (!(allowSynthetic && bundle.evidenceClass === SYNTHETIC_EVIDENCE_CLASS)) {
    throw new A102BoundaryError("a102_bundle_evidence_class_invalid");
  }
  if (!Number.isSafeInteger(nowMs)) {
    throw new A102BoundaryError("a102_now_invalid");
  }
  safeId(bundle.sourceRevisionId, "a102_bundle_source_revision_invalid");
  if (bundle.sourceRevisionId !== policy.frozenSourceRevisionId) {
    throw new A102BoundaryError("a102_bundle_source_authority_mismatch");
  }
  hex64(bundle.sourceManifestSha256, "a102_bundle_source_manifest_invalid");
  hex64(bundle.sourceArchiveSha256, "a102_bundle_source_archive_invalid");
  const requiredRevisions = policy?.requiredPrerequisiteRevisions;
  if (
    !Array.isArray(requiredRevisions)
    || !Array.isArray(bundle.prerequisites)
    || bundle.prerequisites.length !== requiredRevisions.length
  ) throw new A102BoundaryError("a102_prerequisite_denominator_invalid");
  const prerequisitePaths = new Set();
  const prerequisites = bundle.prerequisites.map((row, index) => {
    const validated = validatePrerequisite(
      row,
      requiredRevisions[index],
      policy.requiredRealDecision,
    );
    if (prerequisitePaths.has(validated.path)) {
      throw new A102BoundaryError("a102_prerequisite_path_duplicate");
    }
    prerequisitePaths.add(validated.path);
    return Object.freeze({ ...validated, bytesBound: false });
  });
  if (!Array.isArray(trustRoots) || trustRoots.length < 3) {
    throw new A102BoundaryError("a102_trust_root_denominator_invalid");
  }
  const validatedTrustRoots = trustRoots.map((row) =>
    validateTrustRoot(row, { allowSynthetic }));
  const trustByKey = new Map();
  const trustOrganizations = new Set();
  const trustPublicKeys = new Set();
  const trustAnchorPaths = new Set();
  for (const row of validatedTrustRoots) {
    if (trustByKey.has(row.keyId)) {
      throw new A102BoundaryError("a102_trust_root_duplicate_key");
    }
    if (trustOrganizations.has(row.organizationId)) {
      throw new A102BoundaryError("a102_trust_root_duplicate_organization");
    }
    if (trustPublicKeys.has(row.publicKeySha256)) {
      throw new A102BoundaryError("a102_trust_root_duplicate_public_key");
    }
    if (trustAnchorPaths.has(row.externalAnchorPath)) {
      throw new A102BoundaryError("a102_trust_root_duplicate_anchor_path");
    }
    trustByKey.set(row.keyId, row);
    trustOrganizations.add(row.organizationId);
    trustPublicKeys.add(row.publicKeySha256);
    trustAnchorPaths.add(row.externalAnchorPath);
  }
  if (!Array.isArray(bundle.runs) || bundle.runs.length < observation.minimumRuns) {
    throw new A102BoundaryError("a102_run_denominator_invalid");
  }
  const expected = {
    requiredA101Decision: policy.requiredRealDecision,
    sourceArchiveSha256: bundle.sourceArchiveSha256,
    sourceManifestSha256: bundle.sourceManifestSha256,
    sourceRevisionId: bundle.sourceRevisionId,
  };
  const runs = bundle.runs.map((row) =>
    validateRun(row, trustByKey, observation, expected));
  const sorted = [...runs].sort((left, right) => left.startedAtMs - right.startedAtMs);
  if (new Set(sorted.map((run) => run.runId)).size !== sorted.length) {
    throw new A102BoundaryError("a102_run_id_duplicate");
  }
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (current.startedAtMs <= previous.completedAtMs) {
      throw new A102BoundaryError("a102_run_overlap");
    }
    if (
      current.startedAtMs - previous.startedAtMs
      < observation.minimumGapBetweenRunStartsSeconds * 1000
    ) throw new A102BoundaryError("a102_run_gap_too_short");
  }
  if (
    sorted.at(-1).completedAtMs - sorted[0].startedAtMs
    < observation.minimumObservationSpanSeconds * 1000
  ) throw new A102BoundaryError("a102_observation_span_too_short");
  const uniqueCount = (selector) => new Set(runs.map(selector)).size;
  const diversityChecks = [
    [uniqueCount((row) => row.observerOrganizationId), observation.minimumRunObserverOrganizations, "a102_observer_org_diversity_failed"],
    [uniqueCount((row) => row.observerKeyId), observation.minimumDistinctObserverKeys - 1, "a102_observer_key_diversity_failed"],
    [uniqueCount((row) => row.alternateProviderId), observation.minimumDistinctAlternateProviders, "a102_alternate_provider_diversity_failed"],
    [uniqueCount((row) => row.alternateVendorFamily), observation.minimumDistinctAlternateVendorFamilies, "a102_alternate_vendor_family_diversity_failed"],
    [uniqueCount((row) => row.alternateControlPlane), observation.minimumDistinctAlternateControlPlanes, "a102_alternate_control_plane_diversity_failed"],
    [uniqueCount((row) => row.alternateFailureDomain), observation.minimumDistinctAlternateFailureDomains, "a102_alternate_failure_domain_diversity_failed"],
  ];
  for (const [actual, minimum, code] of diversityChecks) {
    if (actual < minimum) throw new A102BoundaryError(code);
  }
  const witness = validateWitness(
    bundle.witness,
    sorted,
    trustByKey,
    observation,
    expected,
  );
  const allOrganizations = new Set([
    ...runs.map((row) => row.observerOrganizationId),
    witness.organizationId,
  ]);
  const allKeys = new Set([...runs.map((row) => row.observerKeyId), witness.witnessKeyId]);
  if (
    allOrganizations.size
    < observation.minimumRunObserverOrganizations
      + observation.minimumAggregateWitnessOrganizations
  ) throw new A102BoundaryError("a102_total_observer_org_diversity_failed");
  if (allKeys.size < observation.minimumDistinctObserverKeys) {
    throw new A102BoundaryError("a102_total_observer_key_diversity_failed");
  }
  const clockSkewMs = observation.maximumClockSkewSeconds * 1000;
  if (witness.witnessedAtMs > nowMs + clockSkewMs) {
    throw new A102BoundaryError("a102_witness_from_future");
  }
  return Object.freeze({
    decision: "STRUCTURAL_SYNTHETIC_TEST_ONLY",
    structuralVerified: true,
    referencedFilesReadAndHashed: false,
    realCreditEligible: false,
    externalPromotionReviewRequired: true,
    continuousMonitoringProven: false,
    productionSloProven: false,
    runCount: runs.length,
    observationSpanSeconds:
      (sorted.at(-1).completedAtMs - sorted[0].startedAtMs) / 1000,
    runObserverOrganizations: uniqueCount((row) => row.observerOrganizationId),
    totalObserverOrganizations: allOrganizations.size,
    distinctObserverKeys: allKeys.size,
    distinctAlternateProviders: uniqueCount((row) => row.alternateProviderId),
    prerequisites: prerequisites.length,
    observationDigest: witness.observationDigest,
  });
}
