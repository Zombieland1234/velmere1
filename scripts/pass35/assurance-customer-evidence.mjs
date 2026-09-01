#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_CANDIDATE = "VELMERE_PASS35_OFFLINE_CANDIDATE_R3";
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[a-z0-9][a-z0-9._:@/-]{7,159}$/u;
const FAKE_OR_LOCAL = /(?:^|[^a-z])(local(?:host)?|fixture|synthetic|mock|offline|sample|demo|test-only)(?:[^a-z]|$)/iu;
const TOP_KEYS = new Set(["schemaVersion", "candidateId", "subjectOrganizationIdHash", "sourceArchiveSha256", "evidenceIndexSha256", "evidenceClass", "fixture", "synthetic", "assuranceReports", "customerCohorts"]);
const COMMON_KEYS = new Set(["sourceUri", "artifactSha256", "issuedAt", "expiresAt", "ttlSeconds", "fixture", "synthetic", "locallyAuthored", "issuer", "signatureReference"]);
const REPORT_KEYS = new Set(["reportId", "reportType", "framework", "scope", "verdict", "openCriticalFindings", "openHighFindings", "findingRegisterSha256", ...COMMON_KEYS]);
const COHORT_KEYS = new Set(["cohortId", "customerOrganizationIdHash", "realCustomers", "consentVerified", "consentRegisterSha256", "participantCount", "periodStart", "periodEnd", "retentionWindowDays", "outcome", "operations", "stopRule", ...COMMON_KEYS]);
const ISSUER_KEYS = new Set(["issuerIdHash", "organizationIdHash", "independent", "conflictOfInterest"]);
const SIGNATURE_KEYS = new Set(["referenceUri", "algorithm", "keyId", "signatureSha256", "signedPayloadSha256", "verificationReceiptSha256", "verifiedAt", "verificationStatus"]);
const OUTCOME_KEYS = new Set(["metricId", "direction", "unit", "baseline", "followup", "threshold", "targetMet", "observationCount", "evidenceSha256"]);
const OPERATIONS_KEYS = new Set(["retainedCount", "supportTicketCount", "refundCount", "incidentCount", "evidenceSha256"]);
const STOP_KEYS = new Set(["triggered", "decision", "reason", "evidenceSha256"]);

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const unknownKeys = (value, allowed) => isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)).sort() : [];

function canonicalInstant(value) {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) return null;
  return time;
}

function externalUri(value, schemes) {
  if (typeof value !== "string" || value.length < 12 || value.length > 2048 || FAKE_OR_LOCAL.test(value)) return false;
  try {
    const parsed = new URL(value);
    return schemes.includes(parsed.protocol) && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1" && parsed.hostname !== "::1";
  } catch {
    return false;
  }
}

function validatePolicy(policy) {
  const errors = [];
  if (!isRecord(policy) || policy.schemaVersion !== "velmere.pass35.assurance-customer-evidence-policy.v1") errors.push("policy_schema_invalid");
  if (policy?.candidateId !== EXPECTED_CANDIDATE) errors.push("policy_candidate_invalid");
  const expectedTypes = ["ACCESSIBILITY", "AI_DATA_GOVERNANCE", "CLEAN_PACKAGE", "SECURITY"];
  if (!Array.isArray(policy?.requiredAssuranceReportTypes) || [...policy.requiredAssuranceReportTypes].sort().join("|") !== expectedTypes.join("|")) errors.push("policy_assurance_types_invalid");
  if (policy?.requiredCustomerCohorts !== 2) errors.push("policy_cohort_count_invalid");
  if (!Number.isInteger(policy?.minimumCohortRetentionDays) || policy.minimumCohortRetentionDays < 30) errors.push("policy_retention_invalid");
  if (!Number.isInteger(policy?.maximumEvidenceTtlSeconds) || policy.maximumEvidenceTtlSeconds < 86400) errors.push("policy_ttl_invalid");
  if (!Number.isInteger(policy?.maximumInputBytes) || policy.maximumInputBytes < 1024 || policy.maximumInputBytes > 8_388_608) errors.push("policy_input_limit_invalid");
  if (!Array.isArray(policy?.acceptedSignatureReferenceSchemes) || policy.acceptedSignatureReferenceSchemes.length < 1) errors.push("policy_signature_schemes_invalid");
  if (policy?.metadataAloneMayIncrementVerifiedDenominator !== false || policy?.metadataAloneMayAllowPromotion !== false) errors.push("policy_fail_closed_invalid");
  return errors;
}

