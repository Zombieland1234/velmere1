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
const delta = read("lib/launch/master-build-progress-delta-pass207.ts");
const ledger = read("docs/progress/PASS207_AI_BRAIN_DECISION_DOCK.md");

for (const needle of [
  "PASS207 marker",
  "decisionDock",
  "data-vlm-decision-dock",
  "priorityValue",
  "confidenceLimitValue",
  "sourceModeValue",
  "reviewWindowValue",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal.tsx missing ${needle}`);
}

for (const needle of [
  ".shield-vlm-decision-dock",
  "grid-template-columns: repeat(4",
  "@media (max-width: 760px)",
]) {
  if (!css.includes(needle)) errors.push(`app/globals.css missing ${needle}`);
}

for (const needle of [
  "D15",
  "D16",
  "D17",
  "D23",
  "PASS207 decision dock",
]) {
  if (!map.includes(needle)) errors.push(`master-build-areas missing ${needle}`);
}

for (const needle of [
  "velmerePass207ProgressDeltas",
  "Tile decision dock",
  "Risk driver mapping",
  "Source confidence lanes",
  "Missing-data semantics",
  "Brain accessibility / keyboard flow",
]) {
  if (!delta.includes(needle)) errors.push(`PASS207 delta missing ${needle}`);
}

if (!ledger.includes("PASS207") || !ledger.includes("Decision Dock")) {
  errors.push("PASS207 ledger is missing the Decision Dock report body");
}

if (!pkg.scripts?.["verify:pass207-ai-brain-decision-dock"]) {
  errors.push("package.json missing verify:pass207-ai-brain-decision-dock script");
}
if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass207-ai-brain-decision-dock")) {
  errors.push("verify:shield-all does not include PASS207 guard");
}
if (!preflight.includes("verify-pass207-ai-brain-decision-dock-safety.mjs")) {
  errors.push("vercel-preflight missing PASS207 guard marker");
}

const forbidden = [
  "guaranteed profit",
  "risk-free",
  "safe investment",
  "scam confirmed",
  "enter seed phrase",
  "public sale is live",
];
for (const term of forbidden) {
  if (modal.toLowerCase().includes(term) || ledger.toLowerCase().includes(term)) {
    errors.push(`forbidden wording found: ${term}`);
  }
}

if (errors.length) {
  console.error(`PASS207 AI Brain decision dock safety failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS207 AI Brain decision dock safety OK");
