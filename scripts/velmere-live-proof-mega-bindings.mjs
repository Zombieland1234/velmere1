#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4354";
const OUT_DIR = path.join("artifacts", "live-receipts", "mega-bindings");
const FAIL_DIR = path.join("artifacts", "failure-artifacts", "mega-bindings");
const SUMMARY = path.join(OUT_DIR, "mega-live-proof-bindings-summary.json");
const FAILURE = path.join(FAIL_DIR, "mega-live-proof-bindings-failure.json");

const REQUIRED_PACKAGE_SCRIPTS = [
  "proof:route-smoke:hosted",
  "proof:route-smoke:hosted:freshness",
  "proof:receipts:materialize",
  "proof:receipts:bundle",
  "proof:manifest:assemble",
  "proof:manifest:verify",
  "proof:mega-bindings",
  "proof:zero-skip:coverage",
  "diagnose:pass4354-no-visual-mega-p0-live-proof-bindings-gate",
];

const REQUIRED_BUNDLE_LANES = [
  "node24_environment",
  "npm_ci",
  "full_typecheck",
  "production_build",
  "lint",
  "public_proof_route_smoke_local",
  "public_proof_route_smoke_hosted",
  "public_proof_route_smoke_hosted_freshness",
  "provider_live_data_smoke",
  "payment_entitlement_replay",
  "pdf_angel_same_payload_parity",
  "ai_audit_eval_pl_en_de",
  "domain_live_receipt_matrix",
  "zero_skip_receipt_coverage",
];

const REQUIRED_MANIFEST_LANES = [
  ...REQUIRED_BUNDLE_LANES,
  "required_live_receipt_bundle",
  "materialized_required_live_receipt_bundle",
];