export function loadAssuranceCustomerPolicy(root = process.cwd()) {
  const policy = JSON.parse(readFileSync(path.join(path.resolve(root), "config/pass35/assurance-customer-evidence-policy.json"), "utf8"));
  const errors = validatePolicy(policy);
  if (errors.length) throw new Error(`assurance_customer_policy_invalid:${errors.join("|")}`);
  return policy;
}

function validateCommon(record, prefix, evaluatedAt, subjectOrganizationIdHash, policy, errors) {
  const fail = (condition, code) => { if (!condition) errors.push(`${prefix}:${code}`); };
  fail(record.fixture === false, "fixture_must_be_false");
  fail(record.synthetic === false, "synthetic_must_be_false");
  fail(record.locallyAuthored === false, "locally_authored_must_be_false");
  fail(externalUri(record.sourceUri, ["https:", "urn:"]), "source_uri_not_external");
  fail(SHA256.test(record.artifactSha256 ?? ""), "artifact_sha256_invalid");
  const issuedAt = canonicalInstant(record.issuedAt);
  const expiresAt = canonicalInstant(record.expiresAt);
  fail(issuedAt !== null, "issued_at_invalid");
  fail(expiresAt !== null, "expires_at_invalid");
  fail(Number.isInteger(record.ttlSeconds) && record.ttlSeconds >= 300 && record.ttlSeconds <= policy.maximumEvidenceTtlSeconds, "ttl_invalid");
  if (issuedAt !== null) fail(issuedAt <= evaluatedAt + policy.clockSkewSeconds * 1000, "issued_in_future");
  if (expiresAt !== null) fail(expiresAt > evaluatedAt, "expired");
  if (issuedAt !== null && expiresAt !== null && Number.isInteger(record.ttlSeconds)) fail(expiresAt === issuedAt + record.ttlSeconds * 1000, "ttl_binding_invalid");

  const issuer = record.issuer;
  fail(isRecord(issuer), "issuer_missing");
  if (isRecord(issuer)) {
    for (const key of unknownKeys(issuer, ISSUER_KEYS)) errors.push(`${prefix}:issuer_unknown_field:${key}`);
    fail(SHA256.test(issuer.issuerIdHash ?? ""), "issuer_id_hash_invalid");
    fail(SHA256.test(issuer.organizationIdHash ?? ""), "issuer_organization_hash_invalid");
    fail(issuer.organizationIdHash !== subjectOrganizationIdHash, "issuer_not_independent_from_subject");
    fail(issuer.independent === true, "issuer_independence_missing");
    fail(issuer.conflictOfInterest === false, "issuer_conflict_not_clear");
  }

  const signature = record.signatureReference;
  fail(isRecord(signature), "signature_reference_missing");
  if (isRecord(signature)) {
    for (const key of unknownKeys(signature, SIGNATURE_KEYS)) errors.push(`${prefix}:signature_unknown_field:${key}`);
    fail(externalUri(signature.referenceUri, policy.acceptedSignatureReferenceSchemes), "signature_uri_not_external");
    fail(["ED25519", "ECDSA_P256_SHA256", "RSA_PSS_SHA256"].includes(signature.algorithm), "signature_algorithm_invalid");
    fail(typeof signature.keyId === "string" && SAFE_ID.test(signature.keyId) && !FAKE_OR_LOCAL.test(signature.keyId), "signature_key_id_invalid");
    fail(SHA256.test(signature.signatureSha256 ?? ""), "signature_sha256_invalid");
    fail(signature.signedPayloadSha256 === record.artifactSha256, "signature_payload_not_bound");
    fail(SHA256.test(signature.verificationReceiptSha256 ?? ""), "signature_verification_receipt_invalid");
    fail(signature.verificationStatus === "EXTERNAL_REFERENCE_REPORTED_VERIFIED", "signature_status_invalid");
    const verifiedAt = canonicalInstant(signature.verifiedAt);
    fail(verifiedAt !== null, "signature_verified_at_invalid");
    if (verifiedAt !== null && issuedAt !== null) fail(verifiedAt >= issuedAt, "signature_verified_before_issue");
    if (verifiedAt !== null) fail(verifiedAt <= evaluatedAt + policy.clockSkewSeconds * 1000, "signature_verified_in_future");
  }
}

