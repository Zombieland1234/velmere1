import fs from "node:fs";
const checks = [
  ["lib/market-integrity/pass392-public-fidelity-core.ts", "pass392PublicFidelityCore"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "pass392Readout"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass392MarketCoverageUniverse()"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass392PublicFidelityCore"],
  ["app/api/search/lens-report/route.ts", "pass392-public-fidelity-core"],
  ["app/globals.css", "PASS392 · public fidelity core"],
];
let ok = true;
for (const [file, marker] of checks) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(marker)) {
    console.error(`Missing ${marker} in ${file}`);
    ok = false;
  }
}
const css = fs.readFileSync("app/globals.css", "utf8");
if (!css.includes(".real-markets-pass391-production-readout") || !css.includes("display: none !important")) {
  console.error("PASS392 must hide old public pass-history readouts");
  ok = false;
}
if (!ok) process.exit(1);
console.log("PASS392 public fidelity core guard passed");
