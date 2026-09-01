#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { currentNpmVersion, VELMERE_RUNTIME } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const artifactRoot = path.join(root, "artifacts/pass35/a45");
const logRoot = path.join(artifactRoot, "logs");
fs.mkdirSync(logRoot, { recursive: true });
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const baseUrl = String(process.env.VELMERE_A45_BASE_URL ?? "http://127.0.0.1:4173").replace(/\/$/u, "");
const stageTimeoutMs = Number(process.env.VELMERE_A45_STAGE_TIMEOUT_MS ?? 30 * 60_000);
const skipDualBuild = process.env.VELMERE_A45_SKIP_DUAL_BUILD === "1";
const skipBrowser = process.env.VELMERE_A45_SKIP_BROWSER === "1";
const stages = [];

function read(relativePath) { return fs.readFileSync(path.join(root, relativePath)); }
function sourceFingerprint() {
  const contract = JSON.parse(read("config/pass35/a44-visual-master-engine-binding.json").toString("utf8"));
  const rows = [
    ...(contract.activeVisualFiles ?? []).map((row) => row.path),
    ...(contract.protectedEngineFiles ?? []).map((row) => row.path),
    "package.json", "package-lock.json", "config/pass35/a44-visual-master-engine-binding.json",
  ];
  const unique = [...new Set(rows)].sort();
  const hash = crypto.createHash("sha256");
  for (const relativePath of unique) {
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute)) throw new Error(`fingerprint_missing:${relativePath}`);
    hash.update(relativePath); hash.update("\0"); hash.update(fs.readFileSync(absolute)); hash.update("\0");
  }
  return { files: unique.length, sha256: hash.digest("hex") };
}
function runStage(id, command, args, { timeoutMs = stageTimeoutMs, env = {} } = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: root, encoding: "utf8", timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env }, shell: process.platform === "win32",
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  fs.writeFileSync(path.join(logRoot, `${id}.stdout.log`), stdout, "utf8");
  fs.writeFileSync(path.join(logRoot, `${id}.stderr.log`), stderr, "utf8");
  const row = { id, command: [command, ...args], status: result.status, signal: result.signal, error: result.error?.message ?? null, durationMs: Date.now() - startedAt, ok: result.status === 0 };
  stages.push(row);
  process.stdout.write(`[a45] ${row.ok ? "PASS" : "FAIL"} ${id} (${row.durationMs}ms)\n`);
  if (!row.ok) throw new Error(`stage_failed:${id}`);
  return row;
}
async function waitForServer(url, timeoutMs = 180_000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (response.status < 500) return { status: response.status, durationMs: Date.now() - started };
      lastError = `status_${response.status}`;
    } catch (error) { lastError = error instanceof Error ? error.message : String(error); }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`server_not_ready:${lastError ?? "unknown"}`);
}
async function stopTree(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else {
    try { process.kill(-child.pid, "SIGTERM"); } catch { try { child.kill("SIGTERM"); } catch (ignoredError) { void ignoredError; } }
    await new Promise((resolve) => setTimeout(resolve, 1200));
    try { process.kill(-child.pid, "SIGKILL"); } catch (ignoredError) { void ignoredError; }
  }
}

const before = sourceFingerprint();
const receipt = {
  schemaVersion: "velmere.pass35.a45.exact-runtime-acceptance.v1",
  revisionId: "VELMERE_PASS35_A45_EXACT_RUNTIME_BROWSER_ACCEPTANCE",
  generatedAt: new Date().toISOString(),
  runtime: { node: process.versions.node, npm: currentNpmVersion(), expectedNode: VELMERE_RUNTIME.node, expectedNpm: VELMERE_RUNTIME.npm },
  sourceBefore: before,
  stages,
};
let server = null;
let failure = null;
try {
  if (process.versions.node !== VELMERE_RUNTIME.node) throw new Error(`wrong_node:${process.versions.node}!=${VELMERE_RUNTIME.node}`);
  if (currentNpmVersion() !== VELMERE_RUNTIME.npm) throw new Error(`wrong_npm:${currentNpmVersion()}!=${VELMERE_RUNTIME.npm}`);
  runStage("diagnose-a44", npmCommand, ["run", "diagnose:runtime:a44"]);
  runStage("diagnose-a45", npmCommand, ["run", "diagnose:runtime:a45"]);
  runStage("source-audit-a44", npmCommand, ["run", "audit:source:a44"]);
  runStage("typecheck", npmCommand, ["run", "typecheck"]);
  runStage("lint", npmCommand, ["run", "lint"]);
  runStage("a44-contract", npmCommand, ["run", "test:pass35:a44"]);
  runStage("a45-contract", npmCommand, ["run", "test:pass35:a45"]);
  runStage("build-webpack", npmCommand, ["run", "build:webpack"], { timeoutMs: 45 * 60_000 });
  if (!skipDualBuild) runStage("build-turbopack", npmCommand, ["run", "build:turbopack"], { timeoutMs: 45 * 60_000 });
  if (!skipBrowser) {
    const serverOut = fs.openSync(path.join(logRoot, "dev-server.stdout.log"), "w");
    const serverErr = fs.openSync(path.join(logRoot, "dev-server.stderr.log"), "w");
    server = spawn(npmCommand, ["run", "dev:clean:a44"], {
      cwd: root, env: { ...process.env, PORT: "4173", HOSTNAME: "127.0.0.1" },
      stdio: ["ignore", serverOut, serverErr], detached: process.platform !== "win32", shell: process.platform === "win32",
    });
    const ready = await waitForServer(`${baseUrl}/pl`);
    stages.push({ id: "dev-server-ready", status: 0, durationMs: ready.durationMs, detail: ready, ok: true });
    runStage("http-smoke", process.execPath, ["scripts/a42-runtime-smoke.mjs"], { env: { VELMERE_SMOKE_BASE_URL: baseUrl } });
    runStage("browser-acceptance", process.execPath, ["scripts/a45-browser-acceptance.mjs"], { timeoutMs: 45 * 60_000, env: { VELMERE_A45_BASE_URL: baseUrl } });
  }
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  await stopTree(server);
  const after = sourceFingerprint();
  receipt.sourceAfter = after;
  receipt.sourceUnchanged = before.sha256 === after.sha256;
  receipt.failure = failure;
  receipt.summary = { stages: stages.length, passed: stages.filter((row) => row.ok).length, failed: stages.filter((row) => !row.ok).length + (failure ? 1 : 0), sourceUnchanged: receipt.sourceUnchanged };
  receipt.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(artifactRoot, "PASS35_A45_EXACT_RUNTIME_ACCEPTANCE.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  const packageResult = spawnSync(process.execPath, ["scripts/a45-package-evidence.mjs"], { cwd: root, encoding: "utf8" });
  if (packageResult.status !== 0 && !failure) { process.exitCode = 1; }
  if (!receipt.sourceUnchanged) process.exitCode = 1;
  process.stdout.write(`${JSON.stringify(receipt.summary)}\n`);
}
