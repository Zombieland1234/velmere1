#!/usr/bin/env node
// PASS4400 legacy schema compatibility marker: json.schema.includes("pass4347")
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";

const PASS_ID = "PASS4347";
const DEFAULT_ROUTE = "/api/proof-status";
const DEFAULT_PORT = 4347;
const LIVE_DIR = path.join("artifacts", "live-receipts", "proof-api", "route-smoke");
const FAILURE_DIR = path.join("artifacts", "failure-artifacts", "proof-api", "route-smoke");
const LOG_DIR = path.join("artifacts", "proof-logs", "route-smoke");
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
];
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

function parseArgs(argv) {
  const out = {
    route: DEFAULT_ROUTE,
    baseUrl: "",
    port: DEFAULT_PORT,
    timeoutMs: 120000,
    startupTimeoutMs: 120000,
    writeReceipt: false,
    noStart: false,
    scenarios: [...SCENARIOS],
  };
  for (const arg of argv) {
    if (arg === "--write-receipt") out.writeReceipt = true;
    else if (arg === "--no-start") out.noStart = true;
    else if (arg.startsWith("--route=")) out.route = normalizeRoute(arg.slice("--route=".length));
    else if (arg.startsWith("--base-url=")) out.baseUrl = trimSlash(arg.slice("--base-url=".length));
    else if (arg.startsWith("--port=")) out.port = positiveInt(arg.slice("--port=".length), DEFAULT_PORT);
    else if (arg.startsWith("--timeout-ms=")) out.timeoutMs = positiveInt(arg.slice("--timeout-ms=".length), 120000);
    else if (arg.startsWith("--startup-timeout-ms=")) out.startupTimeoutMs = positiveInt(arg.slice("--startup-timeout-ms=".length), 120000);
    else if (arg.startsWith("--scenario=")) out.scenarios = [normalizeScenario(arg.slice("--scenario=".length))];
    else if (arg.startsWith("--scenarios=")) out.scenarios = arg.slice("--scenarios=".length).split(",").map(normalizeScenario).filter(Boolean);
  }
  return out;
}

function normalizeRoute(value) {
  const clean = String(value || DEFAULT_ROUTE).trim();
  return clean.startsWith("/") ? clean : `/${clean}`;
}

function normalizeScenario(value) {
  return String(value || "").trim().replace(/_/g, "-");
}

function trimSlash(value) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  const withProtocol = clean.startsWith("http://") || clean.startsWith("https://") ? clean : `https://${clean}`;
  return withProtocol.replace(/\/$/, "");
}

function positiveInt(value, fallback) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileDigest(file) {
  if (!fs.existsSync(file)) return null;
  return `sha256:${sha256Text(fs.readFileSync(file))}`;
}

function safeTail(value, maxLines = 80) {
  return value.split(/\r?\n/).slice(-maxLines).join("\n");
}

function publicLeakTokens(text) {
  const lower = text.toLowerCase();
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
  return [...FORBIDDEN_PUBLIC_TOKENS, ...highRiskValuePatterns].filter((token) => lower.includes(token));
}

function makeSummaryBase(args, baseUrl, startedAtIso) {
  return {
    schema: "velmere.pass4347.local_public_proof_route_smoke_orchestrator_receipt.v1",
    passId: PASS_ID,
    previousPassClosed: "PASS4346",
    generatedAtIso: new Date().toISOString(),
    startedAtIso,
    baseUrl,
    route: args.route,
    noVisualChanges: true,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    scenarioCount: args.scenarios.length,
    liveBlockedUntilHostedReceiptAndOperatorSignature: true,
  };
}

