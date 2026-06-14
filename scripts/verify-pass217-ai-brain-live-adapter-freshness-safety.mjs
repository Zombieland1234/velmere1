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
  requireIncludes("lib/market-integrity/vlm-brain-live-adapter-freshness.ts", [
    "VlmBrainLiveAdapterFreshnessMesh",
    "vlm-brain-live-adapter-freshness-v1-pass217",
    "operator_adapter_freshness_preview",
    "buildVlmBrainLiveAdapterFreshnessMesh",
    "PASS217_VLM_BRAIN_LIVE_ADAPTER_FRESHNESS_CONTRACT",
    "sourceLedgerWrite: \"preview_only_not_persisted\"",
    "durableSnapshot: \"not_connected\"",
  ]);
  requireIncludes("components/market-integrity/TokenRiskModal.tsx", [
    "buildVlmBrainLiveAdapterFreshnessMesh",
    "selectedTileLiveAdapterFreshnessMesh",
    "data-vlm-live-adapter-freshness=\"pass217\"",
    "data-vlm-live-adapter-lane",
    "PASS217 marker",
  ]);
  requireIncludes("app/globals.css", [
    "PASS217 — AI Brain live adapter freshness",
    ".shield-vlm-live-adapter-freshness",
    "data-vlm-live-adapter-lane",
    "data-vlm-live-adapter-decision",
    "contain: paint",
  ]);
  requireIncludes("lib/launch/master-build-progress-delta-pass217.ts", [
    "velmerePass217ProgressDeltas",
    "PASS217_AI_BRAIN_LIVE_ADAPTER_FRESHNESS_DELTA",
    "Adapter timeouts / fallbacks",
    "Source freshness registry",
  ]);
  requireIncludes("lib/launch/master-build-areas.ts", [
    "PASS217 marker: AI Brain live adapter freshness mesh",
    "live adapter freshness",
    "TTL, cache decision",
  ]);
  requireIncludes("docs/progress/PASS217_AI_BRAIN_LIVE_ADAPTER_FRESHNESS.md", [
    "PASS217 — AI Brain Live Adapter Freshness Mesh",
    "TTL window, cache decision",
  ]);
  requireIncludes("docs/progress/PROJECT_PROGRESS_LEDGER.md", [
    "PASS217 — AI Brain Live Adapter Freshness Mesh",
  ]);

  const source = read("lib/market-integrity/vlm-brain-live-adapter-freshness.ts").toLowerCase();
  const forbidden = [
    "guaranteed profit",
    "risk-free",
    "safe investment",
    "buy signal",
    "sell signal",
    "enter seed phrase",
    "scam confirmed",
    "fraud proven",
  ];
  for (const needle of forbidden) {
    if (source.includes(needle)) errors.push(`vlm-brain-live-adapter-freshness.ts: forbidden wording ${needle}`);
  }
  if (!source.includes('sourceledgerwrite: "preview_only_not_persisted"')) {
    errors.push("vlm-brain-live-adapter-freshness.ts: source ledger write must remain preview-only");
  }
  if (!source.includes('durablesnapshot: "not_connected"')) {
    errors.push("vlm-brain-live-adapter-freshness.ts: durable snapshot must remain not_connected");
  }
} catch (error) {
  errors.push(`PASS217 live adapter freshness guard crashed: ${error instanceof Error ? error.message : String(error)}`);
}

if (errors.length) {
  console.error("PASS217 live adapter freshness guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS217 live adapter freshness guard OK");
