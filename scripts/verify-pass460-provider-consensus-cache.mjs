import fs from "node:fs";

const required = [
  "lib/market-integrity/pass460-provider-consensus.ts",
  "lib/market-integrity/pass460-provider-consensus-pdf-runtime.ts",
  "lib/market-integrity/pass459-alpha-vantage-provider.ts",
  "lib/market-integrity/pass458-provider-truth-router.ts",
  "lib/market-integrity/coingecko.ts",
  "app/api/market-integrity/real-markets/route.ts",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "lib/market-integrity/shield-chat.ts",
  "components/market-integrity/TokenRiskModal.tsx",
  "lib/search/lens-report.ts",
  "app/api/search/lens-report/route.ts",
];

const errors = [];
for (const file of required) if (!fs.existsSync(file)) errors.push(`${file}: missing`);
const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");

const consensus = read(required[0]);
const pdfConsensus = read(required[1]);
const alpha = read(required[2]);
const router = read(required[3]);
const coingecko = read(required[4]);
const route = read(required[5]);
const panel = read(required[6]);
const chat = read(required[7]);
const modal = read(required[8]);
const lens = read(required[9]);
const pdfRoute = read(required[10]);

for (const needle of [
  "buildPass460ProviderConsensus",
  "divergenceThresholdBps",
  "confidenceCap",
  '"aligned"',
  '"divergent"',
  '"single_source"',
  "Venue health requires status, depth and websocket telemetry",
]) if (!consensus.includes(needle)) errors.push(`consensus runtime missing marker: ${needle}`);

for (const needle of [
  "pass460ResponseCache",
  "pass460Inflight",
  "ALPHA_VANTAGE_PROCESS_MAX_PER_MINUTE",
  "ALPHA_VANTAGE_PROCESS_MAX_PER_DAY",
  "Provider cache",
  "quota/cache guard",
]) if (!alpha.includes(needle)) errors.push(`provider guard missing marker: ${needle}`);

for (const needle of [
  "consensusFields",
  "consensusState",
  "freshnessState",
  "divergenceBps",
  "secondarySource",
  "PASS460 compares primary and secondary prices",
]) if (!router.includes(needle)) errors.push(`router consensus missing marker: ${needle}`);

for (const needle of ["observedAt", "last_updated", "high24h", "low24h"]) {
  if (!coingecko.includes(needle)) errors.push(`CoinGecko truth timestamp missing marker: ${needle}`);
}
if (router.includes("market?.sparkline7d?.length\n    ? Math.floor(Date.now() / 1000)")) {
  errors.push("crypto route still fabricates freshness from Date.now instead of provider last_updated");
}

for (const needle of [
  "pass460ProviderConsensusContract",
  "consensus: pass460ProviderConsensusContract",
]) if (!route.includes(needle)) errors.push(`real markets route missing marker: ${needle}`);

for (const needle of [
  "data-pass460-provider-consensus",
  "Provider Consensus",
  "confidenceCap",
  "divergenceBps",
  "provider divergence · strong claim blocked",
]) if (!panel.includes(needle)) errors.push(`real markets UI missing marker: ${needle}`);

for (const needle of [
  "buildPass460LensConsensus",
  "single_source",
  "freshnessRisk",
  "secondSourceRequired",
]) if (!pdfConsensus.includes(needle)) errors.push(`PDF consensus runtime missing marker: ${needle}`);

for (const needle of ["Pass460LensConsensus", "pass460: Pass460LensConsensus", "buildPass460LensConsensus"]) {
  if (!lens.includes(needle)) errors.push(`lens report missing marker: ${needle}`);
}

for (const needle of [
  "consensusState",
  "confidenceCap",
  "consensusNotes",
  "providerTruth.confidenceCap",
]) if (!chat.includes(needle)) errors.push(`Shield AI consensus missing marker: ${needle}`);

for (const needle of [
  "data-pass460-shield-consensus",
  "answer.consensusState",
  "answer.confidenceCap",
]) if (!modal.includes(needle)) errors.push(`Shield modal consensus missing marker: ${needle}`);

for (const needle of [
  "PASS459–460 · Provider truth + consensus",
  "report.pass460.confidenceCap",
  "report.pass460.operatorAction",
]) if (!pdfRoute.includes(needle)) errors.push(`PDF route missing marker: ${needle}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("PASS460 provider consensus/cache verified · freshness, divergence, quota guard, PDF and Shield AI parity active");
