#!/usr/bin/env node
import fs from "node:fs";

const files = [
  "reports/LEGAL_COMPLIANCE_AND_REGULATORY_OPINION.md",
  "app/api/checkout/stripe-analysis/route.ts",
  "components/security/SecurityAuditsCleanPage.tsx",
  "scripts/generate-50-audits-benchmark.mjs",
  "scripts/furnace/run-world-class-furnace.ts",
  "scripts/build-final-quality-report.mjs",
];

const remaining = [];
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const matches = source.match(/RFC\s*3161/gi) ?? [];
  if (matches.length) remaining.push({ file, occurrences: matches.length });
}

if (remaining.length) {
  throw new Error(`final_truth_rfc3161_remaining:${JSON.stringify(remaining)}`);
}

console.log("R10 RFC3161 truth guard: PASS no unevidenced RFC3161 wording remains");
