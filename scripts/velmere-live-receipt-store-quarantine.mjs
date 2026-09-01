#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4365";
const SUMMARY = path.join("artifacts", "live-receipts", "live-store-quarantine", "live-store-quarantine-summary.json");
const FAILURE = path.join("artifacts", "failure-artifacts", "live-store-quarantine", "live-store-quarantine-failure.json");
const QUARANTINE_ROOT = path.join("artifacts", "quarantine", "live-receipts");
const FORBIDDEN_TOKENS = ["rawcustomerevidence", "customeremail", "walletaddress", "stripecustomerid", "paymentintent", "authorization", "set-cookie", "providersecret", "privatekey", "seedphrase", "access_token", "refresh_token", "sk_live_", "sk_test_", "whsec_", "bearer ", "basic "];
const REQUIRED_ROWS = [
  ["post_run_receipt_promotion_green", "artifacts/live-receipts/operator-post-run-promotion/operator-post-run-promotion-summary.json", ["ok", "decision", "promotedRowCount", "rootHash"], "PROMOTED_GREEN", "operator-post-run-promotion-summary.quarantined.json"],
  ["final_release_candidate_green", "artifacts/live-receipts/final-release-candidate/final-public-release-candidate-summary.json", ["ok", "releaseDecision", "requiredRowCount", "greenRowCount"], "READY_TO_SEAL", "final-public-release-candidate-summary.quarantined.json"],
  ["release_evidence_ledger_green", "artifacts/live-receipts/release-evidence-ledger/release-evidence-ledger-summary.json", ["ok", "decision", "requiredRowCount", "greenRowCount", "rootHash"], "LEDGER_GREEN", "release-evidence-ledger-summary.quarantined.json"],
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
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8"); }
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
function decision(value) {
  if (!value || typeof value !== "object") return "not_green";
  if (value.decision === "PROMOTED_GREEN") return "PROMOTED_GREEN";
  if (value.releaseDecision === "READY_TO_SEAL" || value.decision === "READY_TO_SEAL") return "READY_TO_SEAL";
  if (value.decision === "LEDGER_GREEN" || (value.ok === true && value.rootHash && Array.isArray(value.rows))) return "LEDGER_GREEN";
  if (value.ok === true || value.status === "executed_pass") return "executed_pass";
  return "not_green";
}
function freshness(value, maxAgeMs) {
  const candidates = [value?.generatedAtIso, value?.completedAtIso, value?.requestCompletedAtIso, value?.promotedAtIso].filter(Boolean);
  if (!candidates.length) return { ok: false, ageMs: null, reason: "timestamp_missing" };
  const newest = Math.max(...candidates.map((x) => Date.parse(String(x))).filter(Number.isFinite));
  if (!Number.isFinite(newest)) return { ok: false, ageMs: null, reason: "timestamp_parse_failed" };
  const ageMs = Date.now() - newest;
  return { ok: ageMs >= 0 && ageMs <= maxAgeMs, ageMs, reason: ageMs <= maxAgeMs ? "fresh" : "expired" };
}
function hasSkipOrBlocked(value) {
  const text = JSON.stringify(value || {}).toLowerCase();
  return text.includes('"skipped"') || text.includes('prepared_only') || text.includes('blocked_until') || text.includes('expected fail') || text.includes('expected_fail');
}
function row(sourceRoot, [lane, relPath, fields, requiredDecision, quarantineName], maxAgeMs) {
  const full = path.join(sourceRoot, relPath);
  const exists = fs.existsSync(full);
  const text = exists ? read(full) : "";
  const parsed = exists ? parseJson(text) : { ok: false, value: null, error: "missing" };
  const missingFields = parsed.ok ? fields.filter((field) => !fieldPresent(parsed.value, field)) : fields;
  const leaks = leakTokens(text, parsed.value);
  const actualDecision = parsed.ok ? decision(parsed.value) : "missing";
  const fresh = parsed.ok ? freshness(parsed.value, maxAgeMs) : { ok: false, ageMs: null, reason: "missing" };
  const skipOrBlocked = parsed.ok ? hasSkipOrBlocked(parsed.value) : true;
  const green = exists && parsed.ok && missingFields.length === 0 && leaks.length === 0 && actualDecision === requiredDecision && fresh.ok && !skipOrBlocked;
  return {
    schema: "velmere.pass4365.live_store_quarantine_row.v1",
    passId: PASS_ID,
    lane,
    canonicalPath: relPath,
    quarantinePath: path.join(QUARANTINE_ROOT, quarantineName),
    exists,
    parsedOk: parsed.ok,
    actualDecision,
    requiredDecision,
    green,
    expectedFields: fields,
    missingFields,
    publicLeakTokens: leaks,
    safePublicFieldsOnly: leaks.length === 0,
    freshness: fresh,
    skipOrBlockedDetected: skipOrBlocked,
    sha256: exists ? sha256(text) : null,
    bytes: exists ? Buffer.byteLength(text, "utf8") : 0,
    blocksFinalRc: true,
    blocksPublicTopkaLive: true,
    parsedValue: parsed.ok ? parsed.value : null,
  };
}
function quarantineRows(sourceRoot, rows) {
  const quarantined = [];
  for (const r of rows.filter((x) => !x.green && x.exists)) {
    const full = path.join(sourceRoot, r.canonicalPath);
    const original = read(full);
    const quarantineFull = path.join(sourceRoot, r.quarantinePath);
    const artifact = {
      schema: "velmere.pass4365.quarantined_live_receipt.v1",
      passId: PASS_ID,
      quarantinedAtIso: new Date().toISOString(),
      lane: r.lane,
      canonicalPath: r.canonicalPath,
      quarantinePath: r.quarantinePath,
      originalSha256: sha256(original),
      reason: {
        green: r.green,
        actualDecision: r.actualDecision,
        requiredDecision: r.requiredDecision,
        missingFields: r.missingFields,
        publicLeakTokens: r.publicLeakTokens,
        freshness: r.freshness,
        skipOrBlockedDetected: r.skipOrBlockedDetected,
      },
      publicTopkaLiveAllowed: false,
      claimAllowed: false,
      original: r.parsedValue ?? null,
    };
    writeJson(quarantineFull, artifact);
    quarantined.push({ lane: r.lane, quarantinePath: r.quarantinePath, originalSha256: artifact.originalSha256 });
  }
  return quarantined;
}
const args = parseArgs(process.argv.slice(2));
const rows = REQUIRED_ROWS.map((spec) => row(args.sourceRoot, spec, args.maxAgeMs));
const failedRows = rows.filter((r) => !r.green);
const quarantinedRows = quarantineRows(args.sourceRoot, rows);
const ok = failedRows.length === 0;
const rootHash = sha256(JSON.stringify(rows.map(({ parsedValue, ...rest }) => rest)));
const summary = {
  schema: "velmere.pass4365.live_receipt_store_quarantine_summary.v1",
  passId: PASS_ID,
  generatedAtIso: new Date().toISOString(),
  ok,
  decision: ok ? "QUARANTINE_GREEN" : "BLOCKED_QUARANTINE_REQUIRED",
  status: ok ? "executed_pass" : "blocked_until_live_store_receipts_survive_quarantine_scan",
  noVisualChanges: true,
  publicTopkaLiveAllowed: false,
  claimAllowed: false,
  requiredRowCount: rows.length,
  greenRowCount: rows.length - failedRows.length,
  failedRowCount: failedRows.length,
  quarantineRowCount: quarantinedRows.length,
  quarantineRoot: QUARANTINE_ROOT,
  rootHash,
  rows: rows.map(({ parsedValue, ...rest }) => rest),
  quarantinedRows,
  failedRows: failedRows.map(({ parsedValue, ...rest }) => rest),
  nextAction: ok ? "Run release evidence ledger and final RC seal with live-store quarantine green." : "Run Windows Node24 full proof, hosted smoke, domain receipts, post-run import and promotion until promoted receipts are green/fresh; then rerun quarantine.",
};
if (args.writeReceipt) writeJson(path.join(args.sourceRoot, SUMMARY), summary);
if (!ok) {
  const failure = { schema: "velmere.pass4365.live_receipt_store_quarantine_failure.v1", passId: PASS_ID, generatedAtIso: new Date().toISOString(), ok: false, decision: summary.decision, summaryPath: SUMMARY, failureArtifact: FAILURE, failedRows: summary.failedRows, quarantinedRows, rootHash, publicTopkaLiveAllowed: false, claimAllowed: false, nextAction: summary.nextAction };
  if (args.writeReceipt) writeJson(path.join(args.sourceRoot, FAILURE), failure);
  console.error(`${PASS_ID} live receipt store quarantine BLOCKED: ${failedRows.length}/${rows.length} rows not green, quarantined ${quarantinedRows.length}.`);
  if (!args.allowMissing) process.exit(1);
} else {
  console.log(`${PASS_ID} live receipt store quarantine GREEN: ${rows.length}/${rows.length} rows green.`);
}
