#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];

const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
const timelineSource = read("lib/market-integrity/vlm-brain-case-review-timeline.ts");
const cssSource = read("app/globals.css");
const deltaSource = read("lib/launch/master-build-progress-delta-pass212.ts");
const progressSource = read("lib/launch/master-build-areas.ts");
const reportSource = read("docs/progress/PASS212_AI_BRAIN_CASE_REVIEW_TIMELINE.md");
const preflightSource = read("scripts/vercel-preflight.mjs");
const pkg = JSON.parse(read("package.json"));

for (const needle of [
  "buildVlmBrainCaseReviewTimeline",
  "selectedTileCaseReviewTimeline",
  "data-vlm-case-review-timeline",
  "PASS212 marker",
]) {
  if (!modalSource.includes(needle)) errors.push(`TokenRiskModal.tsx missing PASS212 marker ${needle}`);
}

for (const needle of [
  "VlmBrainCaseReviewTimeline",
  "vlm-brain-case-review-timeline-v1-pass212",
  "operator_case_timeline_preview",
  "durable_case_timeline_required",
  "PASS212_VLM_BRAIN_CASE_REVIEW_TIMELINE_CONTRACT",
]) {
  if (!timelineSource.includes(needle)) errors.push(`vlm-brain-case-review-timeline.ts missing ${needle}`);
}

for (const needle of [
  "PASS212 · AI Brain case review timeline",
  ".shield-vlm-case-review-timeline",
  ".shield-vlm-case-review-event-list",
  "contain: paint",
]) {
  if (!cssSource.includes(needle)) errors.push(`globals.css missing PASS212 CSS marker ${needle}`);
}

for (const needle of [
  "velmerePass212ProgressDeltas",
  "Operator cases",
  "Operator-only report fields",
  "PASS212_AI_BRAIN_CASE_REVIEW_TIMELINE_DELTA",
]) {
  if (!deltaSource.includes(needle)) errors.push(`master-build-progress-delta-pass212.ts missing ${needle}`);
}

for (const needle of ["pass212AiBrainCaseReviewTimeline", "PASS212 marker"]) {
  if (!progressSource.includes(needle)) errors.push(`master-build-areas.ts missing ${needle}`);
}

if (!reportSource.includes("PASS212 — AI Brain Case Review Timeline")) {
  errors.push("PASS212 report missing title marker");
}
if (!pkg.scripts?.["verify:pass212-ai-brain-case-review-timeline"]) {
  errors.push("package.json missing verify:pass212-ai-brain-case-review-timeline script");
}
if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass212-ai-brain-case-review-timeline")) {
  errors.push("verify:shield-all missing PASS212 guard");
}
if (!preflightSource.includes("verify-pass212-ai-brain-case-review-timeline-safety.mjs")) {
  errors.push("vercel-preflight missing PASS212 guard marker");
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
for (const [file, source] of Object.entries({ timelineSource, reportSource })) {
  for (const pattern of forbidden) {
    if (pattern.test(source)) errors.push(`${file} contains forbidden wording ${pattern}`);
  }
}

if (errors.length) {
  console.error("PASS212 AI Brain case review timeline safety FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS212 AI Brain case review timeline safety OK");
