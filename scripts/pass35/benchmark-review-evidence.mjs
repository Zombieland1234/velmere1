#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT_PATH), "../..");
const POLICY_PATH = path.join(ROOT, "config/pass35/benchmark-review-policy.json");

export const BENCHMARK_REVIEW_POLICY = JSON.parse(
  readFileSync(POLICY_PATH, "utf8"),
);

const SHA256 = /^[a-f0-9]{64}$/u;
const LOCAL_OR_FAKE = /(?:^|[^a-z])(local(?:host)?|fixture|synthetic|mock|offline|sample|demo)(?:[^a-z]|$)/iu;
const MAX_REPORTED_ERRORS = 256;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validIso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function canonicalHash(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function sortedByIdentity(rows, key) {
  return [...rows].sort((left, right) =>
    text(left?.[key]).localeCompare(text(right?.[key]), "en"),
  );
}

export function benchmarkRowSetSha256(rows) {
  return canonicalHash(sortedByIdentity(Array.isArray(rows) ? rows : [], "rowId"));
}

export function nativeReviewCaseSetSha256(cases) {
  return canonicalHash(sortedByIdentity(Array.isArray(cases) ? cases : [], "caseId"));
}

export function splitRowIdsSha256(rowIds) {
  return canonicalHash([...new Set(rowIds)].sort());
}

function validatePolicy(policy) {
  if (!isRecord(policy) || policy.schemaVersion !== "velmere.pass35.benchmark-review-policy.v1") {
    throw new Error("pass35_benchmark_review_policy_invalid");
  }
  if (!Number.isInteger(policy.benchmark?.requiredRows) || policy.benchmark.requiredRows !== 2700) {
    throw new Error("pass35_benchmark_review_policy_invalid:benchmark_rows");
  }
  if (!Number.isInteger(policy.nativeReview?.requiredCases) || policy.nativeReview.requiredCases !== 300) {
    throw new Error("pass35_benchmark_review_policy_invalid:native_review_cases");
  }
  if (!Array.isArray(policy.benchmark.requiredSplitIds) || policy.benchmark.requiredSplitIds.length < 3) {
    throw new Error("pass35_benchmark_review_policy_invalid:splits");
  }
  if (!Array.isArray(policy.nativeReview.requiredLocales) || policy.nativeReview.requiredLocales.length < 1) {
    throw new Error("pass35_benchmark_review_policy_invalid:locales");
  }
}

validatePolicy(BENCHMARK_REVIEW_POLICY);

function validExternalRef(value, policy) {
  const ref = text(value);
  return (
    ref.length >= 16 &&
    !LOCAL_OR_FAKE.test(ref) &&
    policy.allowedSignatureSchemes.some((scheme) => ref.startsWith(scheme))
  );
}

function validExternalIdentity(value) {
  const identity = text(value);
  return identity.length >= 3 && !LOCAL_OR_FAKE.test(identity);
}

function validateEvidenceWindow({
  issuedAt,
  expiresAt,
  evaluatedAtMs,
  ttlDays,
  maxClockSkewMinutes,
  prefix,
  fail,
}) {
  if (!validIso(issuedAt)) fail(`${prefix}:issued_at_invalid`);
  if (!validIso(expiresAt)) fail(`${prefix}:expires_at_invalid`);
  if (!validIso(issuedAt) || !validIso(expiresAt)) return;
  const issuedMs = Date.parse(issuedAt);
  const expiresMs = Date.parse(expiresAt);
  if (issuedMs > evaluatedAtMs + maxClockSkewMinutes * 60_000) {
    fail(`${prefix}:issued_at_future`);
  }
  if (expiresMs <= evaluatedAtMs) fail(`${prefix}:expired`);
  if (expiresMs <= issuedMs) fail(`${prefix}:invalid_ttl_order`);
  if (expiresMs - issuedMs > ttlDays * 86_400_000) {
    fail(`${prefix}:ttl_exceeds_policy`);
  }
}

function validateRealEvidenceFlags(value, prefix, fail) {
  if (!isRecord(value)) {
    fail(`${prefix}:not_object`);
    return;
  }
  if (value.fixture !== false) fail(`${prefix}:fixture_not_explicitly_false`);
  if (value.synthetic !== false) fail(`${prefix}:synthetic_not_explicitly_false`);
}

function validateHash(value, prefix, fail) {
  if (!SHA256.test(text(value))) fail(`${prefix}:sha256_invalid`);
}

function validateSignature(value, prefix, fail, policy) {
  if (!validExternalRef(value, policy)) fail(`${prefix}:external_signature_ref_invalid`);
}

function validateExternalEnvironment(value, prefix, fail) {
  if (!validExternalIdentity(value) || !/external|independent|production|staging/iu.test(text(value))) {
    fail(`${prefix}:environment_not_external`);
  }
}

export function evaluateBenchmarkReviewEvidence(
  evidence,
  { now = new Date().toISOString(), policy = BENCHMARK_REVIEW_POLICY } = {},
) {
  validatePolicy(policy);
  const errors = [];
  let errorsTruncated = 0;
  let rootFailed = false;
  let benchmarkFailed = false;
  let nativeReviewFailed = false;
  const addError = (scope, code) => {
    if (scope === "root") rootFailed = true;
    if (scope === "benchmark") benchmarkFailed = true;
    if (scope === "nativeReview") nativeReviewFailed = true;
    if (errors.length < MAX_REPORTED_ERRORS) errors.push(`${scope}:${code}`);
    else errorsTruncated += 1;
  };
  const rootFail = (code) => addError("root", code);
  const benchmarkFail = (code) => addError("benchmark", code);
  const nativeReviewFail = (code) => addError("nativeReview", code);

  if (!validIso(now)) rootFail("evaluated_at_invalid");
  const evaluatedAtMs = validIso(now) ? Date.parse(now) : Number.POSITIVE_INFINITY;
  const clock = {
    evaluatedAtMs,
    maxClockSkewMinutes: policy.maxClockSkewMinutes,
  };

  if (!isRecord(evidence)) {
    rootFail("evidence_not_object");
    evidence = {};
  }
  if (evidence.schemaVersion !== "velmere.pass35.benchmark-native-review-evidence.v1") {
    rootFail("schema_invalid");
  }
  if (evidence.candidateId !== policy.candidateId) rootFail("candidate_mismatch");
  if (evidence.evidenceClass !== "REAL_EXTERNAL") rootFail("evidence_class_not_real_external");
  validateRealEvidenceFlags(evidence, "package", rootFail);
  validateExternalEnvironment(evidence.environment, "package", rootFail);
  validateSignature(evidence.detachedSignatureRef, "package", rootFail, policy);

  const organizations = evidence.organizations;
  if (!isRecord(organizations)) rootFail("organizations_missing");
  const organizationIds = {
    productOwner: text(organizations?.productOwnerOrganizationId),
    modelAuthor: text(organizations?.modelAuthorOrganizationId),
    corpusProducer: text(organizations?.corpusProducerOrganizationId),
  };
  for (const [role, organizationId] of Object.entries(organizationIds)) {
    if (!validExternalIdentity(organizationId)) rootFail(`organization_invalid:${role}`);
  }

  const benchmark = evidence.benchmark;
  if (!isRecord(benchmark)) benchmarkFail("missing");
  validateRealEvidenceFlags(benchmark, "benchmark", benchmarkFail);
  validateSignature(benchmark?.detachedSignatureRef, "benchmark", benchmarkFail, policy);
  const corpus = benchmark?.corpus;
  if (!isRecord(corpus)) benchmarkFail("corpus_missing");
  validateRealEvidenceFlags(corpus, "corpus", benchmarkFail);
  if (corpus?.evidenceClass !== "REAL_EXTERNAL_CORPUS") {
    benchmarkFail("corpus:evidence_class_invalid");
  }
  for (const field of ["corpusId", "version", "originOrganizationId"]) {
    if (!validExternalIdentity(corpus?.[field])) benchmarkFail(`corpus:${field}_invalid`);
  }
  for (const field of ["corpusSha256", "identityDocumentSha256", "sourceManifestSha256"]) {
    validateHash(corpus?.[field], `corpus:${field}`, benchmarkFail);
  }
  validateSignature(corpus?.signatureRef, "corpus", benchmarkFail, policy);
  validateEvidenceWindow({
    issuedAt: corpus?.issuedAt,
    expiresAt: corpus?.expiresAt,
    ttlDays: policy.benchmark.ttlDays,
    prefix: "corpus",
    fail: benchmarkFail,
    ...clock,
  });

  const requiredRows = policy.benchmark.requiredRows;
  const rows = Array.isArray(benchmark?.rows) ? benchmark.rows : [];
  if (!Array.isArray(benchmark?.rows)) benchmarkFail("rows_not_array");
  if (rows.length !== requiredRows) benchmarkFail(`row_count_not_exact:${rows.length}/${requiredRows}`);
  const requiredSplits = new Set(policy.benchmark.requiredSplitIds);
  const rowIds = new Set();
  const leakageGroupToSplit = new Map();
  const rowById = new Map();
  const splitMembers = new Map(
    [...requiredSplits].map((splitId) => [
      splitId,
      { rowIds: [], leakageGroupIds: new Set() },
    ]),
  );

  for (const [index, row] of rows.entries()) {
    const prefix = `rows[${index}]`;
    if (!isRecord(row)) {
      benchmarkFail(`${prefix}:not_object`);
      continue;
    }
    validateRealEvidenceFlags(row, prefix, benchmarkFail);
    const rowId = text(row.rowId);
    const splitId = text(row.splitId);
    const leakageGroupId = text(row.leakageGroupId);
    if (!validExternalIdentity(rowId)) benchmarkFail(`${prefix}:row_id_invalid`);
    if (rowIds.has(rowId)) benchmarkFail(`${prefix}:duplicate_row_id`);
    else {
      rowIds.add(rowId);
      rowById.set(rowId, row);
    }
    if (!requiredSplits.has(splitId)) benchmarkFail(`${prefix}:split_invalid`);
    if (!validExternalIdentity(leakageGroupId)) benchmarkFail(`${prefix}:leakage_group_invalid`);
    const previousSplit = leakageGroupToSplit.get(leakageGroupId);
    if (previousSplit && previousSplit !== splitId) {
      benchmarkFail(`${prefix}:leakage_group_crosses_splits`);
    } else if (leakageGroupId) {
      leakageGroupToSplit.set(leakageGroupId, splitId);
    }
    if (splitMembers.has(splitId)) {
      splitMembers.get(splitId).rowIds.push(rowId);
      splitMembers.get(splitId).leakageGroupIds.add(leakageGroupId);
    }
    for (const field of ["sourceId", "providerId", "modelId", "renderId", "reviewProtocolId"]) {
      if (!validExternalIdentity(row[field])) benchmarkFail(`${prefix}:${field}_invalid`);
    }
    for (const field of ["sourceSha256", "outputSha256", "groundTruthSha256"]) {
      validateHash(row[field], `${prefix}:${field}`, benchmarkFail);
    }
    validateSignature(row.signatureRef, prefix, benchmarkFail, policy);
    validateEvidenceWindow({
      issuedAt: row.observedAt,
      expiresAt: row.expiresAt,
      ttlDays: policy.benchmark.ttlDays,
      prefix,
      fail: benchmarkFail,
      ...clock,
    });
  }

  validateHash(benchmark?.rowSetSha256, "benchmark:rowSetSha256", benchmarkFail);
  if (SHA256.test(text(benchmark?.rowSetSha256)) && benchmark.rowSetSha256 !== benchmarkRowSetSha256(rows)) {
    benchmarkFail("row_set_hash_mismatch");
  }

  const splits = Array.isArray(benchmark?.splits) ? benchmark.splits : [];
  if (!Array.isArray(benchmark?.splits)) benchmarkFail("splits_not_array");
  if (splits.length !== requiredSplits.size) benchmarkFail("split_count_not_exact");
  const seenSplits = new Set();
  for (const [index, split] of splits.entries()) {
    const prefix = `splits[${index}]`;
    if (!isRecord(split)) {
      benchmarkFail(`${prefix}:not_object`);
      continue;
    }
    const splitId = text(split.splitId);
    if (!requiredSplits.has(splitId)) benchmarkFail(`${prefix}:split_id_invalid`);
    if (seenSplits.has(splitId)) benchmarkFail(`${prefix}:duplicate_split_id`);
    seenSplits.add(splitId);
    const members = splitMembers.get(splitId) ?? { rowIds: [], leakageGroupIds: new Set() };
    validateHash(split.rowIdsSha256, `${prefix}:rowIdsSha256`, benchmarkFail);
    validateHash(split.leakageGroupIdsSha256, `${prefix}:leakageGroupIdsSha256`, benchmarkFail);
    if (SHA256.test(text(split.rowIdsSha256)) && split.rowIdsSha256 !== splitRowIdsSha256(members.rowIds)) {
      benchmarkFail(`${prefix}:row_membership_hash_mismatch`);
    }
    if (
      SHA256.test(text(split.leakageGroupIdsSha256)) &&
      split.leakageGroupIdsSha256 !== splitRowIdsSha256([...members.leakageGroupIds])
    ) {
      benchmarkFail(`${prefix}:leakage_membership_hash_mismatch`);
    }
    validateSignature(split.signatureRef, prefix, benchmarkFail, policy);
    if (members.rowIds.length === 0) benchmarkFail(`${prefix}:empty_split`);
  }
  for (const splitId of requiredSplits) {
    if (!seenSplits.has(splitId)) benchmarkFail(`split_missing:${splitId}`);
  }

  const nativeReview = evidence.nativeReview;
  if (!isRecord(nativeReview)) nativeReviewFail("missing");
  validateRealEvidenceFlags(nativeReview, "nativeReview", nativeReviewFail);
  validateSignature(nativeReview?.detachedSignatureRef, "nativeReview", nativeReviewFail, policy);
  const program = nativeReview?.program;
  if (!isRecord(program)) nativeReviewFail("program_missing");
  validateRealEvidenceFlags(program, "reviewProgram", nativeReviewFail);
  if (program?.evidenceClass !== "REAL_EXTERNAL_NATIVE_REVIEW") {
    nativeReviewFail("reviewProgram:evidence_class_invalid");
  }
  for (const field of ["programId", "organizationId"]) {
    if (!validExternalIdentity(program?.[field])) nativeReviewFail(`reviewProgram:${field}_invalid`);
  }
  for (const field of ["protocolSha256", "sourceManifestSha256"]) {
    validateHash(program?.[field], `reviewProgram:${field}`, nativeReviewFail);
  }
  validateSignature(program?.signatureRef, "reviewProgram", nativeReviewFail, policy);
  validateEvidenceWindow({
    issuedAt: program?.issuedAt,
    expiresAt: program?.expiresAt,
    ttlDays: policy.nativeReview.ttlDays,
    prefix: "reviewProgram",
    fail: nativeReviewFail,
    ...clock,
  });

  const requiredCases = policy.nativeReview.requiredCases;
  const cases = Array.isArray(nativeReview?.cases) ? nativeReview.cases : [];
  if (!Array.isArray(nativeReview?.cases)) nativeReviewFail("cases_not_array");
  if (cases.length !== requiredCases) nativeReviewFail(`case_count_not_exact:${cases.length}/${requiredCases}`);
  const requiredLocales = new Set(policy.nativeReview.requiredLocales);
  const observedLocales = new Set();
  const caseIds = new Set();
  const reviewedBenchmarkRows = new Set();
  const disallowedReviewerOrganizations = new Set(
    [...Object.values(organizationIds), text(corpus?.originOrganizationId)].filter(Boolean),
  );

  for (const [index, reviewCase] of cases.entries()) {
    const prefix = `cases[${index}]`;
    if (!isRecord(reviewCase)) {
      nativeReviewFail(`${prefix}:not_object`);
      continue;
    }
    validateRealEvidenceFlags(reviewCase, prefix, nativeReviewFail);
    const caseId = text(reviewCase.caseId);
    const benchmarkRowId = text(reviewCase.benchmarkRowId);
    const locale = text(reviewCase.locale);
    if (!validExternalIdentity(caseId)) nativeReviewFail(`${prefix}:case_id_invalid`);
    if (caseIds.has(caseId)) nativeReviewFail(`${prefix}:duplicate_case_id`);
    else caseIds.add(caseId);
    if (reviewedBenchmarkRows.has(benchmarkRowId)) nativeReviewFail(`${prefix}:benchmark_row_reused`);
    else reviewedBenchmarkRows.add(benchmarkRowId);
    const boundRow = rowById.get(benchmarkRowId);
    if (!boundRow) nativeReviewFail(`${prefix}:benchmark_row_missing`);
    if (!requiredLocales.has(locale)) nativeReviewFail(`${prefix}:locale_invalid`);
    else observedLocales.add(locale);
    for (const field of ["sourceSha256", "adjudicationSha256"]) {
      validateHash(reviewCase[field], `${prefix}:${field}`, nativeReviewFail);
    }
    if (boundRow && reviewCase.sourceSha256 !== boundRow.outputSha256) {
      nativeReviewFail(`${prefix}:source_not_bound_to_benchmark_output`);
    }
    validateSignature(reviewCase.signatureRef, prefix, nativeReviewFail, policy);
    validateEvidenceWindow({
      issuedAt: reviewCase.reviewedAt,
      expiresAt: reviewCase.expiresAt,
      ttlDays: policy.nativeReview.ttlDays,
      prefix,
      fail: nativeReviewFail,
      ...clock,
    });

    const reviewer = reviewCase.reviewer;
    if (!isRecord(reviewer)) {
      nativeReviewFail(`${prefix}:reviewer_missing`);
      continue;
    }
    const reviewerId = text(reviewer.reviewerId);
    const reviewerOrganizationId = text(reviewer.organizationId);
    if (!validExternalIdentity(reviewerId)) nativeReviewFail(`${prefix}:reviewer_id_invalid`);
    if (!validExternalIdentity(reviewerOrganizationId)) nativeReviewFail(`${prefix}:reviewer_organization_invalid`);
    if (disallowedReviewerOrganizations.has(reviewerOrganizationId)) {
      nativeReviewFail(`${prefix}:reviewer_not_organizationally_independent`);
    }
    if (reviewer.independent !== true) nativeReviewFail(`${prefix}:reviewer_independence_not_attested`);
    if (reviewer.authoredProduct !== false) nativeReviewFail(`${prefix}:reviewer_authorship_not_excluded`);
    if (reviewer.conflictOfInterest !== false) nativeReviewFail(`${prefix}:reviewer_conflict_not_excluded`);
    if (!Array.isArray(reviewer.nativeLocales) || !reviewer.nativeLocales.includes(locale)) {
      nativeReviewFail(`${prefix}:reviewer_not_native_for_case_locale`);
    }
    validateSignature(reviewer.qualificationRef, `${prefix}:reviewerQualification`, nativeReviewFail, policy);
    validateSignature(reviewer.signatureRef, `${prefix}:reviewer`, nativeReviewFail, policy);
  }
  for (const locale of requiredLocales) {
    if (!observedLocales.has(locale)) nativeReviewFail(`required_locale_missing:${locale}`);
  }
  validateHash(nativeReview?.caseSetSha256, "nativeReview:caseSetSha256", nativeReviewFail);
  if (
    SHA256.test(text(nativeReview?.caseSetSha256)) &&
    nativeReview.caseSetSha256 !== nativeReviewCaseSetSha256(cases)
  ) {
    nativeReviewFail("case_set_hash_mismatch");
  }

  const benchmarkStructurallyReady = !rootFailed && !benchmarkFailed;
  const nativeReviewStructurallyReady =
    !rootFailed && !benchmarkFailed && !nativeReviewFailed;
  const ready = benchmarkStructurallyReady && nativeReviewStructurallyReady;
  const structurallyEligibleRows = ready ? requiredRows : 0;
  const structurallyEligibleCases = ready ? requiredCases : 0;
  const creditedRows = 0;
  const creditedCases = 0;

  return {
    ok: ready,
    status: ready
      ? "PASS_METADATA_STRUCTURE_REQUIRES_CRYPTOGRAPHIC_VERIFICATION"
      : "FAIL_CLOSED_ZERO_CREDIT",
    candidateId: text(evidence.candidateId) || null,
    evaluatedAt: validIso(now) ? new Date(evaluatedAtMs).toISOString() : null,
    gates: {
      HG04: {
        structurallyReady: benchmarkStructurallyReady,
        requiredRows,
        observedRows: rows.length,
        structurallyEligibleRows,
        creditedRows,
      },
      HG10: {
        structurallyReady: nativeReviewStructurallyReady,
        requiredCases,
        observedCases: cases.length,
        structurallyEligibleCases,
        creditedCases,
      },
    },
    credit: {
      policy: "ATOMIC_ZERO_ON_ANY_FAILURE",
      awarded: false,
      totalRequired: requiredRows + requiredCases,
      totalStructurallyEligible: structurallyEligibleRows + structurallyEligibleCases,
      totalCredited: 0,
    },
    verifiedDenominatorIncrement: 0,
    errors,
    errorsTruncated,
    promotionAllowed: false,
    truthBoundary:
      "This result validates supplied metadata structure, hashes, bindings, independence declarations, signature references and TTL only. It creates no evidence, verifies no signature cryptographically, increments no external denominator, grants no legal/provider approval and never promotes PASS35. Any failure yields zero structural eligibility; even a structural PASS receives zero verified credit until authorized cryptographic verification.",
  };
}

function parseCliArgs(argv) {
  const parsed = { input: null, output: null, now: new Date().toISOString() };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!["--input", "--output", "--now"].includes(flag)) {
      throw new Error(`unknown_argument:${flag}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing_value:${flag}`);
    if (flag === "--input") parsed.input = value;
    if (flag === "--output") parsed.output = value;
    if (flag === "--now") parsed.now = value;
    index += 1;
  }
  if (!parsed.input) throw new Error("missing_required_argument:--input");
  return parsed;
}

