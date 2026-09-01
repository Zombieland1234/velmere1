#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  DEFAULT_LOCAL_PRODUCT_QUALITY_POLICY,
  evaluateLocalProductQuality,
} from "./verify-local-product-quality.mjs";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync(path.join(root, DEFAULT_LOCAL_PRODUCT_QUALITY_POLICY), "utf8"));
const TIERS = ["basic", "pro", "advanced"];
const LOCALES = ["pl", "en", "de"];
const SURFACES = ["shield", "real_markets", "smart_contract_audit", "lens_pdf", "vlm_brain", "angel"];

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function corpusCase(surface, index) {
  return {
    id: `${surface}-${String(index).padStart(3, "0")}`,
    surface,
    category: `category-${index % 5}`,
    input: { fixture: `local/${surface}/${index}` },
    adversarialFlags: ["local_fixture"],
    evidencePolicy: { missingPolicy: "fail_closed" },
    expectedByTier: Object.fromEntries(TIERS.map((tier) => [tier, {
      outcome: `${tier}_bounded_local_output`,
      minSourceFamilies: tier === "basic" ? 1 : 2,
      mustFailClosedOnMissingEvidence: tier !== "basic",
      requiresHumanReview: surface === "smart_contract_audit" && tier === "advanced",
      requiredSections: ["scope", "evidence", "limitations", "next_safe_check"],
    }])),
    localePolicy: {
      requiredLocales: [...LOCALES],
      mustUseRequestedLocale: true,
      mustNotFallbackToEnglish: true,
    },
    fingerprint: createHash("sha256").update(`${surface}:${index}`).digest("hex"),
  };
}

function validFixture() {
  const cases = SURFACES.flatMap((surface) => Array.from({ length: 50 }, (_, index) => corpusCase(surface, index + 1)));
  const pdfs = [];
  const fileFacts = {};
  const pageCountByTier = { Basic: 2, Pro: 4, Advanced: 8 };
  for (const tier of Object.keys(pageCountByTier)) {
    for (let index = 1; index <= 50; index += 1) {
      const id = `pdf-${tier.toLowerCase()}-${String(index).padStart(2, "0")}`;
      const pdfPath = `artifacts/pass35/local-product-quality/pdfs/${id}.pdf`;
      const sha256 = digest(`${id}:deterministic-pdf-bytes`);
      const byteLength = 2_000 + index + pageCountByTier[tier] * 100;
      const row = {
        id,
        assetId: `asset-${String(index).padStart(2, "0")}`,
        symbol: `T${String(index).padStart(2, "0")}`,
        tier,
        locale: "pl",
        scenario: "synthetic_local_quality",
        path: pdfPath,
        sha256,
        byteLength,
        pageCount: pageCountByTier[tier],
        a4PageCount: pageCountByTier[tier],
        syntheticMarkersPresent: true,
        bannedDirectionalLanguageAbsent: true,
        sourceMode: "missing",
        sourceConfidence: 0,
        commercialUseAllowed: false,
        status: "PASS",
        reasons: [],
      };
      pdfs.push(row);
      fileFacts[pdfPath] = {
        exists: true,
        regularFile: true,
        pdfMagic: true,
        byteLength,
        sha256,
      };
    }
  }

  return {
    policy: structuredClone(policy),
    corpus: {
      schemaVersion: "velmere.pass16.worldclass-corpus.v1",
      counts: { baseCases: 300, casesPerSurface: 50, expandedCases: 2700, tiers: 3, locales: 3 },
      tiers: [...TIERS],
      locales: [...LOCALES],
      cases,
    },
    pass17: {
      schemaVersion: "velmere.pass17.market-adapter-verification.v1",
      fixtures: 100,
      matrixRowsExecuted: 900,
      contractPass: 900,
      deterministicPass: 900,
      lineagePass: 900,
      differentiationGroups: 300,
      differentiationFailures: 0,
      localeChecks: 300,
      localeFailures: 0,
      failures: 0,
      byStatus: {
        "shield:basic:passed": 150,
        "shield:pro:passed": 150,
        "shield:advanced:passed": 150,
        "real_markets:basic:passed": 150,
        "real_markets:pro:passed": 150,
        "real_markets:advanced:passed": 150,
      },
      ok: true,
      truthBoundary: "All 900 outputs are deterministic synthetic adapter simulations. They are not the 900 canonical provider-bound product outputs and do not change 0/2700 canonical execution status.",
    },
    pass18: {
      schemaVersion: "velmere.pass18.audit-lens-adapter-simulation-summary.v1",
      ok: true,
      baseCases: 100,
      auditCases: 50,
      lensCases: 50,
      matrixRowsExecuted: 900,
      contractPass: 900,
      deterministicPass: 900,
      lineagePass: 900,
      differentiationGroups: 300,
      differentiationFailures: 0,
      localeGroups: 300,
      localeFailures: 0,
      byStatus: {
        "smart_contract_audit:basic:passed": 150,
        "smart_contract_audit:pro:passed": 150,
        "smart_contract_audit:advanced:blocked": 150,
        "lens_pdf:basic:passed": 150,
        "lens_pdf:pro:passed": 150,
        "lens_pdf:advanced:passed": 150,
      },
      advancedAuditSafelyBlockedWithoutRealHumanReview: 150,
      canonicalProviderOrReviewerBoundOutputsExecuted: 0,
      renderedBrowserPdfOutputsExecuted: 0,
      failures: [],
      truthBoundary: "PASS18 verifies deterministic adapter behavior on synthetic contract and report fixtures. Fixture labels and simulated human-review states never count as detector precision/recall, rendered customer PDF, provider, reviewer, staging or LIVE proof. Advanced smart-contract outputs remain blocked without a real-human approved review receipt.",
    },
    dashboard: {
      schemaVersion: "velmere.pass35.readiness-dashboard.v1",
      globalDecision: "NO_GO",
      promotionAllowed: false,
      externalEvidenceSummary: { required: 3074, verified: 0, completeWorkstreams: 0, totalWorkstreams: 9 },
      productCellSummary: { total: 30, sellEnabled: 0 },
      truthBoundary: "This dashboard is computed from fail-closed local control records. It is not staging, live, legal, independent, customer or market proof.",
    },
    catalog: {
      schemaVersion: "velmere.pass35.product-cell-catalog.v1",
      catalogPolicy: { catalogApproved: false, sellByDefault: false, legacySkuMayAuthorizeCharge: false },
      productCells: Array.from({ length: 30 }, (_, index) => ({
        productCellId: `cell-${index + 1}`,
        sellEnabled: false,
        sellBlockedReasons: ["LOCAL_SYNTHETIC_ONLY"],
      })),
    },
    pdfReceipt: {
      schemaVersion: "velmere.pass35.local-pdf-qa-receipt.v1",
      generatedAt: "2026-07-22T00:00:00.000Z",
      mode: "synthetic_offline_renderer_qa",
      status: "PASS",
      manifest: { path: "artifacts/pass35/local-product-quality/PASS35_LOCAL_PDF_MANIFEST.json", sha256: digest("manifest") },
      boundaries: {
        synthetic: true,
        offline: true,
        notLive: true,
        notForSale: true,
        investmentRecommendation: false,
        productionEntitlementBypassed: false,
      },
      totals: { pdfCount: 150, byTier: { Basic: 50, Pro: 50, Advanced: 50 }, totalPages: 700 },
      pdfs,
      assertions: { total: 1_000, passed: 1_000, failed: 0 },
      failures: [],
    },
    fileFacts,
  };
}

