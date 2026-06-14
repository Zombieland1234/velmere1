#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function requireIncludes(file, needles) { const source = read(file); for (const needle of needles) if (!source.includes(needle)) errors.push(`${file}: missing ${needle}`); return source; }
try {
  const contract = requireIncludes("lib/market-integrity/vlm-brain-release-qa-scorecard.ts", ["VlmBrainReleaseQaScorecard", "vlm-brain-release-qa-scorecard-v1-pass224", "operator_release_qa_preview", "publicReleaseReady: false", "binaryPdfReady: false", "rawPayloadAllowed: false", "browserQaRequired: true", "PASS224_VLM_BRAIN_RELEASE_QA_SCORECARD_CONTRACT"]);
  requireIncludes("components/market-integrity/TokenRiskModal.tsx", ["buildVlmBrainReleaseQaScorecard", "selectedTileReleaseQaScorecard", "data-vlm-release-qa-scorecard=\"pass224\"", "PASS224 marker"]);
  requireIncludes("app/globals.css", [".shield-vlm-release-qa-scorecard", "data-vlm-release-qa-lane"]);
  requireIncludes("lib/launch/master-build-progress-delta-pass224.ts", ["velmerePass224ProgressDeltas", "PASS224_AI_BRAIN_RELEASE_QA_SCORECARD_DELTA", "Brain telemetry / FPS QA"]);
  requireIncludes("docs/progress/PASS224_AI_BRAIN_RELEASE_QA_SCORECARD.md", ["PASS224 — AI Brain Release QA Scorecard", "browser", "binary PDF"]);
  const lowered = contract.toLowerCase();
  for (const forbidden of ["guaranteed profit", "risk-free", "safe investment", "buy signal", "sell signal", "enter seed phrase", "certificate of safety"]) if (lowered.includes(forbidden)) errors.push(`release-qa-scorecard: forbidden wording ${forbidden}`);
} catch (error) { errors.push(`PASS224 release QA scorecard guard crashed: ${error instanceof Error ? error.message : String(error)}`); }
if (errors.length) { console.error("PASS224 release QA scorecard guard failed:"); for (const error of errors) console.error(`- ${error}`); process.exit(1); }
console.log("PASS224 release QA scorecard guard OK");
