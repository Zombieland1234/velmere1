#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const mustInclude = (source, file, marker) => {
  if (!source.includes(marker)) errors.push(`${file}: missing ${marker}`);
};

const contract = read("lib/market-integrity/vlm-brain-pass264-trust-narrative-guard.ts");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const lens = read("components/search/VelmereLensCommandRouter.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const progress = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const projectProgress = read("lib/launch/project-progress.ts");
const masterAreas = read("lib/launch/master-build-areas.ts");

for (const marker of [
  "vlm-brain-pass264-trust-narrative-guard-v1",
  "PASS264_VLM_BRAIN_TRUST_NARRATIVE_GUARD_CONTRACT",
  "operator_trust_narrative_guard",
  "narrativeGuardActive: true",
  "trustPsychologySafe: true",
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
  "publicBadgeAllowed: false",
  "urgencyCopyAllowed: false",
  "certaintyCopyAllowed: false",
  "accessShortcutAllowed: false",
  "darkPatternChecks",
]) mustInclude(contract, "lib/market-integrity/vlm-brain-pass264-trust-narrative-guard.ts", marker);

for (const marker of [
  "buildVlmBrainPass264TrustNarrativeGuard",
  "selectedTilePass264TrustNarrativeGuard",
  'data-vlm-pass264-trust-narrative-guard="true"',
  "data-vlm-pass264-narrative-stage",
  "data-vlm-pass264-dark-pattern",
  "PASS264 marker: selected tile trust narrative guard",
]) mustInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

for (const marker of [
  "PASS264 — AI Brain trust narrative guard",
  ".shield-vlm-pass264-trust-narrative-guard",
  "data-vlm-pass264-narrative-stage",
  "PASS264 — Lens trust narrative guide",
  ".vlcr-pass264-trust-narrative-guide",
  "prefers-reduced-motion: reduce",
]) mustInclude(css, "app/globals.css", marker);

for (const marker of [
  "PASS264 Lens trust narrative guide",
  "vlcr-pass264-trust-narrative-guide",
  "PASS264 trust narrative guard",
  "PASS264 Trust-Narrative-Guard",
  "context first",
  "Kontext zuerst",
  "evidence status",
  "Evidenzstatus",
  "dark-pattern firewall",
  "Dark-Pattern-Firewall",
]) mustInclude(lens, "components/search/VelmereLensCommandRouter.tsx", marker);

for (const marker of [
  "verify-pass264-trust-narrative-guard-dark-pattern-firewall-safety.mjs",
  "verify:pass264-trust-narrative-guard-dark-pattern-firewall",
]) mustInclude(pkg, "package.json", marker);

for (const marker of [
  "PASS264 AI Brain trust narrative guard dark-pattern firewall",
  "verify-pass264-trust-narrative-guard-dark-pattern-firewall-safety.mjs",
]) mustInclude(preflight, "scripts/vercel-preflight.mjs", marker);

for (const marker of [
  "PASS264 addition — AI Brain Trust Narrative Guard",
  "PASS264 marker: AI Brain Trust Narrative Guard active",
]) mustInclude(progress, "docs/progress/VELMERE_MASTER_BUILD_MAP.md", marker);

for (const marker of ["PASS264 marker: AI Brain Trust Narrative Guard active"]) {
  mustInclude(projectProgress, "lib/launch/project-progress.ts", marker);
  mustInclude(masterAreas, "lib/launch/master-build-areas.ts", marker);
}

for (const [file, source] of [
  ["PASS264 contract", contract],
  ["PASS264 Lens copy", lens],
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
  console.error("PASS264 trust narrative guard dark-pattern firewall guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS264 trust narrative guard dark-pattern firewall guard passed.");