const baseline = validFixture();
const baselineResult = evaluateLocalProductQuality(baseline);
assert.equal(baselineResult.ok, true, JSON.stringify(baselineResult.failures, null, 2));
assert.equal(baselineResult.status, "PASS_LOCAL_SYNTHETIC_QUALITY_NO_PROMOTION");
assert.equal(baselineResult.summary.externalEvidenceCredit, 0);
assert.equal(baselineResult.releaseBoundary.promotionAllowed, false);
assert.equal(baselineResult.releaseBoundary.sellEnabled, false);
assert.equal(baselineResult.releaseBoundary.investmentRecommendation, false);

const mutations = [];
function mutation(name, expectedCheck, mutate) {
  const fixture = validFixture();
  mutate(fixture);
  const result = evaluateLocalProductQuality(fixture);
  assert.equal(result.ok, false, `${name} unexpectedly passed`);
  assert.equal(result.status, "FAIL_CLOSED_LOCAL_PRODUCT_QUALITY", name);
  assert.equal(result.releaseBoundary.externalEvidenceCredit, 0, name);
  assert.equal(result.releaseBoundary.promotionAllowed, false, name);
  assert.equal(result.failures.some((row) => row.id === expectedCheck), true, `${name} missing ${expectedCheck}: ${JSON.stringify(result.failures)}`);
  mutations.push({ name, expectedCheck, failedChecks: result.failures.length });
}

