#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_COUNTS = new Map([
  ["FG00_SIGNED_SELECTION", 1],
  ["ORG00_SIGNED_OPERATING_RECORD", 1],
  ["PROVIDER_COMMERCIAL_RIGHTS", 21],
  ["MERCHANT_LEGAL_FIELDS", 26],
  ["STAGING_RLS_REAL_REPLAYS", 19],
  ["CANONICAL_PROVIDER_BOUND_ROWS", 2700],
  ["NATIVE_REVIEW_OVERFLOW_CASES", 300],
  ["INDEPENDENT_ASSURANCE_REPORTS", 4],
  ["REAL_CUSTOMER_COHORTS", 2],
]);
const SHA256 = /^[a-f0-9]{64}$/u;
const LOCAL_EVIDENCE = /LOCAL|LOCALHOST|FIXTURE|SYNTHETIC|MOCK|OFFLINE/iu;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function validIso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validateReceipt(receipt, evaluatedAt, knownIds, errors, index) {
  const prefix = `evidenceReceipts[${index}]`;
  if (!isRecord(receipt)) {
    errors.push(`${prefix}:not_object`);
    return null;
  }
  if (typeof receipt.evidenceId !== "string" || !receipt.evidenceId.trim()) errors.push(`${prefix}:missing_evidence_id`);
  if (!knownIds.has(receipt.workstreamId)) errors.push(`${prefix}:unknown_workstream`);
  if (receipt.status !== "VALID") errors.push(`${prefix}:status_not_valid`);
  if (receipt.fixture !== false) errors.push(`${prefix}:fixture_not_explicitly_false`);
  if (typeof receipt.environment !== "string" || !receipt.environment.trim() || LOCAL_EVIDENCE.test(receipt.environment)) {
    errors.push(`${prefix}:environment_not_external`);
  }
  for (const field of ["signer", "independentVerifier"]) {
    if (typeof receipt[field] !== "string" || !receipt[field].trim()) errors.push(`${prefix}:missing_${field}`);
  }
  for (const field of ["sourceSha256", "artifactSha256"]) {
    if (typeof receipt[field] !== "string" || !SHA256.test(receipt[field])) errors.push(`${prefix}:invalid_${field}`);
  }
  if (!validIso(receipt.issuedAt)) errors.push(`${prefix}:invalid_issued_at`);
  if (!validIso(receipt.expiresAt)) errors.push(`${prefix}:invalid_expires_at`);
  if (validIso(receipt.expiresAt) && Date.parse(receipt.expiresAt) <= evaluatedAt) errors.push(`${prefix}:expired`);
  return receipt;
}

