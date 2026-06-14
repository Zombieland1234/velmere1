import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const required = [
  "lib/market-integrity/live-source-adapter-contract.ts",
  "components/market-integrity/MarketIntegritySourceReadinessPanel.tsx",
  "components/launch/RealBrowserQaPanel.tsx",
  "app/api/market-integrity/source-readiness/route.ts",
  "VELMERE_PASS173_REAL_BROWSER_SOURCE_READINESS_REPORT.md",
  "VELMERE_PASS173_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const contract = read("lib/market-integrity/live-source-adapter-contract.ts");
const sourcePanel = read("components/market-integrity/MarketIntegritySourceReadinessPanel.tsx");
const qaPanel = read("components/launch/RealBrowserQaPanel.tsx");
const route = read("app/api/market-integrity/source-readiness/route.ts");
const marketPage = read("app/[locale]/market-integrity/page.tsx");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS173_FULL_PROGRESS_MATRIX.md");

for (const token of [
  "MarketIntegritySourceLane",
  "marketIntegritySourceFreshnessRules",
  "targetTtlSeconds",
  "staleAfterSeconds",
  "mustNeverClaim",
  "createMarketIntegritySourceReadinessSnapshot",
]) {
  if (!contract.includes(token)) errors.push(`Source adapter contract missing token: ${token}`);
}

for (const lane of ["orderbook", "holders", "contract", "unlocks", "osint"]) {
  if (!contract.includes(`lane: "${lane}"`)) errors.push(`Source adapter contract missing lane: ${lane}`);
}

for (const token of ["MarketIntegritySourceReadinessPanel", "summary.nextCriticalStep", "secondsToLabel", "misr-shell"]) {
  if (!sourcePanel.includes(token) && !css.includes(token)) errors.push(`Source readiness UI/CSS missing token: ${token}`);
}

for (const token of ["RealBrowserQaPanel", "Orbit Basic", "Orbit Pro", "Orbit Advanced", "Reduced motion", "Mobile overlap"]) {
  if (!qaPanel.includes(token)) errors.push(`Real browser QA panel missing token: ${token}`);
}

for (const token of ["source_readiness_preview_only", "storageWritePerformed", "no-store", "does not fetch third-party data"]) {
  if (!route.includes(token)) errors.push(`Source readiness route missing safety token: ${token}`);
}

for (const token of ["MarketIntegritySourceReadinessPanel", "RealBrowserQaPanel"]) {
  if (!marketPage.includes(token)) errors.push(`market-integrity page does not render ${token}`);
}

for (const token of ["PASS173 · real browser QA + market integrity source readiness", ".misr-shell", ".rbqa-shell"]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS173 CSS marker: ${token}`);
}

for (const token of ["verify-pass173-browser-source-readiness-safety.mjs", "PASS173"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing marker: ${token}`);
}

for (const area of ["Real browser QA lane", "Source adapters / live feeds", "Data provenance / timestamps"]) {
  if (!matrix.includes(area)) errors.push(`PASS173 matrix missing area: ${area}`);
}

if (errors.length) {
  console.error("PASS173 browser/source readiness safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS173 browser/source readiness safety OK");
