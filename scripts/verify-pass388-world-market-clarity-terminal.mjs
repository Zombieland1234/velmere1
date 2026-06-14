import { readFileSync, existsSync } from "node:fs";

const checks = [
  ["lib/market-integrity/pass388-world-market-clarity-terminal.ts", "PASS388.world_market_clarity_terminal"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass388WorldMarketReadout"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass388-world-market-clarity-terminal"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass388WorldMarketClarityContract"],
  ["app/api/search/lens-report/route.ts", "PASS388 WORLD MARKET CLARITY TERMINAL"],
  ["app/api/search/lens-report/route.ts", "pass388-world-market-clarity"],
  ["components/security/SecurityTrustPage.tsx", "security-pass388-clarity-onepage"],
  ["app/[locale]/research-lab/page.tsx", "velmere-pass388-research-clarity"],
  ["app/globals.css", "PASS388 · world market clarity terminal"],
];

const missing = [];
for (const [file, marker] of checks) {
  if (!existsSync(file)) {
    missing.push(`${file} missing`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  if (!text.includes(marker)) missing.push(`${file} missing marker ${marker}`);
}
if (missing.length) {
  console.error(missing.join("\n"));
  process.exit(1);
}
console.log("PASS388 world market clarity terminal guard passed");
