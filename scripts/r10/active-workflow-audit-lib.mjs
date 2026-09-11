import fs from "node:fs";
import path from "node:path";
import { auditWorkflowText } from "../pass4992/supply-chain-release.mjs";

export function discoverActiveWorkflowFiles(root) {
  const workflowRoot = path.join(root, ".github", "workflows");
  if (!fs.existsSync(workflowRoot)) return [];
  return fs.readdirSync(workflowRoot)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort();
}

function actionReferences(text) {
  const refs = [];
  for (const [index, line] of text.split("\n").entries()) {
    const match = line.match(/^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#.*)?$/);
    if (match) refs.push({ value: match[1], line: index + 1 });
  }
  return refs;
}

export function auditActiveWorkflowInventory({ root, pass4992Policy, r10Policy }) {
  const workflowRoot = path.join(root, ".github", "workflows");
  const workflowFiles = discoverActiveWorkflowFiles(root);
  const requiredBaseline = [...(r10Policy.requiredBaselineWorkflowFiles ?? [])].sort();
  const missingBaseline = requiredBaseline.filter((name) => !workflowFiles.includes(name));
  const blockers = missingBaseline.map((name) => `workflow_baseline_missing:${name}`);
  const workflows = [];
  let actionReferenceCount = 0;

  for (const name of workflowFiles) {
    const relativePath = `.github/workflows/${name}`;
    const text = fs.readFileSync(path.join(workflowRoot, name), "utf8");
    const refs = actionReferences(text);
    actionReferenceCount += refs.length;
    const workflowBlockers = auditWorkflowText({ text, workflowPath: relativePath, policy: pass4992Policy });
    blockers.push(...workflowBlockers);
    workflows.push({
      name,
      actionReferenceCount: refs.length,
      blockers: workflowBlockers,
    });
  }

  return {
    schemaVersion: "velmere.r10.active-workflow-audit.v1",
    inventoryMode: "DISCOVER_ALL_ACTIVE_YAML",
    workflowCount: workflowFiles.length,
    workflowFiles,
    requiredBaselineWorkflowFiles: requiredBaseline,
    missingBaselineWorkflowFiles: missingBaseline,
    actionReferenceCount,
    workflows,
    blockers: [...new Set(blockers)].sort(),
    status: blockers.length === 0 ? "PASS_DYNAMIC_ACTIVE_WORKFLOW_AUDIT" : "FAIL_ACTIVE_WORKFLOW_AUDIT",
    truthBoundary: "Observed workflow/action counts are diagnostics only. Release validity is determined by per-workflow policy checks plus minimum baseline controls; no exact global workflow/action count is trusted as authority.",
  };
}
