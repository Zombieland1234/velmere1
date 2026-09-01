#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { currentNpmVersion, VELMERE_RUNTIME } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const artifactRoot = path.join(root, "artifacts/pass35/a46");
const logRoot = path.join(artifactRoot, "logs");
fs.mkdirSync(logRoot, { recursive: true });
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const baseUrl = String(process.env.VELMERE_A46_BASE_URL ?? "http://127.0.0.1:4174").replace(/\/$/u, "");
const stages = [];

function sourceFingerprint() {
  const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a46-customer-data-plane-acceptance.json"), "utf8"));
  const rows = [...new Set([
    ...(contract.integrity?.visualFiles ?? []).map((row) => row.path),
    ...(contract.integrity?.protectedEngineFiles ?? []).map((row) => row.path),
    ...(contract.integrity?.publicAssets ?? []).map((row) => row.path),
    "package.json", "package-lock.json", "config/pass35/a46-customer-data-plane-acceptance.json",
  ])].sort();
  const hash = crypto.createHash("sha256");
  for (const file of rows) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) throw new Error(`fingerprint_missing:${file}`);
    hash.update(file); hash.update("\0"); hash.update(fs.readFileSync(absolute)); hash.update("\0");
  }
  return { files: rows.length, sha256: hash.digest("hex") };
}
function runStage(id, command, args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: root, encoding: "utf8", timeout: options.timeoutMs ?? 30 * 60_000, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...(options.env ?? {}) }, shell: process.platform === "win32",
  });
  fs.writeFileSync(path.join(logRoot, `${id}.stdout.log`), result.stdout ?? "", "utf8");
  fs.writeFileSync(path.join(logRoot, `${id}.stderr.log`), result.stderr ?? "", "utf8");
  const row = { id, status: result.status, signal: result.signal, durationMs: Date.now() - startedAt, ok: result.status === 0, command: [command, ...args], error: result.error?.message ?? null };
  stages.push(row);
  process.stdout.write(`[a46] ${row.ok ? "PASS" : "FAIL"} ${id} (${row.durationMs}ms)\n`);
  if (!row.ok) throw new Error(`stage_failed:${id}`);
}
async function waitForServer(url, timeoutMs = 180000) {
  const startedAt = Date.now();
  let last = "not_started";
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (response.status < 500) return { status: response.status, durationMs: Date.now() - startedAt };
      last = `status_${response.status}`;
    } catch (error) { last = error instanceof Error ? error.message : String(error); }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`server_not_ready:${last}`);
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
let server = null;
let failure = null;
const receipt = {
  schemaVersion: "velmere.pass35.a46.exact-data-acceptance.v1",
  revisionId: "VELMERE_PASS35_A46_CUSTOMER_UI_DATA_PLANE_ACCEPTANCE",
  generatedAt: new Date().toISOString(),
  runtime: { node: process.versions.node, npm: currentNpmVersion(), expectedNode: VELMERE_RUNTIME.node, expectedNpm: VELMERE_RUNTIME.npm },
  sourceBefore: before,
  stages,
};
try {
  if (process.versions.node !== VELMERE_RUNTIME.node) throw new Error(`wrong_node:${process.versions.node}!=${VELMERE_RUNTIME.node}`);
  if (currentNpmVersion() !== VELMERE_RUNTIME.npm) throw new Error(`wrong_npm:${currentNpmVersion()}!=${VELMERE_RUNTIME.npm}`);
  runStage("diagnose-a45", npmCommand, ["run", "diagnose:runtime:a45"]);
  runStage("diagnose-a46", npmCommand, ["run", "diagnose:runtime:a46"]);
  runStage("source-audit", npmCommand, ["run", "audit:source:a44"]);
  runStage("a45-contract", npmCommand, ["run", "test:pass35:a45"]);
  runStage("a46-contract", npmCommand, ["run", "test:pass35:a46"]);
  const out = fs.openSync(path.join(logRoot, "dev-server.stdout.log"), "w");
  const err = fs.openSync(path.join(logRoot, "dev-server.stderr.log"), "w");
  server = spawn(npmCommand, ["run", "dev:clean:a44"], {
    cwd: root, env: { ...process.env, PORT: "4174", HOSTNAME: "127.0.0.1", NEXT_PUBLIC_VELMERE_OPERATOR_EVIDENCE: "0" },
    stdio: ["ignore", out, err], detached: process.platform !== "win32", shell: process.platform === "win32",
  });
  const ready = await waitForServer(`${baseUrl}/pl`);
  stages.push({ id: "dev-server-ready", status: 0, durationMs: ready.durationMs, detail: ready, ok: true });
  runStage("data-plane-acceptance", process.execPath, ["scripts/a46-data-plane-acceptance.mjs"], { timeoutMs: 20 * 60_000, env: { VELMERE_A46_BASE_URL: baseUrl } });
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
  fs.writeFileSync(path.join(artifactRoot, "PASS35_A46_EXACT_DATA_ACCEPTANCE.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  const packageResult = spawnSync(process.execPath, ["scripts/a46-package-evidence.mjs"], { cwd: root, encoding: "utf8" });
  if (packageResult.status !== 0 && !failure) process.exitCode = 1;
  if (!receipt.sourceUnchanged) process.exitCode = 1;
  process.stdout.write(`${JSON.stringify(receipt.summary)}\n`);
}
