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
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildCustomerSafeRiskBriefGate(");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass285-customer-safe-risk-brief-gate");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass285-customer-brief-lane");
  mustInclude("lib/market-integrity/customer-safe-risk-brief-gate.ts", "velmere_customer_safe_risk_brief_gate_v1_pass285");
  mustInclude("lib/market-integrity/customer-safe-risk-brief-gate.ts", "Proof Compass");
  mustInclude("lib/market-integrity/customer-safe-risk-brief-gate.ts", "Velvet Brief Seal");
  mustInclude("lib/market-integrity/customer-safe-risk-brief-gate.ts", "missing-data boundaries");
  mustInclude("lib/market-integrity/customer-safe-risk-brief-gate.ts", "no buy/sell prompts");
  mustInclude("app/globals.css", "PASS285 — M01 customer-safe risk brief gate");
  mustInclude("app/globals.css", "shield-pass285-customer-risk-brief");
  mustInclude("lib/launch/master-build-areas.ts", "PASS285 marker: Customer-safe risk brief gate active");
  mustInclude("lib/launch/project-progress.ts", "PASS285 marker: Customer-safe risk brief gate active");
  mustInclude("lib/launch/master-build-progress-delta-pass285.ts", "pass285CustomerSafeRiskBriefGateDelta");
  mustInclude("VELMERE_PASS285_CUSTOMER_SAFE_RISK_BRIEF_GATE_REPORT.md", "PASS285 — Customer-Safe Risk Brief Gate");
  mustInclude("package.json", "verify:pass285-customer-safe-risk-brief-gate");
  mustInclude("package.json", "verify:pass284-retention-policy-gate && npm run verify:pass285-customer-safe-risk-brief-gate");
  mustNotInclude("lib/market-integrity/customer-safe-risk-brief-gate.ts", [
    "guaranteed profit",
    "safe token",
    "no risk",
    "buy now",
    "sell now",
    "scam token",
    "fraud confirmed",
    "countdown pressure",
    "risk free",
  ]);
} catch (error) {
  console.error("PASS285 customer-safe risk brief gate guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS285 customer-safe risk brief gate guard passed (${checks.length} checks).`);
