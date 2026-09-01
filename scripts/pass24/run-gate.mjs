#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DIAGNOSTICS_DIR, sourceTreeDigest, writeJson } from "./runtime-lib.mjs";

const levelIndex = process.argv.indexOf("--level");
const level = levelIndex >= 0 ? process.argv[levelIndex + 1] : "quick";
const allowHeavy = process.argv.includes("--allow-heavy");
if (!new Set(["quick", "milestone"]).has(level)) throw new Error(`Unsupported PASS24 gate level: ${level}`);
if (level === "milestone") {
  const args = ["scripts/pass24/run-exact-milestone.mjs"];
  if (allowHeavy) args.push("--allow-heavy");
  const result = spawnSync(process.execPath, args, { stdio: "inherit", cwd: process.cwd() });
  process.exit(result.status ?? 1);
}

const commands = [
  [process.execPath, ["scripts/pass23/run-gate.mjs", "--level", "quick"]],
  [process.execPath, ["scripts/pass24/build-runtime-requirements.mjs", "--check"]],
  [process.execPath, ["scripts/pass24/audit-local-cache-coverage.mjs"]],
  [process.execPath, ["scripts/pass24/verify-exact-runtime.mjs"]],
  [process.execPath, ["scripts/pass24/test-runtime-acquisition-boundaries.mjs"]]
];
const before = sourceTreeDigest();
const results = [];
let ok = true;
for (const [program, args] of commands) {
  const started = Date.now();
  const result = spawnSync(program, args, { stdio: "inherit", cwd: process.cwd(), timeout: 900_000 });
  const exitCode = result.status ?? 1;
  results.push({ command: [path.basename(program), ...args].join(" "), exitCode, durationMs: Date.now() - started, ok: exitCode === 0 });
  if (exitCode !== 0) { ok = false; break; }
}
const after = sourceTreeDigest();
const sourceImmutable = before.sha256 === after.sha256;
if (!sourceImmutable) ok = false;
writeJson(path.join(DIAGNOSTICS_DIR, "quick-gate.json"), {
  schemaVersion: "velmere.pass24.quick-gate.v1",
  generatedAt: new Date().toISOString(),
  ok,
  status: ok ? "PASS_RUNTIME_ACQUISITION_CONTRACT_RUNTIME_BLOCKERS_REPORTED" : "FAIL",
  sourceBefore: before,
  sourceAfter: after,
  sourceImmutable,
  commands: results,
  truthBoundary: "The PASS24 quick gate proves source/static/runtime-acquisition contracts only. Missing exact runtime or cache remains BLOCKED and is not promoted to milestone PASS."
});
console.log(`PASS24 quick gate: ${ok ? "PASS" : "FAIL"} sourceImmutable=${sourceImmutable} (runtime/cache may remain explicitly BLOCKED)`);
if (!ok) process.exit(1);
