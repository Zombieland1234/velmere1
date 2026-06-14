import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function has(src, token, label) { if (!src.includes(token)) errors.push(`${label}: missing ${token}`); }

const map = read("lib/launch/master-build-areas.ts");
const ledger = read("docs/progress/PROJECT_PROGRESS_LEDGER.md");
const mapDoc = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");

has(map, "velmereMasterBuildAreas", "master-build-areas");
has(map, "PASS198 marker", "master-build-areas");
for (const group of ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"]) {
  has(map, `group: "${group}"`, "master-build-areas groups");
}
for (const token of [
  "Vercel build safety",
  "Shield search dropdown",
  "VLM Orbit 360 shell",
  "Velmère Lens command router",
  "API Abuse Shield",
  "Stripe checkout",
  "Wallet connect readiness",
  "Research Lab",
  "SEO metadata",
  "Durable audit ledger",
  "Holder feed",
  "Velmère Shield Report",
]) has(map, token, "master-build-areas coverage");

const areaCount = (map.match(/id: "/g) || []).length;
if (areaCount < 90) errors.push(`master-build-areas: expected at least 90 granular areas, found ${areaCount}`);

for (const token of ["PASS 198", "Master build area coverage", "A–M granular tracking"]) has(ledger, token, "PROJECT_PROGRESS_LEDGER");
for (const token of ["Velmère Master Build Map", "PASS198 zasada raportowania", "| ID | Grupa | Obszar | Progress | Status | Najbliższy krok |"]) has(mapDoc, token, "VELMERE_MASTER_BUILD_MAP.md");
for (const token of ["master-build-map", "backend-source-adapters", "report-pdf-generator", "wallet-access-gating", "seo-accessibility-mobile", "PASS198 marker"]) has(progress, token, "project-progress");
for (const token of ["velmere-lens", "security-trust", "reports-evidence", "PASS198 audit marker"]) has(audit, token, "site-page-audit");
for (const token of ["verify:pass198-master-build-map", "verify-pass198-master-build-map-safety.mjs"]) has(pkg, token, "package.json");
for (const token of ["PASS198 expanded master build map guard", "verify-pass198-master-build-map-safety.mjs", "VELMERE_MASTER_BUILD_MAP.md"]) has(preflight, token, "vercel-preflight");

const unsafe = `${map}
${ledger}
${mapDoc}
${progress}
${audit}`.toLowerCase();
for (const word of ["guaranteed profit", "risk-free", "safe investment", "scam confirmed", "enter seed phrase", "buy signal", "sell signal", "not do zhakowania"]) {
  if (unsafe.includes(word)) errors.push(`Forbidden wording found: ${word}`);
}

if (errors.length) {
  console.error("PASS198 master build map safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`PASS198 master build map safety OK · ${areaCount} granular areas tracked`);