export function evaluateAssuranceCustomerEvidence(envelope, { now = new Date().toISOString(), policy = null } = {}) {
  const activePolicy = policy ?? loadAssuranceCustomerPolicy();
  const policyErrors = validatePolicy(activePolicy);
  if (policyErrors.length) throw new Error(`assurance_customer_policy_invalid:${policyErrors.join("|")}`);
  const evaluatedAt = canonicalInstant(now);
  if (evaluatedAt === null) throw new Error("assurance_customer_evaluation_time_invalid");
  const errors = [];
  const fail = (condition, code) => { if (!condition) errors.push(code); };
  fail(isRecord(envelope), "envelope:not_object");
  if (!isRecord(envelope)) envelope = {};
  for (const key of unknownKeys(envelope, TOP_KEYS)) errors.push(`envelope:unknown_field:${key}`);
  fail(envelope.schemaVersion === "velmere.pass35.assurance-customer-evidence.v1", "envelope:schema_invalid");
  fail(envelope.candidateId === activePolicy.candidateId, "envelope:candidate_invalid");
  fail(envelope.evidenceClass === "REAL_EXTERNAL", "envelope:evidence_class_invalid");
  fail(envelope.fixture === false, "envelope:fixture_must_be_false");
  fail(envelope.synthetic === false, "envelope:synthetic_must_be_false");
  fail(SHA256.test(envelope.subjectOrganizationIdHash ?? ""), "envelope:subject_organization_hash_invalid");
  fail(SHA256.test(envelope.sourceArchiveSha256 ?? ""), "envelope:source_archive_sha256_invalid");
  fail(SHA256.test(envelope.evidenceIndexSha256 ?? ""), "envelope:evidence_index_sha256_invalid");

  const reports = Array.isArray(envelope.assuranceReports) ? envelope.assuranceReports : [];
  fail(Array.isArray(envelope.assuranceReports), "assurance:reports_not_array");
  fail(reports.length === activePolicy.requiredAssuranceReportTypes.length, `assurance:report_count_not_exact:${reports.length}`);
  const reportTypes = new Set();
  const reportIds = new Set();
  for (const [index, report] of reports.entries()) {
    const prefix = `assurance[${index}]`;
    if (!isRecord(report)) {
      errors.push(`${prefix}:not_object`);
      continue;
    }
    for (const key of unknownKeys(report, REPORT_KEYS)) errors.push(`${prefix}:unknown_field:${key}`);
    fail(typeof report.reportId === "string" && SAFE_ID.test(report.reportId), `${prefix}:report_id_invalid`);
    fail(!reportIds.has(report.reportId), `${prefix}:duplicate_report_id`);
    reportIds.add(report.reportId);
    fail(activePolicy.requiredAssuranceReportTypes.includes(report.reportType), `${prefix}:report_type_invalid`);
    fail(!reportTypes.has(report.reportType), `${prefix}:duplicate_report_type`);
    reportTypes.add(report.reportType);
    fail(typeof report.framework === "string" && report.framework.trim().length >= 3, `${prefix}:framework_missing`);
    fail(typeof report.scope === "string" && report.scope.trim().length >= 8, `${prefix}:scope_missing`);
    fail(report.verdict === "PASS_WITH_NO_OPEN_RELEASE_BLOCKERS", `${prefix}:verdict_not_pass`);
    fail(report.openCriticalFindings === 0, `${prefix}:critical_findings_open`);
    fail(report.openHighFindings === 0, `${prefix}:high_findings_open`);
    fail(SHA256.test(report.findingRegisterSha256 ?? ""), `${prefix}:finding_register_sha256_invalid`);
    validateCommon(report, prefix, evaluatedAt, envelope.subjectOrganizationIdHash, activePolicy, errors);
  }
  fail(activePolicy.requiredAssuranceReportTypes.every((type) => reportTypes.has(type)), "assurance:required_type_set_incomplete");

  const cohorts = Array.isArray(envelope.customerCohorts) ? envelope.customerCohorts : [];
  fail(Array.isArray(envelope.customerCohorts), "cohorts:not_array");
  fail(cohorts.length === activePolicy.requiredCustomerCohorts, `cohorts:count_not_exact:${cohorts.length}`);
  const cohortIds = new Set();
  const customerOrganizations = new Set();
  for (const [index, cohort] of cohorts.entries()) {
    const prefix = `cohorts[${index}]`;
    if (!isRecord(cohort)) {
      errors.push(`${prefix}:not_object`);
      continue;
    }
    for (const key of unknownKeys(cohort, COHORT_KEYS)) errors.push(`${prefix}:unknown_field:${key}`);
    fail(typeof cohort.cohortId === "string" && SAFE_ID.test(cohort.cohortId), `${prefix}:cohort_id_invalid`);
    fail(!cohortIds.has(cohort.cohortId), `${prefix}:duplicate_cohort_id`);
    cohortIds.add(cohort.cohortId);
    fail(SHA256.test(cohort.customerOrganizationIdHash ?? ""), `${prefix}:customer_organization_hash_invalid`);
    fail(!customerOrganizations.has(cohort.customerOrganizationIdHash), `${prefix}:customer_organization_duplicate`);
    customerOrganizations.add(cohort.customerOrganizationIdHash);
    fail(cohort.customerOrganizationIdHash !== envelope.subjectOrganizationIdHash, `${prefix}:customer_is_subject_organization`);
    fail(cohort.realCustomers === true, `${prefix}:real_customers_not_confirmed`);
    fail(cohort.consentVerified === true, `${prefix}:consent_not_verified`);
    fail(SHA256.test(cohort.consentRegisterSha256 ?? ""), `${prefix}:consent_register_sha256_invalid`);
    fail(Number.isInteger(cohort.participantCount) && cohort.participantCount > 0, `${prefix}:participant_count_invalid`);
    const periodStart = canonicalInstant(cohort.periodStart);
    const periodEnd = canonicalInstant(cohort.periodEnd);
    fail(periodStart !== null, `${prefix}:period_start_invalid`);
    fail(periodEnd !== null, `${prefix}:period_end_invalid`);
    fail(Number.isInteger(cohort.retentionWindowDays) && cohort.retentionWindowDays >= activePolicy.minimumCohortRetentionDays, `${prefix}:retention_window_too_short`);
    if (periodStart !== null && periodEnd !== null && Number.isInteger(cohort.retentionWindowDays)) {
      fail(periodEnd - periodStart >= cohort.retentionWindowDays * 86_400_000, `${prefix}:retention_period_not_observed`);
    }

    const outcome = cohort.outcome;
    fail(isRecord(outcome), `${prefix}:outcome_missing`);
    if (isRecord(outcome)) {
      for (const key of unknownKeys(outcome, OUTCOME_KEYS)) errors.push(`${prefix}:outcome_unknown_field:${key}`);
      fail(typeof outcome.metricId === "string" && SAFE_ID.test(outcome.metricId), `${prefix}:outcome_metric_invalid`);
      fail(["HIGHER_IS_BETTER", "LOWER_IS_BETTER"].includes(outcome.direction), `${prefix}:outcome_direction_invalid`);
      fail(typeof outcome.unit === "string" && outcome.unit.trim().length > 0, `${prefix}:outcome_unit_missing`);
      for (const field of ["baseline", "followup", "threshold"]) fail(Number.isFinite(outcome[field]), `${prefix}:outcome_${field}_invalid`);
      fail(typeof outcome.targetMet === "boolean", `${prefix}:outcome_target_met_invalid`);
      fail(outcome.observationCount === cohort.participantCount, `${prefix}:outcome_observation_count_mismatch`);
      fail(SHA256.test(outcome.evidenceSha256 ?? ""), `${prefix}:outcome_evidence_sha256_invalid`);
    }

    const operations = cohort.operations;
    fail(isRecord(operations), `${prefix}:operations_missing`);
    if (isRecord(operations)) {
      for (const key of unknownKeys(operations, OPERATIONS_KEYS)) errors.push(`${prefix}:operations_unknown_field:${key}`);
      for (const field of ["retainedCount", "supportTicketCount", "refundCount", "incidentCount"]) fail(Number.isInteger(operations[field]) && operations[field] >= 0, `${prefix}:operations_${field}_invalid`);
      fail(operations.retainedCount <= cohort.participantCount, `${prefix}:retained_count_exceeds_cohort`);
      fail(operations.refundCount <= cohort.participantCount, `${prefix}:refund_count_exceeds_cohort`);
      fail(SHA256.test(operations.evidenceSha256 ?? ""), `${prefix}:operations_evidence_sha256_invalid`);
    }

    const stopRule = cohort.stopRule;
    fail(isRecord(stopRule), `${prefix}:stop_rule_missing`);
    if (isRecord(stopRule)) {
      for (const key of unknownKeys(stopRule, STOP_KEYS)) errors.push(`${prefix}:stop_rule_unknown_field:${key}`);
      fail(typeof stopRule.triggered === "boolean", `${prefix}:stop_rule_triggered_invalid`);
      fail(["CONTINUE", "PIVOT", "KILL"].includes(stopRule.decision), `${prefix}:stop_rule_decision_invalid`);
      fail(typeof stopRule.reason === "string" && stopRule.reason.trim().length >= 3, `${prefix}:stop_rule_reason_missing`);
      fail(SHA256.test(stopRule.evidenceSha256 ?? ""), `${prefix}:stop_rule_evidence_sha256_invalid`);
      if (stopRule.triggered === true) fail(stopRule.decision !== "CONTINUE", `${prefix}:triggered_stop_rule_cannot_continue`);
    }
    validateCommon(cohort, prefix, evaluatedAt, envelope.subjectOrganizationIdHash, activePolicy, errors);
  }

  const structurallyEligible = errors.length === 0;
  return {
    schemaVersion: "velmere.pass35.assurance-customer-evidence-evaluation.v1",
    candidateId: activePolicy.candidateId,
    evaluatedAt: now,
    status: structurallyEligible ? "PASS_METADATA_STRUCTURE_REQUIRES_CRYPTOGRAPHIC_VERIFICATION" : "FAIL_CLOSED_ZERO_CREDIT",
    structurallyEligible,
    assuranceReports: { required: 4, observed: reports.length, structurallyEligible: structurallyEligible ? 4 : 0, verified: 0 },
    customerCohorts: { required: 2, observed: cohorts.length, structurallyEligible: structurallyEligible ? 2 : 0, verified: 0 },
    verifiedDenominatorIncrement: 0,
    promotionCreditGranted: false,
    promotionAllowed: false,
    errors: [...new Set(errors)].sort(),
    truthBoundary: "A structural PASS validates bounded aggregate metadata and external signature references only. It does not verify signatures, customer reality, consent, assurance independence or outcomes cryptographically; verified credit remains zero until an authorized external verifier dereferences and validates the evidence.",
  };
}

