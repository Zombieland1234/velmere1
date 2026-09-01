import assert from "node:assert/strict";
import {
  R44P17_COMMERCIAL_PROMOTION_ALLOWED,
  deriveR44P17CrossSurfaceTruth,
} from "../../lib/market-integrity/r44p17-real-provider-diagnostic-boundary.ts";

const checks: Array<{ id: string; ok: boolean; detail?: unknown }> = [];
const check = (id: string, ok: boolean, detail?: unknown) => checks.push({ id, ok, detail });
const baseline = deriveR44P17CrossSurfaceTruth({
  observedAssets: 50,
  providerRows: 100,
  availableProviderRows: 79,
  twoProviderAssets: 29,
  oneProviderAssets: 21,
  conflictedAssets: 0,
  failedOrRateLimitedAssets: 0,
  rightsApprovedCommercialUse: false,
  displayRightsApproved: false,
  cacheRightsApproved: false,
  pdfExportRightsApproved: false,
  aiRagRightsApproved: false,
  fullShieldCatalogObserved: false,
  fullRealMarketsCatalogObserved: false,
});
check("promotion-disabled", R44P17_COMMERCIAL_PROMOTION_ALLOWED === false);
check("real-diagnostic", baseline.observationClass === "REAL_NETWORK_DIAGNOSTIC_ONLY");
check("seeded-no-cherry-pick", baseline.selectionClass === "DETERMINISTIC_SEEDED_NON_CHERRY_PICKED");
check("capture-time-only", baseline.freshnessClass === "CAPTURE_TIME_ONLY_NOT_CONTINUOUS");
check("rights-blocked", baseline.rightsStatus === "BLOCKED_RIGHTS");
check("shield-coverage", baseline.coverage.shield.observed === 50 && baseline.coverage.shield.denominator === 318 && baseline.coverage.shield.percent === 15.7233);
check("markets-coverage", baseline.coverage.realMarkets.observed === 50 && baseline.coverage.realMarkets.denominator === 583 && baseline.coverage.realMarkets.percent === 8.5763);
check("provider-denominator", baseline.providerRows.observed === 100 && baseline.providerRows.available === 79);
check("provider-availability", baseline.providerRows.twoProviderAssets === 29 && baseline.providerRows.oneProviderAssets === 21);
check("shield-basic-reference", baseline.surfaces.shieldBasic === "REFERENCE_DIAGNOSTIC_ONLY");
check("shield-pro-blocked", baseline.surfaces.shieldPro === "BLOCKED_RIGHTS_DEPTH_AND_ENTITLEMENT");
check("map-reference", baseline.surfaces.shieldMap === "REFERENCE_DIAGNOSTIC_ONLY");
check("markets-basic-reference", baseline.surfaces.realMarketsBasic === "REFERENCE_DIAGNOSTIC_ONLY");
check("markets-pro-blocked", baseline.surfaces.realMarketsPro === "BLOCKED_RIGHTS_AND_CATALOG");
check("impact-blocked", baseline.surfaces.marketImpact === "BLOCKED_CURRENT_ORDER_BOOK_AND_REALIZED_SLIPPAGE");
check("whale-blocked", baseline.surfaces.whaleWatch === "BLOCKED_CURRENT_TRANSFER_AND_SIGNED_LABEL_EVIDENCE");
check("angel-risk-reference", baseline.surfaces.angelRisk === "REFERENCE_CONTEXT_ONLY_NOT_DECISION_AUTHORITY");
check("display-false", baseline.displayEligible === false);
check("cache-false", baseline.cacheEligible === false);
check("pdf-false", baseline.pdfExportEligible === false);
check("ai-false", baseline.aiRagEligible === false);
check("paid-false", baseline.paidTierEligible === false);
check("live-false", baseline.liveEligible === false);
check("blocked-reasons", baseline.blockedReasons.length >= 8);

const malicious = deriveR44P17CrossSurfaceTruth({
  observedAssets: 50, providerRows: 100, availableProviderRows: 100, twoProviderAssets: 50, oneProviderAssets: 0,
  conflictedAssets: 0, failedOrRateLimitedAssets: 0, rightsApprovedCommercialUse: true, displayRightsApproved: true,
  cacheRightsApproved: true, pdfExportRightsApproved: true, aiRagRightsApproved: true,
  fullShieldCatalogObserved: true, fullRealMarketsCatalogObserved: true,
});
check("malicious-display-cannot-promote", malicious.displayEligible === false);
check("malicious-cache-cannot-promote", malicious.cacheEligible === false);
check("malicious-pdf-cannot-promote", malicious.pdfExportEligible === false);
check("malicious-ai-cannot-promote", malicious.aiRagEligible === false);
check("malicious-paid-cannot-promote", malicious.paidTierEligible === false);
check("malicious-live-cannot-promote", malicious.liveEligible === false);

for (const [id, input] of [
  ["asset-overflow", { observedAssets: 51, providerRows: 100, availableProviderRows: 79, twoProviderAssets: 29, oneProviderAssets: 21, conflictedAssets: 0, failedOrRateLimitedAssets: 0 }],
  ["provider-row-mismatch", { observedAssets: 50, providerRows: 99, availableProviderRows: 79, twoProviderAssets: 29, oneProviderAssets: 21, conflictedAssets: 0, failedOrRateLimitedAssets: 0 }],
  ["terminal-incomplete", { observedAssets: 50, providerRows: 100, availableProviderRows: 50, twoProviderAssets: 10, oneProviderAssets: 10, conflictedAssets: 0, failedOrRateLimitedAssets: 0 }],
] as const) {
  let rejected = false;
  try {
    deriveR44P17CrossSurfaceTruth({ ...input, rightsApprovedCommercialUse: false, displayRightsApproved: false, cacheRightsApproved: false, pdfExportRightsApproved: false, aiRagRightsApproved: false, fullShieldCatalogObserved: false, fullRealMarketsCatalogObserved: false });
  } catch { rejected = true; }
  check(id, rejected);
}
const failed = checks.filter((x) => !x.ok);
assert.equal(failed.length, 0, JSON.stringify(failed));
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r44p17.cross-surface-test.v1", status: "PASS_R44P17_CROSS_SURFACE_BOUNDARY", checks: checks.length, passed: checks.length, failed: 0, rows: checks }, null, 2));
