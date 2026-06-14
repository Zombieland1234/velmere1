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
  "lib/market-integrity/source-adapter-runtime.ts",
  "components/market-integrity/SourceSnapshotLedgerPanel.tsx",
  "app/api/market-integrity/source-snapshot/route.ts",
  "VELMERE_PASS174_SOURCE_CACHE_SNAPSHOT_LEDGER_REPORT.md",
  "VELMERE_PASS174_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const runtime = read("lib/market-integrity/source-adapter-runtime.ts");
const panel = read("components/market-integrity/SourceSnapshotLedgerPanel.tsx");
const route = read("app/api/market-integrity/source-snapshot/route.ts");
const page = read("app/[locale]/market-integrity/page.tsx");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");

for (const token of [
  "SourceAdapterEnvelope",
  "allowedPayloadKeys",
  "blockedPayloadKeyPattern",
  "redactSourcePayload",
  "getSourceCacheDecision",
  "createSourceAdapterEnvelope",
  "createDemoSourceSnapshotBundle",
  "storageWritePerformed: false",
]) {
  if (!runtime.includes(token)) errors.push(`source-adapter-runtime.ts missing token: ${token}`);
}

for (const lane of ["market", "candles", "orderbook", "holders", "contract", "osint"]) {
  if (!runtime.includes(`lane: "${lane}"`)) errors.push(`source-adapter-runtime.ts missing snapshot lane: ${lane}`);
}

for (const token of [
  "SourceSnapshotLedgerPanel",
  "createDemoSourceSnapshotBundle",
  "redacted payload",
  "shortIso",
  "sslp-shell",
]) {
  if (!panel.includes(token) && !css.includes(token)) errors.push(`SourceSnapshotLedgerPanel/CSS missing token: ${token}`);
}

for (const token of [
  "source_snapshot_preview_only",
  "createSourceAdapterEnvelope",
  "storageWritePerformed: false",
  "no-store",
  "does not write durable snapshots",
]) {
  if (!route.includes(token)) errors.push(`source-snapshot route missing safety token: ${token}`);
}

if (!page.includes("SourceSnapshotLedgerPanel")) {
  errors.push("market-integrity page does not render SourceSnapshotLedgerPanel");
}

for (const token of ["PASS174 · source snapshot ledger", ".sslp-shell", ".sslp-mode-blocked"]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS174 marker: ${token}`);
}

for (const token of ["verify-pass174-source-cache-snapshot-ledger-safety.mjs", "PASS174"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS174 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS174 source cache/snapshot ledger safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS174 source cache/snapshot ledger safety OK");
