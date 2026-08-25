#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { expectedBuildOutputContract } from "../../lib/build/build-watchdog-policy.mjs";
import { relativeToRoot, sourceTreeDigest, writeJson } from "./common.mjs";
import {
  applyProductionSmokeNetworkEnvironment,
  createProductionSmokeNetwork,
  evaluateProductionSmokeCoreHttpContract,
  isProductionSmokeProcessReady,
  productionSmokeNetworkDisclosure,
  requestProductionSmokeEndpoint,
} from "./production-smoke-network.mjs";
import {
  inspectProductionSmokeOutputPreflight,
} from "../../lib/build/production-smoke-output-preflight.mjs";
import {
  inspectProductionSmokeEvidence,
  PRODUCTION_SMOKE_LOCAL_PRODUCT_PATHS,
} from "./production-smoke-evidence.mjs";

const mode = process.argv[2] ?? "webpack";
if (!new Set(["webpack", "turbopack"]).has(mode)) throw new Error("smoke mode must be webpack or turbopack");
const root = process.cwd();
const expectedNode = "v24.18.0";
const distDir = `.next-pass25-${mode}`;
const outputPath = path.join(root, distDir);
const standaloneRoot = path.join(outputPath, "standalone");
const serverPath = path.join(standaloneRoot, "server.js");
const buildIdPath = path.join(outputPath, "BUILD_ID");
const buildId = fs.existsSync(buildIdPath) ? fs.readFileSync(buildIdPath, "utf8").trim() : "MISSING";
const outputContract = expectedBuildOutputContract(root, distDir, buildId);
const smokeDir = path.join(root, ".velmere", "deployment-smoke");
const stamp = new Date().toISOString().replaceAll(":", "-");
const receiptPath = path.join(smokeDir, `${stamp}-${mode}-production-smoke.json`);
const logPath = path.join(smokeDir, `${stamp}-${mode}-production-smoke.log`);
const network = createProductionSmokeNetwork(
  process.env.VELMERE_SMOKE_PORT ?? "4321",
);
const startupTimeoutMs = Number(process.env.VELMERE_SMOKE_STARTUP_TIMEOUT_MS ?? "90000");
const requestTimeoutMs = Number(process.env.VELMERE_SMOKE_REQUEST_TIMEOUT_MS ?? "15000");
const now = () => new Date().toISOString();
const sha256File = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(pathname, { method = "GET", body, headers = {}, redirect = "follow" } = {}) {
  return requestProductionSmokeEndpoint(network, pathname, {
    method,
    body,
    headers,
    redirect,
    requestTimeoutMs,
  });
}

function assertion(name, ok, evidence) {
  return { name, ok: Boolean(ok), evidence };
}

fs.mkdirSync(smokeDir, { recursive: true });
const sourceBefore = sourceTreeDigest(root);
const preflightErrors = [];
if (process.version !== expectedNode) preflightErrors.push(`Node ${expectedNode} required, observed ${process.version}`);
const outputPreflight = inspectProductionSmokeOutputPreflight(outputContract, {
  reportedPath: relativeToRoot,
});
preflightErrors.push(...outputPreflight.errors);
if (buildId === "MISSING") preflightErrors.push("BUILD_ID missing");
if (preflightErrors.length) {
  const receipt = {
    schemaVersion: "velmere.production-smoke.v1",
    generatedAt: now(), mode, status: "BLOCKED_PREFLIGHT", ok: false,
    preflightErrors, outputPreflight, node: process.version, sourceBefore, buildId,
    network: productionSmokeNetworkDisclosure(network),
  };
  writeJson(receiptPath, receipt);
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(2);
}

