import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const gate = read("lib/market-integrity/operator-only-report-field-gate.ts");
const css = read("app/globals.css");
const pkg = JSON.parse(read("package.json"));

for (const needle of [
  "buildOperatorOnlyReportFieldGate",
  "operatorOnlyReportFieldGate",
  "data-pass290-operator-only-report-field-gate",
  "shield-pass290-disclosure-loom",
  "Private Disclosure Loom",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal missing PASS290 marker ${needle}`);
}

for (const needle of [
  "velmere_operator_only_report_field_gate_v1_pass290",
  "OperatorOnlyReportFieldGate",
  "Private Disclosure Loom",
  "customer-visible lines, redacted appendix fields and operator-only reasoning",
  "not a certificate, guarantee, legal opinion, safety verdict or investment recommendation",
]) {
  if (!gate.includes(needle)) errors.push(`operator-only-report-field-gate missing marker ${needle}`);
}

for (const needle of [
  "PASS290 — operator-only report field gate",
  ".shield-pass290-disclosure-loom",
  ".shield-pass290-disclosure-rail-grid",
  ".shield-pass290-disclosure-lanes",
  "data-pass290-report-field-class=\"blocked_raw\"",
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing PASS290 CSS marker ${needle}`);
}

if (!pkg.scripts?.["verify:pass290-operator-only-report-field-gate"]?.includes("verify-pass290-operator-only-report-field-gate-safety.mjs")) {
  errors.push("package.json missing verify:pass290-operator-only-report-field-gate script");
}

if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass290-operator-only-report-field-gate")) {
  errors.push("verify:shield-all missing PASS290 guard");
}

const forbidden = [
  "guaranteed profit",
  "buy signal",
  "sell signal",
  "risk-free",
  "scam confirmed",
  "fraud proven",
  "guaranteed safe",
  "investment recommendation",
];
const corpus = `${gate}\n${modal}`.toLowerCase();
for (const phrase of forbidden) {
  if (corpus.includes(phrase) && phrase !== "investment recommendation") {
    errors.push(`forbidden overclaim/dark-pattern phrase present: ${phrase}`);
  }
}

if (!gate.includes("No buy/sell prompts") || !gate.includes("Elite status is earned only by evidence separation")) {
  errors.push("PASS290 anti-FOMO/status boundary markers missing");
}

if (!modal.includes("downloadEvidenceManifest") || !modal.includes("downloadVelmereCybersecurityPdf")) {
  errors.push("download handlers should remain defined after PASS290 report field pass");
}

if (errors.length) {
  console.error("PASS290 operator-only report field gate failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS290 operator-only report field gate safety passed.");
