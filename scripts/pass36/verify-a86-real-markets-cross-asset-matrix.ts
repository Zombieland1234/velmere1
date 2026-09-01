#!/usr/bin/env node
import fs from "node:fs";
import {
  A86_REVISION,
  evaluateA86RealIntake,
  runA86FixtureHarness,
  verifyA86Runtime,
} from "../../lib/worldclass/pass36-a86-real-markets-cross-asset-runtime.ts";

const policy = JSON.parse(fs.readFileSync("config/pass36/a86-real-markets-cross-asset-policy.json", "utf8"));
const receipt = JSON.parse(fs.readFileSync("config/pass36/a86-test-receipt.json", "utf8"));
const currentState = JSON.parse(fs.readFileSync("config/pass36/a86-current-state.json", "utf8"));
const runtime = await runA86FixtureHarness(process.cwd(), policy);
const real = evaluateA86RealIntake(JSON.parse(fs.readFileSync(policy.realIntakeIndex.path, "utf8")));
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });
check("receipt:schema", receipt.schemaVersion === "velmere.pass36.a86.real-markets-cross-asset-test-receipt.v1", receipt.schemaVersion);
check("receipt:revision", receipt.revisionId === A86_REVISION, receipt.revisionId);
check("receipt:status", receipt.status === "PASS_A86_LOCAL_CROSS_ASSET_MATRIX_NO_PROMOTION", receipt.status);
check("receipt:checks", receipt.summary?.failed === 0 && receipt.summary?.checks >= 29, receipt.summary);
check("runtime:verified", verifyA86Runtime(runtime, policy, receipt.runtimeIntegritySha256), runtime.denominators);
check("runtime:digest", runtime.integrity.digest === receipt.runtimeIntegritySha256, { runtime: runtime.integrity.digest, receipt: receipt.runtimeIntegritySha256 });
check("runtime:catalog", runtime.catalog.totalInstruments === 583 && runtime.catalog.catalogRows === 553 && runtime.catalog.syntheticIndexRows === 30, runtime.catalog);
check("runtime:denominators", runtime.denominators.instruments === 583 && runtime.denominators.fieldRows === 5830 && runtime.denominators.tierPackets === 1749 && runtime.denominators.channelProjections === 6996 && runtime.denominators.semanticMutations === 31482 && runtime.denominators.mutationKilled === 31482, runtime.denominators);
check("runtime:mutation-families", Object.values(runtime.mutationFamilyStats).every((row) => row.survived === 0) && Object.values(runtime.mutationFamilyStats).reduce((sum, row) => sum + row.killed, 0) === 31482, runtime.mutationFamilyStats);
check("runtime:readiness", JSON.stringify(runtime.readiness) === JSON.stringify(receipt.readiness), { runtime: runtime.readiness, receipt: receipt.readiness });
check("runtime:http", JSON.stringify(runtime.httpStatusCounts) === JSON.stringify(receipt.httpStatusCounts), { runtime: runtime.httpStatusCounts, receipt: receipt.httpStatusCounts });
check("runtime:invariants", Object.values(runtime.invariants).every((value) => value === 0), runtime.invariants);
check("runtime:all-packets", runtime.packets.length === 1749 && new Set(runtime.packets.map((row) => row.packetId)).size === 1749, runtime.packets.length);
check("runtime:no-credit", runtime.catalog.liveDataRows === 0 && runtime.catalog.rightsApprovedRows === 0 && runtime.realIntake.fullyVerified === 0 && runtime.exactA80CandidateBound === false && runtime.currentProviderEvidenceVerified === false && runtime.providerRightsApproved === false && runtime.productionBrowserExecuted === false && runtime.customerValueProven === false && runtime.paidGateEligible === false && runtime.liveProven === false && runtime.saleEnabled === false && runtime.worldClassProven === false, null);
check("real:blocked", real.decision === "BLOCKED_REAL_MARKETS_CROSS_ASSET_EVIDENCE" && real.requiredInstrumentDenominator === 583 && real.supportedInstrumentDenominator === 583 && real.denominatorValid === true && real.rows === 0 && real.fullyVerified === 0 && real.unavailableOrBlockedInstruments === 583, real);
check("real:receipt", JSON.stringify(real) === JSON.stringify(receipt.realIntake), { real, receipt: receipt.realIntake });
check("policy:gaps", policy.closedByA86.length === 39, policy.closedByA86.length);
check("state:canonical", currentState.revisionId === A86_REVISION && currentState.decision === "NO_GO" && currentState.closedGaps === policy.closedByA86.length && currentState.totalInstruments === runtime.denominators.instruments && currentState.fieldRows === runtime.denominators.fieldRows && currentState.tierPackets === runtime.denominators.tierPackets && currentState.channelProjections === runtime.denominators.channelProjections && currentState.semanticMutations === runtime.denominators.semanticMutations && currentState.legalRegulatoryDecisionDenominator === 20 && currentState.legalRegulatoryDecisionsSigned === 0 && currentState.paidGateEligible === false && currentState.liveProven === false && currentState.saleEnabled === false, currentState);
check("policy:mutations", policy.mutationFamilies.length === 18, policy.mutationFamilies.length);
check("policy:truth", typeof policy.truthBoundary === "string" && policy.truthBoundary.includes("does not prove current quotes"), policy.truthBoundary);
const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a86.real-markets-cross-asset-verification.v1",
  revisionId: A86_REVISION,
  status: failed.length ? "FAIL_A86_REAL_MARKETS_CROSS_ASSET_VERIFICATION" : "PASS_A86_LOCAL_REAL_MARKETS_CROSS_ASSET_VERIFICATION_NO_PROMOTION",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  denominators: runtime.denominators,
  readiness: runtime.readiness,
  realIntake: real,
  exactA80CandidateBound: false,
  currentProviderEvidenceVerified: false,
  providerRightsApproved: false,
  productionBrowserExecuted: false,
  customerValueProven: false,
  paidGateEligible: false,
  liveProven: false,
  saleEnabled: false,
  truthBoundary: policy.truthBoundary,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
