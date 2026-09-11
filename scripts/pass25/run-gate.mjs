#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DIAGNOSTICS_DIR, sourceTreeDigest, writeJson } from "./common.mjs";

const levelIndex = process.argv.indexOf("--level");
const level = levelIndex >= 0 ? process.argv[levelIndex + 1] : "quick";
const allowHeavy = process.argv.includes("--allow-heavy");
if (!new Set(["quick", "milestone", "build"]).has(level)) throw new Error(`Unsupported PASS25 gate level: ${level}`);
if ((level === "milestone" || level === "build") && !allowHeavy) {
  console.error(`PASS25 ${level} gate is intentionally blocked without --allow-heavy.`);
  process.exit(2);
}

const r10Ts = (script) => [
  process.execPath,
  ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", script],
];

const commands = level === "quick"
  ? [
      [process.execPath, ["scripts/pass24/run-gate.mjs", "--level", "quick"]],
      [process.execPath, ["scripts/pass25/verify-build-profile-contract.mjs"]],
      [process.execPath, ["scripts/pass25/test-build-watchdog-boundaries.mjs"]],
      [process.execPath, ["scripts/r10/test-offline-ts-loader-node-builtins.mjs"]],
      [process.execPath, ["scripts/r10/test-release-truth-gate.mjs"]],
      r10Ts("scripts/r10/test-claim-evidence-binding.ts"),
      r10Ts("scripts/r10/test-claim-audit-blocker-evidence-status.ts"),
      r10Ts("scripts/r10/test-canonical-instrument-identity.ts"),
      [process.execPath, ["scripts/r10/test-active-workflow-audit.mjs"]],
      [process.execPath, ["scripts/r10/verify-active-workflows.mjs"]],
      [process.execPath, ["scripts/r10/test-authority-genesis.mjs"]],
      [process.execPath, ["scripts/r10/verify-authority-genesis.mjs"]],
      [process.execPath, ["scripts/r10/verify-release-truth.mjs"]],
      [process.execPath, ["scripts/pass25/audit-prebuild-readiness.mjs"]],
    ]
  : level === "milestone"
    ? [
        [process.execPath, ["scripts/pass25/run-gate.mjs", "--level", "quick"]],
        [process.execPath, ["scripts/pass24/run-exact-milestone.mjs", "--allow-heavy"]],
      ]
    : [
        [process.execPath, ["scripts/pass25/run-gate.mjs", "--level", "milestone", "--allow-heavy"]],
        [process.execPath, ["scripts/pass25/run-build-watchdog.mjs", "webpack"]],
        [process.execPath, ["scripts/pass25/run-build-watchdog.mjs", "turbopack"]],
      ];

const before = sourceTreeDigest();
const results = [];
let ok = true;
let blocked = false;
for (const [program, args] of commands) {
  const started = Date.now();
  console.log(`[PASS25 ${level}] ${path.basename(program)} ${args.join(" ")}`);
  const result = spawnSync(program, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    timeout: level === "build" ? 8 * 60 * 60 * 1000 : level === "milestone" ? 2 * 60 * 60 * 1000 : 30 * 60 * 1000,
    windowsHide: true,
  });
  const exitCode = result.status ?? (result.error?.code === "ETIMEDOUT" ? 124 : 1);
  let commandBlocked = exitCode === 2;
  if (!commandBlocked && exitCode !== 0 && (level === "milestone" || level === "build")) {
    try {
      const runtime = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".velmere/pass24-diagnostics/runtime-availability.json"), "utf8"));
      const cache = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".velmere/pass24-diagnostics/cache-coverage.json"), "utf8"));
      commandBlocked = runtime.ok !== true || cache.ok !== true;
    } catch (ignoredError) { void ignoredError; }
  }
  results.push({ command: [path.basename(program), ...args].join(" "), exitCode, durationMs: Date.now() - started, ok: exitCode === 0, blocked: commandBlocked });
  if (exitCode !== 0) {
    ok = false;
    blocked = commandBlocked;
    break;
  }
}
const after = sourceTreeDigest();
const sourceImmutable = before.sha256 === after.sha256;
if (!sourceImmutable) ok = false;
const status = ok
  ? level === "quick" ? "PASS_STATIC_PREBUILD_READY_RUNTIME_BLOCKED" : level === "milestone" ? "PASS_EXACT_RUNTIME_MILESTONE" : "PASS_DUAL_BUILD"
  : blocked ? "BLOCKED_EXACT_RUNTIME_OR_EXPLICIT_GATE" : "FAIL";
const receipt = {
  schemaVersion: "velmere.pass25.gate.v1",
  generatedAt: new Date().toISOString(),
  level,
  allowHeavy,
  ok,
  blocked,
  status,
  sourceBefore: before,
  sourceAfter: after,
  sourceImmutable,
  commands: results,
  truthBoundary: level === "quick"
    ? "Static prebuild contracts plus R10 loader/claim/evidence/instrument/dynamic-workflow/authority-genesis truth gates only; exact runtime milestone and production builds remain separate gates."
    : level === "milestone"
      ? "Exact runtime install/typecheck/lint/test only; successful production builds remain separate."
      : "Successful exact-runtime milestone plus one Webpack and one Turbopack production build; browser/PDF/staging/LIVE remain separate.",
};
writeJson(path.join(DIAGNOSTICS_DIR, `${level}-gate.json`), receipt);
console.log(JSON.stringify({ status, ok, blocked, sourceImmutable, commands: results.length }, null, 2));
if (!ok) process.exit(blocked ? 2 : 1);
