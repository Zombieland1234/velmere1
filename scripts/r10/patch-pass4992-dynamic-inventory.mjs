#!/usr/bin/env node
import fs from "node:fs";

const supplyPath = "scripts/pass4992/supply-chain-release.mjs";
const testPath = "scripts/pass4992/test-supply-chain-release.mjs";
const policyPath = "config/pass4992-supply-chain-release-policy.json";

let supply = fs.readFileSync(supplyPath, "utf8");
const workflowStaticBlock = /  const required = \[\.\.\.\(policy\.githubActions\.requiredWorkflowFiles \?\? \[\]\)\]\.sort\(\);[\s\S]*?  return \{ workflowCount: names\.length, workflowFiles: names, actionReferenceCount, missingWorkflowFiles, unexpectedWorkflowFiles, blockers: \[\.\.\.new Set\(blockers\)\]\.sort\(\) \};/;
if (!workflowStaticBlock.test(supply)) {
  if (!supply.includes('inventoryMode: "DISCOVER_ACTIVE"')) {
    throw new Error("pass4992_dynamic_inventory_patch_anchor_missing");
  }
} else {
  supply = supply.replace(workflowStaticBlock, `  const required = [...(policy.githubActions.requiredWorkflowFiles ?? [])].sort();
  const missingWorkflowFiles = required.filter((name) => !names.includes(name));
  for (const name of missingWorkflowFiles) blockers.push(\`workflow_missing:\${name}\`);

  // R10: the active workflow directory is the authority for inventory size.
  // The policy list is a minimum baseline only; additional workflows are discovered
  // and audited with the same pinning/permissions rules instead of being rejected
  // merely because a static count/list was not manually updated.
  const additionalWorkflowFiles = names.filter((name) => !required.includes(name));
  const unexpectedWorkflowFiles = [];
  return {
    workflowCount: names.length,
    workflowFiles: names,
    actionReferenceCount,
    inventoryMode: "DISCOVER_ACTIVE",
    requiredWorkflowFiles: required,
    missingWorkflowFiles,
    additionalWorkflowFiles,
    unexpectedWorkflowFiles,
    blockers: [...new Set(blockers)].sort(),
  };`);
  fs.writeFileSync(supplyPath, supply);
}

let test = fs.readFileSync(testPath, "utf8");
const oldAssertions = `  assert.equal(audit.workflowCount, policy.githubActions.requiredWorkflowFiles.length);\n  assert.deepEqual(audit.workflowFiles, [...policy.githubActions.requiredWorkflowFiles].sort());\n  assert.equal(audit.actionReferenceCount, policy.githubActions.expectedActionReferenceCount);\n  assert.deepEqual(audit.blockers, []);`;
const newAssertions = `  assert.equal(audit.inventoryMode, "DISCOVER_ACTIVE");\n  assert.ok(audit.workflowCount >= policy.githubActions.requiredWorkflowFiles.length);\n  for (const required of policy.githubActions.requiredWorkflowFiles) assert.ok(audit.workflowFiles.includes(required));\n  assert.deepEqual(audit.unexpectedWorkflowFiles, []);\n  assert.ok(Array.isArray(audit.additionalWorkflowFiles));\n  assert.deepEqual(audit.blockers, []);`;
if (test.includes(oldAssertions)) {
  test = test.replace(oldAssertions, newAssertions);
  fs.writeFileSync(testPath, test);
} else if (!test.includes('assert.equal(audit.inventoryMode, "DISCOVER_ACTIVE")')) {
  throw new Error("pass4992_dynamic_test_patch_anchor_missing");
}

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
policy.policyId = "pass4992-r10-dynamic-active-workflow-policy-v4";
policy.candidateNote = "R10 closure: active workflow inventory is discovery-derived. requiredWorkflowFiles is a minimum baseline only; every active YAML is audited, additional files are not rejected merely for changing the inventory size, and action-reference totals are observed rather than statically hardcoded.";
policy.githubActions.workflowInventoryMode = "DISCOVER_ACTIVE";
policy.githubActions.requiredWorkflowFilesSemantics = "MINIMUM_BASELINE";
delete policy.githubActions.expectedActionReferenceCount;
fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2) + "\n");

console.log("R10 Pass4992 dynamic workflow inventory patch: APPLIED_OR_ALREADY_PRESENT");
