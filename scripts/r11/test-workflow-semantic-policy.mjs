#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectWorkflowText } from "./verify-workflow-semantic-policy.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r11-f09-"));
fs.mkdirSync(path.join(tmp, ".github", "workflows"), { recursive: true });
fs.writeFileSync(path.join(tmp, ".github", "workflows", "child.yml"), "name: child\non: workflow_call\njobs: {}\n");
fs.mkdirSync(path.join(tmp, ".github", "actions", "local"), { recursive: true });
fs.writeFileSync(path.join(tmp, ".github", "actions", "local", "action.yml"), "name: local\nruns:\n  using: composite\n  steps: []\n");

const sha = "a".repeat(40);
const good = `name: good\non: push\npermissions:\n  contents: read\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: "actions/checkout@${sha}" # quoted pinned ref\n      - uses: ./.github/actions/local\n  child:\n    uses: ./.github/workflows/child.yml\n  remote:\n    uses: 'owner/repo/.github/workflows/reuse.yml@${sha}'\n`;
const goodResult = inspectWorkflowText(good, ".github/workflows/good.yml", tmp);
assert.deepEqual(goodResult.blockers, []);
assert.equal(goodResult.semanticUsesCount, 4);
assert.equal(goodResult.reusableWorkflows.length, 2);

const dynamic = inspectWorkflowText(`jobs:\n  x:\n    uses: owner/repo/.github/workflows/a.yml@\${{ github.sha }}\n`, "dynamic.yml", tmp);
assert.ok(dynamic.blockers.some((v) => v.includes("dynamic_uses_forbidden")));
assert.ok(dynamic.blockers.some((v) => v.includes("external_uses_not_full_sha_pinned")));

const unpinned = inspectWorkflowText("jobs:\n  x:\n    uses: owner/repo/.github/workflows/a.yml@main\n", "unpinned.yml", tmp);
assert.ok(unpinned.blockers.some((v) => v.includes("external_uses_not_full_sha_pinned")));

const anchor = inspectWorkflowText("permissions: &p\n  contents: read\njobs:\n  x:\n    permissions: *p\n", "anchor.yml", tmp);
assert.ok(anchor.blockers.some((v) => v.includes("yaml_anchor_or_alias_forbidden")));

const merge = inspectWorkflowText("jobs:\n  x:\n    <<: *defaults\n", "merge.yml", tmp);
assert.ok(merge.blockers.some((v) => v.includes("yaml_merge_key_forbidden")));

const writeAll = inspectWorkflowText("permissions: write-all\njobs: {}\n", "write-all.yml", tmp);
assert.ok(writeAll.blockers.some((v) => v.includes("permissions_write_all_forbidden")));

const missingLocal = inspectWorkflowText("jobs:\n  x:\n    uses: ./.github/workflows/missing.yml\n", "missing.yml", tmp);
assert.ok(missingLocal.blockers.some((v) => v.includes("local_reusable_missing")));

console.log(JSON.stringify({ schemaVersion: "velmere.r11.workflow-semantic-policy-test.v1", checks: 7, passed: true }, null, 2));
