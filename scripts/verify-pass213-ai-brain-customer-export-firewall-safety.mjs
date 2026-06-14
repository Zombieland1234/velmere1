#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];

const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
const firewallSource = read("lib/market-integrity/vlm-brain-customer-export-firewall.ts");
const cssSource = read("app/globals.css");
const deltaSource = read("lib/launch/master-build-progress-delta-pass213.ts");
const progressSource = read("lib/launch/master-build-areas.ts");
const ledgerSource = read("docs/progress/PROJECT_PROGRESS_LEDGER.md");
const reportSource = read("docs/progress/PASS213_AI_BRAIN_CUSTOMER_EXPORT_FIREWALL.md");
const preflightSource = read("scripts/vercel-preflight.mjs");
const pkg = JSON.parse(read("package.json"));

for (const needle of [
  "buildVlmBrainCustomerExportFirewall",
  "selectedTileCustomerExportFirewall",
  "data-vlm-export-firewall=\"pass213\"",
  "PASS213 marker",
]) {
  if (!modalSource.includes(needle)) errors.push(`TokenRiskModal.tsx missing PASS213 marker ${needle}`);
}

for (const needle of [
  "VlmBrainCustomerExportFirewall",
  "vlm-brain-customer-export-firewall-v1-pass213",
  "customer_export_preview_gate",
  "debtMatrix",
  "evidenceCoverageScore",
  "redactionScore",
  "PASS213_VLM_BRAIN_CUSTOMER_EXPORT_FIREWALL_CONTRACT",
]) {
  if (!firewallSource.includes(needle)) errors.push(`vlm-brain-customer-export-firewall.ts missing ${needle}`);
}

for (const needle of [
  "PASS213 · AI Brain customer export firewall",
  ".shield-vlm-export-firewall",
  ".shield-vlm-export-firewall-debt",
  "contain: paint",
  "isolation: isolate",
]) {
  if (!cssSource.includes(needle)) errors.push(`globals.css missing PASS213 CSS marker ${needle}`);
}

for (const needle of [
  "velmerePass213ProgressDeltas",
  "Source freshness registry",
  "Report download route",
  "PASS213_AI_BRAIN_CUSTOMER_EXPORT_FIREWALL_DELTA",
]) {
  if (!deltaSource.includes(needle)) errors.push(`master-build-progress-delta-pass213.ts missing ${needle}`);
}

for (const needle of ["pass213AiBrainCustomerExportFirewall", "PASS213 marker"]) {
  if (!progressSource.includes(needle)) errors.push(`master-build-areas.ts missing ${needle}`);
}

if (!reportSource.includes("PASS213 — AI Brain Customer Export Firewall")) {
  errors.push("PASS213 report missing title marker");
}
if (!ledgerSource.includes("PASS213 — AI Brain Customer Export Firewall")) {
  errors.push("PROJECT_PROGRESS_LEDGER.md missing PASS213 ledger marker");
}
if (!pkg.scripts?.["verify:pass213-ai-brain-customer-export-firewall"]) {
  errors.push("package.json missing verify:pass213-ai-brain-customer-export-firewall script");
}
if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass213-ai-brain-customer-export-firewall")) {
  errors.push("verify:shield-all missing PASS213 guard");
}
if (!preflightSource.includes("verify-pass213-ai-brain-customer-export-firewall-safety.mjs")) {
  errors.push("vercel-preflight missing PASS213 guard marker");
}

const forbidden = [
  /guaranteed\s+profit/i,
  /safe\s+investment/i,
  /buy\s+signal/i,
  /sell\s+signal/i,
  /scam\s+confirmed/i,
  /fraud\s+proven/i,
  /enter\s+seed/i,
];
for (const [file, source] of Object.entries({ firewallSource, reportSource })) {
  for (const pattern of forbidden) {
    if (pattern.test(source)) errors.push(`${file} contains forbidden wording ${pattern}`);
  }
}

if (errors.length) {
  console.error("PASS213 AI Brain customer export firewall safety FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS213 AI Brain customer export firewall safety OK");
