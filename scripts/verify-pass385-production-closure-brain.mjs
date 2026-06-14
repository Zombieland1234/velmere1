import { readFileSync, existsSync } from "node:fs";

const requiredFiles = [
  "lib/market-integrity/pass385-production-closure-brain.ts",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "app/api/market-integrity/real-markets/catalog/route.ts",
  "app/api/search/lens-report/route.ts",
  "components/security/SecurityTrustPage.tsx",
  "app/[locale]/research-lab/page.tsx",
  "app/globals.css",
];

const markers = [
  ["lib/market-integrity/pass385-production-closure-brain.ts", "PASS385.production_closure_brain"],
  ["lib/market-integrity/pass385-production-closure-brain.ts", "buildPass385ProductionClosureReadout"],
  ["lib/market-integrity/pass385-production-closure-brain.ts", "pass385ProviderClosureDeck"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass385-production-closure-brain"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "real-markets-pass385-production-readout"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass385MarketCoverageUniverse()"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass385ProductionClosureContract"],
  ["app/api/search/lens-report/route.ts", "PASS385 PRODUCTION CLOSURE BRAIN"],
  ["app/api/search/lens-report/route.ts", "pass385-production-closure"],
  ["components/security/SecurityTrustPage.tsx", "security-pass385-production-onepage"],
  ["app/[locale]/research-lab/page.tsx", "velmere-pass385-production-research"],
  ["app/globals.css", "PASS385 · production closure brain"],
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
if (!route.includes("[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]") && !route.includes("[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]")) {
  errors.push("Lens PDF page stream does not include page 18 for PASS385 parity.");
}
const market = readFileSync("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "utf8");
if (market.includes("pass381Readout pass382Readout")) {
  errors.push("Syntax poison reappeared: pass381Readout pass382Readout.");
}
if (!market.includes("Object.assign(assetVisuals, pass385AssetVisualPatch);")) {
  errors.push("PASS385 asset visual patch is not merged into Real Markets visuals.");
}
if (!market.includes("Object.assign(pseudoPrices, pass385PseudoPricePatch);")) {
  errors.push("PASS385 pseudo price patch is not merged.");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("PASS385 production closure brain guard passed.");
