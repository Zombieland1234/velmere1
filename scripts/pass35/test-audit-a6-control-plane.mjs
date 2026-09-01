#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { loadAuditExecutionPolicy, validateAuditExecutionPolicy } from "./audit-execution-envelope.mjs";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const policy = readJson("config/pass35/audit-a6-execution-policy.json");
const current = readJson("config/current-release.json");
const statusRegister = readJson("config/pass35/current-status-register.json");
const statusSummary = readJson("artifacts/release/PASS35_CURRENT_STATUS_SUMMARY.json");
const auditPolicy = readJson("config/pass35/audit-a01-a05-policy.json");
const envelope = loadAuditExecutionPolicy();
const forgeReceipt = readJson("fixtures/pass35/audit-a6/PASS35_A6_FORGE_SYNTHETIC_RECEIPT.json");
const fuzzReceipt = readJson("fixtures/pass35/audit-a6/PASS35_A6_A08_MODEL_FUZZ_SYNTHETIC_RECEIPT.json");
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };

check(policy.schemaVersion === "velmere.pass35.audit-a6-execution-policy.v1", "A6 policy schema invalid");
check(policy.sourceRevisionId === current.sourceRevisionId, "A6 revision invalid");
check(policy.status === "LOCAL_FORGE_ADAPTER_AND_MODEL_FUZZ_PROVEN_REAL_EVM_TOOLCHAIN_BLOCKED", "A6 status invalid");
check(policy.sellEnabled === false && policy.paidDeliveryAllowed === false && policy.fullAuditClaimAllowed === false, "A6 stop-sell invalid");
check(policy.runtimeBoundary.exactRuntimeProof === false && policy.runtimeBoundary.officialForgeAvailable === false, "A6 runtime/tool boundary invalid");
check(policy.controls.A07_FORGE_EXACT_TEST_ADAPTER.realExecutionCredit === false, "A07 real credit must be zero");
check(policy.controls.A08_LOCAL_MODEL_FUZZ_INVARIANTS.realExecutionCredit === false, "A08 real credit must be zero");
check(policy.syntheticReceipts.length === 2 && policy.syntheticReceipts.every((file) => existsSync(file)), "A6 receipts missing");
check(policy.hardStops.modelFuzzMayClaimEvmExecution === false && policy.hardStops.fixtureMaySatisfyA07 === false, "A6 truth hard stops invalid");

check(forgeReceipt.schemaVersion === "velmere.pass35.audit-a6-forge-receipt.v1", "Forge receipt schema invalid");
check(forgeReceipt.status === "VERIFIED" && forgeReceipt.assuranceClass === "LOCAL_CONTRACT", "Forge fixture receipt invalid");
check(forgeReceipt.testCount === 4 && forgeReceipt.passCount === 4 && forgeReceipt.failCount === 0, "Forge fixture test counts invalid");
check(forgeReceipt.realCaseExecution === false && forgeReceipt.paidGateEligible === false && forgeReceipt.fullAuditClaimAllowed === false, "Forge fixture unlocked real/paid/full claim");
check(/^sha256:[a-f0-9]{64}$/u.test(forgeReceipt.sourceBundleSha256) && /^sha256:[a-f0-9]{64}$/u.test(forgeReceipt.receiptSha256), "Forge receipt digest invalid");

check(fuzzReceipt.schemaVersion === "velmere.pass35.audit-a6-a08-model-fuzz-receipt.v1", "A08 receipt schema invalid");
check(fuzzReceipt.execution.status === "VERIFIED_LOCAL_MODEL_FUZZ" && fuzzReceipt.execution.assuranceClass === "LOCAL_STATE_MODEL_NOT_EVM", "A08 fixture receipt invalid");
check(fuzzReceipt.iterations === 10000 && fuzzReceipt.operationCount === 10000 && fuzzReceipt.invariantChecks === 28787, "A08 execution counts invalid");
check(fuzzReceipt.invariantFailureCount === 0 && fuzzReceipt.invariantFailureIds.length === 0, "A08 reference receipt has failures");
check(fuzzReceipt.execution.realCaseExecution === false && fuzzReceipt.execution.paidGateEligible === false && fuzzReceipt.execution.fullAuditClaimAllowed === false, "A08 fixture unlocked real/paid/full claim");
check(/^sha256:[a-f0-9]{64}$/u.test(fuzzReceipt.operationTraceSha256) && /^sha256:[a-f0-9]{64}$/u.test(fuzzReceipt.receiptSha256), "A08 receipt digest invalid");
check(fuzzReceipt.a07ExactTestReceiptSha256 === forgeReceipt.receiptSha256, "A08->A07 receipt binding invalid");

