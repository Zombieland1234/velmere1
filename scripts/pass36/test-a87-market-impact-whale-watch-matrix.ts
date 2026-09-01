#!/usr/bin/env node
import fs from "node:fs";
import { A87_REVISION, evaluateA87RealIntake, runA87FixtureHarness, sha256, verifyA87Runtime } from "../../lib/worldclass/pass36-a87-market-impact-whale-watch-runtime.ts";

const policy = JSON.parse(fs.readFileSync("config/pass36/a87-market-impact-whale-watch-policy.json", "utf8"));
const currentState = JSON.parse(fs.readFileSync("config/pass36/a87-current-state.json", "utf8"));
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });
const runtime = await runA87FixtureHarness(process.cwd(), policy);
check("runtime:verified", verifyA87Runtime(runtime, policy, runtime.integrity.digest), runtime.denominators);
check("runtime:revision", runtime.revisionId === A87_REVISION, runtime.revisionId);
check("denominator:assets", runtime.denominators.activeAssets === 318, runtime.denominators);
check("denominator:surfaces", runtime.denominators.surfaces === 2, runtime.denominators);
check("denominator:packets", runtime.denominators.tierPackets === 1908, runtime.denominators);
check("denominator:channels", runtime.denominators.channelProjections === 7632, runtime.denominators);
check("denominator:mutations", runtime.denominators.semanticMutations === 34344 && runtime.denominators.mutationKilled === 34344, runtime.denominators);
check("market:readiness", runtime.readiness.market_impact.basic.functionalReadyOffline === 307 && runtime.readiness.market_impact.pro.functionalReadyOffline === 290 && runtime.readiness.market_impact.advanced.functionalReadyOffline === 245, runtime.readiness.market_impact);
check("whale:readiness", runtime.readiness.whale_watch.basic.functionalReadyOffline === 230 && runtime.readiness.whale_watch.pro.functionalReadyOffline === 150 && runtime.readiness.whale_watch.advanced.functionalReadyOffline === 85, runtime.readiness.whale_watch);
check("readiness:monotonic", runtime.readiness.market_impact.basic.functionalReadyOffline >= runtime.readiness.market_impact.pro.functionalReadyOffline && runtime.readiness.market_impact.pro.functionalReadyOffline >= runtime.readiness.market_impact.advanced.functionalReadyOffline && runtime.readiness.whale_watch.basic.functionalReadyOffline >= runtime.readiness.whale_watch.pro.functionalReadyOffline && runtime.readiness.whale_watch.pro.functionalReadyOffline >= runtime.readiness.whale_watch.advanced.functionalReadyOffline, runtime.readiness);
check("market:replay", runtime.denominators.marketImpactReplayPairs === 308, runtime.denominators.marketImpactReplayPairs);
check("market:no-realized", runtime.packets.filter((row) => row.surface === "market_impact").every((row) => row.evidence.realizedSlippageComparisonCount === 0 && row.realizedExecutionValidated === false), null);
check("whale:bindings", runtime.packets.filter((row) => row.surface === "whale_watch" && row.analysisDecision === "FUNCTIONAL_READY_OFFLINE").every((row) => row.evidence.bindingState === "EXACT"), null);
check("whale:evidence", runtime.denominators.whaleHolderRows === 4600 && runtime.denominators.whaleTransferRows === 7200 && runtime.denominators.walletLabelArtifacts === 1200, runtime.denominators);
check("packets:unique", new Set(runtime.packets.map((row) => row.packetId)).size === 1908, null);
check("packets:coverage", ["market_impact", "whale_watch"].every((surface) => ["basic", "pro", "advanced"].every((tier) => runtime.packets.filter((row) => row.surface === surface && row.tier === tier).length === 318)), null);
check("packets:projections", runtime.packets.every((row) => row.projections.length === 4 && row.projections.every((projection) => projection.addsFacts === false)), null);
check("packets:no-paid", runtime.packets.every((row) => row.paidGateEligible === false && row.liveProven === false && row.saleEnabled === false), null);
check("invariants:zero", Object.values(runtime.invariants).every((value) => value === 0), runtime.invariants);
check("mutations:families", Object.values(runtime.mutationFamilyStats).every((row) => row.survived === 0), runtime.mutationFamilyStats);
const replay = await runA87FixtureHarness(process.cwd(), policy);
check("determinism:runtime", replay.integrity.digest === runtime.integrity.digest, { first: runtime.integrity.digest, second: replay.integrity.digest });
const real = evaluateA87RealIntake(JSON.parse(fs.readFileSync(policy.realIntakeIndex.path, "utf8")));
check("real:blocked", real.decision === "BLOCKED_REAL_MARKET_IMPACT_WHALE_EVIDENCE", real);
check("real:zero", real.rows === 0 && real.fullyVerified === 0 && real.rightsApproved === 0 && real.realizedSlippage === 0 && real.monitoringWindows === 0, real);
check("policy:gaps", policy.closedByA87.length === 33, policy.closedByA87.length);
check("policy:mutations", policy.mutationFamilies.length === 18, policy.mutationFamilies.length);
check("policy:intake-hash", sha256(fs.readFileSync(policy.realIntakeIndex.path)) === policy.realIntakeIndex.sha256, null);
for (const assertion of policy.productionAssertions) {
  const source = fs.readFileSync(assertion.path, "utf8");
  check(`production:${assertion.id}`, assertion.includes.every((fragment: string) => source.includes(fragment)) && assertion.excludes.every((fragment: string) => !source.includes(fragment)), assertion.path);
}
check("state:canonical", currentState.revisionId === A87_REVISION && currentState.decision === "NO_GO" && currentState.closedGaps === policy.closedByA87.length && currentState.activeAssets === 318 && currentState.tierPackets === 1908 && currentState.semanticMutations === 34344 && currentState.legalRegulatoryDecisionDenominator === 20 && currentState.legalRegulatoryDecisionsSigned === 0 && currentState.paidGateEligible === false && currentState.liveProven === false && currentState.saleEnabled === false, currentState);
const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a87.market-impact-whale-watch-test-receipt.v1",
  revisionId: A87_REVISION,
  generatedAt: policy.deterministicEpoch,
  status: failed.length ? "FAIL_A87_MARKET_IMPACT_WHALE_MATRIX" : "PASS_A87_LOCAL_COMMON_DENOMINATOR_NO_PROMOTION",
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  denominators: runtime.denominators,
  readiness: runtime.readiness,
  runtimeIntegritySha256: runtime.integrity.digest,
  realIntake: real,
  exactA80CandidateBound: false,
  currentProviderEvidenceVerified: false,
  providerRightsApproved: false,
  productionBrowserExecuted: false,
  realizedExecutionValidated: false,
  continuousMonitoringExecuted: false,
  customerValueProven: false,
  paidGateEligible: false,
  liveProven: false,
  saleEnabled: false,
  failures: failed,
  checks,
  truthBoundary: policy.truthBoundary,
};
fs.mkdirSync("artifacts/pass36/a87", { recursive: true });
fs.writeFileSync("config/pass36/a87-test-receipt.json", `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync("artifacts/pass36/a87/PASS36_A87_MARKET_IMPACT_WHALE_RUNTIME.json", `${JSON.stringify(runtime, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
