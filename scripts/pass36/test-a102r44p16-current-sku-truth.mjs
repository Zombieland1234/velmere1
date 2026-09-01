#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const policyPath = path.join(root, "config/pass36/a102r44p16-current-sku-truth-policy.json");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const section = (source, startMarker, endMarker = null) => {
  const start = source.indexOf(startMarker);
  if (start < 0) return "";
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : -1;
  return source.slice(start, end < 0 ? source.length : end);
};

const central = read("lib/commerce/vlm-current-sku-truth.ts");
check("central:id", central.includes("pass36-a102r44p16-single-current-sku-truth"));
check("central:basic-decision", central.includes('decision: "PILOT_ONLY_FREE_LIMITED_PRESCREEN"'));
check("central:pro-decision", central.includes('decision: "INVITATION_ONLY_CONTROLLED_BETA"'));
check("central:advanced-decision", central.includes('decision: "NOT_FOR_SALE"'));
check("central:no-public-checkout", central.includes("publicCheckoutAllowed: false") && !central.includes("publicCheckoutAllowed: true"));
check("central:no-public-price", central.includes("publicPrice: null"));
check("central:uncalibrated", central.includes('customerFindingConfidence: "NOT_CALIBRATED"'));
check("central:no-human-review", central.includes("humanReviewIncluded: false") && central.includes("independentCertificationIncluded: false"));
check("central:global-fail-closed", ["NO_GO", "saleEnabled: false", "productionApproved: false", "worldClassProven: false"].every((x) => central.includes(x)));

