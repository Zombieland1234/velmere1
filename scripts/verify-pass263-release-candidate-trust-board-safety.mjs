#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const mustInclude = (source, file, marker) => {
  if (!source.includes(marker)) errors.push(`${file}: missing ${marker}`);
};

const contract = read("lib/market-integrity/vlm-brain-pass263-release-candidate-trust-board.ts");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const lens = read("components/search/VelmereLensCommandRouter.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const progress = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const projectProgress = read("lib/launch/project-progress.ts");
const masterAreas = read("lib/launch/master-build-areas.ts");

for (const marker of [
  "vlm-brain-pass263-release-candidate-trust-board-v1",
  "PASS263_VLM_BRAIN_RELEASE_CANDIDATE_TRUST_BOARD_CONTRACT",
  "operator_release_candidate_trust_board",
  "candidateBoardActive: true",
  "operatorOnly: true",
  "publicExportAllowed: false",
  "rawPayloadAllowed: false",
  "binaryPdfAllowed: false",
  "walletAccessAllowed: false",
  "customerCopyAllowed: false",
  "releaseCutoverAllowed: false",
  "releasePromotionAllowed: false",
  "publicReadinessSealAllowed: false",
  "finalVerdictAllowed: false",
  "trustCuePublicReady: false",
  "copyPsychologySafe: true",
]) mustInclude(contract, "lib/market-integrity/vlm-brain-pass263-release-candidate-trust-board.ts", marker);

for (const marker of [
  "buildVlmBrainPass263ReleaseCandidateTrustBoard",
  "selectedTilePass263CandidateTrustBoard",
  'data-vlm-pass263-candidate-trust-board="true"',
  "data-vlm-pass263-candidate-lane",
  "data-vlm-pass263-trust-cue",
  "data-vlm-pass263-surface-lock",
]) mustInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

for (const marker of [
  "PASS263 — AI Brain release candidate trust board",
  ".shield-vlm-pass263-candidate-trust-board",
  "data-vlm-pass263-candidate-lane",
  "PASS263 — Lens candidate trust board guide",
  ".vlcr-pass263-candidate-trust-guide",
  "prefers-reduced-motion: reduce",
]) mustInclude(css, "app/globals.css", marker);

for (const marker of [
  "PASS263 Lens candidate trust board guide",
  "vlcr-pass263-candidate-trust-guide",
  "PASS263 candidate trust board",
  "PASS263 Candidate-Trust-Board",
  "trust cues",
  "Trust-Cues",
  "copy boundary",
  "Copy-Grenze",
  "proof gaps",
  "Proof-Gaps",
]) mustInclude(lens, "components/search/VelmereLensCommandRouter.tsx", marker);

for (const marker of [
  "verify-pass263-release-candidate-trust-board-safety.mjs",
  "verify:pass263-release-candidate-trust-board",
]) mustInclude(pkg, "package.json", marker);

for (const marker of [
  "PASS263 AI Brain release candidate trust board guard",
  "verify-pass263-release-candidate-trust-board-safety.mjs",
]) mustInclude(preflight, "scripts/vercel-preflight.mjs", marker);

for (const marker of [
  "PASS263 addition — AI Brain Release Candidate Trust Board",
  "PASS263 marker: AI Brain Release Candidate Trust Board active",
]) mustInclude(progress, "docs/progress/VELMERE_MASTER_BUILD_MAP.md", marker);

for (const marker of ["PASS263 marker: AI Brain Release Candidate Trust Board active"]) {
  mustInclude(projectProgress, "lib/launch/project-progress.ts", marker);
  mustInclude(masterAreas, "lib/launch/master-build-areas.ts", marker);
}

for (const [file, source] of [
  ["PASS263 contract", contract],
  ["PASS263 Lens copy", lens],
]) {
  for (const unsafe of [
    "seed phrase",
    "private key",
    "guaranteed profit",
    "risk-free",
    "buy signal",
    "sell signal",
    "safe investment",
    "guaranteed security",
    "safety certificate",
    "Sicherheitszertifikat",
    "certyfikat bezpieczeństwa",
    "public sale is live",
    "checkout is live",
  ]) {
    if (source.toLowerCase().includes(unsafe.toLowerCase())) {
      errors.push(`${file}: unsafe wording found: ${unsafe}`);
    }
  }
}

if (errors.length) {
  console.error("PASS263 release candidate trust board guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS263 release candidate trust board guard passed.");
