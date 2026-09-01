#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4366";
const SUMMARY = path.join("artifacts", "live-receipts", "live-store-tamper-evidence", "live-receipt-store-tamper-evidence-summary.json");
const FAILURE = path.join("artifacts", "failure-artifacts", "live-store-tamper-evidence", "live-receipt-store-tamper-evidence-failure.json");
const TRAIL = path.join("artifacts", "live-receipts", "live-store-tamper-evidence", "live-receipt-store-append-only-trail.jsonl");
const HEAD = path.join("artifacts", "live-receipts", "live-store-tamper-evidence", "live-receipt-store-chain-head.json");
const FORBIDDEN_TOKENS = ["rawcustomerevidence", "customeremail", "walletaddress", "stripecustomerid", "paymentintent", "authorization", "set-cookie", "providersecret", "privatekey", "seedphrase", "access_token", "refresh_token", "sk_live_", "sk_test_", "whsec_", "bearer ", "basic "];
const REQUIRED = [
  ["post_run_receipt_promotion_green", "artifacts/live-receipts/operator-post-run-promotion/operator-post-run-promotion-summary.json", ["ok", "decision", "promotedRowCount", "rootHash"]],
  ["live_receipt_store_quarantine_green", "artifacts/live-receipts/live-store-quarantine/live-store-quarantine-summary.json", ["ok", "decision", "requiredRowCount", "greenRowCount", "rootHash"]],
  ["release_evidence_ledger_green", "artifacts/live-receipts/release-evidence-ledger/release-evidence-ledger-summary.json", ["ok", "decision", "requiredRowCount", "greenRowCount", "rootHash"]],
  ["final_release_candidate_green", "artifacts/live-receipts/final-release-candidate/final-public-release-candidate-summary.json", ["ok", "releaseDecision", "requiredRowCount", "greenRowCount"]],
];
function parseArgs(argv) {
  const out = { sourceRoot: ".", allowMissing: false, writeReceipt: true, appendTrail: true, maxAgeMs: 20 * 60 * 1000 };
  for (const arg of argv) {
    if (arg === "--allow-missing") out.allowMissing = true;
    else if (arg === "--no-write-receipt") out.writeReceipt = false;
    else if (arg === "--no-append-trail") out.appendTrail = false;
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
function leaks(text, value) {
  const lower = String(text || "").toLowerCase();
  const keyText = flattenKeys(value).join("\n").toLowerCase();
  return [...new Set(FORBIDDEN_TOKENS.filter((token) => lower.includes(token) || keyText.includes(token)))];
}
function newestTimestamp(value) {
  const candidates = [value?.generatedAtIso, value?.completedAtIso, value?.requestCompletedAtIso, value?.promotedAtIso, value?.sealedAtIso].filter(Boolean);
  const times = candidates.map((x) => Date.parse(String(x))).filter(Number.isFinite);
  return times.length ? Math.max(...times) : null;
}
function decision(value) {
  if (!value || typeof value !== "object") return "not_green";
  if (value.ok === true || value.status === "PASS" || value.status === "executed_pass" || value.status === "LIVE_GREEN") return "executed_pass";
  if (value.releaseDecision === "READY_TO_SEAL" && value.ok === true) return "executed_pass";
  if (value.finalDecision === "READY" && value.ok === true) return "executed_pass";
  return "not_green";
}
function row(root, spec, args) {
  const [lane, relPath, fields] = spec;
  const abs = path.join(root, relPath);
  const text = read(abs);
  const exists = text.length > 0;
  const parsed = exists ? parseJson(text) : { ok: false, value: null, error: "missing" };
  const missingFields = parsed.ok ? fields.filter((field) => !fieldPresent(parsed.value, field)) : fields;
  const publicLeakTokens = exists ? leaks(text, parsed.value) : [];
  const stamp = parsed.ok ? newestTimestamp(parsed.value) : null;
  const ageMs = stamp === null ? null : Date.now() - stamp;
  const freshnessOk = stamp === null ? false : ageMs >= 0 && ageMs <= args.maxAgeMs;
  const actualDecision = parsed.ok ? decision(parsed.value) : "missing";
  const contentHash = exists ? sha256(text) : null;
  const status = !exists ? "missing" : !parsed.ok ? "parse_failed" : publicLeakTokens.length ? "redaction_failed" : missingFields.length ? "field_missing" : !freshnessOk ? "freshness_missing_or_expired" : actualDecision === "executed_pass" ? "executed_pass" : "not_green";
  return {
    schema: "velmere.pass4366.live_receipt_store_tamper_evidence_row.v1",
    passId: PASS_ID,
    lane,
    canonicalPath: relPath,
    exists,
    parsedOk: parsed.ok,
    status,
    green: status === "executed_pass",
    decision: actualDecision,
    expectedFields: fields,
    missingFields,
    safePublicFieldsOnly: publicLeakTokens.length === 0,
    publicLeakTokens,
    generatedAtEpochMs: stamp,
    ageMs,
    freshnessOk,
    sha256: contentHash,
    bytes: exists ? Buffer.byteLength(text, "utf8") : 0,
    blocksPublicTopkaLive: true,
    blocksReleaseCandidateSeal: true,
  };
}
function readHead(root) {
  const text = read(path.join(root, HEAD));
  if (!text) return null;
  const parsed = parseJson(text);
  return parsed.ok ? parsed.value : null;
}
function buildTrailRecord(rows, previousHeadHash) {
  const generatedAtIso = new Date().toISOString();
  const rowHashes = rows.map((r) => `${r.lane}:${r.sha256 || "missing"}`).join("|");
  const canonicalChainInput = `${PASS_ID}|${generatedAtIso}|${previousHeadHash || "GENESIS"}|${rowHashes}`;
  const chainHead = sha256(canonicalChainInput);
  return {
    schema: "velmere.pass4366.live_receipt_store_append_only_record.v1",
    passId: PASS_ID,
    generatedAtIso,
    previousHeadHash: previousHeadHash || null,
    rowCount: rows.length,
    greenRowCount: rows.filter((r) => r.green).length,
    failedRowCount: rows.filter((r) => !r.green).length,
    rowHashes: rows.map((r) => ({ lane: r.lane, canonicalPath: r.canonicalPath, sha256: r.sha256, green: r.green, status: r.status })),
    chainHead,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
  };
}
const args = parseArgs(process.argv.slice(2));
const rows = REQUIRED.map((spec) => row(args.sourceRoot, spec, args));
const failedRows = rows.filter((r) => !r.green);
const previousHead = readHead(args.sourceRoot);
const trailRecord = buildTrailRecord(rows, previousHead?.chainHead || previousHead?.headHash || null);
const decisionValue = failedRows.length === 0 ? "TAMPER_EVIDENCE_GREEN" : "BLOCKED";
const summary = {
  schema: "velmere.pass4366.live_receipt_store_tamper_evidence_summary.v1",
  passId: PASS_ID,
  generatedAtIso: trailRecord.generatedAtIso,
  ok: decisionValue === "TAMPER_EVIDENCE_GREEN",
  decision: decisionValue,
  status: decisionValue === "TAMPER_EVIDENCE_GREEN" ? "executed_pass" : "blocked_until_append_only_live_receipt_trail_green",
  noVisualChanges: true,
  publicTopkaLiveAllowed: false,
  claimAllowed: false,
  appendOnlyTrailPath: TRAIL,
  chainHeadPath: HEAD,
  chainHead: trailRecord.chainHead,
  previousHeadHash: trailRecord.previousHeadHash,
  requiredRowCount: rows.length,
  greenRowCount: rows.length - failedRows.length,
  failedRowCount: failedRows.length,
  rows,
  failedRows,
  rootHash: sha256(JSON.stringify({ rows: rows.map((r) => ({ lane: r.lane, sha256: r.sha256, status: r.status })), chainHead: trailRecord.chainHead })),
  nextAction: decisionValue === "TAMPER_EVIDENCE_GREEN" ? "Promote chain head into release evidence ledger and rerun final RC." : "Generate fresh green promoted/quarantine/ledger/RC receipts, then rerun proof:live-receipts:tamper-evidence.",
};
if (args.writeReceipt || summary.ok) {
  writeJson(path.join(args.sourceRoot, SUMMARY), summary);
  writeJson(path.join(args.sourceRoot, HEAD), { schema: "velmere.pass4366.live_receipt_store_chain_head.v1", passId: PASS_ID, generatedAtIso: summary.generatedAtIso, chainHead: trailRecord.chainHead, previousHeadHash: trailRecord.previousHeadHash, rootHash: summary.rootHash, ok: summary.ok, decision: summary.decision });
}
if (args.appendTrail) {
  const trailPath = path.join(args.sourceRoot, TRAIL);
  ensureDir(path.dirname(trailPath));
  fs.appendFileSync(trailPath, `${JSON.stringify(trailRecord)}\n`, "utf8");
}
if (!summary.ok) {
  const failure = { schema: "velmere.pass4366.live_receipt_store_tamper_evidence_failure.v1", passId: PASS_ID, generatedAtIso: new Date().toISOString(), ok: false, decision: summary.decision, summaryPath: SUMMARY, failureArtifact: FAILURE, failedRows, chainHead: summary.chainHead, publicTopkaLiveAllowed: false, claimAllowed: false, nextAction: summary.nextAction };
  writeJson(path.join(args.sourceRoot, FAILURE), failure);
  console.error(`${PASS_ID} live receipt store tamper evidence BLOCKED: ${failedRows.length}/${rows.length} rows not green.`);
  if (!args.allowMissing) process.exitCode = 1;
} else {
  console.log(`${PASS_ID} live receipt store tamper evidence GREEN: ${SUMMARY}`);
}
