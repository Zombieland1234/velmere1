import fs from "node:fs";

const checks = [
  ["lib/market-integrity/pass373-real-market-provider-spine.ts", "pass373RealMarketProviderSpine"],
  ["lib/market-integrity/pass373-real-market-provider-spine.ts", "pass373ProviderSpineContract"],
  ["lib/market-integrity/pass373-unified-ai-brain-parity.ts", "pass373PdfExactParity"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass373-provider-spine"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "pass373BrainStoryboard"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "pass373ProviderSpineContract.providerTargets"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass373ProviderSpineContract"],
  ["app/api/search/lens-report/route.ts", "PASS373 forces one resolved report object"],
  ["app/api/search/lens-report/route.ts", "pass373PdfExactParity"],
  ["app/globals.css", "PASS373 · Unified provider spine"],
];

const failures = [];
for (const [file, marker] of checks) {
  if (!fs.existsSync(file)) {
    failures.push(`${file} missing`);
    continue;
  }
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes(marker)) failures.push(`${file} missing marker ${marker}`);
}

if (failures.length) {
  console.error("PASS373 guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PASS373 guard passed: provider spine, unified AI brain storyboard and exact PDF parity markers are present.");
