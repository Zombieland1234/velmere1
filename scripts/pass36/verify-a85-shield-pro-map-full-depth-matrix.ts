#!/usr/bin/env node
import fs from "node:fs";
import {
  A85_REVISION,
  evaluateA85RealIntake,
  runA85FixtureHarness,
  verifyA85Runtime,
} from "../../lib/worldclass/pass36-a85-shield-pro-map-full-depth-runtime.ts";
const policy = JSON.parse(fs.readFileSync("config/pass36/a85-shield-pro-map-full-depth-policy.json", "utf8"));
const receipt = JSON.parse(fs.readFileSync("config/pass36/a85-test-receipt.json", "utf8"));
const runtime = await runA85FixtureHarness(process.cwd(), policy);
const real = evaluateA85RealIntake(JSON.parse(fs.readFileSync(policy.realIntakeIndex.path, "utf8")));
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });
check("receipt:schema", receipt.schemaVersion === "velmere.pass36.a85.shield-pro-map-full-depth-test-receipt.v1", receipt.schemaVersion);
check("receipt:revision", receipt.revisionId === A85_REVISION, receipt.revisionId);
check("receipt:status", receipt.status === "PASS_A85_LOCAL_FULL_DEPTH_MATRIX_NO_PROMOTION", receipt.status);
check("receipt:checks", receipt.summary?.failed === 0 && receipt.summary?.checks >= 30, receipt.summary);
check("runtime:verified", verifyA85Runtime(runtime, policy, receipt.runtimeIntegritySha256), runtime.denominators);
check("runtime:digest", runtime.integrity.digest === receipt.runtimeIntegritySha256, null);
check("runtime:denominators", runtime.denominators.activeAssets === 318 && runtime.denominators.tierPackets === 954 && runtime.denominators.surfaceProjections === 1908 && runtime.denominators.semanticMutations === 15264 && runtime.denominators.mutationKilled === 15264, runtime.denominators);
check("runtime:pagination", JSON.stringify(runtime.pagination) === JSON.stringify(receipt.pagination), { runtime: runtime.pagination, receipt: receipt.pagination });
check("runtime:bindings", JSON.stringify(runtime.bindingCounts) === JSON.stringify(receipt.bindingCounts), null);
check("runtime:labels", JSON.stringify(runtime.labelCounts) === JSON.stringify(receipt.labelCounts), null);
check("runtime:depth", JSON.stringify(runtime.depthCounts) === JSON.stringify(receipt.depthCounts), null);
check("runtime:readiness", JSON.stringify(runtime.readiness) === JSON.stringify(receipt.readiness), null);
check("runtime:identity", runtime.identityBoundary.failed === 0 && JSON.stringify(runtime.identityBoundary) === JSON.stringify(receipt.identityBoundary), runtime.identityBoundary);
check("runtime:invariants", Object.values(runtime.invariants).every((value) => value === 0), runtime.invariants);
check("runtime:no-credit", runtime.realFullDepthCasesVerified === 0 && runtime.rightsApprovedAssets === 0 && runtime.productionBrowserAssets === 0 && runtime.realEntitlementsVerified === 0 && runtime.customerValueLabeledAssets === 0 && runtime.paidGateEligible === false && runtime.liveProven === false && runtime.saleEnabled === false, null);
check("real:blocked", real.decision === "BLOCKED_REAL_SHIELD_PRO_MAP_EVIDENCE", real);
check("real:receipt", JSON.stringify(real) === JSON.stringify(receipt.realIntake), null);
check("policy:gaps", policy.closedByA85.length === 30, policy.closedByA85.length);
check("policy:truth", typeof policy.truthBoundary === "string" && policy.truthBoundary.includes("does not prove current public-network"), policy.truthBoundary);
const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a85.shield-pro-map-full-depth-verification.v1",
  revisionId: A85_REVISION,
  status: failed.length ? "FAIL_A85_SHIELD_PRO_MAP_VERIFICATION" : "PASS_A85_LOCAL_SHIELD_PRO_MAP_VERIFICATION_NO_PROMOTION",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  fixtureDenominators: runtime.denominators,
  pagination: runtime.pagination,
  readiness: runtime.readiness,
  realIntake: real,
  exactA80CandidateBound: false,
  currentPublicNetworkExecuted: false,
  productionBrowserExecuted: false,
  realEntitlementsVerified: 0,
  customerValueProven: false,
  liveProven: false,
  saleEnabled: false,
  truthBoundary: policy.truthBoundary,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
