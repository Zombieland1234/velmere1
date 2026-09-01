#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4355";
const OUT_DIR = path.join("artifacts", "live-receipts", "domain-live-receipts");
const FAIL_DIR = path.join("artifacts", "failure-artifacts", "domain-live-receipts");
const SUMMARY = path.join(OUT_DIR, "domain-live-receipt-matrix-summary.json");
const FAILURE = path.join(FAIL_DIR, "domain-live-receipt-matrix-failure.json");
const FORBIDDEN_TOKENS = [
  "rawcustomerevidence", "customeremail", "walletaddress", "stripecustomerid", "paymentintent",
  "authorization", "set-cookie", "providersecret", "privatekey", "seedphrase", "access_token",
  "refresh_token", "sk_live_", "sk_test_", "whsec_", "bearer ", "basic "
];
const DOMAIN_CONTRACTS = [
  { lane: "provider_live_data_smoke", short: "provider", canonicalSummaryPath: "artifacts/live-receipts/provider-live-data-smoke/provider-smoke-summary.json", canonicalFailurePath: "artifacts/failure-artifacts/provider-live-data-smoke/provider-smoke-failure.json", expectedFields: ["ok", "status", "providers", "generatedAtIso", "scenarioCount", "assetCoverage"], minimumScenarioCount: 9, sourceDirs: ["artifacts/live-receipts/provider", "artifacts/live-receipts/provider-live-data-smoke"] },
  { lane: "payment_entitlement_replay", short: "payment", canonicalSummaryPath: "artifacts/live-receipts/payment-entitlement-replay/payment-replay-summary.json", canonicalFailurePath: "artifacts/failure-artifacts/payment-entitlement-replay/payment-replay-failure.json", expectedFields: ["ok", "status", "scenarios", "generatedAtIso", "serverEntitlementOnly", "successUrlCannotUnlock"], minimumScenarioCount: 10, sourceDirs: ["artifacts/live-receipts/payment", "artifacts/live-receipts/payment-entitlement-replay"] },
  { lane: "pdf_angel_same_payload_parity", short: "pdf-angel", canonicalSummaryPath: "artifacts/live-receipts/pdf-angel-parity/pdf-angel-parity-summary.json", canonicalFailurePath: "artifacts/failure-artifacts/pdf-angel-parity/pdf-angel-parity-failure.json", expectedFields: ["ok", "status", "canonicalPayloadHash", "generatedAtIso", "surfaces", "tiers"], minimumScenarioCount: 6, sourceDirs: ["artifacts/live-receipts/pdf-angel", "artifacts/live-receipts/pdf-angel-parity"] },
  { lane: "ai_audit_eval_pl_en_de", short: "ai-eval", canonicalSummaryPath: "artifacts/live-receipts/ai-audit-eval/ai-audit-eval-pl-en-de-summary.json", canonicalFailurePath: "artifacts/failure-artifacts/ai-audit-eval/ai-audit-eval-pl-en-de-failure.json", expectedFields: ["ok", "status", "locales", "generatedAtIso", "evalCaseCount", "unsafeClaimBlocked"], minimumScenarioCount: 9, sourceDirs: ["artifacts/live-receipts/ai-audit-eval", "artifacts/live-receipts/angel-ai-eval"] },
];
function parseArgs(argv) {
  const out = { lane: "all", allowMissing: false, writeReceipt: true, sourceRoot: "." };
  for (const arg of argv) {
    if (arg === "--allow-missing") out.allowMissing = true;
    else if (arg === "--no-write-receipt") out.writeReceipt = false;
    else if (arg.startsWith("--lane=")) out.lane = arg.slice("--lane=".length) || "all";
    else if (arg.startsWith("--source-root=")) out.sourceRoot = arg.slice("--source-root=".length) || ".";
  }
  return out;
}
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8"); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""; }
function sha256(value) { return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`; }
function parseJson(text) { try { return { parsedOk: true, value: JSON.parse(text) }; } catch (e) { return { parsedOk: false, value: null, error: e instanceof Error ? e.message : String(e) }; } }
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
function fieldPresent(parsedValue, field) {
  if (!parsedValue || typeof parsedValue !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(parsedValue, field)) return true;
  return flattenKeys(parsedValue).some((key) => key === field || key.endsWith(`.${field}`));
}
function leakTokens(text, parsedValue) {
  const lower = text.toLowerCase();
  const keys = flattenKeys(parsedValue).join("\n").toLowerCase();
  return [...new Set(FORBIDDEN_TOKENS.filter((token) => lower.includes(token) || keys.includes(token)))];
}
function isPass(parsedValue) {
  return Boolean(parsedValue && typeof parsedValue === "object" && (parsedValue.ok === true || parsedValue.status === "PASS" || parsedValue.status === "executed_pass" || parsedValue.status === "LIVE_GREEN"));
}
function scenarioCount(parsedValue) {
  if (!parsedValue || typeof parsedValue !== "object") return 0;
  if (typeof parsedValue.scenarioCount === "number") return parsedValue.scenarioCount;
  if (typeof parsedValue.evalCaseCount === "number") return parsedValue.evalCaseCount;
  if (Array.isArray(parsedValue.scenarios)) return parsedValue.scenarios.length;
  if (Array.isArray(parsedValue.scenarioResults)) return parsedValue.scenarioResults.length;
  if (Array.isArray(parsedValue.providers)) return parsedValue.providers.length;
  if (Array.isArray(parsedValue.locales)) return parsedValue.locales.length;
  return 0;
}
function collectSourceEvidence(root, contract) {
  const out = [];
  for (const relDir of contract.sourceDirs) {
    const dir = path.join(root, relDir);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".json")) out.push(path.join(relDir, entry.name));
    }
  }
  return [...new Set(out)].sort();
}
function buildRow(args, contract) {
  const sourceRoot = args.sourceRoot;
  const receiptPathAbs = path.join(sourceRoot, contract.canonicalSummaryPath);
  const text = read(receiptPathAbs);
  const exists = text.length > 0;
  const parsed = exists ? parseJson(text) : { parsedOk: false, value: null, error: "missing" };
  const leaks = exists ? leakTokens(text, parsed.value) : [];
  const missingFields = parsed.parsedOk ? contract.expectedFields.filter((field) => !fieldPresent(parsed.value, field)) : contract.expectedFields;
  const count = parsed.parsedOk ? scenarioCount(parsed.value) : 0;
  const countOk = count >= contract.minimumScenarioCount;
  const receiptPass = parsed.parsedOk && isPass(parsed.value);
  const sourceEvidence = collectSourceEvidence(sourceRoot, contract);
  const status = !exists ? "missing" : !parsed.parsedOk ? "parse_failed" : leaks.length ? "redaction_failed" : !receiptPass ? "executed_fail" : missingFields.length ? "field_missing" : !countOk ? "scenario_short" : "executed_pass";
  const row = { schema: "velmere.pass4355.domain_live_receipt_matrix_row.v1", passId: PASS_ID, lane: contract.lane, canonicalSummaryPath: contract.canonicalSummaryPath, canonicalFailurePath: contract.canonicalFailurePath, exists, parsedOk: parsed.parsedOk, receiptPass, status, expectedFields: contract.expectedFields, missingFields, scenarioCount: count, minimumScenarioCount: contract.minimumScenarioCount, scenarioCountOk: countOk, sourceEvidenceCount: sourceEvidence.length, sourceEvidence, safePublicFieldsOnly: leaks.length === 0, publicLeakTokens: leaks, sha256: exists ? sha256(text) : null, bytes: exists ? Buffer.byteLength(text, "utf8") : 0, requiredForPublicTopkaLive: true, requiredBeforeMaterializedBundle: true, publicTopkaLiveAllowed: false, claimAllowed: false };
  if (status !== "executed_pass") {
    writeJson(path.join(sourceRoot, contract.canonicalFailurePath), { schema: "velmere.pass4355.domain_live_receipt_lane_failure.v1", passId: PASS_ID, generatedAtIso: new Date().toISOString(), ok: false, lane: contract.lane, status, canonicalSummaryPath: contract.canonicalSummaryPath, missingFields, publicLeakTokens: leaks, scenarioCount: count, minimumScenarioCount: contract.minimumScenarioCount, sourceEvidence, nextAction: `Execute real ${contract.lane} scenarios and write a redacted green canonical summary before public LIVE.` });
  }
  return row;
}
const args = parseArgs(process.argv.slice(2));
const selected = args.lane === "all" ? DOMAIN_CONTRACTS : DOMAIN_CONTRACTS.filter((c) => c.short === args.lane || c.lane === args.lane);
if (selected.length === 0) {
  console.error(`${PASS_ID} domain receipt matrix FAIL: unknown lane ${args.lane}`);
  process.exit(1);
}
const rows = selected.map((contract) => buildRow(args, contract));
const failedRows = rows.filter((row) => row.status !== "executed_pass");
const greenLaneCount = rows.length - failedRows.length;
const summary = { schema: "velmere.pass4355.domain_live_receipt_matrix_summary.v1", passId: PASS_ID, generatedAtIso: new Date().toISOString(), ok: failedRows.length === 0, status: failedRows.length === 0 ? "executed_pass" : "blocked_until_domain_receipts_green", noVisualChanges: true, publicTopkaLiveAllowed: false, claimAllowed: false, lane: args.lane, requiredDomainLaneCount: selected.length, laneCount: selected.length, greenDomainLaneCount: greenLaneCount, greenLaneCount, failedDomainLaneCount: failedRows.length, failedLaneCount: failedRows.length, rows, laneRows: rows, matrixSummaryPath: SUMMARY, requiredBeforeMaterializedBundle: true, requiredBeforeOperatorSignature: true, liveBlockedReasons: failedRows.map((row) => `${row.lane}_${row.status}`), nextAction: failedRows.length ? "Run real provider, payment, PDF/Angel and AI eval receipt harnesses until every domain lane is executed_pass, then run proof:receipts:materialize." : "Run proof:receipts:materialize, proof:receipts:bundle, proof:mega-bindings and operator manifest signing." };
if (args.writeReceipt) writeJson(path.join(args.sourceRoot, SUMMARY), summary);
if (failedRows.length) {
  const failure = { schema: "velmere.pass4355.domain_live_receipt_matrix_failure.v1", passId: PASS_ID, generatedAtIso: new Date().toISOString(), ok: false, summaryPath: SUMMARY, failureArtifact: FAILURE, failedRows, publicTopkaLiveAllowed: false, claimAllowed: false, nextAction: summary.nextAction };
  writeJson(path.join(args.sourceRoot, FAILURE), failure);
  console.error(`${PASS_ID} domain live receipt matrix FAIL: ${failedRows.length}/${rows.length} domain lanes not green.`);
  if (!args.allowMissing) process.exitCode = 1;
} else {
  console.log(`${PASS_ID} domain live receipt matrix PASS: ${SUMMARY}`);
}
