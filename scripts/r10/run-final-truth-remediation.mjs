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

try {
  await import("./patch-final-rfc3161-truth.mjs");
} catch (error) {
  const message = String(error?.message ?? error);
  if (!message.includes("final_truth_rfc3161_remaining:scripts/furnace/run-world-class-furnace.ts")) throw error;
  const furnace = "scripts/furnace/run-world-class-furnace.ts";
  let src = fs.readFileSync(furnace, "utf8");
  src = src.replace(/RFC\s*3161/gi, "external TSA timestamp (not evidenced)");
  fs.writeFileSync(furnace, src);
}

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  if (/RFC\s*3161/i.test(src)) throw new Error(`final_truth_rfc3161_remaining_after_runner:${file}`);
}

fs.mkdirSync("artifacts/r10/final-truth-remediation", { recursive: true });
fs.writeFileSync(
  "artifacts/r10/final-truth-remediation/PATCH_RECEIPT.json",
  JSON.stringify({
    schemaVersion: "velmere.r10.final-timestamp-truth-remediation.v2",
    classification: "PATCH_PENDING_VERIFICATION",
    files,
    externalTimestampClaimCredit: false,
    replacementBoundary: "LOCAL_SHA256_AND_LOCAL_ED25519_INTEGRITY_ONLY",
    remainingRfc3161SurfaceCount: 0,
    productionCredit: false,
  }, null, 2) + "\n",
);
console.log("R10 final timestamp truth remediation runner: PASS");
