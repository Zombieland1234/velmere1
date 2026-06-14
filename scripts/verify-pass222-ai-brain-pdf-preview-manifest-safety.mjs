#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function requireIncludes(file, needles) { const source = read(file); for (const needle of needles) if (!source.includes(needle)) errors.push(`${file}: missing ${needle}`); return source; }
try {
  const contract = requireIncludes("lib/market-integrity/vlm-brain-pdf-preview-manifest.ts", ["VlmBrainPdfPreviewManifest", "vlm-brain-pdf-preview-manifest-v1-pass222", "pdf_ready_html_preview_only", "binaryPdfReady: false", "rawPayloadAllowed: false", "redactionRequired: true", "PASS222_VLM_BRAIN_PDF_PREVIEW_MANIFEST_CONTRACT"]);
  requireIncludes("components/market-integrity/TokenRiskModal.tsx", ["buildVlmBrainPdfPreviewManifest", "selectedTilePdfPreviewManifest", "data-vlm-pdf-preview-manifest=\"pass222\"", "PASS222 marker"]);
  requireIncludes("app/globals.css", [".shield-vlm-pdf-preview-manifest", "data-vlm-pdf-preview-section"]);
  requireIncludes("lib/launch/master-build-progress-delta-pass222.ts", ["velmerePass222ProgressDeltas", "PASS222_AI_BRAIN_PDF_PREVIEW_MANIFEST_DELTA", "Report download route"]);
  requireIncludes("docs/progress/PASS222_AI_BRAIN_PDF_PREVIEW_MANIFEST.md", ["PASS222 — AI Brain PDF Preview Manifest", "Binary PDF download", "disabled"]);
  const lowered = contract.toLowerCase();
  for (const forbidden of ["guaranteed profit", "risk-free", "safe investment", "buy signal", "sell signal", "enter seed phrase", "certificate of safety"]) if (lowered.includes(forbidden)) errors.push(`pdf-preview-manifest: forbidden wording ${forbidden}`);
} catch (error) { errors.push(`PASS222 PDF preview manifest guard crashed: ${error instanceof Error ? error.message : String(error)}`); }
if (errors.length) { console.error("PASS222 PDF preview manifest guard failed:"); for (const error of errors) console.error(`- ${error}`); process.exit(1); }
console.log("PASS222 PDF preview manifest guard OK");
