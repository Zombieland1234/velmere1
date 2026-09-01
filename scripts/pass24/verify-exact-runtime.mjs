#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { readJson, POLICY_PATH, ROOT, run, writeJson, DIAGNOSTICS_DIR } from "./runtime-lib.mjs";

const runtimeIndex = process.argv.indexOf("--runtime");
const runtime = runtimeIndex >= 0 ? path.resolve(process.argv[runtimeIndex + 1]) : path.join(ROOT, ".velmere", "exact-runtime", "node-v24.18.0-linux-x64");
const outputIndex = process.argv.indexOf("--output");
const output = outputIndex >= 0 ? path.resolve(process.argv[outputIndex + 1]) : path.join(DIAGNOSTICS_DIR, "runtime-availability.json");
const policy = readJson(POLICY_PATH);
const nodeBinary = path.join(runtime, "bin", "node");
const npmBinary = path.join(runtime, "bin", "npm");
let nodeVersion = null;
let npmVersion = null;
let ok = false;
if (fs.existsSync(nodeBinary) && fs.existsSync(npmBinary)) {
  const node = run(nodeBinary, ["-v"], { timeout: 30_000 });
  const npm = run(npmBinary, ["-v"], { timeout: 30_000, env: { ...process.env, PATH: `${path.join(runtime, "bin")}${path.delimiter}${process.env.PATH ?? ""}` } });
  nodeVersion = node.stdout.trim() || null;
  npmVersion = npm.stdout.trim() || null;
  ok = node.status === 0 && npm.status === 0 && nodeVersion === `v${policy.node.version}` && npmVersion === policy.node.bundledNpmVersion;
}
const report = {
  schemaVersion: "velmere.pass24.runtime-availability.v1",
  runtime: path.relative(ROOT, runtime).replaceAll(path.sep, "/"),
  nodeVersion,
  npmVersion,
  expectedNodeVersion: `v${policy.node.version}`,
  expectedNpmVersion: policy.node.bundledNpmVersion,
  ok,
  status: ok ? "PASS_EXACT_RUNTIME" : "BLOCKED_EXACT_RUNTIME_MISSING_OR_INVALID"
};
writeJson(output, report);
console.log(`PASS24 runtime: ${report.status} node=${nodeVersion ?? "missing"} npm=${npmVersion ?? "missing"}`);
if (process.argv.includes("--require" ) && !ok) process.exit(1);
