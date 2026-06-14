#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];

const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
const queueSource = read("lib/market-integrity/vlm-brain-operator-action-queue.ts");
const cssSource = read("app/globals.css");
const deltaSource = read("lib/launch/master-build-progress-delta-pass211.ts");
const progressSource = read("lib/launch/master-build-areas.ts");
const reportSource = read("docs/progress/PASS211_AI_BRAIN_OPERATOR_ACTION_QUEUE.md");
const preflightSource = read("scripts/vercel-preflight.mjs");
const pkg = JSON.parse(read("package.json"));

for (const needle of [
  "buildVlmBrainOperatorActionQueue",
  "selectedTileOperatorActionQueue",
  "data-vlm-operator-action-queue",
  "PASS211 marker",
]) {
  if (!modalSource.includes(needle)) errors.push(`TokenRiskModal.tsx missing PASS211 marker ${needle}`);
}

for (const needle of [
  "VlmBrainOperatorActionQueue",
  "vlm-brain-operator-action-queue-v1-pass211",
  "operator_case_preview",
  "blocked_by_sources",
  "PASS211_VLM_BRAIN_OPERATOR_ACTION_QUEUE_CONTRACT",
]) {
  if (!queueSource.includes(needle)) errors.push(`vlm-brain-operator-action-queue.ts missing ${needle}`);
}

for (const needle of [
  "PASS211 · AI Brain operator action queue",
  ".shield-vlm-operator-action-queue",
  ".shield-vlm-operator-action-list",
  "contain: paint",
]) {
  if (!cssSource.includes(needle)) errors.push(`globals.css missing PASS211 CSS marker ${needle}`);
}

for (const needle of [
  "velmerePass211ProgressDeltas",
  "Operator cases",
  "Operator-only report fields",
  "PASS211_AI_BRAIN_OPERATOR_ACTION_QUEUE_DELTA",
]) {
  if (!deltaSource.includes(needle)) errors.push(`master-build-progress-delta-pass211.ts missing ${needle}`);
}

for (const needle of ["pass211AiBrainOperatorActionQueue", "PASS211 marker"]) {
  if (!progressSource.includes(needle)) errors.push(`master-build-areas.ts missing ${needle}`);
}

if (!reportSource.includes("PASS211 — AI Brain Operator Action Queue")) {
  errors.push("PASS211 report missing title marker");
}
if (!pkg.scripts?.["verify:pass211-ai-brain-operator-action-queue"]) {
  errors.push("package.json missing verify:pass211-ai-brain-operator-action-queue script");
}
if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass211-ai-brain-operator-action-queue")) {
  errors.push("verify:shield-all missing PASS211 guard");
}
if (!preflightSource.includes("verify-pass211-ai-brain-operator-action-queue-safety.mjs")) {
  errors.push("vercel-preflight missing PASS211 guard marker");
}

const forbidden = [
  /guaranteed\s+profit/i,
  /safe\s+investment/i,
  /buy\s+signal/i,
  /sell\s+signal/i,
  /scam\s+confirmed/i,
  /seed\s+phrase/i,
  /private\s+key/i,
];
for (const [file, source] of Object.entries({ queueSource, reportSource })) {
  for (const pattern of forbidden) {
    if (pattern.test(source)) errors.push(`${file} contains forbidden wording ${pattern}`);
  }
}

if (errors.length) {
  console.error("PASS211 AI Brain operator action queue safety FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS211 AI Brain operator action queue safety OK");
