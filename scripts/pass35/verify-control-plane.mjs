#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  PASS35_MANIFEST_PROFILES,
  detectPass35ManifestProfile,
} from "./release-manifest-set.mjs";
import {
  PASS35_LOCAL_PDF_QA_SUMMARY_PATH,
  validatePass35LocalPdfQaSummary,
} from "./local-pdf-qa-summary.mjs";
import { loadAuditExecutionPolicy, validateAuditExecutionPolicy } from "./audit-execution-envelope.mjs";

const root = process.cwd();
const CANDIDATE = "VELMERE_PASS35_OFFLINE_CANDIDATE_R3";
const CONTROL_PLANE_RECEIPT_PATH = "_velmere/pass35/PASS35_CONTROL_PLANE_RECEIPT.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));
const optionalJson = (file) => {
  const absolute = path.join(root, file);
  return existsSync(absolute) ? JSON.parse(readFileSync(absolute, "utf8")) : null;
};
const manifestProfile = detectPass35ManifestProfile(root, PASS35_MANIFEST_PROFILES.WORKSPACE);
const sourcePackageProfile = manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE;
const checks = [];
function check(id, ok, detail = null) {
  checks.push({ id, ok: Boolean(ok), ...(detail === null ? {} : { detail }) });
}
function writeControlPlaneReceipt(receiptCore) {
  const receipt = { ...receiptCore, receiptSha256: sha256(JSON.stringify(receiptCore)) };
  mkdirSync(path.join(root, path.dirname(CONTROL_PLANE_RECEIPT_PATH)), { recursive: true });
  writeFileSync(path.join(root, CONTROL_PLANE_RECEIPT_PATH), `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}
function walk(directory, prefix = "") {
  const result = [];
  if (!existsSync(directory)) return result;
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    const absolute = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...walk(absolute, relative));
    else if (item.isFile()) result.push(relative);
  }
  return result.sort();
}

const requiredFiles = [
  "README.md",
  "CLEAN_SAFE_README.md",
  "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt",
  "config/current-release.json",
  "config/pass35/pre-gates.json",
  "config/pass35/flagship-candidate-plan.json",
  "config/pass35/product-cell-catalog.json",
  "config/pass35/legal-applicability.json",
  "config/pass35/staging-plan.json",
  "config/pass35/evidence-policy.json",
  "config/pass35/provider-denominator.json",
  "config/pass35/ai-system-inventory.json",
  "config/pass35/audit-program.json",
  "config/pass35/audit-execution-envelope.json",
  "config/pass35/audit-a01-a05-policy.json",
  "config/pass35/audit-a4-execution-policy.json",
  "config/pass35/audit-a5-execution-policy.json",
  "config/pass35/audit-a6-execution-policy.json",
  "config/pass35/audit-a7-execution-policy.json",
  "config/pass35/audit-a8-execution-policy.json",
  "config/pass35/product-tier-content-contract.json",
  "config/pass35/market-impact-whale-tier-contract.json",
  "artifacts/release/PASS35_A11_MARKET_IMPACT_WHALE_TIER_CONTRACT.md",
  "artifacts/release/PASS35_A11_PRODUCT_ROADMAP_SUMMARY.json",
  "config/pass35/public-provider-runtime-contract.json",
  "artifacts/release/PASS35_A12_PUBLIC_PROVIDER_RUNTIME.md",
  "artifacts/release/PASS35_A12_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/market-integrity/pass35-public-provider-catalog-runtime.mjs",
  "lib/market-integrity/pass35-public-whale-runtime.ts",
  "scripts/pass35/build-a12-public-provider-roadmap.mjs",
  "scripts/pass35/test-a12-public-provider-catalog-runtime.mjs",
  "scripts/pass35/test-a12-public-whale-runtime.mjs",
  "scripts/pass35/test-a12-control-plane.mjs",
  "config/pass35/a13-functional-runtime-contract.json",
  "artifacts/release/PASS35_A13_FUNCTIONAL_RUNTIME.md",
  "artifacts/release/PASS35_A13_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/market-integrity/pass35-public-fx-runtime.mjs",
  "lib/market-integrity/pass35-market-target-scheduler.mjs",
  "lib/market-integrity/pass35-whale-supported-token-denominator.mjs",
  "scripts/pass35/build-a13-functional-runtime-roadmap.mjs",
  "scripts/pass35/test-a13-public-fx-runtime.mjs",
  "scripts/pass35/test-a13-market-target-scheduler.mjs",
  "scripts/pass35/test-a13-whale-token-denominator.mjs",
  "scripts/pass35/test-a13-control-plane.mjs",
  "config/pass35/a14-market-execution-contract.json",
  "artifacts/release/PASS35_A14_MARKET_EXECUTION.md",
  "artifacts/release/PASS35_A14_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/market-integrity/pass35-full-catalog-execution-ledger.mjs",
  "lib/market-integrity/pass35-public-securities-catalog-runtime.mjs",
  "lib/market-integrity/pass35-whale-binding-resolver.mjs",
  "lib/market-integrity/pass35-market-impact-full-denominator.mjs",
  "scripts/pass35/build-a14-market-execution-roadmap.mjs",
  "scripts/pass35/test-a14-full-catalog-execution-ledger.mjs",
  "scripts/pass35/test-a14-public-securities-catalog-runtime.mjs",
  "scripts/pass35/test-a14-whale-binding-resolver.mjs",
  "scripts/pass35/test-a14-market-impact-full-denominator.mjs",
  "scripts/pass35/test-a14-control-plane.mjs",
  "config/pass35/a15-imported-snapshot-runtime-contract.json",
  "artifacts/release/PASS35_A15_IMPORTED_SNAPSHOT_RUNTIME.md",
  "artifacts/release/PASS35_A15_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/market-integrity/pass35-snapshot-evidence-bundle.mjs",
  "lib/market-integrity/pass35-public-securities-quote-history-runtime.mjs",
  "lib/market-integrity/pass35-order-book-import-replay.mjs",
  "lib/market-integrity/pass35-whale-evidence-bundle-runtime.mjs",
  "lib/market-integrity/pass35-corporate-actions-calendar-runtime.mjs",
  "lib/market-integrity/pass35-cross-asset-normalization.mjs",
  "lib/market-integrity/pass35-real-markets-tier-runtime.mjs",
  "lib/market-integrity/pass35-ledger-denominator-bridge.mjs",
  "scripts/pass35/a15-test-fixtures.mjs",
  "scripts/pass35/test-a15-corporate-actions-calendar.mjs",
  "scripts/pass35/test-a15-real-markets-tier-runtime.mjs",
  "scripts/pass35/test-a15-ledger-denominator-bridge.mjs",
  "scripts/pass35/build-a15-imported-snapshot-roadmap.mjs",
  "scripts/pass35/test-a15-snapshot-evidence-bundle.mjs",
  "scripts/pass35/test-a15-public-securities-quote-history.mjs",
  "scripts/pass35/test-a15-order-book-import-replay.mjs",
  "scripts/pass35/test-a15-whale-evidence-bundle.mjs",
  "scripts/pass35/test-a15-control-plane.mjs",
  "config/pass35/a16-canonical-risk-runtime-contract.json",
  "artifacts/release/PASS35_A16_CANONICAL_RISK_RUNTIME.md",
  "artifacts/release/PASS35_A16_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/market-integrity/pass35-a16-canonical-channel-parity.ts",
  "lib/market-integrity/pass35-a16-cross-asset-portfolio-runtime.mjs",
  "lib/market-integrity/pass35-a16-regime-stress-runtime.mjs",
  "lib/market-integrity/pass35-a16-risk-prospective-runtime.mjs",
  "scripts/pass35/a16-test-fixtures.mjs",
  "scripts/pass35/build-a16-canonical-risk-roadmap.ts",
  "scripts/pass35/test-a16-canonical-channel-parity.ts",
  "scripts/pass35/test-a16-cross-asset-portfolio.mjs",
  "scripts/pass35/test-a16-regime-stress.mjs",
  "scripts/pass35/test-a16-risk-prospective.mjs",
  "scripts/pass35/test-a16-control-plane.mjs",
  "config/pass35/a17-evidence-family-registry.json",
  "config/pass35/a17-evidence-decision-runtime-contract.json",
  "artifacts/release/PASS35_A17_EVIDENCE_QUALITY_RUNTIME.json",
  "artifacts/release/PASS35_A17_RISK_CALIBRATION_RUNTIME.json",
  "artifacts/release/PASS35_A17_EVIDENCE_DECISION_RUNTIME.md",
  "artifacts/release/PASS35_A17_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/market-integrity/pass35-a17-evidence-family-registry.mjs",
  "lib/market-integrity/pass35-a17-evidence-quality-decision-runtime.mjs",
  "lib/market-integrity/pass35-a17-risk-calibration-evaluation-runtime.mjs",
  "lib/reporting/pass35-a17-packet-pdf-runtime.mjs",
  "scripts/pass35/build-a17-evidence-decision-roadmap.ts",
  "scripts/pass35/generate-a17-packet-pdf-corpus.ts",
  "scripts/pass35/verify-a17-packet-pdf-corpus.mjs",
  "scripts/pass35/verify-a17-packet-pdf-raster-receipt.mjs",
  "scripts/pass35/verify-a17-packet-pdf-package-boundary.mjs",
  "scripts/pass35/verify-a17-packet-pdf-raster-package-boundary.mjs",
  "scripts/pass35/test-a17-evidence-quality-decision.ts",
  "scripts/pass35/test-a17-risk-calibration-evaluation.mjs",
  "scripts/pass35/test-a17-control-plane.mjs",
  "config/pass35/a18-tier-value-benchmark-policy.json",
  "config/pass35/a18-tier-value-runtime-contract.json",
  "artifacts/release/PASS35_A18_TIER_VALUE_BENCHMARK.md",
  "artifacts/release/PASS35_A18_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A18_TIER_VALUE_BENCHMARK_RUNTIME.json",
  "artifacts/pass35/PASS35_A18_TIER_VALUE_BENCHMARK_RECEIPT.json",
  "artifacts/pass35/PASS35_A18_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "lib/market-integrity/pass35-a18-tier-value-benchmark-runtime.mjs",
  "scripts/pass35/build-a18-tier-value-roadmap.mjs",
  "scripts/pass35/test-a18-tier-value-benchmark.mjs",
  "scripts/pass35/test-a18-control-plane.mjs",
  "scripts/pass35/run-a18-nondestructive-regression.mjs",
  "config/pass35/a19-exact-runtime-bootstrap-policy.json",
  "config/pass35/a19-audit-static-benchmark-policy.json",
  "config/pass35/a19-exact-runtime-audit-static-runtime-contract.json",
  "artifacts/release/PASS35_A19_EXACT_RUNTIME_AUDIT_STATIC_BENCHMARK.md",
  "artifacts/release/PASS35_A19_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A19_EXACT_RUNTIME_BOOTSTRAP_EVALUATION.json",
  "artifacts/pass35/PASS35_A19_AUDIT_STATIC_BENCHMARK_RUNTIME.json",
  "artifacts/pass35/PASS35_A19_AUDIT_STATIC_BENCHMARK_RECEIPT.json",
  "artifacts/pass35/PASS35_A19_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "config/pass35/a20-case-bound-dependency-policy.json",
  "config/pass35/a20-case-bound-dependency-runtime-contract.json",
  "artifacts/pass35/PASS35_A20_CASE_BOUND_DEPENDENCY_BENCHMARK.json",
  "artifacts/pass35/PASS35_A20_CASE_BOUND_DEPENDENCY_RECEIPT.json",
  "artifacts/pass35/PASS35_A20_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A20_CASE_BOUND_DEPENDENCY.md",
  "artifacts/release/PASS35_A20_PRODUCT_ROADMAP_SUMMARY.json",
  "config/pass35/a21-abstract-path-policy.json",
  "config/pass35/a21-abstract-path-runtime-contract.json",
  "artifacts/pass35/PASS35_A21_ABSTRACT_PATH_BENCHMARK.json",
  "artifacts/pass35/PASS35_A21_ABSTRACT_PATH_RECEIPT.json",
  "artifacts/pass35/PASS35_A21_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A21_ABSTRACT_PATH.md",
  "artifacts/release/PASS35_A21_PRODUCT_ROADMAP_SUMMARY.json",
  "config/pass35/a22-severity-triage-policy.json",
  "config/pass35/a22-severity-triage-runtime-contract.json",
  "artifacts/pass35/PASS35_A22_SEVERITY_TRIAGE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A22_SEVERITY_TRIAGE_RECEIPT.json",
  "artifacts/pass35/PASS35_A22_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A22_SEVERITY_TRIAGE.md",
  "artifacts/release/PASS35_A22_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/security/pass35-a22-severity-triage-runtime.mjs",
  "scripts/pass35/build-a22-severity-triage-roadmap.mjs",
  "scripts/pass35/test-a22-severity-triage.mjs",
  "scripts/pass35/test-a22-control-plane.mjs",
  "scripts/pass35/run-a22-nondestructive-regression.mjs",
  "config/pass35/a23-remediation-closure-policy.json",
  "config/pass35/a23-remediation-closure-runtime-contract.json",
  "artifacts/pass35/PASS35_A23_REMEDIATION_CLOSURE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A23_REMEDIATION_CLOSURE_RECEIPT.json",
  "artifacts/pass35/PASS35_A23_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A23_REMEDIATION_CLOSURE.md",
  "artifacts/release/PASS35_A23_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/security/pass35-a23-remediation-closure-runtime.mjs",
  "scripts/pass35/build-a23-remediation-closure-roadmap.mjs",
  "scripts/pass35/test-a23-remediation-closure.mjs",
  "scripts/pass35/test-a23-control-plane.mjs",
  "scripts/pass35/run-a23-nondestructive-regression.mjs",
  "config/pass35/a24-monitoring-lifecycle-policy.json",
  "config/pass35/a24-monitoring-lifecycle-runtime-contract.json",
  "artifacts/pass35/PASS35_A24_MONITORING_LIFECYCLE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A24_MONITORING_LIFECYCLE_RECEIPT.json",
  "artifacts/pass35/PASS35_A24_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A24_MONITORING_LIFECYCLE.md",
  "artifacts/release/PASS35_A24_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/security/pass35-a24-monitoring-lifecycle-runtime.mjs",
  "scripts/pass35/build-a24-monitoring-lifecycle-roadmap.mjs",
  "scripts/pass35/test-a24-monitoring-lifecycle.mjs",
  "scripts/pass35/test-a24-control-plane.mjs",
  "scripts/pass35/run-a24-nondestructive-regression.mjs",
  "scripts/pass35/aggregate-a24-regression-segments.mjs",
  "config/pass35/a25-exact-test-evidence-policy.json",
  "config/pass35/a25-exact-test-evidence-runtime-contract.json",
  "artifacts/pass35/PASS35_A25_EXACT_TEST_EVIDENCE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A25_EXACT_TEST_EVIDENCE_RECEIPT.json",
  "artifacts/pass35/PASS35_A25_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A25_EXACT_TEST_EVIDENCE.md",
  "artifacts/release/PASS35_A25_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/security/pass35-a25-exact-test-evidence-runtime.mjs",
  "scripts/pass35/build-a25-exact-test-evidence-roadmap.mjs",
  "scripts/pass35/test-a25-exact-test-evidence.mjs",
  "scripts/pass35/test-a25-control-plane.mjs",
  "scripts/pass35/run-a25-nondestructive-regression.mjs",
  "scripts/pass35/aggregate-a25-regression-segments.mjs",
  "config/pass35/a26-fuzz-invariant-evidence-policy.json",
  "config/pass35/a26-fuzz-invariant-evidence-runtime-contract.json",
  "artifacts/pass35/PASS35_A26_FUZZ_INVARIANT_EVIDENCE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A26_FUZZ_INVARIANT_EVIDENCE_RECEIPT.json",
  "artifacts/pass35/PASS35_A26_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A26_FUZZ_INVARIANT_EVIDENCE.md",
  "artifacts/release/PASS35_A26_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/security/pass35-a26-fuzz-invariant-evidence-runtime.mjs",
  "scripts/pass35/build-a26-fuzz-invariant-evidence-roadmap.mjs",
  "scripts/pass35/test-a26-fuzz-invariant-evidence.mjs",
  "scripts/pass35/test-a26-control-plane.mjs",
  "scripts/pass35/run-a26-nondestructive-regression.mjs",
  "scripts/pass35/aggregate-a26-regression-segments.mjs",
  "config/pass35/a27-fork-replay-evidence-policy.json",
  "config/pass35/a27-fork-replay-evidence-runtime-contract.json",
  "artifacts/pass35/PASS35_A27_FORK_REPLAY_EVIDENCE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A27_FORK_REPLAY_EVIDENCE_RECEIPT.json",
  "artifacts/pass35/PASS35_A27_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A27_FORK_REPLAY_EVIDENCE.md",
  "artifacts/release/PASS35_A27_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/security/pass35-a27-fork-replay-evidence-runtime.mjs",
  "scripts/pass35/build-a27-fork-replay-evidence-roadmap.mjs",
  "scripts/pass35/test-a27-fork-replay-evidence.mjs",
  "scripts/pass35/test-a27-control-plane.mjs",
  "scripts/pass35/run-a27-nondestructive-regression.mjs",
  "scripts/pass35/aggregate-a27-regression-segments.mjs",
  "config/pass35/a28-economic-adversarial-evidence-policy.json",
  "config/pass35/a28-economic-adversarial-evidence-runtime-contract.json",
  "artifacts/pass35/PASS35_A28_ECONOMIC_ADVERSARIAL_EVIDENCE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A28_ECONOMIC_ADVERSARIAL_EVIDENCE_RECEIPT.json",
  "artifacts/pass35/PASS35_A28_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A28_ECONOMIC_ADVERSARIAL_EVIDENCE.md",
  "artifacts/release/PASS35_A28_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/security/pass35-a28-economic-adversarial-evidence-runtime.mjs",
  "scripts/pass35/build-a28-economic-adversarial-evidence-roadmap.mjs",
  "scripts/pass35/test-a28-economic-adversarial-evidence.mjs",
  "scripts/pass35/test-a28-control-plane.mjs",
  "scripts/pass35/run-a28-nondestructive-regression.mjs",
  "scripts/pass35/aggregate-a28-regression-segments.mjs",
  "config/pass35/a29-upgrade-deployment-operations-policy.json",
  "config/pass35/a29-upgrade-deployment-operations-runtime-contract.json",
  "artifacts/pass35/PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS_BENCHMARK.json",
  "artifacts/pass35/PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS_RECEIPT.json",
  "artifacts/pass35/PASS35_A29_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS.md",
  "artifacts/release/PASS35_A29_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/security/pass35-a29-upgrade-deployment-operations-runtime.mjs",
  "scripts/pass35/build-a29-upgrade-deployment-operations-roadmap.mjs",
  "scripts/pass35/test-a29-upgrade-deployment-operations.mjs",
  "scripts/pass35/test-a29-control-plane.mjs",
  "scripts/pass35/run-a29-nondestructive-regression.mjs",
  "scripts/pass35/aggregate-a29-regression-segments.mjs",
  "config/pass35/a30-threat-model-policy.json",
  "config/pass35/a30-threat-model-runtime-contract.json",
  "artifacts/pass35/PASS35_A30_THREAT_MODEL_BENCHMARK.json",
  "artifacts/pass35/PASS35_A30_THREAT_MODEL_RECEIPT.json",
  "artifacts/pass35/PASS35_A30_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A30_THREAT_MODEL.md",
  "artifacts/release/PASS35_A30_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/security/pass35-a30-threat-model-runtime.mjs",
  "scripts/pass35/build-a30-threat-model-roadmap.mjs",
  "scripts/pass35/test-a30-threat-model.mjs",
  "scripts/pass35/test-a30-control-plane.mjs",
  "scripts/pass35/run-a30-nondestructive-regression.mjs",
  "scripts/pass35/aggregate-a30-regression-segments.mjs",
  "config/pass35/a31-privilege-control-policy.json",
  "config/pass35/a31-privilege-control-runtime-contract.json",
  "artifacts/pass35/PASS35_A31_PRIVILEGE_CONTROL_BENCHMARK.json",
  "artifacts/pass35/PASS35_A31_PRIVILEGE_CONTROL_RECEIPT.json",
  "artifacts/pass35/PASS35_A31_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A31_PRIVILEGE_CONTROL.md",
  "artifacts/release/PASS35_A31_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/security/pass35-a31-privilege-control-runtime.mjs",
  "scripts/pass35/build-a31-privilege-control-roadmap.mjs",
  "scripts/pass35/test-a31-privilege-control.mjs",
  "scripts/pass35/test-a31-control-plane.mjs",
  "scripts/pass35/run-a31-nondestructive-regression.mjs",
  "scripts/pass35/aggregate-a31-regression-segments.mjs",
  "config/pass35/a32-report-delivery-policy.json",
  "config/pass35/a32-report-delivery-runtime-contract.json",
  "artifacts/pass35/PASS35_A32_REPORT_DELIVERY_BENCHMARK.json",
  "artifacts/pass35/PASS35_A32_REPORT_DELIVERY_RECEIPT.json",
  "artifacts/pass35/PASS35_A32_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A32_REPORT_DELIVERY.md",
  "artifacts/release/PASS35_A32_PRODUCT_ROADMAP_SUMMARY.json",
  "lib/security/pass35-a32-report-delivery-runtime.mjs",
  "scripts/pass35/build-a32-report-delivery-roadmap.mjs",
  "scripts/pass35/test-a32-report-delivery.mjs",
  "scripts/pass35/test-a32-control-plane.mjs",
  "scripts/pass35/run-a32-nondestructive-regression.mjs",
  "scripts/pass35/aggregate-a32-regression-segments.mjs",
  "lib/runtime/pass35-a19-exact-runtime-bootstrap.mjs",
  "lib/security/pass35-a19-audit-static-benchmark-runtime.mjs",
  "scripts/pass35/build-a19-exact-runtime-audit-roadmap.mjs",
  "scripts/pass35/test-a19-exact-runtime-bootstrap.mjs",
  "scripts/pass35/test-a19-audit-static-benchmark.mjs",
  "scripts/pass35/test-a19-control-plane.mjs",
  "scripts/pass35/run-a19-nondestructive-regression.mjs",
  "lib/market-integrity/market-impact-whale-tier-runtime.ts",
  "scripts/pass35/build-a11-market-impact-whale-roadmap.mjs",
  "scripts/pass35/test-market-impact-whale-tier-contract.mjs",
  "scripts/pass35/test-market-impact-whale-runtime.ts",
  "config/pass35/zero-budget-functional-roadmap.json",
  "config/pass35/a9-visual-freeze-baseline.json",
  "artifacts/release/PASS35_A9_PRODUCT_TIER_CONTRACT.md",
  "artifacts/release/PASS35_A9_ZERO_BUDGET_ROADMAP.md",
  "artifacts/release/PASS35_A9_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/release/PASS35_A10_PRODUCT_ROADMAP_SUMMARY.json",
  "config/pass35/a08-foundry-invariant-plan.json",
  "config/pass35/current-status-register.json",
  "artifacts/release/PASS35_CURRENT_STATUS.md",
  "artifacts/release/PASS35_CURRENT_STATUS_SUMMARY.json",
  "config/pass35/external-proof-register.json",
  "config/pass35/source-lifecycle-classification.json",
  "config/pass35/detached-package-verification-policy.json",
  "config/pass35/governance-decision-policy.json",
  "config/pass35/external-evidence-intake-policy.json",
  "config/pass35/benchmark-review-policy.json",
  "config/pass35/assurance-customer-evidence-policy.json",
  "config/paid-surface-entitlement-policy.json",
  "_velmere/pass35/PASS35_OFFLINE_EXECUTION_RECEIPT.json",
  "_velmere/pass35/PASS35_EXTERNAL_BLOCKER_RECEIPT.json",
  "_velmere/pass35/PASS35_LOCAL_PDF_QA_SUMMARY.json",
  "_velmere/pass35/PASS35_READINESS_DASHBOARD.json",
  "fixtures/pass35/audit-a01-a05/PASS35_A3_A01_A05_SYNTHETIC_RECEIPT.json",
  "fixtures/pass35/audit-a4/PASS35_A4_SOLC_SYNTHETIC_RECEIPT.json",
  "fixtures/pass35/audit-a4/PASS35_A4_CHAIN_SYNTHETIC_RECEIPT.json",
  "fixtures/pass35/audit-a4/PASS35_A4_SLITHER_SYNTHETIC_RECEIPT.json",
  "fixtures/pass35/audit-a5/PASS35_A5_SEMGREP_SYNTHETIC_RECEIPT.json",
  "fixtures/pass35/audit-a5/PASS35_A5_A06_SYNTHETIC_RECEIPT.json",
  "fixtures/pass35/audit-a6/PASS35_A6_FORGE_SYNTHETIC_RECEIPT.json",
  "fixtures/pass35/audit-a6/PASS35_A6_A08_MODEL_FUZZ_SYNTHETIC_RECEIPT.json",
  "fixtures/pass35/audit-a7/PASS35_A7_FORK_REPLAY_SYNTHETIC_RECEIPT.json",
  "fixtures/pass35/audit-a8/PASS35_A8_A10_ECONOMIC_SYNTHETIC_RECEIPT.json",
  "fixtures/pass35/audit-a8/PASS35_A8_A15_REMEDIATION_RETEST_SYNTHETIC_RECEIPT.json",
  "fixtures/pass35/audit-a8/PASS35_A8_A17_MONITORING_HANDOFF_SYNTHETIC_RECEIPT.json",
  "lib/commerce/pass35-product-cell-readiness.ts",
  "lib/commerce/pass35-paid-ui-stop-sell.ts",
  "lib/worldclass/pass35-canonical-packet.ts",
  "lib/security/audit-a01-a05-engine.ts",
  "lib/security/audit-a02-solc-reproduction.ts",
  "lib/security/audit-chain-provider-receipt.ts",
  "lib/security/audit-a06-bounded-path-analysis.ts",
  "lib/security/audit-a08-model-fuzz.ts",
  "scripts/pass35/detached-package-verifier.mjs",
  "scripts/pass35/governance-decision-verifier.mjs",
  "scripts/pass35/external-evidence-intake.mjs",
  "scripts/pass35/benchmark-review-evidence.mjs",
  "scripts/pass35/assurance-customer-evidence.mjs",
  "scripts/pass35/verify-flagship-candidate.mjs",
  "scripts/pass35/audit-execution-envelope.mjs",
  "scripts/pass35/test-audit-execution-envelope.mjs",
  "scripts/pass35/run-audit-a01-a05-case.ts",
  "scripts/pass35/test-audit-a01-a05-engine.ts",
  "scripts/pass35/test-audit-a01-a05-runner-boundaries.mjs",
  "scripts/pass35/audit-slither-adapter.mjs",
  "scripts/pass35/run-audit-a4-solc-case.ts",
  "scripts/pass35/run-audit-a4-slither-case.mjs",
  "scripts/pass35/build-audit-a4-synthetic-receipts.ts",
  "scripts/pass35/test-audit-a4-solc-reproduction.ts",
  "scripts/pass35/test-audit-a4-chain-provider.ts",
  "scripts/pass35/test-audit-a4-slither-adapter.mjs",
  "scripts/pass35/test-audit-a4-control-plane.mjs",
  "scripts/pass35/audit-semgrep-adapter.mjs",
  "scripts/pass35/run-audit-a5-semgrep-case.mjs",
  "scripts/pass35/run-audit-a5-a06-case.ts",
  "scripts/pass35/build-current-status-roadmap.mjs",
  "scripts/pass35/sync-roadmap-current-status.mjs",
  "scripts/pass35/test-current-status-register.mjs",
  "scripts/pass35/test-audit-a5-semgrep-adapter.mjs",
  "scripts/pass35/test-audit-a5-a06-bounded-path.ts",
  "scripts/pass35/test-audit-a5-control-plane.mjs",
  "scripts/pass35/audit-forge-adapter.mjs",
  "scripts/pass35/run-audit-a6-forge-case.mjs",
  "scripts/pass35/run-audit-a6-a08-case.ts",
  "scripts/pass35/build-audit-a6-synthetic-receipts.ts",
  "scripts/pass35/test-audit-a6-forge-adapter.mjs",
  "scripts/pass35/test-audit-a6-a08-model-fuzz.ts",
  "scripts/pass35/test-audit-a6-runner-boundaries.mjs",
  "scripts/pass35/test-audit-a6-control-plane.mjs",
  "scripts/pass35/audit-fork-replay-adapter.mjs",
  "scripts/pass35/run-audit-a7-fork-replay-case.mjs",
  "scripts/pass35/build-audit-a7-synthetic-receipts.mjs",
  "scripts/pass35/test-audit-a7-fork-replay-adapter.mjs",
  "scripts/pass35/test-audit-a7-a08-foundry-plan.mjs",
  "scripts/pass35/test-audit-a7-runner-boundaries.mjs",
  "scripts/pass35/test-audit-a7-control-plane.mjs",
  "scripts/pass35/audit-economic-adversarial-engine.mjs",
  "scripts/pass35/audit-remediation-retest-adapter.mjs",
  "scripts/pass35/audit-monitoring-handoff-adapter.mjs",
  "scripts/pass35/build-audit-a8-synthetic-receipts.mjs",
  "scripts/pass35/test-audit-a8-economic-adversarial.mjs",
  "scripts/pass35/test-audit-a8-remediation-retest.mjs",
  "scripts/pass35/test-audit-a8-monitoring-handoff.mjs",
  "scripts/pass35/test-audit-a8-control-plane.mjs",
  "scripts/pass35/build-a9-product-roadmap.mjs",
  "scripts/pass35/test-product-tier-content-contract.mjs",
  "scripts/pass35/test-zero-budget-functional-roadmap.mjs",
  "scripts/pass35/test-a9-visual-freeze.mjs",
  "scripts/pass35/test-offline-ts-loader-fallback.mjs",
  "scripts/pass11/offline-ts-loader.mjs",
  "tsconfig.pass35-audit-a01-a05.json",
  "tsconfig.pass35-audit-a4.json",
];
const requiredFileChecks = requiredFiles.map((file) => {
  const absolute = path.join(root, file);
  let ok;
  try {
    ok = existsSync(absolute) && statSync(absolute).isFile();
  } catch {
    ok = false;
  }
  return { id: `file_exists:${file}`, ok, file };
});
const missingRequiredPaths = requiredFileChecks
  .filter((row) => !row.ok)
  .map((row) => row.file)
  .sort();
if (missingRequiredPaths.length > 0) {
  const receiptCore = {
    schemaVersion: "velmere.pass35.control-plane-verification.v1",
    candidateId: CANDIDATE,
    status: "INCOMPLETE_SOURCE_PACKAGE_CONTROL_METADATA",
    environment: "LOCAL_OFFLINE_CONTROL_VERIFICATION",
    manifestProfile,
    deterministic: true,
    failureStage: "REQUIRED_FILE_PREFLIGHT",
    staticControlEvaluationCompleted: false,
    promotionAllowed: false,
    liveProven: false,
    saleEnabled: false,
    requiredFileCount: requiredFileChecks.length,
    missingRequiredFileCount: missingRequiredPaths.length,
    missingRequiredPaths,
    checkCount: requiredFileChecks.length,
    passedCount: requiredFileChecks.length - missingRequiredPaths.length,
    failedCount: missingRequiredPaths.length,
    checks: requiredFileChecks.map(({ id, ok }) => ({ id, ok })),
    truthBoundary: "Required source-package control metadata is incomplete. Static controls were not evaluated, no missing evidence was regenerated, and this receipt grants no promotion, LIVE, or sale claim."
  };
  const receipt = writeControlPlaneReceipt(receiptCore);
  console.log(JSON.stringify({
    status: receipt.status,
    manifestProfile,
    promotionAllowed: receipt.promotionAllowed,
    liveProven: receipt.liveProven,
    saleEnabled: receipt.saleEnabled,
    requiredFileCount: receipt.requiredFileCount,
    missingRequiredFileCount: receipt.missingRequiredFileCount,
    missingRequiredPaths: receipt.missingRequiredPaths,
    receiptPath: CONTROL_PLANE_RECEIPT_PATH,
    receiptSha256: receipt.receiptSha256,
  }, null, 2));
  process.exit(1);
}
for (const row of requiredFileChecks) check(row.id, row.ok);
const offlineTsLoaderSource = read("scripts/pass11/offline-ts-loader.mjs");
check("offline_ts_loader_builtin_fallback_present",
  offlineTsLoaderSource.includes("VELMERE_OFFLINE_TS_FORCE_BUILTIN")
  && offlineTsLoaderSource.includes("stripTypeScriptTypes")
  && offlineTsLoaderSource.includes("offline_tsx_transpile_requires_typescript"));

const current = json("config/current-release.json");
check("current_candidate_id", current.candidateId === CANDIDATE);
check("current_not_promoted", current.releaseId === null && current.productionPromotionAllowed === false && current.status === "OFFLINE_CANDIDATE_NO_PROMOTION");
for (const key of [
  "currentRoadmapPath", "preGatePath", "productCellCatalogPath", "paidSurfacePolicyPath", "executionReceiptPath",
  "externalProofRegisterPath", "externalBlockerReceiptPath", "readinessDashboardPath", "sourceLifecycleClassificationPath",
  "detachedPackageVerifierPath", "detachedPackageVerificationPolicyPath", "governanceDecisionVerifierPath", "governanceDecisionPolicyPath",
  "externalEvidenceIntakePath", "externalEvidenceIntakePolicyPath", "benchmarkReviewEvidenceVerifierPath", "benchmarkReviewPolicyPath",
  "assuranceCustomerEvidenceVerifierPath", "assuranceCustomerEvidencePolicyPath",
  "auditA01A05PolicyPath", "auditA01A05EnginePath", "auditA01A05SyntheticFixtureReceiptPath",
  "auditA4ExecutionPolicyPath", "auditA4SolcEnginePath", "auditA4ChainReceiptPath", "auditA4SlitherAdapterPath",
  "currentStatusRegisterPath", "currentStatusBoardPath", "currentStatusSummaryPath",
  "auditA5ExecutionPolicyPath", "auditA5SemgrepAdapterPath", "auditA5BoundedPathEnginePath",
  "auditA6ExecutionPolicyPath", "auditA6ForgeAdapterPath", "auditA6ModelFuzzEnginePath",
  "auditA7ExecutionPolicyPath", "auditA7ForkReplayAdapterPath", "auditA7InvariantPlanPath",
  "auditA8ExecutionPolicyPath", "auditA8EconomicEnginePath", "auditA8RemediationRetestAdapterPath", "auditA8MonitoringHandoffAdapterPath",
  "marketImpactWhaleTierContractPath", "marketImpactWhaleTierBoardPath", "marketImpactWhaleTierRuntimePath", "marketImpactWhaleRuntimeTestPath", "a11ProductRoadmapSummaryPath",
  "canonicalManifestGeneratorPath", "canonicalManifestVerifierPath", "manifestAuthorityPath", "fileManifestPath",
  "sourceIdentityPath", "sbomPath", "provenancePath", "evidenceIndexPath", "masterMapPath",
]) {
  check(`current_pointer_exists:${key}`, typeof current[key] === "string" && existsSync(path.join(root, current[key])), current[key]);
}

const pre = json("config/pass35/pre-gates.json");
check("pregate_candidate_id", pre.candidateId === CANDIDATE);
check("pregates_no_score_or_promotion", pre.scoreEligible === false && pre.promotionAllowed === false && pre.globalResult === "NO_GO");
check("sr00_honest_block", pre.preGates.SR00.status === "BLOCKED");
check("fg00_honest_block", pre.preGates.FG00.status === "BLOCKED" && pre.preGates.FG00.selectedCell === null);
check("pc00_static_only", pre.preGates.PC00.status === "STATIC_PROVEN");
check("org00_honest_block", pre.preGates.ORG00.status === "BLOCKED" && pre.preGates.ORG00.signedOrganizationRecord === false);

const flagshipPlan = json("config/pass35/flagship-candidate-plan.json");
const flagshipPwg = Object.values(flagshipPlan.purchaseWorthinessGates ?? {});
check("flagship_engineering_candidate_exact_no_fg00_no_sale",
  flagshipPlan.schemaVersion === "velmere.pass35.flagship-candidate-plan.v1"
  && flagshipPlan.candidateId === CANDIDATE
  && flagshipPlan.status === "ENGINEERING_CANDIDATE_FROZEN_NOT_FG00_APPROVED"
  && flagshipPlan.engineeringCandidateProductCellId === "audit_evm_pro_automated_review"
  && flagshipPlan.selectedProductCellId === null
  && flagshipPlan.fg00Approved === false
  && flagshipPlan.sellEnabled === false
  && flagshipPlan.chargeAllowed === false
  && flagshipPlan.commercialTruth?.customerFacingNameBeforeFullStack === "Automated Security Evidence Review"
  && flagshipPlan.commercialTruth?.fullAuditClaimAllowed === false
  && flagshipPlan.commercialTruth?.requiredUiState === "UNAVAILABLE_NOT_FOR_SALE"
  && flagshipPwg.length === 10
  && flagshipPwg.every((gate) => gate.status === "BLOCKED" || gate.status === "PARTIAL_LOCAL"));

const catalog = json("config/pass35/product-cell-catalog.json");
const cells = catalog.productCells ?? [];
const families = new Set(cells.map((cell) => cell.productFamily));
const cellIds = cells.map((cell) => cell.productCellId);
check("catalog_candidate_shape", catalog.schemaVersion === "velmere.pass35.product-cell-catalog.v1" && cells.length === 30 && families.size === 13);
check("catalog_unique_cells", new Set(cellIds).size === cellIds.length);
check("catalog_no_flagship", catalog.catalogPolicy.flagshipSelected === false && cells.every((cell) => cell.role !== "FLAGSHIP"));
check("catalog_global_stop_sell", catalog.catalogPolicy.catalogApproved === false && catalog.catalogPolicy.legacySkuMayAuthorizeCharge === false && cells.every((cell) => cell.sellEnabled === false && cell.sellBlockedReasons.length > 0));
const expectedLegacy = new Set(["vlm_pro_analysis_single", "vlm_advanced_analysis_single", "vlm_pro_pdf_single", "vlm_advanced_pdf_single", "vlm_pro_audit_review", "vlm_advanced_audit_human_review"]);
check("catalog_legacy_mapping_complete", catalog.legacySkuMappings.length === expectedLegacy.size && catalog.legacySkuMappings.every((row) => expectedLegacy.delete(row.legacyProductId)) && expectedLegacy.size === 0);

const checkout = read("app/api/checkout/vlm-service/route.ts");
const gateIndex = checkout.indexOf("evaluatePass35ProductCellCheckout({");
const clientIndex = checkout.indexOf("getStripeServerClient()");
const sessionIndex = checkout.indexOf("stripe.checkout.sessions.create(sessionParams)");
check("checkout_gate_present", gateIndex >= 0);
check("checkout_gate_before_stripe_client", gateIndex >= 0 && clientIndex > gateIndex);
check("checkout_gate_before_payment_session", gateIndex >= 0 && sessionIndex > gateIndex);
check("checkout_exact_cell_metadata", checkout.includes("productCellBindingSha256") && checkout.includes("productCellId"));

const paidPolicy = json("config/paid-surface-entitlement-policy.json");
check("paid_policy_candidate", paidPolicy.candidateId === CANDIDATE);
check("paid_policy_static_proven", paidPolicy.status === "STATIC_PROVEN" && paidPolicy.forbiddenDirectResolverImports.length === 0);
check("paid_policy_all_declared_consumed", paidPolicy.declaredPolicyIds.length > 0 && paidPolicy.unconsumedPolicyIds.length === 0);
check("paid_policy_current_hash", sha256(readFileSync(path.join(root, paidPolicy.guardPath))) === paidPolicy.guardSha256);
check("paid_policy_all_consumer_hashes", paidPolicy.guardConsumers.every((entry) => existsSync(path.join(root, entry.file)) && sha256(readFileSync(path.join(root, entry.file))) === entry.sha256));

const legal = json("config/pass35/legal-applicability.json");
check("legal_no_silent_na", legal.status === "BLOCKED_LEGAL_REVIEW_REQUIRED" && legal.silentNotApplicableAllowed === false && legal.records.length === 0 && legal.items.length >= 20);
const staging = json("config/pass35/staging-plan.json");
check("staging_not_claimed", staging.status === "PREPARED_NOT_EXECUTED" && staging.promotionAllowed === false && staging.services.every((service) => service.configured === false && service.secretRef === null));
const provider = json("config/pass35/provider-denominator.json");
check("provider_fail_closed", provider.status === "BLOCKED_FLAGSHIP_NOT_SELECTED" && provider.fields.length === 0 && provider.sellEligibleFieldCount === 0 && provider.placeholderSubstitutionAllowed === false);
const ai = json("config/pass35/ai-system-inventory.json");
check("ai_stop_sell", ai.systems.length === 9 && ai.systems.every((system) => system.sellEnabled === false));
const audit = json("config/pass35/audit-program.json");
check("audit_a01_a17_complete_registry", audit.controls.length === 17 && new Set(audit.controls.map((control) => control.id)).size === 17);
check("audit_no_false_full_claim", audit.fullAuditClaimAllowed === false && audit.benchmarkCorpus.realIndependentLabelsAvailable === 0 && audit.qualifiedReviewerPoolAvailable === false);
const auditExecutionPolicy = loadAuditExecutionPolicy(root);
const auditExecutionPolicyBlockers = validateAuditExecutionPolicy(auditExecutionPolicy, root);
check("audit_execution_inventory_and_envelope_fail_closed",
  auditExecutionPolicyBlockers.length === 0
  && auditExecutionPolicy.status === "FCP04F_A8_ECONOMIC_RETEST_MONITORING_REAL_EXECUTION_NOT_PROVEN"
  && auditExecutionPolicy.fullAuditClaimAllowed === false
  && auditExecutionPolicy.sellEnabled === false
  && auditExecutionPolicy.paidDeliveryGate?.currentPaidDeliveryPossible === false
  && auditExecutionPolicy.capabilityInventory.length === 20
  && auditExecutionPolicy.capabilityInventory.filter((row) => /^MISSING_/u.test(row.state)).length === 0
  && auditExecutionPolicy.capabilityInventory.filter((row) => row.state === "IMPLEMENTED_LOCAL_HEURISTIC_NOT_BENCHMARKED").length === 2
  && auditExecutionPolicy.capabilityInventory.some((row) => row.familyId === "symbolic_path_analysis" && row.state === "IMPLEMENTED_LOCAL_BOUNDED_ABSTRACT_FEASIBILITY_BENCHMARKED")
  && auditExecutionPolicy.capabilityInventory.some((row) => row.familyId === "semgrep_external_static_family" && row.state === "ADAPTER_IMPLEMENTED_FIXTURE_CONTRACT_PROVEN_REAL_TOOL_MISSING")
  && auditExecutionPolicy.capabilityInventory.some((row) => row.familyId === "exact_unit_integration_tests" && row.state === "IMPLEMENTED_LOCAL_EXACT_TEST_EVIDENCE_BENCHMARKED_OFFICIAL_FORGE_MISSING")
  && auditExecutionPolicy.capabilityInventory.some((row) => row.familyId === "property_fuzz_invariant" && row.state === "IMPLEMENTED_LOCAL_FUZZ_INVARIANT_EVIDENCE_BENCHMARKED_OFFICIAL_ENGINES_MISSING")
  && auditExecutionPolicy.capabilityInventory.some((row) => row.familyId === "fork_replay_exact_state" && row.state === "IMPLEMENTED_LOCAL_FORK_REPLAY_EVIDENCE_BENCHMARKED_NATIVE_FORK_REAL_PROVIDER_MISSING")
  && auditExecutionPolicy.capabilityInventory.some((row) => row.familyId === "economic_adversarial_scenario_engine" && row.state === "IMPLEMENTED_LOCAL_ECONOMIC_ADVERSARIAL_EVIDENCE_BENCHMARKED_REAL_DATA_REPLAY_REVIEW_MISSING")
  && auditExecutionPolicy.capabilityInventory.some((row) => row.familyId === "upgrade_deployment_operations" && row.state === "IMPLEMENTED_LOCAL_UPGRADE_DEPLOYMENT_OPERATIONS_EVIDENCE_BENCHMARKED_ONCHAIN_DRILL_REVIEW_MISSING")
  && auditExecutionPolicy.capabilityInventory.some((row) => row.familyId === "remediation_retest_local_contract" && row.state === "IMPLEMENTED_LOCAL_EVIDENCE_BOUND_CLOSURE_BENCHMARKED_REAL_SIGNED_CLOSURE_MISSING")
  && auditExecutionPolicy.capabilityInventory.some((row) => row.familyId === "post_audit_monitoring_handoff" && row.state === "IMPLEMENTED_LOCAL_EVENT_INCIDENT_LIFECYCLE_BENCHMARKED_LIVE_PROVIDER_MISSING"),
  auditExecutionPolicyBlockers);
const auditA01A05Policy = json("config/pass35/audit-a01-a05-policy.json");
const auditA01A05Receipt = json("fixtures/pass35/audit-a01-a05/PASS35_A3_A01_A05_SYNTHETIC_RECEIPT.json");
check("audit_a01_a09_policy_local_truth",
  auditA01A05Policy.schemaVersion === "velmere.pass35.audit-a01-a05-policy.v1"
  && auditA01A05Policy.status === "LOCAL_EXECUTABLE_A01_A10_A15_A17_PARTIAL_PLUS_EXTERNAL_ADAPTERS_NOT_PAID_ELIGIBLE"
  && auditA01A05Policy.hardStops?.sellEnabled === false
  && auditA01A05Policy.hardStops?.fullAuditClaimAllowed === false
  && auditA01A05Policy.hardStops?.localHeuristicMayUnlockPaidDelivery === false
  && auditA01A05Policy.controls?.A05?.independentExternalFamilies === 0
  && auditA01A05Policy.controls?.A05?.externalAdapterFamilies === 2
  && auditA01A05Policy.controls?.A05?.externalAdapterState === "SLITHER_AND_SEMGREP_ADAPTERS_FIXTURE_PROVEN_REAL_TOOLS_NOT_INSTALLED"
  && auditA01A05Policy.controls?.A05?.paidGateEligible === false
  && auditA01A05Policy.controls?.A06?.localState === "LOCAL_BOUNDED_ABSTRACT_FEASIBILITY_BENCHMARKED_NOT_FULL_SMT"
  && auditA01A05Policy.controls?.A06?.paidGateEligible === false
  && auditA01A05Policy.controls?.A07?.localState === "IMPLEMENTED_LOCAL_EXACT_TEST_EVIDENCE_BENCHMARKED_OFFICIAL_FORGE_NOT_RUN"
  && auditA01A05Policy.controls?.A07?.paidGateEligible === false
  && auditA01A05Policy.controls?.A08?.localState === "IMPLEMENTED_LOCAL_FUZZ_INVARIANT_EVIDENCE_BENCHMARKED_OFFICIAL_ENGINES_NOT_RUN"
  && auditA01A05Policy.controls?.A08?.paidGateEligible === false
  && auditA01A05Policy.controls?.A09?.localState === "IMPLEMENTED_LOCAL_FORK_REPLAY_EVIDENCE_BENCHMARKED_NATIVE_FORK_REAL_PROVIDER_NOT_RUN"
  && auditA01A05Policy.controls?.A09?.paidGateEligible === false
  && auditA01A05Policy.dataIsolation?.activeArtifactSyntheticReceiptAllowed === false
  && auditA01A05Policy.dataIsolation?.customerReceiptAllowedInSourcePackage === false);
check("audit_a01_a05_synthetic_receipt_fail_closed",
  auditA01A05Receipt.schemaVersion === "velmere.pass35.audit-a01-a05-report.v1"
  && auditA01A05Receipt.inputClass === "SYNTHETIC_OFFLINE"
  && auditA01A05Receipt.controls?.A01?.state === "VERIFIED_LOCAL_STRUCTURE"
  && auditA01A05Receipt.controls?.A02?.state === "VERIFIED_METADATA_STRIPPED_BYTECODE"
  && auditA01A05Receipt.controls?.A05?.state === "EXECUTED_LOCAL_HEURISTIC_NOT_BENCHMARKED"
  && auditA01A05Receipt.controls?.A05?.passEligible === false
  && auditA01A05Receipt.staticFamilies?.length === 2
  && auditA01A05Receipt.staticFamilies.every((row) => row.paidGateEligible === false && row.independentExternalFamily === false)
  && auditA01A05Receipt.summary?.paidDeliveryAllowed === false
  && auditA01A05Receipt.summary?.fullAuditClaimAllowed === false
  && /^(?:sha256:)[a-f0-9]{64}$/u.test(auditA01A05Receipt.reportSha256));
const auditA4Policy = json("config/pass35/audit-a4-execution-policy.json");
const auditA4SolcReceipt = json("fixtures/pass35/audit-a4/PASS35_A4_SOLC_SYNTHETIC_RECEIPT.json");
const auditA4ChainReceipt = json("fixtures/pass35/audit-a4/PASS35_A4_CHAIN_SYNTHETIC_RECEIPT.json");
const auditA4SlitherReceipt = json("fixtures/pass35/audit-a4/PASS35_A4_SLITHER_SYNTHETIC_RECEIPT.json");
check("audit_a4_policy_truth_boundary",
  auditA4Policy.schemaVersion === "velmere.pass35.audit-a4-execution-policy.v1"
  && auditA4Policy.sourceRevisionId === current.sourceRevisionId
  && auditA4Policy.status === "ADAPTERS_EXECUTABLE_FIXTURE_PROVEN_REAL_TOOLCHAIN_BLOCKED"
  && auditA4Policy.sellEnabled === false
  && auditA4Policy.paidDeliveryAllowed === false
  && auditA4Policy.fullAuditClaimAllowed === false
  && auditA4Policy.controls?.A01_PROVIDER_CHAIN_BINDING?.realExecutionCredit === false
  && auditA4Policy.controls?.A02_PINNED_COMPILER?.realExecutionCredit === false
  && auditA4Policy.controls?.A05_SLITHER_EXTERNAL_FAMILY?.realExecutionCredit === false
  && auditA4Policy.hardStops?.fixtureMaySatisfyRealExecution === false
  && auditA4Policy.hardStops?.adapterPresenceMayUnlockPaidDelivery === false
  && auditA4Policy.runtimeBoundary?.exactRuntimeProof === false);
check("audit_a4_synthetic_receipts_fail_closed",
  auditA4SolcReceipt.schemaVersion === "velmere.pass35.audit-a4-solc-reproduction-receipt.v1"
  && auditA4SolcReceipt.inputClass === "SYNTHETIC_OFFLINE"
  && auditA4SolcReceipt.paidGateEligible === false
  && auditA4SolcReceipt.fullAuditClaimAllowed === false
  && /^(?:sha256:)[a-f0-9]{64}$/u.test(auditA4SolcReceipt.receiptSha256)
  && auditA4ChainReceipt.schemaVersion === "velmere.pass35.audit-a4-chain-receipt.v1"
  && auditA4ChainReceipt.inputClass === "SYNTHETIC_OFFLINE"
  && auditA4ChainReceipt.realProviderExecution === false
  && auditA4ChainReceipt.paidGateEligible === false
  && /^(?:sha256:)[a-f0-9]{64}$/u.test(auditA4ChainReceipt.receiptSha256)
  && auditA4SlitherReceipt.schemaVersion === "velmere.pass35.audit-a4-slither-receipt.v1"
  && auditA4SlitherReceipt.inputClass === "SYNTHETIC_OFFLINE"
  && auditA4SlitherReceipt.realCaseExecution === false
  && auditA4SlitherReceipt.paidGateEligible === false
  && auditA4SlitherReceipt.fullAuditClaimAllowed === false
  && /^(?:sha256:)[a-f0-9]{64}$/u.test(auditA4SlitherReceipt.receiptSha256));
const auditA5Policy = json("config/pass35/audit-a5-execution-policy.json");
const auditA5SemgrepReceipt = json("fixtures/pass35/audit-a5/PASS35_A5_SEMGREP_SYNTHETIC_RECEIPT.json");
const auditA5A06Receipt = json("fixtures/pass35/audit-a5/PASS35_A5_A06_SYNTHETIC_RECEIPT.json");
const currentStatusRegister = json("config/pass35/current-status-register.json");
const currentStatusSummary = json("artifacts/release/PASS35_CURRENT_STATUS_SUMMARY.json");
check("audit_a5_policy_truth_boundary",
  auditA5Policy.schemaVersion === "velmere.pass35.audit-a5-execution-policy.v1"
  && auditA5Policy.sourceRevisionId === current.sourceRevisionId
  && auditA5Policy.status === "LOCAL_ADAPTER_AND_BOUNDED_CFG_PROVEN_REAL_TOOLCHAIN_BLOCKED"
  && auditA5Policy.sellEnabled === false
  && auditA5Policy.paidDeliveryAllowed === false
  && auditA5Policy.fullAuditClaimAllowed === false
  && auditA5Policy.controls?.A05_SEMGREP_EXTERNAL_FAMILY?.realExecutionCredit === false
  && auditA5Policy.controls?.A06_BOUNDED_CFG_PATH?.realExecutionCredit === false
  && auditA5Policy.hardStops?.twoAdaptersMayCountAsTwoValidatedFamilies === false
  && auditA5Policy.hardStops?.boundedCfgMayClaimSymbolicExecution === false
  && auditA5Policy.runtimeBoundary?.exactRuntimeProof === false);
check("audit_a5_synthetic_receipts_fail_closed",
  auditA5SemgrepReceipt.schemaVersion === "velmere.pass35.audit-a5-semgrep-receipt.v1"
  && auditA5SemgrepReceipt.inputClass === "SYNTHETIC_OFFLINE"
  && auditA5SemgrepReceipt.realCaseExecution === false
  && auditA5SemgrepReceipt.paidGateEligible === false
  && auditA5SemgrepReceipt.fullAuditClaimAllowed === false
  && auditA5SemgrepReceipt.findingCount === 2
  && /^(?:sha256:)[a-f0-9]{64}$/u.test(auditA5SemgrepReceipt.receiptSha256)
  && auditA5A06Receipt.schemaVersion === "velmere.pass35.audit-a5-a06-receipt.v1"
  && auditA5A06Receipt.inputClass === "SYNTHETIC_OFFLINE"
  && auditA5A06Receipt.execution?.status === "VERIFIED_LOCAL_BOUNDED_CFG"
  && auditA5A06Receipt.execution?.assuranceClass === "LOCAL_BOUNDED_CFG_NOT_SYMBOLIC"
  && auditA5A06Receipt.execution?.realCaseExecution === false
  && auditA5A06Receipt.execution?.paidGateEligible === false
  && auditA5A06Receipt.cfg?.blockCount === 3
  && auditA5A06Receipt.paths?.completedPathCount === 2
  && /^(?:sha256:)[a-f0-9]{64}$/u.test(auditA5A06Receipt.receiptSha256));
const auditA6Policy = json("config/pass35/audit-a6-execution-policy.json");
const auditA6ForgeReceipt = json("fixtures/pass35/audit-a6/PASS35_A6_FORGE_SYNTHETIC_RECEIPT.json");
const auditA6FuzzReceipt = json("fixtures/pass35/audit-a6/PASS35_A6_A08_MODEL_FUZZ_SYNTHETIC_RECEIPT.json");
check("audit_a6_policy_truth_boundary",
  auditA6Policy.schemaVersion === "velmere.pass35.audit-a6-execution-policy.v1"
  && auditA6Policy.sourceRevisionId === current.sourceRevisionId
  && auditA6Policy.status === "LOCAL_FORGE_ADAPTER_AND_MODEL_FUZZ_PROVEN_REAL_EVM_TOOLCHAIN_BLOCKED"
  && auditA6Policy.sellEnabled === false
  && auditA6Policy.paidDeliveryAllowed === false
  && auditA6Policy.fullAuditClaimAllowed === false
  && auditA6Policy.controls?.A07_FORGE_EXACT_TEST_ADAPTER?.realExecutionCredit === false
  && auditA6Policy.controls?.A08_LOCAL_MODEL_FUZZ_INVARIANTS?.realExecutionCredit === false
  && auditA6Policy.hardStops?.fixtureMaySatisfyA07 === false
  && auditA6Policy.hardStops?.modelFuzzMayClaimEvmExecution === false
  && auditA6Policy.runtimeBoundary?.exactRuntimeProof === false);
check("audit_a6_synthetic_receipts_fail_closed",
  auditA6ForgeReceipt.schemaVersion === "velmere.pass35.audit-a6-forge-receipt.v1"
  && auditA6ForgeReceipt.status === "VERIFIED"
  && auditA6ForgeReceipt.inputClass === "SYNTHETIC_OFFLINE"
  && auditA6ForgeReceipt.testCount === 4
  && auditA6ForgeReceipt.passCount === 4
  && auditA6ForgeReceipt.realCaseExecution === false
  && auditA6ForgeReceipt.paidGateEligible === false
  && /^(?:sha256:)[a-f0-9]{64}$/u.test(auditA6ForgeReceipt.receiptSha256)
  && auditA6FuzzReceipt.schemaVersion === "velmere.pass35.audit-a6-a08-model-fuzz-receipt.v1"
  && auditA6FuzzReceipt.execution?.status === "VERIFIED_LOCAL_MODEL_FUZZ"
  && auditA6FuzzReceipt.execution?.assuranceClass === "LOCAL_STATE_MODEL_NOT_EVM"
  && auditA6FuzzReceipt.iterations === 10000
  && auditA6FuzzReceipt.invariantChecks === 28787
  && auditA6FuzzReceipt.invariantFailureCount === 0
  && auditA6FuzzReceipt.execution?.paidGateEligible === false
  && auditA6FuzzReceipt.a07ExactTestReceiptSha256 === auditA6ForgeReceipt.receiptSha256
  && /^(?:sha256:)[a-f0-9]{64}$/u.test(auditA6FuzzReceipt.receiptSha256));
const auditA7Policy = json("config/pass35/audit-a7-execution-policy.json");
const auditA7ForkReceipt = json("fixtures/pass35/audit-a7/PASS35_A7_FORK_REPLAY_SYNTHETIC_RECEIPT.json");
const auditA7InvariantPlan = json("config/pass35/a08-foundry-invariant-plan.json");
check("audit_a7_policy_truth_boundary",
  auditA7Policy.schemaVersion === "velmere.pass35.audit-a7-execution-policy.v1"
  && auditA7Policy.sourceRevisionId === current.sourceRevisionId
  && auditA7Policy.status === "LOCAL_FORK_REPLAY_EVIDENCE_BENCHMARKED_NATIVE_FORK_REAL_PROVIDER_BLOCKED"
  && auditA7Policy.sellEnabled === false
  && auditA7Policy.paidDeliveryAllowed === false
  && auditA7Policy.fullAuditClaimAllowed === false
  && auditA7Policy.controls?.A09_FORK_REPLAY_EXACT_STATE_ADAPTER?.realExecutionCredit === false
  && auditA7Policy.controls?.A08_FOUNDRY_INVARIANT_TARGET?.realExecutionCredit === false
  && auditA7Policy.mutationEvidence?.requiredVariants === 7
  && auditA7Policy.mutationEvidence?.killedVariants === 7
  && auditA7Policy.hardStops?.fixtureMaySatisfyA09 === false
  && auditA7Policy.hardStops?.preparedInvariantTargetMaySatisfyA08 === false
  && auditA7Policy.runtimeBoundary?.exactRuntimeProof === false);
check("audit_a7_synthetic_receipt_and_invariant_plan_fail_closed",
  auditA7ForkReceipt.schemaVersion === "velmere.pass35.audit-a7-fork-replay-receipt.v1"
  && auditA7ForkReceipt.status === "VERIFIED"
  && auditA7ForkReceipt.inputClass === "SYNTHETIC_OFFLINE"
  && auditA7ForkReceipt.replay?.transactionCount === 2
  && auditA7ForkReceipt.replay?.assertionCount === 5
  && auditA7ForkReceipt.realCaseExecution === false
  && auditA7ForkReceipt.paidGateEligible === false
  && /^(?:sha256:)[a-f0-9]{64}$/u.test(auditA7ForkReceipt.receiptSha256)
  && auditA7InvariantPlan.schemaVersion === "velmere.pass35.a08-foundry-invariant-plan.v1"
  && auditA7InvariantPlan.status === "PREPARED_TARGET_NOT_EXECUTED"
  && auditA7InvariantPlan.invariantMappings?.length === 4
  && auditA7InvariantPlan.officialForgeExecuted === false
  && auditA7InvariantPlan.compiledTargetExecuted === false
  && auditA7InvariantPlan.paidGateEligible === false
  && /^(?:sha256:)[a-f0-9]{64}$/u.test(auditA7InvariantPlan.projectInventorySha256));

const auditA8Policy = json("config/pass35/audit-a8-execution-policy.json");
const auditA8EconomicReceipt = json("fixtures/pass35/audit-a8/PASS35_A8_A10_ECONOMIC_SYNTHETIC_RECEIPT.json");
const auditA8RetestReceipt = json("fixtures/pass35/audit-a8/PASS35_A8_A15_REMEDIATION_RETEST_SYNTHETIC_RECEIPT.json");
const auditA8MonitoringReceipt = json("fixtures/pass35/audit-a8/PASS35_A8_A17_MONITORING_HANDOFF_SYNTHETIC_RECEIPT.json");
check("audit_a8_local_controls_fail_closed",
  auditA8Policy.schemaVersion === "velmere.pass35.audit-a8-execution-policy.v1"
  && auditA8Policy.sourceRevisionId === current.sourceRevisionId
  && auditA8Policy.mutationEvidence?.totalKilled === 22
  && auditA8EconomicReceipt.execution?.status === "VERIFIED"
  && auditA8EconomicReceipt.scenarioCount === 5
  && auditA8EconomicReceipt.execution?.paidGateEligible === false
  && auditA8RetestReceipt.status === "VERIFIED_LOCAL_RETEST_CONTRACT"
  && auditA8RetestReceipt.closureEligible === false
  && auditA8MonitoringReceipt.status === "VERIFIED_LOCAL_MONITORING_HANDOFF"
  && auditA8MonitoringReceipt.liveMonitoringActive === false
  && auditA8MonitoringReceipt.paidGateEligible === false);

const a9TierContract = json("config/pass35/product-tier-content-contract.json");
const a9ZeroBudget = json("config/pass35/zero-budget-functional-roadmap.json");
const a9VisualFreeze = json("config/pass35/a9-visual-freeze-baseline.json");
const a9ProductSummary = json("artifacts/release/PASS35_A9_PRODUCT_ROADMAP_SUMMARY.json");
check("a9_non_visual_product_contracts",
  a9TierContract.schemaVersion === "velmere.pass35.product-tier-content-contract.v1"
  && a9TierContract.sourceRevisionId === current.sourceRevisionId
  && a9TierContract.visualChangesMade === false
  && a9TierContract.surfaces?.length === 7
  && a9TierContract.surfaces.every((surface) => ["basic", "pro", "advanced"].every((tier) => surface.tiers?.[tier]))
  && a9ZeroBudget.schemaVersion === "velmere.pass35.zero-budget-functional-roadmap.v1"
  && a9ZeroBudget.tracks?.ZERO_BUDGET_FUNCTIONAL_CORE?.targetPercent === 100
  && a9ZeroBudget.tracks?.COMMERCIAL_AUTOMATED?.paidFeedsRequired === false
  && a9ZeroBudget.zeroBudgetCoreExclusions?.length === 2
  && a9VisualFreeze.fileCount === 512
  && a9ProductSummary.productSpecificationCompletionPercent === 100
  && a9ProductSummary.zeroBudgetWeightedPlanningPercent === 82.1
  && a9ProductSummary.visualChangesMade === false);

const a10MarketContract = json("config/pass35/market-runtime-coverage-contract.json");
const a10MarketSummary = json("artifacts/release/PASS35_A10_PRODUCT_ROADMAP_SUMMARY.json");
const a10MarketRuntimeSource = read("lib/market-integrity/pass35-market-runtime-coverage.mjs");
check("a10_dynamic_market_contract",
  a10MarketContract.schemaVersion === "velmere.pass35.market-runtime-coverage-contract.v1"
  && a10MarketContract.passId === "PASS35_A10"
  && a10MarketContract.sourceRevisionId === current.sourceRevisionId
  && a10MarketContract.visualChangesMade === false
  && a10MarketContract.surfaceTierMatrices?.length === 9
  && a10MarketContract.regressionCorpusRule.includes("50-case corpus is QA only"));
check("a10_dynamic_denominator_truth",
  a10MarketContract.wholeMarketDefinition.includes("100% of normalized ACTIVE instruments")
  && a10MarketContract.hardRules.includes("inactive_halted_delisted_rows_excluded_from_active_denominator")
  && a10MarketContract.hardRules.includes("every_required_field_cell_counted"));
check("a10_zero_budget_progress_truth",
  a10MarketSummary.zeroBudgetWeightedPlanningPercent === 82.1
  && a10MarketSummary.dynamicCatalogImplementationStatus === "DONE_LOCAL"
  && a10MarketSummary.realProviderRuntimeCoverageStatus === "NOT_EXECUTED"
  && a10MarketSummary.sellEnabled === false);
check("a10_runtime_coverage_no_billing_unlock",
  a10MarketRuntimeSource.includes("paidDeliveryEligible:false")
  && a10MarketRuntimeSource.includes("sellEnabled:false")
  && a10MarketRuntimeSource.includes("not a fixed 50-case corpus"));

const a11ImpactWhale = json("config/pass35/market-impact-whale-tier-contract.json");
const a11ImpactWhaleSummary = json("artifacts/release/PASS35_A11_PRODUCT_ROADMAP_SUMMARY.json");
const a11TierRuntimeSource = read("lib/market-integrity/market-impact-whale-tier-runtime.ts");
const a11ProviderSource = read("lib/market-integrity/server-owned-market-intelligence-providers.ts");
check("a11_market_impact_whale_contract",
  a11ImpactWhale.schemaVersion === "velmere.pass35.market-impact-whale-tier-contract.v1"
  && a11ImpactWhale.passId === "PASS35_A11"
  && a11ImpactWhale.sourceRevisionId === current.sourceRevisionId
  && a11ImpactWhale.visualChangesMade === false
  && a11ImpactWhale.surfaceTierMatrices?.length === 6
  && a11ImpactWhale.corpus?.marketImpactCases === 60
  && a11ImpactWhale.corpus?.whaleWatchCases === 60
  && a11ImpactWhale.corpus?.generatedTierPackets === 360);
check("a11_mexc_and_tier_runtime",
  a11ImpactWhale.providerRuntime?.orderBookFamilies?.includes("mexc")
  && a11ProviderSource.includes("mexc_spot_depth")
  && a11ProviderSource.includes("parseMexcOrderBook")
  && a11TierRuntimeSource.includes("velmere.market-impact-tier-packet.v1")
  && a11TierRuntimeSource.includes("velmere.whale-watch-tier-packet.v1"));
check("a11_progress_and_no_billing",
  a11ImpactWhaleSummary.canonicalWeightedPlanningPercent === 41.9
  && a11ImpactWhaleSummary.canonicalStrictDonePercent === 9.3
  && a11ImpactWhaleSummary.zeroBudgetWeightedPlanningPercent === 82.1
  && a11ImpactWhaleSummary.realProviderCoverageStatus === "NOT_EXECUTED_FULL_CATALOG"
  && a11ImpactWhale.sellEnabled === false
  && a11ImpactWhale.paidDeliveryEligible === false
  && a11TierRuntimeSource.includes("paidDeliveryEligible: false")
  && a11TierRuntimeSource.includes("sellEnabled: false"));

const a12ProviderRuntime = json("config/pass35/public-provider-runtime-contract.json");
const a12ProviderSummary = json("artifacts/release/PASS35_A12_PRODUCT_ROADMAP_SUMMARY.json");
const a12CatalogSource = read("lib/market-integrity/pass35-public-provider-catalog-runtime.mjs");
const a12WhaleSource = read("lib/market-integrity/pass35-public-whale-runtime.ts");
check("a12_public_provider_runtime_contract",
  a12ProviderRuntime.schemaVersion === "velmere.pass35.public-provider-runtime-contract.v1"
  && a12ProviderRuntime.sourceRevisionId === current.sourceRevisionId
  && a12ProviderRuntime.publicCatalogRuntime?.providers?.length === 4
  && a12ProviderRuntime.publicCatalogRuntime?.fixtureExecution?.activeListings === 1013
  && a12ProviderRuntime.publicCatalogRuntime?.fixtureExecution?.activeAssets === 318
  && a12ProviderRuntime.whaleRuntime?.transferProviders?.includes("etherscan_fallback")
  && a12ProviderRuntime.sellEnabled === false
  && a12ProviderRuntime.paidDeliveryEligible === false
  && a12ProviderRuntime.liveClaimed === false);
check("a12_progress_and_truth_boundary",
  a12ProviderSummary.canonicalWeightedPlanningPercent === 41.9
  && a12ProviderSummary.zeroBudgetWeightedPlanningPercent === 82.1
  && a12ProviderSummary.visualChangesMade === false
  && a12ProviderSummary.liveClaimed === false);
check("a12_runtime_fail_closed_sources",
  a12CatalogSource.includes("INJECTED_FIXTURE")
  && a12CatalogSource.includes("RATE_LIMITED")
  && a12CatalogSource.includes("SCHEMA_REJECTED")
  && a12CatalogSource.includes("paidDeliveryEligible:false")
  && a11ProviderSource.includes("fetchEtherscanTransfers")
  && a12WhaleSource.includes("paidDeliveryEligible: false"));

const a13Runtime = json("config/pass35/a13-functional-runtime-contract.json");
const a13Summary = json("artifacts/release/PASS35_A13_PRODUCT_ROADMAP_SUMMARY.json");
const a13FxSource = read("lib/market-integrity/pass35-public-fx-runtime.mjs");
const a13SchedulerSource = read("lib/market-integrity/pass35-market-target-scheduler.mjs");
const a13WhaleDenominatorSource = read("lib/market-integrity/pass35-whale-supported-token-denominator.mjs");
check("a13_functional_runtime_contract",
  a13Runtime.schemaVersion === "velmere.pass35.a13-functional-runtime-contract.v1"
  && a13Runtime.sourceRevisionId === current.sourceRevisionId
  && a13Runtime.publicFxRuntime?.fixtureExecution?.pairs === 4
  && a13Runtime.publicFxRuntime?.fixtureExecution?.proEligible === 3
  && a13Runtime.publicFxRuntime?.fixtureExecution?.advancedEligible === 0
  && a13Runtime.fullCatalogScheduler?.fixtureExecution?.jobs === 957
  && a13Runtime.whaleTokenDenominator?.fixtureExecution?.activeAssets === 120
  && a13Runtime.whaleTokenDenominator?.fixtureExecution?.boundTokens === 60
  && a13Runtime.sellEnabled === false
  && a13Runtime.paidDeliveryEligible === false
  && a13Runtime.liveClaimed === false);
check("a13_progress_and_zero_budget_truth",
  a13Summary.canonicalWeightedPlanningPercent === 41.9
  && a13Summary.canonicalStrictDonePercent === 9.3
  && a13Summary.zeroBudgetWeightedPlanningPercent === 82.1
  && a13Summary.zeroBudgetCoreDenominator === 42
  && a13Summary.zeroBudgetCounts?.DONE === 28
  && a13Summary.zeroBudgetCounts?.PARTIAL === 13
  && a13Summary.zeroBudgetCounts?.NOT_DONE === 1
  && a13Summary.visualChangesMade === false
  && a13Summary.liveClaimed === false);
check("a13_runtime_sources_fail_closed",
  a13FxSource.includes("LOCAL_HTTP_FIXTURE")
  && a13FxSource.includes("eligibleAdvancedPairs")
  && a13FxSource.includes("paidDeliveryEligible:false")
  && a13SchedulerSource.includes("PLAN_ONLY_NOT_NETWORK_EXECUTED")
  && a13SchedulerSource.includes("fullCatalogPlanned")
  && a13WhaleDenominatorSource.includes("exact_chain_address_binding_missing")
  && a13WhaleDenominatorSource.includes("Every normalized active crypto asset is counted"));

const a14MarketExecution = json("config/pass35/a14-market-execution-contract.json");
const a14MarketSummary = json("artifacts/release/PASS35_A14_PRODUCT_ROADMAP_SUMMARY.json");
const a14LedgerSource = read("lib/market-integrity/pass35-full-catalog-execution-ledger.mjs");
const a14SecuritiesSource = read("lib/market-integrity/pass35-public-securities-catalog-runtime.mjs");
const a14BindingSource = read("lib/market-integrity/pass35-whale-binding-resolver.mjs");
const a14ImpactSource = read("lib/market-integrity/pass35-market-impact-full-denominator.mjs");
check("a14_market_execution_contract",
  a14MarketExecution.schemaVersion === "velmere.pass35.a14-market-execution-contract.v1"
  && a14MarketExecution.sourceRevisionId === current.sourceRevisionId
  && a14MarketExecution.fullCatalogExecutionLedger?.fixtureExecution?.scheduledJobs === 597
  && a14MarketExecution.fullCatalogExecutionLedger?.fixtureExecution?.accountedRows === 597
  && a14MarketExecution.publicSecuritiesCatalog?.fixtureExecution?.instruments === 460
  && a14MarketExecution.publicSecuritiesCatalog?.fixtureExecution?.reconciledIdentities === 280
  && a14MarketExecution.marketImpactFullDenominator?.fixtureExecution?.assetDenominator === 80
  && a14MarketExecution.marketImpactFullDenominator?.fixtureExecution?.advancedFunctionalReady === 40
  && a14MarketExecution.marketImpactFullDenominator?.fixtureExecution?.advancedProductionEligible === 0
  && a14MarketExecution.whaleBindingResolver?.fixtureExecution?.assetDenominator === 150
  && a14MarketExecution.whaleBindingResolver?.fixtureExecution?.exactConsensus === 90
  && a14MarketExecution.sellEnabled === false
  && a14MarketExecution.paidDeliveryEligible === false
  && a14MarketExecution.liveClaimed === false);
check("a14_progress_and_zero_budget_truth",
  a14MarketSummary.canonicalWeightedPlanningPercent === 41.9
  && a14MarketSummary.canonicalStrictDonePercent === 9.3
  && a14MarketSummary.zeroBudgetWeightedPlanningPercent === 82.1
  && a14MarketSummary.zeroBudgetCoreDenominator === 42
  && a14MarketSummary.zeroBudgetCounts?.DONE === 28
  && a14MarketSummary.zeroBudgetCounts?.PARTIAL === 13
  && a14MarketSummary.zeroBudgetCounts?.NOT_DONE === 1
  && a14MarketSummary.visualChangesMade === false
  && a14MarketSummary.liveClaimed === false);
check("a14_sources_fail_closed",
  a14LedgerSource.includes("Every scheduled job has exactly one terminal row")
  && a14LedgerSource.includes("execution_result_orphan")
  && a14SecuritiesSource.includes("quoteCoverageBps:0")
  && a14SecuritiesSource.includes("UNAVAILABLE_NOT_IN_CATALOG_FEED")
  && a14BindingSource.includes("TWO_FAMILY_EXACT_CONSENSUS")
  && a14BindingSource.includes("binding_source_conflict")
  && a14ImpactSource.includes("FUNCTIONAL_READY_OFFLINE")
  && a14ImpactSource.includes("basicEligibleCount")
  && a14ImpactSource.includes("paidDeliveryEligible:false"));

const a15ImportedRuntime = json("config/pass35/a15-imported-snapshot-runtime-contract.json");
const a15ImportedSummary = json("artifacts/release/PASS35_A15_PRODUCT_ROADMAP_SUMMARY.json");
const a15BundleSource = read("lib/market-integrity/pass35-snapshot-evidence-bundle.mjs");
const a15SecuritiesSource = read("lib/market-integrity/pass35-public-securities-quote-history-runtime.mjs");
const a15ActionsSource = read("lib/market-integrity/pass35-corporate-actions-calendar-runtime.mjs");
const a15NormalizationSource = read("lib/market-integrity/pass35-cross-asset-normalization.mjs");
const a15RealMarketsSource = read("lib/market-integrity/pass35-real-markets-tier-runtime.mjs");
const a15OrderBookSource = read("lib/market-integrity/pass35-order-book-import-replay.mjs");
const a15WhaleSource = read("lib/market-integrity/pass35-whale-evidence-bundle-runtime.mjs");
const a15BridgeSource = read("lib/market-integrity/pass35-ledger-denominator-bridge.mjs");
check("a15_imported_snapshot_contract",
  a15ImportedRuntime.schemaVersion === "velmere.pass35.a15-imported-snapshot-runtime-contract.v2"
  && a15ImportedRuntime.sourceRevisionId === current.sourceRevisionId
  && a15ImportedRuntime.snapshotEvidenceBundle?.fixtureExecution?.assertions === 9
  && a15ImportedRuntime.securitiesQuoteHistory?.fixtureExecution?.instrumentDenominator === 120
  && a15ImportedRuntime.securitiesQuoteHistory?.fixtureExecution?.basicFunctionalReady === 100
  && a15ImportedRuntime.securitiesQuoteHistory?.fixtureExecution?.proFunctionalReady === 80
  && a15ImportedRuntime.securitiesQuoteHistory?.fixtureExecution?.advancedFunctionalReady === 60
  && a15ImportedRuntime.corporateActionsCalendar?.fixtureExecution?.reconciled === 60
  && a15ImportedRuntime.corporateActionsCalendar?.fixtureExecution?.calendarCovered === 120
  && a15ImportedRuntime.realMarketsTierRuntime?.fixtureExecution?.packetCount === 360
  && a15ImportedRuntime.realMarketsTierRuntime?.fixtureExecution?.advancedFunctionalReady === 60
  && a15ImportedRuntime.orderBookImportReplay?.fixtureExecution?.assetDenominator === 60
  && a15ImportedRuntime.orderBookImportReplay?.fixtureExecution?.replayPairs === 180
  && a15ImportedRuntime.whaleEvidenceImport?.fixtureExecution?.assetDenominator === 100
  && a15ImportedRuntime.whaleEvidenceImport?.fixtureExecution?.advancedFunctionalReady === 80
  && a15ImportedRuntime.ledgerDenominatorBridge?.fixtureExecution?.shieldAssetDenominator === 50
  && a15ImportedRuntime.ledgerDenominatorBridge?.fixtureExecution?.realMarketsInstrumentDenominator === 120
  && a15ImportedRuntime.sellEnabled === false
  && a15ImportedRuntime.paidDeliveryEligible === false
  && a15ImportedRuntime.liveClaimed === false);
check("a15_progress_and_zero_budget_truth",
  a15ImportedSummary.canonicalWeightedPlanningPercent === 41.9
  && a15ImportedSummary.canonicalStrictDonePercent === 9.3
  && a15ImportedSummary.zeroBudgetWeightedPlanningPercent === 82.1
  && a15ImportedSummary.zeroBudgetCoreDenominator === 42
  && a15ImportedSummary.zeroBudgetCounts?.DONE === 28
  && a15ImportedSummary.zeroBudgetCounts?.PARTIAL === 13
  && a15ImportedSummary.zeroBudgetCounts?.NOT_DONE === 1
  && a15ImportedSummary.visualChangesMade === false
  && a15ImportedSummary.liveClaimed === false);
check("a15_sources_fail_closed",
  a15BundleSource.includes("FILE_IMPORT")
  && a15BundleSource.includes("paidGateEligible:false")
  && a15SecuritiesSource.includes("FUNCTIONAL_READY_OFFLINE")
  && a15SecuritiesSource.includes("UNAVAILABLE")
  && a15ActionsSource.includes("CONFLICTED")
  && a15ActionsSource.includes("advancedActionProvenanceEligible")
  && a15NormalizationSource.includes("semanticUnit")
  && a15NormalizationSource.includes("paidDeliveryEligible:false")
  && a15RealMarketsSource.includes("360") === false
  && a15RealMarketsSource.includes("FUNCTIONAL_READY_OFFLINE")
  && a15RealMarketsSource.includes("productionEligible:false")
  && a15OrderBookSource.includes("bids[0].price>=asks[0].price")
  && a15OrderBookSource.includes("two-snapshot replay")
  && a15WhaleSource.includes("two_family_binding_missing")
  && a15WhaleSource.includes("paidDeliveryEligible:false")
  && a15BridgeSource.includes("allCryptoJobsTerminal")
  && a15BridgeSource.includes("sellEnabled:false"));

const a16CanonicalRisk = json("config/pass35/a16-canonical-risk-runtime-contract.json");
const a16Summary = json("artifacts/release/PASS35_A16_PRODUCT_ROADMAP_SUMMARY.json");
const a16ParitySource = read("lib/market-integrity/pass35-a16-canonical-channel-parity.ts");
const a16PortfolioSource = read("lib/market-integrity/pass35-a16-cross-asset-portfolio-runtime.mjs");
const a16RegimeSource = read("lib/market-integrity/pass35-a16-regime-stress-runtime.mjs");
const a16RiskSource = read("lib/market-integrity/pass35-a16-risk-prospective-runtime.mjs");
check("a16_canonical_risk_contract",
  a16CanonicalRisk.schemaVersion === "velmere.pass35.a16-canonical-risk-runtime-contract.v1"
  && a16CanonicalRisk.sourceRevisionId === current.sourceRevisionId
  && a16CanonicalRisk.canonicalChannelParity?.tierPackets === 21
  && a16CanonicalRisk.canonicalChannelParity?.projections === 126
  && a16CanonicalRisk.canonicalChannelParity?.parityChecks === 126
  && a16CanonicalRisk.canonicalChannelParity?.addedFactViolations === 0
  && a16CanonicalRisk.crossAssetPortfolio?.instruments === 120
  && a16CanonicalRisk.crossAssetPortfolio?.portfolios === 12
  && a16CanonicalRisk.regimeStress?.scenarios === 6
  && a16CanonicalRisk.regimeStress?.scenarioResults === 72
  && a16CanonicalRisk.riskProspective?.rows === 600
  && a16CanonicalRisk.riskProspective?.frozenPredictions === 100
  && a16CanonicalRisk.riskProspective?.probabilityClaimsAllowed === false
  && a16CanonicalRisk.sellEnabled === false
  && a16CanonicalRisk.liveClaimed === false);
check("a16_progress_truth",
  a16Summary.canonicalWeightedPlanningPercent === 41.9
  && a16Summary.canonicalStrictDonePercent === 9.3
  && a16Summary.zeroBudgetWeightedPlanningPercent === 82.1
  && a16Summary.zeroBudgetCoreDenominator === 42
  && a16Summary.zeroBudgetCounts?.DONE === 28
  && a16Summary.zeroBudgetCounts?.PARTIAL === 13
  && a16Summary.zeroBudgetCounts?.NOT_DONE === 1
  && a16Summary.visualChangesMade === false
  && a16Summary.liveClaimed === false);
check("a16_sources_fail_closed",
  a16ParitySource.includes("addsFacts:false")
  && a16ParitySource.includes("paidDeliveryEligible:false")
  && a16PortfolioSource.includes("productionEligible:false")
  && a16RegimeSource.includes("sellEnabled:false") && a16RegimeSource.includes("liveClaimed:false")
  && a16RiskSource.includes("empiricalProbabilityClaimAllowed:false")
  && a16RiskSource.includes("prospectivePerformanceClaimAllowed:false"));

const a17Contract = json("config/pass35/a17-evidence-decision-runtime-contract.json");
const a17Summary = json("artifacts/release/PASS35_A17_PRODUCT_ROADMAP_SUMMARY.json");
const a17EvidenceRuntime = json("artifacts/release/PASS35_A17_EVIDENCE_QUALITY_RUNTIME.json");
const a17RiskRuntime = json("artifacts/release/PASS35_A17_RISK_CALIBRATION_RUNTIME.json");
check("a17_evidence_decision_pdf_risk_truth",
  a17Contract.schemaVersion === "velmere.pass35.a17-evidence-decision-runtime-contract.v1"
  && a17Contract.sourceRevisionId === current.sourceRevisionId
  && a17Contract.baselineA16?.canonicalWeightedPlanningPercent === 40.7
  && a17Contract.baselineA16?.zeroBudgetWeightedPlanningPercent === 80
  && a17Contract.progressDelta?.canonicalPercentagePoints === 1.2
  && a17Contract.progressDelta?.zeroBudgetPercentagePoints === 2.1
  && a17Summary.canonicalWeightedPlanningPercent === 41.9
  && a17Summary.canonicalStrictDonePercent === 9.3
  && a17Summary.zeroBudgetWeightedPlanningPercent === 82.1
  && a17Summary.zeroBudgetCoreDenominator === 42
  && a17EvidenceRuntime.packetDenominator === 21
  && a17EvidenceRuntime.channelDecisionDenominator === 63
  && a17EvidenceRuntime.integratedDecisionPacketDenominator === 3
  && a17EvidenceRuntime.addedFactViolations === 0
  && a17EvidenceRuntime.sellEnabled === false
  && a17EvidenceRuntime.liveClaimed === false
  && a17RiskRuntime.rowDenominator === 600
  && a17RiskRuntime.splitMetrics?.validation?.ece === 0.04542424
  && a17RiskRuntime.empiricalProbabilityClaimAllowed === false
  && a17RiskRuntime.prospectivePerformanceClaimAllowed === false
  && a17Contract.visualChangesMade === false
  && a17Contract.sellEnabled === false
  && a17Contract.liveClaimed === false);

const a18Contract = json("config/pass35/a18-tier-value-runtime-contract.json");
const a18Summary = json("artifacts/release/PASS35_A18_PRODUCT_ROADMAP_SUMMARY.json");
const a18Receipt = json("artifacts/pass35/PASS35_A18_TIER_VALUE_BENCHMARK_RECEIPT.json");
const a18RegressionReceipt = json("artifacts/pass35/PASS35_A18_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
check("a18_tier_value_downgrade_no_charge_truth",
  a18Contract.schemaVersion === "velmere.pass35.a18-tier-value-runtime-contract.v1"
  && a18Contract.sourceRevisionId === current.sourceRevisionId
  && a18Contract.baselineA16?.canonicalWeightedPlanningPercent === 40.7
  && a18Contract.baselineA16?.zeroBudgetWeightedPlanningPercent === 80
  && a18Contract.baselineA17?.canonicalWeightedPlanningPercent === 41.9
  && a18Contract.baselineA17?.zeroBudgetWeightedPlanningPercent === 82.1
  && a18Contract.progressDeltaVsA17?.canonicalPercentagePoints === 1.1
  && a18Contract.progressDeltaVsA17?.zeroBudgetPercentagePoints === 1.2
  && a18Contract.progressDeltaVsA16?.canonicalPercentagePoints === 2.3
  && a18Contract.progressDeltaVsA16?.zeroBudgetPercentagePoints === 3.3
  && a18Summary.canonicalWeightedPlanningPercent === 43
  && a18Summary.canonicalStrictDonePercent === 9.3
  && a18Summary.zeroBudgetWeightedPlanningPercent === 83.3
  && a18Summary.zeroBudgetCoreDenominator === 45
  && a18Contract.tierValueBenchmark?.cases === 350
  && a18Contract.tierValueBenchmark?.outputs === 1050
  && a18Contract.tierValueBenchmark?.comparisons === 700
  && a18Contract.tierValueBenchmark?.blindComparisons === 700
  && a18Contract.tierValueBenchmark?.mutations === 5600
  && a18Contract.tierValueBenchmark?.structuralPassRate === 1
  && a18Contract.tierValueBenchmark?.blindSelectionAccuracy === 1
  && a18Contract.tierValueBenchmark?.mutationKillRate === 1
  && a18Contract.tierValueBenchmark?.noSilentTierDowngrade === true
  && a18Contract.tierValueBenchmark?.noPageCountOnlyUpgrade === true
  && a18Contract.tierValueBenchmark?.customerPurchaseWorthinessProven === false
  && a18Receipt.denominators?.cases === 350
  && a18Receipt.denominators?.outputs === 1050
  && a18Receipt.denominators?.comparisons === 700
  && a18Receipt.denominators?.blindComparisons === 700
  && a18Receipt.denominators?.mutations === 5600
  && a18Receipt.results?.noSilentTierDowngrade === true
  && a18Receipt.results?.noPageCountOnlyUpgrade === true
  && a18Receipt.customerPurchaseWorthinessProven === false
  && a18Receipt.sellEnabled === false
  && a18Receipt.liveClaimed === false
  && a18RegressionReceipt.status === "PASS"
  && a18RegressionReceipt.testCountExecuted === 71
  && a18RegressionReceipt.passed === 71
  && a18RegressionReceipt.failed === 0
  && a18RegressionReceipt.exactRuntimeClaimed === false
  && a18Contract.visualChangesMade === false
  && a18Contract.sellEnabled === false
  && a18Contract.chargeAllowed === false
  && a18Contract.paidDeliveryAllowed === false
  && a18Contract.liveClaimed === false);

const a19Contract = json("config/pass35/a19-exact-runtime-audit-static-runtime-contract.json");
const a19Summary = json("artifacts/release/PASS35_A19_PRODUCT_ROADMAP_SUMMARY.json");
const a19ExactRuntime = json("artifacts/pass35/PASS35_A19_EXACT_RUNTIME_BOOTSTRAP_EVALUATION.json");
const a19AuditRuntime = json("artifacts/pass35/PASS35_A19_AUDIT_STATIC_BENCHMARK_RUNTIME.json");
const a19AuditReceipt = json("artifacts/pass35/PASS35_A19_AUDIT_STATIC_BENCHMARK_RECEIPT.json");
const a19RegressionReceipt = json("artifacts/pass35/PASS35_A19_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
check("a19_exact_runtime_audit_static_truth",
  a19Contract.schemaVersion === "velmere.pass35.a19-exact-runtime-audit-static-runtime-contract.v1"
  && a19Contract.sourceRevisionId === current.sourceRevisionId
  && a19Contract.baselineA16?.canonicalWeightedPlanningPercent === 40.7
  && a19Contract.baselineA16?.zeroBudgetWeightedPlanningPercent === 80
  && a19Contract.baselineA18?.canonicalWeightedPlanningPercent === 43
  && a19Contract.baselineA18?.zeroBudgetWeightedPlanningPercent === 83.3
  && a19Contract.progressDeltaVsA18?.canonicalPercentagePoints === 1.2
  && a19Contract.progressDeltaVsA18?.zeroBudgetPercentagePoints === 1.8
  && a19Contract.progressDeltaVsA16?.canonicalPercentagePoints === 3.5
  && a19Contract.progressDeltaVsA16?.zeroBudgetPercentagePoints === 5.1
  && a19Summary.canonicalWeightedPlanningPercent === 44.2
  && a19Summary.canonicalStrictDonePercent === 9.3
  && a19Summary.zeroBudgetWeightedPlanningPercent === 85.1
  && a19Summary.zeroBudgetCoreDenominator === 47
  && a19ExactRuntime.status === "BLOCKED_EXACT_RUNTIME_NOT_EXECUTED"
  && a19ExactRuntime.blockers?.length === 12
  && a19ExactRuntime.exactRuntimeProven === false
  && a19AuditRuntime.localStaticBenchmarkPass === true
  && a19AuditRuntime.denominators?.families === 15
  && a19AuditRuntime.denominators?.cases === 240
  && a19AuditRuntime.denominators?.mutations === 2880
  && a19AuditRuntime.frozen?.recall === 1
  && a19AuditRuntime.frozen?.specificity === 1
  && a19AuditRuntime.frozen?.precision === 1
  && a19AuditRuntime.frozen?.f1 === 1
  && a19AuditRuntime.mutation?.killRate === 1
  && a19AuditRuntime.paidGateEligible === false
  && a19AuditRuntime.fullAuditClaimAllowed === false
  && a19AuditReceipt.status === "PASS_LOCAL_SYNTHETIC_STATIC_BENCHMARK_NOT_FOR_SALE"
  && a19AuditReceipt.sellEnabled === false
  && a19AuditReceipt.chargeAllowed === false
  && a19AuditReceipt.liveClaimed === false
  && a19RegressionReceipt.status === "PASS"
  && a19RegressionReceipt.testCountExecuted === 73
  && a19RegressionReceipt.passed === 73
  && a19RegressionReceipt.failed === 0
  && a19RegressionReceipt.exactRuntimeClaimed === false
  && a19Contract.visualChangesMade === false
  && a19Contract.sellEnabled === false
  && a19Contract.chargeAllowed === false
  && a19Contract.paidDeliveryAllowed === false
  && a19Contract.liveClaimed === false);

const a20Contract = json("config/pass35/a20-case-bound-dependency-runtime-contract.json");
const a20Runtime = json("artifacts/pass35/PASS35_A20_CASE_BOUND_DEPENDENCY_BENCHMARK.json");
const a20Receipt = json("artifacts/pass35/PASS35_A20_CASE_BOUND_DEPENDENCY_RECEIPT.json");
const a20Regression = json("artifacts/pass35/PASS35_A20_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
check("a20_case_bound_dependency_truth",
  a20Contract.schemaVersion === "velmere.pass35.a20-case-bound-dependency-runtime-contract.v1"
  && a20Contract.sourceRevisionId === current.sourceRevisionId
  && a20Contract.canonicalWeightedPlanningPercent === 45.3
  && a20Contract.canonicalStrictDonePercent === 11.6
  && a20Contract.zeroBudgetWeightedPlanningPercent === 86
  && a20Contract.zeroBudgetCoreDenominator === 50
  && a20Contract.progressDeltaVsA19?.canonicalPercentagePoints === 1.1
  && a20Contract.progressDeltaVsA19?.zeroBudgetPercentagePoints === 0.9
  && a20Runtime.localImplementationComplete === true
  && a20Runtime.denominators?.cases === 200
  && a20Runtime.denominators?.frozen === 80
  && a20Runtime.denominators?.mutations === 2400
  && a20Runtime.frozen?.recall === 1
  && a20Runtime.frozen?.precision === 1
  && a20Runtime.frozen?.specificity === 1
  && a20Runtime.mutation?.killRate === 1
  && a20Receipt.localImplementationComplete === true
  && a20Receipt.paidGateEligible === false
  && a20Receipt.legalConclusionAllowed === false
  && a20Receipt.sellEnabled === false
  && a20Regression.status === "PASS"
  && a20Regression.testCountExecuted === 74
  && a20Regression.passed === 74
  && a20Regression.failed === 0
  && a20Contract.visualChangesMade === false
  && a20Contract.sellEnabled === false
  && a20Contract.liveClaimed === false);

const a21Policy = json("config/pass35/a21-abstract-path-policy.json");
const a21Contract = json("config/pass35/a21-abstract-path-runtime-contract.json");
const a21Runtime = json("artifacts/pass35/PASS35_A21_ABSTRACT_PATH_BENCHMARK.json");
const a21Receipt = json("artifacts/pass35/PASS35_A21_ABSTRACT_PATH_RECEIPT.json");
const a21Regression = json("artifacts/pass35/PASS35_A21_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
check("a21_abstract_path_local_truth",
  a21Policy.schemaVersion === "velmere.pass35.a21-abstract-path-policy.v1"
  && a21Contract.schemaVersion === "velmere.pass35.a21-abstract-path-runtime-contract.v1"
  && a21Contract.canonicalWeightedPlanningPercent === 46.5
  && a21Contract.canonicalStrictDonePercent === 14
  && a21Contract.zeroBudgetWeightedPlanningPercent === 86.8
  && a21Runtime.denominators?.cases === 192
  && a21Runtime.denominators?.frozen === 72
  && a21Runtime.denominators?.mutations === 2304
  && a21Runtime.frozen?.recall === 1
  && a21Runtime.frozen?.precision === 1
  && a21Runtime.frozen?.specificity === 1
  && a21Runtime.mutation?.matchRate === 1
  && a21Receipt.localBoundedImplementationComplete === true
  && a21Receipt.fullSmtSymbolicExecutionClaimed === false
  && a21Receipt.exploitabilityClaimAllowed === false
  && a21Receipt.paidGateEligible === false
  && a21Regression.status === "PASS"
  && a21Regression.testCountExecuted === 76
  && a21Regression.passed === 76
  && a21Regression.failed === 0
  && a21Contract.visualChangesMade === false
  && a21Contract.sellEnabled === false
  && a21Contract.liveClaimed === false);

const a22Policy = json("config/pass35/a22-severity-triage-policy.json");
const a22Contract = json("config/pass35/a22-severity-triage-runtime-contract.json");
const a22Runtime = json("artifacts/pass35/PASS35_A22_SEVERITY_TRIAGE_BENCHMARK.json");
const a22Receipt = json("artifacts/pass35/PASS35_A22_SEVERITY_TRIAGE_RECEIPT.json");
const a22Regression = json("artifacts/pass35/PASS35_A22_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
check("a22_evidence_bound_severity_local_truth",
  a22Policy.schemaVersion === "velmere.pass35.a22-severity-triage-policy.v1"
  && a22Contract.schemaVersion === "velmere.pass35.a22-severity-triage-runtime-contract.v1"
  && a22Contract.canonicalWeightedPlanningPercent === 47.7
  && a22Contract.canonicalStrictDonePercent === 16.3
  && a22Contract.zeroBudgetWeightedPlanningPercent === 87.5
  && a22Runtime.denominators?.cases === 192
  && a22Runtime.denominators?.frozen === 72
  && a22Runtime.denominators?.mutations === 2304
  && a22Runtime.frozen?.severityAccuracy === 1
  && a22Runtime.frozen?.suppressionAccuracy === 1
  && a22Runtime.frozen?.weightedKappa === 1
  && a22Runtime.frozen?.falseCriticalRemediated === 0
  && a22Runtime.frozen?.unjustifiedCritical === 0
  && a22Runtime.mutation?.killRate === 1
  && a22Receipt.evidenceBoundSeverityTriageComplete === true
  && a22Receipt.attackChainAggregationComplete === true
  && a22Receipt.independentHumanRatersClaimed === false
  && a22Receipt.exploitabilityClaimAllowed === false
  && a22Receipt.paidGateEligible === false
  && a22Regression.status === "PASS"
  && a22Regression.testCountExecuted === 78
  && a22Regression.passed === 78
  && a22Regression.failed === 0
  && a22Contract.visualChangesMade === false
  && a22Contract.sellEnabled === false
  && a22Contract.liveClaimed === false);

const a23Policy = json("config/pass35/a23-remediation-closure-policy.json");
const a23Contract = json("config/pass35/a23-remediation-closure-runtime-contract.json");
const a23Runtime = json("artifacts/pass35/PASS35_A23_REMEDIATION_CLOSURE_BENCHMARK.json");
const a23Receipt = json("artifacts/pass35/PASS35_A23_REMEDIATION_CLOSURE_RECEIPT.json");
const a23Regression = json("artifacts/pass35/PASS35_A23_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
check("a23_evidence_bound_remediation_closure_local_truth",
  a23Policy.schemaVersion === "velmere.pass35.a23-remediation-closure-policy.v1"
  && a23Contract.schemaVersion === "velmere.pass35.a23-remediation-closure-runtime-contract.v1"
  && a23Contract.canonicalWeightedPlanningPercent === 48.8
  && a23Contract.canonicalStrictDonePercent === 18.6
  && a23Contract.zeroBudgetWeightedPlanningPercent === 88.1
  && a23Runtime.denominators?.cases === 192
  && a23Runtime.denominators?.frozen === 72
  && a23Runtime.denominators?.mutations === 2304
  && a23Runtime.frozen?.closureAccuracy === 1
  && a23Runtime.frozen?.unsafeClosureSuppression === 1
  && a23Runtime.frozen?.unsafeClosures === 0
  && a23Runtime.frozen?.falseBlocks === 0
  && a23Runtime.mutation?.killRate === 1
  && a23Receipt.exactPrePostBindingComplete === true
  && a23Receipt.patchImpactCoverageComplete === true
  && a23Receipt.familyDerivedRetestMatrixComplete === true
  && a23Receipt.regressionFindingGateComplete === true
  && a23Receipt.postPatchSeverityGateComplete === true
  && a23Receipt.supersessionInvalidationComplete === true
  && a23Receipt.realFixClaimed === false
  && a23Receipt.signedClosureClaimed === false
  && a23Receipt.paidGateEligible === false
  && a23Regression.status === "PASS"
  && a23Regression.testCountExecuted === 80
  && a23Regression.passed === 80
  && a23Regression.failed === 0
  && a23Contract.visualChangesMade === false
  && a23Contract.sellEnabled === false
  && a23Contract.liveClaimed === false);


const a24Policy = json("config/pass35/a24-monitoring-lifecycle-policy.json");
const a24Contract = json("config/pass35/a24-monitoring-lifecycle-runtime-contract.json");
const a24Runtime = json("artifacts/pass35/PASS35_A24_MONITORING_LIFECYCLE_BENCHMARK.json");
const a24Receipt = json("artifacts/pass35/PASS35_A24_MONITORING_LIFECYCLE_RECEIPT.json");
const a24Regression = json("artifacts/pass35/PASS35_A24_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
check("a24_monitoring_incident_lifecycle_local_truth",
  a24Policy.schemaVersion === "velmere.pass35.a24-monitoring-lifecycle-policy.v1"
  && a24Contract.schemaVersion === "velmere.pass35.a24-monitoring-lifecycle-runtime-contract.v1"
  && a24Contract.canonicalWeightedPlanningPercent === 50
  && a24Contract.canonicalStrictDonePercent === 20.9
  && a24Contract.zeroBudgetWeightedPlanningPercent === 88.7
  && a24Runtime.denominators?.cases === 192
  && a24Runtime.denominators?.frozen === 72
  && a24Runtime.denominators?.mutations === 2304
  && a24Runtime.frozen?.accuracy === 1
  && a24Runtime.frozen?.triggerAccuracy === 1
  && a24Runtime.frozen?.lifecycleAccuracy === 1
  && a24Runtime.frozen?.dedupeAccuracy === 1
  && a24Runtime.frozen?.orderingAccuracy === 1
  && a24Runtime.frozen?.unsafeClosures === 0
  && a24Runtime.frozen?.falseBlocks === 0
  && a24Runtime.mutation?.killRate === 1
  && a24Receipt.eventEvaluationComplete === true
  && a24Receipt.deduplicationOrderingComplete === true
  && a24Receipt.incidentCorrelationComplete === true
  && a24Receipt.deliverySlaGateComplete === true
  && a24Receipt.acknowledgementSlaGateComplete === true
  && a24Receipt.playbookActionGateComplete === true
  && a24Receipt.customerCommunicationGateComplete === true
  && a24Receipt.postConditionClosureGateComplete === true
  && a24Receipt.liveMonitoringActive === false
  && a24Receipt.realIncidentClaimed === false
  && a24Receipt.paidGateEligible === false
  && a24Regression.status === "PASS"
  && a24Regression.testCountExecuted === 82
  && a24Regression.passed === 82
  && a24Regression.failed === 0
  && a24Contract.visualChangesMade === false
  && a24Contract.sellEnabled === false
  && a24Contract.liveMonitoringActive === false);

const a25Policy = json("config/pass35/a25-exact-test-evidence-policy.json");
const a25Contract = json("config/pass35/a25-exact-test-evidence-runtime-contract.json");
const a25Runtime = json("artifacts/pass35/PASS35_A25_EXACT_TEST_EVIDENCE_BENCHMARK.json");
const a25Receipt = json("artifacts/pass35/PASS35_A25_EXACT_TEST_EVIDENCE_RECEIPT.json");
const a25Regression = json("artifacts/pass35/PASS35_A25_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
check("a25_exact_test_evidence_local_truth",
  a25Policy.schemaVersion === "velmere.pass35.a25-exact-test-evidence-policy.v1"
  && a25Contract.schemaVersion === "velmere.pass35.a25-exact-test-evidence-runtime-contract.v1"
  && a25Contract.canonicalWeightedPlanningPercent === 51.2
  && a25Contract.canonicalStrictDonePercent === 23.3
  && a25Contract.zeroBudgetWeightedPlanningPercent === 89.2
  && a25Runtime.denominators?.cases === 192
  && a25Runtime.denominators?.frozen === 72
  && a25Runtime.denominators?.mutations === 2304
  && a25Runtime.frozen?.accuracy === 1
  && a25Runtime.frozen?.unsafeEligible === 0
  && a25Runtime.frozen?.falseBlocks === 0
  && a25Runtime.mutation?.killRate === 1
  && a25Receipt.behaviorRegistryGateComplete === true
  && a25Receipt.caseTargetBindingComplete === true
  && a25Receipt.runnerBindingComplete === true
  && a25Receipt.criticalBehaviorCoverageGateComplete === true
  && a25Receipt.branchCoverageGateComplete === true
  && a25Receipt.stateTransitionCoverageGateComplete === true
  && a25Receipt.testIsolationGateComplete === true
  && a25Receipt.repeatabilityGateComplete === true
  && a25Receipt.mutationScoreGateComplete === true
  && a25Receipt.officialForgeExecuted === false
  && a25Receipt.compiledEvmExecutionProven === false
  && a25Receipt.realCustomerCase === false
  && a25Receipt.paidGateEligible === false
  && a25Regression.status === "PASS"
  && a25Regression.testCountExecuted === 84
  && a25Regression.passed === 84
  && a25Regression.failed === 0
  && a25Contract.visualChangesMade === false
  && a25Contract.sellEnabled === false
  && a25Contract.officialForgeExecuted === false);

const a26Policy = json("config/pass35/a26-fuzz-invariant-evidence-policy.json");
const a26Contract = json("config/pass35/a26-fuzz-invariant-evidence-runtime-contract.json");
const a26Runtime = json("artifacts/pass35/PASS35_A26_FUZZ_INVARIANT_EVIDENCE_BENCHMARK.json");
const a26Receipt = json("artifacts/pass35/PASS35_A26_FUZZ_INVARIANT_EVIDENCE_RECEIPT.json");
const a26Regression = json("artifacts/pass35/PASS35_A26_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
const a26RegressionBootstrap = process.env.A26_REGRESSION_BOOTSTRAP === "1";
check("a26_fuzz_invariant_evidence_local_truth",
  a26Policy.schemaVersion === "velmere.pass35.a26-fuzz-invariant-evidence-policy.v1"
  && a26Contract.schemaVersion === "velmere.pass35.a26-fuzz-invariant-evidence-runtime-contract.v1"
  && a26Contract.canonicalWeightedPlanningPercent === 52.3
  && a26Contract.canonicalStrictDonePercent === 25.6
  && a26Contract.zeroBudgetWeightedPlanningPercent === 89.7
  && a26Runtime.denominators?.cases === 192
  && a26Runtime.denominators?.frozen === 72
  && a26Runtime.denominators?.mutations === 2304
  && a26Runtime.frozen?.accuracy === 1
  && a26Runtime.frozen?.unsafeEligible === 0
  && a26Runtime.frozen?.falseBlocks === 0
  && a26Runtime.mutation?.killRate === 1
  && a26Receipt.invariantRegistryGateComplete === true
  && a26Receipt.targetModelCorpusRunnerBindingsComplete === true
  && a26Receipt.criticalHighCoverageGateComplete === true
  && a26Receipt.stateKeyCoverageGateComplete === true
  && a26Receipt.seedDiversityGateComplete === true
  && a26Receipt.deterministicReplayGateComplete === true
  && a26Receipt.counterexampleShrinkingGateComplete === true
  && a26Receipt.mutationScoreGateComplete === true
  && a26Receipt.officialFoundryExecuted === false
  && a26Receipt.officialEchidnaExecuted === false
  && a26Receipt.compiledEvmExecutionProven === false
  && a26Receipt.implementationModelEquivalenceProven === false
  && a26Receipt.realCustomerCase === false
  && a26Receipt.paidGateEligible === false
  && (a26RegressionBootstrap
    ? a26Regression.status === "BOOTSTRAP_PENDING" && a26Regression.testCountExecuted === 0
    : a26Regression.status === "PASS" && a26Regression.testCountExecuted === 86 && a26Regression.passed === 86 && a26Regression.failed === 0)
  && a26Contract.visualChangesMade === false
  && a26Contract.sellEnabled === false);

const a27Policy = json("config/pass35/a27-fork-replay-evidence-policy.json");
const a27Contract = json("config/pass35/a27-fork-replay-evidence-runtime-contract.json");
const a27Runtime = json("artifacts/pass35/PASS35_A27_FORK_REPLAY_EVIDENCE_BENCHMARK.json");
const a27Receipt = json("artifacts/pass35/PASS35_A27_FORK_REPLAY_EVIDENCE_RECEIPT.json");
const a27Regression = json("artifacts/pass35/PASS35_A27_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
const a27RegressionBootstrap = process.env.A27_REGRESSION_BOOTSTRAP === "1";
check("a27_fork_replay_evidence_local_truth",
  a27Policy.schemaVersion === "velmere.pass35.a27-fork-replay-evidence-policy.v1"
  && a27Contract.schemaVersion === "velmere.pass35.a27-fork-replay-evidence-runtime-contract.v1"
  && a27Contract.canonicalWeightedPlanningPercent === 53.5
  && a27Contract.canonicalStrictDonePercent === 27.9
  && a27Contract.zeroBudgetWeightedPlanningPercent === 90.1
  && a27Runtime.denominators?.cases === 192
  && a27Runtime.denominators?.frozen === 72
  && a27Runtime.denominators?.mutations === 2304
  && a27Runtime.frozen?.accuracy === 1
  && a27Runtime.frozen?.unsafeEligible === 0
  && a27Runtime.frozen?.falseBlocks === 0
  && a27Runtime.mutation?.killRate === 1
  && a27Receipt.exactChainBlockSnapshotBindingComplete === true
  && a27Receipt.transactionSequenceAndStateRootContinuityComplete === true
  && a27Receipt.assertionAndStateDiffCoverageGateComplete === true
  && a27Receipt.dependencySnapshotBindingGateComplete === true
  && a27Receipt.logReturnAndRunnerBindingGateComplete === true
  && a27Receipt.isolatedDeterministicReplayGateComplete === true
  && a27Receipt.mutationScoreGateComplete === true
  && a27Receipt.officialNativeForkRunnerExecuted === false
  && a27Receipt.publicNetworkProviderUsed === false
  && a27Receipt.realHistoricalExploitReplayed === false
  && a27Receipt.realCustomerWorkflowReplayed === false
  && a27Receipt.commercialProviderRightsProven === false
  && a27Receipt.independentRerun === false
  && a27Receipt.paidGateEligible === false
  && (a27RegressionBootstrap
    ? a27Regression.status === "BOOTSTRAP_PENDING" && a27Regression.testCountExecuted === 0
    : a27Regression.status === "PASS" && a27Regression.testCountExecuted === 88 && a27Regression.passed === 88 && a27Regression.failed === 0)
  && a27Contract.visualChangesMade === false
  && a27Contract.sellEnabled === false);

const a28Policy = json("config/pass35/a28-economic-adversarial-evidence-policy.json");
const a28Contract = json("config/pass35/a28-economic-adversarial-evidence-runtime-contract.json");
const a28Runtime = json("artifacts/pass35/PASS35_A28_ECONOMIC_ADVERSARIAL_EVIDENCE_BENCHMARK.json");
const a28Receipt = json("artifacts/pass35/PASS35_A28_ECONOMIC_ADVERSARIAL_EVIDENCE_RECEIPT.json");
const a28Regression = json("artifacts/pass35/PASS35_A28_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
const a28RegressionBootstrap = process.env.A28_REGRESSION_BOOTSTRAP === "1";
check("a28_economic_adversarial_evidence_local_truth",
  a28Policy.schemaVersion === "velmere.pass35.a28-economic-adversarial-evidence-policy.v1"
  && a28Contract.schemaVersion === "velmere.pass35.a28-economic-adversarial-evidence-runtime-contract.v1"
  && a28Contract.canonicalWeightedPlanningPercent === 54.7
  && a28Contract.canonicalStrictDonePercent === 30.2
  && a28Contract.zeroBudgetWeightedPlanningPercent === 90.5
  && a28Runtime.denominators?.cases === 192
  && a28Runtime.denominators?.frozen === 72
  && a28Runtime.denominators?.mutations === 2304
  && a28Runtime.frozen?.accuracy === 1
  && a28Runtime.frozen?.unsafeEligible === 0
  && a28Runtime.frozen?.falseBlocks === 0
  && a28Runtime.mutation?.killRate === 1
  && a28Receipt.targetMethodReplayBindingComplete === true
  && a28Receipt.fiveScenarioRegistryComplete === true
  && a28Receipt.evidenceFamilyAndPrerequisiteCoverageComplete === true
  && a28Receipt.sensitivityAndUncertaintyGateComplete === true
  && a28Receipt.scenarioDependencyDagComplete === true
  && a28Receipt.replayCorrelationGateComplete === true
  && a28Receipt.deterministicModelReproductionComplete === true
  && a28Receipt.mutationScoreGateComplete === true
  && a28Receipt.currentRightsApprovedInputsUsed === false
  && a28Receipt.officialForkedEvmExecuted === false
  && a28Receipt.realEconomicExploitProven === false
  && a28Receipt.realizedLossClaimed === false
  && a28Receipt.calibratedProbabilityClaimAllowed === false
  && a28Receipt.qualifiedHumanAdjudication === false
  && a28Receipt.independentRerun === false
  && a28Receipt.paidGateEligible === false
  && (a28RegressionBootstrap
    ? a28Regression.status === "BOOTSTRAP_PENDING" && a28Regression.testCountExecuted === 0
    : a28Regression.status === "PASS" && a28Regression.testCountExecuted === 90 && a28Regression.passed === 90 && a28Regression.failed === 0)
  && a28Contract.visualChangesMade === false
  && a28Contract.sellEnabled === false);

const a29Policy = json("config/pass35/a29-upgrade-deployment-operations-policy.json");
const a29Contract = json("config/pass35/a29-upgrade-deployment-operations-runtime-contract.json");
const a29Runtime = json("artifacts/pass35/PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS_BENCHMARK.json");
const a29Receipt = json("artifacts/pass35/PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS_RECEIPT.json");
const a29Regression = json("artifacts/pass35/PASS35_A29_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
const a29RegressionBootstrap = process.env.A29_REGRESSION_BOOTSTRAP === "1";
check("a29_upgrade_deployment_operations_local_truth",
  a29Policy.schemaVersion === "velmere.pass35.a29-upgrade-deployment-operations-policy.v1"
  && a29Contract.schemaVersion === "velmere.pass35.a29-upgrade-deployment-operations-runtime-contract.v1"
  && a29Contract.canonicalWeightedPlanningPercent === 55.8
  && a29Contract.canonicalStrictDonePercent === 32.6
  && a29Contract.zeroBudgetWeightedPlanningPercent === 90.9
  && a29Runtime.denominators?.cases === 192
  && a29Runtime.denominators?.frozen === 72
  && a29Runtime.denominators?.mutations === 2304
  && a29Runtime.frozen?.accuracy === 1
  && a29Runtime.frozen?.unsafeEligible === 0
  && a29Runtime.frozen?.falseBlocks === 0
  && a29Runtime.mutation?.killRate === 1
  && a29Receipt.targetProxySlotBindingComplete === true
  && a29Receipt.upgradeAuthorizationComplete === true
  && a29Receipt.multisigQuorumAndTimelockComplete === true
  && a29Receipt.initializerAndStorageLayoutGateComplete === true
  && a29Receipt.upgradeSimulationAndRollbackGateComplete === true
  && a29Receipt.pauseEmergencyControlsComplete === true
  && a29Receipt.keyRotationRecoveryAndCompromiseScenariosComplete === true
  && a29Receipt.deterministicOperationsReplayComplete === true
  && a29Receipt.mutationScoreGateComplete === true
  && a29Receipt.currentOnChainStateVerified === false
  && a29Receipt.realMultisigTimelockExecuted === false
  && a29Receipt.productionUpgradeExecuted === false
  && a29Receipt.qualifiedHumanReviewed === false
  && a29Receipt.independentRerun === false
  && a29Receipt.paidGateEligible === false
  && (a29RegressionBootstrap
    ? a29Regression.status === "BOOTSTRAP_PENDING" && a29Regression.testCountExecuted === 0
    : a29Regression.status === "PASS" && a29Regression.testCountExecuted === 92 && a29Regression.passed === 92 && a29Regression.failed === 0)
  && a29Contract.visualChangesMade === false
  && a29Contract.sellEnabled === false);
const a30Policy = json("config/pass35/a30-threat-model-policy.json");
const a30Contract = json("config/pass35/a30-threat-model-runtime-contract.json");
const a30Runtime = json("artifacts/pass35/PASS35_A30_THREAT_MODEL_BENCHMARK.json");
const a30Receipt = json("artifacts/pass35/PASS35_A30_THREAT_MODEL_RECEIPT.json");
const a30Regression = json("artifacts/pass35/PASS35_A30_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
const a30RegressionBootstrap = process.env.A30_REGRESSION_BOOTSTRAP === "1";
check("a30_threat_model_local_truth",
  a30Policy.schemaVersion === "velmere.pass35.a30-threat-model-policy.v1"
  && a30Contract.schemaVersion === "velmere.pass35.a30-threat-model-runtime-contract.v1"
  && a30Contract.canonicalWeightedPlanningPercent === 57
  && a30Contract.canonicalStrictDonePercent === 34.9
  && a30Contract.zeroBudgetWeightedPlanningPercent === 91.3
  && a30Runtime.denominators?.cases === 192
  && a30Runtime.denominators?.frozen === 72
  && a30Runtime.denominators?.mutations === 2304
  && a30Runtime.frozen?.accuracy === 1
  && a30Runtime.frozen?.unsafeEligible === 0
  && a30Runtime.frozen?.falseBlocks === 0
  && a30Runtime.mutation?.killRate === 1
  && a30Receipt.caseArchitectureBindingComplete === true
  && a30Receipt.componentAssetActorRegistryComplete === true
  && a30Receipt.trustBoundaryDataFlowCoverageComplete === true
  && a30Receipt.entryPointAccessMappingComplete === true
  && a30Receipt.assumptionInvalidationRegistryComplete === true
  && a30Receipt.criticalAssetInvariantCoverageComplete === true
  && a30Receipt.abuseCaseAttackPathMitigationComplete === true
  && a30Receipt.residualRiskLimitationsComplete === true
  && a30Receipt.coverageDenominatorsComplete === true
  && a30Receipt.deterministicThreatModelReplayComplete === true
  && a30Receipt.mutationScoreGateComplete === true
  && a30Receipt.protocolSpecificAssumptionsHumanValidated === false
  && a30Receipt.businessLogicHumanReviewed === false
  && a30Receipt.realArchitectureWorkshopExecuted === false
  && a30Receipt.everyRealWorldThreatModeled === false
  && a30Receipt.independentRerun === false
  && a30Receipt.paidGateEligible === false
  && (a30RegressionBootstrap
    ? a30Regression.status === "BOOTSTRAP_PENDING" && a30Regression.testCountExecuted === 0
    : a30Regression.status === "PASS" && a30Regression.testCountExecuted === 94 && a30Regression.passed === 94 && a30Regression.failed === 0)
  && a30Contract.visualChangesMade === false
  && a30Contract.sellEnabled === false);


const a31Policy = json("config/pass35/a31-privilege-control-policy.json");
const a31Contract = json("config/pass35/a31-privilege-control-runtime-contract.json");
const a31Runtime = json("artifacts/pass35/PASS35_A31_PRIVILEGE_CONTROL_BENCHMARK.json");
const a31Receipt = json("artifacts/pass35/PASS35_A31_PRIVILEGE_CONTROL_RECEIPT.json");
const a31Regression = json("artifacts/pass35/PASS35_A31_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
const a31RegressionBootstrap = process.env.A31_REGRESSION_BOOTSTRAP === "1";
check("a31_privilege_control_local_truth",
  a31Policy.schemaVersion === "velmere.pass35.a31-privilege-control-policy.v1"
  && a31Contract.schemaVersion === "velmere.pass35.a31-privilege-control-runtime-contract.v1"
  && a31Contract.canonicalWeightedPlanningPercent === 58.1
  && a31Contract.canonicalStrictDonePercent === 37.2
  && a31Contract.zeroBudgetWeightedPlanningPercent === 91.6
  && a31Runtime.denominators?.cases === 192
  && a31Runtime.denominators?.frozen === 72
  && a31Runtime.denominators?.mutations === 2304
  && a31Runtime.frozen?.accuracy === 1
  && a31Runtime.frozen?.unsafeEligible === 0
  && a31Runtime.frozen?.falseBlocks === 0
  && a31Runtime.mutation?.killRate === 1
  && a31Receipt.caseTargetRoleStateBindingComplete === true
  && a31Receipt.roleHolderSourceEvidenceComplete === true
  && a31Receipt.selectorPermissionCoverageComplete === true
  && a31Receipt.roleAdminGraphIntegrityComplete === true
  && a31Receipt.proxyAdminAuthorityBindingComplete === true
  && a31Receipt.multisigTimelockDelegationComplete === true
  && a31Receipt.separationOfDutiesComplete === true
  && a31Receipt.privilegeEscalationPathsComplete === true
  && a31Receipt.revokeRenounceRecoveryControlsComplete === true
  && a31Receipt.hiddenPrivilegedSurfaceDetectionComplete === true
  && a31Receipt.deterministicPrivilegeReplayComplete === true
  && a31Receipt.mutationScoreGateComplete === true
  && a31Receipt.currentOnchainRoleStateProven === false
  && a31Receipt.manualAuthorizationReviewed === false
  && a31Receipt.allHiddenPrivilegesExcluded === false
  && a31Receipt.independentRerun === false
  && a31Receipt.paidGateEligible === false
  && (a31RegressionBootstrap
    ? a31Regression.status === "BOOTSTRAP_PENDING" && a31Regression.testCountExecuted === 0
    : a31Regression.status === "PASS" && a31Regression.testCountExecuted === 96 && a31Regression.passed === 96 && a31Regression.failed === 0)
  && a31Contract.visualChangesMade === false
  && a31Contract.sellEnabled === false);

const a32Policy = json("config/pass35/a32-report-delivery-policy.json");
const a32Contract = json("config/pass35/a32-report-delivery-runtime-contract.json");
const a32Runtime = json("artifacts/pass35/PASS35_A32_REPORT_DELIVERY_BENCHMARK.json");
const a32Receipt = json("artifacts/pass35/PASS35_A32_REPORT_DELIVERY_RECEIPT.json");
const a32Regression = json("artifacts/pass35/PASS35_A32_NONDESTRUCTIVE_REGRESSION_RECEIPT.json");
const a32RegressionBootstrap = process.env.A32_REGRESSION_BOOTSTRAP === "1";
check("a32_report_delivery_local_truth",
  a32Policy.schemaVersion === "velmere.pass35.a32-report-delivery-policy.v1"
  && a32Contract.schemaVersion === "velmere.pass35.a32-report-delivery-runtime-contract.v1"
  && a32Contract.canonicalWeightedPlanningPercent === 59.3
  && a32Contract.canonicalStrictDonePercent === 39.5
  && a32Contract.zeroBudgetWeightedPlanningPercent === 91.9
  && a32Runtime.denominators?.cases === 192
  && a32Runtime.denominators?.frozen === 72
  && a32Runtime.denominators?.mutations === 2304
  && a32Runtime.frozen?.accuracy === 1
  && a32Runtime.frozen?.unsafeEligible === 0
  && a32Runtime.frozen?.falseBlocks === 0
  && a32Runtime.mutation?.killRate === 1
  && a32Receipt.canonicalPacketAndClaimTaxonomyComplete === true
  && a32Receipt.analyzerReceiptIndexComplete === true
  && a32Receipt.tierScopeAndFieldCoverageComplete === true
  && a32Receipt.sensitiveFindingRedactionComplete === true
  && a32Receipt.accountCaseEntitlementBindingComplete === true
  && a32Receipt.reportStructureCompletenessComplete === true
  && a32Receipt.machineSealedArtifactIntegrityComplete === true
  && a32Receipt.oneTimeDownloadAndReplayRejectionComplete === true
  && a32Receipt.supersessionInvalidationComplete === true
  && a32Receipt.comprehensionAcknowledgementContractComplete === true
  && a32Receipt.privacyRetentionDeletionExportComplete === true
  && a32Receipt.deterministicDeliveryReplayComplete === true
  && a32Receipt.realAnalyzerExecutionProven === false
  && a32Receipt.realCustomerComprehensionProven === false
  && a32Receipt.stagingAccountIsolationProven === false
  && a32Receipt.qualifiedHumanSignatureProven === false
  && a32Receipt.customerWillingnessToPayProven === false
  && a32Receipt.paidGateEligible === false
  && (a32RegressionBootstrap
    ? a32Regression.status === "BOOTSTRAP_PENDING" && a32Regression.testCountExecuted === 0
    : a32Regression.status === "PASS" && a32Regression.testCountExecuted === 98 && a32Regression.passed === 98 && a32Regression.failed === 0)
  && a32Contract.visualChangesMade === false
  && a32Contract.sellEnabled === false);


check("current_status_register_canonical_no_promotion",
  currentStatusRegister.schemaVersion === "velmere.pass35.current-status-register.v1"
  && currentStatusRegister.candidateId === CANDIDATE
  && currentStatusRegister.sourceRevisionId === current.sourceRevisionId
  && currentStatusRegister.canonicalCurrentTruth === true
  && currentStatusRegister.globalDecision === "NO_GO"
  && currentStatusRegister.promotionAllowed === false
  && currentStatusRegister.sellEnabledCount === 0
  && currentStatusRegister.rows?.length === 43
  && currentStatusSummary.denominator === 43
  && currentStatusSummary.counts?.DONE === 17
  && currentStatusSummary.counts?.PARTIAL === 17
  && currentStatusSummary.counts?.BLOCKED_EXTERNAL === 9
  && currentStatusSummary.counts?.NOT_DONE === 0);
const evidence = json("config/pass35/evidence-policy.json");
check("evidence_fixture_isolation", evidence.fixtureIsolationRequired === true && evidence.fixtureEvidenceMayUseCanonicalPaths === false);
check("evidence_detached_self_hash", evidence.selfHashRule.includes("detached external"));
check("evidence_binary_gate_weighted_score", evidence.gateScoring.gateOutcomesAreBinary === true && evidence.gateScoring.readinessScoreIsWeighted === true && evidence.gateScoring.mixedClassGateIdsForbidden === true);
const external = json("config/pass35/external-proof-register.json");
check("external_register_fail_closed", external.status === "BLOCKED_EXTERNAL" && external.promotionAllowed === false && external.evidenceReceipts.length === 0);
check("external_register_exact_denominators", external.workstreams.length === 9 && external.workstreams.reduce((sum, row) => sum + row.requiredCount, 0) === 3074 && external.workstreams.every((row) => row.verifiedCount === 0));
const externalReceipt = json("_velmere/pass35/PASS35_EXTERNAL_BLOCKER_RECEIPT.json");
check("external_receipt_honest_zero", externalReceipt.status === "PASS_FAIL_CLOSED_EXTERNAL_REGISTER" && externalReceipt.verifiedEvidenceCount === 0 && externalReceipt.requiredEvidenceCount === 3074 && externalReceipt.promotionAllowed === false);
const detachedVerifierSource = read("scripts/pass35/detached-package-verifier.mjs");
check("detached_verifier_accepts_current_v2_receipt",
  detachedVerifierSource.includes('DETACHED_RECEIPT_SCHEMA = "velmere.pass35.detached-package-receipt.v2"')
  && detachedVerifierSource.includes("LEGACY_DETACHED_RECEIPT_SCHEMA")
  && detachedVerifierSource.includes("canonicalManifestSetSha256"));
const detachedPolicy = json("config/pass35/detached-package-verification-policy.json");
check("detached_verification_no_local_trust_anchors", detachedPolicy.candidateId === CANDIDATE && detachedPolicy.requireDistinctKeys === true && detachedPolicy.trustedOrganizationalKeyFingerprints.length === 0 && detachedPolicy.trustedIndependentVerifierKeyFingerprints.length === 0);
const governancePolicy = json("config/pass35/governance-decision-policy.json");
check("governance_decision_no_local_authority", governancePolicy.candidateId === CANDIDATE && governancePolicy.trustedOrganizationalKeyFingerprints.length === 0 && governancePolicy.allowedFlagshipProductCellIds.length === 3 && governancePolicy.requiredOrganizationControlIds.length === 18);
const intakePolicy = json("config/pass35/external-evidence-intake-policy.json");
check("external_intake_metadata_zero_credit", intakePolicy.candidateId === CANDIDATE && intakePolicy.globalExternalEvidenceDenominator === 3074 && intakePolicy.metadataAloneMayIncrementVerifiedDenominator === false && intakePolicy.metadataAloneMayAllowPromotion === false);
const benchmarkPolicy = json("config/pass35/benchmark-review-policy.json");
check("benchmark_review_exact_denominators", benchmarkPolicy.candidateId === CANDIDATE && benchmarkPolicy.benchmark.requiredRows === 2700 && benchmarkPolicy.nativeReview.requiredCases === 300);
const assuranceCustomerPolicy = json("config/pass35/assurance-customer-evidence-policy.json");
check("assurance_customer_exact_denominators", assuranceCustomerPolicy.candidateId === CANDIDATE && assuranceCustomerPolicy.requiredAssuranceReportTypes.length === 4 && assuranceCustomerPolicy.requiredCustomerCohorts === 2 && assuranceCustomerPolicy.metadataAloneMayIncrementVerifiedDenominator === false && assuranceCustomerPolicy.metadataAloneMayAllowPromotion === false);
const dashboard = json("_velmere/pass35/PASS35_READINESS_DASHBOARD.json");
check("readiness_dashboard_honest_no_go", dashboard.globalDecision === "NO_GO" && dashboard.promotionAllowed === false && dashboard.productCellSummary.total === 30 && dashboard.productCellSummary.sellEnabled === 0 && dashboard.externalEvidenceSummary.verified === 0 && dashboard.externalEvidenceSummary.required === 3074);
check("readiness_dashboard_status_register_math", dashboard.currentStatusRegisterPath === "config/pass35/current-status-register.json" && dashboard.roadmapStatusSummary.denominator === 43 && dashboard.roadmapStatusSummary.DONE === 17 && dashboard.roadmapStatusSummary.PARTIAL === 17 && dashboard.roadmapStatusSummary.BLOCKED_EXTERNAL === 9 && dashboard.roadmapStatusSummary.NOT_DONE === 0 && dashboard.roadmapStatusSummary.strictCompletionPercent === 39.5 && dashboard.roadmapStatusSummary.weightedCompletionPercent === 59.3);
check("current_status_precedence_a32", JSON.stringify(currentStatusRegister.statusPrecedence) === JSON.stringify(["this register", "A32 roadmap current-status section", "machine-generated readiness dashboard", "A31 and earlier addenda as historical implementation notes only", "base roadmap as target requirements"]));

const localQualityPolicy = json("config/pass35/local-product-quality-policy.json");
const localPolicyBoundaryText = [
  ...(localQualityPolicy.pass17?.requiredTruthMarkers ?? []),
  ...(localQualityPolicy.pass18?.requiredTruthMarkers ?? []),
  localQualityPolicy.truthBoundary ?? "",
].join(" ");
check("local_product_quality_policy_exact_counts_and_boundaries",
  localQualityPolicy.schemaVersion === "velmere.pass35.local-product-quality-policy.v1"
  && localQualityPolicy.candidateId === CANDIDATE
  && localQualityPolicy.mode === "synthetic_local_quality_only"
  && localQualityPolicy.pass16?.schemaVersion === "velmere.pass16.worldclass-corpus.v1"
  && localQualityPolicy.pass16?.baseCases === 300
  && localQualityPolicy.pass16?.casesPerSurface === 50
  && JSON.stringify(localQualityPolicy.pass16?.requiredSurfaces) === JSON.stringify(["shield", "real_markets", "smart_contract_audit", "lens_pdf"])
  && JSON.stringify(localQualityPolicy.pass16?.requiredTiers) === JSON.stringify(["basic", "pro", "advanced"])
  && JSON.stringify(localQualityPolicy.pass16?.requiredLocales) === JSON.stringify(["pl", "en", "de"])
  && localQualityPolicy.pass17?.schemaVersion === "velmere.pass17.market-adapter-verification.v1"
  && localQualityPolicy.pass17?.fixtures === 100
  && localQualityPolicy.pass17?.matrixRows === 900
  && localQualityPolicy.pass17?.contractPass === 900
  && localQualityPolicy.pass17?.deterministicPass === 900
  && localQualityPolicy.pass17?.lineagePass === 900
  && localQualityPolicy.pass17?.differentiationGroups === 300
  && localQualityPolicy.pass17?.localeChecks === 300
  && localQualityPolicy.pass18?.schemaVersion === "velmere.pass18.audit-lens-adapter-simulation-summary.v1"
  && localQualityPolicy.pass18?.baseCases === 100
  && localQualityPolicy.pass18?.auditCases === 50
  && localQualityPolicy.pass18?.lensCases === 50
  && localQualityPolicy.pass18?.matrixRows === 900
  && localQualityPolicy.pass18?.contractPass === 900
  && localQualityPolicy.pass18?.deterministicPass === 900
  && localQualityPolicy.pass18?.lineagePass === 900
  && localQualityPolicy.pass18?.differentiationGroups === 300
  && localQualityPolicy.pass18?.localeGroups === 300
  && localQualityPolicy.pass18?.advancedAuditBlocked === 150
  && localQualityPolicy.pass18?.canonicalExternalOutputs === 0
  && localQualityPolicy.pass18?.renderedBrowserPdfOutputs === 0
  && localQualityPolicy.releaseBoundary?.globalDecision === "NO_GO"
  && localQualityPolicy.releaseBoundary?.promotionAllowed === false
  && localQualityPolicy.releaseBoundary?.externalVerifiedCredit === 0
  && localQualityPolicy.releaseBoundary?.productCells === 30
  && localQualityPolicy.releaseBoundary?.sellEnabledCells === 0
  && localQualityPolicy.pdfReceipt?.schemaVersion === "velmere.pass35.local-pdf-qa-receipt.v1"
  && localQualityPolicy.pdfReceipt?.mode === "synthetic_offline_renderer_qa"
  && localQualityPolicy.pdfReceipt?.status === "PASS"
  && localQualityPolicy.pdfReceipt?.required === true
  && localQualityPolicy.pdfReceipt?.pdfCount === 150
  && localQualityPolicy.pdfReceipt?.totalPages === 700
  && JSON.stringify(localQualityPolicy.pdfReceipt?.byTier) === JSON.stringify({ Basic: 50, Pro: 50, Advanced: 50 })
  && JSON.stringify(localQualityPolicy.pdfReceipt?.pageCountByTier) === JSON.stringify({ Basic: 2, Pro: 4, Advanced: 8 })
  && JSON.stringify(localQualityPolicy.pdfReceipt?.requiredBoundaries) === JSON.stringify({ synthetic: true, offline: true, notLive: true, notForSale: true, investmentRecommendation: false, productionEntitlementBypassed: false })
  && localQualityPolicy.pdfReceipt?.requiredSourceMode === "missing"
  && localQualityPolicy.pdfReceipt?.requiredSourceConfidence === 0
  && localQualityPolicy.pdfReceipt?.commercialUseAllowed === false
  && localQualityPolicy.pdfReceipt?.bannedDirectionalLanguageAbsent === true
  && localQualityPolicy.pdfReceipt?.syntheticMarkersPresent === true
  && localQualityPolicy.decision?.pass === "PASS_LOCAL_SYNTHETIC_QUALITY_NO_PROMOTION"
  && localQualityPolicy.decision?.fail === "FAIL_CLOSED_LOCAL_PRODUCT_QUALITY"
  && localQualityPolicy.decision?.externalCreditOnPass === 0
  && localQualityPolicy.decision?.promotionAllowedOnPass === false
  && localQualityPolicy.decision?.sellEnabledOnPass === false
  && localPolicyBoundaryText.includes("do not change 0/2700 canonical execution status")
  && localPolicyBoundaryText.includes("Advanced smart-contract outputs remain blocked")
  && localPolicyBoundaryText.includes("not LIVE")
  && localPolicyBoundaryText.includes("investment-advice proof"));

const localPdfCatalog = json("config/pass35/local-pdf-asset-catalog.json");
const localPdfAssets = localPdfCatalog.assets ?? [];
check("local_pdf_asset_catalog_exact_synthetic_no_sale",
  localPdfCatalog.schemaVersion === "velmere.pass35.local-pdf-asset-catalog.v1"
  && localPdfCatalog.seed === "velmere-pass35-local-pdf-qa-v1"
  && localPdfCatalog.mode === "synthetic_offline_renderer_qa"
  && localPdfCatalog.assetCount === 50
  && localPdfAssets.length === 50
  && new Set(localPdfAssets.map((asset) => asset.id)).size === 50
  && new Set(localPdfAssets.map((asset) => asset.symbol)).size === 50
  && new Set(localPdfAssets.map((asset) => asset.name)).size === 50
  && localPdfAssets.every((asset) => typeof asset.id === "string" && asset.id.length > 0
    && typeof asset.symbol === "string" && asset.symbol.length > 0
    && typeof asset.name === "string" && asset.name.length > 0
    && typeof asset.scenario === "string" && asset.scenario.length > 0)
  && JSON.stringify(localPdfCatalog.boundaries) === JSON.stringify({ synthetic: true, offline: true, notLive: true, notForSale: true, commercialUseAllowed: false, investmentRecommendation: false }));

const localQualityReceipt = json("_velmere/pass35/PASS35_LOCAL_PRODUCT_QUALITY_RECEIPT.json");
check("local_product_quality_receipt_exact_pass_no_external_credit",
  localQualityReceipt.schemaVersion === "velmere.pass35.local-product-quality-report.v1"
  && localQualityReceipt.candidateId === CANDIDATE
  && localQualityReceipt.status === "PASS_LOCAL_SYNTHETIC_QUALITY_NO_PROMOTION"
  && localQualityReceipt.ok === true
  && localQualityReceipt.summary?.checks === 82
  && localQualityReceipt.summary?.passed === 82
  && localQualityReceipt.summary?.failed === 0
  && localQualityReceipt.checks?.length === 82
  && localQualityReceipt.checks.every((row) => row.ok === true)
  && localQualityReceipt.failures?.length === 0
  && JSON.stringify(localQualityReceipt.summary?.pass16RequiredSurfaceCases) === JSON.stringify({ shield: 50, real_markets: 50, smart_contract_audit: 50, lens_pdf: 50 })
  && localQualityReceipt.summary?.pass17?.executed === 900
  && localQualityReceipt.summary?.pass17?.contract === 900
  && localQualityReceipt.summary?.pass17?.deterministic === 900
  && localQualityReceipt.summary?.pass17?.lineage === 900
  && localQualityReceipt.summary?.pass18?.executed === 900
  && localQualityReceipt.summary?.pass18?.contract === 900
  && localQualityReceipt.summary?.pass18?.deterministic === 900
  && localQualityReceipt.summary?.pass18?.lineage === 900
  && localQualityReceipt.summary?.pass18?.advancedAuditBlocked === 150
  && localQualityReceipt.summary?.pdf?.count === 150
  && localQualityReceipt.summary?.pdf?.totalPages === 700
  && JSON.stringify(localQualityReceipt.summary?.pdf?.byTier) === JSON.stringify({ Basic: 50, Pro: 50, Advanced: 50 })
  && localQualityReceipt.summary?.externalEvidenceCredit === 0
  && localQualityReceipt.summary?.globalDecision === "NO_GO"
  && localQualityReceipt.summary?.sellEnabledCells === 0
  && JSON.stringify(localQualityReceipt.releaseBoundary) === JSON.stringify({ synthetic: true, localOnly: true, externalEvidenceCredit: 0, promotionAllowed: false, sellEnabled: false, liveClaimed: false, investmentRecommendation: false }));

const localPdfSummary = json(PASS35_LOCAL_PDF_QA_SUMMARY_PATH);
const localPdfSummaryBlockers = validatePass35LocalPdfQaSummary(localPdfSummary);
check("local_pdf_qa_summary_self_bound_no_promotion", localPdfSummaryBlockers.length === 0, {
  manifestProfile,
  blockers: localPdfSummaryBlockers,
  evidenceArchiveRequiredForFullVerification: localPdfSummary.evidenceArchiveRequiredForFullVerification,
});

const localPdfReceiptPath = "artifacts/pass35/local-product-quality/PASS35_LOCAL_PDF_QA_RECEIPT.json";
const localPdfRasterReceiptPath = "artifacts/pass35/local-product-quality/PASS35_LOCAL_PDF_RASTER_QA_RECEIPT.json";
const localPdfReceipt = optionalJson(localPdfReceiptPath);
const localPdfRasterReceipt = optionalJson(localPdfRasterReceiptPath);
check("local_pdf_full_evidence_presence_matches_manifest_profile",
  sourcePackageProfile
    ? localPdfSummary.evidenceArchiveRequiredForFullVerification === true
    : localPdfReceipt !== null && localPdfRasterReceipt !== null,
  { manifestProfile, pdfPresent: localPdfReceipt !== null, rasterPresent: localPdfRasterReceipt !== null, evidenceArchiveRequiredForFullVerification: localPdfSummary.evidenceArchiveRequiredForFullVerification });

if (localPdfReceipt && localPdfRasterReceipt) {
  const localPdfRows = localPdfReceipt.pdfs ?? [];
  check("local_pdf_qa_receipt_exact_150_700_min_3359",
    localPdfReceipt.schemaVersion === "velmere.pass35.local-pdf-qa-receipt.v1"
    && localPdfReceipt.mode === "synthetic_offline_renderer_qa"
    && localPdfReceipt.status === "PASS"
    && Number.isInteger(localPdfReceipt.assertions?.total)
    && localPdfReceipt.assertions.total >= 3359
    && localPdfReceipt.assertions?.passed === localPdfReceipt.assertions.total
    && localPdfReceipt.assertions?.failed === 0
    && localPdfReceipt.failures?.length === 0
    && localPdfReceipt.totals?.pdfCount === 150
    && localPdfReceipt.totals?.totalPages === 700
    && JSON.stringify(localPdfReceipt.totals?.byTier) === JSON.stringify({ Basic: 50, Pro: 50, Advanced: 50 })
    && JSON.stringify(localPdfReceipt.boundaries) === JSON.stringify({ synthetic: true, offline: true, notLive: true, notForSale: true, investmentRecommendation: false, productionEntitlementBypassed: false })
    && localPdfRows.length === 150
    && localPdfRows.reduce((sum, row) => sum + row.pageCount, 0) === 700
    && localPdfRows.reduce((sum, row) => sum + row.a4PageCount, 0) === 700
    && ["Basic", "Pro", "Advanced"].every((tier) => localPdfRows.filter((row) => row.tier === tier).length === 50)
    && localPdfRows.every((row) => row.status === "PASS"
      && row.syntheticMarkersPresent === true
      && row.bannedDirectionalLanguageAbsent === true
      && row.sourceMode === "missing"
      && row.sourceConfidence === 0
      && row.commercialUseAllowed === false));

  const localPdfRasterDocuments = localPdfRasterReceipt.documents ?? [];
  const localPdfRasterPages = localPdfRasterDocuments.flatMap((document) => document.pages ?? []);
  check("local_pdf_raster_receipt_exact_150_700_no_blank_or_edge",
    localPdfRasterReceipt.schemaVersion === "velmere.pass35.local-pdf-raster-qa.v1"
    && localPdfRasterReceipt.candidateId === CANDIDATE
    && localPdfRasterReceipt.status === "PASS"
    && localPdfRasterReceipt.environment === "LOCAL_SYNTHETIC_QA_NOT_LIVE_NOT_FOR_SALE"
    && localPdfRasterReceipt.pdfCount === 150
    && localPdfRasterReceipt.renderedPageCount === 700
    && localPdfRasterReceipt.expectedPageCount === 700
    && localPdfRasterReceipt.blankPages === 0
    && localPdfRasterReceipt.pagesTouchingRasterEdge === 0
    && localPdfRasterDocuments.length === 150
    && localPdfRasterPages.length === 700
    && localPdfRasterPages.every((page) => page.blank === false && page.touchesRasterEdge === false)
    && localPdfRasterReceipt.contactSheets?.length === 3
    && localPdfRasterReceipt.contactSheets.every((sheet) => sheet.documentCount === 50
      && existsSync(path.join(root, sheet.file))
      && sha256(readFileSync(path.join(root, sheet.file))) === sheet.sha256));
} else {
  check("local_pdf_full_evidence_delegated_to_detached_evidence_archive", sourcePackageProfile
    && localPdfSummary.evidenceArchiveRequiredForFullVerification === true
    && localPdfSummary.sourceReceipts?.pdf?.path === localPdfReceiptPath
    && localPdfSummary.sourceReceipts?.raster?.path === localPdfRasterReceiptPath, {
      manifestProfile,
      summarySha256: localPdfSummary.summarySha256,
      fullEvidencePresent: false,
      noExternalCreditGranted: true,
    });
}

const lensTierPageCountSource = read("lib/market-integrity/lens-tier-page-count.ts");
const lensTierPageCountTestSource = read("scripts/pass35/test-lens-tier-page-count.ts");
check("lens_tier_page_count_single_contract_and_test_source",
  /basic:\s*2,/u.test(lensTierPageCountSource)
  && /pro:\s*4,/u.test(lensTierPageCountSource)
  && /advanced:\s*8,/u.test(lensTierPageCountSource)
  && /unsupported_lens_tier_depth/u.test(lensTierPageCountSource)
  && /\["basic",\s*2\]/u.test(lensTierPageCountTestSource)
  && /\["pro",\s*4\]/u.test(lensTierPageCountTestSource)
  && /\["advanced",\s*8\]/u.test(lensTierPageCountTestSource)
  && /assert\.throws\(/u.test(lensTierPageCountTestSource)
  && /lens tier page-count contract: 2\/4\/8 PASS/u.test(lensTierPageCountTestSource));

const rootRoadmaps = readdirSync(root).filter((name) => /roadmap/i.test(name) && statSync(path.join(root, name)).isFile());
check("single_root_roadmap", rootRoadmaps.length === 1 && rootRoadmaps[0] === "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", rootRoadmaps);
const allowedCurrentAuthorityFiles = new Set([current.currentStatusBoardPath, current.currentStatusSummaryPath]);
const currentNamedHistory = walk(path.join(root, "artifacts/release"), "artifacts/release")
  .filter((file) => !file.includes("/history/") && /CURRENT/u.test(file) && !allowedCurrentAuthorityFiles.has(file));
check("no_unapproved_current_named_release_history", currentNamedHistory.length === 0, currentNamedHistory);
const activeFixtureMarkers = walk(path.join(root, "artifacts"), "artifacts")
  .filter((file) => file.endsWith(".json") && !file.includes("/release/history/"))
  .filter((file) => /PASS_FIXTURE|a{64}/u.test(read(file)));
check("no_active_fixture_receipts", activeFixtureMarkers.length === 0, activeFixtureMarkers);
const quarantineNotice = "artifacts/release/history/quarantined-fixture-receipts-pass34/QUARANTINE_NOTICE.md";
const quarantineNoticePresent = existsSync(path.join(root, quarantineNotice));
check("fixture_history_quarantined_or_split_out_of_source", quarantineNoticePresent || activeFixtureMarkers.length === 0, {
  manifestProfile,
  quarantineNoticePresent,
  activeFixtureMarkers: activeFixtureMarkers.length,
  boundary: quarantineNoticePresent
    ? "historical_quarantine_notice_present"
    : "history_not_bundled_and_no_active_fixture_receipts_detected",
});
const auditUiSource = read("components/security/SecurityAuditsCleanPage.tsx");
check("audit_paid_ui_truthful_no_sale_copy",
  auditUiSource.includes('useState<TierId>("basic")')
  && auditUiSource.includes('data-sale-state={unavailable ? "unavailable-not-for-sale" : "available"}')
  && auditUiSource.includes('data-pass35-paid-tier-state="unavailable-not-for-sale"')
  && auditUiSource.includes('Automated Security Evidence Review')
  && auditUiSource.includes('Płatne warianty nie są obecnie sprzedawane.')
  && auditUiSource.includes('Paid tiers are not currently sold.')
  && auditUiSource.includes('Bezahlte Tiers werden derzeit nicht verkauft.')
  && !auditUiSource.includes('recommended: true')
  && !auditUiSource.includes('Most selected')
  && !auditUiSource.includes('Najczęściej wybierany')
  && !auditUiSource.includes('Am häufigsten gewählt'));
check("audit_paid_ui_prices_explicitly_planned",
  auditUiSource.includes('plannedPrice: "Planowana cena"')
  && auditUiSource.includes('plannedPrice: "Planned price"')
  && auditUiSource.includes('plannedPrice: "Geplanter Preis"')
  && auditUiSource.includes('{unavailable ? <small>{t.plannedPrice}</small> : null}'));

const legacyLiveTruthSource = read("lib/market-integrity/legacy-route-publication-truth.ts");
const quoteLiveTruthSource = read("components/market-integrity/live-truth.ts");
check("canonical_sha256_prefix_live_gate_compatibility",
  legacyLiveTruthSource.includes('isSha256Digest(delivery.sourceReceiptRoot)')
  && legacyLiveTruthSource.includes('isSha256Digest(delivery.receiptDigest)')
  && quoteLiveTruthSource.includes('isSha256Digest(receiptRoot)')
  && quoteLiveTruthSource.includes('isSha256Digest(receiptDigest)')
  && read("lib/security/cryptographic-digest.ts").includes('export function isSha256Digest'));

const riskSource = read("lib/server/market-integrity-route-modules/risk-calibration.ts");
check("risk_probability_truth_boundary", riskSource.includes("deterministic_evidence_ranking_not_empirical_probability"));

const failed = checks.filter((row) => !row.ok);
const receiptCore = {
  schemaVersion: "velmere.pass35.control-plane-verification.v1",
  candidateId: CANDIDATE,
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? "PASS_STATIC_CONTROLS" : "FAIL_STATIC_CONTROLS",
  environment: "LOCAL_OFFLINE_CONTROL_VERIFICATION",
  manifestProfile,
  promotionAllowed: false,
  checkCount: checks.length,
  passedCount: checks.length - failed.length,
  failedCount: failed.length,
  checks,
  truthBoundary: "Static control-plane verification only. It is not legal approval, provider rights, staging, live, independent assurance, customer outcome, benchmark, or market proof."
};
const receipt = writeControlPlaneReceipt(receiptCore);
console.log(JSON.stringify({ status: receipt.status, checkCount: checks.length, passed: receipt.passedCount, failed }, null, 2));
if (failed.length) process.exit(1);
