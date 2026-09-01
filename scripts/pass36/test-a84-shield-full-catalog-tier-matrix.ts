#!/usr/bin/env node
import fs from "node:fs";
import {
  A84_REVISION,
  evaluateA84RealIntake,
  runA84FixtureHarness,
  sha256,
  verifyA84Runtime,
} from "../../lib/worldclass/pass36-a84-shield-full-catalog-tier-matrix-runtime.ts";

const policy = JSON.parse(fs.readFileSync("config/pass36/a84-shield-full-catalog-tier-matrix-policy.json", "utf8"));
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });

const runtime = await runA84FixtureHarness(process.cwd(), policy);
check("runtime:verified", verifyA84Runtime(runtime, policy, runtime.integrity.digest), runtime.denominators);
check("runtime:revision", runtime.revisionId === A84_REVISION, runtime.revisionId);
check("catalog:providers", runtime.catalog.providers === 4 && runtime.catalog.successfulProviders === 4, runtime.catalog);
check("catalog:denominator", runtime.catalog.activeAssets === 318 && runtime.catalog.activeListings === 1013, runtime.catalog);
check("denominator:observations", runtime.denominators.observationTargets === 7091 && runtime.denominators.observationRows === 7091, runtime.denominators);
check("denominator:packets", runtime.denominators.tierPackets === 954 && runtime.denominators.popupRows === 3816, runtime.denominators);
check("denominator:mutations", runtime.denominators.semanticMutations === 11448 && runtime.denominators.mutationKilled === 11448, runtime.denominators);
check("states:complete", Object.values(runtime.stateCounts).reduce((sum, value) => sum + value, 0) === 7091, runtime.stateCounts);
check("states:adversarial", runtime.stateCounts.STALE > 0 && runtime.stateCounts.CONFLICTED > 0 && runtime.stateCounts.FAILED > 0 && runtime.stateCounts.RATE_LIMITED > 0, runtime.stateCounts);
check("readiness:monotonic", runtime.readiness.basic.functionalReadyOffline >= runtime.readiness.pro.functionalReadyOffline && runtime.readiness.pro.functionalReadyOffline >= runtime.readiness.advanced.functionalReadyOffline, runtime.readiness);
check("readiness:explicit-unavailable", runtime.readiness.basic.unavailable > 0 && runtime.readiness.pro.unavailable > 0 && runtime.readiness.advanced.unavailable > 0, runtime.readiness);
check("readiness:no-production", Object.values(runtime.readiness).every((row) => row.productionEligible === 0), runtime.readiness);
check("coverage:providers", Object.keys(runtime.providerFamilyCoverage).length === 4 && Object.values(runtime.providerFamilyCoverage).every((value) => value > 0), runtime.providerFamilyCoverage);
check("observations:unique", new Set(runtime.observations.map((row) => row.observationId)).size === runtime.observations.length, runtime.observations.length);
check("packets:unique", new Set(runtime.packets.map((row) => row.packetId)).size === runtime.packets.length, runtime.packets.length);
check("packets:all-assets", new Set(runtime.packets.map((row) => row.canonicalAssetId)).size === 318, null);
check("packets:three-tiers", ["basic", "pro", "advanced"].every((tier) => runtime.packets.filter((row) => row.tier === tier).length === 318), null);
check("popup:four-sections", runtime.packets.every((row) => row.popupSections.length === 4), null);
check("popup:basic-paid-depth-blocked", runtime.packets.filter((row) => row.tier === "basic").every((row) => row.popupSections.filter((section) => ["market_impact", "whale_watch"].includes(section.sectionId)).every((section) => section.state === "UNAVAILABLE")), null);
check("truth:no-real-credit", runtime.realFullCatalogSnapshotsVerified === 0 && runtime.rightsApprovedAssets === 0 && runtime.currentPublicNetworkExecuted === false && runtime.productionBrowserExecuted === false && runtime.customerValueProven === false, null);
check("truth:no-promotion", runtime.exactA80CandidateBound === false && runtime.paidGateEligible === false && runtime.liveProven === false && runtime.saleEnabled === false && runtime.worldClassProven === false, null);
check("invariants:zero", Object.values(runtime.invariants).every((value) => value === 0), runtime.invariants);

const replay = await runA84FixtureHarness(process.cwd(), policy);
check("determinism:runtime", replay.integrity.digest === runtime.integrity.digest, { first: runtime.integrity.digest, second: replay.integrity.digest });
check("determinism:first-last", replay.packets[0]?.packetDigestSha256 === runtime.packets[0]?.packetDigestSha256 && replay.packets.at(-1)?.packetDigestSha256 === runtime.packets.at(-1)?.packetDigestSha256, null);

const realIndex = JSON.parse(fs.readFileSync(policy.realIntakeIndex.path, "utf8"));
const real = evaluateA84RealIntake(realIndex, policy);
check("real:blocked", real.decision === "BLOCKED_CURRENT_FULL_CATALOG_EVIDENCE", real);
check("real:full-denominator-blocked", real.activeAssetDenominator === 318 && real.requiredAssetDenominator === 318 && real.denominatorValid === true && real.evidenceCompleteAssets === 0 && real.unavailableOrBlockedAssets === 318 && real.providerCatalogBundles === 0 && real.fieldSnapshotBundles === 0 && real.rightsApprovedAssets === 0 && real.productionBrowserAssets === 0 && real.customerValueLabeledAssets === 0 && real.realTierOutputs === 0, real);
check("policy:gaps", policy.closedByA84.length === 37, policy.closedByA84.length);
check("policy:fields", policy.fieldIds.length === 7, policy.fieldIds);
check("policy:providers", policy.providerFamilies.length === 4, policy.providerFamilies);
check("policy:popup", policy.popupSections.length === 4, policy.popupSections);
check("policy:mutations", policy.mutationFamilies.length === 12, policy.mutationFamilies);
check("policy:intake-hash", sha256(fs.readFileSync(policy.realIntakeIndex.path)) === policy.realIntakeIndex.sha256, null);

const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a84.shield-full-catalog-tier-matrix-test-receipt.v1",
  revisionId: A84_REVISION,
  generatedAt: policy.deterministicEpoch,
  status: failed.length ? "FAIL_A84_SHIELD_FULL_CATALOG_TIER_MATRIX" : "PASS_A84_LOCAL_INJECTED_FULL_CATALOG_MATRIX_ONLY",
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  fixtureDenominators: runtime.denominators,
  fixtureCatalog: runtime.catalog,
  stateCounts: runtime.stateCounts,
  readiness: runtime.readiness,
  runtimeIntegritySha256: runtime.integrity.digest,
  realIntake: real,
  realFullCatalogSnapshotsVerified: 0,
  rightsApprovedAssets: 0,
  productionBrowserAssets: 0,
  customerValueLabeledAssets: 0,
  exactA80CandidateBound: false,
  paidGateEligible: false,
  liveProven: false,
  saleEnabled: false,
  failures: failed,
  checks,
  truthBoundary: policy.truthBoundary,
};
fs.mkdirSync("artifacts/pass36/a84", { recursive: true });
fs.writeFileSync("config/pass36/a84-test-receipt.json", `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync("artifacts/pass36/a84/PASS36_A84_SHIELD_FULL_CATALOG_RUNTIME.json", `${JSON.stringify(runtime, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
