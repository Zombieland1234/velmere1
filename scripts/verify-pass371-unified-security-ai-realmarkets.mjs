import { readFileSync, existsSync } from "node:fs";

const checks = [
  ["lib/market-integrity/pass371-global-real-market-catalog.ts", "pass371GlobalRealMarketCatalog"],
  ["lib/market-integrity/pass371-unified-security-ai-brain.ts", "pass371BrainPhases"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass371-global-market-catalog"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "real-markets-pass371-collection-bar"],
  ["app/api/search/lens-report/route.ts", "pass371-ai-brain-pipeline"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass371CoverageContract"],
  ["components/security/SecurityTrustPage.tsx", "data-pass371-security-human-story"],
  ["app/[locale]/research-lab/page.tsx", "data-pass371-prime-crypto-determinism-bridge"],
  ["app/globals.css", "PASS371 · Unified Security AI Brain"],
];

const root = process.cwd();
const missing = [];
for (const [file, marker] of checks) {
  const path = `${root}/${file}`;
  if (!existsSync(path)) {
    missing.push(`${file}: missing file`);
    continue;
  }
  const content = readFileSync(path, "utf8");
  if (!content.includes(marker)) missing.push(`${file}: missing marker ${marker}`);
}

const catalog = readFileSync(`${root}/lib/market-integrity/pass371-global-real-market-catalog.ts`, "utf8");
const rowCount = (catalog.match(/row\(\{/g) ?? []).length;
if (rowCount < 55) missing.push(`catalog too small: ${rowCount}`);

if (missing.length) {
  console.error("PASS371 guard failed:\n" + missing.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`PASS371 guard passed · catalog rows=${rowCount} · unified brain + PDF + security + research markers present.`);
