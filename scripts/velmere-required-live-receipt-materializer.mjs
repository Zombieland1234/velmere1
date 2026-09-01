#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4351";
const DEFAULT_OUT_DIR = path.join("artifacts", "live-receipts", "required-bundle", "materialized");
const DEFAULT_FAILURE_DIR = path.join("artifacts", "failure-artifacts", "required-bundle", "materialized");
const SUMMARY = path.join(DEFAULT_OUT_DIR, "materialized-required-live-receipt-bundle-summary.json");
const FAILURE = path.join(DEFAULT_FAILURE_DIR, "materialized-required-live-receipt-bundle-failure.json");
const REQUIRED_RECEIPTS = [
  ["node24_environment", ".velmere-final-check-logs/VELMERE_LIVE_PROOF_SUMMARY.json", ["ok", "status", "results", "failureArtifactsDir"]],
  ["npm_ci", ".velmere-final-check-logs/npm-clean-install-receipt.json", ["ok", "status", "exitCode"]],
  ["full_typecheck", ".velmere-final-check-logs/typecheck-receipt.json", ["ok", "status", "exitCode"]],
  ["production_build", ".velmere-final-check-logs/build-receipt.json", ["ok", "status", "exitCode"]],
  ["lint", ".velmere-final-check-logs/lint-receipt.json", ["ok", "status", "exitCode"]],
  ["public_proof_route_smoke_local", "artifacts/live-receipts/proof-api/route-smoke/local-server-smoke-summary.json", ["ok", "scenarioResults", "baseUrl"]],
  ["public_proof_route_smoke_hosted", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-summary.json", ["ok", "scenarioResults", "baseUrl"]],
  ["public_proof_route_smoke_hosted_freshness", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-freshness-summary.json", ["ok", "checkedReceiptCount", "baseUrl", "maxAgeMs"]],
  ["provider_live_data_smoke", "artifacts/live-receipts/provider-live-data-smoke/provider-smoke-summary.json", ["ok", "status", "providers"]],
  ["payment_entitlement_replay", "artifacts/live-receipts/payment-entitlement-replay/payment-replay-summary.json", ["ok", "status", "scenarios"]],
  ["pdf_angel_same_payload_parity", "artifacts/live-receipts/pdf-angel-parity/pdf-angel-parity-summary.json", ["ok", "status", "canonicalPayloadHash"]],
  ["ai_audit_eval_pl_en_de", "artifacts/live-receipts/ai-audit-eval/ai-audit-eval-pl-en-de-summary.json", ["ok", "status", "locales"]],
  ["domain_live_receipt_matrix", "artifacts/live-receipts/domain-live-receipts/domain-live-receipt-matrix-summary.json", ["ok", "status", "rows", "greenDomainLaneCount"]],
  ["zero_skip_receipt_coverage", "artifacts/live-receipts/zero-skip-coverage/zero-skip-coverage-summary.json", ["ok", "status", "receiptRows", "runnerSummary"]],
];
const FORBIDDEN_TOKENS = [
  "rawcustomerevidence",
  "customeremail",
  "walletaddress",
  "stripecustomerid",
  "paymentintent",
  "authorization",
  "set-cookie",
  "providersecret",
  "privatekey",
  "seedphrase",
  "access_token",
  "refresh_token",
  "sk_live_",
  "sk_test_",
  "whsec_",
  "bearer ",
  "basic ",
];

function parseArgs(argv) {
  const out = { sourceRoot: ".", outDir: DEFAULT_OUT_DIR, allowMissing: false, writeReceipt: true };
  for (const arg of argv) {
    if (arg === "--allow-missing") out.allowMissing = true;
    else if (arg === "--no-write-receipt") out.writeReceipt = false;
    else if (arg.startsWith("--source-root=")) out.sourceRoot = arg.slice("--source-root=".length) || ".";
    else if (arg.startsWith("--out=")) out.outDir = arg.slice("--out=".length) || DEFAULT_OUT_DIR;
  }
  return out;
}
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8"); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""; }
function sha256(value) { return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`; }
function parseJson(text) {
  try { return { parsedOk: true, value: JSON.parse(text) }; }
  catch (error) { return { parsedOk: false, error: error instanceof Error ? error.message : String(error), value: null }; }
}
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
function fieldPresent(parsedValue, field) {
  if (!parsedValue || typeof parsedValue !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(parsedValue, field)) return true;
  return flattenKeys(parsedValue).some((key) => key.endsWith(`.${field}`) || key === field);
}
function leakTokens(text, parsedValue) {
  const lower = text.toLowerCase();
  const keyLower = flattenKeys(parsedValue).join("\n").toLowerCase();
  return [...new Set(FORBIDDEN_TOKENS.filter((token) => lower.includes(token) || keyLower.includes(token)))];
}
function isReceiptPass(parsedValue) {
  if (!parsedValue || typeof parsedValue !== "object") return false;
  if (parsedValue.ok === true) return true;
  if (parsedValue.status === "PASS" || parsedValue.status === "executed_pass" || parsedValue.status === "LOCAL_GREEN") return true;
  if (parsedValue.bundleReady === true) return true;
  if (parsedValue.allRequiredReceiptsPassed === true && parsedValue.signature) return true;
  return false;
}
function safeLaneFile(lane) { return `${lane.replace(/[^A-Za-z0-9._-]+/g, "-")}.json`; }
function buildRow(sourceRoot, outDir, [lane, relPath, expectedFields]) {
  const sourcePath = path.join(sourceRoot, relPath);
  const text = read(sourcePath);
  const exists = text.length > 0;
  const parsed = exists ? parseJson(text) : { parsedOk: false, value: null, error: "missing" };
  const leaks = exists ? leakTokens(text, parsed.value) : [];
  const missingFields = parsed.parsedOk ? expectedFields.filter((field) => !fieldPresent(parsed.value, field)) : expectedFields;
  const receiptPass = parsed.parsedOk && isReceiptPass(parsed.value);
  const status = !exists
    ? "missing"
    : !parsed.parsedOk
      ? "parse_failed"
      : leaks.length
        ? "redaction_failed"
        : !receiptPass
          ? "executed_fail"
          : missingFields.length
            ? "field_missing"
            : "executed_pass";
  const materializedPath = path.join(outDir, "receipts", safeLaneFile(lane));
  const row = {
    schema: "velmere.pass4351.materialized_required_live_receipt_row.v1",
    passId: PASS_ID,
    lane,
    sourcePath: relPath,
    materializedPath,
    exists,
    parsedOk: parsed.parsedOk,
    receiptPass,
    status,
    expectedFields,
    missingFields,
    sourceSha256: exists ? sha256(text) : null,
    sourceBytes: exists ? Buffer.byteLength(text, "utf8") : 0,
    safePublicFieldsOnly: leaks.length === 0,
    publicLeakTokens: leaks,
    requiredForPublicTopkaLive: true,
    publicTopkaLiveAllowed: false,
  };
  if (exists) writeJson(materializedPath, row);
  return row;
}
function buildBundle(args) {
  const rows = REQUIRED_RECEIPTS.map((spec) => buildRow(args.sourceRoot, args.outDir, spec));
  const failedRows = rows.filter((row) => row.status !== "executed_pass");
  const summary = {
    schema: "velmere.pass4351.materialized_required_live_receipt_bundle_summary.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    ok: failedRows.length === 0,
    noVisualChanges: true,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    sourceRoot: args.sourceRoot,
    outDir: args.outDir,
    requiredReceiptCount: rows.length,
    requiredRowCount: rows.length,
    greenRowCount: rows.length - failedRows.length,
    materializedReceiptCount: rows.filter((row) => row.exists).length,
    failedReceiptCount: failedRows.length,
    rows,
    materializedManifestPath: path.join(args.outDir, "materialized-required-live-receipt-bundle-summary.json"),
    canFeedRequiredBundleVerifier: failedRows.length === 0,
    mustRunBeforeOperatorManifestAssemble: true,
    operatorSignatureStillRequired: true,
    liveBlockedReasons: failedRows.length
      ? failedRows.map((row) => `${row.lane}_${row.status}`)
      : ["operator_signed_manifest_still_required_after_materialized_bundle_green"],
    nextAction: failedRows.length
      ? "Run Windows Node24 full proof, hosted smoke, provider smoke, payment replay, PDF/Angel parity and AI PL/EN/DE eval until all materialized receipt rows are executed_pass."
      : "Run npm run proof:receipts:bundle, then proof:manifest:assemble and proof:manifest:verify with real operator keys.",
  };
  return summary;
}
function fail(summary, allowMissing) {
  const failure = {
    schema: "velmere.pass4351.materialized_required_live_receipt_bundle_failure.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    ok: false,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    summaryPath: SUMMARY,
    failureArtifact: FAILURE,
    failedRows: summary.rows.filter((row) => row.status !== "executed_pass"),
    nextAction: summary.nextAction,
  };
  writeJson(FAILURE, failure);
  console.error(`${PASS_ID} materialized required live receipt bundle FAIL: ${summary.failedReceiptCount}/${summary.requiredReceiptCount} rows are not green.`);
  if (!allowMissing) process.exitCode = 1;
}
const args = parseArgs(process.argv.slice(2));
const summary = buildBundle(args);
if (args.writeReceipt || summary.ok) writeJson(path.join(args.outDir, "materialized-required-live-receipt-bundle-summary.json"), summary);
if (!summary.ok) fail(summary, args.allowMissing);
else console.log(`${PASS_ID} materialized required live receipt bundle PASS: ${path.join(args.outDir, "materialized-required-live-receipt-bundle-summary.json")}`);
