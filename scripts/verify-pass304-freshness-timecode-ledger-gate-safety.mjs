import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const errors = [];

const requiredFiles = [
  "lib/market-integrity/freshness-timecode-ledger-gate.ts",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "app/globals.css",
];

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Missing PASS304 file: ${file}`);
}

const moduleSource = read("lib/market-integrity/freshness-timecode-ledger-gate.ts");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const map = read("components/market-integrity/ShieldMapClient.tsx");
const css = read("app/globals.css");

for (const marker of [
  "PASS304_FRESHNESS_TIMECODE_LEDGER_GATE",
  "velmere_freshness_timecode_ledger_gate_v1_pass304",
  "buildFreshnessTimecodeLedgerGate",
  "Freshness Timecode Ledger",
  "orderbook_depth_timecode",
  "reserve_snapshot_timecode",
  "contract_control_timecode",
  "provenance_passport_timecode",
  "browser_replay_timecode",
  "customer_copy_timecode",
]) {
  if (!moduleSource.includes(marker)) errors.push(`freshness-timecode-ledger module missing marker: ${marker}`);
}

for (const [name, source, marker] of [
  ["Lens", lens, 'data-pass304-freshness-timecode-ledger="vlm-browser"'],
  ["Lens result receipt", lens, 'data-pass304-result-ledger="freshness-timecode-receipt"'],
  ["Shield terminal", shield, 'data-pass304-freshness-timecode-ledger="shield-terminal"'],
  ["Shield Map", map, 'data-pass304-freshness-timecode-ledger="shield-map"'],
]) {
  if (!source.includes(marker)) errors.push(`${name} missing PASS304 marker ${marker}`);
}

for (const [name, source] of [["Lens", lens], ["Shield", shield], ["ShieldMap", map]]) {
  if (!source.includes("buildFreshnessTimecodeLedgerGate")) errors.push(`${name} missing buildFreshnessTimecodeLedgerGate import/use`);
}

for (const marker of [
  ".shield-pass304-timecode-ledger",
  ".shield-pass304-timecode-ledger-sync",
  ".shield-pass304-result-ledger",
  "data-pass304-lane-state",
  "data-pass304-action-posture",
]) {
  if (!css.includes(marker)) errors.push(`CSS missing PASS304 marker: ${marker}`);
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
  "solvency guarantee",
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
  "buildLiveAdapterCircuitBreakerGate",
]) {
  if (!productSource.includes(marker.toLowerCase())) errors.push(`Required regression marker missing: ${marker}`);
}

if (errors.length) {
  console.error("PASS304 Freshness Timecode Ledger Gate failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS304 Freshness Timecode Ledger Gate passed.");