export function evaluateExternalProofRegister(register) {
  const errors = [];
  if (!isRecord(register)) return { ok: false, errors: ["register:not_object"], summary: null };
  if (register.schemaVersion !== "velmere.pass35.external-proof-register.v1") errors.push("register:invalid_schema");
  if (register.candidateId !== "VELMERE_PASS35_OFFLINE_CANDIDATE_R3") errors.push("register:invalid_candidate");
  if (!validIso(register.evaluatedAt)) errors.push("register:invalid_evaluated_at");
  const evaluatedAt = validIso(register.evaluatedAt) ? Date.parse(register.evaluatedAt) : Number.POSITIVE_INFINITY;
  if (!Array.isArray(register.workstreams)) errors.push("register:workstreams_not_array");
  if (!Array.isArray(register.evidenceReceipts)) errors.push("register:evidence_receipts_not_array");

  const workstreams = Array.isArray(register.workstreams) ? register.workstreams : [];
  const workstreamIds = new Set();
  for (const [index, row] of workstreams.entries()) {
    const prefix = `workstreams[${index}]`;
    if (!isRecord(row) || typeof row.id !== "string") {
      errors.push(`${prefix}:invalid`);
      continue;
    }
    if (workstreamIds.has(row.id)) errors.push(`${prefix}:duplicate_id`);
    workstreamIds.add(row.id);
    const required = REQUIRED_COUNTS.get(row.id);
    if (required === undefined) errors.push(`${prefix}:unknown_id`);
    if (row.requiredCount !== required) errors.push(`${prefix}:required_count_mismatch`);
    if (!Number.isInteger(row.verifiedCount) || row.verifiedCount < 0 || row.verifiedCount > row.requiredCount) {
      errors.push(`${prefix}:invalid_verified_count`);
    }
    if (!["BLOCKED_EXTERNAL", "NOT_STARTED_EXTERNAL", "PARTIAL_EXTERNAL", "COMPLETE_EXTERNAL"].includes(row.status)) {
      errors.push(`${prefix}:invalid_status`);
    }
  }
  for (const id of REQUIRED_COUNTS.keys()) if (!workstreamIds.has(id)) errors.push(`workstreams:missing:${id}`);

  const receipts = Array.isArray(register.evidenceReceipts) ? register.evidenceReceipts : [];
  const evidenceIds = new Set();
  const counts = new Map([...REQUIRED_COUNTS.keys()].map((id) => [id, 0]));
  for (const [index, raw] of receipts.entries()) {
    const receipt = validateReceipt(raw, evaluatedAt, workstreamIds, errors, index);
    if (!receipt) continue;
    if (evidenceIds.has(receipt.evidenceId)) errors.push(`evidenceReceipts[${index}]:duplicate_evidence_id`);
    else evidenceIds.add(receipt.evidenceId);
    if (counts.has(receipt.workstreamId)) counts.set(receipt.workstreamId, counts.get(receipt.workstreamId) + 1);
  }

  for (const row of workstreams) {
    if (!isRecord(row) || typeof row.id !== "string" || !counts.has(row.id)) continue;
    const receiptCount = counts.get(row.id);
    if (row.verifiedCount !== receiptCount) errors.push(`workstream:${row.id}:verified_count_not_bound_to_receipts`);
    if (row.status === "COMPLETE_EXTERNAL" && receiptCount !== row.requiredCount) errors.push(`workstream:${row.id}:false_complete`);
    if (row.status !== "COMPLETE_EXTERNAL" && receiptCount === row.requiredCount) errors.push(`workstream:${row.id}:complete_count_with_noncomplete_status`);
  }

  const allComplete = workstreams.length === REQUIRED_COUNTS.size && workstreams.every((row) =>
    isRecord(row) && row.status === "COMPLETE_EXTERNAL" && row.verifiedCount === row.requiredCount,
  );
  const prerequisites = register.promotionPrerequisites;
  const prereqKeys = [
    "allWorkstreamsComplete",
    "organizationalDetachedSignaturePresent",
    "independentVerifierPresent",
    "exactSourceAndArtifactHashesBound",
    "allEvidenceWithinTtl",
    "allProductCellGatesPass",
  ];
  if (!isRecord(prerequisites) || prereqKeys.some((key) => typeof prerequisites[key] !== "boolean")) {
    errors.push("register:invalid_promotion_prerequisites");
  } else if (prerequisites.allWorkstreamsComplete !== allComplete) {
    errors.push("register:all_workstreams_complete_mismatch");
  }
  const allPrerequisites = isRecord(prerequisites) && prereqKeys.every((key) => prerequisites[key] === true);
  const computedPromotionAllowed = allComplete && allPrerequisites;
  if (register.promotionAllowed !== computedPromotionAllowed) errors.push("register:promotion_allowed_mismatch");
  if (!computedPromotionAllowed && register.status !== "BLOCKED_EXTERNAL") errors.push("register:false_global_status");

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      requiredWorkstreams: REQUIRED_COUNTS.size,
      completedWorkstreams: workstreams.filter((row) => isRecord(row) && row.status === "COMPLETE_EXTERNAL").length,
      requiredEvidenceCount: [...REQUIRED_COUNTS.values()].reduce((sum, value) => sum + value, 0),
      verifiedEvidenceCount: receipts.length,
      promotionAllowed: computedPromotionAllowed,
    },
  };
}

function runCli() {
  const root = process.cwd();
  const inputPath = path.resolve(root, process.argv[2] ?? "config/pass35/external-proof-register.json");
  const outputPath = path.resolve(root, process.argv[3] ?? "_velmere/pass35/PASS35_EXTERNAL_BLOCKER_RECEIPT.json");
  const source = readFileSync(inputPath, "utf8");
  const register = JSON.parse(source);
  const result = evaluateExternalProofRegister(register);
  const receiptCore = {
    schemaVersion: "velmere.pass35.external-blocker-receipt.v1",
    candidateId: register.candidateId ?? null,
    evaluatedAt: register.evaluatedAt ?? null,
    status: result.ok ? "PASS_FAIL_CLOSED_EXTERNAL_REGISTER" : "FAIL_EXTERNAL_REGISTER",
    registerSha256: sha256(source),
    ...result.summary,
    errors: result.errors,
    truthBoundary: "A passing receipt proves only that external work is counted honestly and fails closed. It does not complete any external workstream.",
  };
  const receipt = { ...receiptCore, receiptSha256: sha256(JSON.stringify(receiptCore)) };
  writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
  if (!result.ok) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
