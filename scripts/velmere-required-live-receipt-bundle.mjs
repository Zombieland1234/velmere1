#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4349";
const OUT_DIR = path.join("artifacts", "live-receipts", "required-bundle");
const FAIL_DIR = path.join("artifacts", "failure-artifacts", "required-bundle");
const SUMMARY = path.join(OUT_DIR, "required-live-receipt-bundle-summary.json");
const FAILURE = path.join(FAIL_DIR, "required-live-receipt-bundle-failure.json");
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
  const out = { verify: true, writeReceipt: false, allowMissing: false };
  for (const arg of argv) {
    if (arg === "--verify") out.verify = true;
    else if (arg === "--write-receipt") out.writeReceipt = true;
    else if (arg === "--allow-missing") out.allowMissing = true;
  }
  return out;
}
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8"); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""; }
function sha256(value) { return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`; }
function parseJson(text) {
  try { return { parsedOk: true, value: JSON.parse(text) }; }
  catch (error) { return { parsedOk: false, error: error instanceof Error ? error.message : String(error) }; }
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
function leakTokens(text, parsedValue) {
  const lower = text.toLowerCase();
  const keyLower = flattenKeys(parsedValue).join("\n").toLowerCase();
  return [...new Set(FORBIDDEN_TOKENS.filter((token) => lower.includes(token) || keyLower.includes(token)))];
}
function isReceiptPass(parsedValue) {
  if (!parsedValue || typeof parsedValue !== "object") return false;
  if (parsedValue.ok === true) return true;
  if (parsedValue.status === "PASS" || parsedValue.status === "executed_pass") return true;
  if (parsedValue.bundleReady === true) return true;
  if (parsedValue.allRequiredReceiptsPassed === true && parsedValue.signature) return true;
  return false;
}
function fieldPresent(parsedValue, field) {
  if (!parsedValue || typeof parsedValue !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(parsedValue, field)) return true;
  return flattenKeys(parsedValue).some((key) => key.endsWith(`.${field}`) || key === field);
}
function rowForReceipt([lane, receiptPath, expectedFields]) {
  const text = read(receiptPath);
  const exists = text.length > 0;
  const parsed = exists ? parseJson(text) : { parsedOk: false, value: null, error: "missing" };
  const leaks = exists ? leakTokens(text, parsed.value) : [];
  const missingFields = parsed.parsedOk ? expectedFields.filter((field) => !fieldPresent(parsed.value, field)) : expectedFields;
  const receiptPass = parsed.parsedOk && isReceiptPass(parsed.value);
  const status = !exists
    ? "missing"
    : !parsed.parsedOk
      ? "executed_fail"
      : leaks.length
        ? "redaction_failed"
        : !receiptPass
          ? "executed_fail"
          : missingFields.length
            ? "hash_missing"
            : "executed_pass";
  return {
    lane,
    receiptPath,
    exists,
    parsedOk: parsed.parsedOk,
    receiptPass,
    sha256: exists ? sha256(text) : null,
    bytes: exists ? Buffer.byteLength(text, "utf8") : 0,
    expectedFields,
    missingFields,
    safePublicFieldsOnly: leaks.length === 0,
    publicLeakTokens: leaks,
    status,
    requiredForPublicTopkaLive: true,
  };
}
function buildBundle() {
  const rows = REQUIRED_RECEIPTS.map(rowForReceipt);
  const failedRows = rows.filter((row) => row.status !== "executed_pass");
  return {
    schema: "velmere.pass4349.required_live_receipt_bundle_summary.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    ok: failedRows.length === 0,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    noVisualChanges: true,
    requiredReceiptCount: rows.length,
    requiredRowCount: rows.length,
    greenReceiptCount: rows.length - failedRows.length,
    greenRowCount: rows.length - failedRows.length,
    failedReceiptCount: failedRows.length,
    failedRowCount: failedRows.length,
    rows,
    receiptRows: rows,
    bundleReady: failedRows.length === 0,
    allRequiredReceiptsPassed: failedRows.length === 0,
    operatorSignatureRequiredAfterBundle: true,
    signedManifestMustIncludeThisBundleSha256: true,
    liveBlockedReasons: failedRows.length
      ? failedRows.map((row) => `${row.lane}_${row.status}`)
      : ["operator_signed_manifest_still_must_be_verified_before_any_public_live_claim"],
  };
}
function fail(bundle, allowMissing) {
  writeJson(FAILURE, {
    schema: "velmere.pass4349.required_live_receipt_bundle_failure.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    ok: false,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    failureArtifact: FAILURE,
    summaryPath: SUMMARY,
    failedRows: bundle.rows.filter((row) => row.status !== "executed_pass"),
    nextAction: "Execute missing receipts, remove unsafe public fields, then rerun npm run proof:receipts:bundle before signing the operator manifest.",
  });
  console.error(`${PASS_ID} required live receipt bundle FAIL: ${bundle.failedReceiptCount}/${bundle.requiredReceiptCount} receipt rows are not green.`);
  if (!allowMissing) process.exitCode = 1;
}
const args = parseArgs(process.argv.slice(2));
const bundle = buildBundle();
if (args.writeReceipt || bundle.ok) writeJson(SUMMARY, bundle);
if (!bundle.ok) fail(bundle, args.allowMissing);
else console.log(`${PASS_ID} required live receipt bundle PASS: ${SUMMARY}`);
