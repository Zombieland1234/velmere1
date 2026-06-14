import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["lib/market-integrity/pass381-live-provider_orchestrated_brain.ts", ["pass381OrchestratedBrainContract", "buildPass381UnifiedReadout", "pass381MarketExpansion", "pass381PdfMirror"]],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", ["buildPass381MarketCoverageUniverse", "real-markets-pass381-orchestrated-brain", "data-pass381-live-provider-orchestrator", "pass381ProviderRails"]],
  ["app/api/market-integrity/real-markets/catalog/route.ts", ["buildPass381MarketCoverageUniverse", "pass381OrchestratedBrainContract", "pass381PdfMirror"]],
  ["app/api/search/lens-report/route.ts", ["PASS381 ORCHESTRATED AI MIRROR", "pass381-orchestrated-ai-mirror", "pass381Readout"]],
  ["components/security/SecurityTrustPage.tsx", ["security-pass381-public-layers", "Provider truth", "Entropy quality"]],
  ["app/[locale]/research-lab/page.tsx", ["velmere-pass381-research-room", "Bajak Protocol", "Real RNG"]],
  ["app/globals.css", ["PASS381", "real-markets-pass381-orchestrated-brain", "velmere-pass381-research-room"]],
];

const failures = [];
for (const [file, needles] of checks) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    failures.push(`${file}: missing`);
    continue;
  }
  const content = fs.readFileSync(full, "utf8");
  for (const needle of needles) {
    if (!content.includes(needle)) failures.push(`${file}: missing ${needle}`);
  }
}

const route = fs.readFileSync(path.join(root, "app/api/search/lens-report/route.ts"), "utf8");
if (!route.includes("[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]") && !route.includes("[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]")) {
  failures.push("lens-report route: PDF page list not extended to at least 15 pages");
}

if (failures.length) {
  console.error("PASS381 verification failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("PASS381 verification passed: provider-orchestrated Real Markets, VLM Brain, PDF mirror, Security and Research Lab markers are present.");
