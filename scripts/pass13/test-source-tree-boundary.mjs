#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-source-tree-boundary-"));
try {
  const write = (relative, value = "export default true;\n") => {
    const target = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, value);
  };
  write("app/source.ts");
  write("lib/build/control.mjs");
  write("build/generated.js");
  write(".next/generated.js");
  write(".next-pass25-webpack/server.js");
  write(".next-pass25-turbopack/server.js");
  write(".velmere/deployment-builds/receipt.json", "{}\n");
  write("artifacts/pass13/receipt.json", "{}\n");

  const commonUrl = pathToFileURL(path.join(process.cwd(), "scripts/pass13/common.mjs")).href;
  const child = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    `const m = await import(${JSON.stringify(commonUrl)}); console.log(JSON.stringify(m.treeDigest({ sourceOnly: true })));`,
  ], { cwd: fixture, encoding: "utf8" });
  assert.equal(child.status, 0, child.stderr);
  const receipt = JSON.parse(child.stdout);
  const paths = receipt.rows.map((row) => row.split("\0", 1)[0]);
  assert.deepEqual(paths, ["app/source.ts", "lib/build/control.mjs"]);
  assert.equal(receipt.fileCount, 2);
  assert.equal(paths.includes("lib/build/control.mjs"), true);
  assert.equal(paths.some((value) => value.startsWith("build/")), false);
  assert.equal(paths.some((value) => value.startsWith(".next-pass25-")), false);
  assert.equal(paths.some((value) => value.startsWith(".velmere/")), false);
  console.log("PASS13 source tree boundary tests: 7/7 PASS");
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
