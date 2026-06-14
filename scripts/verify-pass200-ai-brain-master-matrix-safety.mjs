import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const has = (src, token, label) => {
  if (!src.includes(token)) errors.push(`${label}: missing ${token}`);
};

const map = read("lib/launch/master-build-areas.ts");
const pass200Delta = read("lib/launch/master-build-progress-delta-pass200.ts");
const mapDoc = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const pass200Doc = read("docs/progress/PASS200_AI_BRAIN_MASTER_MATRIX.md");
const ledger = read("docs/progress/PROJECT_PROGRESS_LEDGER.md");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");

for (const token of [
  "PASS200 marker: AI Brain has explicit D01-D24 matrix coverage",
  "pass200AiBrainMatrix: true",
  "AI risk signal ontology",
  "Tile-specific explainer taxonomy",
  "Risk driver mapping",
  "Source confidence lanes",
  "Missing-data semantics",
  "Brain telemetry / FPS QA",
  "WebGL migration contract",
  "Brain accessibility / keyboard flow",
  "Brain copy localization PL/EN/DE",
]) has(map, token, "master-build-areas");

for (const id of ["D01", "D04", "D07", "D09", "D11", "D13", "D14", "D15", "D16", "D17", "D18", "D19", "D20", "D21", "D22", "D23", "D24"]) {
  has(pass200Delta, id, "master-build-progress-delta-pass200");
}
for (const token of ["velmerePass200ProgressDeltas", "newly_tracked", "productDelta", "getVelmerePass200ProgressDeltaRows", "Previous → Current → Change"]) {
  has(pass200Delta, token, "master-build-progress-delta-pass200");
}

const areaCount = (map.match(/id: "/g) || []).length;
if (areaCount < 110) errors.push(`master-build-areas: expected at least 110 areas after PASS200, found ${areaCount}`);
const dCount = (map.match(/group: "D"/g) || []).length;
if (dCount < 24) errors.push(`master-build-areas: expected at least 24 AI Brain/VLM rows in group D, found ${dCount}`);
const deltaCount = (pass200Delta.match(/previous: /g) || []).length;
if (deltaCount < 18) errors.push(`pass200 delta: expected at least 18 rows, found ${deltaCount}`);

for (const token of [
  "Velmère Master Build Map — PASS200",
  "mózg AI jest w mapie",
  "D01–D24",
  "PASS200 delta — obszary ruszone w tym passie",
  "Realny product delta istniejących obszarów",
]) has(mapDoc, token, "VELMERE_MASTER_BUILD_MAP.md");

for (const token of ["PASS200 — AI Brain Master Matrix", "AI Brain D01-D24", "Najważniejsze blockery AI Brain"]) {
  has(pass200Doc, token, "PASS200_AI_BRAIN_MASTER_MATRIX.md");
}
for (const token of ["PASS 200", "AI Brain Master Matrix", "D01-D24 Explicit Tracking"]) has(ledger, token, "PROJECT_PROGRESS_LEDGER");
for (const token of ["ai-brain-master-matrix", "PASS200 marker"]) has(progress, token, "project-progress");
for (const token of ["PASS200 audit marker", "D01-D24"]) has(audit, token, "site-page-audit");
for (const token of ["verify:pass200-ai-brain-master-matrix", "verify-pass200-ai-brain-master-matrix-safety.mjs"]) has(pkg, token, "package.json");
for (const token of ["PASS200 AI Brain master matrix guard", "verify-pass200-ai-brain-master-matrix-safety.mjs", "PASS200_AI_BRAIN_MASTER_MATRIX.md"]) has(preflight, token, "vercel-preflight");

const unsafe = `${map}\n${pass200Delta}\n${mapDoc}\n${pass200Doc}\n${ledger}\n${progress}\n${audit}`.toLowerCase();
for (const word of ["guaranteed profit", "risk-free", "safe investment", "scam confirmed", "enter seed phrase", "buy signal", "sell signal", "nie do zhakowania", "not do zhakowania"]) {
  if (unsafe.includes(word)) errors.push(`Forbidden wording found: ${word}`);
}

if (errors.length) {
  console.error("PASS200 AI Brain master matrix safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS200 AI Brain master matrix safety OK · ${areaCount} total areas · ${dCount} AI Brain rows · ${deltaCount} delta rows`);
