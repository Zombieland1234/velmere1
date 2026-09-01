#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const segmentId = String(process.env.A26_SEGMENT_ID ?? "").trim();
const LOG_PATH = segmentId ? `artifacts/pass35/PASS35_A26_NONDESTRUCTIVE_REGRESSION_SEGMENT_${segmentId}.log` : "artifacts/pass35/PASS35_A26_NONDESTRUCTIVE_REGRESSION.log";
const RECEIPT_PATH = segmentId ? `artifacts/pass35/PASS35_A26_NONDESTRUCTIVE_REGRESSION_SEGMENT_${segmentId}_RECEIPT.json` : "artifacts/pass35/PASS35_A26_NONDESTRUCTIVE_REGRESSION_RECEIPT.json";
const loader = ["--import", "./scripts/pass11/register-offline-ts-loader.mjs"];
const node = (id, file, extra = []) => ({ id, command: process.execPath, args: [...extra, file] });
const nodeLoader = (id, file) => ({ id, command: process.execPath, args: [...loader, file] });
const cases = [
  nodeLoader("product_cell_readiness", "scripts/pass35/test-product-cell-readiness.mjs"),
  node("flagship_candidate", "scripts/pass35/verify-flagship-candidate.mjs"),
  node("audit_execution_envelope", "scripts/pass35/test-audit-execution-envelope.mjs"),
  node("audit_a01_a05_engine", "scripts/pass35/test-audit-a01-a05-engine.ts", ["--experimental-strip-types"]),
  node("audit_a01_a05_boundaries", "scripts/pass35/test-audit-a01-a05-runner-boundaries.mjs"),
  nodeLoader("sha256_digest_compatibility", "scripts/pass35/test-sha256-digest-compatibility.ts"),
  nodeLoader("paid_ui_stop_sell", "scripts/pass35/test-paid-ui-stop-sell.mjs"),
  nodeLoader("canonical_packet", "scripts/pass35/test-canonical-packet.ts"),
  node("offline_ts_loader", "scripts/pass35/test-offline-ts-loader-fallback.mjs"),
  node("sensitive_helper_output", "scripts/test-sensitive-helper-output-contract.mjs"),
  node("security_helper_paths", "scripts/test-security-helper-path-boundaries.mjs"),
  node("transient_inventory", "scripts/pass35/test-transient-inventory-exclusion.mjs"),
  node("release_manifest_set", "scripts/pass35/test-release-manifest-set.mjs"),
  node("source_lifecycle_classifier", "scripts/pass35/test-source-lifecycle-classifier.mjs"),
  node("external_proof_register", "scripts/pass35/test-external-proof-register.mjs"),
  node("detached_package_verifier", "scripts/pass35/test-detached-package-verifier.mjs", ["--test"]),
  node("governance_decision", "scripts/pass35/test-governance-decision-verifier.mjs"),
  node("external_evidence_intake", "scripts/pass35/test-external-evidence-intake.mjs"),
  node("benchmark_review", "scripts/pass35/test-benchmark-review-evidence.mjs"),
  node("assurance_customer", "scripts/pass35/test-assurance-customer-evidence.mjs"),
  node("common_implementation_digest", "scripts/pass35/test-common-implementation-digest.mjs"),
  nodeLoader("lens_tier_page_count", "scripts/pass35/test-lens-tier-page-count.ts"),
  node("a17_evidence_family_registry", "scripts/pass35/test-a17-evidence-family-registry.mjs"),
  node("local_product_quality", "scripts/pass35/test-local-product-quality.mjs"),
  node("a4_solc", "scripts/pass35/test-audit-a4-solc-reproduction.ts", ["--experimental-strip-types"]),
  node("a4_chain_provider", "scripts/pass35/test-audit-a4-chain-provider.ts", ["--experimental-strip-types"]),
  node("a4_slither", "scripts/pass35/test-audit-a4-slither-adapter.mjs"),
  node("a5_semgrep", "scripts/pass35/test-audit-a5-semgrep-adapter.mjs"),
  node("a5_a06_path", "scripts/pass35/test-audit-a5-a06-bounded-path.ts", ["--experimental-strip-types"]),
  node("a6_forge", "scripts/pass35/test-audit-a6-forge-adapter.mjs"),
  node("a6_fuzz", "scripts/pass35/test-audit-a6-a08-model-fuzz.ts", ["--experimental-strip-types"]),
  node("a6_boundaries", "scripts/pass35/test-audit-a6-runner-boundaries.mjs"),
  node("a7_fork_replay", "scripts/pass35/test-audit-a7-fork-replay-adapter.mjs"),
  node("a7_foundry_plan", "scripts/pass35/test-audit-a7-a08-foundry-plan.mjs"),
  node("a7_boundaries", "scripts/pass35/test-audit-a7-runner-boundaries.mjs"),
  node("a8_economic", "scripts/pass35/test-audit-a8-economic-adversarial.mjs"),
  node("a8_retest", "scripts/pass35/test-audit-a8-remediation-retest.mjs"),
  node("a8_monitoring", "scripts/pass35/test-audit-a8-monitoring-handoff.mjs"),
  node("product_tier_contract", "scripts/pass35/test-product-tier-content-contract.mjs"),
  node("zero_budget_roadmap", "scripts/pass35/test-zero-budget-functional-roadmap.mjs"),
  node("visual_freeze", "scripts/pass35/test-a9-visual-freeze.mjs"),
  node("market_runtime_coverage", "scripts/pass35/test-market-runtime-coverage-contract.mjs"),
  node("market_impact_whale_contract", "scripts/pass35/test-market-impact-whale-tier-contract.mjs"),
  nodeLoader("market_impact_whale_runtime", "scripts/pass35/test-market-impact-whale-runtime.ts"),
  node("a12_provider_catalog", "scripts/pass35/test-a12-public-provider-catalog-runtime.mjs"),
  nodeLoader("a12_whale_runtime", "scripts/pass35/test-a12-public-whale-runtime.mjs"),
  node("a13_fx", "scripts/pass35/test-a13-public-fx-runtime.mjs"),
  node("a13_scheduler", "scripts/pass35/test-a13-market-target-scheduler.mjs"),
  node("a13_whale_denominator", "scripts/pass35/test-a13-whale-token-denominator.mjs"),
  node("a14_execution_ledger", "scripts/pass35/test-a14-full-catalog-execution-ledger.mjs"),
  node("a14_securities_catalog", "scripts/pass35/test-a14-public-securities-catalog-runtime.mjs"),
  node("a14_whale_bindings", "scripts/pass35/test-a14-whale-binding-resolver.mjs"),
  nodeLoader("a14_market_impact_denominator", "scripts/pass35/test-a14-market-impact-full-denominator.mjs"),
  node("a15_snapshot_bundle", "scripts/pass35/test-a15-snapshot-evidence-bundle.mjs"),
  node("a15_securities", "scripts/pass35/test-a15-public-securities-quote-history.mjs"),
  node("a15_corporate_actions", "scripts/pass35/test-a15-corporate-actions-calendar.mjs"),
  node("a15_real_markets", "scripts/pass35/test-a15-real-markets-tier-runtime.mjs"),
  node("a15_order_book", "scripts/pass35/test-a15-order-book-import-replay.mjs"),
  node("a15_whale_bundle", "scripts/pass35/test-a15-whale-evidence-bundle.mjs"),
  node("a15_ledger_bridge", "scripts/pass35/test-a15-ledger-denominator-bridge.mjs"),
  nodeLoader("a16_parity", "scripts/pass35/test-a16-canonical-channel-parity.ts"),
  node("a16_portfolio", "scripts/pass35/test-a16-cross-asset-portfolio.mjs"),
  node("a16_regime_stress", "scripts/pass35/test-a16-regime-stress.mjs"),
  node("a16_risk", "scripts/pass35/test-a16-risk-prospective.mjs"),
  nodeLoader("a17_evidence_decision", "scripts/pass35/test-a17-evidence-quality-decision.ts"),
  node("a17_risk_calibration", "scripts/pass35/test-a17-risk-calibration-evaluation.mjs"),
  node("a17_pdf_structure", "scripts/pass35/verify-a17-packet-pdf-package-boundary.mjs"),
  node("a17_pdf_raster_receipt", "scripts/pass35/verify-a17-packet-pdf-raster-package-boundary.mjs"),
    node("a18_tier_value", "scripts/pass35/test-a18-tier-value-benchmark.mjs"),
  node("a19_exact_runtime_bootstrap", "scripts/pass35/test-a19-exact-runtime-bootstrap.mjs"),
  node("a19_audit_static_benchmark", "scripts/pass35/test-a19-audit-static-benchmark.mjs"),
  node("a20_case_bound_dependency", "scripts/pass35/test-a20-case-bound-dependency.mjs"),
  node("a21_abstract_path", "scripts/pass35/test-a21-abstract-path.mjs"),
  node("a21_control_plane", "scripts/pass35/test-a21-control-plane.mjs"),
  node("a22_severity_triage", "scripts/pass35/test-a22-severity-triage.mjs"),
  node("a22_control_plane", "scripts/pass35/test-a22-control-plane.mjs"),
  node("a23_remediation_closure", "scripts/pass35/test-a23-remediation-closure.mjs"),
  node("a23_control_plane", "scripts/pass35/test-a23-control-plane.mjs"),
  node("a24_monitoring_lifecycle", "scripts/pass35/test-a24-monitoring-lifecycle.mjs"),
  node("a24_control_plane", "scripts/pass35/test-a24-control-plane.mjs"),
  node("a25_exact_test_evidence", "scripts/pass35/test-a25-exact-test-evidence.mjs"),
  node("a25_control_plane", "scripts/pass35/test-a25-control-plane.mjs"),
  node("a26_fuzz_invariant_evidence", "scripts/pass35/test-a26-fuzz-invariant-evidence.mjs"),
  node("a26_control_plane", "scripts/pass35/test-a26-control-plane.mjs"),
  node("a5_control_plane_a21", "scripts/pass35/test-audit-a5-control-plane.mjs"),
  node("current_status", "scripts/pass35/test-current-status-register.mjs"),
];

