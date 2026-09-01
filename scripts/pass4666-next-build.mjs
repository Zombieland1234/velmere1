import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  computePass4823SourceTree,
  sha256File,
  validatePass4823TypecheckReceipt,
} from "./pass4823/typecheck-source-contract.mjs";

const root = process.cwd();
const passDir = path.join(root, "artifacts/pass4805");
const typecheckReceiptPath = path.join(root, "artifacts/pass4666/partitioned-typecheck.json");
const buildReceiptPath = path.join(passDir, "PASS4805_PRODUCTION_BUILD.json");
fs.mkdirSync(passDir, { recursive: true });

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const posix = (value) => value.replaceAll(path.sep, "/");
const diagnosticMode = process.env.VELMERE_DIAGNOSTIC_BUILD === "1";
const requiredNode = `v${fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim().replace(/^v/, "")}`;
const exactNode = process.version === requiredNode;

function writeAndExit(report, code) {
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  fs.writeFileSync(buildReceiptPath, serialized);
  fs.writeSync(process.stdout.fd, serialized);
  process.exit(code);
}
function fail(message, extra = {}) {
  writeAndExit({
    id: "pass4805-source-bound-production-build-v1",
    ok: false,
    releaseEligible: false,
    diagnosticMode,
    message,
    node: process.version,
    requiredNode,
    exactNode,
    ...extra,
    finishedAt: new Date().toISOString(),
  }, 1);
}

function currentRssMb(pid) {
  try {
    const text = fs.readFileSync(`/proc/${pid}/status`, "utf8");
    const match = text.match(/^VmRSS:\s+(\d+)\s+kB$/m);
    return match ? Number(match[1]) / 1024 : null;
  } catch { return null; }
}
function terminateProcessTree(child, signal = "SIGTERM") {
  if (!child || child.exitCode !== null || !child.pid) return;
  try {
    if (process.platform !== "win32") process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    try { child.kill(signal); } catch (ignoredError) { void ignoredError; }
  }
}

async function runBuildAttempt({ engine, timeoutMs, heapMb, buildId, sourceSha256, typecheckReceiptSha256 }) {
  fs.rmSync(path.join(root, ".next"), { recursive: true, force: true });
  const nextBin = path.join(root, "node_modules/next/dist/bin/next");
  const logPath = path.join(passDir, `PASS4805_BUILD_${engine.toUpperCase()}.log`);
  const log = fs.createWriteStream(logPath, { flags: "w" });
  const args = [`--max-old-space-size=${heapMb}`, nextBin, "build", engine === "webpack" ? "--webpack" : "--turbopack"];
  const started = Date.now();
  const child = spawn(process.execPath, args, {
    cwd: root,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      VELMERE_PARTITIONED_TYPECHECK_VERIFIED: "1",
      VELMERE_RUNTIME_BUILD_ID: buildId,
      VELMERE_CHECKPOINT_SOURCE_SHA256: sourceSha256,
      VELMERE_TYPECHECK_RECEIPT_SHA256: typecheckReceiptSha256,
      VELMERE_BUILD_CPUS: process.env.VELMERE_BUILD_CPUS || "1",
    },
  });
  let peakRssMb = null;
  const record = (chunk) => { log.write(chunk); process.stdout.write(chunk); };
  child.stdout.on("data", record);
  child.stderr.on("data", record);
  const sampler = setInterval(() => {
    const rss = currentRssMb(child.pid);
    if (rss !== null) peakRssMb = Math.max(peakRssMb ?? 0, rss);
  }, 1000);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    terminateProcessTree(child, "SIGTERM");
    setTimeout(() => terminateProcessTree(child, "SIGKILL"), 5_000).unref();
  }, timeoutMs);
  const result = await new Promise((resolve) => {
    child.on("error", (error) => resolve({ code: 1, signal: null, error: error.message }));
    child.on("exit", (code, signal) => resolve({ code: code ?? 1, signal, error: null }));
  });
  clearInterval(sampler);
  clearTimeout(timer);
  await new Promise((resolve, reject) => {
    log.once("error", reject);
    log.end(resolve);
  });
  const buildIdPath = path.join(root, ".next/BUILD_ID");
  const actualBuildId = fs.existsSync(buildIdPath) ? fs.readFileSync(buildIdPath, "utf8").trim() : null;
  return {
    engine,
    exitCode: result.code,
    signal: result.signal,
    error: result.error,
    timedOut,
    durationMs: Date.now() - started,
    peakRssMb: peakRssMb === null ? null : Math.round(peakRssMb * 10) / 10,
    logPath: posix(path.relative(root, logPath)),
    buildId: actualBuildId,
    buildIdMatches: actualBuildId === buildId,
    nextDirectoryCreated: fs.existsSync(path.join(root, ".next")),
  };
}

if (!exactNode && !diagnosticMode) fail(`exact Node ${requiredNode} required; got ${process.version}`);
if (!fs.existsSync(typecheckReceiptPath)) fail("missing partitioned typecheck receipt");
const typecheck = JSON.parse(fs.readFileSync(typecheckReceiptPath, "utf8"));
const typecheckReceiptSha256Before = sha256File(typecheckReceiptPath);
const typecheckAgeMs = Date.now() - fs.statSync(typecheckReceiptPath).mtimeMs;
const sourceTreeAtReceiptValidation = computePass4823SourceTree(root);
const typecheckBlockers = validatePass4823TypecheckReceipt({
  receipt: typecheck,
  sourceTree: sourceTreeAtReceiptValidation,
  nodeVersion: process.version,
});
if (typecheckAgeMs > 45 * 60 * 1000) typecheckBlockers.push("receipt_too_old");
if (typecheckBlockers.length > 0) fail("invalid, stale or source-mismatched typecheck receipt", {
  typecheckNode: typecheck.node ?? null,
  typecheckAgeMs,
  typecheckBlockers: [...new Set(typecheckBlockers)],
  currentSourceTreeSha256: sourceTreeAtReceiptValidation.sha256,
  receiptSourceTreeSha256: typecheck.sourceTreeSha256 ?? null,
});

