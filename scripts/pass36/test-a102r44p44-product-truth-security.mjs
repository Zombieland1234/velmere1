#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd());
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const checks = [];
function check(id, pass, details = {}) {
  checks.push({ id, pass: Boolean(pass), details });
}
function has(text, needle) { return text.includes(needle); }
function lacks(text, needle) { return !text.includes(needle); }

const paid = read("lib/commerce/vlm-paid-surface-guard.ts");
const direct = read("lib/server/lazy-route-modules/angel.ts");
const market = read("lib/server/market-integrity-route-modules/angel.ts");
const assembler = read("lib/server/security-route-modules/audit-report-assembler.ts");
const projection = read("lib/security/audit-report-customer-projection.ts");
const watch = read("lib/security/audit-watch-server-helpers.ts");
const timeline = read("components/security/CustomerSafeAuditTimeline.tsx");
const sku = read("lib/commerce/vlm-current-sku-truth.ts");

check("angel-policy-standalone-basic-only", /angel_standalone:\s*\{[^\n]*depths:\s*\["basic"\]/.test(paid));
check("angel-legacy-policy-fail-closed-basic-only", /angel_analysis:\s*\{[^\n]*depths:\s*\["basic"\]/.test(paid));
check("direct-angel-effective-depth-basic", has(direct, 'const requestedDepth = "basic" as const'));
check("direct-angel-client-depth-ignored", has(direct, "clientRequestedDepthIgnored"));
check("direct-angel-no-paid-resolver", lacks(direct, "resolveVlmPaidSurfaceAccess({"));
check("direct-angel-no-payment-payload", lacks(direct, "toVlmPaidSurfacePaymentRequiredPayload"));
check("direct-angel-no-payment-provider-mode", lacks(direct, 'providerMode: "payment_required"'));
check("direct-angel-paid-verified-false", has(direct, "const angelPaidAccessVerified = false"));
check("direct-angel-free-mode", has(direct, 'const angelAccessMode = "free_basic"'));
check("direct-angel-product-standalone", has(direct, 'productClass: "STANDALONE_PRODUCT"'));
check("direct-angel-no-paid-truth-delta", has(direct, "paidDepthChangesTruth: false"));
check("direct-angel-payment-required-false", has(direct, "directChatPaymentRequired: false"));

check("market-angel-default-basic", has(market, 'defaultDepth: "basic"'));
check("market-angel-effective-basic", has(market, 'const requestedDepth = "basic" as const'));
check("market-angel-allowed-basic", has(market, 'const allowedDepth = "basic" as const'));
check("market-angel-no-paid-call", lacks(market, "await resolveAccess({"));
check("market-angel-no-payment-required-mode", lacks(market, 'mode: "payment_required"'));
check("market-angel-paid-verified-false", /paidAccessVerified:\s*false/g.test(market));
check("market-angel-client-depth-ignored", has(market, "clientDepthIgnored: true"));
check("market-angel-product-standalone", has(market, 'productClass: "STANDALONE_PRODUCT"'));

const advancedBlock = assembler.indexOf('error: "audit_advanced_not_for_sale"');
const providerCall = assembler.indexOf("const sourceQuorum = buildPass2570AuditSourceQuorumReport");
check("advanced-block-exists", advancedBlock >= 0);
check("advanced-block-before-provider", advancedBlock >= 0 && providerCall >= 0 && advancedBlock < providerCall, { advancedBlock, providerCall });
check("advanced-no-public-price", has(assembler, "publicPrice: null"));
check("advanced-no-public-checkout", has(assembler, "publicCheckoutAllowed: false"));
check("advanced-no-human-review", has(assembler, "humanReviewIncluded: false"));
check("advanced-no-report-generated", has(assembler, "reportGenerated: false"));
check("pro-invitation-required", has(assembler, 'error: "audit_pro_invitation_entitlement_required"'));
check("pro-no-price-field", lacks(assembler, "price: tierContract.price"));
check("pro-no-public-checkout", has(assembler, 'decision: "INVITATION_ONLY_CONTROLLED_BETA"'));

check("projection-always-downgrades-advanced", has(projection, 'args.deliveredTier === "advanced" ? "pro" : args.deliveredTier'));
check("projection-no-advanced-queue", has(projection, "const advancedQueue: string[] = []"));
check("projection-manual-review-false", has(projection, "manualReviewVerified: false"));
check("projection-advanced-not-for-sale-copy", has(projection, "Advanced is not for sale"));
check("projection-no-legacy-manual-review-promise", lacks(projection, "until a verified Advanced release exists"));
check("projection-no-advanced-slot", has(projection, 'slot.slot !== "advanced_manual_queue"'));

check("analysis-queue-default", has(watch, 'args.auditQueueId ?? "analysis-queue"'));
check("automated-evidence-step", has(watch, '"automated evidence verification"'));
check("no-analyst-verification-step", lacks(watch, '"Velmère analyst verification"'));
check("timeline-no-human-review-data-claim", has(timeline, 'data-pass2368-timeline-steps="access-analysis-queue-report-ready"'));

check("sku-advanced-not-for-sale", /advanced[\s\S]{0,250}NOT_FOR_SALE/.test(sku) || has(sku, 'decision: "NOT_FOR_SALE"'));
check("sku-public-checkout-false", has(sku, "publicCheckoutAllowed: false"));
check("paid-surface-audit-review-pro-only", has(paid, 'audit_review: { surface: "audit", purpose: "audit", depths: ["pro"] }') && lacks(paid, 'audit_review: { surface: "audit", purpose: "audit", depths: ["pro", "advanced"] }'));
check("paid-surface-audit-pdf-pro-only", has(paid, 'audit_pdf_issue: { surface: "audit", purpose: "audit", depths: ["pro"] }') && has(paid, 'audit_pdf_download: { surface: "audit", purpose: "pdf", depths: ["pro"] }'));

const passed = checks.filter((item) => item.pass).length;
const failed = checks.length - passed;
const receipt = {
  schemaVersion: "velmere.r44p44.product-truth-security.v1",
  status: failed === 0 ? "PASS_R44P44_PRODUCT_TRUTH_SECURITY" : "FAIL_R44P44_PRODUCT_TRUTH_SECURITY",
  checks: checks.length,
  passed,
  failed,
  customerProofCredit: 0,
  saleCredit: false,
  liveCredit: false,
  checksDetail: checks,
};
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
if (failed) process.exitCode = 1;