const startIndex = Number.parseInt(process.env.A26_START_INDEX ?? "0", 10);
const endIndex = Number.parseInt(process.env.A26_END_INDEX ?? String(cases.length), 10);
if (!Number.isSafeInteger(startIndex) || !Number.isSafeInteger(endIndex) || startIndex < 0 || endIndex > cases.length || startIndex >= endIndex) throw new Error(`a26_segment_range_invalid:${startIndex}:${endIndex}:${cases.length}`);
const selectedCases = cases.slice(startIndex, endIndex);
mkdirSync("artifacts/pass35", { recursive: true });
const startedAt = new Date().toISOString();
const logs = [];
const results = [];
let failed = false;
for (const testCase of selectedCases) {
  const start = Date.now();
  console.log(`[A26 regression] ${testCase.id}`);
  const caseOutputPath = `artifacts/pass35/.a26-regression-${testCase.id}.tmp.log`;
  const outputFd = openSync(caseOutputPath, "w");
  const result = spawnSync("timeout", ["--signal=TERM", "--kill-after=5s", "90s", testCase.command, ...testCase.args], {
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: "0", A26_REGRESSION_BOOTSTRAP: "1" },
    stdio: ["ignore", outputFd, outputFd],
  });
  closeSync(outputFd);
  const caseOutput = readFileSync(caseOutputPath, "utf8");
  unlinkSync(caseOutputPath);
  const durationMs = Date.now() - start;
  const status = result.status === 0 ? "PASS" : result.status === 124 || result.status === 137 ? "TIMEOUT" : "FAIL";
  results.push({ id: testCase.id, status, exitCode: result.status, signal: result.signal, durationMs });
  logs.push(`===== ${testCase.id} | ${status} | ${durationMs} ms =====\n$ ${testCase.command} ${testCase.args.join(" ")}\n${caseOutput}\n`);
  writeFileSync(LOG_PATH, logs.join("\n"));
  if (status !== "PASS") { failed = true; break; }
}
const logText = logs.join("\n");
writeFileSync(LOG_PATH, logText);
const receiptCore = {
  schemaVersion: "velmere.pass35.a26-nondestructive-regression-receipt.v1",
  startedAt,
  completedAt: new Date().toISOString(),
  status: failed ? "FAIL" : "PASS",
  exactRuntimeClaimed: false,
  observedRuntime: { node: process.version, npm: "10.9.2-observed-outside-runner" },
  requiredRuntime: { node: "24.18.0", npm: "11.16.0" },
  totalSuiteCount: cases.length,
  segmentId: segmentId || null,
  startIndex,
  endIndexExclusive: endIndex,
  testCountPlanned: selectedCases.length,
  testCountExecuted: results.length,
  passed: results.filter((row) => row.status === "PASS").length,
  failed: results.filter((row) => row.status !== "PASS").length,
  results,
  logPath: LOG_PATH,
  logSha256: `sha256:${createHash("sha256").update(logText).digest("hex")}`,
  truthBoundary: "This runner executes non-mutating current-source runtime, security, market, PDF and A4-A26 regression tests. It does not grant exact Node/npm, staging, LIVE, customer, legal, provider-rights or independent-assurance credit.",
};
const receipt = { ...receiptCore, receiptSha256: `sha256:${createHash("sha256").update(JSON.stringify(receiptCore)).digest("hex")}` };
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, testCountPlanned: receipt.testCountPlanned, testCountExecuted: receipt.testCountExecuted, passed: receipt.passed, failed: receipt.failed, logPath: LOG_PATH, receiptPath: RECEIPT_PATH, firstFailure: results.find((row) => row.status !== "PASS") ?? null }, null, 2));
if (failed) process.exitCode = 1;
