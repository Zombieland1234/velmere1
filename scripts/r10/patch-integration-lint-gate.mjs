#!/usr/bin/env node
import fs from "node:fs";

const workflowPath = ".github/workflows/r10-integration-gate.yml";
let text = fs.readFileSync(workflowPath, "utf8");
const block = /      - name: Release-source lint denominator\n        run: \|\n[\s\S]*?      - name: Direct TypeScript/;
const replacement = `      - name: Release-source lint denominator
        run: node scripts/r10/run-release-source-lint.mjs --output artifacts/r10/integration/build/RELEASE_LINT.json --summary artifacts/r10/integration/build/RELEASE_LINT_SUMMARY.json
      - name: Direct TypeScript`;
if (block.test(text)) {
  text = text.replace(block, replacement);
} else if (!text.includes("run-release-source-lint.mjs --output artifacts/r10/integration/build/RELEASE_LINT.json")) {
  throw new Error("integration_lint_gate_patch_anchor_missing");
}
fs.writeFileSync(workflowPath, text);
console.log("R10 integration lint gate patch: APPLIED_OR_ALREADY_PRESENT");
