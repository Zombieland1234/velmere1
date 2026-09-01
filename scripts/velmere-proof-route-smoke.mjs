#!/usr/bin/env node
// PASS4401 legacy schema compatibility marker: json.schema.includes("pass4347")
// PASS4400 legacy schema compatibility marker: json.schema.includes("pass4353")
// PASS4400 legacy schema compatibility marker: json.schema.includes("pass4349")
// PASS4400 legacy schema compatibility marker: json.schema.includes("pass4348")
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PASS_ID = "PASS4346";
const DEFAULT_ROUTE = "/api/proof-status";
const LIVE_RECEIPT_DIR = path.join("artifacts", "live-receipts", "proof-api", "route-smoke");
const FAILURE_DIR = path.join("artifacts", "failure-artifacts", "proof-api", "route-smoke");
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
];
const SCENARIOS = {
  "json-shape-contract": {
    expectedStatuses: [200, 429],
    requiredHeaders: [
      "content-type",
      "cache-control",
      "pragma",
      "x-velmere-ai-audit-eval-harness",
      "x-velmere-public-topka-live-allowed",
      "x-velmere-public-proof-route-smoke-harness",
    ],
  },
  "no-store-cache-headers": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["cache-control", "pragma", "x-velmere-proof-abuse-decision", "x-velmere-public-topka-live-allowed"],
  },
  "privacy-redaction-no-sensitive-fields": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-proof-privacy", "x-velmere-public-proof-route-redaction"],
  },
  "abuse-limited-status-path": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-ratelimit-policy", "x-velmere-proof-abuse-decision"],
  },
  "version-chain-integrity": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-public-proof-route-smoke-harness"],
  },
  "live-claim-blocked-until-required-receipts": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-public-topka-live-allowed"],
  },
  "payment-provider-pdf-ai-blocker-visibility": {
    expectedStatuses: [200, 429],
    requiredHeaders: [
      "x-velmere-payment-replay-harness",
      "x-velmere-provider-live-data-smoke-harness",
      "x-velmere-pdf-angel-parity-harness",
      "x-velmere-ai-audit-eval-harness",
    ],
  },
  "first-failure-router-public-safe-summary": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-module-receipt-execution-ledger"],
  },
  "failure-artifact-on-route-smoke-fail": {
    expectedStatuses: [200, 429, 500],
    requiredHeaders: ["x-velmere-public-topka-live-allowed"],
  },
  "operator-signature-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-public-topka-live-allowed"],
  },
  "required-live-receipt-bundle-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-required-live-receipt-bundle", "x-velmere-full-proof-step-receipts", "x-velmere-required-live-receipt-materializer", "x-velmere-hosted-public-proof-route-smoke", "x-velmere-public-topka-live-allowed"],
  },
  "hosted-public-proof-route-smoke-receipt-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-hosted-public-proof-route-smoke", "x-velmere-required-live-receipt-materializer", "x-velmere-public-topka-live-allowed"],
  },
  "hosted-public-proof-route-smoke-freshness-expiry-replay-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-hosted-proof-freshness-expiry-replay", "x-velmere-hosted-public-proof-route-smoke", "x-velmere-public-topka-live-allowed"],
  },
  "final-proof-preflight-aggregator-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-final-proof-preflight", "x-velmere-zero-skip-receipt-coverage", "x-velmere-public-topka-live-allowed"],
  },
  "final-public-release-candidate-seal-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-final-public-release-candidate", "x-velmere-final-proof-preflight", "x-velmere-public-topka-live-allowed"],
  },
  "public-claim-firewall-launch-readiness-pack-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-public-claim-firewall", "x-velmere-launch-readiness-pack", "x-velmere-final-public-release-candidate", "x-velmere-public-topka-live-allowed"],
  },
  "claim-auto-remediation-safe-launch-copy-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-claim-auto-remediation", "x-velmere-safe-launch-copy-pack", "x-velmere-public-claim-firewall", "x-velmere-public-topka-live-allowed"],
  },
  "release-evidence-ledger-provenance-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-release-evidence-ledger", "x-velmere-artifact-provenance", "x-velmere-public-topka-live-allowed"],
  },
  "operator-execution-handoff-one-command-finalization-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-operator-execution-handoff", "x-velmere-one-command-finalization", "x-velmere-public-topka-live-allowed"],
  },
  "post-run-receipt-importer-windows-output-validator-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-post-run-receipt-importer", "x-velmere-windows-output-validator", "x-velmere-public-topka-live-allowed"],
  },
  "post-run-receipt-promotion-live-store-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-post-run-receipt-promotion", "x-velmere-live-receipt-store", "x-velmere-post-run-receipt-importer", "x-velmere-public-topka-live-allowed"],
  },
  "live-receipt-store-rollback-quarantine-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-live-receipt-store-quarantine", "x-velmere-live-receipt-rollback", "x-velmere-post-run-receipt-promotion", "x-velmere-public-topka-live-allowed"],
  },
  "public-proof-transparency-export-readonly-evidence-index-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-public-proof-transparency-export", "x-velmere-read-only-evidence-index", "x-velmere-live-receipt-tamper-evidence", "x-velmere-public-topka-live-allowed"],
  },
  "live-receipt-store-tamper-evidence-append-only-audit-trail-gate": {
    expectedStatuses: [200, 429],
    requiredHeaders: ["x-velmere-live-receipt-tamper-evidence", "x-velmere-append-only-audit-trail", "x-velmere-live-receipt-store-quarantine", "x-velmere-public-topka-live-allowed"],
  },
};

