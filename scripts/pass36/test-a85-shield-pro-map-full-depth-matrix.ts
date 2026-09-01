#!/usr/bin/env node
import fs from "node:fs";
import {
  A85_REVISION,
  evaluateA85RealIntake,
  runA85FixtureHarness,
  sha256,
  verifyA85Runtime,
} from "../../lib/worldclass/pass36-a85-shield-pro-map-full-depth-runtime.ts";

const writeArtifacts = process.argv.includes("--write");
const policy = JSON.parse(fs.readFileSync("config/pass36/a85-shield-pro-map-full-depth-policy.json", "utf8"));
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });
const runtime = await runA85FixtureHarness(process.cwd(), policy);
check("runtime:verified", verifyA85Runtime(runtime, policy, runtime.integrity.digest), runtime.denominators);
check("runtime:revision", runtime.revisionId === A85_REVISION, runtime.revisionId);
check("parent:a84", /^[a-f0-9]{64}$/u.test(runtime.parentA84RuntimeDigestSha256), runtime.parentA84RuntimeDigestSha256);
check("denominator:assets", runtime.denominators.activeAssets === 318, runtime.denominators);
check("denominator:packets", runtime.denominators.tierPackets === 954 && runtime.denominators.surfaceProjections === 1908, runtime.denominators);
check("denominator:timeframes", runtime.denominators.terminalTimeframeRows === 5724, runtime.denominators);
check("denominator:lanes", runtime.denominators.investigatorLaneRows === 5724, runtime.denominators);
check("denominator:mutations", runtime.denominators.semanticMutations === 15264 && runtime.denominators.mutationKilled === 15264, runtime.denominators);
check("pagination:full", runtime.pagination.rows === 318 && runtime.pagination.pagesFetched === 2 && runtime.pagination.complete, runtime.pagination);
check("pagination:adversarial", runtime.pagination.repeatedPageRejected && runtime.pagination.laterFailureExplicitPartial, runtime.pagination);
check("identity:boundary", runtime.identityBoundary.scenarios === 10 && runtime.identityBoundary.failed === 0, runtime.identityBoundary);
check("bindings:complete", Object.values(runtime.bindingCounts).reduce((sum, value) => sum + value, 0) === 318, runtime.bindingCounts);
check("labels:complete", Object.values(runtime.labelCounts).reduce((sum, value) => sum + value, 0) === 318, runtime.labelCounts);
check("depth:complete", Object.values(runtime.depthCounts).reduce((sum, value) => sum + value, 0) === 318, runtime.depthCounts);
check("readiness:terminal-monotonic", runtime.readiness.basic.shieldProFunctionalReadyOffline >= runtime.readiness.pro.shieldProFunctionalReadyOffline && runtime.readiness.pro.shieldProFunctionalReadyOffline >= runtime.readiness.advanced.shieldProFunctionalReadyOffline, runtime.readiness);
check("readiness:map-monotonic", runtime.readiness.basic.shieldMapFunctionalReadyOffline >= runtime.readiness.pro.shieldMapFunctionalReadyOffline && runtime.readiness.pro.shieldMapFunctionalReadyOffline >= runtime.readiness.advanced.shieldMapFunctionalReadyOffline, runtime.readiness);
check("delivery:no-paid", Object.values(runtime.readiness).every((row) => row.paidDelivered === 0), runtime.readiness);
check("packets:unique", new Set(runtime.packets.map((row) => row.packetId)).size === runtime.packets.length, runtime.packets.length);
check("packets:three-tiers", ["basic", "pro", "advanced"].every((tier) => runtime.packets.filter((row) => row.tier === tier).length === 318), null);
check("packets:identity", runtime.packets.every((row) => row.marketIdentity.marketId === row.canonicalAssetId && row.marketIdentity.symbol === row.symbol && row.marketIdentity.quote === "USD"), null);
check("packets:deep-dive-basic", runtime.packets.every((row) => row.map.deepDivePresentationOnly && row.map.vlmDepth === "basic"), null);
check("packets:entitlement", runtime.packets.filter((row) => row.tier !== "basic").every((row) => row.entitlement.deliveryDecision === "BLOCKED_REQUIRES_SERVER_ENTITLEMENT" && row.entitlement.realServerEntitlementVerified === false), null);
check("invariants:zero", Object.values(runtime.invariants).every((value) => value === 0), runtime.invariants);
check("truth:no-promotion", runtime.realFullDepthCasesVerified === 0 && runtime.rightsApprovedAssets === 0 && runtime.productionBrowserAssets === 0 && runtime.realEntitlementsVerified === 0 && runtime.customerValueLabeledAssets === 0 && runtime.paidGateEligible === false && runtime.liveProven === false && runtime.saleEnabled === false, null);
const replay = await runA85FixtureHarness(process.cwd(), policy);
check("determinism:runtime", replay.integrity.digest === runtime.integrity.digest, { first: runtime.integrity.digest, second: replay.integrity.digest });
const realIndex = JSON.parse(fs.readFileSync(policy.realIntakeIndex.path, "utf8"));
const real = evaluateA85RealIntake(realIndex);
check("real:blocked", real.decision === "BLOCKED_REAL_SHIELD_PRO_MAP_EVIDENCE", real);
check("real:full-denominator-blocked", real.activeAssetDenominator === 318 && real.requiredAssets === 318 && real.denominatorValid === true && real.evidenceCompleteAssets === 0 && real.unavailableOrBlockedAssets === 318 && real.exactChainAddressBindings === 0 && real.productionBrowserAssets === 0 && real.serverEntitlementAssets === 0, real);
check("policy:gaps", policy.closedByA85.length === 30, policy.closedByA85.length);
check("policy:mutations", policy.mutationFamilies.length === 16, policy.mutationFamilies);
check("policy:intake-hash", sha256(fs.readFileSync(policy.realIntakeIndex.path)) === policy.realIntakeIndex.sha256, null);
const productionFiles = policy.productionAssertions;
for (const assertion of productionFiles) {
  const source = fs.readFileSync(assertion.path, "utf8");
  check(`production:${assertion.id}`, assertion.includes.every((fragment: string) => source.includes(fragment)) && assertion.excludes.every((fragment: string) => !source.includes(fragment)), assertion.path);
}
const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a85.shield-pro-map-full-depth-test-receipt.v1",
  revisionId: A85_REVISION,
  generatedAt: policy.deterministicEpoch,
  status: failed.length ? "FAIL_A85_SHIELD_PRO_MAP_FULL_DEPTH" : "PASS_A85_LOCAL_FULL_DEPTH_MATRIX_NO_PROMOTION",
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  fixtureDenominators: runtime.denominators,
  pagination: runtime.pagination,
  bindingCounts: runtime.bindingCounts,
  labelCounts: runtime.labelCounts,
  depthCounts: runtime.depthCounts,
  readiness: runtime.readiness,
  identityBoundary: runtime.identityBoundary,
  runtimeIntegritySha256: runtime.integrity.digest,
  realIntake: real,
  realFullDepthCasesVerified: 0,
  rightsApprovedAssets: 0,
  productionBrowserAssets: 0,
  realEntitlementsVerified: 0,
  customerValueLabeledAssets: 0,
  exactA80CandidateBound: false,
  paidGateEligible: false,
  liveProven: false,
  saleEnabled: false,
  failures: failed,
  checks,
  truthBoundary: policy.truthBoundary,
};
if (writeArtifacts) {
  fs.mkdirSync("artifacts/pass36/a85", { recursive: true });
  fs.writeFileSync("config/pass36/a85-test-receipt.json", `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync("artifacts/pass36/a85/PASS36_A85_SHIELD_PRO_MAP_FULL_DEPTH_RUNTIME.json", `${JSON.stringify(runtime, null, 2)}\n`);
}
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