const cssManifestPath = path.join(root, "artifacts/pass4804/PASS4804_STATIC_RUNTIME_CSS.json");
const cssPath = path.join(root, "public/velmere-runtime-pass4804.css");
const cssManifestExists = fs.existsSync(cssManifestPath);
const cssOutputExists = fs.existsSync(cssPath);
let cssMode;
let cssDigest;
if (cssManifestExists && cssOutputExists) {
  const cssManifest = JSON.parse(fs.readFileSync(cssManifestPath, "utf8"));
  cssDigest = sha256(fs.readFileSync(cssPath));
  cssMode = "prebuilt-static-css";
  if (cssManifest.outputSha256 !== cssDigest || cssManifest.warnings?.length) fail("static runtime CSS integrity failed");
} else if (!cssManifestExists && !cssOutputExists) {
  const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");
  const cssSources = [
    "globals.css",
    "styles/asset-popup-foundation.css",
    "styles/shield-risk-surface.css",
    "styles/asset-popup-geometry.css",
    "styles/shield-pro-terminal.css",
    "styles/audit-one-screen.css",
    "styles/global-header.css",
    "styles/audit-account-handoff.css",
    "styles/asset-popup-resize.css",
    "styles/markets-cleanup.css",
    "styles/asset-popup-ownership.css",
  ];
  const importsComplete = cssSources.every((relative) => (
    layout.includes(`import "./${relative}";`) || layout.includes(`import './${relative}';`)
  ));
  if (!importsComplete || layout.includes('href="/velmere-runtime-pass4804.css"')) fail("source CSS import integrity failed");
  const sourceBundle = cssSources.map((relative) => fs.readFileSync(path.join(root, "app", relative)));
  cssDigest = sha256(Buffer.concat(sourceBundle));
  cssMode = "source-css-imports";
} else {
  fail("static runtime CSS artifact is incomplete");
}

const nextBin = path.join(root, "node_modules/next/dist/bin/next");
if (!fs.existsSync(nextBin)) fail("Next binary missing; run npm ci");
const fingerprintBefore = computePass4823SourceTree(root);
if (fingerprintBefore.sha256 !== sourceTreeAtReceiptValidation.sha256) fail("source changed after typecheck receipt validation", {
  receiptValidationSourceTreeSha256: sourceTreeAtReceiptValidation.sha256,
  preBuildSourceTreeSha256: fingerprintBefore.sha256,
});
const buildId = `vlm-${fingerprintBefore.sha256.slice(0, 20)}`;
const requested = String(process.env.VELMERE_BUILD_ENGINE || "auto").toLowerCase();
const engines = requested === "webpack" ? ["webpack"] : requested === "turbopack" ? ["turbopack"] : ["webpack", "turbopack"];
const timeoutMs = Math.max(300_000, Math.min(2_700_000, Number(process.env.VELMERE_BUILD_TIMEOUT_MS || 1_200_000)));
const heapMb = Math.max(1024, Math.min(4096, Number(process.env.VELMERE_BUILD_HEAP_MB || 2048)));
const attempts = [];
let success = null;
for (const engine of engines) {
  const attempt = await runBuildAttempt({
    engine,
    timeoutMs,
    heapMb,
    buildId,
    sourceSha256: fingerprintBefore.sha256,
    typecheckReceiptSha256: typecheckReceiptSha256Before,
  });
  attempts.push(attempt);
  if (attempt.exitCode === 0 && attempt.buildIdMatches) { success = attempt; break; }
}
const fingerprintAfter = computePass4823SourceTree(root);
const sourceUnchanged = fingerprintAfter.sha256 === fingerprintBefore.sha256;
const typecheckReceiptSha256After = sha256File(typecheckReceiptPath);
const typecheckReceiptUnchanged = typecheckReceiptSha256After === typecheckReceiptSha256Before;
const ok = Boolean(success && sourceUnchanged && typecheckReceiptUnchanged);
const report = {
  id: "pass4805-source-bound-production-build-v1",
  ok,
  releaseEligible: ok && exactNode && !diagnosticMode,
  diagnosticMode,
  node: process.version,
  requiredNode,
  exactNode,
  typecheckRunId: typecheck.runId ?? null,
  typecheckAgeMs,
  typecheckReceiptSha256: typecheckReceiptSha256Before,
  postBuildTypecheckReceiptSha256: typecheckReceiptSha256After,
  typecheckReceiptUnchanged,
  typecheckSourceTreeSha256: typecheck.sourceTreeSha256,
  sourceFingerprint: fingerprintBefore.sha256,
  postBuildSourceFingerprint: fingerprintAfter.sha256,
  sourceTreeSchema: fingerprintBefore.schemaVersion,
  sourceFileCount: fingerprintBefore.fileCount,
  sourceTreeBytes: fingerprintBefore.totalBytes,
  sourceUnchanged,
  staticRuntimeCssSha256: cssDigest,
  staticRuntimeCssMode: cssMode,
  requestedEngine: requested,
  attempts,
  selectedEngine: success?.engine ?? null,
  buildId: success?.buildId ?? null,
  buildIdSha256: success?.buildId ? sha256(success.buildId) : null,
  timeoutMs,
  heapMb,
  finishedAt: new Date().toISOString(),
};
writeAndExit(report, ok ? 0 : 1);
