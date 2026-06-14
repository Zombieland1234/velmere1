import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const modulePath = "lib/market-integrity/audit-trail-covenant-gate.ts";
const moduleText = read(modulePath);
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const map = read("components/market-integrity/ShieldMapClient.tsx");
const css = read("app/globals.css");
const packageJson = read("package.json");

const required = [
  ["module flag", moduleText, "PASS311_AUDIT_TRAIL_COVENANT_GATE"],
  ["builder", moduleText, "buildAuditTrailCovenantGate"],
  ["version", moduleText, "velmere_audit_trail_covenant_gate_v1_pass311"],
  ["event origin lane", moduleText, "event_origin_receipt"],
  ["consent chain lane", moduleText, "consent_chain"],
  ["source timecode lane", moduleText, "source_timecode"],
  ["retention purge lane", moduleText, "retention_purge"],
  ["redacted export lane", moduleText, "redacted_export"],
  ["report replay lane", moduleText, "report_replay"],
  ["lens marker", lens, 'data-pass311-audit-trail-covenant="vlm-browser"'],
  ["lens result receipt", lens, 'data-pass311-result-covenant="audit-trail-covenant-receipt"'],
  ["shield marker", shield, 'data-pass311-audit-trail-covenant="shield-terminal"'],
  ["map marker", map, 'data-pass311-audit-trail-covenant="shield-map"'],
  ["css", css, "shield-pass311-audit-covenant"],
  ["script", packageJson, "verify:pass311-audit-trail-covenant-gate"],
];

const failures = required.filter(([label, text, needle]) => !text.includes(needle));
if (failures.length) {
  console.error("PASS311 verification failed:");
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
  console.error(`PASS311 dark-pattern wording found: ${bad.join(", ")}`);
  process.exit(1);
}

if (scanned.includes("buildlayoutstabilitysentinelgate(result, pdfforgecomposergate, mode)")) {
  console.error("PASS299 runtime regression: undefined mode call returned.");
  process.exit(1);
}

if (!shield.includes("const auditTrailCovenantGate = useMemo")) {
  console.error("Shield terminal PASS311 useMemo missing.");
  process.exit(1);
}
if (!map.includes("const investigatorAuditTrailCovenantGate = useMemo")) {
  console.error("Shield Map PASS311 useMemo missing.");
  process.exit(1);
}
if (!lens.includes("const auditTrailCovenantGate = useMemo")) {
  console.error("Lens PASS311 useMemo missing.");
  process.exit(1);
}

if (!packageJson.includes("verify:pass310-proof-consent-receipt-gate && npm run verify:pass311-audit-trail-covenant-gate")) {
  console.error("PASS311 is not chained after PASS310 in verify:shield-all.");
  process.exit(1);
}

console.log("PASS311 Audit Trail Covenant Gate verified.");
