import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const errors = [];

const requiredFiles = [
  "lib/market-integrity/live-adapter-circuit-breaker-gate.ts",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "app/globals.css",
];

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Missing PASS303 file: ${file}`);
}

const moduleSource = read("lib/market-integrity/live-adapter-circuit-breaker-gate.ts");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const map = read("components/market-integrity/ShieldMapClient.tsx");
const css = read("app/globals.css");

for (const marker of [
  "PASS303_LIVE_ADAPTER_CIRCUIT_BREAKER_GATE",
  "velmere_live_adapter_circuit_breaker_gate_v1_pass303",
  "buildLiveAdapterCircuitBreakerGate",
  "Live Adapter Circuit Breaker",
  "websocket_depth",
  "rest_depth_snapshot",
  "reserve_proof_snapshot",
  "provenance_passport",
  "runtime_fault_quarantine",
  "report_export_boundary",
]) {
  if (!moduleSource.includes(marker)) errors.push(`live-adapter-circuit-breaker module missing marker: ${marker}`);
}

for (const [name, source, marker] of [
  ["Lens", lens, 'data-pass303-live-adapter-circuit-breaker="vlm-browser"'],
  ["Lens result receipt", lens, 'data-pass303-result-circuit="live-adapter-circuit-breaker-receipt"'],
  ["Shield terminal", shield, 'data-pass303-live-adapter-circuit-breaker="shield-terminal"'],
  ["Shield Map", map, 'data-pass303-live-adapter-circuit-breaker="shield-map"'],
]) {
  if (!source.includes(marker)) errors.push(`${name} missing PASS303 marker ${marker}`);
}

for (const [name, source] of [["Lens", lens], ["Shield", shield], ["ShieldMap", map]]) {
  if (!source.includes("buildLiveAdapterCircuitBreakerGate")) errors.push(`${name} missing buildLiveAdapterCircuitBreakerGate import/use`);
}

for (const marker of [
  ".shield-pass303-circuit-breaker",
  ".shield-pass303-circuit-breaker-sync",
  ".shield-pass303-result-circuit",
  "data-pass303-lane-state",
  "data-pass303-action-posture",
]) {
  if (!css.includes(marker)) errors.push(`CSS missing PASS303 marker: ${marker}`);
}

const productSource = [moduleSource, lens, shield, map].join("\n").toLowerCase();
for (const forbidden of [
  "guaranteed profit",
  "risk-free",
  "safe investment",
  "buy signal",
  "sell signal",
  "scam confirmed",
  "fraud proven",
  "enter seed phrase",
  "100% secure",
  "last chance",
]) {
  if (productSource.includes(forbidden)) errors.push(`Forbidden product wording found: ${forbidden}`);
}

if (productSource.includes("buildlayoutstabilitysentinelgate(result, pdfforgecomposergate, mode)")) {
  errors.push("PASS299 regression: undefined mode call returned");
}

for (const marker of [
  "closeSearchSuggestionsForModal",
  "closeInvestigatorSuggestions",
]) {
  if (!productSource.includes(marker.toLowerCase())) errors.push(`PASS299 search quarantine marker missing: ${marker}`);
}

if (errors.length) {
  console.error("PASS303 Live Adapter Circuit Breaker Gate failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS303 Live Adapter Circuit Breaker Gate passed.");
