#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = process.cwd();
const REV = "VELMERE_PASS36_A86R0_REAL_MARKETS_CROSS_ASSET_FULL_MATRIX_AND_DATA_RIGHTS_TRUTH_LEDGER";
if (!fs.existsSync(path.join(root, "_velmere/PASS35_SOURCE_ONLY_MANIFEST.json"))) throw new Error("a86_clean_unpack_package_manifest_required");
const commands = [
  { id: "a58_release_integrity_first", args: ["scripts/pass36/verify-a58-release-integrity.mjs"], parseA58: true },
  { id: "a58_contract", args: ["scripts/pass36/test-a58-release-integrity.mjs"] },
  { id: "source_package_self_audit", args: ["scripts/pass35/test-source-package-self-verification.mjs"] },
  { id: "a86_descendant", args: ["scripts/pass36/verify-a86-current-root-descendant.mjs"] },
  { id: "a86_matrix", args: ["--experimental-strip-types", "scripts/pass36/verify-a86-real-markets-cross-asset-matrix.ts"] },
  { id: "a85_descendant", args: ["scripts/pass36/verify-a85-current-root-descendant.mjs"] },
  { id: "a85_matrix", args: ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/verify-a85-shield-pro-map-full-depth-matrix.ts"] },
  { id: "a84_descendant", args: ["scripts/pass36/verify-a84-current-root-descendant.mjs"] },
  { id: "a84_matrix", args: ["--experimental-strip-types", "scripts/pass36/verify-a84-shield-full-catalog-tier-matrix.ts"] },
  { id: "a83_descendant", args: ["scripts/pass36/verify-a83-current-root-descendant.mjs"] },
  { id: "a83_matrix", args: ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/verify-a83-browser-lens-pdf-real-packet-matrix.ts"] },
  { id: "a82_descendant", args: ["scripts/pass36/verify-a82-current-root-descendant.mjs"] },
  { id: "a82_matrix", args: ["scripts/pass36/verify-a82-audit-real-contract-matrix.mjs"] },
  { id: "a81_descendant", args: ["scripts/pass36/verify-a81-current-root-descendant.mjs"] },
  { id: "a81_matrix", args: ["--experimental-strip-types", "scripts/pass36/verify-a81-canonical-mega-matrix-orchestrator.ts"] },
  { id: "a80_descendant", args: ["scripts/pass36/verify-a80-current-root-descendant.mjs"] },
  { id: "a80_admission", args: ["scripts/pass36/verify-a80-frozen-local-release-candidate-admission.mjs"] },
  { id: "a79_descendant", args: ["scripts/pass36/verify-a79-current-root-descendant.mjs"] },
  { id: "a79_admission", args: ["scripts/pass36/verify-a79-exact-final-byte-build-browser-evidence-binding.mjs"] },
  { id: "a78_descendant", args: ["scripts/pass36/verify-a78-current-root-descendant.mjs"] },
  { id: "a78_bootstrap", args: ["scripts/pass36/verify-a78-exact-runtime-lockfile-browser-bootstrap.mjs"] },
  { id: "a77_clean_root", args: ["scripts/pass36/verify-a77-clean-root-migration.mjs"] },
  { id: "a77_legacy", args: ["scripts/pass36/verify-a77-legacy-lineage-isolation.mjs"] },
  { id: "a37_performance_runtime", args: ["--experimental-strip-types", "scripts/pass35/test-a37-visual-runtime-performance.mjs"] },
  { id: "a38_lifecycle_payload", args: ["--expose-gc", "--experimental-strip-types", "scripts/pass35/test-a38-client-runtime-lifecycle.mjs"] },
  { id: "a39_runtime_css_a11y", args: ["--experimental-strip-types", "scripts/pass35/test-a39-runtime-binding-css.mjs"] },
  { id: "a40_session_temporal_visibility", args: ["--experimental-strip-types", "scripts/pass35/test-a40-session-temporal-visibility.mjs"] },
  { id: "a41_route_runtime_recovery", args: ["scripts/pass35/test-a41-browser-shield-runtime-recovery.mjs"] },
  { id: "a59_build_route_css_budgets", args: ["scripts/pass36/verify-a59-build-graph-route-css-budget-recovery.mjs"] },
  { id: "a46_data_plane", args: ["scripts/pass35/test-a46-customer-data-plane-acceptance.mjs"] },
  { id: "a57_acceptance", args: ["scripts/pass35/test-a57-controlled-canary-kill-switch-rollback-telemetry-acceptance.mjs"] },
  { id: "route_dispatch", args: ["scripts/pass15/verify-route-dispatch-consolidation.mjs"] },
  { id: "current_status", args: ["scripts/pass35/test-current-status-register.mjs"] },
  { id: "static_control_plane", args: ["scripts/pass35/verify-control-plane.mjs"] },
  { id: "product_tiers", args: ["scripts/pass35/test-product-tier-content-contract.mjs"] },
  { id: "zero_budget", args: ["scripts/pass35/test-zero-budget-functional-roadmap.mjs"] },
  { id: "source_audit", args: ["scripts/a44-source-integrity-audit.mjs"] },
];
const results = [];
for (const command of commands) {
  const run = spawnSync(process.execPath, command.args, { cwd: root, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, timeout: 300000, env: { ...process.env, TERM: process.env.TERM || "xterm-256color", VELMERE_A86_CLEAN_UNPACK_SEQUENCE: "1" } });
  let parsed = null;
  try { parsed = JSON.parse(run.stdout); } catch (ignoredError) { void ignoredError; }
  let passed = run.status === 0 && !run.signal && !run.error;
  if (command.parseA58) passed = passed && parsed?.status === "PASS_RELEASE_INTEGRITY_NO_PROMOTION" && parsed?.summary?.blockingFailed === 0 && parsed?.historicalArtifactRecoveryComplete === false;
  results.push({ id: command.id, passed, exitCode: run.status, signal: run.signal, timedOut: run.error?.code === "ETIMEDOUT", stdoutBytes: Buffer.byteLength(run.stdout ?? ""), stderrBytes: Buffer.byteLength(run.stderr ?? ""), status: parsed?.status ?? null, failureTail: passed ? null : `${run.stderr ?? ""}\n${run.stdout ?? ""}`.slice(-5000) });
  if (!passed) break;
}
const failures = results.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a86.clean-unpack-sequence.v1",
  revisionId: REV,
  status: failures.length ? "FAIL_A86_CLEAN_UNPACK_SEQUENCE" : "PASS_A86_CLEAN_UNPACK_SEQUENCE_NO_PROMOTION",
  requiredOrder: ["A58_EXACT_PATH_SET_BEFORE_ANY_RECEIPT_GENERATING_TEST", "A86_AND_RETAINED_REGRESSIONS_AFTER_A58"],
  checks: results.length,
  passed: results.length - failures.length,
  failed: failures.length,
  results,
  historicalArtifactsRecovered: false,
  exactBuildBrowserExecuted: false,
  realEvidenceRowsVerified: 0,
  currentProviderEvidenceRows: 0,
  rightsApprovedRows: 0,
  productionBrowserRows: 0,
  customerValueLabeledRows: 0,
  legalRegulatoryDecisionsSigned: 0,
  legalRegulatoryDecisionDenominator: 20,
  stagingProven: false,
  liveProven: false,
  saleEnabled: false,
  truthBoundary: "This sequence verifies an unpacked SOURCE_ONLY package in safe order. A58 runs first. It does not execute current cross-asset providers, provider rights, production browsers, customers, exact A80, staging, LIVE or sale.",
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
