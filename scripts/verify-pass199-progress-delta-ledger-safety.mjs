import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const has = (src, token, label) => {
  if (!src.includes(token)) errors.push(`${label}: missing ${token}`);
};

const map = read("lib/launch/master-build-areas.ts");
const delta = read("lib/launch/master-build-progress-delta.ts");
const mapDoc = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const deltaDoc = read("docs/progress/PASS199_PROGRESS_DELTA_LEDGER.md");
const ledger = read("docs/progress/PROJECT_PROGRESS_LEDGER.md");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");

for (const token of [
  "PASS199 marker: progress delta ledger active",
  "pass199DeltaLedger: true",
  "A05",
  "C02",
  "J04",
  "K03",
  "M07",
]) has(map, token, "master-build-areas");

for (const token of [
  "velmerePass199ProgressDeltas",
  "Previous → Current → Change",
  "getVelmerePass199ProgressDeltaRows",
  "changedAreas",
  "totalDelta",
]) has(delta, token, "master-build-progress-delta");

const deltaCount = (delta.match(/previous: /g) || []).length;
if (deltaCount < 10) errors.push(`master-build-progress-delta: expected at least 10 delta rows, found ${deltaCount}`);

for (const token of [
  "PASS199 — delta procentowa",
  "Previous → Current → Change",
  "PASS199 delta — obszary ruszone w tym passie",
  "| A05 | Preflight guard system | 99% | 100% | +1% |",
  "| K03 | Analytics event taxonomy | 35% | 39% | +4% |",
]) has(mapDoc, token, "VELMERE_MASTER_BUILD_MAP.md");

for (const token of [
  "PASS199 — Progress Delta Ledger",
  "Previous → Current → Change progress table is mandatory",
  "Uczciwe ograniczenie",
]) has(deltaDoc, token, "PASS199_PROGRESS_DELTA_LEDGER.md");

for (const token of ["PASS 199", "Progress Delta Ledger", "Progress delta"]) has(ledger, token, "PROJECT_PROGRESS_LEDGER");
for (const token of ["progress-delta-ledger", "PASS199 marker"]) has(progress, token, "project-progress");
for (const token of ["PASS199 audit marker", "progress deltas"]) has(audit, token, "site-page-audit");
for (const token of ["verify:pass199-progress-delta-ledger", "verify-pass199-progress-delta-ledger-safety.mjs"]) has(pkg, token, "package.json");
for (const token of ["PASS199 progress delta ledger guard", "verify-pass199-progress-delta-ledger-safety.mjs"]) has(preflight, token, "vercel-preflight");

const areaCount = (map.match(/id: "/g) || []).length;
if (areaCount < 100) errors.push(`master-build-areas: expected at least 100 granular areas, found ${areaCount}`);

const unsafe = `${map}\n${delta}\n${mapDoc}\n${deltaDoc}\n${ledger}\n${progress}\n${audit}`.toLowerCase();
for (const word of ["guaranteed profit", "risk-free", "safe investment", "scam confirmed", "enter seed phrase", "buy signal", "sell signal", "not do zhakowania"]) {
  if (unsafe.includes(word)) errors.push(`Forbidden wording found: ${word}`);
}

if (errors.length) {
  console.error("PASS199 progress delta ledger safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS199 progress delta ledger safety OK · ${areaCount} areas · ${deltaCount} delta rows`);
