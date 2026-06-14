#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function requireIncludes(file, needles) { const source = read(file); for (const needle of needles) if (!source.includes(needle)) errors.push(`${file}: missing ${needle}`); return source; }
try {
  const contract = requireIncludes("lib/market-integrity/vlm-brain-source-ledger-ui-preview.ts", ["VlmBrainSourceLedgerUiPreview", "vlm-brain-source-ledger-ui-preview-v1-pass221", "operator_source_ledger_preview", "publicLedgerReady: false", "rawPayloadAllowed: false", "browserTraceRequired: true", "PASS221_VLM_BRAIN_SOURCE_LEDGER_UI_PREVIEW_CONTRACT"]);
  requireIncludes("components/market-integrity/TokenRiskModal.tsx", ["buildVlmBrainSourceLedgerUiPreview", "selectedTileSourceLedgerUiPreview", "data-vlm-source-ledger-ui=\"pass221\"", "PASS221 marker"]);
  requireIncludes("app/globals.css", ["PASS221–PASS224", ".shield-vlm-source-ledger-ui", "data-vlm-source-ledger-lane"]);
  requireIncludes("lib/launch/master-build-progress-delta-pass221.ts", ["velmerePass221ProgressDeltas", "PASS221_AI_BRAIN_SOURCE_LEDGER_UI_PREVIEW_DELTA"]);
  requireIncludes("docs/progress/PASS221_AI_BRAIN_SOURCE_LEDGER_UI_PREVIEW.md", ["PASS221 — AI Brain Source Ledger UI Preview", "source ledger", "raw payload"]);
  const lowered = contract.toLowerCase();
  for (const forbidden of ["guaranteed profit", "risk-free", "safe investment", "buy signal", "sell signal", "enter seed phrase", "certificate of safety"]) if (lowered.includes(forbidden)) errors.push(`source-ledger-ui-preview: forbidden wording ${forbidden}`);
} catch (error) { errors.push(`PASS221 source ledger UI preview guard crashed: ${error instanceof Error ? error.message : String(error)}`); }
if (errors.length) { console.error("PASS221 source ledger UI preview guard failed:"); for (const error of errors) console.error(`- ${error}`); process.exit(1); }
console.log("PASS221 source ledger UI preview guard OK");
