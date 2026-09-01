#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4364";
const SUMMARY = path.join("artifacts", "live-receipts", "operator-post-run-promotion", "operator-post-run-promotion-summary.json");
const FAILURE = path.join("artifacts", "failure-artifacts", "operator-post-run-promotion", "operator-post-run-promotion-failure.json");
const PROMOTION_ROOT = path.join("artifacts", "live-receipts", "promoted");
const FORBIDDEN_TOKENS = ["rawcustomerevidence", "customeremail", "walletaddress", "stripecustomerid", "paymentintent", "authorization", "set-cookie", "providersecret", "privatekey", "seedphrase", "access_token", "refresh_token", "sk_live_", "sk_test_", "whsec_", "bearer ", "basic "];
const REQUIRED_ROWS = [
  ["post_run_receipt_import_green", "artifacts/live-receipts/operator-post-run-import/operator-post-run-import-summary.json", ["ok", "decision", "requiredRowCount", "greenRowCount", "rootHash"], "IMPORTED_GREEN", "operator-post-run-import-summary.promoted.json"],
  ["final_release_candidate_green_after_import", "artifacts/live-receipts/final-release-candidate/final-public-release-candidate-summary.json", ["ok", "releaseDecision", "requiredRowCount", "greenRowCount"], "executed_pass", "final-public-release-candidate-summary.promoted.json"],
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
  if (lane === "post_run_receipt_import_green" && value.ok === true && value.decision === "IMPORTED_GREEN") return "IMPORTED_GREEN";
  if (value.ok === true || value.status === "PASS" || value.status === "executed_pass" || value.releaseDecision === "READY_TO_SEAL") return "executed_pass";
  return "not_green";
}
function freshness(value, maxAgeMs) {
  const candidates = [value?.generatedAtIso, value?.completedAtIso, value?.requestCompletedAtIso].filter(Boolean);
  if (!candidates.length) return { ok: false, ageMs: null, reason: "timestamp_missing" };
  const newest = Math.max(...candidates.map((x) => Date.parse(String(x))).filter(Number.isFinite));
  if (!Number.isFinite(newest)) return { ok: false, ageMs: null, reason: "timestamp_parse_failed" };
  const ageMs = Date.now() - newest;
  return { ok: ageMs >= 0 && ageMs <= maxAgeMs, ageMs, reason: ageMs <= maxAgeMs ? "fresh" : "expired" };
}
function row(root, spec, args) {
  const [lane, relPath, fields, requiredDecision, promotedName] = spec;
  const abs = path.join(root, relPath);
  const text = read(abs);
  const exists = text.length > 0;
  const parsed = exists ? parseJson(text) : { ok: false, value: null, error: "missing" };
  const missingFields = parsed.ok ? fields.filter((field) => !fieldPresent(parsed.value, field)) : fields;
  const leaks = exists ? leakTokens(text, parsed.value) : [];
  const actualDecision = parsed.ok ? decision(parsed.value, lane) : "missing";
  const fresh = parsed.ok ? freshness(parsed.value, args.maxAgeMs) : { ok: false, ageMs: null, reason: "missing" };
  const status = !exists ? "missing" : !parsed.ok ? "parse_failed" : leaks.length ? "redaction_failed" : missingFields.length ? "field_missing" : !fresh.ok ? `freshness_${fresh.reason}` : actualDecision === requiredDecision ? "executed_pass" : "not_required_decision";
  return { schema: "velmere.pass4364.post_run_receipt_promotion_row.v1", passId: PASS_ID, lane, canonicalPath: relPath, promotedPath: path.join(PROMOTION_ROOT, promotedName), exists, parsedOk: parsed.ok, status, decision: actualDecision, requiredDecision, green: status === "executed_pass", expectedFields: fields, missingFields, safePublicFieldsOnly: leaks.length === 0, publicLeakTokens: leaks, freshness: fresh, sha256: exists ? sha256(text) : null, bytes: exists ? Buffer.byteLength(text, "utf8") : 0, blocksReleaseCandidateSeal: true, blocksPublicTopkaLive: true, parsedValue: parsed.ok ? parsed.value : null };
}
function promotionRootHash(rows) {
  return sha256(rows.map((r) => `${r.lane}:${r.sha256 || "missing"}:${r.status}`).sort().join("\n"));
}
function promote(root, row) {
  const promotedAbs = path.join(root, row.promotedPath);
  const copy = { ...row.parsedValue, promotedByPass: PASS_ID, promotedAtIso: new Date().toISOString(), sourcePath: row.canonicalPath, sourceSha256: row.sha256, promotionDecision: "PROMOTED_GREEN" };
  writeJson(promotedAbs, copy);
  return { lane: row.lane, promotedPath: row.promotedPath, sourcePath: row.canonicalPath, sourceSha256: row.sha256, promotedSha256: sha256(JSON.stringify(copy)), promotedAtIso: copy.promotedAtIso };
}
const args = parseArgs(process.argv.slice(2));
const rows = REQUIRED_ROWS.map((spec) => row(args.sourceRoot, spec, args));
const failedRows = rows.filter((r) => !r.green);
const promotedRows = failedRows.length === 0 ? rows.map((r) => promote(args.sourceRoot, r)) : [];
const rootHash = promotionRootHash(rows);
const ok = failedRows.length === 0;
const summary = { schema: "velmere.pass4364.post_run_receipt_promotion_summary.v1", passId: PASS_ID, generatedAtIso: new Date().toISOString(), ok, decision: ok ? "PROMOTED_GREEN" : "BLOCKED_PROMOTION_INPUTS_NOT_GREEN", status: ok ? "executed_pass" : "blocked_until_post_run_import_and_final_rc_are_green", noVisualChanges: true, publicTopkaLiveAllowed: false, claimAllowed: false, requiredRowCount: rows.length, greenRowCount: rows.length - failedRows.length, failedRowCount: failedRows.length, promotedRowCount: promotedRows.length, rootHash, rows: rows.map(({ parsedValue, ...rest }) => rest), promotedRows, failedRows: failedRows.map(({ parsedValue, ...rest }) => rest), nextAction: ok ? "Run release evidence ledger and final RC seal with promoted receipt index." : "Run Windows Node24 full proof, hosted smoke, domain receipt matrix and post-run import until green, then rerun proof:post-run:promote." };
if (args.writeReceipt || ok) writeJson(path.join(args.sourceRoot, SUMMARY), summary);
if (!ok) {
  const failure = { schema: "velmere.pass4364.post_run_receipt_promotion_failure.v1", passId: PASS_ID, generatedAtIso: new Date().toISOString(), ok: false, decision: summary.decision, summaryPath: SUMMARY, failureArtifact: FAILURE, failedRows: summary.failedRows, rootHash, publicTopkaLiveAllowed: false, claimAllowed: false, nextAction: summary.nextAction };
  writeJson(path.join(args.sourceRoot, FAILURE), failure);
  console.error(`${PASS_ID} post-run receipt promotion BLOCKED: ${failedRows.length}/${rows.length} rows not green.`);
  if (!args.allowMissing) process.exitCode = 1;
} else {
  console.log(`${PASS_ID} post-run receipt promotion PROMOTED_GREEN: ${SUMMARY}`);
}
