#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { closeStandaloneRuntime } from "../../lib/build/standalone-runtime-closure.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-standalone-closure-"));
let assertions = 0;
const check = (condition, message) => { assert.ok(condition, message); assertions += 1; };
try {
  const packageRoot = path.join(root, "node_modules", "@swc", "helpers");
  fs.mkdirSync(path.join(packageRoot, "esm"), { recursive: true });
  fs.mkdirSync(path.join(packageRoot, "cjs"), { recursive: true });
  fs.writeFileSync(path.join(packageRoot, "package.json"), JSON.stringify({ name: "@swc/helpers", version: "0.5.17" }));
  fs.writeFileSync(path.join(packageRoot, "esm", "_interop_require_default.js"), "export default function(x){return x}\n");
  fs.writeFileSync(path.join(packageRoot, "esm", "_interop_require_wildcard.js"), "export default function(x){return x}\n");
  fs.writeFileSync(path.join(packageRoot, "cjs", "_interop_require_default.cjs"), "module.exports=x=>x\n");
  fs.writeFileSync(path.join(packageRoot, "cjs", "_interop_require_wildcard.cjs"), "module.exports=x=>x\n");
  fs.writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({ packages: { "node_modules/@swc/helpers": { version: "0.5.17", integrity: "sha512-fixture" } } }));
  const outputPath = path.join(root, ".next-pass25-webpack");
  fs.mkdirSync(path.join(outputPath, "static", "chunks"), { recursive: true });
  fs.writeFileSync(path.join(outputPath, "static", "chunks", "app.js"), "self.__next=true;\n");
  fs.mkdirSync(path.join(root, "public"), { recursive: true });
  fs.writeFileSync(path.join(root, "public", "icon.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"/>\n");
  fs.mkdirSync(path.join(outputPath, "standalone", "node_modules", "@swc", "helpers", "cjs"), { recursive: true });
  fs.writeFileSync(path.join(outputPath, "standalone", "node_modules", "@swc", "helpers", "cjs", "_interop_require_default.cjs"), "stale\n");
  const result = closeStandaloneRuntime({ root, outputPath });
  check(result.status === "PASS", "closure passes");
  check(result.packageCount === 1, "one allowlisted package");
  check(result.fileCount === 5, "all fixture package files copied");
  check(result.packages[0].version === "0.5.17", "version bound to source and lock");
  check(result.packages[0].integrity === "sha512-fixture", "integrity recorded");
  check(result.packages[0].replaced === 1, "stale target replaced");
  check(result.assetTreeCount === 2, "static and public asset trees recorded");
  check(result.assetFileCount === 2, "all fixture browser assets copied");
  check(fs.readFileSync(path.join(outputPath, "standalone", ".next-pass25-webpack", "static", "chunks", "app.js"), "utf8") === "self.__next=true;\n", "Next static chunk copied to runtime distDir");
  check(fs.readFileSync(path.join(outputPath, "standalone", "public", "icon.svg"), "utf8").startsWith("<svg"), "public asset copied");
  check(fs.readFileSync(path.join(outputPath, "standalone", "node_modules", "@swc", "helpers", "esm", "_interop_require_default.js"), "utf8").startsWith("export default"), "ESM default helper present");
  check(fs.readFileSync(path.join(outputPath, "standalone", "node_modules", "@swc", "helpers", "cjs", "_interop_require_default.cjs"), "utf8").startsWith("module.exports"), "CJS helper restored");
  const rerun = closeStandaloneRuntime({ root, outputPath });
  check(rerun.packages[0].unchanged === 5, "closure is idempotent");
  check(rerun.packages[0].copied === 0 && rerun.packages[0].replaced === 0, "idempotent run makes no content changes");
  check(rerun.assets.every((asset) => asset.unchanged === asset.fileCount), "asset closure is idempotent");
  console.log(JSON.stringify({ status: "PASS", assertions, result: { packageCount: result.packageCount, fileCount: result.fileCount, totalBytes: result.totalBytes } }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
