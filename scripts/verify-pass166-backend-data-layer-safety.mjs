import { readFileSync, existsSync } from "node:fs";

const failures = [];
const required = [
  "lib/launch/production-data-backbone.ts",
  "lib/launch/ops-telemetry.ts",
  "components/launch/ProductionDataBackbonePanel.tsx",
  "app/api/ops/readiness/route.ts",
  "VELMERE_PASS166_BACKEND_DATA_LAYER_REPORT.md",
  "VELMERE_PASS166_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!existsSync(file)) failures.push(`${file} is missing`);
}

const backbone = readFileSync("lib/launch/production-data-backbone.ts", "utf8");
const telemetry = readFileSync("lib/launch/ops-telemetry.ts", "utf8");
const panel = readFileSync("components/launch/ProductionDataBackbonePanel.tsx", "utf8");
const route = readFileSync("app/api/ops/readiness/route.ts", "utf8");
const matrix = readFileSync("VELMERE_PASS166_FULL_PROGRESS_MATRIX.md", "utf8");

for (const token of [
  "durable-audit-ledger",
  "source-freshness-registry",
  "analytics-event-taxonomy",
  "storage-adapter-contract",
  "privacy-redaction-envelope",
]) {
  if (!backbone.includes(token)) failures.push(`Backbone missing token: ${token}`);
}

for (const token of [
  "sanitizeTelemetryPayload",
  "allowedPayloadKeys",
  "blockedKeyPattern",
  "storageWritePerformed: false",
]) {
  if (!telemetry.includes(token)) failures.push(`Telemetry missing safety token: ${token}`);
}

for (const token of [
  "ProductionDataBackbonePanel",
  "telemetryPreview",
  "telemetryReadinessChecklist",
  "productionBoundary",
]) {
  if (!panel.includes(token)) failures.push(`Panel missing token: ${token}`);
}

for (const token of ["readiness_preview_only", "storageWritePerformed: false", "no-store"]) {
  if (!route.includes(token)) failures.push(`Route missing token: ${token}`);
}

for (const file of [
  "app/[locale]/account/page.tsx",
  "app/[locale]/dashboard/page.tsx",
  "app/[locale]/market-integrity/page.tsx",
  "app/[locale]/checkout/page.tsx",
]) {
  const source = readFileSync(file, "utf8");
  if (!source.includes("ProductionDataBackbonePanel")) failures.push(`${file} does not render ProductionDataBackbonePanel`);
}

for (const area of [
  "Audit ledger / persistence",
  "Source adapters / live feeds",
  "Analytics / telemetry readiness",
  "Security / secret redaction",
]) {
  if (!matrix.includes(area)) failures.push(`Progress matrix missing area: ${area}`);
}

if (failures.length) {
  console.error("PASS166 backend data layer safety failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS166 backend data layer safety OK");
