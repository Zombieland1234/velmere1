#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { auditActiveWorkflowInventory } from "./active-workflow-audit-lib.mjs";

const CHECKOUT_SHA = "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0";
const SETUP_NODE_SHA = "820762786026740c76f36085b0efc47a31fe5020";
const pass4992Policy = {
  githubActions: {
    allowedActions: {
      "actions/checkout": [CHECKOUT_SHA],
      "actions/setup-node": [SETUP_NODE_SHA],
    },
    requireCheckoutCredentialsDisabledForAllWorkflows: true,
  },
  codeql: { requiredLanguages: [], requiredQuerySuites: [] },
};
const r10Policy = { requiredBaselineWorkflowFiles: ["baseline.yml"] };

function workflow(action, { checkout = false } = {}) {
  const credentialLine = checkout ? "        persist-credentials: false\n" : "";
  return `name: fixture\non: workflow_dispatch\npermissions:\n  contents: read\njobs:\n  test:\n    runs-on: ubuntu-24.04\n    steps:\n      - uses: ${action}\n${credentialLine}`;
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r10-workflows-"));
try {
  const dir = path.join(root, ".github", "workflows");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "baseline.yml"), workflow(`actions/checkout@${CHECKOUT_SHA}`, { checkout: true }));
  fs.writeFileSync(path.join(dir, "extra.yml"), workflow(`actions/setup-node@${SETUP_NODE_SHA}`));

  const initial = auditActiveWorkflowInventory({ root, pass4992Policy, r10Policy });
  assert.equal(initial.status, "PASS_DYNAMIC_ACTIVE_WORKFLOW_AUDIT", JSON.stringify(initial, null, 2));
  assert.equal(initial.workflowCount, 2);

  fs.writeFileSync(path.join(dir, "new-safe-workflow.yaml"), workflow(`actions/setup-node@${SETUP_NODE_SHA}`));
  const expanded = auditActiveWorkflowInventory({ root, pass4992Policy, r10Policy });
  assert.equal(expanded.status, "PASS_DYNAMIC_ACTIVE_WORKFLOW_AUDIT", JSON.stringify(expanded, null, 2));
  assert.equal(expanded.workflowCount, 3);
  assert.equal(expanded.missingBaselineWorkflowFiles.length, 0);

  fs.writeFileSync(path.join(dir, "new-safe-workflow.yaml"), workflow("actions/checkout@v4", { checkout: true }));
  const unpinned = auditActiveWorkflowInventory({ root, pass4992Policy, r10Policy });
  assert.equal(unpinned.status, "FAIL_ACTIVE_WORKFLOW_AUDIT");
  assert(unpinned.blockers.some((item) => item.includes("action_not_full_sha_pinned")));

  fs.rmSync(path.join(dir, "baseline.yml"));
  const missing = auditActiveWorkflowInventory({ root, pass4992Policy, r10Policy });
  assert(missing.blockers.includes("workflow_baseline_missing:baseline.yml"));

  console.log("R10 dynamic active workflow audit regression: PASS");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
