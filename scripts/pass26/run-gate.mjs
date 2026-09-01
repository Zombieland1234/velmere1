#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { sourceTreeDigest, writeJson } from "../pass25/common.mjs";

const levelIndex = process.argv.indexOf("--level");
const level = levelIndex >= 0 ? process.argv[levelIndex + 1] : "quick";
if (level !== "quick") throw new Error("PASS26 local gate currently supports only quick; exact milestone/build run through the manual CI bridge or PASS25 heavy gates");
const commands = [
  [process.execPath, ["scripts/pass25/run-gate.mjs", "--level", "quick"]],
  [process.execPath, ["scripts/pass26/audit-ci-contract.mjs"]],
  [process.execPath, ["scripts/pass26/test-runtime-bundle-boundaries.mjs"]],
];
const before = sourceTreeDigest();
const results = [];
let ok = true;
for (const [program, args] of commands) {
  const started = Date.now();
  const result = spawnSync(program, args, { cwd: process.cwd(), stdio: "inherit", timeout: 30 * 60 * 1000, windowsHide: true });
  const exitCode = result.status ?? (result.error?.code === "ETIMEDOUT" ? 124 : 1);
  results.push({ command: [path.basename(program), ...args].join(" "), exitCode, durationMs: Date.now() - started, ok: exitCode === 0 });
  if (exitCode !== 0) { ok = false; break; }
}
const after = sourceTreeDigest();
const sourceImmutable = before.sha256 === after.sha256;
if (!sourceImmutable) ok = false;
const receipt = {
  schemaVersion: "velmere.pass26.quick-gate.v1",
  level,
  ok,
  status: ok ? "PASS_CI_RUNTIME_BRIDGE_STATIC_READY" : "FAIL",
  sourceBefore: before,
  sourceAfter: after,
  sourceImmutable,
  commands: results,
  truthBoundary: "Static/local proof for CI workflow and bundle contracts only. Exact runtime milestone and dual build require one manual GitHub Actions execution and downloaded artifact.",
};
const out = path.join(process.cwd(), ".velmere", "pass26-diagnostics", "quick-gate.json");
writeJson(out, receipt);
console.log(JSON.stringify({ status: receipt.status, ok, sourceImmutable, commands: results.length }, null, 2));
if (!ok) process.exit(1);
