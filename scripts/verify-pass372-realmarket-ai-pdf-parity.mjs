import fs from "node:fs";

const checks = [
  ["lib/market-integrity/pass372-real-market-institutional-spine.ts", "pass372RealMarketInstitutionalSpine"],
  ["lib/market-integrity/pass372-real-market-institutional-spine.ts", "pass372CoverageUpgrade"],
  ["lib/market-integrity/pass372-unified-ai-copy-contract.ts", "pass372PdfParityManifest"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass372-real-market-institutional-spine"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "pass372BrainTransformPhases"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass372CoverageUpgrade"],
  ["app/api/search/lens-report/route.ts", "PASS372 adds one parity manifest"],
  ["app/api/search/lens-report/route.ts", "CRYPTOGRAPHY + RESEARCH LAB"],
  ["app/globals.css", "PASS372 · Real Markets institutional AI parity"],
];

const missing = checks.filter(([file, marker]) => !fs.existsSync(file) || !fs.readFileSync(file, "utf8").includes(marker));
if (missing.length) {
  console.error("PASS372 guard failed:");
  for (const [file, marker] of missing) console.error(`- ${file} missing ${marker}`);
  process.exit(1);
}
console.log("PASS372 guard passed: real-market institutional spine, AI brain parity and PDF/security story markers are present.");
