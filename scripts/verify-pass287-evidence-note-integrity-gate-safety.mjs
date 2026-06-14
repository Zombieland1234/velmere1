import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const gate = read("lib/market-integrity/evidence-note-integrity-gate.ts");
const css = read("app/globals.css");
const pkg = JSON.parse(read("package.json"));

for (const needle of [
  "buildEvidenceNoteIntegrityGate",
  "evidenceNoteIntegrityGate",
  "data-pass287-evidence-note-integrity-gate",
  "shield-pass287-evidence-note-integrity",
  "downloadEvidenceManifest = useCallback",
  "copyEvidenceManifest = useCallback",
  "resetEvidenceExportNotice",
  "evidenceExportNotice",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal missing PASS287/runtime marker ${needle}`);
}

for (const needle of [
  "velmere_evidence_note_integrity_gate_v1_pass287",
  "EvidenceNoteIntegrityGate",
  "Evidence Note Mirror",
  "Velvet Note Seal",
  "anti-FOMO",
  "source freshness gap must stay visible",
  "Raw query, wallet/IP context",
  "not a PDF, certificate, legal proof or financial recommendation",
]) {
  if (!gate.includes(needle)) errors.push(`evidence-note-integrity-gate missing marker ${needle}`);
}

for (const needle of [
  "PASS287 — Evidence Note Integrity Gate",
  ".shield-pass287-evidence-note-integrity",
  "data-pass287-evidence-note-line",
  "shield-pass287-evidence-note-integrity-velvet_note_ready",
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing PASS287 CSS marker ${needle}`);
}

if (!pkg.scripts?.["verify:pass287-evidence-note-integrity-gate"]?.includes("verify-pass287-evidence-note-integrity-gate-safety.mjs")) {
  errors.push("package.json missing verify:pass287-evidence-note-integrity-gate script");
}

if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass287-evidence-note-integrity-gate")) {
  errors.push("verify:shield-all missing PASS287 guard");
}

const forbidden = [
  "safe investment",
  "guaranteed profit",
  "buy signal",
  "sell signal",
  "risk-free",
  "scam confirmed",
  "fraud proven",
];
const corpus = `${gate}\n${modal}`.toLowerCase();
for (const phrase of forbidden) {
  if (corpus.includes(phrase)) errors.push(`forbidden overclaim/dark-pattern phrase present: ${phrase}`);
}

if (!modal.includes("navigator.clipboard?.writeText") || !modal.includes("URL.revokeObjectURL")) {
  errors.push("manifest actions are not browser-safe enough: missing clipboard fallback or URL cleanup");
}

if (errors.length) {
  console.error("PASS287 evidence note integrity gate failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS287 evidence note integrity gate passed.");
