#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function requireIncludes(file, needles) {
  const source = read(file);
  for (const needle of needles) if (!source.includes(needle)) errors.push(`${file}: missing ${needle}`);
  return source;
}
try {
  requireIncludes("lib/market-integrity/vlm-brain-durable-snapshot-plan.ts", ["VlmBrainDurableSnapshotPlan", "vlm-brain-durable-snapshot-plan-v1-pass219", "operator_durable_write_preview", "PASS219_VLM_BRAIN_DURABLE_SNAPSHOT_PLAN_CONTRACT", "sourceSnapshotStore: \"not_connected\"", "rawPayloadAllowed: false"]);
  requireIncludes("components/market-integrity/TokenRiskModal.tsx", ["buildVlmBrainDurableSnapshotPlan", "selectedTileDurableSnapshotPlan", "data-vlm-durable-snapshot-plan=\"pass219\"", "PASS219 marker"]);
  requireIncludes("app/globals.css", ["PASS219 — AI Brain durable snapshot plan", ".shield-vlm-durable-snapshot-plan", "data-vlm-durable-snapshot-write"]);
  requireIncludes("lib/launch/master-build-progress-delta-pass219.ts", ["velmerePass219ProgressDeltas", "PASS219_AI_BRAIN_DURABLE_SNAPSHOT_PLAN_DELTA", "Storage adapter contract"]);
  requireIncludes("docs/progress/PASS219_AI_BRAIN_DURABLE_SNAPSHOT_PLAN.md", ["PASS219 — AI Brain Durable Snapshot Plan", "not_connected"]);
  const source = read("lib/market-integrity/vlm-brain-durable-snapshot-plan.ts").toLowerCase();
  for (const needle of ["guaranteed profit", "risk-free", "safe investment", "buy signal", "sell signal", "enter seed phrase"]) {
    if (source.includes(needle)) errors.push(`durable-snapshot-plan: forbidden wording ${needle}`);
  }
} catch (error) { errors.push(`PASS219 durable snapshot plan guard crashed: ${error instanceof Error ? error.message : String(error)}`); }
if (errors.length) { console.error("PASS219 durable snapshot plan guard failed:"); for (const error of errors) console.error(`- ${error}`); process.exit(1); }
console.log("PASS219 durable snapshot plan guard OK");
