import {
  currentSkuTruthSnapshot,
  getVlmCurrentSkuTruth,
  normalizeLegacyAuditQueueState,
  type VlmCurrentSkuLocale,
  type VlmCurrentSkuTier,
} from "@/lib/commerce/vlm-current-sku-truth";
import { getVlmPaidProduct, listVlmPaidProducts, type VlmPaidProductId } from "@/lib/commerce/vlm-paid-access";
import {
  VLM_TIER_PRICE_EUR,
  vlmTierCurrentDecision,
  vlmTierPaidLocked,
  vlmTierPriceEur,
  vlmTierPriceLabel,
  vlmTierRequiresControlledAccess,
  vlmTierRequiresPayment,
} from "@/lib/ai/paid-tier-policy";
import {
  buildReportCommercialDecision,
  buildWorldclassReportCommercialEnvelope,
  type ReportCoverageScore,
} from "@/lib/market-integrity/worldclass-report-commercial-policy";

const rows: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail: unknown = null) => rows.push({ id, passed: Boolean(passed), detail });
const locales: VlmCurrentSkuLocale[] = ["pl", "en", "de"];
const tiers: VlmCurrentSkuTier[] = ["basic", "pro", "advanced"];
const products: VlmPaidProductId[] = [
  "vlm_pro_analysis_single",
  "vlm_pro_pdf_single",
  "vlm_pro_audit_review",
  "vlm_advanced_analysis_single",
  "vlm_advanced_pdf_single",
  "vlm_advanced_audit_human_review",
];

for (const locale of locales) {
  const snapshot = currentSkuTruthSnapshot(locale);
  check(`snapshot:${locale}:global`, snapshot.globalDecision === "NO_GO" && snapshot.live === false && snapshot.saleEnabled === false && snapshot.productionApproved === false && snapshot.worldClassProven === false, snapshot);
  for (const tier of tiers) {
    const truth = getVlmCurrentSkuTruth(tier, locale);
    check(`truth:${locale}:${tier}:no-sale`, truth.publicCheckoutAllowed === false && truth.publicPrice === null && truth.saleEnabled === false && truth.live === false, truth);
    check(`truth:${locale}:${tier}:confidence`, truth.customerFindingConfidence === "NOT_CALIBRATED", truth.customerFindingConfidence);
    check(`truth:${locale}:${tier}:human`, truth.humanReviewIncluded === false && truth.independentCertificationIncluded === false, truth);
    check(`truth:${locale}:${tier}:decision`, truth.decision === (tier === "basic" ? "PILOT_ONLY_FREE_LIMITED_PRESCREEN" : tier === "pro" ? "INVITATION_ONLY_CONTROLLED_BETA" : "NOT_FOR_SALE"), truth.decision);
    check(`ai-policy:${locale}:${tier}:price`, VLM_TIER_PRICE_EUR[tier] === null && vlmTierPriceEur(tier) === null && vlmTierPriceLabel(tier, locale) === truth.publicPriceLabel, { price: vlmTierPriceEur(tier), label: vlmTierPriceLabel(tier, locale) });
    check(`ai-policy:${locale}:${tier}:payment`, vlmTierRequiresPayment(tier) === false, null);
    check(`ai-policy:${locale}:${tier}:decision`, vlmTierCurrentDecision(tier) === truth.decision, vlmTierCurrentDecision(tier));
  }
}

for (const locale of locales) {
  const listed = listVlmPaidProducts(locale);
  check(`products:${locale}:count`, listed.length === 6, listed.length);
  for (const id of products) {
    const product = getVlmPaidProduct(id, locale);
    const pro = id.startsWith("vlm_pro_");
    check(`product:${locale}:${id}:amount`, product.amount === 0 && product.currency === "eur", product);
    check(`product:${locale}:${id}:checkout`, product.publicCheckoutAllowed === false && product.publicPrice === null, product);
    check(`product:${locale}:${id}:decision`, product.customerDecision === (pro ? "INVITATION_ONLY_CONTROLLED_BETA" : "NOT_FOR_SALE"), product.customerDecision);
    check(`product:${locale}:${id}:confidence`, product.findingConfidence === "NOT_CALIBRATED", product.findingConfidence);
    check(`product:${locale}:${id}:no-human`, product.humanReviewIncluded === false && product.independentCertificationIncluded === false, product);
  }
}

