#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const PASS_ID = "PASS4352";
const FRESHNESS_PASS_ID = "PASS4353";
const DEFAULT_ROUTE = "/api/proof-status";
const LIVE_DIR = path.join("artifacts", "live-receipts", "proof-api", "route-smoke");
const FAILURE_DIR = path.join("artifacts", "failure-artifacts", "proof-api", "route-smoke");
const SCENARIOS = [
  "json-shape-contract",
  "no-store-cache-headers",
  "privacy-redaction-no-sensitive-fields",
  "abuse-limited-status-path",
  "version-chain-integrity",
  "live-claim-blocked-until-required-receipts",
  "payment-provider-pdf-ai-blocker-visibility",
  "first-failure-router-public-safe-summary",
  "failure-artifact-on-route-smoke-fail",
  "operator-signature-gate",
  "required-live-receipt-bundle-gate",
  "hosted-public-proof-route-smoke-receipt-gate",
  "hosted-public-proof-route-smoke-freshness-expiry-replay-gate",
  "final-proof-preflight-aggregator-gate",
];
const FORBIDDEN_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const PRIVATE_HOST_PATTERNS = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^169\.254\./];
const FORBIDDEN_PUBLIC_TOKENS = [
  "rawcustomerevidence",
  "customeremail",
  "walletaddress",
  "stripecustomerid",
  "paymentintent",
  "secret",
  "api_key",
  "apikey",
  "authorization",
  "cookie",
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
  const out = {
    route: DEFAULT_ROUTE,
    baseUrl: "",
    timeoutMs: 120000,
    maxAgeMs: 20 * 60 * 1000,
    maxClockSkewMs: 5 * 60 * 1000,
    writeReceipt: false,
    allowInsecure: false,
    allowLocalhost: false,
    allowMissingBaseUrl: false,
    scenarios: [...SCENARIOS],
  };
  for (const arg of argv) {
    if (arg === "--write-receipt") out.writeReceipt = true;
    else if (arg === "--allow-insecure") out.allowInsecure = true;
    else if (arg === "--allow-localhost") out.allowLocalhost = true;
    else if (arg === "--allow-missing-base-url") out.allowMissingBaseUrl = true;
    else if (arg.startsWith("--route=")) out.route = normalizeRoute(arg.slice("--route=".length));
    else if (arg.startsWith("--base-url=")) out.baseUrl = trimSlash(arg.slice("--base-url=".length));
    else if (arg.startsWith("--timeout-ms=")) out.timeoutMs = positiveInt(arg.slice("--timeout-ms=".length), 120000);
    else if (arg.startsWith("--max-age-ms=")) out.maxAgeMs = positiveInt(arg.slice("--max-age-ms=".length), 20 * 60 * 1000);
    else if (arg.startsWith("--max-clock-skew-ms=")) out.maxClockSkewMs = positiveInt(arg.slice("--max-clock-skew-ms=".length), 5 * 60 * 1000);
    else if (arg.startsWith("--scenario=")) out.scenarios = [normalizeScenario(arg.slice("--scenario=".length))];
    else if (arg.startsWith("--scenarios=")) out.scenarios = arg.slice("--scenarios=".length).split(",").map(normalizeScenario).filter(Boolean);
  }
  return out;
}
function normalizeRoute(value) { const clean = String(value || DEFAULT_ROUTE).trim(); return clean.startsWith("/") ? clean : `/${clean}`; }
function normalizeScenario(value) { return String(value || "").trim().replace(/_/g, "-"); }
function trimSlash(value) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  const withProtocol = clean.startsWith("http://") || clean.startsWith("https://") ? clean : `https://${clean}`;
  return withProtocol.replace(/\/$/, "");
}
function positiveInt(value, fallback) { const n = Number.parseInt(String(value || ""), 10); return Number.isFinite(n) && n > 0 ? n : fallback; }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8"); }
function readIfExists(file) { return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""; }
function sha256Text(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function fileDigest(file) { const text = readIfExists(file); return text ? `sha256:${sha256Text(text)}` : null; }
function addMs(iso, ms) { return new Date(Date.parse(iso) + ms).toISOString(); }
function makeNonce(scenario) { return crypto.createHash("sha256").update(`${FRESHNESS_PASS_ID}:${scenario}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`).digest("hex"); }
function safeTail(text, lines = 80) { return String(text || "").split(/\r?\n/).slice(-lines).join("\n").slice(-12000); }
function publicLeakTokens(text) { const lower = String(text || "").toLowerCase(); return [...new Set(FORBIDDEN_PUBLIC_TOKENS.filter((token) => lower.includes(token)))]; }
function baseUrlFromEnv() {
  return trimSlash(
    process.env.VELMERE_HOSTED_ROUTE_SMOKE_BASE_URL ||
    process.env.VELMERE_PUBLIC_PROOF_BASE_URL ||
    process.env.VELMERE_PRODUCTION_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    ""
  );
}
function validateHostedBaseUrl(baseUrl, args) {
  if (!baseUrl) return { ok: false, code: "hosted_public_proof_base_url_missing", message: "Set VELMERE_HOSTED_ROUTE_SMOKE_BASE_URL or pass --base-url=https://your-domain" };
  let parsed;
  try { parsed = new URL(baseUrl); }
  catch { return { ok: false, code: "hosted_public_proof_base_url_invalid", message: `Invalid hosted base URL: ${baseUrl}` }; }
  const host = parsed.hostname.toLowerCase();
  if (!args.allowInsecure && parsed.protocol !== "https:") return { ok: false, code: "hosted_public_proof_base_url_must_use_https", message: "Hosted smoke requires HTTPS unless --allow-insecure is passed for a non-public rehearsal." };
  if (!args.allowLocalhost && (FORBIDDEN_HOSTS.has(host) || PRIVATE_HOST_PATTERNS.some((re) => re.test(host)))) return { ok: false, code: "hosted_public_proof_base_url_must_not_be_local_or_private", message: "Hosted smoke must target a public URL, not localhost/private IP." };
  return { ok: true, code: "hosted_base_url_valid", message: "Hosted public proof base URL accepted." };
}
function makeBase(args, baseUrl, validation) {
  return {
    schema: "velmere.pass4353.hosted_public_proof_route_smoke_summary_with_freshness.v1",
    passId: FRESHNESS_PASS_ID,
    previousPassId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    ok: false,
    noVisualChanges: true,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    mode: "p0_hosted_public_proof_route_smoke_gate",
    route: args.route,
    baseUrl,
    hostedValidation: validation,
    scenarioCount: args.scenarios.length,
    canonicalSummaryPath: path.join(LIVE_DIR, "hosted-server-smoke-summary.json"),
    canonicalFailurePath: path.join(FAILURE_DIR, "hosted-server-smoke-summary-failure.json"),
    requiredForMaterializedBundleLane: "public_proof_route_smoke_hosted",
    requiredBeforeOperatorSignedManifest: true,
    freshnessPolicy: {
      passId: FRESHNESS_PASS_ID,
      maxAgeMs: args.maxAgeMs,
      maxClockSkewMs: args.maxClockSkewMs,
      requestNonceRequired: true,
      responseGeneratedAtIsoRequired: true,
      expiryRequired: true,
    },
    expiresAtIso: addMs(new Date().toISOString(), args.maxAgeMs),
  };
}
function runScenario({ scenario, args, baseUrl }) {
  const startedAt = Date.now();
  const requestNonce = makeNonce(scenario);
  const childArgs = [
    "scripts/velmere-proof-route-smoke.mjs",
    `--route=${args.route}`,
    `--scenario=${scenario}`,
    `--base-url=${baseUrl}`,
    `--request-nonce=${requestNonce}`,
    `--max-age-ms=${args.maxAgeMs}`,
    `--max-clock-skew-ms=${args.maxClockSkewMs}`,
    "--write-receipt",
  ];
  const result = spawnSync(process.execPath, childArgs, {
    cwd: process.cwd(),
    env: { ...process.env, VELMERE_ROUTE_SMOKE_BASE_URL: baseUrl },
    encoding: "utf8",
    timeout: args.timeoutMs,
    maxBuffer: 1024 * 1024 * 8,
  });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const combined = `${stdout}\n${stderr}`;
  const receiptFile = path.join(LIVE_DIR, `${scenario}-receipt.json`);
  const expectedFile = path.join(LIVE_DIR, `${scenario}-expected.json`);
  const failureFile = path.join(FAILURE_DIR, `${scenario}-failure.json`);
  return {
    scenario,
    ok: result.status === 0,
    exitCode: result.status,
    signal: result.signal,
    durationMs: Date.now() - startedAt,
    stdoutTail: safeTail(stdout),
    stderrTail: safeTail(stderr),
    combinedSha256: `sha256:${sha256Text(combined)}`,
    receiptFile,
    receiptSha256: fileDigest(receiptFile),
    expectedFile,
    expectedSha256: fileDigest(expectedFile),
    failureFile,
    failureSha256: fileDigest(failureFile),
    publicLeakTokens: publicLeakTokens(`${combined}\n${readIfExists(receiptFile)}\n${readIfExists(failureFile)}`),
  };
}
function buildManifest(summary, results) {
  return {
    schema: "velmere.pass4353.hosted_public_proof_route_smoke_manifest_with_freshness.v1",
    passId: FRESHNESS_PASS_ID,
    previousPassId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    baseUrl: summary.baseUrl,
    route: summary.route,
    hostedValidation: summary.hostedValidation,
    noVisualChanges: true,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    matrixPassed: summary.ok,
    scenarioCount: results.length,
    receipts: results.map((result) => ({
      scenario: result.scenario,
      ok: result.ok,
      receiptFile: result.receiptFile,
      receiptSha256: result.receiptSha256,
      expectedFile: result.expectedFile,
      expectedSha256: result.expectedSha256,
      failureFile: result.failureFile,
      failureSha256: result.failureSha256,
      publicLeakTokens: result.publicLeakTokens,
      requestNonce: result.requestNonce,
      freshnessRequiredBy: result.freshnessRequiredBy,
    })),
    materializedBundleLane: "public_proof_route_smoke_hosted",
    freshnessPolicy: {
      command: "npm run proof:route-smoke:hosted:freshness",
      maxAgeMs: summary.freshnessPolicy?.maxAgeMs,
      maxClockSkewMs: summary.freshnessPolicy?.maxClockSkewMs,
      summaryExpiresAtIso: summary.expiresAtIso,
      requestNonceRequired: true,
    },
    nextRequiredExecutions: [
      "npm run proof:route-smoke:hosted:freshness",
      "npm run proof:receipts:materialize",
      "npm run proof:receipts:bundle",
      "npm run proof:manifest:assemble",
      "npm run proof:manifest:verify",
    ],
  };
}
function fail(summary, detail, args) {
  const failure = {
    ...summary,
    ok: false,
    stage: detail.stage || "hosted_route_smoke_preflight",
    blockedReasons: detail.blockedReasons || [summary.hostedValidation?.code || "hosted_public_proof_route_smoke_failed"],
    detail,
  };
  writeJson(path.join(FAILURE_DIR, "hosted-server-smoke-summary-failure.json"), failure);
  if (args.writeReceipt) writeJson(path.join(LIVE_DIR, "hosted-server-smoke-expected.json"), failure);
  console.error(`${PASS_ID} hosted route smoke FAIL: ${failure.blockedReasons.join(", ")}`);
  if (!args.allowMissingBaseUrl) process.exitCode = 1;
}

const args = parseArgs(process.argv.slice(2));
const unknown = args.scenarios.filter((scenario) => !SCENARIOS.includes(scenario));
if (unknown.length) throw new Error(`Unknown PASS4352 scenarios: ${unknown.join(", ")}`);
const baseUrl = args.baseUrl || baseUrlFromEnv();
const validation = validateHostedBaseUrl(baseUrl, args);
const baseSummary = makeBase(args, baseUrl, validation);
if (!validation.ok) {
  fail(baseSummary, { stage: "hosted_base_url_validation", blockedReasons: [validation.code], message: validation.message }, args);
} else {
  const results = args.scenarios.map((scenario) => runScenario({ scenario, args, baseUrl }));
  const leakResults = results.filter((result) => result.publicLeakTokens.length > 0);
  const failed = results.filter((result) => !result.ok || result.publicLeakTokens.length > 0);
  const summary = {
    ...baseSummary,
    ok: failed.length === 0,
    scenarioResults: results,
    failedScenarios: failed.map((result) => result.scenario),
    publicLeakScenarioCount: leakResults.length,
    freshnessVerified: false,
    freshnessVerifierRequired: "npm run proof:route-smoke:hosted:freshness",
    blockedReasons: failed.length === 0
      ? ["hosted_public_proof_route_smoke_freshness_verifier_missing", "operator_signed_live_manifest_missing", "required_live_receipt_bundle_must_include_hosted_smoke_sha256"]
      : ["hosted_public_proof_route_smoke_matrix_failed"],
  };
  const manifest = buildManifest(summary, results);
  const summaryFile = summary.ok ? path.join(LIVE_DIR, "hosted-server-smoke-summary.json") : path.join(FAILURE_DIR, "hosted-server-smoke-summary-failure.json");
  writeJson(summaryFile, summary);
  if (summary.ok || args.writeReceipt) writeJson(path.join(LIVE_DIR, "hosted-server-smoke-manifest.json"), manifest);
  if (summary.ok) console.log(`${PASS_ID} hosted route smoke matrix PASS: ${results.length} scenarios -> ${baseUrl}${args.route}`);
  else {
    console.error(`${PASS_ID} hosted route smoke matrix FAIL: ${failed.map((result) => result.scenario).join(", ")}`);
    process.exitCode = 1;
  }
}

// PASS4357 final proof preflight aggregator route matrix scenario marker
