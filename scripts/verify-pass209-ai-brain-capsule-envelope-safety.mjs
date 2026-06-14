#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const capsule = read("lib/market-integrity/vlm-brain-report-capsule.ts");
const pkg = JSON.parse(read("package.json"));
const preflight = read("scripts/vercel-preflight.mjs");
const map = read("lib/launch/master-build-areas.ts");
const delta = read("lib/launch/master-build-progress-delta-pass209.ts");
const ledger = read("docs/progress/PASS209_AI_BRAIN_CAPSULE_ENVELOPE.md");
const master = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");

for (const needle of [
  "buildVlmBrainReportCapsule",
  "selectedTileReportCapsuleEnvelope",
  "data-vlm-report-capsule-envelope",
  "capsuleId",
  "schemaVersion",
  "exportReadiness",
  "PASS209 marker: selected VLM Brain tile now builds a typed report capsule envelope",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal.tsx missing ${needle}`);
}

for (const needle of [
  "VlmBrainReportCapsuleEnvelope",
  "vlm-brain-report-capsule-v1-pass209",
  "tile_preview_only",
  "redactSensitive",
  "readinessFromInput",
  "PASS209_VLM_BRAIN_REPORT_CAPSULE_CONTRACT",
]) {
  if (!capsule.includes(needle)) errors.push(`vlm-brain-report-capsule.ts missing ${needle}`);
}

for (const needle of [
  "PASS209 · AI Brain report capsule envelope",
  ".shield-vlm-report-capsule-footer",
  "data-vlm-report-capsule-envelope",
]) {
  if (!css.includes(needle) && !modal.includes(needle)) errors.push(`PASS209 UI marker missing ${needle}`);
}

for (const needle of [
  "M05",
  "Redacted payload export",
  "PASS209 adds a first redaction envelope",
  "pass209AiBrainCapsuleEnvelope",
  "PASS209 marker: AI Brain report capsule now has a typed redacted envelope",
]) {
  if (!map.includes(needle)) errors.push(`master-build-areas missing ${needle}`);
}

for (const needle of [
  "velmerePass209ProgressDeltas",
  "Redacted payload export",
  "Previous → Current → Change",
]) {
  if (!delta.includes(needle)) errors.push(`PASS209 delta missing ${needle}`);
}

if (!ledger.includes("PASS209") || !ledger.includes("AI Brain Capsule Envelope")) {
  errors.push("PASS209 ledger missing capsule envelope body");
}
if (!master.includes("PASS209 marker: typed AI Brain capsule envelope")) {
  errors.push("Master build map missing PASS209 marker");
}
if (!pkg.scripts?.["verify:pass209-ai-brain-capsule-envelope"]) {
  errors.push("package.json missing verify:pass209-ai-brain-capsule-envelope script");
}
if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass209-ai-brain-capsule-envelope")) {
  errors.push("verify:shield-all does not include PASS209 guard");
}
if (!preflight.includes("verify-pass209-ai-brain-capsule-envelope-safety.mjs")) {
  errors.push("vercel-preflight missing PASS209 guard marker");
}

const scoped = `${modal}\n${ledger}\n${master}`.toLowerCase();
for (const term of ["guaranteed profit", "risk-free", "safe investment", "scam confirmed", "fraud proven", "enter seed phrase", "public sale is live"]) {
  if (scoped.includes(term)) errors.push(`forbidden public wording found: ${term}`);
}

if (errors.length) {
  console.error(`PASS209 AI Brain capsule envelope safety failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS209 AI Brain capsule envelope safety OK");
