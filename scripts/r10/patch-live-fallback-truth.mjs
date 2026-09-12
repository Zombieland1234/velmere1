#!/usr/bin/env node
import fs from "node:fs";

const file = "lib/server/market-integrity-route-modules/investigator.ts";
let src = fs.readFileSync(file, "utf8");

const importStart = src.indexOf('import {\n  attachPass4644ProviderReceipts,');
const exportAnchor = '\nexport async function resolveShieldMapResult(args: {';
const exportIndex = src.indexOf(exportAnchor);
if (importStart < 0 || exportIndex < 0 || importStart >= exportIndex) {
  throw new Error("live_fallback_patch_block_anchor_missing");
}
const removedBlock = src.slice(importStart, exportIndex);
for (const required of [
  'CANONICAL_FALLBACK_ASSETS',
  'function resolveFallbackMarketRow',
  'timestampProvenance: "provider"',
  'result.dataQuality = "live"',
  'state: "verified"',
]) {
  if (!removedBlock.includes(required)) throw new Error(`live_fallback_patch_expected_marker_missing:${required}`);
}
src = src.slice(0, importStart) + src.slice(exportIndex + 1);

const oldDeclaration = '  let marketRow = null;';
const newDeclaration = '  let marketRow: Awaited<ReturnType<ShieldMapResolutionProviders["searchMarket"]>>;';
if (!src.includes(oldDeclaration)) throw new Error("live_fallback_market_row_anchor_missing");
src = src.replace(oldDeclaration, newDeclaration);

const fallbackCall = `  if (!marketRow && !args.providers) {\n    marketRow = resolveFallbackMarketRow(args.query.query, args.now);\n  }\n`;
if (!src.includes(fallbackCall)) throw new Error("live_fallback_call_anchor_missing");
src = src.replace(fallbackCall, "");

for (const forbidden of [
  'CANONICAL_FALLBACK_ASSETS',
  'resolveFallbackMarketRow',
  'timestampProvenance: "provider"',
  'result.dataQuality = "live"',
]) {
  if (src.includes(forbidden)) throw new Error(`live_fallback_truth_forbidden_remaining:${forbidden}`);
}

fs.writeFileSync(file, src);
const receipt = {
  schemaVersion: "velmere.r10.live-fallback-truth-remediation.v1",
  classification: "PATCH_PENDING_VERIFICATION",
  source: file,
  removed: "synthetic_static_market_rows_presented_as_verified_live_provider_evidence",
  fallbackOnProviderFailure: "FAIL_CLOSED_IDENTITY_MISSING",
  productionCredit: false,
};
fs.mkdirSync("artifacts/r10/live-fallback", { recursive: true });
fs.writeFileSync("artifacts/r10/live-fallback/PATCH_RECEIPT.json", JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
