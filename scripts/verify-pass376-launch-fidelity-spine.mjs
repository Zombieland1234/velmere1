import fs from "node:fs";

const required = [
  "lib/market-integrity/pass376-launch-fidelity-spine.ts",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "app/api/market-integrity/real-markets/catalog/route.ts",
  "app/api/search/lens-report/route.ts",
  "components/security/SecurityTrustPage.tsx",
  "app/[locale]/research-lab/page.tsx",
  "app/globals.css",
];

const markers = [
  "pass376ProviderLaunchFidelity",
  "buildPass376MarketCoverageUniverse",
  "pass376AssetVisualPatch",
  "data-pass376-launch-fidelity-terminal",
  "real-markets-pass376-launch-deck",
  "PASS376 LAUNCH FIDELITY SEAL",
  "pass376-preview-download-parity",
  "security-pass376-simple-architecture",
  "velmere-pass376-research-fidelity",
  "Object.assign(pseudoPrices, pass376PseudoPricePatch)",
];

let blob = "";
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  blob += `\n/* ${file} */\n` + fs.readFileSync(file, "utf8");
}

for (const marker of markers) {
  if (!blob.includes(marker)) throw new Error(`Missing PASS376 marker: ${marker}`);
}

if (!blob.includes("no fake live") && !blob.includes("fake live")) {
  throw new Error("PASS376 must keep no-fake-live boundary visible.");
}

console.log("PASS376 launch fidelity spine verified.");
