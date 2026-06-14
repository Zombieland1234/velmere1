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
  requireIncludes("lib/market-integrity/vlm-brain-source-coverage-matrix.ts", [
    "VlmBrainSourceCoverageMatrix",
    "vlm-brain-source-coverage-matrix-v1-pass214",
    "operator_source_coverage_preview",
    "secondSourceRequired",
    "PASS214_VLM_BRAIN_SOURCE_COVERAGE_MATRIX_CONTRACT",
  ]);
  requireIncludes("components/market-integrity/TokenRiskModal.tsx", [
    "buildVlmBrainSourceCoverageMatrix",
    "selectedTileSourceCoverageMatrix",
    "data-vlm-source-coverage-matrix=\"pass214\"",
    "PASS214 marker",
  ]);
  requireIncludes("app/globals.css", [
    "PASS214 · AI Brain source coverage matrix",
    ".shield-vlm-source-coverage-matrix",
    "data-vlm-source-coverage-lane",
  ]);
  requireIncludes("lib/launch/master-build-progress-delta-pass214.ts", [
    "velmerePass214ProgressDeltas",
    "PASS214_AI_BRAIN_SOURCE_COVERAGE_MATRIX_DELTA",
    "Source confidence lanes",
  ]);
  requireIncludes("lib/launch/master-build-areas.ts", [
    "pass214AiBrainSourceCoverageMatrix: true",
    "PASS214 marker: AI Brain source coverage matrix",
  ]);
  requireIncludes("docs/progress/PASS214_AI_BRAIN_SOURCE_COVERAGE_MATRIX.md", [
    "PASS214 — AI Brain Source Coverage Matrix",
    "market tape, liquidity depth, holder graph, contract control, narrative/social pressure and report/export gate",
  ]);
  requireIncludes("docs/progress/PROJECT_PROGRESS_LEDGER.md", [
    "PASS214 — AI Brain Source Coverage Matrix",
    "PASS214 product delta",
  ]);
  const modal = read("components/market-integrity/TokenRiskModal.tsx");
  const forbidden = ["guaranteed profit", "risk-free", "safe investment", "buy signal", "sell signal", "scam confirmed", "fraud proven", "enter seed phrase"];
  const lower = modal.toLowerCase();
  for (const needle of forbidden) {
    if (lower.includes(needle)) errors.push(`components/market-integrity/TokenRiskModal.tsx: forbidden wording ${needle}`);
  }
} catch (error) {
  errors.push(`PASS214 source coverage matrix guard crashed: ${error instanceof Error ? error.message : String(error)}`);
}

if (errors.length) {
  console.error("PASS214 source coverage matrix guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS214 source coverage matrix guard OK");
