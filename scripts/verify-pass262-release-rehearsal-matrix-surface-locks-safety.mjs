#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const mustInclude = (source, file, marker) => {
  if (!source.includes(marker)) errors.push(`${file}: missing ${marker}`);
};

const contract = read("lib/market-integrity/vlm-brain-pass262-release-rehearsal-matrix.ts");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const lens = read("components/search/VelmereLensCommandRouter.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const progress = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const projectProgress = read("lib/launch/project-progress.ts");
const masterAreas = read("lib/launch/master-build-areas.ts");

for (const marker of [
  "vlm-brain-pass262-release-rehearsal-matrix-v1",
  "PASS262_VLM_BRAIN_RELEASE_REHEARSAL_MATRIX_CONTRACT",
  "operator_release_rehearsal_matrix_dry_run",
  "publicExportAllowed: false",
  "rawPayloadAllowed: false",
  "binaryPdfAllowed: false",
  "walletAccessAllowed: false",
  "customerCopyAllowed: false",
  "releaseCutoverAllowed: false",
  "releasePromotionAllowed: false",
  "publicReadinessSealAllowed: false",
  "rehearsalPromotionAllowed: false",
  "finalVerdictAllowed: false",
  "rollbackDrillRequired: true",
  "dryRunOnly: true",
]) mustInclude(contract, "lib/market-integrity/vlm-brain-pass262-release-rehearsal-matrix.ts", marker);

for (const marker of [
  "buildVlmBrainPass262ReleaseRehearsalMatrix",
  "selectedTilePass262ReleaseRehearsalMatrix",
  'data-vlm-pass262-release-rehearsal="true"',
  "data-vlm-pass262-rehearsal-lane",
  "data-vlm-pass262-signoff-state",
  "data-vlm-pass262-surface-lock",
]) mustInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

for (const marker of [
  "PASS262 — AI Brain release rehearsal matrix",
  ".shield-vlm-pass262-release-rehearsal",
  "data-vlm-pass262-rehearsal-lane",
  "PASS262 — Lens release rehearsal guide",
  ".vlcr-pass262-release-rehearsal-guide",
  "prefers-reduced-motion: reduce",
]) mustInclude(css, "app/globals.css", marker);

for (const marker of [
  "PASS262 Lens release rehearsal guide",
  "vlcr-pass262-release-rehearsal-guide",
  "PASS262 release rehearsal",
  "PASS262 Release-Rehearsal",
  "dry-run evidence",
  "Dry-Run-Evidenz",
  "rollback drill",
  "Rollback-Drill",
  "surface locks",
  "Surface-Locks",
]) mustInclude(lens, "components/search/VelmereLensCommandRouter.tsx", marker);

for (const marker of [
  "verify-pass262-release-rehearsal-matrix-surface-locks-safety.mjs",
  "verify:pass262-release-rehearsal-matrix-surface-locks",
]) mustInclude(pkg, "package.json", marker);

for (const marker of [
  "PASS262 AI Brain release rehearsal matrix surface locks guard",
  "verify-pass262-release-rehearsal-matrix-surface-locks-safety.mjs",
]) mustInclude(preflight, "scripts/vercel-preflight.mjs", marker);

for (const marker of [
  "PASS262 addition — AI Brain Release Rehearsal Matrix Surface Locks",
  "PASS262 marker: AI Brain Release Rehearsal Matrix active",
]) mustInclude(progress, "docs/progress/VELMERE_MASTER_BUILD_MAP.md", marker);

for (const marker of ["PASS262 marker: AI Brain Release Rehearsal Matrix active"]) {
  mustInclude(projectProgress, "lib/launch/project-progress.ts", marker);
  mustInclude(masterAreas, "lib/launch/master-build-areas.ts", marker);
}

for (const [file, source] of [
  ["PASS262 contract", contract],
  ["PASS262 Lens copy", lens],
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
  console.error("PASS262 release rehearsal matrix surface locks guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS262 release rehearsal matrix surface locks guard passed.");
