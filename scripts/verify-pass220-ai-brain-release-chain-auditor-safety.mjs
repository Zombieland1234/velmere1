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
  const contract = requireIncludes("lib/market-integrity/vlm-brain-release-chain-auditor.ts", [
    "VlmBrainReleaseChainAudit",
    "vlm-brain-release-chain-auditor-v1-pass220",
    "operator_release_chain_audit_preview",
    "publicExportReady: false",
    "pdfDownloadReady: false",
    "rawPayloadAllowed: false",
    "PASS220_VLM_BRAIN_RELEASE_CHAIN_AUDITOR_CONTRACT",
  ]);
  requireIncludes("components/market-integrity/TokenRiskModal.tsx", [
    "buildVlmBrainReleaseChainAudit",
    "selectedTileReleaseChainAudit",
    "data-vlm-release-chain-audit=\"pass220\"",
    "PASS220 marker",
  ]);
  requireIncludes("app/globals.css", [
    "PASS220 — AI Brain release chain audit",
    ".shield-vlm-release-chain-audit",
    "data-vlm-release-chain-lane",
  ]);
  requireIncludes("lib/launch/master-build-progress-delta-pass220.ts", [
    "velmerePass220ProgressDeltas",
    "PASS220_AI_BRAIN_RELEASE_CHAIN_AUDITOR_DELTA",
    "Report download route",
  ]);
  requireIncludes("docs/progress/PASS220_AI_BRAIN_RELEASE_CHAIN_AUDITOR.md", [
    "PASS220 — AI Brain Release Chain Auditor",
    "public export",
    "PDF download",
  ]);
  const lowered = contract.toLowerCase();
  for (const forbidden of ["guaranteed profit", "risk-free", "safe investment", "buy signal", "sell signal", "enter seed phrase", "certificate of safety"]) {
    if (lowered.includes(forbidden)) errors.push(`release-chain-auditor: forbidden wording ${forbidden}`);
  }
} catch (error) {
  errors.push(`PASS220 release chain auditor guard crashed: ${error instanceof Error ? error.message : String(error)}`);
}
if (errors.length) {
  console.error("PASS220 release chain auditor guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("PASS220 release chain auditor guard OK");
