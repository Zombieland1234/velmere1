#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4356";
const OUT_DIR = path.join("artifacts", "live-receipts", "zero-skip-coverage");
const FAIL_DIR = path.join("artifacts", "failure-artifacts", "zero-skip-coverage");
const SUMMARY = path.join(OUT_DIR, "zero-skip-coverage-summary.json");
const FAILURE = path.join(FAIL_DIR, "zero-skip-coverage-failure.json");
const REQUIRED_SUMMARY = path.join(".velmere-final-check-logs", "VELMERE_LIVE_PROOF_SUMMARY.json");
const REQUIRED_RECEIPTS = [
  ["node24_environment", REQUIRED_SUMMARY, ["ok", "status", "results", "stepReceipts", "counters"]],
  ["npm_ci", ".velmere-final-check-logs/npm-clean-install-receipt.json", ["ok", "status", "exitCode"]],
  ["full_typecheck", ".velmere-final-check-logs/typecheck-receipt.json", ["ok", "status", "exitCode"]],
  ["production_build", ".velmere-final-check-logs/build-receipt.json", ["ok", "status", "exitCode"]],
  ["lint", ".velmere-final-check-logs/lint-receipt.json", ["ok", "status", "exitCode"]],
  ["public_proof_route_smoke_local", "artifacts/live-receipts/proof-api/route-smoke/local-server-smoke-summary.json", ["ok", "scenarioResults", "baseUrl"]],
  ["public_proof_route_smoke_hosted", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-summary.json", ["ok", "scenarioResults", "baseUrl"]],
  ["public_proof_route_smoke_hosted_freshness", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-freshness-summary.json", ["ok", "checkedReceiptCount", "maxAgeMs"]],
  ["provider_live_data_smoke", "artifacts/live-receipts/provider-live-data-smoke/provider-smoke-summary.json", ["ok", "status", "providers"]],
  ["payment_entitlement_replay", "artifacts/live-receipts/payment-entitlement-replay/payment-replay-summary.json", ["ok", "status", "scenarios"]],
  ["pdf_angel_same_payload_parity", "artifacts/live-receipts/pdf-angel-parity/pdf-angel-parity-summary.json", ["ok", "status", "canonicalPayloadHash"]],
  ["ai_audit_eval_pl_en_de", "artifacts/live-receipts/ai-audit-eval/ai-audit-eval-pl-en-de-summary.json", ["ok", "status", "locales"]],
  ["domain_live_receipt_matrix", "artifacts/live-receipts/domain-live-receipts/domain-live-receipt-matrix-summary.json", ["ok", "status", "rows", "greenDomainLaneCount"]],
  ["materialized_required_live_receipt_bundle", "artifacts/live-receipts/required-bundle/materialized/materialized-required-live-receipt-bundle-summary.json", ["ok", "rows", "requiredReceiptCount"]],
  ["required_live_receipt_bundle", "artifacts/live-receipts/required-bundle/required-live-receipt-bundle-summary.json", ["ok", "rows", "requiredReceiptCount"]],
  ["operator_unsigned_manifest", "artifacts/live-receipts/operator/VELMERE_OPERATOR_LIVE_PROOF_MANIFEST_UNSIGNED.json", ["allRequiredReceiptsPassed", "requiredReceiptRows"]],
  ["operator_signed_manifest", "artifacts/live-receipts/operator/VELMERE_OPERATOR_SIGNED_LIVE_PROOF_MANIFEST.json", ["signature", "requiredReceiptRows"]],
];
const PUBLIC_LIVE_STEP_PATTERNS = [
  /PASS4352 hosted public proof route smoke/i,
  /PASS4353 hosted proof freshness expiry replay/i,
  /PASS4351 materialize required live receipt bundle/i,
  /PASS4349 required live receipt bundle verify/i,
  /PASS4355 domain live receipt matrix/i,
  /PASS4354 mega live proof bindings/i,
  /PASS4348 operator signed manifest verify/i,
];
const FORBIDDEN_TOKENS = ["rawcustomerevidence", "customeremail", "walletaddress", "stripecustomerid", "paymentintent", "authorization", "set-cookie", "providersecret", "privatekey", "seedphrase", "access_token", "refresh_token", "sk_live_", "sk_test_", "whsec_", "bearer ", "basic "];

function parseArgs(argv) {
  const out = { sourceRoot: ".", allowMissing: false, writeReceipt: true };
  for (const arg of argv) {
    if (arg === "--allow-missing") out.allowMissing = true;
    else if (arg === "--no-write-receipt") out.writeReceipt = false;
    else if (arg.startsWith("--source-root=")) out.sourceRoot = arg.slice("--source-root=".length) || ".";
  }
  return out;
}
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}
`, "utf8"); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""; }
function sha256(text) { return `sha256:${crypto.createHash("sha256").update(text).digest("hex")}`; }
function parseJson(text) { try { return { parsedOk: true, value: JSON.parse(text) }; } catch (error) { return { parsedOk: false, value: null, error: error instanceof Error ? error.message : String(error) }; } }
function flattenKeys(value, prefix = "") {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item, idx) => flattenKeys(item, `${prefix}[${idx}]`));
  const keys = [];
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    keys.push(full);
    keys.push(...flattenKeys(child, full));
  }
  return keys;
}
function fieldPresent(value, field) {
  if (!value || typeof value !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(value, field)) return true;
  return flattenKeys(value).some((key) => key === field || key.endsWith(`.${field}`));
}
function leaks(text, parsedValue) {
  const lower = String(text || "").toLowerCase();
  const keyText = flattenKeys(parsedValue).join("\n").toLowerCase();
  return [...new Set(FORBIDDEN_TOKENS.filter((token) => lower.includes(token) || keyText.includes(token)))];
}
function receiptIsGreen(value) {
  if (!value || typeof value !== "object") return false;
  if (value.ok === true) return true;
  if (value.status === "PASS" || value.status === "executed_pass" || value.status === "LOCAL_GREEN" || value.status === "LIVE_GREEN") return true;
  if (value.allRequiredReceiptsPassed === true && value.signature) return true;
  return false;
}
function rowForReceipt(sourceRoot, spec) {
  const [lane, relPath, expectedFields] = spec;
  const abs = path.join(sourceRoot, relPath);
  const text = read(abs);
  const exists = text.length > 0;
  const parsed = exists ? parseJson(text) : { parsedOk: false, value: null, error: "missing" };
  const publicLeaks = exists ? leaks(text, parsed.value) : [];
  const missingFields = parsed.parsedOk ? expectedFields.filter((field) => !fieldPresent(parsed.value, field)) : expectedFields;
  const green = parsed.parsedOk && receiptIsGreen(parsed.value);
  const status = !exists ? "missing" : !parsed.parsedOk ? "parse_failed" : publicLeaks.length ? "redaction_failed" : missingFields.length ? "field_missing" : green ? "executed_pass" : "not_green";
  return { schema: "velmere.pass4356.zero_skip_receipt_coverage_row.v1", passId: PASS_ID, lane, canonicalPath: relPath, exists, parsedOk: parsed.parsedOk, status, green, expectedFields, missingFields, sha256: exists ? sha256(text) : null, bytes: exists ? Buffer.byteLength(text, "utf8") : 0, safePublicFieldsOnly: publicLeaks.length === 0, publicLeakTokens: publicLeaks, requiredBeforePublicTopkaLive: true, requiredBeforeOperatorSignature: true };
}
function summaryChecks(sourceRoot) {
  const text = read(path.join(sourceRoot, REQUIRED_SUMMARY));
  if (!text) return { summaryExists: false, parsedOk: false, runnerOk: false, requiredSkipped: [], requiredFailed: [], publicLiveSkipped: [], missingFailureArtifacts: [], resultCount: 0, stepReceiptCount: 0 };
  const parsed = parseJson(text);
  if (!parsed.parsedOk || !parsed.value || typeof parsed.value !== "object") return { summaryExists: true, parsedOk: false, runnerOk: false, requiredSkipped: [], requiredFailed: [], publicLiveSkipped: [], missingFailureArtifacts: [], resultCount: 0, stepReceiptCount: 0 };
  const value = parsed.value;
  const results = Array.isArray(value.results) ? value.results : [];
  const stepReceipts = Array.isArray(value.stepReceipts) ? value.stepReceipts : [];
  const requiredSkipped = results.filter((row) => row && row.required === true && row.status === "SKIPPED");
  const requiredFailed = results.filter((row) => row && row.required === true && row.status === "FAIL");
  const publicLiveSkipped = results.filter((row) => row && row.status === "SKIPPED" && PUBLIC_LIVE_STEP_PATTERNS.some((pattern) => pattern.test(String(row.name || ""))));
  const failureArtifacts = Array.isArray(value.failureArtifacts) ? value.failureArtifacts : [];
  const missingFailureArtifacts = requiredFailed.filter((row) => !failureArtifacts.some((artifact) => artifact && artifact.name === row.name && artifact.artifactJson));
  return { summaryExists: true, parsedOk: true, runnerOk: value.ok === true || value.status === "LOCAL_GREEN", requiredSkipped, requiredFailed, publicLiveSkipped, missingFailureArtifacts, resultCount: results.length, stepReceiptCount: stepReceipts.length, claimDecision: value.claimDecision || null, counters: value.counters || null };
}
const args = parseArgs(process.argv.slice(2));
const receiptRows = REQUIRED_RECEIPTS.map((spec) => rowForReceipt(args.sourceRoot, spec));
const runnerSummary = summaryChecks(args.sourceRoot);
const failedReceiptRows = receiptRows.filter((row) => row.status !== "executed_pass");
const blockingSkippedLiveSteps = runnerSummary.publicLiveSkipped.map((row) => ({ name: row.name, command: row.command, required: row.required, notes: row.notes }));
const summary = { schema: "velmere.pass4356.zero_skip_receipt_coverage_summary.v1", passId: PASS_ID, generatedAtIso: new Date().toISOString(), ok: failedReceiptRows.length === 0 && runnerSummary.runnerOk === true && runnerSummary.requiredSkipped.length === 0 && runnerSummary.requiredFailed.length === 0 && blockingSkippedLiveSteps.length === 0 && runnerSummary.missingFailureArtifacts.length === 0, status: "blocked_until_zero_skip_coverage_green", noVisualChanges: true, publicTopkaLiveAllowed: false, claimAllowed: false, sourceRoot: args.sourceRoot, requiredReceiptCount: receiptRows.length, greenReceiptCount: receiptRows.length - failedReceiptRows.length, failedReceiptCount: failedReceiptRows.length, receiptRows, runnerSummary: { summaryExists: runnerSummary.summaryExists, parsedOk: runnerSummary.parsedOk, runnerOk: runnerSummary.runnerOk, resultCount: runnerSummary.resultCount, stepReceiptCount: runnerSummary.stepReceiptCount, requiredSkippedCount: runnerSummary.requiredSkipped.length, requiredFailedCount: runnerSummary.requiredFailed.length, publicLiveSkippedCount: blockingSkippedLiveSteps.length, missingFailureArtifactCount: runnerSummary.missingFailureArtifacts.length, claimDecision: runnerSummary.claimDecision, counters: runnerSummary.counters }, blockingSkippedLiveSteps, missingFailureArtifacts: runnerSummary.missingFailureArtifacts.map((row) => ({ name: row.name, command: row.command })), failedReceiptRows, requiredBeforeMaterializedBundle: true, requiredBeforeOperatorSignature: true, liveBlockedReasons: [], nextAction: "Run the Windows Node24 full runner with all public-live proof env gates, then rerun proof:zero-skip:coverage before materializer/bundle/manifest." };
summary.liveBlockedReasons = [
  ...failedReceiptRows.map((row) => `${row.lane}_${row.status}`),
  ...(runnerSummary.runnerOk ? [] : ["runner_summary_missing_or_not_local_green"]),
  ...runnerSummary.requiredSkipped.map((row) => `required_step_skipped_${String(row.name || "step").replace(/[^A-Za-z0-9]+/g, "_")}`),
  ...runnerSummary.requiredFailed.map((row) => `required_step_failed_${String(row.name || "step").replace(/[^A-Za-z0-9]+/g, "_")}`),
  ...blockingSkippedLiveSteps.map((row) => `public_live_step_skipped_${String(row.name || "step").replace(/[^A-Za-z0-9]+/g, "_")}`),
  ...runnerSummary.missingFailureArtifacts.map((row) => `missing_failure_artifact_${String(row.name || "step").replace(/[^A-Za-z0-9]+/g, "_")}`),
];
if (summary.ok) summary.status = "executed_pass";
if (args.writeReceipt || summary.ok) writeJson(path.join(args.sourceRoot, SUMMARY), summary);
if (!summary.ok) {
  const failure = { schema: "velmere.pass4356.zero_skip_receipt_coverage_failure.v1", passId: PASS_ID, generatedAtIso: new Date().toISOString(), ok: false, summaryPath: SUMMARY, failureArtifact: FAILURE, failedReceiptRows, blockingSkippedLiveSteps, runnerSummary: summary.runnerSummary, liveBlockedReasons: summary.liveBlockedReasons, publicTopkaLiveAllowed: false, claimAllowed: false, nextAction: summary.nextAction };
  writeJson(path.join(args.sourceRoot, FAILURE), failure);
  console.error(`${PASS_ID} zero-skip receipt coverage ${runnerSummary.summaryExists ? "blocked" : "FAIL"}: ${failedReceiptRows.length}/${receiptRows.length} receipt rows not green, ${blockingSkippedLiveSteps.length} public-live steps skipped.`);
  if (!args.allowMissing) process.exitCode = 1;
} else {
  console.log(`${PASS_ID} zero-skip receipt coverage PASS: ${SUMMARY}`);
}
