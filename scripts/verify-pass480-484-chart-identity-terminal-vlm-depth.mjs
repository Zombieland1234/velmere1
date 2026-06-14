import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];

function expect(file, markers) {
  const source = read(file);
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${file}: missing ${marker}`);
  }
}
function reject(file, markers) {
  const source = read(file);
  for (const marker of markers) {
    if (source.includes(marker)) failures.push(`${file}: forbidden ${marker}`);
  }
}

expect("components/market-integrity/AdvancedMarketChart.tsx", [
  'data-pass480-unified-chart-runtime="pan-pinch-wheel-keyboard"',
  'data-chart-source-policy="source-candles-only"',
  "pointersRef",
  "pinchRef",
  "setZoom",
  "onKeyDown",
  "source?: string",
]);
reject("components/market-integrity/AdvancedMarketChart.tsx", [
  "Math.random",
  "generateCandles",
  "syntheticCandles",
]);

expect("lib/market-integrity/pass481-asset-identity-registry.ts", [
  "PASS481_ASSET_IDENTITIES",
  'symbol: "BTC"',
  'symbol: "AAPL"',
  'symbol: "MC.PA"',
  'symbol: "EUR/USD"',
  'symbol: "GC"',
  'symbol: "BINANCE"',
  'symbol: "MEXC"',
  'symbol: "VLM"',
  'return fallback || "MKT"',
]);
expect("lib/market-integrity/asset-logo-resolver.ts", [
  "resolvePass481Identity",
  "resolvePass481Glyph",
  "resolvePass481ExchangeBrand",
  "PASS476 compatibility coverage",
]);
reject("lib/market-integrity/asset-logo-resolver.ts", ['glyph || "?"', '?? "?"']);

expect("lib/market-integrity/pass482-real-markets-terminal.ts", [
  "PASS482_OVERVIEW_SYMBOLS",
  "buildPass482TerminalOverview",
  "scorePass482Search",
  '"BTC"',
  '"BINANCE"',
  '"AAPL"',
  '"S&P 500"',
  '"EUR/USD"',
  '"GC"',
  '"SPY"',
  '"VNQ"',
]);
expect("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  'data-pass482-cross-asset-terminal="stable-catalog-search-separate"',
  'data-pass482-overview-universe="crypto-exchanges-equities-indices-fx-etf-commodities-reit"',
  "buildPass482TerminalOverview(allAssets)",
  "scorePass482Search(asset, clean)",
  "symbol={selected.symbol}",
  "range={range}",
  "getPass484AnalysisDepthManifest",
]);
reject("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  '.filter((asset) => asset.category !== "crypto")',
  '.filter((item) => item !== "crypto")',
]);

expect("components/vlm/VlmSourceBoundMarketPanel.tsx", [
  'data-pass483-vlm-source-bound-chart="true"',
  'encodeURIComponent("VLM-USD")',
  "AdvancedMarketChart",
  "No fake-live",
  "Velmère nie generuje świec",
]);
expect("components/vlm/VlmModeSwitch.tsx", [
  "VlmSourceBoundMarketPanel",
  "<VlmSourceBoundMarketPanel mode={mode} />",
]);
reject("components/vlm/VlmModeSwitch.tsx", [
  "analytics placeholder",
  ">Pending<",
  'd="M46 250 C138',
]);

expect("lib/market-integrity/pass484-analysis-depth-manifest.ts", [
  "getPass484AnalysisDepthManifest",
  "fieldBudget: 10",
  "fieldBudget: 14",
  "fieldBudget: 20",
  "price forecasts",
  "unsourced values",
]);
expect("components/market-integrity/VlmNeuralAuditExperience.tsx", [
  "getPass484AnalysisDepthManifest",
  'data-pass484-analysis-depth-manifest="true"',
  "depthManifest.includes",
  "depthManifest.excludes",
  "depthManifest.confidenceRule",
]);

if (failures.length) {
  console.error(`PASS480–484 verifier failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PASS480–484 chart / identity / terminal / VLM / depth verifier OK");
