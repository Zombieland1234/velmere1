#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const mustInclude = (source, file, marker) => {
  if (!source.includes(marker)) errors.push(`${file}: missing ${marker}`);
};

const contract = read("lib/market-integrity/vlm-brain-pass265-evidence-language-ledger.ts");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const lens = read("components/search/VelmereLensCommandRouter.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const progress = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const projectProgress = read("lib/launch/project-progress.ts");
const masterAreas = read("lib/launch/master-build-areas.ts");

for (const marker of [
  "vlm-brain-pass265-evidence-language-ledger-v1",
  "PASS265_VLM_BRAIN_EVIDENCE_LANGUAGE_LEDGER_CONTRACT",
  "operator_evidence_language_ledger",
  "languageLedgerActive: true",
  "consentBoundaryActive: true",
  "cognitiveLoadGuardActive: true",
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
  "recommendedReadingOrder",
  "languageSteps",
  "toneChecks",
]) mustInclude(contract, "lib/market-integrity/vlm-brain-pass265-evidence-language-ledger.ts", marker);

for (const marker of [
  "buildVlmBrainPass265EvidenceLanguageLedger",
  "selectedTilePass265EvidenceLanguageLedger",
  'data-vlm-pass265-evidence-language-ledger="true"',
  "data-vlm-pass265-language-step",
  "data-vlm-pass265-tone-risk",
  "PASS265 marker: selected tile evidence language ledger",
]) mustInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

for (const marker of [
  "PASS265 — AI Brain evidence language ledger",
  ".shield-vlm-pass265-evidence-language-ledger",
  "data-vlm-pass265-language-step",
  "PASS265 — Lens evidence language guide",
  ".vlcr-pass265-evidence-language-guide",
  "prefers-reduced-motion: reduce",
]) mustInclude(css, "app/globals.css", marker);

for (const marker of [
  "PASS265 Lens evidence language guide",
  "vlcr-pass265-evidence-language-guide",
  "PASS265 evidence language ledger",
  "PASS265 Evidence-Language-Ledger",
  "source context",
  "Quellenkontext",
  "visible limits",
  "sichtbare Grenzen",
  "manual review",
  "Manual Review",
  "surface lock",
  "Surface-Lock",
]) mustInclude(lens, "components/search/VelmereLensCommandRouter.tsx", marker);

for (const marker of [
  "verify-pass265-evidence-language-ledger-consent-boundary-safety.mjs",
  "verify:pass265-evidence-language-ledger-consent-boundary",
]) mustInclude(pkg, "package.json", marker);

for (const marker of [
  "PASS265 AI Brain evidence language ledger consent boundary",
  "verify-pass265-evidence-language-ledger-consent-boundary-safety.mjs",
]) mustInclude(preflight, "scripts/vercel-preflight.mjs", marker);

for (const marker of [
  "PASS265 addition — AI Brain Evidence Language Ledger",
  "PASS265 marker: AI Brain Evidence Language Ledger active",
]) mustInclude(progress, "docs/progress/VELMERE_MASTER_BUILD_MAP.md", marker);

for (const marker of ["PASS265 marker: AI Brain Evidence Language Ledger active"]) {
  mustInclude(projectProgress, "lib/launch/project-progress.ts", marker);
  mustInclude(masterAreas, "lib/launch/master-build-areas.ts", marker);
}

for (const [file, source] of [
  ["PASS265 contract", contract],
  ["PASS265 Lens copy", lens],
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
  console.error("PASS265 evidence language ledger consent boundary guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS265 evidence language ledger consent boundary guard passed.");