mutation("pass16_surface_shortfall", "pass16_shield_exact_50", (value) => {
  value.corpus.cases.splice(value.corpus.cases.findIndex((row) => row.surface === "shield"), 1);
});
mutation("pass16_tier_removed", "pass16_tier_set", (value) => { value.corpus.tiers.pop(); });
mutation("pass16_duplicate_case_id", "pass16_unique_case_ids", (value) => { value.corpus.cases[1].id = value.corpus.cases[0].id; });
mutation("pass16_locale_fallback_allowed", "pass16_lens_pdf_locale_contracts", (value) => {
  value.corpus.cases.find((row) => row.surface === "lens_pdf").localePolicy.mustNotFallbackToEnglish = false;
});
mutation("pass17_not_ok", "pass17_status_ok", (value) => { value.pass17.ok = false; });
mutation("pass17_matrix_short", "pass17_matrix_900", (value) => { value.pass17.matrixRowsExecuted = 899; });
mutation("pass17_contract_short", "pass17_contract_900", (value) => { value.pass17.contractPass = 899; });
mutation("pass17_determinism_short", "pass17_determinism_900", (value) => { value.pass17.deterministicPass = 899; });
mutation("pass17_lineage_short", "pass17_lineage_900", (value) => { value.pass17.lineagePass = 899; });
mutation("pass17_truth_boundary_removed", "pass17_synthetic_truth_boundary", (value) => { value.pass17.truthBoundary = "production proven"; });
mutation("pass17_surface_status_short", "pass17_status_rows_exact", (value) => { value.pass17.byStatus["shield:basic:passed"] = 149; });
mutation("pass18_matrix_short", "pass18_matrix_900", (value) => { value.pass18.matrixRowsExecuted = 899; });
mutation("pass18_contract_short", "pass18_contract_900", (value) => { value.pass18.contractPass = 899; });
mutation("pass18_determinism_short", "pass18_determinism_900", (value) => { value.pass18.deterministicPass = 899; });
mutation("pass18_lineage_short", "pass18_lineage_900", (value) => { value.pass18.lineagePass = 899; });
mutation("pass18_advanced_block_short", "pass18_advanced_audit_150_blocked", (value) => {
  value.pass18.byStatus["smart_contract_audit:advanced:blocked"] = 149;
  value.pass18.advancedAuditSafelyBlockedWithoutRealHumanReview = 149;
});
mutation("pass18_advanced_false_release", "pass18_advanced_audit_150_blocked", (value) => {
  value.pass18.byStatus["smart_contract_audit:advanced:blocked"] = 149;
  value.pass18.byStatus["smart_contract_audit:advanced:passed"] = 1;
});
mutation("pass18_external_credit", "pass18_zero_external_outputs", (value) => { value.pass18.canonicalProviderOrReviewerBoundOutputsExecuted = 1; });
mutation("pass18_truth_boundary_removed", "pass18_synthetic_truth_boundary", (value) => { value.pass18.truthBoundary = "live provider proof"; });
mutation("dashboard_go", "dashboard_no_go", (value) => { value.dashboard.globalDecision = "GO"; });
mutation("dashboard_external_credit", "dashboard_zero_external_credit", (value) => { value.dashboard.externalEvidenceSummary.verified = 1; });
mutation("catalog_sell_enabled", "catalog_all_sell_disabled", (value) => { value.catalog.productCells[0].sellEnabled = true; });
mutation("pdf_receipt_missing", "pdf_receipt_required_present", (value) => { value.pdfReceipt = null; });
mutation("pdf_total_short", "pdf_receipt_exact_total", (value) => { value.pdfReceipt.pdfs.pop(); });
mutation("pdf_wrong_page_count", "pdf_rows_page_contract", (value) => { value.pdfReceipt.pdfs[0].pageCount = 3; });
mutation("pdf_directional_advice_present", "pdf_rows_no_transaction_advice", (value) => { value.pdfReceipt.pdfs[0].bannedDirectionalLanguageAbsent = false; });
mutation("pdf_investment_recommendation", "pdf_receipt_boundaries", (value) => { value.pdfReceipt.boundaries.investmentRecommendation = true; });
mutation("pdf_commercial_use", "pdf_rows_synthetic_local_only", (value) => { value.pdfReceipt.pdfs[0].commercialUseAllowed = true; });
mutation("pdf_source_confidence_fabricated", "pdf_rows_synthetic_local_only", (value) => { value.pdfReceipt.pdfs[0].sourceConfidence = 80; });
mutation("pdf_source_mode_live", "pdf_rows_synthetic_local_only", (value) => { value.pdfReceipt.pdfs[0].sourceMode = "live_provider"; });
mutation("pdf_digest_not_byte_bound", "pdf_files_bound_to_receipt", (value) => { value.fileFacts[value.pdfReceipt.pdfs[0].path].sha256 = digest("tampered"); });
mutation("pdf_duplicate_id", "pdf_rows_unique_ids", (value) => { value.pdfReceipt.pdfs[1].id = value.pdfReceipt.pdfs[0].id; });
mutation("pdf_duplicate_asset", "pdf_rows_50_unique_assets_per_tier", (value) => { value.pdfReceipt.pdfs[1].assetId = value.pdfReceipt.pdfs[0].assetId; });
mutation("pdf_failed_assertion", "pdf_receipt_assertions_pass", (value) => {
  value.pdfReceipt.assertions.passed = 999;
  value.pdfReceipt.assertions.failed = 1;
  value.pdfReceipt.failures.push("fixture_failure");
});
mutation("policy_external_credit_enabled", "policy_zero_external_credit", (value) => { value.policy.decision.externalCreditOnPass = 1; });
mutation("policy_promotion_enabled", "policy_no_promotion", (value) => { value.policy.decision.promotionAllowedOnPass = true; });

assert.ok(mutations.length >= 12);
process.stdout.write(`${JSON.stringify({
  schemaVersion: "velmere.pass35.local-product-quality-mutation-tests.v1",
  status: "PASS",
  baselineChecks: baselineResult.summary.checks,
  baselinePassed: baselineResult.summary.passed,
  mutationTests: mutations.length,
  mutationTestsPassed: mutations.length,
  failClosed: true,
  externalEvidenceCredit: 0,
  promotionAllowed: false,
  rows: mutations,
}, null, 2)}\n`);
