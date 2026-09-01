#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { resolveBuildSettings, safeBuildOutputPath } from "../../lib/build/build-profile.mjs";
import { classifyBuildResult, expectedBuildOutputContract } from "../../lib/build/build-watchdog-policy.mjs";
import { inspectManagedNextEnv, restoreManagedNextEnv, stageManagedNextEnv } from "../../lib/build/next-env-build-contract.mjs";
import { sanitizedBuildEnvironment } from "../../lib/build/sanitized-build-environment.mjs";
import { BUILDS_DIR, relativeToRoot, sourceTreeDigest, writeJson } from "./common.mjs";

const mode = process.argv[2];
if (!new Set(["webpack", "turbopack"]).has(mode)) throw new Error("deployment build mode must be webpack or turbopack");

const root = process.cwd();
const checkpoint = sourceTreeDigest(root);
const buildId = `vlm-deployment-${mode}-${checkpoint.sha256.slice(0, 16)}`;
const distDir = `.next-pass25-${mode}`;
const profileName = process.env.VELMERE_BUILD_PROFILE ?? "balanced";
const settings = resolveBuildSettings({
  ...process.env,
  VELMERE_BUILD_PROFILE: profileName,
  VELMERE_RUNTIME_BUILD_SCOPE: mode,
  VELMERE_RUNTIME_DIST_DIR: distDir,
  VELMERE_RUNTIME_BUILD_ID: buildId,
  VELMERE_CHECKPOINT_SOURCE_SHA256: checkpoint.sha256,
});
const outputPath = safeBuildOutputPath(root, settings.runtimeDistDir);
const outputContract = expectedBuildOutputContract(root, settings.runtimeDistDir, buildId);
const cacheMode = (process.env.VELMERE_BUILD_CACHE_MODE ?? "cold").trim().toLowerCase();
if (!new Set(["cold", "warm"]).has(cacheMode)) throw new Error("VELMERE_BUILD_CACHE_MODE must be cold or warm");

