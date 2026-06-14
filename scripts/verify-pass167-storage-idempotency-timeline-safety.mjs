import { readFileSync, existsSync } from "node:fs";

const failures = [];
const required = [
  "lib/launch/server-storage-adapter.ts",
  "components/launch/StorageAdapterReadinessPanel.tsx",
  "components/launch/AccountOrderEventTimelinePanel.tsx",
  "app/api/ops/storage-preview/route.ts",
  "VELMERE_PASS167_STORAGE_IDEMPOTENCY_TIMELINE_REPORT.md",
  "VELMERE_PASS167_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!existsSync(file)) failures.push(`${file} is missing`);
}

const adapter = readFileSync("lib/launch/server-storage-adapter.ts", "utf8");
const storagePanel = readFileSync("components/launch/StorageAdapterReadinessPanel.tsx", "utf8");
const timelinePanel = readFileSync("components/launch/AccountOrderEventTimelinePanel.tsx", "utf8");
const route = readFileSync("app/api/ops/storage-preview/route.ts", "utf8");
const modal = readFileSync("components/market-integrity/TokenRiskModal.tsx", "utf8");
const matrix = readFileSync("VELMERE_PASS167_FULL_PROGRESS_MATRIX.md", "utf8");

for (const token of [
  "buildIdempotencyKey",
  "createStorageWritePreview",
  "storageWritePerformed: false",
  "serverOnlyRequired: true",
  "audit-event-write",
  "order-event-timeline",
]) {
  if (!adapter.includes(token)) failures.push(`Adapter missing token: ${token}`);
}

for (const token of ["StorageAdapterReadinessPanel", "sar-shell", "blockedBy", "preview"]) {
  if (!storagePanel.includes(token) && !readFileSync("app/globals.css", "utf8").includes(token)) failures.push(`Storage panel/CSS missing token: ${token}`);
}

for (const token of ["AccountOrderEventTimelinePanel", "payment_confirmed", "provider_submitted", "return_requested", "refunded"]) {
  if (!timelinePanel.includes(token)) failures.push(`Timeline panel missing token: ${token}`);
}

for (const token of ["storage_preview_only", "allowedKinds", "storageWritePerformed: false", "no-store"]) {
  if (!route.includes(token)) failures.push(`Route missing token: ${token}`);
}

for (const token of ["freshness", "≤ 15m", "sourceSpineRows"]) {
  if (!modal.includes(token)) failures.push(`Shield modal missing source freshness token: ${token}`);
}

for (const file of [
  "app/[locale]/account/page.tsx",
  "app/[locale]/dashboard/page.tsx",
  "app/[locale]/checkout/page.tsx",
  "app/[locale]/market-integrity/page.tsx",
]) {
  const source = readFileSync(file, "utf8");
  if (!source.includes("StorageAdapterReadinessPanel")) failures.push(`${file} does not render StorageAdapterReadinessPanel`);
}

for (const file of [
  "app/[locale]/account/page.tsx",
  "app/[locale]/dashboard/page.tsx",
  "app/[locale]/checkout/page.tsx",
]) {
  const source = readFileSync(file, "utf8");
  if (!source.includes("AccountOrderEventTimelinePanel")) failures.push(`${file} does not render AccountOrderEventTimelinePanel`);
}

for (const area of [
  "Audit ledger / persistence",
  "Commerce/order/payment readiness",
  "Source adapters / live feeds",
  "Data provenance / timestamps",
]) {
  if (!matrix.includes(area)) failures.push(`Progress matrix missing area: ${area}`);
}

if (failures.length) {
  console.error("PASS167 storage/idempotency/timeline safety failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS167 storage/idempotency/timeline safety OK");
