#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const mustInclude = (source, file, marker) => {
  if (!source.includes(marker)) errors.push(`${file}: missing ${marker}`);
};

const contract = read("lib/market-integrity/vlm-brain-pass258-proof-receipt-lock.ts");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const lens = read("components/search/VelmereLensCommandRouter.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const progress = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");

for (const marker of [
  "vlm-brain-pass258-proof-receipt-lock-v1",
  "PASS258_VLM_BRAIN_PROOF_RECEIPT_LOCK_CONTRACT",
  "operator_proof_receipt_lock_browser_trace_pack",
  "publicExportAllowed: false",
  "rawPayloadAllowed: false",
  "binaryPdfAllowed: false",
  "walletAccessAllowed: false",
  "customerCopyAllowed: false",
  "releaseReceiptSigned: false",
  "browserTraceAttached: false",
  "durableSnapshotAttached: false",
  "redactionManifestAttached: false",
  "proofReceiptLockActive: true",
]) mustInclude(contract, "lib/market-integrity/vlm-brain-pass258-proof-receipt-lock.ts", marker);

for (const marker of [
  "buildVlmBrainPass258ProofReceiptLock",
  "selectedTilePass258ProofReceiptLock",
  'data-vlm-pass258-proof-receipt-lock="true"',
  "data-vlm-pass258-proof-receipt",
  "data-vlm-pass258-signoff-state",
  "data-vlm-pass258-browser-trace",
  "data-vlm-pass258-release-lock",
]) mustInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

for (const marker of [
  "PASS258 — AI Brain proof receipt lock",
  ".shield-vlm-pass258-proof-receipt-lock",
  "data-vlm-pass258-proof-receipt",
  "PASS258 — Lens proof receipt lock guide",
  ".vlcr-pass258-receipt-guide",
  "prefers-reduced-motion: reduce",
]) mustInclude(css, "app/globals.css", marker);

for (const marker of [
  "PASS258 Lens proof receipt lock guide",
  "vlcr-pass258-receipt-guide",
  "PASS258 proof receipt lock",
  "PASS258 Proof-Receipt-Lock",
  "browser trace pack",
  "Browser-Trace-Pack",
]) mustInclude(lens, "components/search/VelmereLensCommandRouter.tsx", marker);

for (const marker of [
  "verify-pass258-proof-receipt-lock-browser-trace-pack-safety.mjs",
  "verify:pass258-proof-receipt-lock-browser-trace-pack",
]) mustInclude(pkg, "package.json", marker);

for (const marker of [
  "PASS258 AI Brain proof receipt lock browser trace pack guard",
  "verify-pass258-proof-receipt-lock-browser-trace-pack-safety.mjs",
]) mustInclude(preflight, "scripts/vercel-preflight.mjs", marker);

for (const marker of [
  "PASS258 addition — AI Brain Proof Receipt Lock Browser Trace Pack",
  "PASS258 marker: AI Brain Proof Receipt Lock active",
]) mustInclude(progress, "docs/progress/VELMERE_MASTER_BUILD_MAP.md", marker);

for (const [file, source] of [
  ["PASS258 contract", contract],
  ["PASS258 Lens copy", lens],
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
  ]) {
    if (source.toLowerCase().includes(unsafe.toLowerCase())) {
      errors.push(`${file}: unsafe wording found: ${unsafe}`);
    }
  }
}

if (errors.length) {
  console.error("PASS258 proof receipt lock browser trace pack guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS258 proof receipt lock browser trace pack guard passed.");