const expectedNode = "v24.18.0";
const expectedNpm = "11.16.0";
const npmCliCandidates = [
  process.env.npm_execpath ? path.resolve(process.env.npm_execpath) : null,
  path.resolve(path.dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  path.join(root, ".velmere", "exact-runtime", "node-v24.18.0-linux-x64", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
].filter(Boolean);
const npmCli = npmCliCandidates.find((candidate) => fs.existsSync(candidate)) ?? npmCliCandidates[0];
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const timeoutSeconds = Math.max(300, Number(process.env.VELMERE_BUILD_TIMEOUT_SECONDS ?? 2400));
const stallAfterSeconds = Math.max(300, Number(process.env.VELMERE_BUILD_STALL_AFTER_SECONDS ?? 900));
const stallSamplesRequired = Math.max(3, Number(process.env.VELMERE_BUILD_STALL_SAMPLES ?? 4));
const sampleIntervalMs = Math.max(2000, Number(process.env.VELMERE_BUILD_SAMPLE_INTERVAL_MS ?? 5000));
const lowCpuThreshold = Math.max(0, Number(process.env.VELMERE_BUILD_STALL_CPU_PERCENT ?? 1));

fs.mkdirSync(BUILDS_DIR, { recursive: true });
const stamp = new Date().toISOString().replaceAll(":", "-");
const logPath = path.join(BUILDS_DIR, `${stamp}-${mode}.log`);
const receiptPath = path.join(BUILDS_DIR, `${stamp}-${mode}.json`);

function now() { return new Date().toISOString(); }
function boundedPush(array, value, max) { array.push(value); if (array.length > max) array.splice(0, array.length - max); }
function fileSha256(filePath) { const h = createHash("sha256"); h.update(fs.readFileSync(filePath)); return h.digest("hex"); }
function hostSnapshot() {
  let disk;
  try {
    const stat = fs.statfsSync(root);
    disk = { freeBytes: stat.bavail * stat.bsize, totalBytes: stat.blocks * stat.bsize };
  } catch (error) {
    disk = { error: error instanceof Error ? error.message : String(error) };
  }
  return {
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    freeMemoryBytes: os.freemem(),
    loadAverage: os.loadavg(),
    disk,
  };
}
function processSnapshot(rootPid) {
  if (process.platform !== "linux") return null;
  const result = spawnSync("ps", ["-eo", "pid=,ppid=,rss=,pcpu=,etime=,comm="], { encoding: "utf8", timeout: 3000 });
  if (result.status !== 0) return null;
  const rows = (result.stdout ?? "").trim().split(/\r?\n/u).map((line) => {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)\s+(\S+)\s+(.+)$/u);
    return match ? { pid: Number(match[1]), ppid: Number(match[2]), rssKb: Number(match[3]), cpuPercent: Number(match[4]), elapsed: match[5], command: match[6] } : null;
  }).filter(Boolean);
  const children = new Map();
  for (const row of rows) {
    if (!children.has(row.ppid)) children.set(row.ppid, []);
    children.get(row.ppid).push(row.pid);
  }
  const wanted = new Set([rootPid]);
  const stack = [rootPid];
  while (stack.length > 0) {
    const parent = stack.pop();
    for (const child of children.get(parent) ?? []) if (!wanted.has(child)) { wanted.add(child); stack.push(child); }
  }
  const selected = rows.filter((row) => wanted.has(row.pid));
  return {
    capturedAt: now(),
    processCount: selected.length,
    totalRssKb: selected.reduce((sum, row) => sum + row.rssKb, 0),
    totalCpuPercent: Number(selected.reduce((sum, row) => sum + row.cpuPercent, 0).toFixed(2)),
    processes: selected.sort((a, b) => b.rssKb - a.rssKb).slice(0, 24),
  };
}
function terminateTree(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }
  try { process.kill(-child.pid, "SIGTERM"); } catch (groupError) {
    const signaled = child.kill("SIGTERM");
    if (!signaled) {
      throw new Error(
        `deployment_watchdog_sigterm_failed:${groupError instanceof Error ? groupError.message : String(groupError)}`,
        { cause: groupError },
      );
    }
  }
  setTimeout(() => {
    try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
  }, 15000).unref();
}
function outputContractCheck() {
  const checks = [];
  const fileEquals = (label, filePath, expected) => {
    if (!fs.existsSync(filePath)) { checks.push({ label, ok: false, reason: "missing" }); return; }
    const actual = fs.readFileSync(filePath, "utf8").trim();
    checks.push({ label, ok: actual === expected, actual, expected });
  };
  const exists = (label, filePath, kind = "file") => {
    let ok;
    try { const stat = fs.statSync(filePath); ok = kind === "directory" ? stat.isDirectory() : stat.isFile(); } catch (error) { checks.push({ label, ok: false, kind, error: error instanceof Error ? error.message : String(error) }); return; }
    checks.push({ label, ok, kind });
  };
  fileEquals("buildId", outputContract.buildIdPath, buildId);
  exists("routesManifest", outputContract.routesManifestPath);
  exists("appPathsManifest", outputContract.requiredServerManifestPath);
  exists("standalone", outputContract.standalonePath, "directory");
  exists("standaloneServer", outputContract.standaloneServerPath);
  exists("standaloneNextBootstrap", outputContract.standaloneNextBootstrapPath);
  exists("standaloneStartServer", outputContract.standaloneStartServerPath);
  exists("standaloneBuildId", outputContract.standaloneBuildIdPath);
  exists("standaloneStatic", outputContract.standaloneStaticPath, "directory");
  exists("standalonePublic", outputContract.standalonePublicPath, "directory");
  return { ok: checks.every((row) => row.ok), checks };
}

