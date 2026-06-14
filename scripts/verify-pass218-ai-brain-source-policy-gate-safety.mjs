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
  requireIncludes("lib/market-integrity/vlm-brain-source-policy-gate.ts", ["VlmBrainSourcePolicyGate", "vlm-brain-source-policy-gate-v1-pass218", "operator_source_policy_preview", "PASS218_VLM_BRAIN_SOURCE_POLICY_GATE_CONTRACT", "allowlistMode: \"not_connected\""]);
  requireIncludes("components/market-integrity/TokenRiskModal.tsx", ["buildVlmBrainSourcePolicyGate", "selectedTileSourcePolicyGate", "data-vlm-source-policy-gate=\"pass218\"", "PASS218 marker"]);
  requireIncludes("app/globals.css", ["PASS218 — AI Brain source policy gate", ".shield-vlm-source-policy-gate", "data-vlm-source-policy-lane"]);
  requireIncludes("lib/launch/master-build-progress-delta-pass218.ts", ["velmerePass218ProgressDeltas", "PASS218_AI_BRAIN_SOURCE_POLICY_GATE_DELTA", "Allowlists / source policy"]);
  requireIncludes("docs/progress/PASS218_AI_BRAIN_SOURCE_POLICY_GATE.md", ["PASS218 — AI Brain Source Policy Gate", "allowlist state"]);
  const source = read("lib/market-integrity/vlm-brain-source-policy-gate.ts").toLowerCase();
  for (const needle of ["guaranteed profit", "risk-free", "safe investment", "buy signal", "sell signal", "enter seed phrase"]) {
    if (source.includes(needle)) errors.push(`source-policy-gate: forbidden wording ${needle}`);
  }
} catch (error) { errors.push(`PASS218 source policy gate guard crashed: ${error instanceof Error ? error.message : String(error)}`); }
if (errors.length) { console.error("PASS218 source policy gate guard failed:"); for (const error of errors) console.error(`- ${error}`); process.exit(1); }
console.log("PASS218 source policy gate guard OK");
