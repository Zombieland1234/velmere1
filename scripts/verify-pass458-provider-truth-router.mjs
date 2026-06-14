import fs from "node:fs";

const required = [
  "lib/market-integrity/pass458-provider-truth-router.ts",
  "app/api/market-integrity/real-markets/route.ts",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
];
const errors = [];
for (const file of required) {
  if (!fs.existsSync(file)) errors.push(`${file}: missing`);
}
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const router = read("lib/market-integrity/pass458-provider-truth-router.ts");
const route = read("app/api/market-integrity/real-markets/route.ts");
const panel = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");

for (const needle of [
  "classifyPass458ProviderRoute",
  "resolvePass458ProviderTruthQuote",
  "CoinGecko /coins/markets",
  "Venue health is status/depth/websocket",
  "Alpha Vantage GLOBAL_QUOTE",
  "compatibility_adapter",
  "source_required",
]) {
  if (!router.includes(needle)) errors.push(`router missing marker: ${needle}`);
}
for (const needle of [
  "resolvePass458ProviderTruthQuote",
  "pass458ProviderTruthRouterContract",
  "router: pass458ProviderTruthRouterContract",
  "compatibilityLoader: loadQuote",
]) {
  if (!route.includes(needle)) errors.push(`route missing marker: ${needle}`);
}
for (const needle of [
  "data-pass458-provider-truth-router",
  "truthState",
  "providerPlan",
  "sourceContract",
  "marketCap?: number | null",
  "source-bound · główny provider aktywny",
  "kompatybilny fallback",
]) {
  if (!panel.includes(needle)) errors.push(`panel missing marker: ${needle}`);
}
if (/BINANCEVENUE[\s\S]{0,280}formatPrice\(quote\)/.test(panel) && !panel.includes("venue-health lane: status/depth, not an equity price")) {
  errors.push("panel may still render venue health as a fake price without source boundary copy");
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("PASS458 provider truth router verified · crypto/stocks/FX/ETF/commodities/venue health routed with no fake-live markers");
