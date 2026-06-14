import fs from "node:fs";

const required = [
  ["lib/market-integrity/pass379-live-provider-brain-contract.ts", "PASS379.live_provider_brain_contract"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass379-live-provider-brain"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass379MarketCoverageUniverse"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "pass379ProviderReadinessRails"],
  ["app/api/search/lens-report/route.ts", "PASS379 LIVE PROVIDER BRAIN"],
  ["app/api/search/lens-report/route.ts", "pass379-preview-download-parity"],
  ["components/security/SecurityTrustPage.tsx", "data-pass379-security-public-layers"],
  ["app/[locale]/research-lab/page.tsx", "data-pass379-research-live-provider-brain"],
  ["app/globals.css", "PASS379 live provider brain"],
];

const missing = required.filter(([file, marker]) => !fs.existsSync(file) || !fs.readFileSync(file, "utf8").includes(marker));
if (missing.length) {
  console.error("PASS379 verification failed:");
  for (const [file, marker] of missing) console.error(`- ${file}: missing ${marker}`);
  process.exit(1);
}
console.log("PASS379 live provider brain verification passed.");
