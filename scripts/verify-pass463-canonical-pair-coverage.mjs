import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["lib/market-integrity/pass463-canonical-pair-coverage.ts", [
    "PASS463_CANONICAL_PAIR_COVERAGE",
    "resolvePass463VenuePair",
    "assessPass463QuoteBasis",
    "preferredPass463SecondaryVenue",
    "fiat_stable_proxy",
    "supportedCanonicalAssets",
  ]],
  ["lib/market-integrity/pass461-venue-health-runtime.ts", [
    "assetSymbol",
    "pairResolutionState",
    "quoteCurrency",
    "`${venueId}:${target.assetSymbol}`",
    "resolvePass463VenuePair",
  ]],
  ["lib/market-integrity/pass462-cross-venue-consensus.ts", [
    "quoteBasisState",
    "quoteBasisPenalty",
    "directPriceComparable",
    "assessPass463QuoteBasis",
    "preferredPass463SecondaryVenue",
  ]],
  ["lib/market-integrity/pass458-provider-truth-router.ts", [
    "hydrateVenueEvidence",
    "pass463PairCoverage",
    "pass463CanonicalPairCoverageContract",
    "venueComparison",
  ]],
  ["app/api/market-integrity/venue-health/route.ts", [
    "assetSymbol",
    "pairCoverageContract",
    "preferredPass462SecondaryVenue",
  ]],
  ["app/api/market-integrity/real-markets/route.ts", [
    "pass463CanonicalPairCoverageContract",
    "pairCoverage:",
  ]],
  ["app/api/market-integrity/cross-asset/route.ts", [
    "pass463CanonicalPairCoverageContract",
  ]],
  ["app/api/search/route.ts", [
    "attachPass463VenueEvidence",
    "venueQuoteBasisState",
    "venuePairResolutionState",
    "pass463PairCoverage",
  ]],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
    "data-pass463-canonical-pair-coverage",
    "data-pass463-quote-basis",
    "Pair coverage",
    "Quote basis",
  ]],
  ["components/market-integrity/TokenRiskModal.tsx", [
    "normalizePass463AssetSymbol",
    "PASS463:",
    "quoteBasisPenalty",
    "pairResolutionState",
  ]],
  ["lib/search/intelligence-search-contract.ts", [
    "venueAssetSymbol",
    "venueQuoteBasisState",
    "venueQuoteBasisPenalty",
    "venuePairResolutionState",
  ]],
  ["lib/market-integrity/pass459-provider-truth-pdf-runtime.ts", [
    "PASS459–463",
    "PASS463 quote-basis gate",
    "Pair coverage state",
    "pass463Summary",
  ]],
  ["lib/market-integrity/pass460-provider-consensus-pdf-runtime.ts", [
    "venueEvidenceCap",
    "quoteBasisState",
    "PASS463 canonical pair coverage",
  ]],
  ["app/api/search/lens-report/route.ts", [
    "PASS459–463",
    "PASS463: page two adds canonical asset/pair coverage",
  ]],
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
console.log(`PASS463 canonical pair coverage verified · ${checks.length} files parsed`);
