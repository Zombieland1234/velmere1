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
  requireIncludes("lib/market-integrity/vlm-brain-release-review-packet.ts", [
    "VlmBrainReleaseReviewPacket",
    "vlm-brain-release-review-packet-v1-pass215",
    "operator_release_packet_preview",
    "buildVlmBrainReleaseReviewPacket",
    "PASS215_VLM_BRAIN_RELEASE_REVIEW_PACKET_CONTRACT",
  ]);
  requireIncludes("components/market-integrity/TokenRiskModal.tsx", [
    "buildVlmBrainReleaseReviewPacket",
    "selectedTileReleaseReviewPacket",
    "data-vlm-release-review-packet=\"pass215\"",
    "PASS215 marker",
  ]);
  requireIncludes("app/globals.css", [
    "PASS215 — AI Brain release review packet",
    ".shield-vlm-release-review-packet",
    "data-vlm-release-lane",
    "data-vlm-release-decision",
  ]);
  requireIncludes("lib/launch/master-build-progress-delta-pass215.ts", [
    "velmerePass215ProgressDeltas",
    "PASS215_AI_BRAIN_RELEASE_REVIEW_PACKET_DELTA",
    "Report download route",
  ]);
  requireIncludes("lib/launch/master-build-areas.ts", [
    "pass215AiBrainReleaseReviewPacket: true",
    "PASS215 marker: AI Brain release review packet",
  ]);
  requireIncludes("docs/progress/PASS215_AI_BRAIN_RELEASE_REVIEW_PACKET.md", [
    "PASS215 — AI Brain Release Review Packet",
    "source coverage, freshness, redaction, durable case storage, customer copy and PDF route",
  ]);
  requireIncludes("docs/progress/PROJECT_PROGRESS_LEDGER.md", [
    "PASS215 — AI Brain Release Review Packet",
    "PASS215 product delta",
  ]);
  const releasePacket = read("lib/market-integrity/vlm-brain-release-review-packet.ts").toLowerCase();
  const forbidden = [
    "guaranteed profit",
    "risk-free",
    "safe investment",
    "buy signal",
    "sell signal",
    "scam confirmed",
    "fraud proven",
    "enter seed phrase",
  ];
  for (const needle of forbidden) {
    if (releasePacket.includes(needle)) errors.push(`vlm-brain-release-review-packet.ts: forbidden wording ${needle}`);
  }
  if (!releasePacket.includes("pdfPreview") && !releasePacket.includes("pdfpreview")) {
    errors.push("vlm-brain-release-review-packet.ts: missing PDF preview gate");
  }
} catch (error) {
  errors.push(`PASS215 release review packet guard crashed: ${error instanceof Error ? error.message : String(error)}`);
}

if (errors.length) {
  console.error("PASS215 release review packet guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS215 release review packet guard OK");
