#!/usr/bin/env node
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { sourceTreeDigest } from "../deployment/common.mjs";
import { buildSourceLifecycleClassification } from "./source-lifecycle-classifier.mjs";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "velmere-pass35-lifecycle-"));
try {
  const fixtureDependencyImport = ["im", "port ", "'", ".", "/", "dep.mjs", "';"].join("");
  const files = {
    "package.json": JSON.stringify({ scripts: { check: "node scripts/entry.mjs" } }),
    "tsconfig.json": JSON.stringify({ compilerOptions: {} }),
    "tsconfig.part-01.json": JSON.stringify({ extends: "./tsconfig.json" }),
    "tsconfig.part-02.json": JSON.stringify({ extends: "./tsconfig.json" }),
    "tsconfig.orphan.json": JSON.stringify({ compilerOptions: {} }),
    "scripts/entry.mjs": `${fixtureDependencyImport}\nfor (const index of [1, 2]) console.log(\`tsconfig.part-\${String(index).padStart(2, "0")}.json\`);\n`,
    "scripts/dep.mjs": "export const value = 1;\n",
    "scripts/render.py": "print('synthetic render')\n",
    "scripts/orphan.mjs": "export const retired = true;\n",
    "scripts/contracts/snapshot.txt": "generated contract snapshot\n",
    "artifacts/scripts/ignored.mjs": "throw new Error('excluded');\n",
    ".next-pass25-webpack/standalone/tsconfig.json": JSON.stringify({ compilerOptions: {} }),
  };
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, content, "utf8");
  }

  const manifest = await buildSourceLifecycleClassification(root);
  const byPath = new Map(manifest.entries.map((entry) => [entry.path, entry]));
  assert.equal(byPath.get("scripts/entry.mjs").classification, "ACTIVE");
  assert.equal(byPath.get("scripts/dep.mjs").classification, "ACTIVE");
  assert.equal(byPath.get("scripts/render.py").classification, "HISTORY");
  assert.equal(byPath.get("scripts/orphan.mjs").classification, "HISTORY");
  assert.equal(byPath.get("scripts/contracts/snapshot.txt").classification, "GENERATED");
  assert.equal(byPath.get("tsconfig.part-01.json").classification, "ACTIVE");
  assert.equal(byPath.get("tsconfig.part-02.json").classification, "ACTIVE");
  assert.equal(byPath.get("tsconfig.orphan.json").classification, "HISTORY");
  assert.equal(byPath.has("artifacts/scripts/ignored.mjs"), false);
  assert.equal(byPath.has(".next-pass25-webpack/standalone/tsconfig.json"), false);
  assert.equal(manifest.entries.some((entry) => entry.archive.eligible), false);
  assert.ok(byPath.get("tsconfig.part-01.json").evidence.some((item) => item.type === "DYNAMIC_PATTERN"));

  const buildDigestBeforeReceipt = sourceTreeDigest(root);
  await fs.mkdir(path.join(root, "_velmere/pass35"), { recursive: true });
  await fs.writeFile(path.join(root, "_velmere/pass35/generated-receipt.json"), "{\"generated\":true}\n", "utf8");
  assert.deepEqual(sourceTreeDigest(root), buildDigestBeforeReceipt);
  await fs.writeFile(path.join(root, "scripts/dep.mjs"), "export const value = 2;\n", "utf8");
  assert.notEqual(sourceTreeDigest(root).sha256, buildDigestBeforeReceipt.sha256);
  console.log("PASS35 source lifecycle and build-digest boundary tests: PASS (14 assertions)");
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
