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
const shieldMap = read("components/market-integrity/ShieldMapClient.tsx");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const css = read("app/globals.css");
const progress = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const projectProgress = read("lib/launch/project-progress.ts");
const masterAreas = read("lib/launch/master-build-areas.ts");
const delta = read("lib/launch/master-build-progress-delta-pass267.ts");
const pkg = read("package.json");

for (const marker of [
  "data-vlm-brain-mode={mode}",
  "shield-vlm-detail-depth-note",
  "data-vlm-brain-depth-note={mode}",
]) mustInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

mustNotInclude(modal, "components/market-integrity/TokenRiskModal.tsx", "{tileSourceBadge}");

for (const marker of [
  "PASS267 — user screenshot hotfix",
  ".shield-vlm-tile-deck .shield-vlm-source-badge",
  ".shield-vlm-static-stage .shield-vlm-source-badge",
  ".shield-vlm-detail-portal-root[data-vlm-brain-mode=\"basic\"]",
  ".shield-vlm-detail-portal-root[data-vlm-brain-mode=\"pro\"]",
  ".vis-token-suggest-panel",
  ".shield-map-token-suggest-panel",
  ".shield-map-suggestion-avatar",
  ".vis-suggestion-token-avatar",
]) mustInclude(css, "app/globals.css", marker);

for (const marker of [
  "PASS267 marker: Lens search suggestions mirror Shield-style token rows",
  "type LensSuggestion",
  "lensSuggestionSeeds",
  "suggestionLabel",
  "vis-token-suggest-panel",
  "vis-suggestion-token-avatar",
  "selectSuggestion(item)",
]) mustInclude(lens, "components/search/VelmereIntelligenceSearchClient.tsx", marker);

for (const marker of [
  "createPortal",
  "function suggestionGlyph",
  "investigatorSuggestFrame",
  "shield-map-unified-search-shell",
  "shield-map-token-suggest-panel",
  "shield-map-suggestion-avatar",
  "void runInvestigatorScan(null, item.symbol)",
]) mustInclude(shieldMap, "components/market-integrity/ShieldMapClient.tsx", marker);

for (const marker of [
  "PASS267_LENS_SHIELDMAP_BRAIN_UI_HOTFIX_DELTA",
  "velmerePass267ProgressDeltas",
  "Lens / Shield Map / VLM Brain UI screenshot hotfix",
]) mustInclude(delta, "lib/launch/master-build-progress-delta-pass267.ts", marker);

for (const marker of [
  "PASS267 addition — Lens / Shield Map / VLM Brain UI screenshot hotfix",
  "PASS267 marker: Lens ShieldMap Brain UI hotfix active",
]) mustInclude(progress, "docs/progress/VELMERE_MASTER_BUILD_MAP.md", marker);

for (const marker of ["PASS267 marker: Lens ShieldMap Brain UI hotfix active"]) {
  mustInclude(projectProgress, "lib/launch/project-progress.ts", marker);
  mustInclude(masterAreas, "lib/launch/master-build-areas.ts", marker);
}

for (const marker of [
  "verify-pass267-lens-shieldmap-brain-ui-hotfix-safety.mjs",
  "verify:pass267-lens-shieldmap-brain-ui-hotfix",
]) mustInclude(pkg, "package.json", marker);

if (errors.length) {
  console.error("PASS267 Lens/ShieldMap/VLM Brain UI hotfix guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS267 Lens/ShieldMap/VLM Brain UI hotfix guard passed.");
