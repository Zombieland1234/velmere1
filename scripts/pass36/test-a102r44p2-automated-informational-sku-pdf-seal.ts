import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import {
  AUDIT_TIER_CONTRACTS,
  CURRENT_AUDIT_TIER_CONTRACTS,
  buildAuditTierCustomerMatrix,
  getAuditTierContract,
  getLegacyAuditTierContract,
} from "../../lib/security/audit-tier-contract";
import {
  CURRENT_AUDIT_COMMERCIAL_SKU_TRUTH,
  HUMAN_REVIEWED_AUDIT_LANE_TRUTH,
  auditCommercialCopyIsSafe,
} from "../../lib/security/audit-commercial-sku-truth";
import {
  buildVlmAuditAccountMessage,
  buildVlmAuditProductPage,
} from "../../lib/security/vlm-audit-product";
import {
  buildAuditBusinessFlow,
} from "../../lib/security/audit-business-flow";
import {
  buildCustomerSafeMinimalPdf,
  planCustomerSafePdf,
} from "../../lib/security/pro-audit-pdf/customer-safe-renderer";

const sha256 = (value: Buffer | string) => crypto.createHash("sha256").update(value).digest("hex");
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, condition: unknown, detail?: unknown) => {
  assert.ok(condition, id);
  checks.push({ id, passed: true, ...(detail === undefined ? {} : { detail }) });
};

const legacyAdvanced = getLegacyAuditTierContract("advanced");
const currentAdvanced = getAuditTierContract("advanced");
check("history:legacy-advanced-remains-human-reviewed", legacyAdvanced.humanReviewRequired === true && legacyAdvanced.packageId === "advanced_human_review");
check("current:advanced-is-automated-informational", currentAdvanced.humanReviewRequired === false && currentAdvanced.humanReviewClaimAllowed === false && currentAdvanced.packageId === "advanced_audit");
check("history:frozen-plane-export-preserved", AUDIT_TIER_CONTRACTS.advanced.humanReviewRequired === true);
check("current:current-plane-export-present", CURRENT_AUDIT_TIER_CONTRACTS.advanced.commercialMode === "paid_automated_informational_analysis");
check("current:legacy-billing-id-is-compatibility-only", currentAdvanced.billingIdentifierClass === "legacy_compatibility_only");

const tiers = ["basic", "pro", "advanced"] as const;
for (const tier of tiers) {
  const truth = CURRENT_AUDIT_COMMERCIAL_SKU_TRUTH[tier];
  check(`sku:${tier}:issued-by-velmere-security`, truth.issuedBy === "Velmère Security");
  check(`sku:${tier}:generated-by-engine`, truth.generatedBy === "Velmère Security Engine");
  check(`sku:${tier}:automated-only`, truth.automated === true && truth.humanReviewed === false && truth.independentlyCertified === false);
  check(`sku:${tier}:forbidden-claims-rejected`, truth.forbiddenClaims.every((claim) => !auditCommercialCopyIsSafe(claim)));
}
check("sku:human-reviewed-lane-separated", HUMAN_REVIEWED_AUDIT_LANE_TRUTH.available === false && HUMAN_REVIEWED_AUDIT_LANE_TRUTH.decision === "NOT_FOR_SALE");
check("sku:basic-free-informational", CURRENT_AUDIT_COMMERCIAL_SKU_TRUTH.basic.decision === "GO_FREE_INFORMATIONAL");
check("sku:pro-pilot-paid-informational", CURRENT_AUDIT_COMMERCIAL_SKU_TRUTH.pro.decision === "PILOT_ONLY_PAID_INFORMATIONAL");
check("sku:advanced-pilot-paid-informational", CURRENT_AUDIT_COMMERCIAL_SKU_TRUTH.advanced.decision === "PILOT_ONLY_PAID_INFORMATIONAL");

