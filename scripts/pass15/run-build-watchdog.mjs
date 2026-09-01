#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { treeDigest } from "../pass13/common.mjs";

const mode = process.argv[2];
if (!new Set(["webpack", "turbopack"]).has(mode)) throw new Error("mode must be webpack or turbopack");
const root = process.cwd();
const timeoutSeconds = Math.max(60, Number(process.env.VELMERE_BUILD_TIMEOUT_SECONDS ?? process.env.PASS13_BUILD_TIMEOUT_SECONDS ?? 1800));
const sampleIntervalMs = Math.max(1000, Number(process.env.VELMERE_BUILD_SAMPLE_INTERVAL_MS ?? 5000));
const profile = process.env.VELMERE_BUILD_PROFILE ?? "balanced";
const diagnosticsDirectory = path.join(root, ".velmere", "pass15-builds");
fs.mkdirSync(diagnosticsDirectory, { recursive: true });
const stamp = new Date().toISOString().replaceAll(":", "-");
const logPath = path.join(diagnosticsDirectory, `${stamp}-${mode}.log`);
const receiptPath = path.join(diagnosticsDirectory, `${stamp}-${mode}.json`);
const nextBinary = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
if (!fs.existsSync(nextBinary)) throw new Error(`next binary missing: ${nextBinary}`);

function now() { return new Date().toISOString(); }
function boundedPush(array, value, max = 400) { array.push(value); if (array.length > max) array.splice(0, array.length - max); }
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
  while (stack.length) {
    const pid = stack.pop();
    for (const child of children.get(pid) ?? []) if (!wanted.has(child)) { wanted.add(child); stack.push(child); }
  }
  const selected = rows.filter((row) => wanted.has(row.pid));
  return {
    capturedAt: now(),
    processCount: selected.length,
    totalRssKb: selected.reduce((sum, row) => sum + row.rssKb, 0),
    totalCpuPercent: Number(selected.reduce((sum, row) => sum + row.cpuPercent, 0).toFixed(2)),
    processes: selected.sort((a, b) => b.rssKb - a.rssKb).slice(0, 20)
  };
}
function terminateTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }
  try { process.kill(-child.pid, "SIGTERM"); } catch { try { child.kill("SIGTERM"); } catch (ignoredError) { void ignoredError; } }
  setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch { try { child.kill("SIGKILL"); } catch (ignoredError) { void ignoredError; } } }, 15000).unref();
}

const before = treeDigest({ sourceOnly: true });
const startedAt = now();
const startedMs = Date.now();
const logStream = fs.createWriteStream(logPath, { flags: "wx" });
const args = ["build", mode === "webpack" ? "--webpack" : "--turbopack"];
const child = spawn(nextBinary, args, {
  cwd: root,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", VELMERE_BUILD_PROFILE: profile },
  detached: process.platform !== "win32",
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true
});
const phasePatterns = [
  ["optimized_build", /Creating an optimized production build/iu],
  ["compiled", /Compiled successfully|Compilation completed/iu],
  ["type_validation", /Linting and checking validity of types|Checking validity of types/iu],
  ["collecting_page_data", /Collecting page data/iu],
  ["generating_static_pages", /Generating static pages/iu],
  ["finalizing", /Finalizing page optimization|Collecting build traces/iu]
];
const phases = [];
const tail = [];
let buffered = "";
let timedOut = false;
let spawnError = null;
let peakRssKb = 0;
let peakCpuPercent = 0;
const samples = [];
function handleChunk(chunk, stream) {
  const text = chunk.toString("utf8");
  logStream.write(text);
  buffered += text;
  const lines = buffered.split(/\r?\n/u);
  buffered = lines.pop() ?? "";
  for (const line of lines) {
    boundedPush(tail, `${stream}:${line}`);
    for (const [phase, regex] of phasePatterns) {
      if (regex.test(line) && !phases.some((row) => row.phase === phase)) phases.push({ phase, observedAt: now(), elapsedMs: Date.now() - startedMs, line: line.slice(0, 500) });
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
  boundedPush(samples, sample, 360);
}, sampleIntervalMs);
sampler.unref();
const timeout = setTimeout(() => {
  timedOut = true;
  terminateTree(child);
}, timeoutSeconds * 1000);
timeout.unref();

const exit = await new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
clearInterval(sampler);
clearTimeout(timeout);
if (buffered) boundedPush(tail, `tail:${buffered}`);
await new Promise((resolve) => logStream.end(resolve));
const after = treeDigest({ sourceOnly: true });
const sourceImmutable = before.sha256 === after.sha256;
const ok = exit.code === 0 && !timedOut && !spawnError && sourceImmutable;
const status = ok ? "PASS" : timedOut ? "FAIL_TIMEOUT" : spawnError ? "FAIL_SPAWN" : sourceImmutable ? "FAIL" : "FAIL_SOURCE_MUTATION";
const receipt = {
  schemaVersion: "velmere.pass15.build-watchdog.v1",
  generatedAt: now(),
  startedAt,
  mode,
  profile,
  status,
  ok,
  exitCode: exit.code,
  signal: exit.signal,
  timedOut,
  timeoutSeconds,
  durationMs: Date.now() - startedMs,
  peakRssKb,
  peakCpuPercent,
  sampleIntervalMs,
  sampleCount: samples.length,
  phases,
  processSamples: samples,
  sourceBefore: before.sha256,
  sourceAfter: after.sha256,
  sourceImmutable,
  log: path.relative(root, logPath).replaceAll(path.sep, "/"),
  logTail: tail.slice(-120),
  spawnError,
  truthBoundary: ok ? "Successful Next production build for the recorded source hash. Browser, PDF, staging and LIVE remain separate gates." : "Failed or incomplete build; no production runtime claim is permitted."
};
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status, mode, profile, durationMs: receipt.durationMs, peakRssKb, peakCpuPercent, phases, sourceImmutable, receipt: path.relative(root, receiptPath) }, null, 2));
if (!ok) process.exit(1);
