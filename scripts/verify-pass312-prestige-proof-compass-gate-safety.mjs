import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const modulePath = "lib/market-integrity/prestige-proof-compass-gate.ts";
const moduleText = read(modulePath);
const auditModule = read("lib/market-integrity/audit-trail-covenant-gate.ts");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const map = read("components/market-integrity/ShieldMapClient.tsx");
const css = read("app/globals.css");
const packageJson = read("package.json");

const required = [
  ["module flag", moduleText, "PASS312_PRESTIGE_PROOF_COMPASS_GATE"],
  ["builder", moduleText, "buildPrestigeProofCompassGate"],
  ["version", moduleText, "velmere_prestige_proof_compass_gate_v1_pass312"],
  ["exchange lane", moduleText, "exchange_live_window"],
  ["reserve lane", moduleText, "reserve_wallet_snapshot"],
  ["passport lane", moduleText, "passport_provenance"],
  ["credential lane", moduleText, "credential_status"],
  ["audit lane", moduleText, "audit_covenant"],
  ["anti fomo lane", moduleText, "anti_fomo_status_gate"],
  ["24h live window", moduleText, "sourceExpiryHours = 24 as const"],
  ["lens marker", lens, 'data-pass312-prestige-proof-compass="vlm-browser"'],
  ["lens result", lens, 'data-pass312-result-compass="prestige-proof-compass-receipt"'],
  ["shield marker", shield, 'data-pass312-prestige-proof-compass="shield-terminal"'],
  ["map marker", map, 'data-pass312-prestige-proof-compass="shield-map"'],
  ["css", css, "shield-pass312-prestige-compass"],
  ["script", packageJson, "verify:pass312-prestige-proof-compass-gate"],
];

const failures = required.filter(([label, text, needle]) => !text.includes(needle));
if (failures.length) {
  console.error("PASS312 verification failed:");
  for (const [label, , needle] of failures) console.error(`- ${label}: missing ${needle}`);
  process.exit(1);
}

const forbidden = [
  "last chance",
  "act now",
  "buy signal",
  "sell signal",
  "guaranteed profit",
  "risk-free",
  "100% secure",
  "no risk",
  "get rich",
  "limited slots",
];
const scanned = [moduleText, lens, shield, map].join("\n").toLowerCase();
const bad = forbidden.filter((needle) => scanned.includes(needle));
if (bad.length) {
  console.error(`PASS312 dark-pattern wording found: ${bad.join(", ")}`);
  process.exit(1);
}

if ((auditModule.match(/headline: headlineFor\(covenantState\)/g) ?? []).length !== 1) {
  console.error("PASS312 inherited fix failed: PASS311 duplicate headline key still exists.");
  process.exit(1);
}

if (!lens.includes("const prestigeProofCompassGate = useMemo")) {
  console.error("Lens PASS312 useMemo missing.");
  process.exit(1);
}
if (!shield.includes("const prestigeProofCompassGate = useMemo")) {
  console.error("Shield terminal PASS312 useMemo missing.");
  process.exit(1);
}
if (!map.includes("const investigatorPrestigeProofCompassGate = useMemo")) {
  console.error("Shield Map PASS312 useMemo missing.");
  process.exit(1);
}

if (!packageJson.includes("verify:pass311-audit-trail-covenant-gate && npm run verify:pass312-prestige-proof-compass-gate")) {
  console.error("PASS312 is not chained after PASS311 in verify:shield-all.");
  process.exit(1);
}

console.log("PASS312 Prestige Proof Compass Gate verified.");
