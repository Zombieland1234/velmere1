#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}
function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function exactGitValue(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim().toLowerCase();
}
function fail(code, details = {}) {
  failures.push({ code, ...details });
}

const evidenceDir = path.resolve(arg("--evidence-dir", "/tmp/r11b"));
const ledgerPath = path.resolve(arg("--ledger", path.join(evidenceDir, "EVIDENCE_LEDGER.json")));
const outputPath = path.resolve(arg("--output", path.join(evidenceDir, "EVIDENCE_LEDGER_VERIFICATION.json")));
const workflowPath = arg("--workflow", ".github/workflows/r11b-internal-readonly-gate.yml");
const sourceSha = String(process.env.GITHUB_SHA || exactGitValue(["rev-parse", "HEAD"])).trim().toLowerCase();
const treeHash = exactGitValue(["rev-parse", "HEAD^{tree}"]);
const workflowHash = sha256Bytes(fs.readFileSync(workflowPath));
const verifierHash = sha256Bytes(fs.readFileSync(fileURLToPath(import.meta.url)));
const failures = [];

if (!fs.existsSync(ledgerPath)) throw new Error("evidence_ledger_missing");
const ledgerBytes = fs.readFileSync(ledgerPath);
let ledger;
try {
  ledger = JSON.parse(ledgerBytes.toString("utf8"));
} catch (error) {
  throw new Error(`evidence_ledger_invalid_json:${error instanceof Error ? error.message : String(error)}`);
}

if (ledger.schemaVersion !== "velmere.r11b.evidence-ledger.v1") fail("schema_version_mismatch", { actual: ledger.schemaVersion });
if (ledger.subjectType !== "EXACT_GIT_HEAD") fail("subject_type_mismatch", { actual: ledger.subjectType });
if (ledger.sourceSha !== sourceSha) fail("source_sha_mismatch", { expected: sourceSha, actual: ledger.sourceSha });
if (ledger.treeHash !== treeHash) fail("tree_hash_mismatch", { expected: treeHash, actual: ledger.treeHash });
if (ledger.workflowPath !== workflowPath) fail("workflow_path_mismatch", { expected: workflowPath, actual: ledger.workflowPath });
if (ledger.workflowHash !== workflowHash) fail("workflow_hash_mismatch", { expected: workflowHash, actual: ledger.workflowHash });
if (ledger.passed !== true) fail("ledger_not_passed");
if (!Array.isArray(ledger.evidenceHashes)) fail("evidence_hashes_missing");
if (!Array.isArray(ledger.expectedCriticalReceipts)) fail("critical_receipts_missing");
if (!Array.isArray(ledger.missingCriticalReceipts) || ledger.missingCriticalReceipts.length !== 0) {
  fail("ledger_missing_critical_receipts", { actual: ledger.missingCriticalReceipts });
}
if (!Array.isArray(ledger.bindingFailures) || ledger.bindingFailures.length !== 0) {
  fail("ledger_binding_failures", { actual: ledger.bindingFailures });
}

if (process.env.CI === "true") {
  if (!process.env.GITHUB_RUN_ID || ledger.runId !== process.env.GITHUB_RUN_ID) {
    fail("run_id_mismatch", { expected: process.env.GITHUB_RUN_ID || null, actual: ledger.runId });
  }
  if (!process.env.GITHUB_RUN_ATTEMPT || ledger.runAttempt !== process.env.GITHUB_RUN_ATTEMPT) {
    fail("run_attempt_mismatch", { expected: process.env.GITHUB_RUN_ATTEMPT || null, actual: ledger.runAttempt });
  }
}

const excludedNames = new Set([path.basename(ledgerPath), path.basename(outputPath)]);
const actualNames = fs.readdirSync(evidenceDir)
  .filter((name) => name.endsWith(".json") && !excludedNames.has(name))
  .sort();