async function waitForRoute(baseUrl, route, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "not attempted";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}${route}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          "User-Agent": `${PASS_ID}-local-server-ready-probe/1.0`,
          "X-Request-Id": `${PASS_ID.toLowerCase()}-ready-${Date.now()}`,
        },
      });
      if (res.status >= 200 && res.status < 500) return { ok: true, status: res.status, lastError: null };
      lastError = `unexpected status ${res.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return { ok: false, status: 0, lastError };
}

function startServer(args, baseUrl) {
  if (args.baseUrl || args.noStart) return { child: null, logFile: "", startedByHarness: false, baseUrl };
  ensureDir(LOG_DIR);
  const logFile = path.join(LOG_DIR, `pass4347-local-next-${Date.now()}.log`);
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCmd, ["run", "dev", "--", "--hostname", "127.0.0.1", "-p", String(args.port)], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(args.port), NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  const logStream = fs.createWriteStream(logFile, { flags: "a" });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  return { child, logFile, startedByHarness: true, baseUrl };
}

function runScenario({ scenario, args, baseUrl }) {
  const childArgs = [
    "scripts/velmere-proof-route-smoke.mjs",
    `--base-url=${baseUrl}`,
    `--route=${args.route}`,
    `--scenario=${scenario}`,
    "--write-receipt",
  ];
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, childArgs, {
    cwd: process.cwd(),
    env: { ...process.env, VELMERE_ROUTE_SMOKE_BASE_URL: baseUrl },
    encoding: "utf8",
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
    schema: "velmere.pass4347.local_public_proof_route_smoke_manifest.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    baseUrl: summary.baseUrl,
    route: summary.route,
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
    })),
    requiredBeforePublicTopkaLive: [
      "hosted route smoke receipt",
      "operator-signed live manifest",
      "payment replay receipt",
      "provider live-data smoke receipt",
      "PDF/Angel parity receipt",
      "AI eval PL/EN/DE receipt",
    ],
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const unknown = args.scenarios.filter((scenario) => !SCENARIOS.includes(scenario));
  if (unknown.length) throw new Error(`Unknown PASS4347 scenarios: ${unknown.join(", ")}`);
  const startedAtIso = new Date().toISOString();
  const baseUrl = args.baseUrl || `http://127.0.0.1:${args.port}`;
  const server = startServer(args, baseUrl);
  try {
    const readiness = await waitForRoute(baseUrl, args.route, args.startupTimeoutMs);
    if (!readiness.ok) {
      const failure = {
        ...makeSummaryBase(args, baseUrl, startedAtIso),
        ok: false,
        stage: "server_readiness",
        readiness,
        serverStartedByHarness: server.startedByHarness,
        serverLogFile: server.logFile || null,
        serverLogTail: server.logFile ? safeTail(readIfExists(server.logFile), 120) : "",
        blockedReasons: ["local_or_hosted_public_proof_api_route_unreachable"],
      };
      writeJson(path.join(FAILURE_DIR, "local-server-smoke-summary-failure.json"), failure);
      console.error(`${PASS_ID} local route smoke FAIL: route did not become reachable at ${baseUrl}${args.route}`);
      process.exitCode = 1;
      return;
    }
    const results = args.scenarios.map((scenario) => runScenario({ scenario, args, baseUrl }));
    const leakResults = results.filter((result) => result.publicLeakTokens.length > 0);
    const failed = results.filter((result) => !result.ok || result.publicLeakTokens.length > 0);
    const summary = {
      ...makeSummaryBase(args, baseUrl, startedAtIso),
      ok: failed.length === 0,
      serverStartedByHarness: server.startedByHarness,
      serverLogFile: server.logFile || null,
      readiness,
      scenarioResults: results,
      failedScenarios: failed.map((result) => result.scenario),
      publicLeakScenarioCount: leakResults.length,
      blockedReasons: failed.length === 0
        ? ["hosted_public_proof_api_route_smoke_receipt_missing", "operator_signed_live_manifest_missing"]
        : ["local_public_proof_route_smoke_matrix_failed"],
    };
    const manifest = buildManifest(summary, results);
    const summaryFile = summary.ok ? path.join(LIVE_DIR, "local-server-smoke-summary.json") : path.join(FAILURE_DIR, "local-server-smoke-summary-failure.json");
    writeJson(summaryFile, summary);
    if (summary.ok || args.writeReceipt) writeJson(path.join(LIVE_DIR, "local-server-smoke-manifest.json"), manifest);
    if (summary.ok) {
      console.log(`${PASS_ID} local route smoke matrix PASS: ${results.length} scenarios -> ${baseUrl}${args.route}`);
    } else {
      console.error(`${PASS_ID} local route smoke matrix FAIL: ${failed.map((result) => result.scenario).join(", ")}`);
      process.exitCode = 1;
    }
  } finally {
    if (server.child && !server.child.killed) {
      server.child.kill("SIGTERM");
      setTimeout(() => {
        if (server.child && !server.child.killed) server.child.kill("SIGKILL");
      }, 2000).unref();
    }
  }
}

main().catch((error) => {
  const detail = error instanceof Error ? error.message : String(error);
  writeJson(path.join(FAILURE_DIR, "local-server-smoke-summary-failure.json"), {
    schema: "velmere.pass4347.local_public_proof_route_smoke_orchestrator_receipt.v1",
    passId: PASS_ID,
    generatedAtIso: new Date().toISOString(),
    ok: false,
    noVisualChanges: true,
    publicTopkaLiveAllowed: false,
    claimAllowed: false,
    blockedReasons: ["local_public_proof_route_smoke_orchestrator_exception"],
    detail,
  });
  console.error(`${PASS_ID} local route smoke orchestrator exception: ${detail}`);
  process.exitCode = 1;
});

// PASS4357 final proof preflight aggregator route matrix scenario marker
