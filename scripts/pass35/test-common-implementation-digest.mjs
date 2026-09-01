#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { commonImplementationDigest } from "../worldclass/common-implementation-digest.mjs";

const root = mkdtempSync(path.join(os.tmpdir(), "velmere-common-digest-"));
try {
  mkdirSync(path.join(root, "lib"), { recursive: true });
  writeFileSync(path.join(root, "lib", "active.ts"), "export const active = 1;\n");
  const baseline = commonImplementationDigest(root);
  assert.equal(baseline.files, 1);

  for (const directory of [".next", ".next-pass25-webpack", ".next-pass25-turbopack", ".velmere", "_velmere", "artifacts", "node_modules", "output"]) {
    mkdirSync(path.join(root, directory), { recursive: true });
    writeFileSync(path.join(root, directory, "generated.json"), `${directory}\n`);
  }
  assert.deepEqual(commonImplementationDigest(root), baseline, "generated evidence/build directories must not alter the implementation digest");

  writeFileSync(path.join(root, "lib", "active.ts"), "export const active = 2;\n");
  const changed = commonImplementationDigest(root);
  assert.equal(changed.files, 1);
  assert.notEqual(changed.sha256, baseline.sha256, "active source changes must alter the implementation digest");
  console.log(JSON.stringify({ status: "PASS", assertions: 5, baseline }));
} finally {
  rmSync(root, { recursive: true, force: true });
}
