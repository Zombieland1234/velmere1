#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const mustInclude = (source, file, marker) => {
  if (!source.includes(marker)) errors.push(`${file}: missing ${marker}`);
};
const mustNotInclude = (source, file, marker) => {
  if (source.includes(marker)) errors.push(`${file}: still contains ${marker}`);
};

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const progress = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const projectProgress = read("lib/launch/project-progress.ts");
const masterAreas = read("lib/launch/master-build-areas.ts");
const delta = read("lib/launch/master-build-progress-delta-pass268.ts");
const passDoc = read("docs/progress/PASS268_CHART_GESTURE_MODE_DOCK.md");
const pkg = read("package.json");

for (const marker of [
  "PASS268 guard compatibility: chart natural-pan and no-opis mode dock active",
  "setWindowOffset(clampOffset(dragRef.current.startOffset + deltaBars));",
  "data-pass268-natural-pan=\"same-direction\"",
  "shield-pass268-trust-rail",
  "data-pass268-trust-rail",
  "przeciągnij: prawo = prawo, lewo = lewo",
]) mustInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

for (const marker of [
  "modeGuideOpen",
  "setModeGuideOpen",
  "analysisModeGuides",
  "className=\"shield-analysis-info-button",
  "className=\"shield-mode-guide-card shield-mode-guide-card-open shield-mode-guide-popup",
]) mustNotInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

for (const marker of [
  "PASS268 — natural chart pan + no-OPIS VLM mode dock",
  ".shield-analysis-row-clean",
  ".shield-pass268-trust-rail",
  ".shield-token-action-panel .shield-analysis-info-button",
  ".shield-popup-chart-guide",
]) mustInclude(css, "app/globals.css", marker);

for (const marker of [
  "PASS268_CHART_GESTURE_MODE_DOCK_DELTA",
  "velmerePass268ProgressDeltas",
  "Chart natural-pan + no-OPIS VLM mode dock",
  "no buy pressure",
]) mustInclude(delta, "lib/launch/master-build-progress-delta-pass268.ts", marker);

for (const marker of [
  "PASS268 addition — Chart natural-pan + no-OPIS VLM mode dock",
  "PASS268 marker: Chart natural pan + no-OPIS VLM mode dock active",
]) mustInclude(progress, "docs/progress/VELMERE_MASTER_BUILD_MAP.md", marker);

for (const marker of [
  "PASS268 marker: Chart natural pan + no-OPIS VLM mode dock active",
]) {
  mustInclude(projectProgress, "lib/launch/project-progress.ts", marker);
  mustInclude(masterAreas, "lib/launch/master-build-areas.ts", marker);
  mustInclude(passDoc, "docs/progress/PASS268_CHART_GESTURE_MODE_DOCK.md", marker);
}

for (const marker of [
  "verify-pass268-chart-gesture-mode-dock-safety.mjs",
  "verify:pass268-chart-gesture-mode-dock",
]) mustInclude(pkg, "package.json", marker);

if (errors.length) {
  console.error("PASS268 chart gesture / mode dock guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS268 chart gesture / mode dock guard passed.");