const preflightErrors = [];
if (process.version !== expectedNode) preflightErrors.push(`Node ${expectedNode} required, observed ${process.version}`);
if (!fs.existsSync(nextCli)) preflightErrors.push(`Next CLI missing: ${relativeToRoot(nextCli)}`);
if (!npmCli || !fs.existsSync(npmCli)) preflightErrors.push(`npm CLI missing; checked: ${npmCliCandidates.map((candidate) => relativeToRoot(candidate) || candidate).join(", ")}`);
let npmVersion = null;
if (npmCli && fs.existsSync(npmCli)) {
  const npmCheck = spawnSync(process.execPath, [npmCli, "--version"], { cwd: root, encoding: "utf8", timeout: 10000 });
  npmVersion = (npmCheck.stdout ?? "").trim() || null;
  if (npmCheck.status !== 0 || npmVersion !== expectedNpm) preflightErrors.push(`npm ${expectedNpm} required, observed ${npmVersion ?? "unavailable"}`);
}

if (preflightErrors.length > 0) {
  const receipt = {
    schemaVersion: "velmere.deployment.build-watchdog.v1",
    generatedAt: now(), mode, profile: settings.profile, status: "BLOCKED_PREFLIGHT", ok: false,
    preflightErrors, node: process.version, npm: npmVersion, sourceBefore: checkpoint,
    truthBoundary: "No build process started because exact runtime/dependency preconditions were not met.",
  };
  writeJson(receiptPath, receipt);
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(2);
}

if (cacheMode === "cold" && fs.existsSync(outputPath)) fs.rmSync(outputPath, { recursive: true, force: true });
const sourceBefore = sourceTreeDigest(root);
const managedNextEnvState = stageManagedNextEnv(root, settings.runtimeDistDir);
const sourceBuildPrepared = sourceTreeDigest(root);
const hostBefore = hostSnapshot();
const startedAt = now();
const startedMs = Date.now();
const logStream = fs.createWriteStream(logPath, { flags: "wx" });
const args = [nextCli, "build", mode === "webpack" ? "--webpack" : "--turbopack"];
const buildEnvironment = sanitizedBuildEnvironment(process.env, {
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  VELMERE_BUILD_PROFILE: settings.profile.name,
  VELMERE_RUNTIME_BUILD_SCOPE: mode,
  VELMERE_RUNTIME_DIST_DIR: settings.runtimeDistDir,
  VELMERE_RUNTIME_BUILD_ID: buildId,
  VELMERE_CHECKPOINT_SOURCE_SHA256: checkpoint.sha256,
});
const child = spawn(process.execPath, args, {
  cwd: root,
  env: buildEnvironment.env,
  detached: process.platform !== "win32",
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});

const phasePatterns = [
  ["config_loaded", /Next\.js|Creating an optimized production build/iu],
  ["optimized_build", /Creating an optimized production build/iu],
  ["compiled", /Compiled successfully|Compilation completed/iu],
  ["type_validation", /Linting and checking validity of types|Checking validity of types|Running TypeScript/iu],
  ["collecting_page_data", /Collecting page data/iu],
  ["generating_static_pages", /Generating static pages/iu],
  ["collecting_build_traces", /Collecting build traces/iu],
  ["finalizing", /Finalizing page optimization/iu],
];
const phases = [];
const tail = [];
const samples = [];
let buffered = "";
let spawnError = null;
let timedOut = false;
let stalled = false;
let lowCpuSamples = 0;
let lastOutputMs = Date.now();
let peakRssKb = 0;
let peakCpuPercent = 0;
function handleChunk(chunk, streamName) {
  const text = chunk.toString("utf8");
  logStream.write(text);
  lastOutputMs = Date.now();
  lowCpuSamples = 0;
  buffered += text;
  const lines = buffered.split(/\r?\n/u);
  buffered = lines.pop() ?? "";
  for (const line of lines) {
    boundedPush(tail, `${streamName}:${line}`, 300);
    for (const [phase, regex] of phasePatterns) {
      if (regex.test(line) && !phases.some((row) => row.phase === phase)) {
        phases.push({ phase, observedAt: now(), elapsedMs: Date.now() - startedMs, line: line.slice(0, 500) });
      }
    }
  }
}
child.stdout.on("data", (chunk) => handleChunk(chunk, "stdout"));
child.stderr.on("data", (chunk) => handleChunk(chunk, "stderr"));
child.on("error", (error) => { spawnError = error.message; });

