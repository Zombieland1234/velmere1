#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  PASS35_A42_REVISION_ID,
  a42StateDirectory,
  GLOBAL_JSON_PARSE_RECOVERY_WINDOW_MS,
  clearGeneratedNextState,
  countGlobalJsonParseSignatures,
  removeFileIfPresent,
  sanitizeNextChildEnvironment,
  selectDevBundler,
  sessionMarkerPath,
  shouldRecoverFromGlobalJsonParse,
  writeJsonFileAtomic,
} from "./lib/a42-dev-runtime-policy.mjs";

const root = process.cwd();
const rawArgs = process.argv.slice(2);
let explicitBundler = null;
let explicitClean = false;
let autoRecovery = true;
const nextArgs = [];

for (const arg of rawArgs) {
  if (arg === "--webpack") explicitBundler = "webpack";
  else if (arg === "--turbopack" || arg === "--turbo") explicitBundler = "turbopack";
  else if (arg === "--clean") explicitClean = true;
  else if (arg === "--no-recovery") autoRecovery = false;
  else nextArgs.push(arg);
}

const selectedBundler = selectDevBundler({ explicit: explicitBundler });
const initialSanitized = sanitizeNextChildEnvironment(process.env, selectedBundler);
if (explicitClean) initialSanitized.env.VELMERE_DEV_CLEAR_NEXT_CACHE = "1";