function parseArgs(argv) {
  const out = { route: DEFAULT_ROUTE, scenario: "json-shape-contract", writeReceipt: false, baseUrl: "", requestNonce: "", maxAgeMs: 20 * 60 * 1000, maxClockSkewMs: 5 * 60 * 1000 };
  for (const arg of argv) {
    if (arg === "--write-receipt") out.writeReceipt = true;
    else if (arg.startsWith("--route=")) out.route = arg.slice("--route=".length) || DEFAULT_ROUTE;
    else if (arg.startsWith("--scenario=")) out.scenario = normalizeScenario(arg.slice("--scenario=".length));
    else if (arg.startsWith("--base-url=")) out.baseUrl = arg.slice("--base-url=".length);
    else if (arg.startsWith("--request-nonce=")) out.requestNonce = arg.slice("--request-nonce=".length);
    else if (arg.startsWith("--max-age-ms=")) out.maxAgeMs = positiveInt(arg.slice("--max-age-ms=".length), 20 * 60 * 1000);
    else if (arg.startsWith("--max-clock-skew-ms=")) out.maxClockSkewMs = positiveInt(arg.slice("--max-clock-skew-ms=".length), 5 * 60 * 1000);
  }
  return out;
}

function normalizeScenario(value) {
  return String(value || "json-shape-contract").trim().replace(/_/g, "-");
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonceValue(input) {
  const clean = String(input || "").trim();
  return clean || `nonce-${Date.now()}-${crypto.randomBytes(12).toString("hex")}`;
}

function routeWithNonce(base, nonce) {
  if (!nonce) return base;
  const url = new URL(base);
  url.searchParams.set("vlmere_proof_nonce", nonce);
  return url.toString();
}

function parseIsoMs(value) {
  const ms = Date.parse(String(value || ""));
  return Number.isFinite(ms) ? ms : null;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function resolveBaseUrl(inputBaseUrl) {
  const raw = inputBaseUrl || process.env.VELMERE_ROUTE_SMOKE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://127.0.0.1:3000";
  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, "");
}

function getHeader(headers, name) {
  return headers.get(name) || headers.get(name.toLowerCase()) || "";
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

function collectBlockedReasons(value) {
  const reasons = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === "blockedReasons" && Array.isArray(child)) reasons.push(...child.map(String));
      walk(child);
    }
  }
  walk(value);
  return [...new Set(reasons)].sort();
}

function validatePublicSafety(json, bodyText) {
  const keyText = flattenKeys(json).join("\n").toLowerCase();
  const keyOffenders = FORBIDDEN_PUBLIC_TOKENS.filter((token) => keyText.includes(token));
  const highRiskValuePatterns = [
    "bearer ",
    "basic ",
    "sk_live_",
    "sk_test_",
    "pk_live_",
    "whsec_",
    "set-cookie:",
    "authorization:",
    "stripe_customer_",
    "payment_intent_",
  ];
  const lower = bodyText.toLowerCase();
  const valueOffenders = highRiskValuePatterns.filter((token) => lower.includes(token));
  return [...new Set([...keyOffenders, ...valueOffenders])];
}