const sampler = setInterval(() => {
  const sample = processSnapshot(child.pid);
  if (!sample) return;
  peakRssKb = Math.max(peakRssKb, sample.totalRssKb);
  peakCpuPercent = Math.max(peakCpuPercent, sample.totalCpuPercent);
  boundedPush(samples, sample, 500);
  const noOutputSeconds = (Date.now() - lastOutputMs) / 1000;
  if (noOutputSeconds >= stallAfterSeconds && sample.totalCpuPercent <= lowCpuThreshold) lowCpuSamples += 1;
  else lowCpuSamples = 0;
  if (!stalled && lowCpuSamples >= stallSamplesRequired) {
    stalled = true;
    terminateTree(child);
  }
}, sampleIntervalMs);
sampler.unref();
const timeout = setTimeout(() => { timedOut = true; terminateTree(child); }, timeoutSeconds * 1000);
timeout.unref();
const exit = await new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
clearInterval(sampler);
clearTimeout(timeout);
if (buffered) boundedPush(tail, `tail:${buffered}`, 300);
await new Promise((resolve) => logStream.end(resolve));

const managedNextEnvObserved = inspectManagedNextEnv(managedNextEnvState);
const managedNextEnvRestored = restoreManagedNextEnv(managedNextEnvState);
const sourceAfter = sourceTreeDigest(root);
const sourceImmutable = sourceBefore.sha256 === sourceAfter.sha256
  && managedNextEnvObserved.exactExpectedContent
  && managedNextEnvRestored.restored;
const output = exit.code === 0 ? outputContractCheck() : { ok: false, checks: [] };
const logText = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
const status = classifyBuildResult({
  exitCode: exit.code,
  signal: exit.signal,
  timedOut,
  stalled,
  spawnError,
  sourceImmutable,
  logText,
  outputContractOk: output.ok,
});
const ok = status === "PASS";
const receipt = {
  schemaVersion: "velmere.deployment.build-watchdog.v1",
  generatedAt: now(), startedAt, mode, cacheMode, status, ok,
  profile: settings.profile,
  runtime: { node: process.version, npm: npmVersion },
  command: [process.execPath, ...args].map((value) => relativeToRoot(value) || value),
  timeoutSeconds, stallAfterSeconds, stallSamplesRequired, lowCpuThreshold, sampleIntervalMs,
  durationMs: Date.now() - startedMs,
  exitCode: exit.code, signal: exit.signal, timedOut, stalled, spawnError,
  sourceBefore, sourceBuildPrepared, sourceAfter, sourceImmutable,
  buildEnvironment: buildEnvironment.receipt,
  managedNextEnv: {
    path: relativeToRoot(managedNextEnvState.filePath),
    originalSha256: managedNextEnvState.originalSha256,
    stagedSha256: managedNextEnvState.stagedSha256,
    observed: managedNextEnvObserved,
    restored: managedNextEnvRestored,
    truthBoundary: "Only the exact Next-managed distDir import is staged; any other generated content is rejected and the canonical source file is atomically restored before source immutability is evaluated.",
  },
  expectedBuildId: buildId,
  distDir: settings.runtimeDistDir,
  outputContract: output,
  hostBefore,
  hostAfter: hostSnapshot(),
  peakRssKb, peakCpuPercent, samples, phases,
  log: relativeToRoot(logPath),
  logSha256: fs.existsSync(logPath) ? fileSha256(logPath) : null,
  logTail: tail.slice(-160),
  truthBoundary: ok
    ? "Successful Next production build for the exact source hash and output contract. Browser, PDF, staging and LIVE remain separate gates."
    : "Failed, stalled, timed-out or blocked build. No production runtime claim is permitted.",
};
writeJson(receiptPath, receipt);
console.log(JSON.stringify({ status, mode, profile: settings.profile.name, durationMs: receipt.durationMs, peakRssKb, peakCpuPercent, phases, sourceImmutable, outputContractOk: output.ok, receipt: relativeToRoot(receiptPath) }, null, 2));
if (!ok) process.exit(1);
