#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { assertCurrentRuntime } from "../lib/velmere-runtime-contract.mjs";
import { parseDeterministicZip, sha256 } from "../pass4826/release-package-contract.mjs";
import { receiptSha256, verifyRuntimeArchive } from "./runtime-bundle-lib.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`argument_value_missing:${name}`);
  return value;
}

const sourceRoot = process.cwd();
const archivePath = path.resolve(sourceRoot, argument("--archive", "artifacts/runtime/VELMERE_RUNTIME_DEPLOYMENT.zip"));
const outputPath = path.resolve(sourceRoot, argument("--output", "artifacts/runtime/RUNTIME_REPLAY_RECEIPT.json"));
const keepReplay = process.env.VELMERE_RUNTIME_REPLAY_KEEP === "1";
const runtime = assertCurrentRuntime({ label: "runtime bundle replay" });
const verified = verifyRuntimeArchive(archivePath, { policyRoot: sourceRoot });
const parsed = parseDeterministicZip(archivePath);
const replayRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-runtime-replay-"));
const normalizedReplayRoot = `${path.resolve(replayRoot)}${path.sep}`;

for (const entry of parsed.entries) {
  const target = path.resolve(replayRoot, ...entry.path.split("/"));
  if (!target.startsWith(normalizedReplayRoot)) throw new Error(`runtime_replay_path_escape:${entry.path}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, entry.content, { mode: entry.mode & 0o777 });
}

function run(command, args, timeoutMs) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: replayRoot,
    env: {
      ...process.env,
      CI: "true",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "inherit",
    timeout: timeoutMs,
    killSignal: "SIGTERM",
  });
  return {
    command: [command, ...args],
    exitCode: result.status ?? 1,
    signal: result.signal ?? null,
    timedOut: result.error?.code === "ETIMEDOUT",
    error: result.error ? String(result.error.message ?? result.error) : null,
    durationMs: Date.now() - startedAt,
  };
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const install = run(npmCommand, [
  "ci",
  "--engine-strict=true",
  "--strict-allow-scripts=true",
  "--no-audit",
  "--no-fund",
  "--progress=false",
], 20 * 60_000);
const build = install.exitCode === 0 && !install.timedOut
  ? run(npmCommand, ["run", "build:deployment"], 45 * 60_000)
  : {
      command: [npmCommand, "run", "build:deployment"],
      exitCode: null,
      signal: null,
      timedOut: false,
      error: "skipped_after_install_failure",
      durationMs: 0,
    };

const requiredBuildOutputs = [
  ".next/BUILD_ID",
  ".next/build-manifest.json",
  ".next/routes-manifest.json",
  ".next/server",
];
const buildOutputs = requiredBuildOutputs.map((relativePath) => ({
  path: relativePath,
  present: fs.existsSync(path.join(replayRoot, relativePath)),
}));
const ok = install.exitCode === 0
  && !install.timedOut
  && build.exitCode === 0
  && !build.timedOut
  && buildOutputs.every((entry) => entry.present);
const core = {
  schemaVersion: "velmere.runtime-bundle-replay-receipt.v1",
  status: ok ? "PASS" : "FAIL",
  deploymentSourceReplay: ok ? "PASS" : "FAIL",
  releaseEligible: false,
  hostedDeployment: "NOT_RUN",
  archive: {
    path: path.relative(sourceRoot, archivePath).split(path.sep).join("/"),
    sha256: parsed.archiveSha256,
    byteLength: parsed.byteLength,
    entryCount: parsed.entries.length,
  },
  toolchain: runtime,
  deploymentClosure: verified.deploymentClosure,
  currentSourceBinding: verified.currentSourceBinding,
  cleanInstall: install,
  build,
  buildOutputs,
  extractedPackageJsonSha256: sha256(fs.readFileSync(path.join(replayRoot, "package.json"))),
  claimBoundary: "This proves a clean local install and production build from the packaged deployment source. It does not claim a hosted deployment, live integrations or production traffic.",
  completedAt: new Date().toISOString(),
};
const receipt = { ...core, receiptSha256: receiptSha256(core) };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: receipt.status,
  archiveSha256: receipt.archive.sha256,
  cleanInstall: receipt.cleanInstall,
  build: receipt.build,
  buildOutputs: receipt.buildOutputs,
  output: path.relative(sourceRoot, outputPath).split(path.sep).join("/"),
}, null, 2)}\n`);

if (!keepReplay) {
  if (!normalizedReplayRoot.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`)) throw new Error("runtime_replay_cleanup_scope_invalid");
  fs.rmSync(replayRoot, { recursive: true, force: true });
} else {
  process.stdout.write(`[runtime-replay] kept temporary tree: ${replayRoot}\n`);
}
process.exit(ok ? 0 : 1);
