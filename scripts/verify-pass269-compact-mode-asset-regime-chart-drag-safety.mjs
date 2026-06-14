import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
const mustInclude = (content, path, marker) => {
  if (!content.includes(marker)) failures.push(`${path} missing marker: ${marker}`);
};
const mustNotInclude = (content, path, marker) => {
  if (content.includes(marker)) failures.push(`${path} still contains forbidden marker: ${marker}`);
};

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const assetRegime = read("lib/market-integrity/asset-regime.ts");
const delta = read("lib/launch/master-build-progress-delta-pass269.ts");
const areas = read("lib/launch/master-build-areas.ts");
const progress = read("lib/launch/project-progress.ts");
const pkg = read("package.json");

for (const marker of [
  "PASS269 guard compatibility",
  "buildTokenAssetRegime(result)",
  "data-pass269-compact-mode-dock",
  "data-pass269-asset-regime-gate",
  "data-pass269-direct-drag-fix=\"visual-follows-hand\"",
  "setWindowOffset(clampOffset(dragRef.current.startOffset - deltaBars))",
]) mustInclude(modal, "components/market-integrity/TokenRiskModal.tsx", marker);

for (const marker of [
  "shield-pass269-action-header",
  "shield-pass269-regime-strip",
  "shield-popup-chart-premium[data-pass269-direct-drag-fix=\"visual-follows-hand\"]",
  "PASS269 — compact VLM mode dock",
]) mustInclude(css, "app/globals.css", marker);

for (const marker of [
  "velmere_asset_regime_v1_pass269",
  "commodity_backed",
  "stable_or_pegged",
  "custody proof required",
  "peg proof required",
]) mustInclude(assetRegime, "lib/market-integrity/asset-regime.ts", marker);

for (const marker of [
  "Compact mode dock + asset-regime reserve gate + direct chart drag correction",
  "C09",
  "velmere_asset_regime_v1_pass269",
]) mustInclude(delta, "lib/launch/master-build-progress-delta-pass269.ts", marker);

for (const marker of [
  "PASS269 marker: Compact mode dock",
  "progress: 40",
  "PASS269 adds an asset-regime reserve/peg/custody gate",
]) mustInclude(areas, "lib/launch/master-build-areas.ts", marker);

for (const marker of [
  "PASS269 marker: Compact mode dock",
  "C09 stablecoin behavior 40",
]) mustInclude(progress, "lib/launch/project-progress.ts", marker);

mustInclude(pkg, "package.json", "verify:pass269-compact-mode-asset-regime-chart-drag");
mustInclude(pkg, "package.json", "verify:shield-all");

// The visible modal mode dock should not render the old paragraph-heavy title/body block anymore.
mustNotInclude(modal, "components/market-integrity/TokenRiskModal.tsx", "{ui.controlTitle}\n                </h3>");
mustNotInclude(modal, "components/market-integrity/TokenRiskModal.tsx", "{ui.controlBody}\n                </p>");
mustNotInclude(modal, "components/market-integrity/TokenRiskModal.tsx", "<p>{ui.summaryDisclaimer}</p>");

if (failures.length) {
  console.error("PASS269 compact mode / asset regime / chart drag guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS269 compact mode / asset regime / chart drag guard passed.");
