import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const modulePath = "lib/market-integrity/ethical-signal-event-taxonomy-gate.ts";
const moduleText = read(modulePath);
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const map = read("components/market-integrity/ShieldMapClient.tsx");
const css = read("app/globals.css");
const packageJson = read("package.json");

const required = [
  ["module flag", moduleText, "PASS309_ETHICAL_SIGNAL_EVENT_TAXONOMY_GATE"],
  ["builder", moduleText, "buildEthicalSignalEventTaxonomyGate"],
  ["version", moduleText, "velmere_ethical_signal_event_taxonomy_gate_v1_pass309"],
  ["search event", moduleText, "shield.search.intent.minimal"],
  ["source event", moduleText, "shield.source.open.redacted"],
  ["proof event", moduleText, "shield.proof.escalation.receipt"],
  ["disclosure event", moduleText, "shield.disclosure.boundary.redacted"],
  ["retention event", moduleText, "shield.retention.expiry.timecode"],
  ["copy event", moduleText, "shield.customer.copy.safety"],
  ["lens marker", lens, 'data-pass309-ethical-signal-event-taxonomy="vlm-browser"'],
  ["lens receipt", lens, 'data-pass309-result-taxonomy="ethical-signal-event-receipt"'],
  ["shield marker", shield, 'data-pass309-ethical-signal-event-taxonomy="shield-terminal"'],
  ["map marker", map, 'data-pass309-ethical-signal-event-taxonomy="shield-map"'],
  ["css", css, "shield-pass309-event-taxonomy"],
  ["script", packageJson, "verify:pass309-ethical-signal-event-taxonomy-gate"],
];

const failures = required.filter(([label, text, needle]) => !text.includes(needle));
if (failures.length) {
  console.error("PASS309 verification failed:");
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
];
const scanned = [moduleText, lens, shield, map].join("\n").toLowerCase();
const bad = forbidden.filter((needle) => scanned.includes(needle));
if (bad.length) {
  console.error(`PASS309 dark-pattern wording found: ${bad.join(", ")}`);
  process.exit(1);
}

if (lens.includes("buildLayoutStabilitySentinelGate(result, pdfForgeComposerGate, mode)")) {
  console.error("PASS299 runtime regression: undefined mode call returned.");
  process.exit(1);
}

if (!packageJson.includes("verify:pass308-source-governance-oath-gate && npm run verify:pass309-ethical-signal-event-taxonomy-gate")) {
  console.error("PASS309 is not chained after PASS308 in verify:shield-all.");
  process.exit(1);
}

console.log("PASS309 Ethical Signal Event Taxonomy Gate verified.");
