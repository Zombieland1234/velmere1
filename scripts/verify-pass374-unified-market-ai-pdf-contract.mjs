import fs from "node:fs";

const checks = [
  ["lib/market-integrity/pass374-global-market-ai-contract.ts", "PASS374.provider_parity_all_assets"],
  ["lib/market-integrity/pass374-global-market-ai-contract.ts", "buildPass374BrainFieldDeck"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass374-ai-brain-field-deck"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass374RealMarketUniverse"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass374-real-market-one-to-one-shield"],
  ["app/api/search/lens-report/route.ts", "PASS374 adds the final unified output contract"],
  ["app/api/search/lens-report/route.ts", "pass374BrainDeck"],
  ["components/security/SecurityTrustPage.tsx", "data-pass374-security-plain-language"],
  ["app/globals.css", "PASS374 · Real Markets parity"],
];

const missing = checks.filter(([file, marker]) => !fs.readFileSync(file, "utf8").includes(marker));
if (missing.length) {
  console.error("PASS374 guard failed:");
  for (const [file, marker] of missing) console.error(`- ${file} missing ${marker}`);
  process.exit(1);
}

const contract = fs.readFileSync("lib/market-integrity/pass374-global-market-ai-contract.ts", "utf8");
const assetRows = (contract.match(/row\(\{/g) ?? []).length;
if (assetRows < 55) {
  console.error(`PASS374 guard failed: expected at least 55 new real-market rows, found ${assetRows}`);
  process.exit(1);
}

console.log(`PASS374 unified market AI/PDF contract guard passed with ${assetRows} new rows.`);
