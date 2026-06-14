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
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildOperatorCaseSlaOrchestratorGate(");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass283-operator-case-sla-orchestrator-gate");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass283-case-stage");
  mustInclude("lib/market-integrity/operator-case-sla-orchestrator-gate.ts", "velmere_operator_case_sla_orchestrator_gate_v1_pass283");
  mustInclude("lib/market-integrity/operator-case-sla-orchestrator-gate.ts", "Concierge Escalation Rail");
  mustInclude("lib/market-integrity/operator-case-sla-orchestrator-gate.ts", "Private Concierge Case");
  mustInclude("lib/market-integrity/operator-case-sla-orchestrator-gate.ts", "case owner not assigned");
  mustInclude("lib/market-integrity/operator-case-sla-orchestrator-gate.ts", "no wallet/IP");
  mustInclude("app/globals.css", "PASS283 — K06 operator case SLA orchestrator gate");
  mustInclude("app/globals.css", "shield-pass283-operator-case-sla");
  mustInclude("lib/launch/master-build-areas.ts", "PASS283 marker: Operator case SLA orchestrator gate active");
  mustInclude("lib/launch/project-progress.ts", "PASS283 marker: Operator case SLA orchestrator gate active");
  mustInclude("lib/launch/master-build-progress-delta-pass283.ts", "pass283OperatorCaseSlaOrchestratorGateDelta");
  mustInclude("VELMERE_PASS283_OPERATOR_CASE_SLA_ORCHESTRATOR_GATE_REPORT.md", "PASS283 — Operator Case SLA Orchestrator Gate");
  mustInclude("package.json", "verify:pass283-operator-case-sla-orchestrator-gate");
  mustInclude("package.json", "verify:pass282-privacy-redaction-envelope-gate");
  mustNotInclude("lib/market-integrity/operator-case-sla-orchestrator-gate.ts", [
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
  console.error("PASS283 operator case SLA orchestrator gate guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS283 operator case SLA orchestrator gate guard passed (${checks.length} checks).`);
