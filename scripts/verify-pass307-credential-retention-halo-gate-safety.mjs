import fs from "node:fs";

const checks = [];
function read(path) {
  try {
    return fs.readFileSync(path, "utf8");
  } catch (error) {
    checks.push(`Missing file: ${path}`);
    return "";
  }
}

const moduleFile = read("lib/market-integrity/credential-retention-halo-gate.ts");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const map = read("components/market-integrity/ShieldMapClient.tsx");
const css = read("app/globals.css");
const packageJson = read("package.json");

const requiredModuleMarkers = [
  "PASS307_CREDENTIAL_RETENTION_HALO_GATE",
  "velmere_credential_retention_halo_gate_v1_pass307",
  "Credential Retention Halo",
  "buildCredentialRetentionHaloGate",
  "retentionScore",
  "purgeAfterSeconds",
  "replayRetentionSeconds",
  "data minimization",
  "No countdown persuasion.",
  "No trade action command.",
  "not financial advice",
  "not a safety certificate",
];

for (const marker of requiredModuleMarkers) {
  if (!moduleFile.includes(marker)) checks.push(`Module missing marker: ${marker}`);
}

const surfaceMarkers = [
  ["Lens", lens, 'data-pass307-credential-retention-halo="vlm-browser"'],
  ["Lens result receipt", lens, 'data-pass307-result-halo="credential-retention-receipt"'],
  ["Shield terminal", shield, 'data-pass307-credential-retention-halo="shield-terminal"'],
  ["Shield Map", map, 'data-pass307-credential-retention-halo="shield-map"'],
];

for (const [label, body, marker] of surfaceMarkers) {
  if (!body.includes(marker)) checks.push(`${label} missing marker: ${marker}`);
}

const cssMarkers = [
  ".shield-pass307-retention-halo",
  ".shield-pass307-retention-halo-sync",
  ".shield-pass307-result-halo",
  "data-pass307-lane-state",
  "data-pass307-action-posture",
];
for (const marker of cssMarkers) {
  if (!css.includes(marker)) checks.push(`CSS missing marker: ${marker}`);
}

const importMarkers = [
  ["Lens import", lens],
  ["Shield import", shield],
  ["Shield Map import", map],
];
for (const [label, body] of importMarkers) {
  if (!body.includes('buildCredentialRetentionHaloGate')) checks.push(`${label} missing buildCredentialRetentionHaloGate import/use`);
}

const forbiddenPatterns = [
  /last chance/i,
  /buy signal/i,
  /sell signal/i,
  /guaranteed profit/i,
  /risk[- ]?free/i,
  /100% secure/i,
  /safe investment/i,
  /financial advice/i,
  /safety certificate/i,
  /countdown/i,
];
for (const pattern of forbiddenPatterns) {
  if (pattern.test(moduleFile.replace(/not financial advice|not a safety certificate|No countdown persuasion\./gi, ""))) {
    checks.push(`Forbidden manipulation wording found in module: ${pattern}`);
  }
}

if (!packageJson.includes('"verify:pass307-credential-retention-halo-gate"')) {
  checks.push("package.json missing PASS307 script");
}
if (!packageJson.includes("verify:pass307-credential-retention-halo-gate")) {
  checks.push("verify:shield-all missing PASS307 script");
}

if (checks.length) {
  console.error("PASS307 Credential Retention Halo Gate failed:");
  for (const check of checks) console.error(`- ${check}`);
  process.exit(1);
}

console.log("PASS307 Credential Retention Halo Gate passed.");