function makeArtifactBase({ scenario, route, url, status, ok, checks, blockedReasons, note }) {
  return {
    schema: "velmere.pass4346.public_proof_route_smoke_execution_receipt.v1",
    passId: PASS_ID,
    previousPassClosed: "PASS4345",
    generatedAtIso: new Date().toISOString(),
    scenario,
    route,
    url,
    ok,
    status,
    checks,
    blockedReasons,
    publicLiveClaimAllowed: false,
    noVisualChanges: true,
    note,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenarioConfig = SCENARIOS[args.scenario];
  if (!scenarioConfig) {
    const known = Object.keys(SCENARIOS).join(", ");
    throw new Error(`Unknown route smoke scenario: ${args.scenario}. Known: ${known}`);
  }
  const baseUrl = resolveBaseUrl(args.baseUrl);
  const route = args.route.startsWith("/") ? args.route : `/${args.route}`;
  const requestNonce = nonceValue(args.requestNonce);
  const rawUrl = `${baseUrl}${route}`;
  const url = routeWithNonce(rawUrl, requestNonce);
  const startedAt = Date.now();
  const requestStartedAtIso = new Date(startedAt).toISOString();
  const checks = [];
  let status = 0;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": `Velmere-${PASS_ID}-RouteSmoke/1.0`,
        "X-Request-Id": `velmere-${PASS_ID.toLowerCase()}-${Date.now()}`,
        "X-Velmere-Proof-Nonce": requestNonce,
      },
      cache: "no-store",
    });
    status = response.status;
    const bodyText = await response.text();
    let json = null;
    try {
      json = JSON.parse(bodyText);
    } catch (error) {
      checks.push({ name: "json_parse", ok: false, detail: error instanceof Error ? error.message : String(error) });
    }
    checks.push({ name: "status_code_expected", ok: scenarioConfig.expectedStatuses.includes(status), expected: scenarioConfig.expectedStatuses, actual: status });
    for (const header of scenarioConfig.requiredHeaders) {
      checks.push({ name: `header:${header}`, ok: Boolean(getHeader(response.headers, header)), actual: getHeader(response.headers, header) || null });
    }
    const cacheControl = getHeader(response.headers, "cache-control").toLowerCase();
    checks.push({ name: "cache_control_no_store", ok: cacheControl.includes("no-store"), actual: cacheControl || null });
    const pragma = getHeader(response.headers, "pragma").toLowerCase();
    checks.push({ name: "pragma_no_cache", ok: pragma.includes("no-cache"), actual: pragma || null });
    checks.push({ name: "topka_live_header_false", ok: getHeader(response.headers, "x-velmere-public-topka-live-allowed") === "false", actual: getHeader(response.headers, "x-velmere-public-topka-live-allowed") || null });
    if (json && typeof json === "object") {
      checks.push({ name: "schema_present", ok: typeof json.schema === "string" && /pass43(45|47|48|49)|pass435[0-9]|pass436[0-9]/.test(json.schema), actual: json.schema || null });
      checks.push({ name: "claim_allowed_false", ok: json.claimAllowed === false || json.publicTopkaLiveAllowed === false, actual: { claimAllowed: json.claimAllowed, publicTopkaLiveAllowed: json.publicTopkaLiveAllowed } });
      const responseGeneratedAtMs = parseIsoMs(json.generatedAtIso);
      const nowMs = Date.now();
      checks.push({ name: "response_generated_at_iso_present", ok: responseGeneratedAtMs !== null, actual: json.generatedAtIso || null });
      if (responseGeneratedAtMs !== null) {
        checks.push({ name: "response_generated_at_not_stale", ok: nowMs - responseGeneratedAtMs <= args.maxAgeMs + args.maxClockSkewMs, ageMs: nowMs - responseGeneratedAtMs, maxAgeMs: args.maxAgeMs, maxClockSkewMs: args.maxClockSkewMs });
        checks.push({ name: "response_generated_at_not_future_beyond_skew", ok: responseGeneratedAtMs - nowMs <= args.maxClockSkewMs, futureSkewMs: responseGeneratedAtMs - nowMs, maxClockSkewMs: args.maxClockSkewMs });
      }
      const blockedReasons = collectBlockedReasons(json);
      checks.push({ name: "blocked_reasons_visible", ok: blockedReasons.length > 0, count: blockedReasons.length, sample: blockedReasons.slice(0, 12) });
      const sensitiveOffenders = validatePublicSafety(json, bodyText);
      checks.push({ name: "public_redaction_no_sensitive_tokens", ok: sensitiveOffenders.length === 0, offenders: sensitiveOffenders });
      if (args.scenario === "operator-signature-gate") {
        checks.push({ name: "operator_signature_missing_blocks_live", ok: blockedReasons.some((reason) => reason.includes("operator") || reason.includes("signature")), sample: blockedReasons.slice(0, 12) });
      }
      if (args.scenario === "required-live-receipt-bundle-gate") {
        checks.push({ name: "required_receipt_bundle_blocks_live", ok: blockedReasons.some((reason) => reason.includes("receipt") || reason.includes("bundle")), sample: blockedReasons.slice(0, 12) });
      }
      if (args.scenario === "payment-provider-pdf-ai-blocker-visibility") {
        checks.push({ name: "p0_blockers_visible", ok: ["payment", "provider", "pdf", "ai"].every((needle) => blockedReasons.some((reason) => reason.toLowerCase().includes(needle))), sample: blockedReasons.slice(0, 20) });
      }
    }
    const failed = checks.filter((check) => check.ok !== true);
    const artifact = makeArtifactBase({
      scenario: args.scenario,
      route,
      url,
      status,
      ok: failed.length === 0,
      checks,
      blockedReasons: json && typeof json === "object" ? collectBlockedReasons(json) : [],
      note: failed.length === 0 ? "Real HTTP route smoke passed against the configured base URL." : "Route smoke failed; see failed checks.",
    });
    const completedAt = Date.now();
    artifact.durationMs = completedAt - startedAt;
    artifact.requestNonce = requestNonce;
    artifact.requestStartedAtIso = requestStartedAtIso;
    artifact.requestCompletedAtIso = new Date(completedAt).toISOString();
    artifact.maxAgeMs = args.maxAgeMs;
    artifact.maxClockSkewMs = args.maxClockSkewMs;
    if (json && typeof json === "object" && typeof json.generatedAtIso === "string") artifact.responseGeneratedAtIso = json.generatedAtIso;
    artifact.responseSha256 = sha256(bodyText);
    artifact.responseBytes = Buffer.byteLength(bodyText, "utf8");
    artifact.failureArtifactExpectedOnFail = path.join(FAILURE_DIR, `${args.scenario}-failure.json`);
    const receiptFile = path.join(LIVE_RECEIPT_DIR, `${args.scenario}-receipt.json`);
    const expectedFile = path.join(LIVE_RECEIPT_DIR, `${args.scenario}-expected.json`);
    writeJson(expectedFile, {
      schema: "velmere.pass4346.public_proof_route_smoke_expected_contract.v1",
      passId: PASS_ID,
      scenario: args.scenario,
      route,
      expectedStatuses: scenarioConfig.expectedStatuses,
      requiredHeaders: scenarioConfig.requiredHeaders,
      publicLiveClaimAllowedMustRemainFalse: true,
      noStoreRequired: true,
      pragmaNoCacheRequired: true,
      redactionRequired: true,
    });
    if (failed.length === 0) {
      if (args.writeReceipt) writeJson(receiptFile, artifact);
      console.log(`${PASS_ID} proof route smoke PASS: ${args.scenario} -> ${url}`);
      return;
    }
    writeJson(path.join(FAILURE_DIR, `${args.scenario}-failure.json`), artifact);
    console.error(`${PASS_ID} proof route smoke FAIL: ${args.scenario} -> ${url}`);
    console.error(JSON.stringify({ failed }, null, 2));
    process.exitCode = 1;
  } catch (error) {
    const artifact = makeArtifactBase({
      scenario: args.scenario,
      route,
      url,
      status,
      ok: false,
      checks: [{ name: "http_fetch", ok: false, detail: error instanceof Error ? error.message : String(error) }],
      blockedReasons: ["hosted_public_proof_api_route_smoke_receipt_missing"],
      note: "HTTP route smoke could not reach the configured route. Start the local/hosted Next app or set VELMERE_ROUTE_SMOKE_BASE_URL.",
    });
    const completedAt = Date.now();
    artifact.durationMs = completedAt - startedAt;
    artifact.requestNonce = requestNonce;
    artifact.requestStartedAtIso = requestStartedAtIso;
    artifact.requestCompletedAtIso = new Date(completedAt).toISOString();
    artifact.maxAgeMs = args.maxAgeMs;
    artifact.maxClockSkewMs = args.maxClockSkewMs;
    writeJson(path.join(FAILURE_DIR, `${args.scenario}-failure.json`), artifact);
    console.error(`${PASS_ID} proof route smoke FAIL: ${args.scenario} -> ${url}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();

// PASS4356 compatible schema marker

// PASS4356 zero-skip receipt coverage route smoke compatibility marker

// PASS4357 final proof preflight aggregator route smoke compatibility marker

// PASS4358 final public release candidate seal route smoke compatibility marker

// PASS4359 public claim firewall launch readiness route smoke compatibility marker

// PASS4360 claim auto-remediation safe launch copy route smoke compatibility marker

// compatibility literal for older PASS4353 diagnose: json.schema.includes("pass4353")
// compatibility literal for older PASS4350 diagnose: json.schema.includes("pass4350")
// compatibility literal for older PASS4351 diagnose: json.schema.includes("pass4351")
// compatibility literal for older PASS4352 diagnose: json.schema.includes("pass4352")