const basicAdditions = new Set(CURRENT_AUDIT_TIER_CONTRACTS.basic.includes);
const proAdditions = CURRENT_AUDIT_TIER_CONTRACTS.pro.includes.filter((entry) => !basicAdditions.has(entry));
const proSet = new Set(CURRENT_AUDIT_TIER_CONTRACTS.pro.includes);
const advancedAdditions = CURRENT_AUDIT_TIER_CONTRACTS.advanced.includes.filter((entry) => !proSet.has(entry));
check("tier-value:pro-has-material-additions", proAdditions.length >= CURRENT_AUDIT_COMMERCIAL_SKU_TRUTH.pro.minimumMaterialAdditionsOverPreviousTier, proAdditions);
check("tier-value:advanced-has-material-additions", advancedAdditions.length >= CURRENT_AUDIT_COMMERCIAL_SKU_TRUTH.advanced.minimumMaterialAdditionsOverPreviousTier, advancedAdditions);
check("tier-value:no-duplicate-includes", tiers.every((tier) => new Set(CURRENT_AUDIT_TIER_CONTRACTS[tier].includes).size === CURRENT_AUDIT_TIER_CONTRACTS[tier].includes.length));

const matrix = buildAuditTierCustomerMatrix({
  requestedTier: "advanced",
  paymentVerified: false,
  paymentVerifiedForTier: { basic: true, pro: false, advanced: false },
  preCheckoutReady: { basic: true, pro: true, advanced: true },
  deliveryReady: { basic: true, pro: false, advanced: false },
  blockers: { basic: [], pro: ["pilot_only"], advanced: ["pilot_only"] },
});
check("matrix:current-schema", matrix.schemaVersion.includes("a102r44p2"));
check("matrix:advanced-never-manual-review-required", matrix.tiers.find((row) => row.tier === "advanced")?.releaseState !== "manual_review_required");
check("matrix:advanced-payment-fail-closed", matrix.tiers.find((row) => row.tier === "advanced")?.releaseState === "payment_required");

const oldPositiveClaims = [
  "qualified human review",
  "human-reviewed deliverable",
  "manual analyst sign-off",
  "operator final sign-off and signed delivery",
  "planned qualified-human-review lane",
];
for (const locale of ["pl", "en", "de"] as const) {
  const page = buildVlmAuditProductPage(locale);
  const advanced = page.packages.find((pkg) => pkg.id === "advanced_audit");
  check(`page:${locale}:advanced-package-present`, Boolean(advanced));
  check(`page:${locale}:advanced-automated`, advanced?.humanReviewed === false && advanced?.commercialMode === "paid_automated_informational_analysis");
  const pageText = JSON.stringify(page).toLowerCase();
  for (const phrase of oldPositiveClaims) check(`page:${locale}:no-positive-claim:${phrase}`, !pageText.includes(phrase));
  check(`page:${locale}:forbidden-claims-list-remains`, page.forbiddenClaims.length > 0);

  const account = buildVlmAuditAccountMessage({
    locale,
    now: new Date("2026-08-02T00:00:00.000Z"),
    submission: { projectName: "Wave2 fixture", chain: "ethereum", reviewLevel: "advanced_review" },
  });
  const accountText = JSON.stringify(account).toLowerCase();
  check(`account:${locale}:advanced-automated-copy`, accountText.includes(locale === "pl" ? "automatycz" : locale === "de" ? "automatis" : "automated"));
  check(`account:${locale}:no-reviewer-signoff`, !/(reviewer|final sign-off|qualified human|kwalifikowan|menschliche prüfung)/u.test(accountText));

  const business = buildAuditBusinessFlow(locale);
  const businessAdvanced = business.tiers.find((tier) => tier.id === "advanced_review");
  check(`business:${locale}:advanced-pilot-only`, businessAdvanced?.boundary.startsWith("PILOT_ONLY") === true);
  check(`business:${locale}:advanced-automated`, /automat/u.test((businessAdvanced?.caption ?? "").toLowerCase()));
}

