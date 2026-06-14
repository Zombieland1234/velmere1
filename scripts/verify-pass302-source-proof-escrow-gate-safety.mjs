import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const errors = [];

const requiredFiles = [
  "lib/market-integrity/source-proof-escrow-gate.ts",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "app/globals.css",
];

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Missing PASS302 file: ${file}`);
}

const moduleSource = read("lib/market-integrity/source-proof-escrow-gate.ts");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const map = read("components/market-integrity/ShieldMapClient.tsx");
const css = read("app/globals.css");

for (const marker of [
  "PASS302_SOURCE_PROOF_ESCROW_GATE",
  "velmere_source_proof_escrow_gate_v1_pass302",
  "buildSourceProofEscrowGate",
  "Source Proof Escrow",
  "exchange_depth",
  "reserve_snapshot",
  "contract_permissions",
  "provenance_passport",
  "redaction_boundary",
]) {
  if (!moduleSource.includes(marker)) errors.push(`source-proof-escrow module missing marker: ${marker}`);
}

for (const [name, source, marker] of [
  ["Lens", lens, 'data-pass302-source-proof-escrow="vlm-browser"'],
  ["Lens result receipt", lens, 'data-pass302-result-escrow="source-proof-escrow-receipt"'],
  ["Shield terminal", shield, 'data-pass302-source-proof-escrow="shield-terminal"'],
  ["Shield Map", map, 'data-pass302-source-proof-escrow="shield-map"'],
]) {
  if (!source.includes(marker)) errors.push(`${name} missing PASS302 marker ${marker}`);
}

for (const [name, source] of [["Lens", lens], ["Shield", shield], ["ShieldMap", map]]) {
  if (!source.includes("buildSourceProofEscrowGate")) errors.push(`${name} missing buildSourceProofEscrowGate import/use`);
}

for (const marker of [
  ".shield-pass302-proof-escrow",
  ".shield-pass302-proof-escrow-sync",
  ".shield-pass302-result-escrow",
  "data-pass302-lane-state",
  "data-pass302-action-posture",
]) {
  if (!css.includes(marker)) errors.push(`CSS missing PASS302 marker: ${marker}`);
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

if (lens.includes("buildLayoutStabilitySentinelGate(result, pdfForgeComposerGate, mode)") || shield.includes("buildLayoutStabilitySentinelGate(result, pdfForgeComposerGate, mode)")) {
  errors.push("PASS299 regression: undefined mode call returned");
}

if (errors.length) {
  console.error("PASS302 Source Proof Escrow Gate failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS302 Source Proof Escrow Gate passed.");
