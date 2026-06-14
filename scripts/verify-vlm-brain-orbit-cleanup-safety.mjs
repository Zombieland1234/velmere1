import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const marketClient = read("components/market-integrity/MarketIntegrityClient.tsx");
const css = read("app/globals.css");
const progress = read("lib/launch/project-progress.ts");
const siteAudit = read("lib/launch/site-page-audit.ts");

for (const needle of [
  'type MotionPreset = "orbit" | "static"',
  'PASS149 hard guard: Orbit 360 belongs only to Advanced',
  'allowedMotionPresets',
  'targetFrameMs = orbitUpdateFrameMs',
  'const flyMs = reducedMotion ? 420 : isAdvanced ? 5600 : 3600',
  'selectedTileEvidenceCopy',
  'sourceState',
  'Basic/Pro never re-enable the heavy scene',
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal.tsx missing PASS148 marker: ${needle}`);
}

for (const forbidden of [
  '(["orbit", "lite", "static"]',
  'ui.motionLite',
  'motionPreset === "lite"',
  'shield-vlm-motion-lite" : ""',
  'shield-mode-guide mt-4',
]) {
  if (modal.includes(forbidden)) errors.push(`TokenRiskModal.tsx still contains removed PASS148 UI pattern: ${forbidden}`);
}

for (const needle of [
  "shield-suggestion-token-avatar",
  "localLookup",
  "shield-token-search-suggest-row",
  "rank #",
]) {
  if (!marketClient.includes(needle)) errors.push(`MarketIntegrityClient.tsx missing suggestion logo marker: ${needle}`);
}

for (const needle of [
  "PASS148 — VLM brain cleanup",
  ".shield-vlm-detail-panel-side",
  ".shield-token-search-suggest-panel",
  ".shield-suggestion-token-avatar",
  ".shield-token-action-panel .shield-mode-guide",
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing PASS148 CSS marker: ${needle}`);
}

for (const needle of ['id: "vlm-brain-orbit-cleanup"', 'shield-modal"', 'vlm-visual-brain"', 'ai-risk-brain"']) {
  if (!progress.includes(needle)) errors.push(`project-progress.ts missing orbit cleanup progress marker: ${needle}`);
}

if (!(siteAudit.includes("logo-backed suggestions") || siteAudit.includes("token avatars/source badges"))) {
  errors.push("site-page-audit.ts must mention search logo/avatar state.");
}
if (!(siteAudit.includes("VLM brain cleanup") || siteAudit.includes("Orbit 360") || siteAudit.includes("full-screen Evidence Board"))) {
  errors.push("site-page-audit.ts must mention VLM brain cleanup or the new orbit/board state.");
}

for (const forbidden of [
  "guaranteed profit",
  "buy signal",
  "sell signal",
  "scam confirmed",
  "fraud proven",
  "risk-free",
]) {
  const haystack = `${modal}\n${marketClient}\n${css}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) errors.push(`Forbidden financial/safety wording found: ${forbidden}`);
}

if (errors.length) {
  console.error("VLM brain orbit cleanup safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("VLM brain orbit cleanup safety checks passed.");