const pdfOptions = {
  title: "VELMÈRE SECURITY — ADVANCED AUTOMATED ANALYSIS",
  subtitle: "Evidence-bound informational report",
  documentId: "VLM-WAVE2-ADV-0001",
  generatedAt: "2026-08-02T00:00:00.000Z",
  locale: "en" as const,
  classification: "customer_safe" as const,
};
const pdfLines = [
  "SCOPE",
  "Automated informational analysis of the supplied contract snapshot.",
  "EVIDENCE",
  "Three independent evidence families were evaluated.",
  "CONTRADICTIONS",
  "Provider A and provider B disagree on the current administration state.",
  "LIMITATIONS",
  "No human review, independent certification, safety guarantee or personalised investment advice is included.",
  "NEXT SAFE CHECK",
  "Verify the latest deployed bytecode and proxy implementation before relying on the result.",
];
const plan = planCustomerSafePdf(pdfLines, pdfOptions);
check("pdf:issuer-line", plan.issuerLine.includes("Issued by Velmère Security") && plan.issuerLine.includes("Generated automatically by Velmère Security Engine"));
check("pdf:integrity-line", plan.integrityLine.includes("Document integrity verified by Velmère"));
check("pdf:content-digest", /^sha256:[0-9a-f]{64}$/u.test(plan.contentDigest));
check("pdf:plan-digest", /^sha256:[0-9a-f]{64}$/u.test(plan.planDigest));
check("pdf:customer-safe-footer", /automated informational analysis/iu.test(plan.footer) && /not human-reviewed/iu.test(plan.footer));
check("pdf:no-unsafe-line-filtering-loss", plan.sourceLineCount === pdfLines.length);

const pdf1 = buildCustomerSafeMinimalPdf(pdfLines, pdfOptions);
const pdf2 = buildCustomerSafeMinimalPdf(pdfLines, pdfOptions);
check("pdf:deterministic-bytes", pdf1.equals(pdf2), { sha256: sha256(pdf1), bytes: pdf1.length });
check("pdf:header", pdf1.subarray(0, 8).toString("ascii") === "%PDF-1.7");
const pdfAscii = pdf1.toString("latin1");
for (const forbidden of ["/JavaScript", "/JS", "/OpenAction", "/Launch", "/EmbeddedFile", "/XFA", "/Encrypt"]) {
  check(`pdf:no-active-content:${forbidden}`, !pdfAscii.includes(forbidden));
}
check("pdf:issuer-encoded-in-plan", plan.issuerLine.length > 20 && plan.integrityLine.length > 20);

const sourceSurfaces = [
  "components/security/SecurityAuditsCleanPage.tsx",
  "lib/security/vlm-audit-product.ts",
  "lib/security/audit-business-flow.ts",
  "lib/security/pro-audit-pdf/render-pro-audit-pdf.ts",
].map((file) => ({ file, text: fs.readFileSync(file, "utf8").toLowerCase() }));
for (const { file, text } of sourceSurfaces) {
  check(`source:${file}:no-qualified-human-positive-copy`, !text.includes("planned qualified-human-review lane"));
  check(`source:${file}:no-human-review-sales-claim`, !text.includes("manual analyst review") || file.endsWith("audit-tier-contract.ts"));
}

const output = {
  status: "PASS_A102R44P2_AUTOMATED_INFORMATIONAL_SKU_PDF_SEAL",
  checks: checks.length,
  passed: checks.filter((row) => row.passed).length,
  failed: 0,
  sourceTruth: {
    historicalAdvancedHumanReviewed: legacyAdvanced.humanReviewRequired,
    currentAdvancedAutomated: currentAdvanced.humanReviewRequired === false,
    currentAdvancedSaleDecision: CURRENT_AUDIT_COMMERCIAL_SKU_TRUTH.advanced.decision,
    humanReviewedLaneSaleDecision: HUMAN_REVIEWED_AUDIT_LANE_TRUTH.decision,
  },
  pdf: {
    bytes: pdf1.length,
    sha256: sha256(pdf1),
    contentDigest: plan.contentDigest,
    planDigest: plan.planDigest,
    pages: plan.pages.length,
  },
  checksDetail: checks,
};
console.log(JSON.stringify(output, null, 2));
