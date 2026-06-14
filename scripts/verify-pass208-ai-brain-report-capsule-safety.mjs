#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const pkg = JSON.parse(read("package.json"));
const preflight = read("scripts/vercel-preflight.mjs");
const map = read("lib/launch/master-build-areas.ts");
const delta = read("lib/launch/master-build-progress-delta-pass208.ts");
const ledger = read("docs/progress/PASS208_AI_BRAIN_REPORT_CAPSULE.md");
const master = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");

for (const needle of [
  "PASS208 marker",
  "reportCapsule",
  "data-vlm-report-capsule",
  "publicBrief",
  "internalMemo",
  "redactionRule",
  "exportGate",
  "PDF-ready after review",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal.tsx missing ${needle}`);
}

for (const needle of [
  "PASS208 · AI Brain report capsule",
  ".shield-vlm-report-capsule",
  ".shield-vlm-report-capsule-grid",
  "contain: paint",
  "max-width: 860px",
]) {
  if (!css.includes(needle)) errors.push(`app/globals.css missing ${needle}`);
}

for (const needle of [
  "D15",
  "D16",
  "D17",
  "D24",
  "M01",
  "M03",
  "M04",
  "M07",
  "PASS208 report capsule",
]) {
  if (!map.includes(needle)) errors.push(`master-build-areas missing ${needle}`);
}

for (const needle of [
  "velmerePass208ProgressDeltas",
  "Risk driver mapping",
  "Source confidence lanes",
  "Evidence Note",
  "Operator-only report fields",
  "Previous → Current → Change",
]) {
  if (!delta.includes(needle)) errors.push(`PASS208 delta missing ${needle}`);
}

if (!ledger.includes("PASS208") || !ledger.includes("AI Brain Report Capsule")) {
  errors.push("PASS208 ledger is missing the report capsule body");
}
if (!master.includes("PASS208 marker: AI Brain Report Capsule active")) {
  errors.push("Master build map missing PASS208 marker");
}

if (!pkg.scripts?.["verify:pass208-ai-brain-report-capsule"]) {
  errors.push("package.json missing verify:pass208-ai-brain-report-capsule script");
}
if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass208-ai-brain-report-capsule")) {
  errors.push("verify:shield-all does not include PASS208 guard");
}
if (!preflight.includes("verify-pass208-ai-brain-report-capsule-safety.mjs")) {
  errors.push("vercel-preflight missing PASS208 guard marker");
}

const forbidden = [
  "guaranteed profit",
  "risk-free",
  "safe investment",
  "scam confirmed",
  "enter seed phrase",
  "public sale is live",
];
const scoped = `${modal}\n${ledger}`.toLowerCase();
for (const term of forbidden) {
  if (scoped.includes(term)) errors.push(`forbidden wording found: ${term}`);
}

for (const phrase of ["certificate of safety", "security certificate", "binary PDF generator is complete"]) {
  if (modal.toLowerCase().includes(phrase)) errors.push(`overclaim wording in modal: ${phrase}`);
}

if (errors.length) {
  console.error(`PASS208 AI Brain report capsule safety failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS208 AI Brain report capsule safety OK");
