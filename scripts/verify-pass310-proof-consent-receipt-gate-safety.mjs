import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const modulePath = "lib/market-integrity/proof-consent-receipt-gate.ts";
const moduleText = read(modulePath);
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const map = read("components/market-integrity/ShieldMapClient.tsx");
const css = read("app/globals.css");
const packageJson = read("package.json");

const required = [
  ["module flag", moduleText, "PASS310_PROOF_CONSENT_RECEIPT_GATE"],
  ["builder", moduleText, "buildProofConsentReceiptGate"],
  ["version", moduleText, "velmere_proof_consent_receipt_gate_v1_pass310"],
  ["consent lane", moduleText, "consent_language"],
  ["source proof lane", moduleText, "source_proof"],
  ["disclosure lane", moduleText, "disclosure_scope"],
  ["expiry lane", moduleText, "credential_expiry"],
  ["retention lane", moduleText, "retention_boundary"],
  ["report copy lane", moduleText, "report_copy"],
  ["lens marker", lens, 'data-pass310-proof-consent-receipt="vlm-browser"'],
  ["lens result receipt", lens, 'data-pass310-result-consent="proof-consent-receipt"'],
  ["shield marker", shield, 'data-pass310-proof-consent-receipt="shield-terminal"'],
  ["map marker", map, 'data-pass310-proof-consent-receipt="shield-map"'],
  ["css", css, "shield-pass310-proof-consent"],
  ["script", packageJson, "verify:pass310-proof-consent-receipt-gate"],
];

const failures = required.filter(([label, text, needle]) => !text.includes(needle));
if (failures.length) {
  console.error("PASS310 verification failed:");
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
  console.error(`PASS310 dark-pattern wording found: ${bad.join(", ")}`);
  process.exit(1);
}

if (scanned.includes("buildlayoutstabilitysentinelgate(result, pdfforgecomposergate, mode)")) {
  console.error("PASS299 runtime regression: undefined mode call returned.");
  process.exit(1);
}

if (!shield.includes("const proofConsentReceiptGate = useMemo")) {
  console.error("Shield terminal PASS310 useMemo missing.");
  process.exit(1);
}
if (!map.includes("const investigatorProofConsentReceiptGate = useMemo")) {
  console.error("Shield Map PASS310 useMemo missing.");
  process.exit(1);
}
if (!lens.includes("const proofConsentReceiptGate = useMemo")) {
  console.error("Lens PASS310 useMemo missing.");
  process.exit(1);
}

if (!packageJson.includes("verify:pass309-ethical-signal-event-taxonomy-gate && npm run verify:pass310-proof-consent-receipt-gate")) {
  console.error("PASS310 is not chained after PASS309 in verify:shield-all.");
  process.exit(1);
}

console.log("PASS310 Proof Consent Receipt Gate verified.");