const environment = applyProductionSmokeNetworkEnvironment({
  ...process.env,
  NEXT_TELEMETRY_DISABLED: "1",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "velmere-smoke-nextauth-secret-32-bytes-minimum",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "velmere-smoke-auth-secret-32-bytes-minimum",
  VELMERE_INTERNAL_WORKER_SECRET: process.env.VELMERE_INTERNAL_WORKER_SECRET ?? "velmere-smoke-internal-worker-secret",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "sk_test_velmere_smoke_placeholder",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_velmere_smoke_placeholder",
  SUPABASE_URL: process.env.SUPABASE_URL ?? "https://example.invalid",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? "velmere-smoke-anon-key",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "velmere-smoke-anon-key",
}, network);
const log = fs.createWriteStream(logPath, { flags: "wx" });
const startedAt = now();
const child = spawn(process.execPath, [serverPath], {
  cwd: standaloneRoot,
  env: environment,
  detached: process.platform !== "win32",
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.pipe(log, { end: false });
child.stderr.pipe(log, { end: false });
let spawnError = null;
let exit = null;
child.on("error", (error) => { spawnError = error instanceof Error ? error.message : String(error); });
child.once("close", (code, signal) => { exit = { code, signal }; });
const terminate = () => {
  if (!child.pid || exit) return;
  try { process.kill(-child.pid, "SIGTERM"); } catch { try { child.kill("SIGTERM"); } catch (ignoredError) { void ignoredError; } }
};

const results = [];
const assertions = [];
let fatal = null;
try {
  const deadline = Date.now() + startupTimeoutMs;
  let processProbe = null;
  while (Date.now() < deadline && !exit && !spawnError) {
    try {
      processProbe = await request("/icon.svg");
      if (isProductionSmokeProcessReady(processProbe)) break;
    } catch (ignoredError) { void ignoredError; }
    await delay(500);
  }
  const processReady = isProductionSmokeProcessReady(processProbe);
  assertions.push(assertion("server_process_ready", processReady, { processProbe, exit, spawnError }));
  if (!processReady) throw new Error("production_server_process_not_ready");
  results.push(processProbe);

  const session = await request("/api/auth/session");
  const en = await request("/en");
  const pl = await request("/pl/security");
  const robots = await request("/robots.txt");
  const worker = await request("/api/internal/workers/auth-security-alerts", {
    method: "POST",
    body: "{}",
    headers: { "content-type": "application/json" },
  });
  const stripe = await request("/api/stripe/webhook", { method: "POST", body: "{}", headers: { "content-type": "application/json" } });
  const localProductPages = [];
  for (const pathname of PRODUCTION_SMOKE_LOCAL_PRODUCT_PATHS) {
    localProductPages.push(await request(pathname));
  }
  const localProductPageByPath = new Map(
    localProductPages.map((page) => [page.path, page]),
  );
  const de = localProductPageByPath.get("/de/real-markets");
  if (!de) throw new Error("production_smoke_de_real_markets_result_missing");
  results.push(session, en, pl, robots, worker, stripe, ...localProductPages);

  for (const row of evaluateProductionSmokeCoreHttpContract({
    session,
    en,
    robots,
    worker,
    stripe,
  })) {
    assertions.push(assertion(row.name, row.ok, row.evidence));
  }
  assertions.push(assertion("pl_security_200", pl.status === 200 && pl.bytes > 1000, pl));
  assertions.push(assertion("de_real_markets_200", de.status === 200 && de.bytes > 1000, de));
  for (const page of [en, pl]) {
    assertions.push(assertion(`${page.path}_x_frame_options`, page.headers.xFrameOptions === "DENY", page.headers));
    assertions.push(assertion(`${page.path}_nosniff`, page.headers.xContentTypeOptions === "nosniff", page.headers));
    assertions.push(assertion(`${page.path}_csp`, Boolean(page.headers.contentSecurityPolicy?.includes("default-src 'self'")), page.headers));
  }
  for (const page of [en, pl, de]) {
    assertions.push(assertion(
      `${page.path}_referrer_policy`,
      page.headers.referrerPolicy === "strict-origin-when-cross-origin",
      page.headers,
    ));
  }
  for (const page of localProductPages) {
    assertions.push(assertion(`${page.path}_local_product_200`, page.status === 200 && page.bytes > 1000, page));
    assertions.push(assertion(`${page.path}_x_frame_options`, page.headers.xFrameOptions === "DENY", page.headers));
    assertions.push(assertion(`${page.path}_nosniff`, page.headers.xContentTypeOptions === "nosniff", page.headers));
    assertions.push(assertion(`${page.path}_csp`, Boolean(page.headers.contentSecurityPolicy?.includes("default-src 'self'")), page.headers));
  }
} catch (error) {
  fatal = error instanceof Error ? error.message : String(error);
} finally {
  terminate();
  const stopDeadline = Date.now() + 10000;
  while (!exit && Date.now() < stopDeadline) await delay(100);
  if (!exit) {
    try { process.kill(-child.pid, "SIGKILL"); } catch { try { child.kill("SIGKILL"); } catch (ignoredError) { void ignoredError; } }
    await delay(250);
  }
  log.end();
  await new Promise((resolve) => log.once("close", resolve));
}

const logText = fs.readFileSync(logPath, "utf8");
const forbiddenLogPatterns = [
  /Cannot find module/iu,
  /ERR_MODULE_NOT_FOUND/iu,
  /heap out of memory/iu,
  /uncaught exception/iu,
  /unhandled rejection/iu,
  /EADDRINUSE/iu,
];
const forbiddenLogMatches = forbiddenLogPatterns.filter((pattern) => pattern.test(logText)).map(String);
assertions.push(assertion("server_log_no_fatal_patterns", forbiddenLogMatches.length === 0, { forbiddenLogMatches, logTail: logText.split(/\r?\n/u).slice(-80) }));
const sourceAfter = sourceTreeDigest(root);
const sourceImmutable = sourceBefore.sha256 === sourceAfter.sha256 && sourceBefore.fileCount === sourceAfter.fileCount && sourceBefore.totalBytes === sourceAfter.totalBytes;
assertions.push(assertion("source_immutable", sourceImmutable, { sourceBefore, sourceAfter }));
const evidenceContract = inspectProductionSmokeEvidence({ assertions, results });
const ok =
  !fatal
  && !spawnError
  && assertions.every((row) => row.ok)
  && evidenceContract.ok;
const receipt = {
  schemaVersion: "velmere.production-smoke.v1",
  generatedAt: now(), startedAt, completedAt: now(), mode,
  status: ok ? "PASS" : "FAIL", ok, node: process.version,
  buildId, buildOutput: relativeToRoot(outputPath),
  server: {
    path: relativeToRoot(serverPath),
    exit,
    spawnError,
    log: relativeToRoot(logPath),
    logSha256: sha256File(logPath),
    network: productionSmokeNetworkDisclosure(network),
  },
  sourceBefore, sourceAfter, sourceImmutable, outputPreflight,
  assertions, results, evidenceContract, fatal,
  truthBoundary: ok
    ? "Exact Node production standalone started and passed deterministic local route, negative-boundary and security-header checks behind a simulated TLS-terminating reverse proxy. Real TLS, browser E2E, external providers, staging and LIVE remain separate gates."
    : "No production smoke claim is permitted unless startup, all HTTP assertions, fatal-log scan and source immutability pass.",
};
writeJson(receiptPath, receipt);
console.log(JSON.stringify({
  status: receipt.status,
  mode,
  buildId,
  assertions: assertions.length,
  results: results.length,
  uniqueAssertions: receipt.evidenceContract.assertionSet.uniqueCount,
  uniqueResults: receipt.evidenceContract.resultSet.uniqueCount,
  failures: assertions.filter((row) => !row.ok).map((row) => row.name),
  receipt: relativeToRoot(receiptPath),
}, null, 2));
if (!ok) process.exit(1);
