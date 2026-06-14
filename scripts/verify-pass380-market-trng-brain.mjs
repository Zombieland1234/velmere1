import fs from "node:fs";

const required = [
  ["lib/market-integrity/pass380-market-trng-brain-contract.ts", "PASS380.market_trng_brain_contract"],
  ["lib/market-integrity/pass380-market-trng-brain-contract.ts", "pass380CryptoEducationDeck"],
  ["lib/market-integrity/pass380-market-trng-brain-contract.ts", "buildPass380MarketCoverageUniverse"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass380-market-trng-brain"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass380MarketCoverageUniverse"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "real-markets-pass380-live-terminal"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "pass380CryptoEducationDeck"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "buildPass380MarketCoverageUniverse"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass380LiveTruthContract"],
  ["app/api/search/lens-report/route.ts", "PASS380 MARKET / TRNG BRAIN"],
  ["app/api/search/lens-report/route.ts", "if (page === 13)"],
  ["app/api/search/lens-report/route.ts", "if (page === 14)"],
  ["app/api/search/lens-report/route.ts", "data-pass380-preview-download-parity"],
  ["app/api/search/lens-report/route.ts", "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]"],
  ["components/security/SecurityTrustPage.tsx", "data-pass380-security-market-trng"],
  ["app/[locale]/research-lab/page.tsx", "data-pass380-research-market-trng-brain"],
  ["app/globals.css", "PASS380 · market/TRNG brain contract"],
];

const missing = required.filter(([file, marker]) => !fs.existsSync(file) || !fs.readFileSync(file, "utf8").includes(marker));
if (missing.length) {
  console.error("PASS380 verification failed:");
  for (const [file, marker] of missing) console.error(`- ${file}: missing ${marker}`);
  process.exit(1);
}

const catalog = fs.readFileSync("app/api/market-integrity/real-markets/catalog/route.ts", "utf8");
if (!catalog.includes("...buildPass379MarketCoverageUniverse()") || !catalog.includes("...buildPass380MarketCoverageUniverse()")) {
  console.error("PASS380 verification failed: catalog route must include PASS379 and PASS380 universes.");
  process.exit(1);
}

console.log("PASS380 market/TRNG brain verification passed.");
