import fs from "node:fs";

const checks = [
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass370-institutional-universe=\"true\""],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass370-ai-brain-readout=\"true\""],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass370InstitutionalRealMarketUniverse"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass370UnifiedAiBrainOutput"],
  ["lib/market-integrity/pass370-institutional-real-market-universe.ts", "pass370InstitutionalRealMarketUniverse"],
  ["lib/market-integrity/pass370-unified-ai-brain-output.ts", "MODE_LIMIT"],
  ["app/api/search/lens-report/route.ts", "PASS370 adds shared AI Brain output rows"],
  ["app/api/search/lens-report/route.ts", "pageStreams = [1, 2, 3, 4, 5, 6]"],
  ["app/api/search/lens-report/route.ts", "pass370-ai-brain-output"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "data-pass370-shared-pdf-brain-output=\"true\""],
  ["components/security/SecurityTrustPage.tsx", "data-pass370-simple-security-story=\"true\""],
  ["app/globals.css", "PASS370 · institutional real markets"],
];

const failures = [];
for (const [file, marker] of checks) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(marker)) failures.push(`${file} missing ${marker}`);
}

const forbidden = [
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "chartStatusLabel"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "timeframe is not defined"],
];
for (const [file, marker] of forbidden) {
  const text = fs.readFileSync(file, "utf8");
  if (text.includes(marker)) failures.push(`${file} still contains forbidden marker ${marker}`);
}

if (failures.length) {
  console.error("PASS370 verification failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log("PASS370 institutional AI parity verification passed.");
