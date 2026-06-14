import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const errors = [];

const requiredFiles = [
  "lib/market-integrity/selective-disclosure-vault-gate.ts",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "app/globals.css",
];

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Missing PASS305 file: ${file}`);
}

const moduleSource = read("lib/market-integrity/selective-disclosure-vault-gate.ts");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const map = read("components/market-integrity/ShieldMapClient.tsx");
const css = read("app/globals.css");
const packageJson = read("package.json");

for (const marker of [
  "PASS305_SELECTIVE_DISCLOSURE_VAULT_GATE",
  "velmere_selective_disclosure_vault_gate_v1_pass305",
  "buildSelectiveDisclosureVaultGate",
  "Selective Disclosure Vault",
  "identity_disclosure_card",
  "depth_disclosure_card",
  "reserve_disclosure_card",
  "provenance_disclosure_card",
  "runtime_disclosure_card",
  "export_disclosure_card",
]) {
  if (!moduleSource.includes(marker)) errors.push(`selective-disclosure module missing marker: ${marker}`);
}

for (const [name, source, marker] of [
  ["Lens", lens, 'data-pass305-selective-disclosure-vault="vlm-browser"'],
  ["Lens result receipt", lens, 'data-pass305-result-vault="selective-disclosure-receipt"'],
  ["Shield terminal", shield, 'data-pass305-selective-disclosure-vault="shield-terminal"'],
  ["Shield Map", map, 'data-pass305-selective-disclosure-vault="shield-map"'],
]) {
  if (!source.includes(marker)) errors.push(`${name} missing PASS305 marker ${marker}`);
}

for (const [name, source] of [["Lens", lens], ["Shield", shield], ["ShieldMap", map]]) {
  if (!source.includes("buildSelectiveDisclosureVaultGate")) errors.push(`${name} missing buildSelectiveDisclosureVaultGate import/use`);
}

for (const marker of [
  ".shield-pass305-disclosure-vault",
  ".shield-pass305-disclosure-vault-sync",
  ".shield-pass305-result-vault",
  "data-pass305-lane-state",
  "data-pass305-action-posture",
]) {
  if (!css.includes(marker)) errors.push(`CSS missing PASS305 marker: ${marker}`);
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

for (const regression of [
  "buildlayoutstabilitysentinelgate(result, pdfforgecomposergate, mode)",
]) {
  if (productSource.includes(regression)) errors.push(`Runtime regression returned: ${regression}`);
}

for (const marker of [
  "closeSearchSuggestionsForModal",
  "closeInvestigatorSuggestions",
  "buildFreshnessTimecodeLedgerGate",
]) {
  if (!productSource.includes(marker.toLowerCase())) errors.push(`Required regression marker missing: ${marker}`);
}

if (!packageJson.includes('"verify:pass305-selective-disclosure-vault-gate"')) {
  errors.push("package.json missing PASS305 verify script");
}

if (!packageJson.includes("verify:pass305-selective-disclosure-vault-gate")) {
  errors.push("verify:shield-all missing PASS305 chain marker");
}

if (errors.length) {
  console.error("PASS305 Selective Disclosure Vault Gate failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS305 Selective Disclosure Vault Gate passed.");
