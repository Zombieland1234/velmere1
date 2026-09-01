#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4367";
const SUMMARY = path.join("artifacts", "public-proof", "transparency", "public-proof-transparency-export-summary.json");
const PUBLIC_INDEX = path.join("artifacts", "public-proof", "transparency", "public-proof-transparency-index.json");
const FAILURE = path.join("artifacts", "failure-artifacts", "public-proof-transparency", "public-proof-transparency-export-failure.json");
const FORBIDDEN_TOKENS = ["rawcustomerevidence", "customeremail", "walletaddress", "stripecustomerid", "paymentintent", "authorization", "set-cookie", "providersecret", "privatekey", "seedphrase", "access_token", "refresh_token", "sk_live_", "sk_test_", "whsec_", "bearer ", "basic ", "rawbody", "secret", "token"];
const REQUIRED = [
  ["safe_launch_copy_pack", "artifacts/live-receipts/public-claim-firewall/safe-launch-copy-pack.json", ["schema", "generatedAtIso"]],
  ["release_evidence_ledger_green", "artifacts/live-receipts/release-evidence-ledger/release-evidence-ledger-summary.json", ["ok", "decision", "rootHash"]],
  ["live_receipt_tamper_evidence_chain_head", "artifacts/live-receipts/live-store-tamper-evidence/live-receipt-store-chain-head.json", ["chainHead", "rootHash", "generatedAtIso"]],
  ["final_release_candidate_green", "artifacts/live-receipts/final-release-candidate/final-public-release-candidate-summary.json", ["ok", "releaseDecision", "requiredRowCount", "greenRowCount"]],
  ["operator_execution_handoff_green", "artifacts/live-receipts/operator-execution-handoff/operator-execution-handoff-summary.json", ["ok", "decision", "finalWindowsCommand", "rootHash"]],
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
  const leaks = exists ? leakTokens(text, parsed.value) : [];
  const stamp = parsed.ok ? newestTimestamp(parsed.value) : null;
  const ageMs = stamp === null ? null : Date.now() - stamp;
  const freshnessOk = stamp === null ? false : ageMs >= 0 && ageMs <= args.maxAgeMs;
  const actualDecision = parsed.ok ? decision(parsed.value) : "missing";
  const status = !exists ? "missing" : !parsed.ok ? "parse_failed" : leaks.length ? "redaction_failed" : missingFields.length ? "field_missing" : !freshnessOk ? "freshness_missing_or_expired" : actualDecision === "executed_pass" ? "executed_pass" : "not_green";
  const contentHash = exists ? sha256(text) : null;
  return {
    schema: "velmere.pass4367.public_transparency_source_row.v1",
    passId: PASS_ID,
    lane,
    canonicalPrivateSourcePath: relPath,
    exists,
    parsedOk: parsed.ok,
    status,
    green: status === "executed_pass",
    decision: actualDecision,
    safePublicProjectionOnly: true,
    rawReceiptBodyPublished: false,
    publicLeakTokens: leaks,
    expectedFields: fields,
    missingFields,
    ageMs,
    freshnessOk,
    sourceSha256: contentHash,
    publicProjection: {
      lane,
      status,
      green: status === "executed_pass",
      sourceSha256: contentHash,
      generatedAtIso: parsed.ok ? (parsed.value.generatedAtIso || parsed.value.completedAtIso || null) : null,
      rootHash: parsed.ok ? (parsed.value.rootHash || parsed.value.chainHead || null) : null,
      decision: actualDecision,
      publicTopkaLiveAllowed: false,
      claimAllowed: false,
    },
    blocksPublicTopkaLive: true,
    blocksReleaseCandidateSeal: true,
  };
}
const args = parseArgs(process.argv.slice(2));
const rows = REQUIRED.map((spec) => row(args.sourceRoot, spec, args));
const failedRows = rows.filter((r) => !r.green);
const generatedAtIso = new Date().toISOString();
const publicIndex = {
  schema: "velmere.pass4367.public_proof_transparency_index.v1",
  passId: PASS_ID,
  generatedAtIso,
  publicTopkaLiveAllowed: false,
  claimAllowed: false,
  indexMode: "read_only_redacted_projection",
  noRawReceiptsPublished: true,
  noPrivateEvidencePublished: true,
  publicRows: rows.map((r) => r.publicProjection),
  blockedReasons: failedRows.length ? ["public_transparency_sources_not_all_green", "raw_private_receipts_are_not_published", "signed_hosted_domain_windows_receipts_still_required"] : [],
  rootHash: sha256(JSON.stringify(rows.map((r) => ({ lane: r.lane, status: r.status, sha256: r.sourceSha256 })))),
};
const decisionValue = failedRows.length === 0 ? "PUBLIC_TRANSPARENCY_GREEN" : "BLOCKED";
const summary = {
  schema: "velmere.pass4367.public_proof_transparency_export_summary.v1",
  passId: PASS_ID,
  generatedAtIso,
  ok: decisionValue === "PUBLIC_TRANSPARENCY_GREEN",
  decision: decisionValue,
  status: decisionValue === "PUBLIC_TRANSPARENCY_GREEN" ? "executed_pass" : "blocked_until_public_safe_transparency_sources_green",
  noVisualChanges: true,
  publicTopkaLiveAllowed: false,
  claimAllowed: false,
  publicIndexPath: PUBLIC_INDEX,
  requiredRowCount: rows.length,
  greenRowCount: rows.length - failedRows.length,
  failedRowCount: failedRows.length,
  rows,
  failedRows,
  rootHash: publicIndex.rootHash,
  nextAction: decisionValue === "PUBLIC_TRANSPARENCY_GREEN" ? "Bind public transparency index into release evidence ledger and rerun final RC." : "Generate green evidence ledger, chain head, final RC and operator handoff receipts, then rerun proof:public-transparency:export.",
};
if (args.writeReceipt || summary.ok) {
  writeJson(path.join(args.sourceRoot, PUBLIC_INDEX), publicIndex);
  writeJson(path.join(args.sourceRoot, SUMMARY), summary);
}
if (!summary.ok) {
  const failure = { schema: "velmere.pass4367.public_proof_transparency_export_failure.v1", passId: PASS_ID, generatedAtIso: new Date().toISOString(), ok: false, decision: summary.decision, summaryPath: SUMMARY, publicIndexPath: PUBLIC_INDEX, failureArtifact: FAILURE, failedRows, publicTopkaLiveAllowed: false, claimAllowed: false, nextAction: summary.nextAction };
  writeJson(path.join(args.sourceRoot, FAILURE), failure);
  console.error(`${PASS_ID} public proof transparency export BLOCKED: ${failedRows.length}/${rows.length} rows not green.`);
  if (!args.allowMissing) process.exitCode = 1;
} else {
  console.log(`${PASS_ID} public proof transparency export GREEN: ${SUMMARY}`);
}
