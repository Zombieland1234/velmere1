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
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildSourcePolicyAllowlistGate(result, sourceAdapterQuorumGate)");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass277-source-policy-allowlist-gate");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass277-source-policy-lane");
  mustInclude("lib/market-integrity/source-policy-allowlist-gate.ts", "velmere_source_policy_allowlist_gate_v1_pass277");
  mustInclude("lib/market-integrity/source-policy-allowlist-gate.ts", "private source passport");
  mustInclude("lib/market-integrity/source-policy-allowlist-gate.ts", "Unknown, fallback or operator-only sources cannot become public confidence");
  mustInclude("lib/market-integrity/source-policy-allowlist-gate.ts", "Customer copy may mention review status only");
  mustInclude("app/globals.css", "PASS277 — L07 source policy allowlist gate");
  mustInclude("app/globals.css", "shield-pass277-source-policy-gate");
  mustInclude("lib/launch/master-build-areas.ts", "PASS277 marker: Source policy allowlist gate active");
  mustInclude("lib/launch/project-progress.ts", "PASS277 marker: Source policy allowlist gate active");
  mustInclude("lib/launch/master-build-progress-delta-pass277.ts", "pass277SourcePolicyAllowlistGateDelta");
  mustInclude("VELMERE_PASS277_SOURCE_POLICY_ALLOWLIST_GATE_REPORT.md", "PASS277 — Source Policy Allowlist Gate");
  mustInclude("package.json", "verify:pass277-source-policy-allowlist-gate");
  mustNotInclude("lib/market-integrity/source-policy-allowlist-gate.ts", [
    "guaranteed profit",
    "safe token",
    "no risk",
    "financial advice",
    "buy now",
    "sell now",
    "scam token",
    "fraud confirmed",
  ]);
} catch (error) {
  console.error("PASS277 source policy allowlist gate guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS277 source policy allowlist gate guard passed (${checks.length} checks).`);
