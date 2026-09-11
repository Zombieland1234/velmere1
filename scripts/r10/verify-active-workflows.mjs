#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditActiveWorkflowInventory } from "./active-workflow-audit-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv.includes("--root")
  ? path.resolve(process.argv[process.argv.indexOf("--root") + 1])
  : path.resolve(HERE, "../..");

const pass4992Policy = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass4992-supply-chain-release-policy.json"), "utf8"));
const r10Policy = JSON.parse(fs.readFileSync(path.join(ROOT, "config/r10/active-workflow-policy.json"), "utf8"));
if (r10Policy.schemaVersion !== "velmere.r10.active-workflow-policy.v1") {
  throw new Error("r10_active_workflow_policy_schema_invalid");
}

const receipt = auditActiveWorkflowInventory({ root: ROOT, pass4992Policy, r10Policy });
if (process.argv.includes("--write")) {
  const outIndex = process.argv.indexOf("--output");
  const output = outIndex >= 0
    ? path.resolve(process.argv[outIndex + 1])
    : path.join(ROOT, "artifacts", "r10", "R10_ACTIVE_WORKFLOW_AUDIT.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n", "utf8");
}
console.log(JSON.stringify(receipt, null, 2));
if (receipt.blockers.length > 0) process.exit(1);
