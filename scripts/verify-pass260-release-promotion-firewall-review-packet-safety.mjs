#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const mustInclude = (source, file, marker) => {
  if (!source.includes(marker)) errors.push(`${file}: missing ${marker}`);
};

const contract = read("lib/market-integrity/vlm-brain-pass260-release-promotion-firewall.ts");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const lens = read("components/search/VelmereLensCommandRouter.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const progress = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const projectProgress = read("lib/launch/project-progress.ts");
const masterAreas = read("lib/launch/master-build-areas.ts");

for (const marker of [
  "vlm-brain-pass260-release-promotion-firewall-v1",
  "PASS260_VLM_BRAIN_RELEASE_PROMOTION_FIREWALL_CONTRACT",
  "operator_release_promotion_firewall_review_packet",
  "publicExportAllowed: false",
  "rawPayloadAllowed: false",
  "binaryPdfAllowed: false",
  "walletAccessAllowed: false",
  "customerCopyAllowed: false",
  "releasePromotionAllowed: false",
  "publicReleaseBadgeAllowed: false",
  "finalVerdictAllowed: false",
  "reviewPacketReady: false",
  "promotionFirewallActive: true",
]) mustInclude(contract, "lib/market-integrity/vlm-brain-pass260-release-promotion-firewall.ts", marker);

for (const marker of [
  "buildVlmBrainPass260ReleasePromotionFirewall",
  "selectedTilePass260PromotionFirewall",
  'data-vlm-pass260-promotion-firewall="true"',
  "data-vlm-pass260-promotion-lane",
  "data-vlm-pass260-review-packet",
  "data-vlm-pass260-customer-freeze",
]) mustInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

for (const marker of [
  "PASS260 — AI Brain release promotion firewall",
  ".shield-vlm-pass260-promotion-firewall",
  "data-vlm-pass260-promotion-lane",
  "PASS260 — Lens promotion firewall guide",
  ".vlcr-pass260-promotion-firewall-guide",
  "prefers-reduced-motion: reduce",
]) mustInclude(css, "app/globals.css", marker);

for (const marker of [
  "PASS260 Lens promotion firewall guide",
  "vlcr-pass260-promotion-firewall-guide",
  "PASS260 promotion firewall",
  "PASS260 Promotion-Firewall",
  "release badge lock",
  "Release-Badge-Lock",
]) mustInclude(lens, "components/search/VelmereLensCommandRouter.tsx", marker);

for (const marker of [
  "verify-pass260-release-promotion-firewall-review-packet-safety.mjs",
  "verify:pass260-release-promotion-firewall-review-packet",
]) mustInclude(pkg, "package.json", marker);

for (const marker of [
  "PASS260 AI Brain release promotion firewall review packet guard",
  "verify-pass260-release-promotion-firewall-review-packet-safety.mjs",
]) mustInclude(preflight, "scripts/vercel-preflight.mjs", marker);

for (const marker of [
  "PASS260 addition — AI Brain Release Promotion Firewall Review Packet",
  "PASS260 marker: AI Brain Release Promotion Firewall active",
]) mustInclude(progress, "docs/progress/VELMERE_MASTER_BUILD_MAP.md", marker);

for (const marker of ["PASS260 marker: AI Brain Release Promotion Firewall active"]) {
  mustInclude(projectProgress, "lib/launch/project-progress.ts", marker);
  mustInclude(masterAreas, "lib/launch/master-build-areas.ts", marker);
}

for (const [file, source] of [
  ["PASS260 contract", contract],
  ["PASS260 Lens copy", lens],
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
  console.error("PASS260 release promotion firewall review packet guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS260 release promotion firewall review packet guard passed.");
