import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const modulePath = "lib/market-integrity/atelier-access-runway-gate.ts";
const moduleText = read(modulePath);
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const map = read("components/market-integrity/ShieldMapClient.tsx");
const css = read("app/globals.css");
const packageJson = read("package.json");

const required = [
  ["module flag", moduleText, "PASS313_ATELIER_ACCESS_RUNWAY_GATE"],
  ["builder", moduleText, "buildAtelierAccessRunwayGate"],
  ["version", moduleText, "velmere_atelier_access_runway_gate_v1_pass313"],
  ["live epoch lane", moduleText, "live_epoch_ticket"],
  ["passport lane", moduleText, "passport_status_lane"],
  ["proof compass lane", moduleText, "proof_compass_lane"],
  ["consent lane", moduleText, "consent_entry_lane"],
  ["audit lane", moduleText, "audit_receipt_lane"],
  ["scarcity firewall lane", moduleText, "scarcity_firewall_lane"],
  ["24h live epoch", moduleText, "liveEpochHours = 24 as const"],
  ["lens marker", lens, 'data-pass313-atelier-access-runway="vlm-browser"'],
  ["lens result", lens, 'data-pass313-result-runway="atelier-access-runway-receipt"'],
  ["shield marker", shield, 'data-pass313-atelier-access-runway="shield-terminal"'],
  ["map marker", map, 'data-pass313-atelier-access-runway="shield-map"'],
  ["css", css, "shield-pass313-access-runway"],
  ["script", packageJson, "verify:pass313-atelier-access-runway-gate"],
];

const failures = required.filter(([label, text, needle]) => !text.includes(needle));
if (failures.length) {
  console.error("PASS313 verification failed:");
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
  "pump now",
  "moonshot guaranteed",
];
const scanned = [moduleText, lens, shield, map].join("\n").toLowerCase();
const bad = forbidden.filter((needle) => scanned.includes(needle));
if (bad.length) {
  console.error(`PASS313 dark-pattern wording found: ${bad.join(", ")}`);
  process.exit(1);
}

if (!lens.includes("const atelierAccessRunwayGate = useMemo")) {
  console.error("Lens PASS313 useMemo missing.");
  process.exit(1);
}
if (!shield.includes("const atelierAccessRunwayGate = useMemo")) {
  console.error("Shield terminal PASS313 useMemo missing.");
  process.exit(1);
}
if (!map.includes("const investigatorAtelierAccessRunwayGate = useMemo")) {
  console.error("Shield Map PASS313 useMemo missing.");
  process.exit(1);
}

if (!packageJson.includes("verify:pass312-prestige-proof-compass-gate && npm run verify:pass313-atelier-access-runway-gate")) {
  console.error("PASS313 is not chained after PASS312 in verify:shield-all.");
  process.exit(1);
}

console.log("PASS313 Atelier Access Runway Gate verified.");
