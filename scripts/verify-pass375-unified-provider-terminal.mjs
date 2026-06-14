import fs from "node:fs";

const checks = [
  ["lib/market-integrity/pass375-unified-provider-terminal.ts", "PASS375.provider_connector_matrix"],
  ["lib/market-integrity/pass375-unified-provider-terminal.ts", "PASS375.pdf_preview_download_same_object"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass375-unified-provider-terminal"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "pass375ProviderConnectorMap"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass375MarketCoverageUniverse"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass375ProviderConnectorMap"],
  ["app/api/search/lens-report/route.ts", "PASS375 adds provider connector matrix"],
  ["app/api/search/lens-report/route.ts", "PASS375 PROVIDER AI TERMINAL"],
  ["components/security/SecurityTrustPage.tsx", "data-pass375-security-launch-simple"],
  ["app/globals.css", "PASS375 · Unified provider AI terminal"],
];

const missing = checks.filter(([file, marker]) => !fs.readFileSync(file, "utf8").includes(marker));
if (missing.length) {
  console.error("PASS375 guard failed:");
  for (const [file, marker] of missing) console.error(`- ${file} missing ${marker}`);
  process.exit(1);
}

const contract = fs.readFileSync("lib/market-integrity/pass375-unified-provider-terminal.ts", "utf8");
const assetRows = (contract.match(/marketRow\(\{/g) ?? []).length;
const phases = (contract.match(/seconds:/g) ?? []).length;
if (assetRows < 38) {
  console.error(`PASS375 guard failed: expected at least 38 new coverage rows, found ${assetRows}`);
  process.exit(1);
}
if (phases < 6) {
  console.error(`PASS375 guard failed: expected at least 6 AI Brain phases, found ${phases}`);
  process.exit(1);
}

console.log(`PASS375 unified provider terminal guard passed with ${assetRows} coverage rows and ${phases} phase markers.`);