const CANONICAL_RECEIPTS = [
  ["hosted_summary", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-summary.json"],
  ["hosted_freshness", "artifacts/live-receipts/proof-api/route-smoke/hosted-server-smoke-freshness-summary.json"],
  ["materialized_bundle", "artifacts/live-receipts/required-bundle/materialized/materialized-required-live-receipt-bundle-summary.json"],
  ["required_bundle", "artifacts/live-receipts/required-bundle/required-live-receipt-bundle-summary.json"],
  ["operator_unsigned_manifest", "artifacts/live-receipts/operator/VELMERE_OPERATOR_LIVE_PROOF_MANIFEST_UNSIGNED.json"],
  ["operator_signed_manifest", "artifacts/live-receipts/operator/VELMERE_OPERATOR_SIGNED_LIVE_PROOF_MANIFEST.json"],
  ["provider_live_data", "artifacts/live-receipts/provider-live-data-smoke/provider-smoke-summary.json"],
  ["payment_replay", "artifacts/live-receipts/payment-entitlement-replay/payment-replay-summary.json"],
  ["pdf_angel_parity", "artifacts/live-receipts/pdf-angel-parity/pdf-angel-parity-summary.json"],
  ["ai_eval", "artifacts/live-receipts/ai-audit-eval/ai-audit-eval-pl-en-de-summary.json"],
  ["zero_skip_coverage", "artifacts/live-receipts/zero-skip-coverage/zero-skip-coverage-summary.json"],
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
  const out = { writeReceipt: true, allowMissing: false };
  for (const arg of argv) {
    if (arg === "--no-write-receipt") out.writeReceipt = false;
    else if (arg === "--allow-missing") out.allowMissing = true;
  }
  return out;
}
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8"); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""; }
function sha256(text) { return `sha256:${crypto.createHash("sha256").update(text).digest("hex")}`; }
function parseJson(text) {
  try { return { ok: true, value: JSON.parse(text) }; }
  catch (error) { return { ok: false, value: null, error: error instanceof Error ? error.message : String(error) }; }
}
function unique(values) { return [...new Set(values)]; }
function leakTokens(text) {
  const lower = String(text || "").toLowerCase();
  return unique(FORBIDDEN_TOKENS.filter((token) => lower.includes(token)));
}
function hasEvery(text, values) { return values.filter((value) => !text.includes(value)); }
function statusOfReceipt(text) {
  if (!text) return "missing";
  const parsed = parseJson(text);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") return "parse_failed";
  const value = parsed.value;
  if (value.ok === true || value.status === "PASS" || value.status === "executed_pass" || value.bundleReady === true || value.allRequiredReceiptsPassed === true) return "executed_pass";
  return "not_green";
}
function packageChecks() {
  const text = read("package.json");
  const parsed = parseJson(text);
  const scripts = parsed.ok && parsed.value && typeof parsed.value === "object" && parsed.value.scripts && typeof parsed.value.scripts === "object" ? parsed.value.scripts : {};
  return REQUIRED_PACKAGE_SCRIPTS.map((name) => ({
    name: `package_script_${name}`,
    ok: typeof scripts[name] === "string" && scripts[name].length > 0,
    script: typeof scripts[name] === "string" ? scripts[name] : null,
  }));
}
function sourceBindingChecks() {
  const manifestText = read("scripts/velmere-operator-signed-live-manifest.mjs");
  const materializerText = read("scripts/velmere-required-live-receipt-materializer.mjs");
  const bundleText = read("scripts/velmere-required-live-receipt-bundle.mjs");
  const routeText = read("app/api/proof-status/route.ts");
  const runnerText = read("VELMERE_RUN_FULL_CHECK.ps1");
  const libText = read("lib/market-integrity/pass4354-no-visual-mega-p0-live-proof-bindings-gate.ts");
  const missingManifest = hasEvery(manifestText, REQUIRED_MANIFEST_LANES);
  const missingMaterializer = hasEvery(materializerText, REQUIRED_BUNDLE_LANES);
  const missingBundle = hasEvery(bundleText, REQUIRED_BUNDLE_LANES);
  return [
    { name: "manifest_requires_all_14_live_rows", ok: missingManifest.length === 0, missing: missingManifest },
    { name: "materializer_requires_all_12_bundle_rows", ok: missingMaterializer.length === 0, missing: missingMaterializer },
    { name: "bundle_verifier_requires_all_12_bundle_rows", ok: missingBundle.length === 0, missing: missingBundle },
    { name: "route_reports_pass4354_envelope", ok: routeText.includes("buildPass4354MegaP0LiveProofBindingsEnvelope") && routeText.includes("buildPass4354MegaP0LiveProofBindingsHeaders") },
    { name: "runner_executes_pass4354_diagnose_before_pass4353", ok: runnerText.indexOf("PASS4354 mega P0 live proof bindings gate") >= 0 && runnerText.indexOf("PASS4354 mega P0 live proof bindings gate") < runnerText.indexOf("PASS4353 hosted proof freshness expiry replay gate") },
    { name: "runner_has_env_gated_mega_bindings", ok: runnerText.includes("VELMERE_VERIFY_MEGA_LIVE_PROOF_BINDINGS") && runnerText.includes("proof:mega-bindings") },
    { name: "lib_policy_keeps_public_claim_blocked", ok: libText.includes("publicTopkaLiveAllowed: false") && libText.includes("claimAllowed: false") && libText.includes("zeroSkipPolicy") },
  ];
}
function receiptRows() {
  return CANONICAL_RECEIPTS.map(([lane, file]) => {
    const text = read(file);
    const leaks = leakTokens(text);
    return {
      lane,
      file,
      exists: text.length > 0,
      status: leaks.length ? "redaction_failed" : statusOfReceipt(text),
      sha256: text ? sha256(text) : null,
      bytes: text ? Buffer.byteLength(text, "utf8") : 0,
      publicLeakTokens: leaks,
      requiredForPublicTopkaLive: true,
    };
  });
}

const args = parseArgs(process.argv.slice(2));
const checks = [...packageChecks(), ...sourceBindingChecks()];
const rows = receiptRows();
const failedChecks = checks.filter((check) => check.ok !== true);
const missingOrNotGreenRows = rows.filter((row) => row.status !== "executed_pass");
const summary = {
  schema: "velmere.pass4354.mega_live_proof_bindings_summary.v1",
  passId: PASS_ID,
  generatedAtIso: new Date().toISOString(),
  ok: failedChecks.length === 0 && missingOrNotGreenRows.length === 0,
  preparedOk: failedChecks.length === 0,
  noVisualChanges: true,
  publicTopkaLiveAllowed: false,
  claimAllowed: false,
  checks,
  failedChecks,
  receiptRows: rows,
  missingOrNotGreenRows,
  operatorManifestMustRemainBlockedUntilRowsGreen: true,
  publicLiveClaimRequiresExternalReceipts: true,
  nextAction: failedChecks.length
    ? "Fix the PASS4354 source binding checks first."
    : missingOrNotGreenRows.length
      ? "Run the Windows Node24 full runner, hosted smoke/freshness, provider smoke, payment replay, PDF/Angel parity and AI eval until every canonical row is executed_pass."
      : "Run proof:manifest:assemble and proof:manifest:verify with real operator keys; public LIVE still needs deployment context review.",
};
if (args.writeReceipt || summary.preparedOk) writeJson(SUMMARY, summary);
if (!summary.ok) {
  const failure = {
    schema: "velmere.pass4354.mega_live_proof_bindings_failure.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    ok: false,
    preparedOk: summary.preparedOk,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    summaryPath: SUMMARY,
    failureArtifact: FAILURE,
    failedChecks,
    missingOrNotGreenRows,
    nextAction: summary.nextAction,
  };
  writeJson(FAILURE, failure);
  console.error(`${PASS_ID} mega live proof bindings ${summary.preparedOk ? "prepared but LIVE blocked" : "FAIL"}: ${failedChecks.length} source checks failed, ${missingOrNotGreenRows.length} receipt rows not green.`);
  if (!args.allowMissing) process.exitCode = 1;
} else {
  console.log(`${PASS_ID} mega live proof bindings PASS: ${SUMMARY}`);
}
