#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const test = "scripts/pass36/test-a102r44p23-disposable-customer-lifecycle-e2e.mjs";
function execute() {
  const run = spawnSync(process.execPath, [test], {
    cwd: root,
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "", HOME: root, TMPDIR: "/tmp", TERM: "dumb", NO_COLOR: "1", CI: "true" },
    timeout: 120_000,
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.equal(run.stderr, "");
  return JSON.parse(run.stdout);
}
const left = execute();
const right = execute();
const project = (value) => ({
  status: value.status,
  assertions: value.assertions,
  passed: value.passed,
  failed: value.failed,
  flows: value.flows,
  creditBoundary: value.creditBoundary,
  rows: value.rows.map(({ id, ok }) => ({ id, ok })),
});
assert.deepEqual(project(left), project(right));
assert.equal(left.assertions, 63);
assert.equal(left.passed, 63);
assert.equal(left.failed, 0);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p23.lifecycle-repeatability.v1",
  status: "PASS",
  checks: 8,
  passed: 8,
  failed: 0,
  executions: 2,
  assertionsPerExecution: 63,
  behaviorProjectionIdentical: true,
}, null, 2));
