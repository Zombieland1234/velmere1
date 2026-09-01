#!/usr/bin/env node
import fs from "node:fs";
import { A84_REVISION, evaluateA84RealIntake, runA84FixtureHarness, verifyA84Runtime } from "../../lib/worldclass/pass36-a84-shield-full-catalog-tier-matrix-runtime.ts";

const policy = JSON.parse(fs.readFileSync("config/pass36/a84-shield-full-catalog-tier-matrix-policy.json", "utf8"));
const receipt = JSON.parse(fs.readFileSync("config/pass36/a84-test-receipt.json", "utf8"));
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });
const runtime = await runA84FixtureHarness(process.cwd(), policy);
const real = evaluateA84RealIntake(JSON.parse(fs.readFileSync(policy.realIntakeIndex.path, "utf8")), policy);

check("receipt:schema", receipt.schemaVersion === "velmere.pass36.a84.shield-full-catalog-tier-matrix-test-receipt.v1", receipt.schemaVersion);
check("receipt:revision", receipt.revisionId === A84_REVISION, receipt.revisionId);
check("receipt:status", receipt.status === "PASS_A84_LOCAL_INJECTED_FULL_CATALOG_MATRIX_ONLY", receipt.status);
check("receipt:checks", receipt.summary?.failed === 0 && receipt.summary?.checks >= 30, receipt.summary);
check("runtime:verified", verifyA84Runtime(runtime, policy, receipt.runtimeIntegritySha256), runtime.denominators);
check("runtime:receipt-digest", runtime.integrity.digest === receipt.runtimeIntegritySha256, { observed: runtime.integrity.digest, declared: receipt.runtimeIntegritySha256 });
check("runtime:catalog", runtime.catalog.activeAssets === 318 && runtime.catalog.activeListings === 1013, runtime.catalog);
check("runtime:observations", runtime.denominators.observationRows === 7091 && runtime.denominators.observationRows === runtime.denominators.observationTargets, runtime.denominators);
check("runtime:packets", runtime.denominators.tierPackets === 954 && runtime.denominators.popupRows === 3816, runtime.denominators);
check("runtime:mutations", runtime.denominators.semanticMutations === 11448 && runtime.denominators.mutationKilled === 11448, runtime.denominators);
check("runtime:invariants", Object.values(runtime.invariants).every((value) => value === 0), runtime.invariants);
check("runtime:state-counts", JSON.stringify(runtime.stateCounts) === JSON.stringify(receipt.stateCounts), { runtime: runtime.stateCounts, receipt: receipt.stateCounts });
check("runtime:readiness", JSON.stringify(runtime.readiness) === JSON.stringify(receipt.readiness), { runtime: runtime.readiness, receipt: receipt.readiness });
check("runtime:no-credit", runtime.realFullCatalogSnapshotsVerified === 0 && runtime.rightsApprovedAssets === 0 && runtime.currentPublicNetworkExecuted === false && runtime.productionBrowserExecuted === false && runtime.customerValueProven === false && runtime.paidGateEligible === false && runtime.liveProven === false && runtime.saleEnabled === false, null);
check("real:blocked", real.decision === "BLOCKED_CURRENT_FULL_CATALOG_EVIDENCE", real);
check("real:receipt", JSON.stringify(real) === JSON.stringify(receipt.realIntake), { real, receipt: receipt.realIntake });
check("policy:gaps", policy.closedByA84.length === 37, policy.closedByA84.length);
check("policy:truth", typeof policy.truthBoundary === "string" && policy.truthBoundary.includes("does not prove current public-network"), policy.truthBoundary);

const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a84.shield-full-catalog-tier-matrix-verification.v1",
  revisionId: A84_REVISION,
  status: failed.length ? "FAIL_A84_SHIELD_FULL_CATALOG_VERIFICATION" : "PASS_A84_LOCAL_SHIELD_FULL_CATALOG_VERIFICATION_NO_PROMOTION",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  fixtureDenominators: runtime.denominators,
  readiness: runtime.readiness,
  realIntake: real,
  exactA80CandidateBound: false,
  currentPublicNetworkExecuted: false,
  rightsApprovedAssets: 0,
  productionBrowserExecuted: false,
  customerValueProven: false,
  liveProven: false,
  saleEnabled: false,
  truthBoundary: policy.truthBoundary,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
