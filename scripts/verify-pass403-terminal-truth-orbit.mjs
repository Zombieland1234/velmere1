import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "lib/market-integrity/pass403-terminal-truth-orbit.ts",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "app/api/search/lens-report/route.ts",
  "app/api/market-integrity/real-markets/catalog/route.ts",
  "app/globals.css",
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`Missing PASS403 file: ${rel}`);
}
const checks = [
  ["lib/market-integrity/pass403-terminal-truth-orbit.ts", "PASS403_RUNTIME_CLOSE_EVENT"],
  ["lib/market-integrity/pass403-terminal-truth-orbit.ts", "buildPass403MarketCoverageUniverse"],
  ["lib/market-integrity/pass403-terminal-truth-orbit.ts", "buildPass403TerminalTruthOrbitReadout"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass403-terminal-truth-orbit"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "buildPass403MarketCoverageUniverse"],
  ["components/market-integrity/MarketIntegrityClient.tsx", "PASS403_RUNTIME_CLOSE_EVENT"],
  ["components/market-integrity/ShieldMapClient.tsx", "PASS403_RUNTIME_CLOSE_EVENT"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "PASS403_RUNTIME_CLOSE_EVENT"],
  ["app/api/search/lens-report/route.ts", "PASS403 TERMINAL TRUTH ORBIT"],
  ["app/api/search/lens-report/route.ts", "page === 29"],
  ["app/api/market-integrity/real-markets/catalog/route.ts", "pass403TerminalTruthOrbit"],
  ["app/globals.css", "real-markets-pass403-truth-orbit"],
];
for (const [rel, marker] of checks) {
  const body = fs.readFileSync(path.join(root, rel), "utf8");
  if (!body.includes(marker)) throw new Error(`Missing marker ${marker} in ${rel}`);
}
const focusedFiles = [
  "lib/market-integrity/pass403-terminal-truth-orbit.ts",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "app/api/search/lens-report/route.ts",
  "app/api/market-integrity/real-markets/catalog/route.ts",
  "scripts/verify-pass403-terminal-truth-orbit.mjs",
];
let scanned = 0;
const blockers = [];
for (const rel of focusedFiles) {
  scanned += 1;
  const body = fs.readFileSync(path.join(root, rel), "utf8");
  if (/\b[A-Z]{3}\/[A-Z]{3}\s*:/.test(body)) blockers.push(`${rel} has possible unquoted FX key`);
  if (/page === 29[\s\S]{0,220}`[^`]*$/.test(body)) blockers.push(`${rel} possible broken PASS403 PDF template`);
  if (rel.endsWith("pass403-terminal-truth-orbit.ts") && (/\?\?[^\n;]+\|\|/.test(body) || /\|\|[^\n;]+\?\?/.test(body))) blockers.push(`${rel} mixes ?? with || on one line`);
}
if (blockers.length) throw new Error(`PASS403 targeted kernel sweep failed: ${blockers.join(" | ")}`);
console.log(`PASS403 terminal truth orbit guard passed. Targeted kernel sweep scanned ${scanned} changed code files.`);
