#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4363";
const SUMMARY = path.join("artifacts", "live-receipts", "operator-post-run-import", "operator-post-run-import-summary.json");
const FAILURE = path.join("artifacts", "failure-artifacts", "operator-post-run-import", "operator-post-run-import-failure.json");
const FORBIDDEN_TOKENS = ["rawcustomerevidence", "customeremail", "walletaddress", "stripecustomerid", "paymentintent", "authorization", "set-cookie", "providersecret", "privatekey", "seedphrase", "access_token", "refresh_token", "sk_live_", "sk_test_", "whsec_", "bearer ", "basic "];
const REQUIRED_ROWS = [
  ["windows_final_check_summary", ".velmere-final-check-logs/VELMERE_FULL_CHECK_SUMMARY.json", ["overallStatus", "results", "stepReceipts"], "executed_pass"],
  ["npm_clean_install_receipt", ".velmere-final-check-logs/npm-clean-install-receipt.json", ["status", "command", "exitCode"], "executed_pass"],
  ["typecheck_receipt", ".velmere-final-check-logs/typecheck-receipt.json", ["status", "command", "exitCode"], "executed_pass"],
  ["build_receipt", ".velmere-final-check-logs/build-receipt.json", ["status", "command", "exitCode"], "executed_pass"],
  ["lint_receipt", ".velmere-final-check-logs/lint-receipt.json", ["status", "command", "exitCode"], "executed_pass"],
  ["hosted_route_smoke", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-summary.json", ["ok", "baseUrl", "scenarioResults"], "executed_pass"],
  ["hosted_freshness", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-freshness-summary.json", ["ok", "freshnessRows", "maxAgeMs"], "executed_pass"],
  ["domain_live_receipt_matrix", "artifacts/live-receipts/domain-live-receipts/domain-live-receipt-matrix-summary.json", ["ok", "laneRows", "greenLaneCount"], "executed_pass"],
  ["operator_signed_manifest", "artifacts/live-receipts/operator/VELMERE_OPERATOR_SIGNED_LIVE_PROOF_MANIFEST.json", ["signature", "requiredReceiptRows", "allRequiredReceiptsPassed"], "signed_live_manifest"],
  ["final_release_candidate", "artifacts/live-receipts/final-release-candidate/final-public-release-candidate-summary.json", ["ok", "releaseDecision", "requiredRowCount"], "ready"],
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
function sha256(text) { return `sha256:${crypto.createHash("sha256").update(String(text)).digest("hex")}`; }
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
function decision(value, lane) {
  if (!value || typeof value !== "object") return "not_green";
  if (lane === "windows_final_check_summary") {
    const status = String(value.overallStatus || value.status || "").toUpperCase();
    const failed = Number(value.failedRequiredCount ?? value.failedCount ?? 0);
    return (status === "PASS" || status === "GREEN" || status === "OK") && failed === 0 ? "executed_pass" : "not_green";
  }
  if (lane === "final_release_candidate" && value.ok === true && (value.releaseDecision === "READY_TO_SEAL" || value.finalDecision === "READY")) return "ready";
  if (lane === "operator_signed_manifest" && (value.signature || value.signatureHex) && (value.allRequiredReceiptsPassed === true || Array.isArray(value.requiredReceiptRows))) return "signed_live_manifest";
  if (value.ok === true || value.status === "PASS" || value.status === "executed_pass" || value.status === "LIVE_GREEN") return "executed_pass";
  return "not_green";
}
function freshness(value, lane, maxAgeMs) {
  const requires = lane.includes("hosted") || lane.includes("final") || lane.includes("domain") || lane.includes("manifest") || lane.includes("windows") || lane.includes("receipt");
  if (!requires) return { ok: true, ageMs: null, reason: "not_freshness_lane" };
  const candidates = [value?.generatedAtIso, value?.generatedAt, value?.completedAtIso, value?.endedAt, value?.requestCompletedAtIso].filter(Boolean);
  if (!candidates.length) return { ok: false, ageMs: null, reason: "timestamp_missing" };
  const newest = Math.max(...candidates.map((x) => Date.parse(String(x))).filter(Number.isFinite));
  if (!Number.isFinite(newest)) return { ok: false, ageMs: null, reason: "timestamp_parse_failed" };
  const ageMs = Date.now() - newest;
  return { ok: ageMs >= 0 && ageMs <= maxAgeMs, ageMs, reason: ageMs <= maxAgeMs ? "fresh" : "expired" };
}
function row(root, spec, maxAgeMs) {
  const [lane, relPath, fields, requiredDecision] = spec;
  const abs = path.join(root, relPath);
  const text = read(abs);
  const exists = text.length > 0;
  const parsed = exists ? parseJson(text) : { ok: false, value: null, error: "missing" };
  const missingFields = parsed.ok ? fields.filter((field) => !fieldPresent(parsed.value, field)) : fields;
  const leaks = exists ? leakTokens(text, parsed.value) : [];
  const actualDecision = parsed.ok ? decision(parsed.value, lane) : "missing";
  const fresh = parsed.ok ? freshness(parsed.value, lane, maxAgeMs) : { ok: false, ageMs: null, reason: "missing" };
  const skipped = parsed.ok && JSON.stringify(parsed.value).toLowerCase().includes('"status":"skipped"');
  const status = !exists ? "missing" : !parsed.ok ? "parse_failed" : leaks.length ? "redaction_failed" : skipped ? "skipped_required_proof" : missingFields.length ? "field_missing" : !fresh.ok ? `freshness_${fresh.reason}` : actualDecision === requiredDecision ? "executed_pass" : "not_required_decision";
  return { schema: "velmere.pass4363.post_run_receipt_import_row.v1", passId: PASS_ID, lane, canonicalPath: relPath, exists, parsedOk: parsed.ok, status, decision: actualDecision, requiredDecision, green: status === "executed_pass", expectedFields: fields, missingFields, safePublicFieldsOnly: leaks.length === 0, publicLeakTokens: leaks, freshness: fresh, sha256: exists ? sha256(text) : null, bytes: exists ? Buffer.byteLength(text, "utf8") : 0, blocksFinalRc: true, blocksPublicTopkaLive: true };
}
function rootHash(rows) {
  const material = rows.map((item) => `${item.lane}:${item.sha256 || "missing"}:${item.status}`).sort().join("\n");
  return sha256(material);
}
const args = parseArgs(process.argv.slice(2));
const rows = REQUIRED_ROWS.map((spec) => row(args.sourceRoot, spec, args.maxAgeMs));
const failedRows = rows.filter((item) => !item.green);
const ok = failedRows.length === 0;
const summary = {
  schema: "velmere.pass4363.post_run_receipt_import_summary.v1",
  passId: PASS_ID,
  generatedAtIso: new Date().toISOString(),
  ok,
  decision: ok ? "IMPORTED_GREEN" : "BLOCKED_POST_RUN_RECEIPTS_MISSING_OR_NOT_GREEN",
  status: ok ? "executed_pass" : "blocked_until_windows_hosted_domain_operator_outputs_imported",
  noVisualChanges: true,
  publicTopkaLiveAllowed: false,
  claimAllowed: false,
  sourceRoot: args.sourceRoot,
  requiredRowCount: rows.length,
  greenRowCount: rows.length - failedRows.length,
  failedRowCount: failedRows.length,
  rows,
  failedRows,
  rootHash: rootHash(rows),
  nextAction: ok ? "Rerun release evidence ledger, final preflight and release candidate seal." : "Execute Windows Node24 final runner plus hosted/domain/operator proof steps, then rerun proof:post-run:import."
};
if (args.writeReceipt || summary.ok) writeJson(path.join(args.sourceRoot, SUMMARY), summary);
if (!summary.ok) {
  const failure = { schema: "velmere.pass4363.post_run_receipt_import_failure.v1", passId: PASS_ID, generatedAtIso: new Date().toISOString(), ok: false, failureArtifact: FAILURE, summaryPath: SUMMARY, failedRows, publicTopkaLiveAllowed: false, claimAllowed: false, nextAction: summary.nextAction };
  writeJson(path.join(args.sourceRoot, FAILURE), failure);
  console.error(`${PASS_ID} post-run import BLOCKED: ${failedRows.length}/${rows.length} rows not green`);
  if (!args.allowMissing) process.exit(1);
} else {
  console.log(`${PASS_ID} post-run import PASS: ${rows.length}/${rows.length} rows green`);
}
