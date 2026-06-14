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
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildAnalyticsEventTaxonomyGate(");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass280-analytics-event-taxonomy-gate");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass280-analytics-event");
  mustInclude("lib/market-integrity/analytics-event-taxonomy-gate.ts", "velmere_analytics_event_taxonomy_gate_v1_pass280");
  mustInclude("lib/market-integrity/analytics-event-taxonomy-gate.ts", "Velvet Event Passport");
  mustInclude("lib/market-integrity/analytics-event-taxonomy-gate.ts", "Customer-facing copy may say telemetry is privacy-preserving");
  mustInclude("lib/market-integrity/analytics-event-taxonomy-gate.ts", "anti-FOMO cooldown");
  mustInclude("app/globals.css", "PASS280 — K03 analytics event taxonomy");
  mustInclude("app/globals.css", "shield-pass280-analytics-taxonomy");
  mustInclude("lib/launch/master-build-areas.ts", "PASS280 marker: Analytics event taxonomy gate active");
  mustInclude("lib/launch/project-progress.ts", "PASS280 marker: Analytics event taxonomy gate active");
  mustInclude("lib/launch/master-build-progress-delta-pass280.ts", "pass280AnalyticsEventTaxonomyGateDelta");
  mustInclude("VELMERE_PASS280_ANALYTICS_EVENT_TAXONOMY_GATE_REPORT.md", "PASS280 — Analytics Event Taxonomy Gate");
  mustInclude("package.json", "verify:pass280-analytics-event-taxonomy-gate");
  mustNotInclude("lib/market-integrity/analytics-event-taxonomy-gate.ts", [
    "guaranteed profit",
    "safe token",
    "no risk",
    "financial advice",
    "buy now",
    "sell now",
    "scam token",
    "fraud confirmed",
    "countdown pressure",
  ]);
} catch (error) {
  console.error("PASS280 analytics event taxonomy gate guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS280 analytics event taxonomy gate guard passed (${checks.length} checks).`);
