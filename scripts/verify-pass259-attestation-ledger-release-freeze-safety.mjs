#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const mustInclude = (source, file, marker) => {
  if (!source.includes(marker)) errors.push(`${file}: missing ${marker}`);
};

const contract = read("lib/market-integrity/vlm-brain-pass259-attestation-ledger.ts");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const lens = read("components/search/VelmereLensCommandRouter.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const progress = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const projectProgress = read("lib/launch/project-progress.ts");
const masterAreas = read("lib/launch/master-build-areas.ts");

for (const marker of [
  "vlm-brain-pass259-attestation-ledger-v1",
  "PASS259_VLM_BRAIN_ATTESTATION_LEDGER_CONTRACT",
  "operator_attestation_ledger_release_freeze",
  "publicExportAllowed: false",
  "rawPayloadAllowed: false",
  "binaryPdfAllowed: false",
  "walletAccessAllowed: false",
  "customerCopyAllowed: false",
  "releasePromotionAllowed: false",
  "attestationLedgerActive: true",
  "sourceAttestationReady: false",
  "browserAttestationReady: false",
  "storageAttestationReady: false",
  "redactionAttestationReady: false",
]) mustInclude(contract, "lib/market-integrity/vlm-brain-pass259-attestation-ledger.ts", marker);

for (const marker of [
  "buildVlmBrainPass259AttestationLedger",
  "selectedTilePass259AttestationLedger",
  'data-vlm-pass259-attestation-ledger="true"',
  "data-vlm-pass259-attestation-state",
  "data-vlm-pass259-freeze-state",
  "data-vlm-pass259-check-state",
  "data-vlm-pass259-trace-state",
]) mustInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

for (const marker of [
  "PASS259 — AI Brain attestation ledger",
  ".shield-vlm-pass259-attestation-ledger",
  "data-vlm-pass259-attestation-state",
  "PASS259 — Lens attestation ledger guide",
  ".vlcr-pass259-attestation-guide",
  "prefers-reduced-motion: reduce",
]) mustInclude(css, "app/globals.css", marker);

for (const marker of [
  "PASS259 Lens attestation ledger guide",
  "vlcr-pass259-attestation-guide",
  "PASS259 attestation ledger",
  "PASS259 Attestation-Ledger",
  "promotion checklist",
  "Promotion-Checklist",
]) mustInclude(lens, "components/search/VelmereLensCommandRouter.tsx", marker);

for (const marker of [
  "verify-pass259-attestation-ledger-release-freeze-safety.mjs",
  "verify:pass259-attestation-ledger-release-freeze",
]) mustInclude(pkg, "package.json", marker);

for (const marker of [
  "PASS259 AI Brain attestation ledger release freeze guard",
  "verify-pass259-attestation-ledger-release-freeze-safety.mjs",
]) mustInclude(preflight, "scripts/vercel-preflight.mjs", marker);

for (const marker of [
  "PASS259 addition — AI Brain Attestation Ledger Release Freeze",
  "PASS259 marker: AI Brain Attestation Ledger active",
]) mustInclude(progress, "docs/progress/VELMERE_MASTER_BUILD_MAP.md", marker);

for (const marker of [
  "PASS259 marker: AI Brain Attestation Ledger active",
]) {
  mustInclude(projectProgress, "lib/launch/project-progress.ts", marker);
  mustInclude(masterAreas, "lib/launch/master-build-areas.ts", marker);
}

for (const [file, source] of [
  ["PASS259 contract", contract],
  ["PASS259 Lens copy", lens],
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
  console.error("PASS259 attestation ledger release freeze guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS259 attestation ledger release freeze guard passed.");
