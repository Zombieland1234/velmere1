#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4353";
const LIVE_DIR = path.join("artifacts", "live-receipts", "proof-api", "route-smoke");
const FAILURE_DIR = path.join("artifacts", "failure-artifacts", "proof-api", "route-smoke");
const DEFAULT_SUMMARY = path.join(LIVE_DIR, "hosted-server-smoke-summary.json");
const DEFAULT_OUT = path.join(LIVE_DIR, "hosted-server-smoke-freshness-summary.json");
const DEFAULT_FAILURE = path.join(FAILURE_DIR, "hosted-server-smoke-freshness-failure.json");
const FORBIDDEN_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const PRIVATE_HOST_PATTERNS = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^169\.254\./];
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
  const out = {
    summary: DEFAULT_SUMMARY,
    out: DEFAULT_OUT,
    failure: DEFAULT_FAILURE,
    maxAgeMs: 20 * 60 * 1000,
    maxClockSkewMs: 5 * 60 * 1000,
    writeReceipt: false,
    allowStale: false,
  };
  for (const arg of argv) {
    if (arg === "--write-receipt") out.writeReceipt = true;
    else if (arg === "--allow-stale") out.allowStale = true;
    else if (arg.startsWith("--summary=")) out.summary = arg.slice("--summary=".length) || DEFAULT_SUMMARY;
    else if (arg.startsWith("--out=")) out.out = arg.slice("--out=".length) || DEFAULT_OUT;
    else if (arg.startsWith("--failure=")) out.failure = arg.slice("--failure=".length) || DEFAULT_FAILURE;
    else if (arg.startsWith("--max-age-ms=")) out.maxAgeMs = positiveInt(arg.slice("--max-age-ms=".length), out.maxAgeMs);
    else if (arg.startsWith("--max-clock-skew-ms=")) out.maxClockSkewMs = positiveInt(arg.slice("--max-clock-skew-ms=".length), out.maxClockSkewMs);
  }
  return out;
}
function positiveInt(value, fallback) {
  const n = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8"); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""; }
function sha256(text) { return `sha256:${crypto.createHash("sha256").update(text).digest("hex")}`; }
function parseJson(text) {
  try { return { ok: true, value: JSON.parse(text) }; }
  catch (error) { return { ok: false, value: null, error: error instanceof Error ? error.message : String(error) }; }
}
function parseIsoMs(value) {
  const ms = Date.parse(String(value || ""));
  return Number.isFinite(ms) ? ms : null;
}
function leakTokens(text) {
  const lower = String(text || "").toLowerCase();
  return [...new Set(FORBIDDEN_TOKENS.filter((token) => lower.includes(token)))];
}
function validatePublicHttpsBaseUrl(baseUrl) {
  try {
    const url = new URL(String(baseUrl || ""));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return { ok: false, code: "hosted_freshness_base_url_must_use_https", baseUrl };
    if (FORBIDDEN_HOSTS.has(host) || PRIVATE_HOST_PATTERNS.some((re) => re.test(host))) return { ok: false, code: "hosted_freshness_base_url_must_be_public", baseUrl };
    return { ok: true, code: "hosted_freshness_base_url_public_https", baseUrl, host };
  } catch {
    return { ok: false, code: "hosted_freshness_base_url_invalid", baseUrl };
  }
}
function ageCheck(name, iso, nowMs, maxAgeMs, maxClockSkewMs) {
  const ms = parseIsoMs(iso);
  if (ms === null) return { name, ok: false, status: "missing_or_invalid_iso", iso: iso || null };
  const ageMs = nowMs - ms;
  const futureSkewMs = ms - nowMs;
  return {
    name,
    ok: ageMs <= maxAgeMs + maxClockSkewMs && futureSkewMs <= maxClockSkewMs,
    status: ageMs <= maxAgeMs + maxClockSkewMs && futureSkewMs <= maxClockSkewMs ? "fresh" : "stale_or_future_skew",
    iso,
    ageMs,
    maxAgeMs,
    futureSkewMs,
    maxClockSkewMs,
  };
}
function receiptCheck(result, args, nowMs) {
  const text = read(result.receiptFile || "");
  const parsed = text ? parseJson(text) : { ok: false, value: null, error: "missing" };
  const receipt = parsed.value && typeof parsed.value === "object" ? parsed.value : {};
  const checks = [
    { name: "scenario_result_ok", ok: result.ok === true, actual: result.ok },
    { name: "summary_result_has_receipt_sha256", ok: typeof result.receiptSha256 === "string" && result.receiptSha256.startsWith("sha256:"), actual: result.receiptSha256 || null },
    { name: "receipt_file_exists", ok: text.length > 0, receiptFile: result.receiptFile || null },
    { name: "receipt_json_parse", ok: parsed.ok, error: parsed.error || null },
    { name: "receipt_ok_true", ok: receipt.ok === true, actual: receipt.ok },
    { name: "request_nonce_present", ok: typeof receipt.requestNonce === "string" && receipt.requestNonce.length >= 16, actual: receipt.requestNonce || null },
    { name: "request_started_at_iso_present", ok: parseIsoMs(receipt.requestStartedAtIso) !== null, actual: receipt.requestStartedAtIso || null },
    { name: "request_completed_at_iso_present", ok: parseIsoMs(receipt.requestCompletedAtIso) !== null, actual: receipt.requestCompletedAtIso || null },
    { name: "response_generated_at_iso_present", ok: parseIsoMs(receipt.responseGeneratedAtIso) !== null, actual: receipt.responseGeneratedAtIso || null },
    { name: "response_sha256_present", ok: typeof receipt.responseSha256 === "string" && receipt.responseSha256.length >= 32, actual: receipt.responseSha256 || null },
  ];
  checks.push(ageCheck("receipt_generated_at_fresh", receipt.generatedAtIso, nowMs, args.maxAgeMs, args.maxClockSkewMs));
  checks.push(ageCheck("response_generated_at_fresh", receipt.responseGeneratedAtIso, nowMs, args.maxAgeMs, args.maxClockSkewMs));
  const nonceMatch = result.requestNonce && receipt.requestNonce && result.requestNonce === receipt.requestNonce;
  checks.push({ name: "summary_nonce_matches_receipt_nonce", ok: Boolean(nonceMatch), summaryNonce: result.requestNonce || null, receiptNonce: receipt.requestNonce || null });
  const leaks = leakTokens(`${JSON.stringify(result)}\n${text}`);
  checks.push({ name: "public_redaction_no_sensitive_tokens", ok: leaks.length === 0, offenders: leaks });
  const failed = checks.filter((check) => check.ok !== true);
  return {
    scenario: result.scenario,
    ok: failed.length === 0,
    receiptFile: result.receiptFile || null,
    receiptSha256: result.receiptSha256 || null,
    requestNonce: result.requestNonce || null,
    checks,
    failedChecks: failed,
  };
}
function buildFailure(args, reason, summaryText, summaryParsed, checks = []) {
  const failure = {
    schema: "velmere.pass4353.hosted_proof_freshness_expiry_replay_failure.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    ok: false,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    summaryPath: args.summary,
    summarySha256: summaryText ? sha256(summaryText) : null,
    failureArtifact: args.failure,
    blockedReasons: [reason],
    summaryParseOk: summaryParsed?.ok === true,
    checks,
    nextAction: "Run npm run proof:route-smoke:hosted against a real public HTTPS URL, then rerun npm run proof:route-smoke:hosted:freshness before materializing the bundle or signing the operator manifest.",
  };
  writeJson(args.failure, failure);
  console.error(`${PASS_ID} hosted freshness FAIL: ${reason}`);
  if (!args.allowStale) process.exitCode = 1;
}

const args = parseArgs(process.argv.slice(2));
const summaryText = read(args.summary);
if (!summaryText) {
  buildFailure(args, "hosted_server_smoke_summary_missing", "", null);
} else {
  const parsed = parseJson(summaryText);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") {
    buildFailure(args, "hosted_server_smoke_summary_parse_failed", summaryText, parsed);
  } else {
    const summary = parsed.value;
    const nowMs = Date.now();
    const summaryChecks = [
      { name: "summary_ok_true", ok: summary.ok === true, actual: summary.ok },
      { name: "summary_claim_blocked", ok: summary.claimAllowed === false && summary.publicTopkaLiveAllowed === false, actual: { claimAllowed: summary.claimAllowed, publicTopkaLiveAllowed: summary.publicTopkaLiveAllowed } },
      { name: "summary_schema_pass4353_or_4352", ok: typeof summary.schema === "string" && (summary.schema.includes("pass4353") || summary.schema.includes("pass4352")), actual: summary.schema || null },
      { name: "summary_expires_at_iso_present", ok: parseIsoMs(summary.expiresAtIso) !== null, actual: summary.expiresAtIso || null },
      { name: "summary_not_expired", ok: parseIsoMs(summary.expiresAtIso) !== null && Date.parse(summary.expiresAtIso) >= nowMs - args.maxClockSkewMs, actual: summary.expiresAtIso || null },
      { name: "summary_generated_at_fresh", ...ageCheck("summary_generated_at_fresh", summary.generatedAtIso, nowMs, args.maxAgeMs, args.maxClockSkewMs) },
      { name: "summary_base_url_public_https", ...validatePublicHttpsBaseUrl(summary.baseUrl) },
      { name: "summary_scenario_results_present", ok: Array.isArray(summary.scenarioResults) && summary.scenarioResults.length > 0, count: Array.isArray(summary.scenarioResults) ? summary.scenarioResults.length : 0 },
      { name: "summary_includes_pass4353_freshness_scenario", ok: Array.isArray(summary.scenarioResults) && summary.scenarioResults.some((row) => row && row.scenario === "hosted-public-proof-route-smoke-freshness-expiry-replay-gate") },
      { name: "summary_freshness_verifier_required", ok: summary.freshnessVerifierRequired === "npm run proof:route-smoke:hosted:freshness", actual: summary.freshnessVerifierRequired || null },
    ];
    const receiptRows = Array.isArray(summary.scenarioResults) ? summary.scenarioResults.map((row) => receiptCheck(row, args, nowMs)) : [];
    const allChecks = [...summaryChecks, ...receiptRows.flatMap((row) => row.checks.map((check) => ({ scenario: row.scenario, ...check })) )];
    const failed = allChecks.filter((check) => check.ok !== true);
    const out = {
      schema: "velmere.pass4353.hosted_proof_freshness_expiry_replay_summary.v1",
      passId: PASS_ID,
      generatedAtIso: new Date().toISOString(),
      ok: failed.length === 0,
      publicTopkaLiveAllowed: false,
      claimAllowed: false,
      noVisualChanges: true,
      summaryPath: args.summary,
      summarySha256: sha256(summaryText),
      sourceHostedSmokePassId: summary.passId || null,
      baseUrl: summary.baseUrl || null,
      route: summary.route || null,
      maxAgeMs: args.maxAgeMs,
      maxClockSkewMs: args.maxClockSkewMs,
      checkedReceiptCount: receiptRows.length,
      failedCheckCount: failed.length,
      receiptRows,
      checks: allChecks,
      failedChecks: failed,
      materializedBundleLane: "public_proof_route_smoke_hosted",
      requiredBeforeMaterializedBundle: true,
      requiredBeforeOperatorSignedManifest: true,
      liveBlockedReasons: failed.length
        ? failed.map((check) => `hosted_freshness_${check.scenario ? `${check.scenario}_` : ""}${check.name}`)
        : ["operator_signed_manifest_still_required_after_fresh_hosted_smoke_green"],
    };
    if (out.ok || args.writeReceipt) writeJson(out.ok ? args.out : args.failure, out);
    if (out.ok) console.log(`${PASS_ID} hosted freshness PASS: ${args.summary}`);
    else {
      console.error(`${PASS_ID} hosted freshness FAIL: ${failed.length} failed checks`);
      if (!args.allowStale) process.exitCode = 1;
    }
  }
}
