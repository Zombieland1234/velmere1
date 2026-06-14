import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["lib/market-integrity/pass378-unified-launch-orchestrator.ts", ["pass378LaunchOrchestratorContract", "buildPass378MarketCoverageUniverse", "buildPass378UnifiedReadout", "pass378PdfMirrorContract"]],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", ["data-pass378-unified-launch-orchestrator", "buildPass378MarketCoverageUniverse", "buildPass378UnifiedReadout", "pass378ProviderDeck", "real-markets-pass378-unified-readout", "real-markets-pass378-orchestrator"]],
  ["app/api/market-integrity/real-markets/catalog/route.ts", ["buildPass378MarketCoverageUniverse", "pass378LaunchOrchestratorContract", "pass378ProviderDeck"]],
  ["app/api/search/lens-report/route.ts", ["PASS378 adds unified launch orchestrator", "PASS378 UNIFIED LAUNCH ORCHESTRATOR", "pass378-preview-download-parity", "const pageStreams = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]"]],
  ["components/security/SecurityTrustPage.tsx", ["data-pass378-security-launch-orchestrator", "Signature proof", "Provider truth"]],
  ["app/[locale]/research-lab/page.tsx", ["data-pass378-research-launch-orchestrator", "cryptography / bank / determinism launch room", "Prime audit"]],
  ["app/globals.css", ["PASS378 unified launch orchestrator", ".real-markets-pass378-unified-readout", ".security-pass378-launch-orchestrator"]],
];

let ok = true;
for (const [file, markers] of checks) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    console.error(`Missing file: ${file}`);
    ok = false;
    continue;
  }
  const body = fs.readFileSync(full, "utf8");
  for (const marker of markers) {
    if (!body.includes(marker)) {
      console.error(`Missing marker in ${file}: ${marker}`);
      ok = false;
    }
  }
}

if (!ok) process.exit(1);
console.log("PASS378 unified launch orchestrator verified");
