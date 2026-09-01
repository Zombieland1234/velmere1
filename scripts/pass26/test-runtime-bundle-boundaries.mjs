#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { buildBundleManifest, BUNDLE_MANIFEST_NAME, safeJoin, validateBundleRelativePath, verifyBundleFileManifest, writeJson } from "./runtime-bundle-lib.mjs";

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function throws(fn, pattern) { assert.throws(fn, pattern); }

test("accepts portable relative path", () => assert.equal(validateBundleRelativePath("npm-cache/_cacache/index-v5/a/b"), "npm-cache/_cacache/index-v5/a/b"));
test("rejects traversal", () => throws(() => validateBundleRelativePath("../secret"), /unsafe|rejected/u));
test("rejects normalized traversal", () => throws(() => validateBundleRelativePath("a/../secret"), /unsafe|rejected/u));
test("rejects absolute path", () => throws(() => validateBundleRelativePath("/tmp/secret"), /absolute/u));
test("rejects backslash", () => throws(() => validateBundleRelativePath("a\\b"), /portable/u));
test("safeJoin stays inside root", () => {
  const root = path.join(os.tmpdir(), "pass26-safe-root");
  assert.equal(safeJoin(root, "a/b"), path.join(root, "a", "b"));
});
test("manifest detects tampering", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pass26-manifest-"));
  try {
    fs.mkdirSync(path.join(root, "runtime"), { recursive: true });
    fs.writeFileSync(path.join(root, "runtime", "node.bin"), "one");
    writeJson(path.join(root, BUNDLE_MANIFEST_NAME), buildBundleManifest(root, { sourceLockfileSha256: "0".repeat(64) }));
    assert.equal(verifyBundleFileManifest(root).ok, true);
    fs.writeFileSync(path.join(root, "runtime", "node.bin"), "two");
    assert.equal(verifyBundleFileManifest(root).ok, false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test("manifest rejects symlink", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pass26-symlink-"));
  try {
    fs.writeFileSync(path.join(root, "target"), "x");
    fs.symlinkSync("target", path.join(root, "link"));
    throws(() => buildBundleManifest(root), /symlink/u);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

let passed = 0;
for (const row of tests) {
  try { row.fn(); passed += 1; console.log(`ok ${passed} - ${row.name}`); }
  catch (error) { console.error(`not ok ${passed + 1} - ${row.name}`); console.error(error); process.exit(1); }
}
console.log(`PASS26 runtime bundle boundaries: ${passed}/${tests.length} PASS`);
