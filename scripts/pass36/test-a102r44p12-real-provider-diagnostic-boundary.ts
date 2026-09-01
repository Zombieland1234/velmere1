import assert from "node:assert/strict";
import {
  R44P12_CHECKPOINT_ALLOWS_COMMERCIAL_PROMOTION,
  deriveR44P12ProviderDiagnosticTruth,
} from "../../lib/market-integrity/r44p12-real-provider-diagnostic-boundary.ts";

const checks: Array<{ id: string; ok: boolean }> = [];
const check = (id: string, ok: boolean) => checks.push({ id, ok });

const baseline = deriveR44P12ProviderDiagnosticTruth({
  observedAssets: 15,
  availableProviderRows: 30,
  rightsApprovedCommercialUse: false,
  redistributionApproved: false,
  pdfExportApproved: false,
  aiRagUseApproved: false,
  fullShieldCatalogObserved: false,
  fullRealMarketsCatalogObserved: false,
});
check("promotion-constant-false", R44P12_CHECKPOINT_ALLOWS_COMMERCIAL_PROMOTION === false);
check("observation-class", baseline.observationClass === "REAL_NETWORK_DIAGNOSTIC");
check("capture-time-only", baseline.dataFreshnessClaim === "CAPTURE_TIME_ONLY_NOT_CONTINUOUS");
check("rights-blocked", baseline.rightsStatus === "BLOCKED_RIGHTS");
check("shield-coverage-exact", baseline.shieldDiagnosticCoverage.observed === 15 && baseline.shieldDiagnosticCoverage.denominator === 318);
check("real-markets-coverage-exact", baseline.realMarketsDiagnosticCoverage.observed === 15 && baseline.realMarketsDiagnosticCoverage.denominator === 583);
check("provider-rows-exact", baseline.providerAvailableRows === 30);
check("display-false", baseline.displayEligible === false);
check("pdf-false", baseline.pdfExportEligible === false);
check("ai-rag-false", baseline.aiRagEligible === false);
check("paid-false", baseline.paidTierEligible === false);
check("live-false", baseline.liveEligible === false);
check("blocked-reasons-present", baseline.blockedReasons.length >= 6);

const maliciousPromotion = deriveR44P12ProviderDiagnosticTruth({
  observedAssets: 15,
  availableProviderRows: 30,
  rightsApprovedCommercialUse: true,
  redistributionApproved: true,
  pdfExportApproved: true,
  aiRagUseApproved: true,
  fullShieldCatalogObserved: true,
  fullRealMarketsCatalogObserved: true,
});
check("resealed-rights-cannot-promote-display", maliciousPromotion.displayEligible === false);
check("resealed-rights-cannot-promote-pdf", maliciousPromotion.pdfExportEligible === false);
check("resealed-rights-cannot-promote-ai", maliciousPromotion.aiRagEligible === false);
check("resealed-rights-cannot-promote-paid", maliciousPromotion.paidTierEligible === false);
check("resealed-rights-cannot-promote-live", maliciousPromotion.liveEligible === false);

let invalidRejected = false;
try {
  deriveR44P12ProviderDiagnosticTruth({
    observedAssets: 16,
    availableProviderRows: 30,
    rightsApprovedCommercialUse: false,
    redistributionApproved: false,
    pdfExportApproved: false,
    aiRagUseApproved: false,
    fullShieldCatalogObserved: false,
    fullRealMarketsCatalogObserved: false,
  });
} catch { invalidRejected = true; }
check("denominator-overflow-rejected", invalidRejected);

const failed = checks.filter((row) => !row.ok);
assert.equal(failed.length, 0, JSON.stringify(failed));
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p12.provider-diagnostic-boundary-test.v1",
  status: "PASS_R44P12_PROVIDER_DIAGNOSTIC_BOUNDARY",
  checks: checks.length,
  passed: checks.length,
  failed: 0,
  rows: checks,
}, null, 2));
