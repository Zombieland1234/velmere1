import { readFileSync, existsSync } from "node:fs";

const required = [
  "VELMERE_PASS162_FULL_PROGRESS_MATRIX.md",
  "components/market-integrity/TokenRiskModal.tsx",
  "app/globals.css",
];

const failures = [];
for (const file of required) {
  if (!existsSync(file)) failures.push(`${file} is missing`);
}

const modal = readFileSync("components/market-integrity/TokenRiskModal.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const matrix = readFileSync("VELMERE_PASS162_FULL_PROGRESS_MATRIX.md", "utf8");

for (const token of [
  "severityLabel",
  "inputTrace",
  "intelligenceLabels",
  "shield-vlm-detail-severity",
]) {
  if (!modal.includes(token) && !css.includes(token)) failures.push(`Missing PASS162 token: ${token}`);
}

for (const area of [
  "Admin auth / operator gates",
  "Audit ledger / persistence",
  "Source adapters / live feeds",
  "Risk-engine model quality",
  "Analytics / telemetry readiness",
]) {
  if (!matrix.includes(area)) failures.push(`Progress matrix missing area: ${area}`);
}

if (failures.length) {
  console.error("PASS162 progress matrix safety failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS162 progress matrix safety OK");
