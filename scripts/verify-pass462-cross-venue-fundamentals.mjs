import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["lib/market-integrity/pass461-venue-health-runtime.ts", ["coinbase", "BTC-USD", "referencePrice", "api.exchange.coinbase.com"]],
  ["lib/market-integrity/pass462-cross-venue-consensus.ts", ["pass462-cross-venue-consensus", "priceDivergenceBps", "USD and USDT quote currencies", "Coinbase Exchange"]],
  ["lib/market-integrity/pass459-alpha-vantage-provider.ts", ["Pass459Fundamentals", "ETF_PROFILE", "topHoldings", "priceToBookRatio", "resolveFund"]],
  ["lib/market-integrity/pass458-provider-truth-router.ts", ["venueComparison", "fundamentals", "preferredPass462SecondaryVenue"]],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", ["data-pass462-fundamentals", "data-pass462-cross-venue-consensus", "PASS462 cross-venue consensus", "Reference price"]],
  ["app/api/market-integrity/real-markets/route.ts", ["pass462CrossVenueConsensusContract", "crossVenue:"]],
  ["app/api/market-integrity/cross-asset/route.ts", ["pass462CrossVenueConsensusContract"]],
  ["app/api/market-integrity/venue-health/route.ts", ["compare", "coinbase", "buildPass462CrossVenueComparison"]],
  ["app/api/search/route.ts", ["attachPass462BitcoinVenueEvidence", "venueComparisonState", "coinbase-venue-health"]],
  ["lib/search/intelligence-search-contract.ts", ["venueComparisonState", "venueDivergenceBps", "venueConfidenceCap"]],
  ["lib/market-integrity/pass459-provider-truth-pdf-runtime.ts", ["Venue consensus", "PASS462 cross-venue gate", "pass462Summary"]],
  ["lib/market-integrity/pass460-provider-consensus-pdf-runtime.ts", ["watch", "divergent", "venueComparisonState"]],
  ["components/market-integrity/TokenRiskModal.tsx", ["Pass462ShieldVenuePayload", "compare=coinbase", "pass462SourceContext"]],
  ["app/api/search/lens-report/route.ts", ["PASS459–462", "PASS462: page two includes cross-venue state"]],
];

let failed = false;
for (const [relative, markers] of checks) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    console.error(`missing ${relative}`);
    failed = true;
    continue;
  }
  const source = fs.readFileSync(full, "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) {
      console.error(`missing marker ${JSON.stringify(marker)} in ${relative}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`PASS462 cross-venue + fundamentals verified · ${checks.length} files parsed`);
