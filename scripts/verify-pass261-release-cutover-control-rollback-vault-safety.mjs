#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const mustInclude = (source, file, marker) => {
  if (!source.includes(marker)) errors.push(`${file}: missing ${marker}`);
};

const contract = read("lib/market-integrity/vlm-brain-pass261-release-cutover-control.ts");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const lens = read("components/search/VelmereLensCommandRouter.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const progress = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const projectProgress = read("lib/launch/project-progress.ts");
const masterAreas = read("lib/launch/master-build-areas.ts");

for (const marker of [
  "vlm-brain-pass261-release-cutover-control-v1",
  "PASS261_VLM_BRAIN_RELEASE_CUTOVER_CONTROL_CONTRACT",
  "operator_release_cutover_control_rollback_vault",
  "publicExportAllowed: false",
  "rawPayloadAllowed: false",
  "binaryPdfAllowed: false",
  "walletAccessAllowed: false",
  "customerCopyAllowed: false",
  "releasePromotionAllowed: false",
  "releaseCutoverAllowed: false",
  "publicReadinessSealAllowed: false",
  "finalVerdictAllowed: false",
  "rollbackVaultRequired: true",
  "cutoverControlActive: true",
]) mustInclude(contract, "lib/market-integrity/vlm-brain-pass261-release-cutover-control.ts", marker);

for (const marker of [
  "buildVlmBrainPass261ReleaseCutoverControl",
  "selectedTilePass261CutoverControl",
  'data-vlm-pass261-cutover-control="true"',
  "data-vlm-pass261-cutover-lane",
  "data-vlm-pass261-rollback-state",
  "data-vlm-pass261-readiness-seal",
]) mustInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

for (const marker of [
  "PASS261 — AI Brain release cutover control",
  ".shield-vlm-pass261-cutover-control",
  "data-vlm-pass261-cutover-lane",
  "PASS261 — Lens cutover control guide",
  ".vlcr-pass261-cutover-control-guide",
  "prefers-reduced-motion: reduce",
]) mustInclude(css, "app/globals.css", marker);

for (const marker of [
  "PASS261 Lens cutover control guide",
  "vlcr-pass261-cutover-control-guide",
  "PASS261 cutover control",
  "PASS261 Cutover-Control",
  "rollback vault",
  "Rollback-Vault",
  "readiness seals",
  "Readiness-Seals",
]) mustInclude(lens, "components/search/VelmereLensCommandRouter.tsx", marker);

for (const marker of [
  "verify-pass261-release-cutover-control-rollback-vault-safety.mjs",
  "verify:pass261-release-cutover-control-rollback-vault",
]) mustInclude(pkg, "package.json", marker);

for (const marker of [
  "PASS261 AI Brain release cutover control rollback vault guard",
  "verify-pass261-release-cutover-control-rollback-vault-safety.mjs",
]) mustInclude(preflight, "scripts/vercel-preflight.mjs", marker);

for (const marker of [
  "PASS261 addition — AI Brain Release Cutover Control Rollback Vault",
  "PASS261 marker: AI Brain Release Cutover Control active",
]) mustInclude(progress, "docs/progress/VELMERE_MASTER_BUILD_MAP.md", marker);

for (const marker of ["PASS261 marker: AI Brain Release Cutover Control active"]) {
  mustInclude(projectProgress, "lib/launch/project-progress.ts", marker);
  mustInclude(masterAreas, "lib/launch/master-build-areas.ts", marker);
}

for (const [file, source] of [
  ["PASS261 contract", contract],
  ["PASS261 Lens copy", lens],
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
  console.error("PASS261 release cutover control rollback vault guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS261 release cutover control rollback vault guard passed.");
