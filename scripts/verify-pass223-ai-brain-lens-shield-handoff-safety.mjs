#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function requireIncludes(file, needles) { const source = read(file); for (const needle of needles) if (!source.includes(needle)) errors.push(`${file}: missing ${needle}`); return source; }
try {
  const contract = requireIncludes("lib/market-integrity/vlm-brain-lens-shield-handoff.ts", ["VlmBrainLensShieldHandoff", "vlm-brain-lens-shield-handoff-v1-pass223", "lens_to_shield_operator_preview", "publicRouteEnabled: false", "rawQueryPayloadAllowed: false", "PASS223_VLM_BRAIN_LENS_SHIELD_HANDOFF_CONTRACT"]);
  requireIncludes("components/market-integrity/TokenRiskModal.tsx", ["buildVlmBrainLensShieldHandoff", "selectedTileLensShieldHandoff", "data-vlm-lens-shield-handoff=\"pass223\"", "PASS223 marker"]);
  requireIncludes("app/globals.css", [".shield-vlm-lens-shield-handoff", "data-vlm-lens-shield-route"]);
  requireIncludes("lib/launch/master-build-progress-delta-pass223.ts", ["velmerePass223ProgressDeltas", "PASS223_AI_BRAIN_LENS_SHIELD_HANDOFF_DELTA", "Velmère Lens command router"]);
  requireIncludes("docs/progress/PASS223_AI_BRAIN_LENS_SHIELD_HANDOFF.md", ["PASS223 — AI Brain Lens to Shield Handoff", "public route", "raw query payload"]);
  const lowered = contract.toLowerCase();
  for (const forbidden of ["guaranteed profit", "risk-free", "safe investment", "buy signal", "sell signal", "enter seed phrase", "certificate of safety"]) if (lowered.includes(forbidden)) errors.push(`lens-shield-handoff: forbidden wording ${forbidden}`);
} catch (error) { errors.push(`PASS223 Lens Shield handoff guard crashed: ${error instanceof Error ? error.message : String(error)}`); }
if (errors.length) { console.error("PASS223 Lens Shield handoff guard failed:"); for (const error of errors) console.error(`- ${error}`); process.exit(1); }
console.log("PASS223 Lens Shield handoff guard OK");
