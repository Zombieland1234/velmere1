import { readFileSync, existsSync } from "node:fs";

const requiredFiles = [
  "lib/market-integrity/pass386-exact-mirror-terminal.ts",
  "lib/market-integrity/pass386-decision-density-engine.ts",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "app/api/market-integrity/real-markets/catalog/route.ts",
  "app/api/search/lens-report/route.ts",
  "components/security/SecurityTrustPage.tsx",
  "app/[locale]/research-lab/page.tsx",
  "app/globals.css",
];

const markers = [
  ["lib/market-integrity/pass386-exact-mirror-terminal.ts", "PASS386.exact_mirror_terminal"],
  ["lib/market-integrity/pass386-exact-mirror-terminal.ts", "buildPass386ExactMirrorReadout"],
  ["lib/market-integrity/pass386-exact-mirror-terminal.ts", "buildPass386MarketCoverageUniverse"],
  ["lib/market-integrity/pass386-decision-density-engine.ts", "buildPass386DecisionDensityPlan"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass386-exact-mirror-terminal"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "real-markets-pass386-exact-readout"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "Object.assign(assetVisuals, pass386AssetVisualPatch);"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "Object.assign(pseudoPrices, pass386PseudoPricePatch);"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass386MarketCoverageUniverse()"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "buildPass386MarketCoverageUniverse"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass386ExactMirrorContract"],
  ["app/api/search/lens-report/route.ts", "PASS386 EXACT MIRROR TERMINAL"],
  ["app/api/search/lens-report/route.ts", "pass386-exact-mirror-terminal"],
  ["app/api/search/lens-report/route.ts", "pass386DecisionDensity"],
  ["components/security/SecurityTrustPage.tsx", "security-pass386-exact-onepage"],
  ["app/[locale]/research-lab/page.tsx", "velmere-pass386-research-exact"],
  ["app/globals.css", "PASS386 · exact mirror terminal"],
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
if (!route.includes("[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19")) {
  errors.push("Lens PDF page stream does not include page 19+ for PASS386 exact mirror.");
}
if (!route.includes("pass386Readout: ReturnType<typeof buildPass386ExactMirrorReadout>")) {
  errors.push("Resolved report type does not include PASS386 exact readout.");
}
if (!route.includes("pass386Readout: buildPass386ExactMirrorReadout")) {
  errors.push("Resolved report object does not build PASS386 readout.");
}
const market = readFileSync("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "utf8");
if (market.includes("pass381Readout pass382Readout")) {
  errors.push("Syntax poison reappeared: pass381Readout pass382Readout.");
}
if (!market.includes("real-markets-pass386-brain")) {
  errors.push("PASS386 brain class missing from Real Markets modal.");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("PASS386 exact mirror terminal guard passed.");