const paidAccess = read("lib/commerce/vlm-paid-access.ts");
const currentProduct = section(paidAccess, "function buildCurrentProduct", "export function getVlmPaidProduct");
check("products:amount-zero", currentProduct.includes("amount: 0") && !/amount\s*:\s*(?:7999|14999|7_999|14_999)/u.test(currentProduct));
check("products:checkout-false", currentProduct.includes("publicCheckoutAllowed: false"));
check("products:decision-central", currentProduct.includes("truth.decision"));
check("products:all-six-current", (paidAccess.match(/getVlmPaidProduct\("vlm_(?:pro|advanced)_[^"]+"/gu) ?? []).length === 6);

const tierPresentation = read("lib/commerce/vlm-tier-presentation-policy.ts");
check("tier-policy:central-import", tierPresentation.includes("getVlmCurrentSkuTruth"));
check("tier-policy:no-payment-rails", !/stripe_checkout|blik_checkout|wallet_checkout/u.test(section(tierPresentation, "export function buildVlmAdvancedOnlyTierPolicies")));

const commercial = read("lib/security/audit-commercial-sku-truth.ts");
check("commercial:central-derived", commercial.includes("getVlmCurrentSkuTruth") && commercial.includes("publicPrice: null") && commercial.includes("findingConfidence: \"NOT_CALIBRATED\""));
const tierContract = read("lib/security/audit-tier-contract.ts");
const currentContracts = section(tierContract, "export const CURRENT_AUDIT_TIER_CONTRACTS", "export function auditTierFromReviewLevel");
check("tier-contract:current-central", currentContracts.includes("getVlmCurrentSkuTruth") && !currentContracts.includes("€79.99") && !currentContracts.includes("€149.99"));
check("tier-contract:advanced-no-human", /humanReviewRequired:\s*false/u.test(currentContracts) && /humanReviewClaimAllowed:\s*false/u.test(currentContracts));

const checkoutRoute = read("app/api/checkout/vlm-service/route.ts");
check("checkout:central-stop-sell", checkoutRoute.includes("tierForVlmProductId") && checkoutRoute.includes("public_checkout_disabled_invitation_only") && checkoutRoute.includes("product_not_for_sale"));
check("checkout:no-charge", checkoutRoute.includes("chargeAllowed: false") && checkoutRoute.includes("durableWritesAllowed: false"));
const verifyRoute = read("lib/server/vlm-service-verify-handler.ts");
check("verify:central-stop-sell", verifyRoute.includes("tierForVlmProductId") && verifyRoute.includes("entitlementMutationAllowed: false"));
const auditWatch = read("lib/security/audit-watch-post-handler.ts");
check("audit-watch:advanced-blocked", auditWatch.includes('paidAuditDepth === "advanced"') && auditWatch.includes('reason: "product_not_for_sale"'));
check("audit-watch:pro-invitation", auditWatch.includes("invitation_or_existing_entitlement_required"));
const responseBoundary = read("lib/security/audit-watch-response-boundary-helpers.ts");
check("audit-watch:no-payment-required-public", responseBoundary.includes("invitation_required") && !responseBoundary.includes('error: "payment_required"'));
check("audit-watch:no-paid-header", !responseBoundary.includes("x-velmere-paid-access-required"));

const timeline = read("lib/security/customer-safe-audit-timeline.ts");
check("timeline:analysis-states", timeline.includes("analysis_queue") && timeline.includes("access_verified"));
check("timeline:no-public-human-stage", !timeline.includes('id: "human_review"') && !timeline.includes('id: "human_review_queue"'));
const account = read("lib/account/audit-account-messages.ts");
check("account:legacy-normalized", account.includes('rawAction === "mark_human_review" ? "mark_analysis"') && account.includes('nextStatus = "automated_analysis"') && account.includes('deliveryStatus = "analysis_queue"'));
check("account:current-action", account.includes('"mark_analysis"'));
const migration = read("supabase/migrations/20260804000002_a102r44p16_analysis_queue_sku_truth.sql");
check("database:migration", migration.includes("velmere_normalize_audit_analysis_queue_v1") && migration.includes("automated_analysis") && migration.includes("analysis_queue"));
check("database:constraints-modern", migration.includes("delivery_status in ('queued','delivered_to_account','analysis_queue','ready_for_download')") && migration.includes("operator_status in ('intake','analysis_queue','automated_analysis'"));

const angel = read("lib/ai/angel-route-policy.ts");
check("angel:no-audit-price", !/Advanced Audit kosztuje|auditPriceEur/u.test(section(angel, "export function buildAngelEvidenceReply", "export function shouldAttachPass2357RiskLead")));
check("angel:current-tier-copy", angel.includes("Advanced: nie na sprzedaż") && angel.includes("Pro: kontrolowana beta wyłącznie na zaproszenie"));
const paidTierPolicy = read("lib/ai/paid-tier-policy.ts");
check("ai-tier-policy:central", paidTierPolicy.includes("getVlmCurrentSkuTruth") && paidTierPolicy.includes("basic: null") && paidTierPolicy.includes("pro: null") && paidTierPolicy.includes("advanced: null"));
check("ai-tier-policy:no-public-payment", paidTierPolicy.includes("return false") && paidTierPolicy.includes('if (depth === "advanced") return true'));
const aiCurrentFiles = [
  "lib/ai/live-output-quality-ledger.ts",
  "lib/ai/premium-output-gate.ts",
  "lib/ai/runtime-output-firewall.ts",
  "lib/ai/release-trace-ledger.ts",
  "lib/ai/worldclass-output-payment-qa.ts",
  "lib/ai/worldclass-output-contract.ts",
  "lib/ai/claim-proof-firewall.ts",
  "lib/ai/worldclass-live-output-payment-qa.ts",
  "lib/ai/production-replay-gate.ts",
  "lib/ai/live-output-audit-harness.ts",
  "lib/ai/customer-release-gate.ts",
  "lib/ai/angel-evidence-context.ts",
  "lib/ai/audit-output-regression.ts",
];
const aiCurrentText = aiCurrentFiles.map((rel) => `${rel}\n${read(rel)}`).join("\n");
check("ai-current:no-numeric-prices", !/(?:79|149)[,.]99\s*(?:EUR|€)|€\s*(?:79|149)[,.]99/iu.test(aiCurrentText));
check("ai-current:no-positive-human-review", !/human_review_layer|Advanced operator sign[- ]?off|Advanced adds human review/iu.test(aiCurrentText));
check("ai-current:pro-invitation", /Pro is (?:an )?invitation-only|Pro jest betą|Pro ist (?:eine )?Beta nur auf Einladung/iu.test(aiCurrentText));
check("ai-current:advanced-stop-sell", /Advanced is not for sale|Advanced nie jest na sprzedaż|Advanced ist nicht zum Verkauf/iu.test(aiCurrentText));
const riskFormula = read("lib/security/risk-formula-evidence-weighting-contract.ts");
check("risk:advanced-release-false", riskFormula.includes('const canFinalSignAdvancedScore = false') && riskFormula.includes('advancedSkuDecision: advancedSku.decision'));
check("risk:no-probability-claim", !/probability of profit|guaranteed probability|prawdopodobieństwo zysku|Gewinnwahrscheinlichkeit/iu.test(riskFormula));
const brainRouter = read("lib/market-integrity/top1-vlm-brain-source-router.ts");
check("brain-router:no-human-review-lane", !brainRouter.includes('"human_review_layer"') && brainRouter.includes('"quality_control_layer"'));
check("brain-router:advanced-not-for-sale", brainRouter.includes("Advanced is not for sale and cannot be released"));
const trust = read("lib/security/security-trust-copy.ts");
check("trust:quality-control", trust.includes('id: "quality_control"') && !trust.includes('id: "human_review"'));
const reportPipeline = read("lib/security/audit-customer-report-pipeline.ts");
check("report:advanced-stop-sell", reportPipeline.includes("Advanced is not for sale") && reportPipeline.includes("advanced_not_for_sale_pro_fallback"));
check("report:quality-control-neutral", reportPipeline.includes('"audit.quality_control_state"') && reportPipeline.includes('"audit.false_positive_quality_control"') && !reportPipeline.includes('"audit.manual_review_state"'));

const assetModal = read("components/market-integrity/AssetDetailModal.tsx");
const assetPaidAccess = read("components/market-integrity/asset-detail/paid-access.ts");
const checkoutFlow = read("components/checkout/VelmereCheckoutFlowClient.tsx");
const reportCommercial = read("lib/market-integrity/worldclass-report-commercial-policy.ts");
check("asset-modal:central-sku-truth", assetModal.includes("getVlmCurrentSkuTruth") && assetModal.includes('currentSkuTruth.decision === "NOT_FOR_SALE"'));
check("asset-modal:no-price-or-checkout-url", !/(?:79|149)[,.]99|\/checkout\?vlm_service/iu.test(assetModal));
check("asset-paid-access:no-price-or-checkout-url", assetPaidAccess.includes("getVlmCurrentSkuTruth") && !/(?:79|149)[,.]99|\/checkout\?vlm_service/iu.test(assetPaidAccess));
check("checkout-flow:central-stop-sell", checkoutFlow.includes("currentSkuTruth.publicCheckoutAllowed") && checkoutFlow.includes("currentSkuTruth.description"));
check("report-commercial:no-public-price", reportCommercial.includes("launchPrice: null") && reportCommercial.includes("targetPrice: null") && reportCommercial.includes('billingMode: "not_publicly_available"'));
check("report-commercial:no-paid-delivery", !reportCommercial.includes("paidDeliveryAllowed: true") && reportCommercial.includes("Advanced is NOT_FOR_SALE"));

const activeText = policy.activeCustomerFiles.map((rel) => {
  const text = read(rel);
  if (rel === "lib/security/audit-tier-contract.ts") {
    return `${rel}\n${section(text, "export const CURRENT_AUDIT_TIER_CONTRACTS", "export function auditTierFromReviewLevel")}`;
  }
  return `${rel}\n${text}`;
}).join("\n");
for (const claim of policy.forbiddenCustomerClaims) {
  check(`forbidden:${claim}`, !activeText.includes(claim), claim);
}
check("forbidden:hardcoded-current-prices", !/(?:€\s*(?:79|149)[,.]99|(?:79|149)[,.]99\s*EUR|amountCents\s*:\s*(?:7_999|14_999))/u.test(activeText.replace(section(tierContract, "export const AUDIT_TIER_CONTRACTS", "/**\n * Current product truth"), "")));
check("forbidden:numeric-tier-confidence", !/(?:Basic|Pro|Advanced)[^\n]{0,80}(?:confidence|pewno|Konfidenz)[^\n]{0,30}\b(?:78|86|90|91)\b/iu.test(activeText));

function policyViolations(text) {
  const violations = [];
  if (/€\s*(?:79|149)[,.]99/u.test(text)) violations.push("price");
  if (/publicCheckoutAllowed\s*:\s*true/u.test(text)) violations.push("checkout");
  if (/PILOT_ONLY_PAID_INFORMATIONAL/u.test(text)) violations.push("paid-decision");
  if (/Advanced adds human review|operator sign[- ]?off included/iu.test(text)) violations.push("human-review-claim");
  if (/(?:findingConfidence|customerFindingConfidence)\s*:\s*(?:78|86|90|91)/u.test(text)) violations.push("numeric-confidence");
  if (/human_review_layer|Advanced operator sign[- ]?off/iu.test(text)) violations.push("human-review-lane");
  if (/(?:79|149)[,.]99|\/checkout\?vlm_service/iu.test(text)) violations.push("public-price-or-checkout-url");
  if (/paidDeliveryAllowed\s*:\s*true|billingMode\s*:\s*["']single_report["']/u.test(text)) violations.push("public-paid-delivery");
  return violations;
}
const mutations = [
  ["price", `${central}\n€79.99`],
  ["checkout", `${central}\npublicCheckoutAllowed: true`],
  ["paid-decision", `${central}\nPILOT_ONLY_PAID_INFORMATIONAL`],
  ["human-review-claim", `${central}\nAdvanced adds human review`],
  ["numeric-confidence", `${central}\nfindingConfidence: 91`],
  ["human-review-lane", `${central}\nhuman_review_layer`],
  ["public-price-or-checkout-url", `${central}\nBuy Pro · 79,99 €\n/checkout?vlm_service=vlm_pro_analysis_single`],
  ["public-paid-delivery", `${central}\npaidDeliveryAllowed: true\nbillingMode: "single_report"`],
];
for (const [id, mutated] of mutations) check(`negative:${id}`, policyViolations(mutated).includes(id), policyViolations(mutated));

const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p16.current-sku-truth-test-receipt.v1",
  revisionId: policy.revisionId,
  generatedAt: "2026-08-04T00:00:00.000Z",
  status: failed.length === 0 ? "PASS_R44P16_SINGLE_SKU_TRUTH" : "FAIL_R44P16_SINGLE_SKU_TRUTH",
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  checks,
  truthBoundary: policy.truthBoundary,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