const ledgerRows = Array.isArray(ledger.evidenceHashes) ? ledger.evidenceHashes : [];
const ledgerNames = ledgerRows.map((row) => row?.name).filter((name) => typeof name === "string").sort();
if (new Set(ledgerNames).size !== ledgerNames.length) fail("duplicate_ledger_evidence_names");
if (JSON.stringify(actualNames) !== JSON.stringify(ledgerNames)) {
  fail("evidence_name_set_mismatch", { actualNames, ledgerNames });
}
if (ledger.evidenceCount !== ledgerRows.length || ledger.evidenceCount !== actualNames.length) {
  fail("evidence_denominator_mismatch", {
    declared: ledger.evidenceCount,
    rows: ledgerRows.length,
    actualFiles: actualNames.length,
  });
}

const recomputed = [];
for (const row of ledgerRows) {
  if (!row || typeof row.name !== "string") {
    fail("malformed_evidence_row");
    continue;
  }
  const filePath = path.join(evidenceDir, row.name);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(`${evidenceDir}${path.sep}`)) {
    fail("unsafe_evidence_path", { name: row.name });
    continue;
  }
  if (!fs.existsSync(resolved)) {
    fail("evidence_file_missing", { name: row.name });
    continue;
  }
  const metadata = fs.lstatSync(resolved);
  if (metadata.isSymbolicLink() || !metadata.isFile()) {
    fail("unsafe_evidence_file_type", { name: row.name });
    continue;
  }
  const bytes = fs.readFileSync(resolved);
  const digest = sha256Bytes(bytes);
  const byteLength = bytes.length;
  if (row.sha256 !== digest) fail("evidence_sha256_mismatch", { name: row.name, expected: row.sha256, actual: digest });
  if (row.byteLength !== byteLength) fail("evidence_byte_length_mismatch", { name: row.name, expected: row.byteLength, actual: byteLength });
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
    fail("evidence_json_parse_error", { name: row.name, parseError });
  }
  const embeddedSourceSha = typeof parsed?.sourceSha === "string" ? parsed.sourceSha.toLowerCase() : null;
  if (row.embeddedSourceSha !== embeddedSourceSha) {
    fail("embedded_source_sha_record_mismatch", { name: row.name, declared: row.embeddedSourceSha, actual: embeddedSourceSha });
  }
  if (row.requiresEmbeddedSourceSha === true && embeddedSourceSha !== sourceSha) {
    fail("required_embedded_source_sha_mismatch", { name: row.name, expected: sourceSha, actual: embeddedSourceSha });
  }
  recomputed.push({ name: row.name, sha256: digest, byteLength, embeddedSourceSha, parseError });
}

for (const critical of Array.isArray(ledger.expectedCriticalReceipts) ? ledger.expectedCriticalReceipts : []) {
  if (!actualNames.includes(critical)) fail("critical_receipt_absent_from_actual_set", { name: critical });
}

const receipt = {
  schemaVersion: "velmere.r11b.evidence-ledger-verification.v1",
  repo: process.env.GITHUB_REPOSITORY || "Zombieland1234/velmere1",
  sourceSha,
  treeHash,
  subjectType: "EXACT_GIT_HEAD",
  runId: process.env.GITHUB_RUN_ID || null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
  workflowPath,
  workflowHash,
  ledgerSha256: sha256Bytes(ledgerBytes),
  verifierSha256: verifierHash,
  evidenceCount: actualNames.length,
  recomputed,
  failures,
  passed: failures.length === 0,
  truthBoundary: "This verifier independently recomputes local evidence-file, Git tree and workflow-byte bindings from the same repository/run. It catches ledger tampering and denominator drift inside that boundary. It is not an independent external evaluator, not an append-only external transparency service, and not production/staging proof.",
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify({ sourceSha, treeHash, workflowHash, ledgerSha256: receipt.ledgerSha256, evidenceCount: receipt.evidenceCount, failures, passed: receipt.passed }, null, 2));
if (!receipt.passed) process.exit(1);