const envelopeBlockers = validateAuditExecutionPolicy(envelope);
check(envelopeBlockers.length === 0, `envelope policy invalid: ${envelopeBlockers.join(",")}`);
check(envelope.capabilityInventory.length === 20, "capability inventory count invalid");
check(envelope.capabilityInventory.filter((row) => /^MISSING_/u.test(row.state)).length === 0, "current A7 missing runner count invalid");
check(envelope.capabilityInventory.some((row) => row.familyId === "exact_unit_integration_tests" && row.state === "IMPLEMENTED_LOCAL_EXACT_TEST_EVIDENCE_BENCHMARKED_OFFICIAL_FORGE_MISSING"), "A07 inventory truth missing");
check(envelope.capabilityInventory.some((row) => row.familyId === "property_fuzz_invariant" && row.state === "IMPLEMENTED_LOCAL_FUZZ_INVARIANT_EVIDENCE_BENCHMARKED_OFFICIAL_ENGINES_MISSING"), "A08 inventory truth missing");
check(envelope.capabilityInventory.some((row) => row.familyId === "fork_replay_exact_state" && row.state === "IMPLEMENTED_LOCAL_FORK_REPLAY_EVIDENCE_BENCHMARKED_NATIVE_FORK_REAL_PROVIDER_MISSING"), "current A7 A09 truth invalid");
check(envelope.paidDeliveryGate.currentPaidDeliveryPossible === false, "paid delivery should remain blocked");

check(auditPolicy.controls.A07.localState === "IMPLEMENTED_LOCAL_EXACT_TEST_EVIDENCE_BENCHMARKED_OFFICIAL_FORGE_NOT_RUN" && auditPolicy.controls.A07.paidGateEligible === false, "A07 audit policy truth invalid");
check(auditPolicy.controls.A08.localState === "IMPLEMENTED_LOCAL_FUZZ_INVARIANT_EVIDENCE_BENCHMARKED_OFFICIAL_ENGINES_NOT_RUN" && auditPolicy.controls.A08.paidGateEligible === false, "A08 audit policy truth invalid");
check(statusRegister.canonicalCurrentTruth === true && statusRegister.sourceRevisionId === current.sourceRevisionId && statusRegister.rows.length === 43, "canonical A6 status register invalid");
check(statusRegister.rows.find((row) => row.id === "AUD09_A07_EXACT_TESTS")?.status === "DONE", "A07 status row invalid");
check(statusRegister.rows.find((row) => row.id === "AUD10_A08_FUZZ_INVARIANTS")?.status === "DONE", "A08 status row invalid");
check(statusSummary.denominator === 43 && statusSummary.counts.DONE === 16 && statusSummary.counts.PARTIAL === 18 && statusSummary.counts.BLOCKED_EXTERNAL === 9 && statusSummary.counts.NOT_DONE === 0, "A6 status summary counts invalid");
check(statusSummary.registerSha256 === sha256(readFileSync("config/pass35/current-status-register.json")), "A6 status register hash mismatch");
check(current.auditA6ExecutionPolicyPath === "config/pass35/audit-a6-execution-policy.json" && current.auditA6ForgeAdapterPath === "scripts/pass35/audit-forge-adapter.mjs" && current.auditA6ModelFuzzEnginePath === "lib/security/audit-a08-model-fuzz.ts", "A6 current pointers invalid");
check(current.sourceRevisionId === "VELMERE_PASS35_A32_REPORT_DELIVERY_EVIDENCE_NON_VISUAL" && current.productionPromotionAllowed === false, "current A7 revision/promotion invalid");

console.log(JSON.stringify({
  status: "PASS_AUDIT_A6_CONTROL_PLANE_UNDER_A28",
  assertions,
  inventoryFamilies: envelope.capabilityInventory.length,
  missingExecutableFamilies: 0,
  forgeFixtureTests: forgeReceipt.testCount,
  fuzzIterations: fuzzReceipt.iterations,
  invariantChecks: fuzzReceipt.invariantChecks,
  statusRows: statusRegister.rows.length,
  exactRuntimeProof: false,
  paidDeliveryAllowed: false,
}, null, 2));
