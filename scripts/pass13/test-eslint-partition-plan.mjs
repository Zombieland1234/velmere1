#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { discoverLintFiles, partitionFiles, planSubBatches, generatedIgnoreMatch } from "./eslint-partition-plan.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-eslint-plan-"));
try {
  const sizes = [10, 20, 190_000, 20_000, 5];
  const files = sizes.map((size, index) => {
    const name = `f${index}.ts`;
    fs.writeFileSync(path.join(root, name), "x".repeat(size));
    return name;
  });
  assert.deepEqual(partitionFiles(files, 2).map((row) => row.length), [2, 2, 1]);
  const batches = planSubBatches(root, files, { maxFiles: 2, maxBytes: 200_000 });
  assert.deepEqual(batches.map((row) => row.files), [["f0.ts", "f1.ts"], ["f2.ts"], ["f3.ts", "f4.ts"]]);
  assert.equal(generatedIgnoreMatch("next-env.d.ts", "File ignored because of a matching ignore pattern. Use \"--no-ignore\" to disable file ignore settings or use \"--no-warn-ignored\" to suppress this warning."), true);
  assert.equal(generatedIgnoreMatch("other.ts", "File ignored because of a matching ignore pattern. Use \"--no-ignore\" to disable file ignore settings or use \"--no-warn-ignored\" to suppress this warning."), false);
  assert.throws(() => partitionFiles(files, 0));
  assert.throws(() => planSubBatches(root, files, { maxFiles: 0 }));
  fs.mkdirSync(path.join(root, "build"), { recursive: true });
  fs.mkdirSync(path.join(root, "lib", "build"), { recursive: true });
  fs.writeFileSync(path.join(root, "build", "generated.js"), "export default 1;\n");
  fs.writeFileSync(path.join(root, "lib", "build", "control.mjs"), "export default 1;\n");
  const discovered = discoverLintFiles(root);
  assert.equal(discovered.includes("build/generated.js"), false);
  assert.equal(discovered.includes("lib/build/control.mjs"), true);
  console.log("PASS13 ESLint planner tests: 8/8 PASS");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
