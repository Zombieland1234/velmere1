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
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "PASS276 guard compatibility");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildSourceAdapterQuorumGate(result");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass276-source-adapter-quorum-gate");
  mustInclude("lib/market-integrity/source-adapter-quorum-gate.ts", "velmere_source_adapter_quorum_gate_v1_pass276");
  mustInclude("lib/market-integrity/source-adapter-quorum-gate.ts", "circuit_breaker_active");
  mustInclude("lib/market-integrity/source-adapter-quorum-gate.ts", "anti-FOMO circuit breaker");
  mustInclude("lib/market-integrity/source-adapter-quorum-gate.ts", "Fallback data is useful for layout, but missing adapter proof is uncertainty, not trust");
  mustInclude("app/globals.css", "PASS276 — L06 source adapter quorum gate");
  mustInclude("app/globals.css", "shield-pass276-source-quorum-gate");
  mustInclude("lib/launch/master-build-areas.ts", "PASS276 marker: Source adapter quorum gate active");
  mustInclude("lib/launch/project-progress.ts", "PASS276 marker: Source adapter quorum gate active");
  mustInclude("lib/launch/master-build-progress-delta-pass276.ts", "pass276SourceAdapterQuorumGateDelta");
  mustInclude("VELMERE_PASS276_SOURCE_ADAPTER_QUORUM_GATE_REPORT.md", "PASS276 — Source Adapter Quorum Gate");
  mustInclude("package.json", "verify:pass276-source-adapter-quorum-gate");
  mustNotInclude("lib/market-integrity/source-adapter-quorum-gate.ts", [
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
  console.error("PASS276 source adapter quorum gate guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS276 source adapter quorum gate guard passed (${checks.length} checks).`);
