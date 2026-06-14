#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const handoff = read("lib/market-integrity/vlm-brain-capsule-handoff.ts");
const map = read("lib/launch/master-build-areas.ts");
const delta = read("lib/launch/master-build-progress-delta-pass210.ts");
const ledger = read("docs/progress/PASS210_AI_BRAIN_CAPSULE_HANDOFF.md");
const master = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const pkg = JSON.parse(read("package.json"));
const preflight = read("scripts/vercel-preflight.mjs");

for (const needle of [
  "buildVlmBrainCapsuleHandoff",
  "selectedTileReportCapsuleHandoff",
  "selectedTileReportHandoffLabels",
  "data-vlm-capsule-handoff",
  "PASS210 marker: selected VLM Brain tile builds a report handoff",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal.tsx missing ${needle}`);
}

for (const needle of [
  "VlmBrainCapsuleHandoff",
  "vlm-brain-capsule-handoff-v1-pass210",
  "report_bridge_preview",
  "client_preview_only",
  "operator_review_required",
  "freshnessState",
  "buildBlockers",
  "PASS210_VLM_BRAIN_CAPSULE_HANDOFF_CONTRACT",
]) {
  if (!handoff.includes(needle)) errors.push(`vlm-brain-capsule-handoff.ts missing ${needle}`);
}

for (const needle of [
  "PASS210 · AI Brain report capsule handoff bridge",
  ".shield-vlm-report-handoff",
  ".shield-vlm-report-handoff-grid",
]) {
  if (!css.includes(needle)) errors.push(`app/globals.css missing ${needle}`);
}

for (const needle of [
  "pass210AiBrainCapsuleHandoff",
  "Source freshness registry",
  "PASS210 adds a capsule-level freshness handoff",
  "PASS210 marker: AI Brain capsule handoff bridge",
]) {
  if (!map.includes(needle)) errors.push(`master-build-areas.ts missing ${needle}`);
}

for (const needle of [
  "velmerePass210ProgressDeltas",
  "Source freshness registry",
  "PASS210_AI_BRAIN_CAPSULE_HANDOFF_DELTA",
]) {
  if (!delta.includes(needle)) errors.push(`PASS210 delta missing ${needle}`);
}

if (!ledger.includes("PASS210") || !ledger.includes("AI Brain Capsule Handoff Bridge")) errors.push("PASS210 ledger missing handoff title");
if (!master.includes("PASS210 marker: capsule handoff bridge")) errors.push("Master build map missing PASS210 marker");
if (!pkg.scripts?.["verify:pass210-ai-brain-capsule-handoff"]) errors.push("package.json missing PASS210 script");
if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass210-ai-brain-capsule-handoff")) errors.push("verify:shield-all missing PASS210 guard");
if (!preflight.includes("verify-pass210-ai-brain-capsule-handoff-safety.mjs")) errors.push("vercel-preflight missing PASS210 guard marker");

const publicScope = `${modal}\n${ledger}\n${master}`.toLowerCase();
for (const term of ["guaranteed profit", "risk-free", "safe investment", "scam confirmed", "fraud proven", "enter seed phrase", "public sale is live"]) {
  if (publicScope.includes(term)) errors.push(`forbidden public wording found: ${term}`);
}

if (handoff.includes("localStorage") || handoff.includes("window.")) {
  errors.push("handoff contract must not use browser storage APIs");
}

if (errors.length) {
  console.error(`PASS210 AI Brain capsule handoff safety failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS210 AI Brain capsule handoff safety OK");