function parseArgs(argv) {
  if (!(argv.length === 2 || argv.length === 4) || argv[0] !== "--input" || (argv.length === 4 && argv[2] !== "--now")) {
    throw new Error("usage: assurance-customer-evidence.mjs --input <json> [--now <canonical-ISO>]");
  }
  return { input: argv[1], now: argv[3] ?? new Date().toISOString() };
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const policy = loadAssuranceCustomerPolicy();
  const inputPath = path.resolve(args.input);
  const metadata = lstatSync(inputPath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("assurance_customer_input_must_be_regular_non_symlink_file");
  if (metadata.size <= 0 || metadata.size > policy.maximumInputBytes) throw new Error("assurance_customer_input_size_invalid");
  const source = readFileSync(inputPath, "utf8");
  const result = evaluateAssuranceCustomerEvidence(JSON.parse(source), { now: args.now, policy });
  console.log(JSON.stringify({ ...result, inputSha256: sha256(source) }, null, 2));
  if (!result.structurallyEligible) process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try { runCli(); }
  catch (error) {
    console.error(JSON.stringify({
      schemaVersion: "velmere.pass35.assurance-customer-evidence-evaluation.v1",
      status: "FAIL_CLOSED_ZERO_CREDIT",
      verifiedDenominatorIncrement: 0,
      promotionAllowed: false,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  }
}
