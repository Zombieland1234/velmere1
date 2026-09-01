#!/usr/bin/env node
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildSourceLifecycleClassification, lifecycleClassificationOutputPath } from "./source-lifecycle-classifier.mjs";

const root = process.cwd();
const persisted = JSON.parse(await fs.readFile(path.join(root, lifecycleClassificationOutputPath), "utf8"));
const current = await buildSourceLifecycleClassification(root);

assert.deepEqual(persisted, current, "source lifecycle classification is stale; run npm run pass35:classify-source");
assert.ok(current.summary.tsconfigCount >= 138, "the complete tsconfig surface, including new PASS35 configs, must be classified");
assert.ok(current.summary.scriptCount >= 486, "the complete script surface must be classified");
assert.equal(current.summary.totalCount, current.summary.tsconfigCount + current.summary.scriptCount);
assert.equal(new Set(current.entries.map((entry) => entry.path)).size, current.entries.length, "paths must be unique");
assert.ok(current.entries.every((entry) => ["ACTIVE", "HISTORY", "GENERATED"].includes(entry.classification)));
assert.ok(current.entries.every((entry) => /^[a-f0-9]{64}$/.test(entry.sha256)));
assert.ok(current.entries.every((entry) => entry.archive.eligible === false), "nothing may be archived without explicit retirement evidence");
assert.ok(current.entries.some((entry) => entry.evidence.some((item) => item.type === "DYNAMIC_PATTERN")), "bounded dynamic references must be represented");
assert.ok(current.entries.some((entry) => entry.evidence.some((item) => item.type === "PACKAGE_SCRIPT")), "package roots must be represented");

console.log(`PASS35 source lifecycle classification: PASS (${current.summary.totalCount}/${current.summary.totalCount}; archive eligible 0)`);