function runCli() {
  let args;
  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "invalid_arguments");
    process.exitCode = 2;
    return;
  }

  const inputPath = path.resolve(process.cwd(), args.input);
  let source = "";
  let evidence;
  try {
    const inputSize = statSync(inputPath).size;
    if (inputSize > BENCHMARK_REVIEW_POLICY.maxInputBytes) {
      throw new Error("input_exceeds_policy_byte_limit");
    }
    source = readFileSync(inputPath, "utf8");
    evidence = JSON.parse(source);
  } catch (error) {
    const receipt = {
      schemaVersion: "velmere.pass35.benchmark-review-verification.v1",
      status: "FAIL_CLOSED_ZERO_CREDIT",
      inputSha256: source ? sha256(source) : null,
      evaluatedAt: validIso(args.now) ? new Date(args.now).toISOString() : null,
      gates: {
        HG04: { requiredRows: 2700, creditedRows: 0 },
        HG10: { requiredCases: 300, creditedCases: 0 },
      },
      credit: { policy: "ATOMIC_ZERO_ON_ANY_FAILURE", awarded: false, totalCredited: 0 },
      errors: [error instanceof Error ? error.message : "input_unreadable"],
      promotionAllowed: false,
    };
    console.log(JSON.stringify(receipt, null, 2));
    process.exitCode = 1;
    return;
  }

  const result = evaluateBenchmarkReviewEvidence(evidence, { now: args.now });
  const receiptCore = {
    schemaVersion: "velmere.pass35.benchmark-review-verification.v1",
    inputSha256: sha256(source),
    ...result,
  };
  const receipt = {
    ...receiptCore,
    receiptSha256: sha256(JSON.stringify(receiptCore)),
  };
  if (args.output) {
    writeFileSync(path.resolve(process.cwd(), args.output), `${JSON.stringify(receipt, null, 2)}\n`);
  }
  console.log(JSON.stringify(receipt, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? "") === SCRIPT_PATH) runCli();
