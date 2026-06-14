import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const modulePath = "lib/market-integrity/source-governance-oath-gate.ts";
const lensPath = "components/search/VelmereIntelligenceSearchClient.tsx";
const shieldPath = "components/market-integrity/MarketIntegrityClient.tsx";
const mapPath = "components/market-integrity/ShieldMapClient.tsx";
const cssPath = "app/globals.css";
const packagePath = "package.json";

for (const file of [modulePath, lensPath, shieldPath, mapPath, cssPath, packagePath]) {
  if (!exists(file)) throw new Error(`Missing PASS308 required file: ${file}`);
}

const moduleFile = read(modulePath);
const lens = read(lensPath);
const shield = read(shieldPath);
const map = read(mapPath);
const css = read(cssPath);
const packageJson = read(packagePath);
const combined = [moduleFile, lens, shield, map, css].join("\n");

const requiredModuleTokens = [
  "PASS308_SOURCE_GOVERNANCE_OATH_GATE",
  "buildSourceGovernanceOathGate",
  "SourceGovernanceOathGate",
  "source_origin_oath",
  "freshness_oath",
  "selective_disclosure_oath",
  "credential_oath",
  "retention_oath",
  "customer_language_oath",
  "oath_operator_lock",
  "Source Governance Oath turns exchange-grade source freshness and luxury-grade provenance",
];

for (const token of requiredModuleTokens) {
  if (!moduleFile.includes(token)) throw new Error(`PASS308 module missing token: ${token}`);
}

const surfaceMarkers = [
  ["Lens", lens, 'data-pass308-source-governance-oath="vlm-browser"'],
  ["Lens result receipt", lens, 'data-pass308-result-oath="source-governance-receipt"'],
  ["Shield terminal", shield, 'data-pass308-source-governance-oath="shield-terminal"'],
  ["Shield Map", map, 'data-pass308-source-governance-oath="shield-map"'],
];

for (const [name, content, marker] of surfaceMarkers) {
  if (!content.includes(marker)) throw new Error(`PASS308 ${name} missing marker: ${marker}`);
}

const importTokens = [
  'buildSourceGovernanceOathGate } from "@/lib/market-integrity/source-governance-oath-gate"',
  "const sourceGovernanceOathGate = useMemo",
  "const investigatorSourceGovernanceOathGate = useMemo",
];

for (const token of importTokens) {
  if (!combined.includes(token)) throw new Error(`PASS308 integration missing token: ${token}`);
}

const cssTokens = [
  ".shield-pass308-governance-oath",
  ".shield-pass308-governance-oath-sync",
  ".shield-pass308-result-oath",
  ".shield-pass308-lane-grid",
  "shield-pass308-oath-drift",
];

for (const token of cssTokens) {
  if (!css.includes(token)) throw new Error(`PASS308 CSS missing token: ${token}`);
}

const forbidden = [
  /last chance/i,
  /buy signal/i,
  /sell signal/i,
  /risk[- ]?free/i,
  /100%\s*(secure|safe|guaranteed|profit)/i,
  /guaranteed\s+(profit|safety|solvency)/i,
];

for (const pattern of forbidden) {
  if (pattern.test(combined)) throw new Error(`PASS308 forbidden/dark-pattern wording matched: ${pattern}`);
}

if (combined.includes("buildLayoutStabilitySentinelGate(result, pdfForgeComposerGate, mode)")) {
  throw new Error("PASS308 regression: undefined mode layout sentinel call returned.");
}

if (!lens.includes("!selected") && !shield.includes("closeSearchSuggestionsForModal")) {
  throw new Error("PASS308 regression: search modal quarantine markers are missing.");
}

if (!packageJson.includes('"verify:pass308-source-governance-oath-gate"')) {
  throw new Error("PASS308 package script missing.");
}

if (!packageJson.includes("verify:pass308-source-governance-oath-gate")) {
  throw new Error("PASS308 not wired into package scripts.");
}

console.log("PASS308 Source Governance Oath Gate verified.");