check("access:basic-open", vlmTierPaidLocked("basic", false) === false && vlmTierRequiresControlledAccess("basic") === false);
check("access:pro-invitation", vlmTierPaidLocked("pro", false) === true && vlmTierPaidLocked("pro", true) === false && vlmTierRequiresControlledAccess("pro") === true);
check("access:advanced-locked", vlmTierPaidLocked("advanced", false) === true && vlmTierPaidLocked("advanced", true) === true && vlmTierRequiresControlledAccess("advanced") === false);


const legacyCases: Record<string, string> = {
  human_review_queue: "analysis_queue",
  paid_waiting_human_review: "analysis_queue",
  queued_paid_review: "analysis_queue",
  queued_basic_prescreen: "analysis_queue",
  fulfilment_pending: "analysis_queue",
  human_review: "automated_analysis",
  delivered_to_account: "ready_for_download",
  ready_for_download: "ready_for_download",
  analysis_queue: "analysis_queue",
  automated_analysis: "automated_analysis",
};
for (const [input, expected] of Object.entries(legacyCases)) {
  check(`legacy:${input}`, normalizeLegacyAuditQueueState(input) === expected, { input, expected, actual: normalizeLegacyAuditQueueState(input) });
}
check("legacy:unknown", normalizeLegacyAuditQueueState("future_state") === "unknown");

const highCoverage: ReportCoverageScore = {
  schemaVersion: "velmere.report-coverage.v1",
  surface: "shield",
  dimensions: { data: 95, provider: 95, historical: 95, evidence: 95, onchain: 95, security: 95 },
  applicableDimensions: ["data", "provider", "historical", "evidence", "onchain", "security"],
  overall: 95,
  missingCriticalEvidence: 0,
  completenessLabel: "high",
};
for (const tier of ["Basic", "Pro", "Advanced"] as const) {
  const decision = buildReportCommercialDecision({
    tier,
    coverage: highCoverage,
    sourceFamilyCount: 8,
    providerConflictCount: 0,
    stressTestExecuted: true,
    evidenceLedgerPresent: true,
    manualReviewVerified: true,
  });
  check(`commercial:${tier}:no-paid-delivery`, decision.paidDeliveryAllowed === false, decision);
  if (tier === "Basic") check(`commercial:${tier}:basic-ready`, decision.status === "ready" && decision.deliverableTier === "Basic", decision);
  if (tier === "Pro") check(`commercial:${tier}:invitation-only`, decision.status === "unavailable" && decision.blockedReasons.some((reason) => reason.includes("invitation-only")), decision);
  if (tier === "Advanced") check(`commercial:${tier}:not-for-sale`, decision.status === "unavailable" && decision.blockedReasons.some((reason) => reason.includes("NOT_FOR_SALE")), decision);
  const envelope = buildWorldclassReportCommercialEnvelope({
    tier,
    family: "crypto",
    surface: "shield",
    symbol: "BTC",
    generatedAt: "2026-08-04T00:00:00.000Z",
    sourceFamilyCount: 8,
    providerConflictCount: 0,
    missingCriticalEvidence: 0,
    coverageInput: { data: 95, provider: 95, historical: 95, evidence: 95, onchain: 95, security: 95 },
    stressTestExecuted: true,
    evidenceLedgerPresent: true,
    manualReviewVerified: true,
    providerTimestamps: ["2026-08-04T00:00:00.000Z"],
    executedTests: ["fixture-only-current-truth-test"],
    unexecutedTests: [],
  });
  check(`commercial:${tier}:price-null`, envelope.pricing.launchPrice === null && envelope.pricing.targetPrice === null && envelope.pricing.billingMode === "not_publicly_available", envelope.pricing);
  check(`commercial:${tier}:envelope-no-paid`, envelope.decision.paidDeliveryAllowed === false, envelope.decision);
}

const failed = rows.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a102r44p16.current-sku-runtime.v1",
  revisionId: "VELMERE_PASS36_A102R44P16_ACTION_REQUIRED_SINGLE_SKU_TRUTH_ANALYSIS_QUEUE_AND_CUSTOMER_CLAIM_CLOSURE_NO_LIVE_CREDIT",
  generatedAt: "2026-08-04T00:00:00.000Z",
  status: failed.length ? "FAIL_R44P16_CURRENT_SKU_RUNTIME" : "PASS_R44P16_CURRENT_SKU_RUNTIME",
  summary: { checks: rows.length, passed: rows.length - failed.length, failed: failed.length },
  rows,
  creditBoundary: { publicSaleCredit: false, customerCredit: false, stagingCredit: false, liveCredit: false },
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
