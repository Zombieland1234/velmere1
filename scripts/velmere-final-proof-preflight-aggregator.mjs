#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4357";
const SUMMARY = path.join("artifacts", "live-receipts", "final-proof-preflight", "final-proof-preflight-summary.json");
const FAILURE = path.join("artifacts", "failure-artifacts", "final-proof-preflight", "final-proof-preflight-failure.json");
const FORBIDDEN_TOKENS = ["rawcustomerevidence", "customeremail", "walletaddress", "stripecustomerid", "paymentintent", "authorization", "set-cookie", "providersecret", "privatekey", "seedphrase", "access_token", "refresh_token", "sk_live_", "sk_test_", "whsec_", "bearer ", "basic "];
const REQUIRED_ROWS = [
  ["runner_summary", ".velmere-final-check-logs/VELMERE_LIVE_PROOF_SUMMARY.json", ["ok", "status", "results", "stepReceipts", "failureArtifacts"], "executed_pass"],
  ["npm_ci", ".velmere-final-check-logs/npm-clean-install-receipt.json", ["ok", "status", "exitCode"], "executed_pass"],
  ["full_typecheck", ".velmere-final-check-logs/typecheck-receipt.json", ["ok", "status", "exitCode"], "executed_pass"],
  ["production_build", ".velmere-final-check-logs/build-receipt.json", ["ok", "status", "exitCode"], "executed_pass"],
  ["lint", ".velmere-final-check-logs/lint-receipt.json", ["ok", "status", "exitCode"], "executed_pass"],
  ["public_proof_route_smoke_local", "artifacts/live-receipts/proof-api/route-smoke/local-server-smoke-summary.json", ["ok", "scenarioResults", "baseUrl"], "executed_pass"],
  ["public_proof_route_smoke_hosted", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-summary.json", ["ok", "scenarioResults", "baseUrl", "hostedValidation"], "executed_pass"],
  ["hosted_freshness_expiry_replay", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-freshness-summary.json", ["ok", "checkedReceiptCount", "maxAgeMs", "freshnessRows"], "executed_pass"],
  ["zero_skip_receipt_coverage", "artifacts/live-receipts/zero-skip-coverage/zero-skip-coverage-summary.json", ["ok", "requiredReceiptCount", "greenReceiptCount", "runnerSummary"], "executed_pass"],
  ["domain_live_receipt_matrix", "artifacts/live-receipts/domain-live-receipts/domain-live-receipt-matrix-summary.json", ["ok", "laneCount", "greenLaneCount", "laneRows"], "executed_pass"],
  ["materialized_required_live_receipt_bundle", "artifacts/live-receipts/required-bundle/materialized/materialized-required-live-receipt-bundle-summary.json", ["ok", "greenRowCount", "requiredRowCount"], "executed_pass"],
  ["required_live_receipt_bundle", "artifacts/live-receipts/required-bundle/required-live-receipt-bundle-summary.json", ["ok", "allRequiredReceiptsPassed", "receiptRows"], "executed_pass"],
  ["mega_live_proof_bindings", "artifacts/live-receipts/mega-bindings/mega-live-proof-bindings-summary.json", ["ok", "sourceCheckRows", "requiredReceiptRows"], "executed_pass"],
  ["operator_unsigned_manifest", "artifacts/live-receipts/operator/VELMERE_OPERATOR_LIVE_PROOF_MANIFEST_UNSIGNED.json", ["ok", "status", "requiredReceiptRows"], "ready_for_signature"],
  ["operator_signed_manifest", "artifacts/live-receipts/operator/VELMERE_OPERATOR_SIGNED_LIVE_PROOF_MANIFEST.json", ["signature", "requiredReceiptRows", "allRequiredReceiptsPassed"], "signed_live_manifest"],
];
function parseArgs(argv) {
  const out = { sourceRoot: ".", allowMissing: false, writeReceipt: true, maxAgeMs: 20 * 60 * 1000 };
  for (const arg of argv) {
    if (arg === "--allow-missing") out.allowMissing = true;
    else if (arg === "--no-write-receipt") out.writeReceipt = false;
    else if (arg.startsWith("--source-root=")) out.sourceRoot = arg.slice("--source-root=".length) || ".";
    else if (arg.startsWith("--max-age-ms=")) out.maxAgeMs = Number.parseInt(arg.slice("--max-age-ms=".length), 10) || out.maxAgeMs;
  }
  return out;
}
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}
`, "utf8"); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""; }
function sha256(text) { return `sha256:${crypto.createHash("sha256").update(text).digest("hex")}`; }
function parseJson(text) { try { return { ok: true, value: JSON.parse(text) }; } catch (error) { return { ok: false, value: null, error: error instanceof Error ? error.message : String(error) }; } }
function flattenKeys(value, prefix = "") {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => flattenKeys(item, `${prefix}[${index}]`));
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
function leakTokens(text, value) {
  const lower = String(text || "").toLowerCase();
  const keyText = flattenKeys(value).join("\n").toLowerCase();
  return [...new Set(FORBIDDEN_TOKENS.filter((token) => lower.includes(token) || keyText.includes(token)))];
}
function greenStatus(value) {
  if (!value || typeof value !== "object") return "not_green";
  if (value.ok === true || value.status === "PASS" || value.status === "executed_pass" || value.status === "LOCAL_GREEN" || value.status === "LIVE_GREEN") return "executed_pass";
  if (value.status === "ready_for_signature" || value.readyForSignature === true) return "ready_for_signature";
  if ((value.signature || value.signatureHex) && (value.allRequiredReceiptsPassed === true || Array.isArray(value.requiredReceiptRows))) return "signed_live_manifest";
  return "not_green";
}
function freshEnough(value, maxAgeMs) {
  const candidates = [value?.generatedAtIso, value?.completedAtIso, value?.requestCompletedAtIso].filter(Boolean);
  if (!candidates.length) return { ok: true, ageMs: null, reason: "no_timestamp_required_for_this_lane" };
  const newest = Math.max(...candidates.map((x) => Date.parse(String(x))).filter(Number.isFinite));
  if (!Number.isFinite(newest)) return { ok: false, ageMs: null, reason: "timestamp_parse_failed" };
  const ageMs = Date.now() - newest;
  return { ok: ageMs >= 0 && ageMs <= maxAgeMs, ageMs, reason: ageMs <= maxAgeMs ? "fresh" : "expired" };
}
function row(sourceRoot, spec, args) {
  const [lane, relPath, fields, requiredDecision] = spec;
  const abs = path.join(sourceRoot, relPath);
  const text = read(abs);
  const exists = text.length > 0;
  const parsed = exists ? parseJson(text) : { ok: false, value: null, error: "missing" };
  const missingFields = parsed.ok ? fields.filter((field) => !fieldPresent(parsed.value, field)) : fields;
  const leaks = exists ? leakTokens(text, parsed.value) : [];
  const decision = parsed.ok ? greenStatus(parsed.value) : "missing";
  const freshness = lane.includes("hosted") || lane.includes("final") ? (parsed.ok ? freshEnough(parsed.value, args.maxAgeMs) : { ok: false, ageMs: null, reason: "missing" }) : { ok: true, ageMs: null, reason: "not_hosted_freshness_lane" };
  const status = !exists ? "missing" : !parsed.ok ? "parse_failed" : leaks.length ? "redaction_failed" : missingFields.length ? "field_missing" : !freshness.ok ? `freshness_${freshness.reason}` : decision === requiredDecision || (requiredDecision === "executed_pass" && decision === "signed_live_manifest") ? "executed_pass" : "not_required_decision";
  return { schema: "velmere.pass4357.final_proof_preflight_row.v1", passId: PASS_ID, lane, canonicalPath: relPath, exists, parsedOk: parsed.ok, status, decision, requiredDecision, green: status === "executed_pass", expectedFields: fields, missingFields, safePublicFieldsOnly: leaks.length === 0, publicLeakTokens: leaks, freshness, sha256: exists ? sha256(text) : null, bytes: exists ? Buffer.byteLength(text, "utf8") : 0, blocksPublicTopkaLive: true };
}
function crossCheck(rows) {
  const byLane = new Map(rows.map((row) => [row.lane, row]));
  const problems = [];
  const mustAgree = ["zero_skip_receipt_coverage", "domain_live_receipt_matrix", "materialized_required_live_receipt_bundle", "required_live_receipt_bundle", "mega_live_proof_bindings"];
  for (const lane of mustAgree) {
    const item = byLane.get(lane);
    if (!item || !item.green) problems.push(`${lane}_not_green`);
  }
  const signed = byLane.get("operator_signed_manifest");
  const unsigned = byLane.get("operator_unsigned_manifest");
  if (signed?.green && !unsigned?.green) problems.push("signed_manifest_without_ready_unsigned_manifest");
  return problems;
}
const args = parseArgs(process.argv.slice(2));
const rows = REQUIRED_ROWS.map((spec) => row(args.sourceRoot, spec, args));
const failedRows = rows.filter((row) => !row.green);
const agreementProblems = crossCheck(rows);
const finalDecision = failedRows.length === 0 && agreementProblems.length === 0 ? "READY" : "BLOCKED";
const summary = {
  schema: "velmere.pass4357.final_proof_preflight_summary.v1",
  passId: PASS_ID,
  generatedAtIso: new Date().toISOString(),
  ok: finalDecision === "READY",
  finalDecision,
  status: finalDecision === "READY" ? "executed_pass" : "blocked_until_all_required_live_receipts_green",
  noVisualChanges: true,
  publicTopkaLiveAllowed: false,
  claimAllowed: false,
  sourceRoot: args.sourceRoot,
  requiredRowCount: rows.length,
  greenRowCount: rows.length - failedRows.length,
  failedRowCount: failedRows.length,
  rows,
  failedRows,
  agreementProblems,
  readyForOperatorSignature: finalDecision === "READY",
  readyForPublicTopkaLiveClaim: false,
  requiredBeforeOperatorSignature: true,
  requiredBeforePublicTopkaLive: true,
  nextAction: finalDecision === "READY" ? "Verify operator signed manifest and publish only the redacted public proof status." : "Execute Windows Node24 full runner, hosted smoke, domain receipts, bundle/materializer, mega-bindings and signed manifest, then rerun proof:final-preflight."
};
if (args.writeReceipt || summary.ok) writeJson(path.join(args.sourceRoot, SUMMARY), summary);
if (!summary.ok) {
  const failure = { schema: "velmere.pass4357.final_proof_preflight_failure.v1", passId: PASS_ID, generatedAtIso: new Date().toISOString(), ok: false, finalDecision, summaryPath: SUMMARY, failureArtifact: FAILURE, failedRows, agreementProblems, publicTopkaLiveAllowed: false, claimAllowed: false, nextAction: summary.nextAction };
  writeJson(path.join(args.sourceRoot, FAILURE), failure);
  console.error(`${PASS_ID} final proof preflight BLOCKED: ${failedRows.length}/${rows.length} rows not green, ${agreementProblems.length} agreement problems.`);
  if (!args.allowMissing) process.exitCode = 1;
} else {
  console.log(`${PASS_ID} final proof preflight READY: ${SUMMARY}`);
}
