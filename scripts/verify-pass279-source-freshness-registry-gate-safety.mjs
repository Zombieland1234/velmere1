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
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildSourceFreshnessRegistryGate(");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass279-source-freshness-registry-gate");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass279-freshness-entry");
  mustInclude("lib/market-integrity/source-freshness-registry-gate.ts", "velmere_source_freshness_registry_gate_v1_pass279");
  mustInclude("lib/market-integrity/source-freshness-registry-gate.ts", "freshness registry expired");
  mustInclude("lib/market-integrity/source-freshness-registry-gate.ts", "Customer-facing copy may say review pending / sources refreshed privately only");
  mustInclude("app/globals.css", "PASS279 — K02 source freshness registry");
  mustInclude("app/globals.css", "shield-pass279-freshness-registry");
  mustInclude("lib/launch/master-build-areas.ts", "PASS279 marker: Source freshness registry gate active");
  mustInclude("lib/launch/project-progress.ts", "PASS279 marker: Source freshness registry gate active");
  mustInclude("lib/launch/master-build-progress-delta-pass279.ts", "pass279SourceFreshnessRegistryGateDelta");
  mustInclude("VELMERE_PASS279_SOURCE_FRESHNESS_REGISTRY_GATE_REPORT.md", "PASS279 — Source Freshness Registry Gate");
  mustInclude("package.json", "verify:pass279-source-freshness-registry-gate");
  mustNotInclude("lib/market-integrity/source-freshness-registry-gate.ts", [
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
  console.error("PASS279 source freshness registry gate guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS279 source freshness registry gate guard passed (${checks.length} checks).`);
