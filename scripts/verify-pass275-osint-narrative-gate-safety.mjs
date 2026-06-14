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
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "PASS275 guard compatibility");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildOsintNarrativeGate(result)");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass275-osint-narrative-gate");
  mustInclude("lib/market-integrity/osint-narrative-gate.ts", "velmere_osint_narrative_gate_v1_pass275");
  mustInclude("lib/market-integrity/osint-narrative-gate.ts", "narrative_quarantine");
  mustInclude("lib/market-integrity/osint-narrative-gate.ts", "anti-FOMO gate");
  mustInclude("lib/market-integrity/osint-narrative-gate.ts", "Missing OSINT data is uncertainty, not trust");
  mustInclude("lib/market-integrity/osint-narrative-gate.ts", "not a trade signal");
  mustInclude("app/globals.css", "PASS275 — L05 OSINT narrative quarantine gate");
  mustInclude("app/globals.css", "shield-pass275-osint-gate");
  mustInclude("lib/launch/master-build-areas.ts", "PASS275 marker: OSINT narrative quarantine gate active");
  mustInclude("lib/launch/project-progress.ts", "PASS275 marker: OSINT narrative quarantine gate active");
  mustInclude("lib/launch/master-build-progress-delta-pass275.ts", "pass275OsintNarrativeGateDelta");
  mustInclude("VELMERE_PASS275_OSINT_NARRATIVE_GATE_REPORT.md", "PASS275 — OSINT Narrative Quarantine Gate");
  mustInclude("package.json", "verify:pass275-osint-narrative-gate");
  mustNotInclude("lib/market-integrity/osint-narrative-gate.ts", [
    "buy now",
    "sell now",
    "guaranteed profit",
    "safe token",
    "no risk",
    "financial advice",
    "scam token",
    "fraud confirmed",
  ]);
} catch (error) {
  console.error("PASS275 OSINT narrative gate guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS275 OSINT narrative gate guard passed (${checks.length} checks).`);
