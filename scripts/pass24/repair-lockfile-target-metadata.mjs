#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT, readJson, writeJson } from "./runtime-lib.mjs";

const checkOnly = process.argv.includes("--check");
const lockPath = path.join(ROOT, "package-lock.json");
const lock = readJson(lockPath);
const candidates = [];
for (const [packagePath, row] of Object.entries(lock.packages ?? {})) {
  if (!packagePath.startsWith("node_modules/") || row?.libc) continue;
  const packageJson = path.join(ROOT, packagePath, "package.json");
  if (!fs.existsSync(packageJson)) continue;
  const installed = readJson(packageJson);
  if (!Array.isArray(installed.libc) || installed.libc.length === 0) continue;
  candidates.push({ packagePath, libc: installed.libc, name: installed.name, version: installed.version });
}
if (checkOnly) {
  if (candidates.length > 0) {
    console.error(`PASS29 lockfile target metadata drift: ${candidates.length} installed package(s) expose libc missing from package-lock.json.`);
    for (const row of candidates) console.error(`- ${row.packagePath}: ${row.libc.join(",")}`);
    process.exit(1);
  }
  console.log("PASS29 lockfile target metadata: no installed libc metadata drift");
  process.exit(0);
}
for (const candidate of candidates) lock.packages[candidate.packagePath].libc = candidate.libc;
if (candidates.length > 0) writeJson(lockPath, lock);
console.log(`PASS29 lockfile target metadata repaired: ${candidates.length}`);
