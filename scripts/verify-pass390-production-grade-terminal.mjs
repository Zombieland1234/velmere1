import fs from "node:fs";

const checks = [
  ["lib/market-integrity/pass390-production-grade-terminal.ts", "pass390ProductionGradeTerminalContract"],
  ["lib/market-integrity/pass390-production-grade-terminal.ts", "buildPass390MarketCoverageUniverse"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass390UnifiedReadout"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "real-markets-pass390-production-readout"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass390MarketCoverageUniverse()"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass390ProductionGradeTerminalContract"],
  ["app/api/search/lens-report/route.ts", "PASS390 PRODUCTION GRADE TERMINAL"],
  ["app/api/search/lens-report/route.ts", "pass390Readout"],
  ["app/globals.css", "real-markets-pass390-production-readout"],
  ["app/globals.css", "real-markets-pass389-public-readout"],
];

for (const [file, marker] of checks) {
  const body = fs.readFileSync(file, "utf8");
  if (!body.includes(marker)) {
    console.error(`Missing ${marker} in ${file}`);
    process.exit(1);
  }
}

const catalog = fs.readFileSync("app/api/market-integrity/real-markets/catalog/route.ts", "utf8");
if (!catalog.includes("...buildPass390MarketCoverageUniverse()")) {
  console.error("PASS390 catalogue is not included in Real Markets API.");
  process.exit(1);
}

const pdf = fs.readFileSync("app/api/search/lens-report/route.ts", "utf8");
if (!pdf.includes("1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23")) {
  console.error("PASS390 PDF page 23 is not registered.");
  process.exit(1);
}

console.log("PASS390 production-grade terminal guard passed.");
