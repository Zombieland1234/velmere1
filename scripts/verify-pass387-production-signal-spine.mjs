import { readFileSync, existsSync } from "node:fs";

const requiredFiles = [
  "lib/market-integrity/pass387-production-signal-spine.ts",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "app/api/market-integrity/real-markets/catalog/route.ts",
  "app/api/search/lens-report/route.ts",
  "components/security/SecurityTrustPage.tsx",
  "app/[locale]/research-lab/page.tsx",
  "app/globals.css",
];

const markers = [
  ["lib/market-integrity/pass387-production-signal-spine.ts", "PASS387.production_signal_spine"],
  ["lib/market-integrity/pass387-production-signal-spine.ts", "buildPass387MarketCoverageUniverse"],
  ["lib/market-integrity/pass387-production-signal-spine.ts", "buildPass387ProductionSignalReadout"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass387-production-signal-spine"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "real-markets-pass387-production-readout"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "Object.assign(assetVisuals, pass387AssetVisualPatch);"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "Object.assign(pseudoPrices, pass387PseudoPricePatch);"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass387MarketCoverageUniverse()"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "buildPass387MarketCoverageUniverse"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass387ProductionSignalContract"],
  ["app/api/search/lens-report/route.ts", "PASS387 PRODUCTION SIGNAL SPINE"],
  ["app/api/search/lens-report/route.ts", "pass387-production-signal"],
  ["app/api/search/lens-report/route.ts", "pass387Readout: ReturnType<typeof buildPass387ProductionSignalReadout>"],
  ["app/api/search/lens-report/route.ts", "pass387Readout: buildPass387ProductionSignalReadout"],
  ["components/security/SecurityTrustPage.tsx", "security-pass387-production-onepage"],
  ["app/[locale]/research-lab/page.tsx", "velmere-pass387-research-production"],
  ["app/globals.css", "PASS387 · production signal spine"],
];

const errors = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) errors.push(`Missing file: ${file}`);
}
for (const [file, marker] of markers) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  if (!text.includes(marker)) errors.push(`Missing marker ${marker} in ${file}`);
}

const route = readFileSync("app/api/search/lens-report/route.ts", "utf8");
if (!route.includes("[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]")) {
  errors.push("Lens PDF page stream does not include page 20 for PASS387 production signal spine.");
}
const market = readFileSync("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "utf8");
if (market.includes("pass381Readout pass382Readout")) {
  errors.push("Syntax poison reappeared: pass381Readout pass382Readout.");
}
if (!market.includes("real-markets-pass387-brain")) {
  errors.push("PASS387 brain class missing from Real Markets modal.");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("PASS387 production signal spine guard passed.");
