import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const errors = [];

const requiredFiles = [
  "lib/market-integrity/verifiable-source-credential-gate.ts",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "app/globals.css",
];

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Missing PASS306 file: ${file}`);
}

const moduleSource = read("lib/market-integrity/verifiable-source-credential-gate.ts");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const map = read("components/market-integrity/ShieldMapClient.tsx");
const css = read("app/globals.css");
const packageJson = read("package.json");

for (const marker of [
  "PASS306_VERIFIABLE_SOURCE_CREDENTIAL_GATE",
  "velmere_verifiable_source_credential_gate_v1_pass306",
  "buildVerifiableSourceCredentialGate",
  "Verifiable Source Credential",
  "issuer_identity_credential",
  "depth_snapshot_credential",
  "reserve_snapshot_credential",
  "provenance_passport_credential",
  "freshness_expiry_credential",
  "customer_disclosure_credential",
  "proofHashHint",
]) {
  if (!moduleSource.includes(marker)) errors.push(`verifiable-source credential module missing marker: ${marker}`);
}

for (const [name, source, marker] of [
  ["Lens", lens, 'data-pass306-verifiable-source-credential="vlm-browser"'],
  ["Lens result receipt", lens, 'data-pass306-result-credential="verifiable-source-receipt"'],
  ["Shield terminal", shield, 'data-pass306-verifiable-source-credential="shield-terminal"'],
  ["Shield Map", map, 'data-pass306-verifiable-source-credential="shield-map"'],
]) {
  if (!source.includes(marker)) errors.push(`${name} missing PASS306 marker ${marker}`);
}

for (const [name, source] of [["Lens", lens], ["Shield", shield], ["ShieldMap", map]]) {
  if (!source.includes("buildVerifiableSourceCredentialGate")) errors.push(`${name} missing buildVerifiableSourceCredentialGate import/use`);
  if (!source.includes("selectiveDisclosureVaultGate")) errors.push(`${name} missing PASS305 dependency marker`);
}

for (const marker of [
  ".shield-pass306-source-credential",
  ".shield-pass306-source-credential-sync",
  ".shield-pass306-result-credential",
  "data-pass306-lane-state",
  "data-pass306-action-posture",
]) {
  if (!css.includes(marker)) errors.push(`CSS missing PASS306 marker: ${marker}`);
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
  "buildSelectiveDisclosureVaultGate",
  "buildFreshnessTimecodeLedgerGate",
]) {
  if (!productSource.includes(marker.toLowerCase())) errors.push(`Required regression marker missing: ${marker}`);
}

if (!packageJson.includes('"verify:pass306-verifiable-source-credential-gate"')) {
  errors.push("package.json missing PASS306 verify script");
}

if (!packageJson.includes("verify:pass306-verifiable-source-credential-gate")) {
  errors.push("verify:shield-all missing PASS306 chain marker");
}

if (errors.length) {
  console.error("PASS306 Verifiable Source Credential Gate failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS306 Verifiable Source Credential Gate passed.");