function runBootstrap(env, bundler) {
  const result = spawnSync(process.execPath, [path.join(root, "scripts/velmere-dev-bootstrap.mjs")], {
    cwd: root,
    env: { ...env, VELMERE_DEV_BUNDLER: bundler },
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (initialSanitized.removed.length > 0) {
  process.stdout.write(`[velmere-dev] removed inherited private Next variables: ${initialSanitized.removed.join(", ")}\n`);
}
runBootstrap(initialSanitized.env, selectedBundler);

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
if (!fs.existsSync(nextBin)) {
  process.stderr.write("[velmere-dev] Next.js is not installed. Run exact `npm ci` first.\n");
  process.exit(1);
}

const marker = sessionMarkerPath(root);
const reportPath = path.join(a42StateDirectory(root), "last-launch.json");
let activeChild = null;
let terminating = false;
let recoveryRequested = false;
let recoveryUsed = false;
let occurrenceTimes = [];
let lineBuffer = "";
let activeBundler = selectedBundler;
const attempts = [];

function writeSessionMarker(bundler) {
  writeJsonFileAtomic(marker, {
    schemaVersion: "velmere.pass35.a42.active-dev-session.v1",
    revisionId: PASS35_A42_REVISION_ID,
    parentPid: process.pid,
    bundler,
    startedAt: new Date().toISOString(),
  });
}

function writeLaunchReport(status, extra = {}) {
  writeJsonFileAtomic(reportPath, {
    schemaVersion: "velmere.pass35.a42.dev-launch-report.v1",
    revisionId: PASS35_A42_REVISION_ID,
    writtenAt: new Date().toISOString(),
    status,
    selectedBundler,
    activeBundler,
    autoRecovery,
    recoveryUsed,
    attempts,
    ...extra,
  });
}

function terminateChildTree(child, signal = "SIGTERM") {
  if (!child || child.killed || !child.pid) return;
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    if (result.status === 0) return;
  }
  try {
    child.kill(signal);
  } catch {
    try {
      child.kill();
    } catch {
      // The exit handler or stale-session recovery will close the lifecycle.
    }
  }
}

function forwardSignal(signal) {
  terminating = true;
  if (activeChild) terminateChildTree(activeChild, signal);
  else {
    removeFileIfPresent(marker);
    writeLaunchReport("terminated_before_child_exit", { signal });
    process.exit(0);
  }
}

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

function inspectOutputLine(line, bundler) {
  const count = countGlobalJsonParseSignatures(line);
  if (!count) return;
  const now = Date.now();
  for (let index = 0; index < count; index += 1) occurrenceTimes.push(now);
  occurrenceTimes = occurrenceTimes.filter((timestamp) => now - timestamp <= GLOBAL_JSON_PARSE_RECOVERY_WINDOW_MS);

  if (
    autoRecovery &&
    !recoveryUsed &&
    !recoveryRequested &&
    shouldRecoverFromGlobalJsonParse({ bundler, occurrenceTimes, now })
  ) {
    recoveryRequested = true;
    process.stderr.write(
      "\n[velmere-dev] repeated global JSON.parse crash detected under Turbopack. " +
      "Stopping it, clearing generated state and restarting once with Webpack.\n",
    );
    writeLaunchReport("turbopack_json_recovery_requested", {
      occurrenceCount: occurrenceTimes.length,
      lastErrorLine: line.slice(0, 800),
    });
    terminateChildTree(activeChild, "SIGTERM");
  }
}

function monitorOutput(text, bundler) {
  lineBuffer += text;
  const lines = lineBuffer.split(/\r?\n/u);
  lineBuffer = lines.pop() ?? "";
  for (const line of lines) inspectOutputLine(line, bundler);
  if (lineBuffer.length > 16_384) {
    inspectOutputLine(lineBuffer, bundler);
    lineBuffer = lineBuffer.slice(-2_048);
  }
}

function startNext(bundler) {
  activeBundler = bundler;
  occurrenceTimes = [];
  lineBuffer = "";
  recoveryRequested = false;
  const sanitized = sanitizeNextChildEnvironment(process.env, bundler);
  const environment = sanitized.env;
  environment.VELMERE_DEV_BUNDLER = bundler;
  environment.VELMERE_TURBOPACK_DEV_CACHE = bundler === "turbopack" && process.env.VELMERE_TURBOPACK_DEV_CACHE === "1" ? "1" : "0";
  delete environment.VELMERE_DEV_CLEAR_NEXT_CACHE;

  const bundlerArgs = bundler === "webpack" ? ["--webpack"] : ["--turbopack"];
  const args = [nextBin, "dev", ...bundlerArgs, ...nextArgs];
  const attempt = {
    bundler,
    startedAt: new Date().toISOString(),
    args: ["next", "dev", ...bundlerArgs, ...nextArgs],
    privateNextVariablesRemoved: sanitized.removed,
  };
  attempts.push(attempt);

  writeSessionMarker(bundler);
  writeLaunchReport("launching");
  process.stdout.write(`[velmere-dev] launching Next.js with ${bundler}\n`);
  activeChild = spawn(process.execPath, args, {
    cwd: root,
    env: environment,
    stdio: ["inherit", "pipe", "pipe"],
    windowsHide: false,
  });

  activeChild.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    monitorOutput(text, bundler);
  });
  activeChild.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    monitorOutput(text, bundler);
  });
  activeChild.on("error", (error) => {
    attempt.error = error.message;
    process.stderr.write(`[velmere-dev] failed to launch Next.js: ${error.message}\n`);
  });
  activeChild.on("exit", (code, signal) => {
    if (lineBuffer) inspectOutputLine(lineBuffer, bundler);
    attempt.finishedAt = new Date().toISOString();
    attempt.exitCode = code;
    attempt.signal = signal;
    const requestedRecovery = recoveryRequested && bundler === "turbopack" && !terminating;
    activeChild = null;

    if (requestedRecovery) {
      recoveryUsed = true;
      const cleared = clearGeneratedNextState(root, "repeated global JSON.parse crash under Turbopack");
      if (cleared.cleared) process.stdout.write("[velmere-dev] removed generated .next state before Webpack recovery\n");
      process.stdout.write("[velmere-dev] retrying the same source with Webpack; product files remain unchanged\n");
      writeLaunchReport("restarting_with_webpack", { cacheCleared: cleared.cleared });
      startNext("webpack");
      return;
    }

    if (terminating || code === 0 || signal === "SIGINT" || signal === "SIGTERM") {
      removeFileIfPresent(marker);
    }
    const exitStatus = terminating ? "terminated" : code === 0 ? "completed" : "failed";
    writeLaunchReport(exitStatus, { exitCode: code, signal });
    if (!terminating && code !== 0) {
      process.stderr.write(
        `[velmere-dev] Next.js exited with ${signal ? `signal ${signal}` : `code ${code ?? "unknown"}`}. ` +
        "The stale session marker will force a clean generated cache on the next start.\n",
      );
    }
    process.exit(code ?? (signal ? 1 : 0));
  });
}

startNext(selectedBundler);
