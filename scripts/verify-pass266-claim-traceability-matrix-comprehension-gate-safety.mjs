#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const mustInclude = (source, file, marker) => {
  if (!source.includes(marker)) errors.push(`${file}: missing ${marker}`);
};

const contract = read("lib/market-integrity/vlm-brain-pass266-claim-traceability-matrix.ts");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const lens = read("components/search/VelmereLensCommandRouter.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const progress = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const projectProgress = read("lib/launch/project-progress.ts");
const masterAreas = read("lib/launch/master-build-areas.ts");

for (const marker of [
  "vlm-brain-pass266-claim-traceability-matrix-v1",
  "PASS266_VLM_BRAIN_CLAIM_TRACEABILITY_MATRIX_CONTRACT",
  "operator_claim_traceability_matrix",
  "claimTraceabilityMatrixActive: true",
  "comprehensionGateActive: true",
  "evidenceAnchorRequired: true",
  "operatorOnly: true",
  "publicExportAllowed: false",
  "rawPayloadAllowed: false",
  "binaryPdfAllowed: false",
  "walletAccessAllowed: false",
  "customerCopyAllowed: false",
  "publicClaimAllowed: false",
  "unmappedClaimAllowed: false",
  "releaseCutoverAllowed: false",
  "releasePromotionAllowed: false",
  "publicReadinessSealAllowed: false",
  "finalVerdictAllowed: false",
  "publicBadgeAllowed: false",
  "urgencyCopyAllowed: false",
  "certaintyCopyAllowed: false",
  "accessShortcutAllowed: false",
  "languagePreviewOnly: true",
  "claimReadingProtocol",
  "claimLanes",
  "comprehensionChecks",
]) mustInclude(contract, "lib/market-integrity/vlm-brain-pass266-claim-traceability-matrix.ts", marker);

for (const marker of [
  "buildVlmBrainPass266ClaimTraceabilityMatrix",
  "selectedTilePass266ClaimTraceabilityMatrix",
  'data-vlm-pass266-claim-traceability-matrix="true"',
  "data-vlm-pass266-claim-lane",
  "data-vlm-pass266-comprehension-risk",
  "PASS266 marker: selected tile claim traceability matrix",
]) mustInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

for (const marker of [
  "PASS266 — AI Brain claim traceability matrix",
  ".shield-vlm-pass266-claim-traceability-matrix",
  "data-vlm-pass266-claim-lane",
  "PASS266 — Lens claim traceability guide",
  ".vlcr-pass266-claim-traceability-guide",
  "prefers-reduced-motion: reduce",
]) mustInclude(css, "app/globals.css", marker);

for (const marker of [
  "PASS266 Lens claim traceability guide",
  "vlcr-pass266-claim-traceability-guide",
  "PASS266 claim traceability matrix",
  "PASS266 Claim-Traceability-Matrix",
  "evidence anchor",
  "Evidence Anchor",
  "claim lane",
  "Claim-Lane",
  "comprehension gate",
  "Comprehension-Gate",
  "surface lock",
  "Surface-Lock",
]) mustInclude(lens, "components/search/VelmereLensCommandRouter.tsx", marker);

for (const marker of [
  "verify-pass266-claim-traceability-matrix-comprehension-gate-safety.mjs",
  "verify:pass266-claim-traceability-matrix-comprehension-gate",
]) mustInclude(pkg, "package.json", marker);

for (const marker of [
  "PASS266 AI Brain claim traceability matrix comprehension gate",
  "verify-pass266-claim-traceability-matrix-comprehension-gate-safety.mjs",
]) mustInclude(preflight, "scripts/vercel-preflight.mjs", marker);

for (const marker of [
  "PASS266 addition — AI Brain Claim Traceability Matrix",
  "PASS266 marker: AI Brain Claim Traceability Matrix active",
]) mustInclude(progress, "docs/progress/VELMERE_MASTER_BUILD_MAP.md", marker);

for (const marker of ["PASS266 marker: AI Brain Claim Traceability Matrix active"]) {
  mustInclude(projectProgress, "lib/launch/project-progress.ts", marker);
  mustInclude(masterAreas, "lib/launch/master-build-areas.ts", marker);
}

for (const [file, source] of [
  ["PASS266 contract", contract],
  ["PASS266 Lens copy", lens],
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
      errors.push(`${file}: unsafe phrase found: ${unsafe}`);
    }
  }
}

if (errors.length) {
  console.error("PASS266 claim traceability matrix comprehension gate guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS266 claim traceability matrix comprehension gate guard passed.");
