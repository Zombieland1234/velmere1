import fs from "node:fs";

const required = [
  ["lib/market-integrity/pass391-production-closure-terminal.ts", "PASS391.production_closure_terminal"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass391-production-closure-terminal"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass391MarketCoverageUniverse()"],
  ["app/api/search/lens-report/route.ts", "PASS391 PRODUCTION CLOSURE TERMINAL"],
  ["app/api/search/lens-report/route.ts", "pass391Readout"],
  ["app/[locale]/research-lab/page.tsx", "data-pass391-research-terminal"],
  ["components/security/SecurityTrustPage.tsx", "data-pass391-security-onepage"],
  ["app/globals.css", "PASS391 · production closure terminal"],
];

let ok = true;
for (const [file, needle] of required) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (!text.includes(needle)) {
    console.error(`[PASS391] missing ${needle} in ${file}`);
    ok = false;
  }
}
const route = fs.readFileSync("app/api/search/lens-report/route.ts", "utf8");
if (!route.includes("[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]")) {
  console.error("[PASS391] PDF page list must include page 24 only once.");
  ok = false;
}
if ((route.match(/PASS391 PRODUCTION CLOSURE TERMINAL/g) || []).length < 1) {
  console.error("[PASS391] missing PDF terminal page marker.");
  ok = false;
}
if (!ok) process.exit(1);
console.log("PASS391 production closure terminal guard passed.");
