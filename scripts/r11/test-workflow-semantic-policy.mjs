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

const quotedPinnedKey = inspectWorkflowText(`jobs:\n  x:\n    runs-on: ubuntu-latest\n    steps:\n      - "uses": actions/checkout@${sha}\n`, "quoted-pinned.yml", tmp);
assert.deepEqual(quotedPinnedKey.blockers, []);
assert.equal(quotedPinnedKey.semanticUsesCount, 1);

const quotedBypass = inspectWorkflowText("jobs:\n  x:\n    runs-on: ubuntu-latest\n    steps:\n      - \"uses\": actions/checkout@main\n", "quoted-bypass.yml", tmp);
assert.ok(quotedBypass.blockers.some((v) => v.includes("external_uses_not_full_sha_pinned")));
assert.equal(quotedBypass.semanticUsesCount, 1);

const escapedQuotedBypass = inspectWorkflowText("jobs:\n  x:\n    runs-on: ubuntu-latest\n    steps:\n      - \"u\\u0073es\": actions/checkout@main\n", "escaped-quoted-bypass.yml", tmp);
assert.ok(escapedQuotedBypass.blockers.some((v) => v.includes("external_uses_not_full_sha_pinned")));
assert.equal(escapedQuotedBypass.semanticUsesCount, 1);

const flowBypass = inspectWorkflowText("jobs:\n  x:\n    runs-on: ubuntu-latest\n    steps:\n      - {uses: actions/checkout@main}\n", "flow-bypass.yml", tmp);
assert.ok(flowBypass.blockers.some((v) => v.includes("flow_mapping_uses_forbidden")));
assert.ok(flowBypass.blockers.some((v) => v.includes("uses_coverage_mismatch")));

const inlinePermissions = inspectWorkflowText("permissions: {contents: write}\njobs: {}\n", "inline-permissions.yml", tmp);
assert.ok(inlinePermissions.blockers.some((v) => v.includes("flow_mapping_permissions_forbidden")));
assert.ok(inlinePermissions.blockers.some((v) => v.includes("flow_mapping_write_permission_forbidden")));

const quotedPermission = inspectWorkflowText("permissions:\n  \"contents\": write\njobs: {}\n", "quoted-permission.yml", tmp);
assert.deepEqual(quotedPermission.blockers, []);
assert.deepEqual(quotedPermission.permissionWrites, [{ line: 2, scope: "contents" }]);

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

const explicitKey = inspectWorkflowText("? uses\n: actions/checkout@main\n", "explicit-key.yml", tmp);
assert.ok(explicitKey.blockers.some((v) => v.includes("explicit_mapping_key_forbidden")));

const shellBlockScalar = inspectWorkflowText("jobs:\n  x:\n    runs-on: ubuntu-latest\n    steps:\n      - run: |\n          ! grep -q forbidden file.txt\n          echo 'uses: actions/checkout@main'\n      - uses: actions/checkout@" + sha + "\n", "shell-block.yml", tmp);
assert.deepEqual(shellBlockScalar.blockers, []);
assert.equal(shellBlockScalar.semanticUsesCount, 1);

const blockScalarUses = inspectWorkflowText("jobs:\n  x:\n    uses: |\n      actions/checkout@" + sha + "\n", "block-uses.yml", tmp);
assert.ok(blockScalarUses.blockers.some((v) => v.includes("uses_must_be_plain_scalar")));

const documentMarker = inspectWorkflowText("---\nname: bad\non: push\n", "document-marker.yml", tmp);
assert.ok(documentMarker.blockers.some((v) => v.includes("yaml_document_marker_forbidden")));

console.log(JSON.stringify({ schemaVersion: "velmere.r11.workflow-semantic-policy-test.v2", checks: 16, passed: true }, null, 2));
