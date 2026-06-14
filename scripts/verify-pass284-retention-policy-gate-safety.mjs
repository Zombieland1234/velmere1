import { readFileSync } from "node:fs";

const checks = [];
function mustInclude(file, needle) {
  const body = readFileSync(file, "utf8");
  if (!body.includes(needle)) {
    throw new Error(`${file} is missing ${needle}`);
  }
  checks.push(`${file} -> ${needle}`);
}

function mustNotInclude(file, forbidden) {
  const body = readFileSync(file, "utf8").toLowerCase();
  for (const item of forbidden) {
    if (body.includes(item.toLowerCase())) {
      throw new Error(`${file} contains forbidden wording: ${item}`);
    }
  }
  checks.push(`${file} -> forbidden wording clean`);
}

try {
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildRetentionPolicyGate(");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass284-retention-policy-gate");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass284-retention-lane");
  mustInclude("lib/market-integrity/retention-policy-gate.ts", "velmere_retention_policy_gate_v1_pass284");
  mustInclude("lib/market-integrity/retention-policy-gate.ts", "Quiet Vault Clock");
  mustInclude("lib/market-integrity/retention-policy-gate.ts", "Velvet TTL Seal");
  mustInclude("lib/market-integrity/retention-policy-gate.ts", "do not retain raw wallet/IP");
  mustInclude("lib/market-integrity/retention-policy-gate.ts", "retention/delete owner not assigned");
  mustInclude("app/globals.css", "PASS284 — K07 retention policy gate");
  mustInclude("app/globals.css", "shield-pass284-retention-policy");
  mustInclude("lib/launch/master-build-areas.ts", "PASS284 marker: Retention policy gate active");
  mustInclude("lib/launch/project-progress.ts", "PASS284 marker: Retention policy gate active");
  mustInclude("lib/launch/master-build-progress-delta-pass284.ts", "pass284RetentionPolicyGateDelta");
  mustInclude("VELMERE_PASS284_RETENTION_POLICY_GATE_REPORT.md", "PASS284 — Retention Policy Gate");
  mustInclude("package.json", "verify:pass284-retention-policy-gate");
  mustInclude("package.json", "verify:pass283-operator-case-sla-orchestrator-gate && npm run verify:pass284-retention-policy-gate");
  mustNotInclude("lib/market-integrity/retention-policy-gate.ts", [
    "guaranteed profit",
    "safe token",
    "no risk",
    "financial advice",
    "buy now",
    "sell now",
    "scam token",
    "fraud confirmed",
    "countdown pressure"
  ]);
} catch (error) {
  console.error("PASS284 retention policy gate guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS284 retention policy gate guard passed (${checks.length} checks).`);
