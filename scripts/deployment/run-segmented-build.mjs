#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { resolveBuildSettings, safeBuildOutputPath } from "../../lib/build/build-profile.mjs";
import { expectedBuildOutputContract } from "../../lib/build/build-watchdog-policy.mjs";
import { linuxProcessTreeSnapshot, progressWatchdogState } from "../../lib/build/linux-process-tree.mjs";
import { inspectManagedNextEnv, restoreManagedNextEnv, stageManagedNextEnv } from "../../lib/build/next-env-build-contract.mjs";
import {
  acquireSegmentedBuildLock,
  classifySegmentedBuildStatus,
  inspectBuildIdPair,
  inspectExactBuildId,
  releaseSegmentedBuildLock,
} from "../../lib/build/segmented-build-integrity.mjs";
import { stageWebpackProxyForGenerate } from "../../lib/build/segmented-build-compat.mjs";
import { closeStandaloneRuntime } from "../../lib/build/standalone-runtime-closure.mjs";
import { sanitizedBuildEnvironment } from "../../lib/build/sanitized-build-environment.mjs";
import { BUILDS_DIR, relativeToRoot, sourceTreeDigest, writeJson } from "./common.mjs";

const mode = process.argv[2];
if (!new Set(["webpack", "turbopack"]).has(mode)) throw new Error("segmented build mode must be webpack or turbopack");
const root = process.cwd();
const checkpoint = sourceTreeDigest(root);
const buildId = `vlm-deployment-${mode}-${checkpoint.sha256.slice(0, 16)}`;
const distDir = `.next-pass25-${mode}`;
const profileName = process.env.VELMERE_BUILD_PROFILE ?? "conservative";
const settings = resolveBuildSettings({
  ...process.env,
  VELMERE_BUILD_PROFILE: profileName,
  VELMERE_BUILD_CPUS: process.env.VELMERE_BUILD_CPUS ?? "1",
  VELMERE_RUNTIME_BUILD_SCOPE: mode,
  VELMERE_RUNTIME_DIST_DIR: distDir,
  VELMERE_RUNTIME_BUILD_ID: buildId,
  VELMERE_CHECKPOINT_SOURCE_SHA256: checkpoint.sha256,
});
const outputPath = safeBuildOutputPath(root, settings.runtimeDistDir);
const outputContract = expectedBuildOutputContract(root, settings.runtimeDistDir, buildId);
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const expectedNode = "v24.18.0";
const expectedNpm = "11.16.0";
const stamp = new Date().toISOString().replaceAll(":", "-");
const receiptPath = path.join(BUILDS_DIR, `${stamp}-${mode}-segmented.json`);
const now = () => new Date().toISOString();
const sha256File = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const redactedBuildLockError = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  return {
    errorCode: error && typeof error === "object" && typeof error.code === "string"
      ? error.code
      : "UNCLASSIFIED",
    error: /^segmented_build_[A-Za-z0-9_.:-]+$/u.test(message)
      ? message
      : "segmented_build_lock_operation_failed",
  };
};
const numberEnv = (name, fallback, minimum) => {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum) throw new Error(`${name} must be >= ${minimum}`);
  return value;
};
const heapMb = numberEnv("VELMERE_BUILD_HEAP_MB", mode === "turbopack" ? 1200 : 2200, 768);
const maxRssKb = numberEnv("VELMERE_BUILD_MAX_RSS_KB", mode === "turbopack" ? 3100000 : 3250000, 1000000);
const turbopackMemoryLimitBytes = numberEnv("VELMERE_TURBOPACK_MEMORY_LIMIT_BYTES", 1363148800, 268435456);
const memorySamplesRequired = numberEnv("VELMERE_BUILD_MEMORY_SAMPLES", 2, 1);
const sampleIntervalMs = numberEnv("VELMERE_BUILD_SAMPLE_INTERVAL_MS", 2000, 500);
const compileTimeoutSeconds = numberEnv("VELMERE_BUILD_COMPILE_TIMEOUT_SECONDS", 5400, 300);
const generateTimeoutSeconds = numberEnv("VELMERE_BUILD_GENERATE_TIMEOUT_SECONDS", 1800, 120);
const stallSeconds = numberEnv("VELMERE_BUILD_STALL_SECONDS", 600, 60);
const terminationGraceMs = numberEnv("VELMERE_BUILD_TERMINATION_GRACE_MS", 5000, 1000);
const a60RuntimeProbeSha256 = process.env.VELMERE_A60_RUNTIME_PROBE_SHA256;
if (a60RuntimeProbeSha256 !== undefined && !/^[a-f0-9]{64}$/u.test(a60RuntimeProbeSha256)) {
  throw new Error("VELMERE_A60_RUNTIME_PROBE_SHA256 must be an exact lowercase SHA-256");
}

