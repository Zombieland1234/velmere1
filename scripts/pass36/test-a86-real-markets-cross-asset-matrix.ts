#!/usr/bin/env node
import fs from "node:fs";
import {
  A86_REVISION,
  evaluateA86RealIntake,
  runA86FixtureHarness,
  sha256,
  verifyA86Runtime,
} from "../../lib/worldclass/pass36-a86-real-markets-cross-asset-runtime.ts";

const writeArtifacts = process.argv.includes("--write");
const policy = JSON.parse(fs.readFileSync("config/pass36/a86-real-markets-cross-asset-policy.json", "utf8"));
const currentState = JSON.parse(fs.readFileSync("config/pass36/a86-current-state.json", "utf8"));
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });
const runtime = await runA86FixtureHarness(process.cwd(), policy);
check("runtime:verified", verifyA86Runtime(runtime, policy, runtime.integrity.digest), runtime.denominators);
check("runtime:revision", runtime.revisionId === A86_REVISION, runtime.revisionId);
check("catalog:denominator", runtime.catalog.catalogRows === 553 && runtime.catalog.syntheticIndexRows === 30 && runtime.catalog.totalInstruments === 583, runtime.catalog);
check("catalog:classes", Object.values(runtime.catalog.classCounts).every((value) => value > 0), runtime.catalog.classCounts);
check("catalog:static-only", runtime.catalog.liveDataRows === 0 && runtime.catalog.rightsApprovedRows === 0, runtime.catalog);
check("denominator:field-rows", runtime.denominators.fieldRows === 5830, runtime.denominators);
check("denominator:packets", runtime.denominators.tierPackets === 1749, runtime.denominators);
check("denominator:channels", runtime.denominators.channelProjections === 6996, runtime.denominators);
check("denominator:mutations", runtime.denominators.semanticMutations === 31482 && runtime.denominators.mutationKilled === 31482, runtime.denominators);
check("readiness:monotonic", runtime.readiness.basic.functionalReadyOffline >= runtime.readiness.pro.functionalReadyOffline && runtime.readiness.pro.functionalReadyOffline >= runtime.readiness.advanced.functionalReadyOffline, runtime.readiness);
check("delivery:no-paid", Object.values(runtime.readiness).every((row) => row.paidDelivered === 0 && row.productionEligible === 0), runtime.readiness);
check("http:three-states", runtime.httpStatusCounts["200"] > 0 && runtime.httpStatusCounts["403"] > 0 && runtime.httpStatusCounts["424"] > 0, runtime.httpStatusCounts);
check("packets:unique", new Set(runtime.packets.map((row) => row.packetId)).size === runtime.packets.length, runtime.packets.length);
check("packets:three-tiers", ["basic", "pro", "advanced"].every((tier) => runtime.packets.filter((row) => row.tier === tier).length === 583), null);
check("packets:four-channels", runtime.packets.every((row) => row.channelProjections.length === 4), null);
check("packets:crypto-comparison-only", runtime.packets.filter((row) => row.assetClass === "crypto").every((row) => row.cryptoScope === "COMPARISON_ONLY"), null);
check("packets:corporate-actions", runtime.packets.filter((row) => !["stock", "etf", "real_estate"].includes(row.assetClass)).every((row) => row.corporateActionMeaning === "VERIFIED_NOT_APPLICABLE"), null);
check("packets:entitlement", runtime.packets.filter((row) => row.tier !== "basic" && row.analysisDecision === "FUNCTIONAL_READY_OFFLINE").every((row) => row.deliveryDecision === "BLOCKED_REQUIRES_SERVER_ENTITLEMENT" && row.httpStatus === 403), null);
check("packets:evidence-withheld", runtime.packets.filter((row) => row.analysisDecision !== "FUNCTIONAL_READY_OFFLINE").every((row) => row.deliveryDecision === "EVIDENCE_WITHHELD" && row.httpStatus === 424), null);
check("invariants:zero", Object.values(runtime.invariants).every((value) => value === 0), runtime.invariants);
const replay = await runA86FixtureHarness(process.cwd(), policy);
check("determinism:runtime", replay.integrity.digest === runtime.integrity.digest, { first: runtime.integrity.digest, second: replay.integrity.digest });
const realIndex = JSON.parse(fs.readFileSync(policy.realIntakeIndex.path, "utf8"));
const real = evaluateA86RealIntake(realIndex);
check("real:blocked", real.decision === "BLOCKED_REAL_MARKETS_CROSS_ASSET_EVIDENCE", real);
check("real:full-denominator-blocked", real.requiredInstrumentDenominator === 583 && real.supportedInstrumentDenominator === 583 && real.denominatorValid === true && real.rows === 0 && real.fullyVerified === 0 && real.unavailableOrBlockedInstruments === 583 && real.rightsApproved === 0 && real.productionBrowserVerified === 0, real);
check("policy:gaps", policy.closedByA86.length === 39, policy.closedByA86.length);
check("state:canonical", currentState.revisionId === A86_REVISION && currentState.decision === "NO_GO" && currentState.closedGaps === policy.closedByA86.length && currentState.totalInstruments === runtime.denominators.instruments && currentState.fieldRows === runtime.denominators.fieldRows && currentState.tierPackets === runtime.denominators.tierPackets && currentState.channelProjections === runtime.denominators.channelProjections && currentState.semanticMutations === runtime.denominators.semanticMutations && currentState.legalRegulatoryDecisionDenominator === 20 && currentState.legalRegulatoryDecisionsSigned === 0 && currentState.paidGateEligible === false && currentState.liveProven === false && currentState.saleEnabled === false, currentState);
check("policy:mutations", policy.mutationFamilies.length === 18, policy.mutationFamilies);
check("policy:intake-hash", sha256(fs.readFileSync(policy.realIntakeIndex.path)) === policy.realIntakeIndex.sha256, null);
for (const assertion of policy.productionAssertions) {
  const source = fs.readFileSync(assertion.path, "utf8");
  check(`production:${assertion.id}`, assertion.includes.every((fragment: string) => source.includes(fragment)) && assertion.excludes.every((fragment: string) => !source.includes(fragment)), assertion.path);
}
const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a86.real-markets-cross-asset-test-receipt.v1",
  revisionId: A86_REVISION,
  generatedAt: policy.deterministicEpoch,
  status: failed.length ? "FAIL_A86_REAL_MARKETS_CROSS_ASSET_MATRIX" : "PASS_A86_LOCAL_CROSS_ASSET_MATRIX_NO_PROMOTION",
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  catalog: runtime.catalog,
  denominators: runtime.denominators,
  readiness: runtime.readiness,
  httpStatusCounts: runtime.httpStatusCounts,
  runtimeIntegritySha256: runtime.integrity.digest,
  realIntake: real,
  exactA80CandidateBound: false,
  currentProviderEvidenceVerified: false,
  providerRightsApproved: false,
  productionBrowserExecuted: false,
  customerValueProven: false,
  paidGateEligible: false,
  liveProven: false,
  saleEnabled: false,
  failures: failed,
  checks,
  truthBoundary: policy.truthBoundary,
};
if (writeArtifacts) {
  fs.mkdirSync("artifacts/pass36/a86", { recursive: true });
  fs.writeFileSync("config/pass36/a86-test-receipt.json", `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync("artifacts/pass36/a86/PASS36_A86_REAL_MARKETS_CROSS_ASSET_RUNTIME.json", `${JSON.stringify(runtime, null, 2)}\n`);
}
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
