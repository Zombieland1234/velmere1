import { readFileSync, existsSync } from "node:fs";

const failures = [];
for (const file of [
  "components/market-integrity/TokenRiskModal.tsx",
  "app/globals.css",
  "VELMERE_PASS163_SOURCE_SPINE_READINESS_REPORT.md",
  "VELMERE_PASS163_FULL_PROGRESS_MATRIX.md",
]) {
  if (!existsSync(file)) failures.push(`${file} is missing`);
}

const modal = readFileSync("components/market-integrity/TokenRiskModal.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const matrix = readFileSync("VELMERE_PASS163_FULL_PROGRESS_MATRIX.md", "utf8");

for (const token of [
  "sourceSpineRows",
  "sourceSpineReadyCount",
  "shield-source-spine-panel",
  "shield-source-spine-row-live",
  "shield-source-spine-row-blocked",
]) {
  if (!modal.includes(token) && !css.includes(token)) failures.push(`Missing source spine token: ${token}`);
}

for (const area of [
  "Source adapters / live feeds",
  "Data provenance / timestamps",
  "Audit ledger / persistence",
  "OSINT queue / analyst workflow",
]) {
  if (!matrix.includes(area)) failures.push(`Progress matrix missing area: ${area}`);
}

if (failures.length) {
  console.error("PASS163 source spine safety failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS163 source spine safety OK");