function processSnapshot(rootPid) {
  if (process.platform !== "linux") return null;
  return linuxProcessTreeSnapshot(rootPid, { capturedAt: now() });
}
function terminateTree(child, signal = "SIGTERM") {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // Best effort only; the watchdog receipt records the eventual signal/exit.
    }
  }
}
function outputContractCheck() {
  const checks = [];
  const exists = (label, file, kind = "file") => {
    let ok;
    try {
      const stat = fs.lstatSync(file);
      ok = !stat.isSymbolicLink() && (kind === "directory" ? stat.isDirectory() : stat.isFile());
    } catch {
      ok = false;
    }
    checks.push({ label, ok, path: relativeToRoot(file) });
  };
  const buildIds = inspectBuildIdPair({
    rootBuildIdPath: outputContract.buildIdPath,
    standaloneBuildIdPath: outputContract.standaloneBuildIdPath,
    expectedBuildId: buildId,
    rootReportedPath: relativeToRoot(outputContract.buildIdPath),
    standaloneReportedPath: relativeToRoot(outputContract.standaloneBuildIdPath),
  });
  checks.push(buildIds.root, buildIds.standalone);
  exists("routesManifest", outputContract.routesManifestPath);
  exists("appPathsManifest", outputContract.requiredServerManifestPath);
  exists("standalone", outputContract.standalonePath, "directory");
  exists("standaloneServer", outputContract.standaloneServerPath);
  exists("standaloneNextBootstrap", outputContract.standaloneNextBootstrapPath);
  exists("standaloneStartServer", outputContract.standaloneStartServerPath);
  exists("standaloneSwcInteropDefault", outputContract.standaloneSwcInteropDefaultPath);
  exists("standaloneSwcInteropWildcard", outputContract.standaloneSwcInteropWildcardPath);
  exists("standaloneStatic", outputContract.standaloneStaticPath, "directory");
  exists("standalonePublic", outputContract.standalonePublicPath, "directory");
  return { ok: buildIds.ok && checks.every((row) => row.ok), buildIds, checks };
}
function npmVersion() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !fs.existsSync(npmCli)) return null;
  const out = spawnSync(process.execPath, [npmCli, "--version"], { cwd: root, encoding: "utf8", timeout: 10000 });
  return out.status === 0 ? (out.stdout ?? "").trim() : null;
}
async function runPhase(phase, timeoutSeconds, outputStandalone) {
  const logPath = path.join(BUILDS_DIR, `${stamp}-${mode}-${phase}.log`);
  const args = [nextCli, "build", mode === "webpack" ? "--webpack" : "--turbopack", "--experimental-build-mode", phase];
  const baseNodeOptions = (process.env.NODE_OPTIONS ?? "").replace(/--max-old-space-size(?:=|\s+)\d+/gu, "").trim();
  const nodeOptions = `${baseNodeOptions} --max-old-space-size=${heapMb} --max-semi-space-size=32`.trim();
  const buildEnvironment = sanitizedBuildEnvironment(process.env, {
    NODE_ENV: "production",
    CI: "1",
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_DISABLE_SOURCEMAPS: "1",
    UV_THREADPOOL_SIZE: "1",
    VELMERE_BUILD_PROFILE: profileName,
    VELMERE_BUILD_CPUS: "1",
    VELMERE_RUNTIME_BUILD_SCOPE: mode,
    VELMERE_RUNTIME_DIST_DIR: distDir,
    VELMERE_RUNTIME_BUILD_ID: buildId,
    VELMERE_CHECKPOINT_SOURCE_SHA256: checkpoint.sha256,
    VELMERE_RUNTIME_OUTPUT_STANDALONE: outputStandalone ? "true" : "false",
    VELMERE_TURBOPACK_MEMORY_LIMIT_BYTES: String(turbopackMemoryLimitBytes),
    VELMERE_BUILD_WEBPACK_PERSISTENT_CACHE: mode === "webpack" ? "0" : "1",
    VELMERE_A60_RUNTIME_PROBE_SHA256: a60RuntimeProbeSha256,
    NODE_OPTIONS: nodeOptions,
  });
  const env = buildEnvironment.env;
  const startedAt = now();
  const startedMs = Date.now();
  const log = fs.createWriteStream(logPath, { flags: "wx" });
  const child = spawn(process.execPath, args, { cwd: root, env, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
  let peakRssKb = 0;
  let peakCpuPercent = 0;
  let overMemorySamples = 0;
  let memoryBudgetExceeded = false;
  let timedOut = false;
  let stalled = false;
  let spawnError = null;
  let terminationRequestedAtMs = null;
  let terminationReason = null;
  let terminationEscalated = false;
  let lastLogBytes = 0;
  let lastLogProgressMs = Date.now();
  const samples = [];
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  child.on("error", (error) => { spawnError = error instanceof Error ? error.message : String(error); });
  const requestTermination = (reason) => {
    if (terminationRequestedAtMs !== null) return;
    terminationRequestedAtMs = Date.now();
    terminationReason = reason;
    terminateTree(child, "SIGTERM");
  };
  const timer = setInterval(() => {
    const currentMs = Date.now();
    let currentLogBytes = lastLogBytes;
    try { currentLogBytes = fs.statSync(logPath).size; } catch { /* log may not exist during the first sample */ }
    const progress = progressWatchdogState({
      previousBytes: lastLogBytes,
      currentBytes: currentLogBytes,
      previousProgressMs: lastLogProgressMs,
      nowMs: currentMs,
      stallMs: stallSeconds * 1000,
    });
    lastLogBytes = progress.currentBytes;
    lastLogProgressMs = progress.lastProgressMs;
    if (progress.stalled) {
      stalled = true;
      requestTermination("log_stall");
    }
    const sample = processSnapshot(child.pid);
    if (sample) {
      peakRssKb = Math.max(peakRssKb, sample.totalRssKb);
      if (typeof sample.totalCpuPercent === "number") peakCpuPercent = Math.max(peakCpuPercent, sample.totalCpuPercent);
      samples.push({ ...sample, logBytes: currentLogBytes, logProgressed: progress.progressed });
      if (samples.length > 180) samples.splice(0, samples.length - 180);
      if (sample.totalRssKb > maxRssKb) overMemorySamples += 1; else overMemorySamples = 0;
      if (overMemorySamples >= memorySamplesRequired) {
        memoryBudgetExceeded = true;
        requestTermination("memory_budget");
      }
    }
    if (terminationRequestedAtMs !== null && !terminationEscalated && currentMs - terminationRequestedAtMs >= terminationGraceMs) {
      terminationEscalated = true;
      terminateTree(child, "SIGKILL");
    }
  }, sampleIntervalMs);
  const timeout = setTimeout(() => { timedOut = true; requestTermination("phase_timeout"); }, timeoutSeconds * 1000);
  const exit = await new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
  clearInterval(timer); clearTimeout(timeout); log.end();
  await new Promise((resolve) => log.once("close", resolve));
  const logText = fs.readFileSync(logPath, "utf8");
  const status = spawnError ? "FAIL_SPAWN" : memoryBudgetExceeded ? "FAIL_MEMORY_BUDGET" : stalled ? "FAIL_STALL" : timedOut ? "FAIL_TIMEOUT" : exit.code === 0 ? "PASS" : "FAIL";
  return {
    phase, status, ok: status === "PASS", startedAt, completedAt: now(), durationMs: Date.now() - startedMs,
    exitCode: exit.code, signal: exit.signal, timedOut, stalled, memoryBudgetExceeded, spawnError,
    termination: { reason: terminationReason, requestedAtMs: terminationRequestedAtMs, escalatedToSigkill: terminationEscalated, graceMs: terminationGraceMs },
    heapMb, maxRssKb, stallSeconds, peakRssKb, peakCpuPercent, samples,
    buildEnvironment: buildEnvironment.receipt,
    log: relativeToRoot(logPath), logSha256: sha256File(logPath), logTail: logText.split(/\r?\n/u).slice(-120),
  };
}

fs.mkdirSync(BUILDS_DIR, { recursive: true });
const preflightErrors = [];
const npm = npmVersion();
if (process.version !== expectedNode) preflightErrors.push(`Node ${expectedNode} required, observed ${process.version}`);
if (npm !== expectedNpm) preflightErrors.push(`npm ${expectedNpm} required, observed ${npm ?? "unavailable"}`);
if (!fs.existsSync(nextCli)) preflightErrors.push(`Next CLI missing:${relativeToRoot(nextCli)}`);
if (preflightErrors.length) {
  const receipt = { schemaVersion: "velmere.segmented-build.v1", generatedAt: now(), mode, status: "BLOCKED_PREFLIGHT", ok: false, preflightErrors, node: process.version, npm, sourceBefore: checkpoint };
  writeJson(receiptPath, receipt); console.error(JSON.stringify(receipt, null, 2)); process.exit(2);
}

let buildLock;
try {
  buildLock = acquireSegmentedBuildLock({ root, mode, distDir, buildId, sourceFingerprintSha256: checkpoint.sha256 });
} catch (error) {
  const receipt = {
    schemaVersion: "velmere.segmented-build.v1",
    generatedAt: now(),
    mode,
    status: "FAIL_BUILD_LOCK_ACQUIRE",
    ok: false,
    node: process.version,
    npm,
    buildId,
    distDir,
    sourceBefore: checkpoint,
    buildLock: {
      acquired: false,
      status: "FAIL_BUILD_LOCK_ACQUIRE",
      ...redactedBuildLockError(error),
    },
    truthBoundary: "No output was deleted or written because the exclusive segmented-build lock could not be acquired.",
  };
  writeJson(receiptPath, receipt);
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(3);
}
if (!buildLock.acquired) {
  const receipt = {
    schemaVersion: "velmere.segmented-build.v1",
    generatedAt: now(),
    mode,
    status: "BLOCKED_BUILD_LOCK",
    ok: false,
    node: process.version,
    npm,
    buildId,
    distDir,
    sourceBefore: checkpoint,
    buildLock,
    truthBoundary: "No output was deleted or written because another or unverified segmented build owns the exact mode/distDir lock.",
  };
  writeJson(receiptPath, receipt);
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(3);
}

let sourceBefore = null;
let sourceAfter = null;
let sourceStableAtLock = false;
let sourceImmutable = false;
let nextEnvState = null;
let compile = null;
let generate = null;
let compatibility = { status: "NOT_EXECUTED" };
let runtimeClosure = { status: "NOT_EXECUTED" };
let managedObserved = { status: "NOT_EXECUTED", exactExpectedContent: false };
let managedRestored = { status: "NOT_EXECUTED", restored: false };
const buildIdCheckpoints = {
  afterCompile: { status: "NOT_EXECUTED", ok: false },
  beforeGenerate: { status: "NOT_EXECUTED", ok: false },
  final: { status: "NOT_EXECUTED", ok: false },
};
let output = {
  ok: false,
  status: "NOT_EXECUTED",
  buildIds: { ok: false, status: "NOT_EXECUTED" },
  checks: [],
};
let buildIdBoundaryFailed = false;
let managedNextEnvOk = false;
let lockRelease;
let fatal = null;
try {
  sourceBefore = sourceTreeDigest(root);
  sourceStableAtLock = checkpoint.sha256 === sourceBefore.sha256
    && checkpoint.fileCount === sourceBefore.fileCount
    && checkpoint.totalBytes === sourceBefore.totalBytes;
  try {
    if (!sourceStableAtLock) throw new Error("source_changed_before_exclusive_build_window");
    if (fs.existsSync(outputPath)) fs.rmSync(outputPath, { recursive: true, force: true });
    nextEnvState = stageManagedNextEnv(root, distDir);
    compile = await runPhase("compile", compileTimeoutSeconds, true);
    if (compile.ok) {
      buildIdCheckpoints.afterCompile = inspectExactBuildId({
        filePath: outputContract.buildIdPath,
        expectedBuildId: buildId,
        label: "afterCompileBuildId",
        reportedPath: relativeToRoot(outputContract.buildIdPath),
      });
      if (buildIdCheckpoints.afterCompile.ok) {
        compatibility = mode === "webpack" ? stageWebpackProxyForGenerate(outputPath) : { status: "NOT_REQUIRED", reason: "turbopack" };
        buildIdCheckpoints.beforeGenerate = inspectExactBuildId({
          filePath: outputContract.buildIdPath,
          expectedBuildId: buildId,
          label: "beforeGenerateBuildId",
          reportedPath: relativeToRoot(outputContract.buildIdPath),
        });
        if (buildIdCheckpoints.beforeGenerate.ok) {
          generate = await runPhase("generate", generateTimeoutSeconds, true);
          if (generate.ok) runtimeClosure = closeStandaloneRuntime({ root, outputPath });
        }
      }
    }
    managedObserved = nextEnvState ? inspectManagedNextEnv(nextEnvState) : managedObserved;
    if (!managedObserved.exactExpectedContent) fatal = "managed_next_env_unexpected_content";
  } catch (error) {
    fatal = redactedBuildLockError(error).error;
  } finally {
    if (nextEnvState) {
      try {
        managedRestored = restoreManagedNextEnv(nextEnvState);
      } catch (error) {
        managedRestored = {
          status: "FAIL",
          restored: false,
          ...redactedBuildLockError(error),
        };
        fatal ??= "managed_next_env_restore_failed";
      }
    }
  }
  sourceAfter = sourceTreeDigest(root);
  sourceImmutable = sourceStableAtLock
    && sourceBefore.sha256 === sourceAfter.sha256
    && sourceBefore.fileCount === sourceAfter.fileCount
    && sourceBefore.totalBytes === sourceAfter.totalBytes;
  output = outputContractCheck();
  buildIdCheckpoints.final = output.buildIds;
  buildIdBoundaryFailed = buildIdCheckpoints.afterCompile.status !== "NOT_EXECUTED" && !buildIdCheckpoints.afterCompile.ok
    || buildIdCheckpoints.beforeGenerate.status !== "NOT_EXECUTED" && !buildIdCheckpoints.beforeGenerate.ok;
  managedNextEnvOk = managedObserved.exactExpectedContent === true && managedRestored.restored === true;
} catch (error) {
  fatal ??= redactedBuildLockError(error).error;
} finally {
  lockRelease = releaseSegmentedBuildLock(buildLock);
}
const status = classifySegmentedBuildStatus({
  lockAcquired: true,
  lockReleased: lockRelease.released,
  sourceImmutable,
  compileStatus: compile?.status ?? null,
  generateStatus: generate?.status ?? null,
  buildIdBoundaryFailed,
  outputContractOk: output.ok,
  managedNextEnvOk,
  fatal,
});
const ok = status === "PASS";
const receipt = {
  schemaVersion: "velmere.segmented-build.v1", generatedAt: now(), mode, status, ok,
  node: process.version, npm, profile: settings.profile, buildId, distDir, heapMb, maxRssKb, turbopackMemoryLimitBytes,
  sourceAtInvocation: checkpoint, sourceBefore, sourceAfter, sourceStableAtLock, sourceImmutable,
  buildLock: { acquisition: buildLock, release: lockRelease },
  buildLockPostProcessVerification: {
    required: true,
    enforcement: "SAME_NPM_SCRIPT_CHAIN",
    command: "scripts/deployment/verify-segmented-build-lock-boundary.mjs --phase post-build",
    rawExternalPathDisclosed: false,
  },
  compile, compatibility, generate, runtimeClosure,
  buildIdCheckpoints,
  managedNextEnv: { observed: managedObserved, restored: managedRestored },
  outputContract: output,
  fatal,
  truthBoundary: ok
    ? "Both official Next compile and generate phases passed under one exclusive external-runtime mode/distDir lock on one immutable source SHA. The owned lock was absent at release; the same npm script must next pass the chained post-process verifier to prove absence after child-process exit. BUILD_ID was byte-exact after compile, immediately before generate, and in both final root and standalone output. Browser and LIVE remain separate gates."
    : "No complete production build claim is permitted unless the exclusive lock, both phases, exact BUILD_ID checkpoints, source immutability, managed next-env restoration and final output contract all pass.",
};
writeJson(receiptPath, receipt);
console.log(JSON.stringify({
  status,
  mode,
  sourceImmutable,
  compile: compile?.status,
  generate: generate?.status,
  buildIdAfterCompile: buildIdCheckpoints.afterCompile.status,
  buildIdBeforeGenerate: buildIdCheckpoints.beforeGenerate.status,
  finalBuildIdsExact: buildIdCheckpoints.final.ok,
  outputContractOk: output.ok,
  buildLockRelease: lockRelease.status,
  receipt: relativeToRoot(receiptPath),
}, null, 2));
if (!ok) process.exit(1);
