#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function requireIncludes(file, needles) {
  const source = read(file);
  for (const needle of needles) {
    if (!source.includes(needle)) errors.push(`${file}: missing ${needle}`);
  }
  return source;
}

try {
  requireIncludes("lib/market-integrity/vlm-brain-source-truth-spine.ts", [
    "VlmBrainSourceTruthSpine",
    "vlm-brain-source-truth-spine-v1-pass216",
    "operator_truth_spine_preview",
    "buildVlmBrainSourceTruthSpine",
    "PASS216_VLM_BRAIN_SOURCE_TRUTH_SPINE_CONTRACT",
    "createSourceAdapterEnvelope",
    "customerExport",
  ]);
  requireIncludes("components/market-integrity/TokenRiskModal.tsx", [
    "buildVlmBrainSourceTruthSpine",
    "selectedTileSourceTruthSpine",
    "data-vlm-source-truth-spine=\"pass216\"",
    "PASS216 marker",
  ]);
  requireIncludes("app/globals.css", [
    "PASS216 — AI Brain source truth spine",
    ".shield-vlm-source-truth-spine",
    "data-vlm-source-truth-lane",
    "data-vlm-source-truth-decision",
  ]);
  requireIncludes("lib/launch/master-build-progress-delta-pass216.ts", [
    "velmerePass216ProgressDeltas",
    "PASS216_AI_BRAIN_SOURCE_TRUTH_SPINE_DELTA",
    "Adapter timeouts / fallbacks",
  ]);
  requireIncludes("lib/launch/master-build-areas.ts", [
    "PASS216 marker: AI Brain source truth spine",
    "source truth spine",
  ]);
  requireIncludes("docs/progress/PASS216_AI_BRAIN_SOURCE_TRUTH_SPINE.md", [
    "PASS216 — AI Brain Source Truth Spine",
    "adapter lane, cache decision, trust cap",
  ]);
  requireIncludes("docs/progress/PROJECT_PROGRESS_LEDGER.md", [
    "PASS216 — AI Brain Source Truth Spine",
  ]);
  const source = read("lib/market-integrity/vlm-brain-source-truth-spine.ts").toLowerCase();
  const forbidden = [
    "guaranteed profit",
    "risk-free",
    "safe investment",
    "buy signal",
    "sell signal",
    "enter seed phrase",
  ];
  for (const needle of forbidden) {
    if (source.includes(needle)) errors.push(`vlm-brain-source-truth-spine.ts: forbidden wording ${needle}`);
  }
  if (!source.includes('durablewrite: "not_connected"')) {
    errors.push("vlm-brain-source-truth-spine.ts: durable write must remain not_connected");
  }
} catch (error) {
  errors.push(`PASS216 source truth spine guard crashed: ${error instanceof Error ? error.message : String(error)}`);
}

if (errors.length) {
  console.error("PASS216 source truth spine guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS216 source truth spine guard OK");
