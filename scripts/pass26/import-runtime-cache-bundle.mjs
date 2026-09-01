#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readJson, verifyCacheCoverage } from "../pass24/runtime-lib.mjs";
import { PASS24_REQUIREMENTS_PATH, PASS26_POLICY_PATH, verifyRuntimeCacheBundle } from "./runtime-bundle-lib.mjs";

const index = process.argv.indexOf("--bundle");
if (index < 0 || !process.argv[index + 1]) {
  console.error("Usage: node scripts/pass26/import-runtime-cache-bundle.mjs --bundle PATH");
  process.exit(2);
}
const bundle = path.resolve(process.argv[index + 1]);
const verified = verifyRuntimeCacheBundle(bundle);
const policy = readJson(PASS26_POLICY_PATH);
const archive = path.join(bundle, "runtime", policy.nodeArchive.fileName);
const runtimeDestination = path.join(process.cwd(), ".velmere", "exact-runtime", "node-v24.18.0-linux-x64");
const cacheDestination = path.join(process.cwd(), ".velmere", "npm-cache");
fs.rmSync(path.dirname(runtimeDestination), { recursive: true, force: true });
fs.rmSync(cacheDestination, { recursive: true, force: true });
fs.mkdirSync(path.dirname(runtimeDestination), { recursive: true });
fs.mkdirSync(cacheDestination, { recursive: true });
const imported = spawnSync(process.execPath, ["scripts/pass24/import-exact-runtime.mjs", "--archive", archive, "--destination", runtimeDestination], {
  cwd: process.cwd(), encoding: "utf8", timeout: 600_000, maxBuffer: 64 * 1024 * 1024,
});
process.stdout.write(imported.stdout ?? "");
process.stderr.write(imported.stderr ?? "");
if (imported.status !== 0) process.exit(imported.status ?? 1);
fs.cpSync(path.join(bundle, "npm-cache", "_cacache"), path.join(cacheDestination, "_cacache"), { recursive: true, dereference: false, preserveTimestamps: false });
const coverage = verifyCacheCoverage(cacheDestination, readJson(PASS24_REQUIREMENTS_PATH));
if (!coverage.ok) throw new Error(`PASS26 imported cache is incomplete: ${coverage.passed}/${coverage.required}`);
console.log(JSON.stringify({
  status: "PASS_IMPORTED_EXACT_RUNTIME_CACHE",
  runtime: path.relative(process.cwd(), runtimeDestination).replaceAll(path.sep, "/"),
  cache: path.relative(process.cwd(), cacheDestination).replaceAll(path.sep, "/"),
  cacheCoverage: `${coverage.passed}/${coverage.required}`,
  bundleTreeSha256: verified.manifest.treeSha256,
}, null, 2));
