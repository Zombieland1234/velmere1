#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildAuditEnvelopeVerificationReceipt, loadAuditExecutionPolicy, validateAuditCaseExecutionEnvelope, validateAuditExecutionPolicy } from "./audit-execution-envelope.mjs";

const policy = loadAuditExecutionPolicy();
assert.deepEqual(validateAuditExecutionPolicy(policy), []);
const d = (char) => `sha256:${char.repeat(64)}`;
const base = {
  schemaVersion: "velmere.pass35.audit-case-execution-envelope.v1",
  caseRef: "AUD-PASS35-CASE-0001",
  accountBindingHash: d("a"),
  productCellId: policy.productCellId,
  tier: "pro",
  chainId: "1",
  contractAddress: `0x${"1".repeat(40)}`,
  sourceCommitOrExplorerVersion: "etherscan:verified-source:v1",
  createdAt: "2026-07-22T12:00:00.000Z",
  inputBindings: Object.fromEntries(policy.requiredInputBindings.map((field, index) => [field, d(String((index + 1) % 10))])),
  analyzerReceipts: policy.capabilityInventory.filter((row) => !row.state.startsWith("MISSING_")).map((row, index) => {
    const policyBlocked = /BLOCKED_EXTERNAL|NOT_CASE_BOUND|REAL_EXECUTION_BLOCKED|REAL_TOOL_MISSING|REAL_PROVIDER_MISSING|FIXTURE_CONTRACT_PROVEN|REAL_SIGNED_CLOSURE_MISSING/u.test(row.state);
    const localHeuristic = row.state === "IMPLEMENTED_LOCAL_HEURISTIC_NOT_BENCHMARKED";
    return {
      familyId: row.familyId,
      toolName: row.familyId,
      toolVersion: "local-contract-v1",
      binaryOrImageSha256: d("a"),
      configurationSha256: d("b"),
      inputBundleSha256: d("c"),
      rawOutputSha256: d("d"),
      startedAt: `2026-07-22T12:00:${String(index).padStart(2, "0")}.000Z`,
      completedAt: `2026-07-22T12:01:${String(index).padStart(2, "0")}.000Z`,
      exitCode: policyBlocked ? 2 : 0,
      executionEnvironment: "LOCAL_SYNTHETIC_CONTRACT_TEST",
      applicability: "applicable",
      status: policyBlocked ? "BLOCKED" : "VERIFIED",
      assuranceClass: localHeuristic ? "LOCAL_HEURISTIC_NOT_BENCHMARKED" : "LOCAL_CONTRACT",
      realCaseExecution: false,
      paidGateEligible: false,
      limitations: ["contract test only"]
    };
  }),
  fullAuditClaimAllowed: false,
  paidDeliveryAllowed: false,
  finalPacketSha256: null
};
assert.deepEqual(validateAuditCaseExecutionEnvelope(base, policy), []);
const forgedFixtureFork = structuredClone(base);
const forkReplay = forgedFixtureFork.analyzerReceipts.find((row) => row.familyId === "fork_replay_exact_state");
forkReplay.status = "VERIFIED";
forkReplay.exitCode = 0;
assert.ok(validateAuditCaseExecutionEnvelope(forgedFixtureFork, policy).includes("envelope_blocked_policy_family_cannot_verify:fork_replay_exact_state"));
const paidWithoutPacket = { ...base, paidDeliveryAllowed: true };
const paidBlockers = validateAuditCaseExecutionEnvelope(paidWithoutPacket, policy);
assert.ok(paidBlockers.includes("envelope_final_packet_digest_invalid"));
assert.ok(paidBlockers.includes("envelope_policy_stop_sell_active"));
assert.ok(paidBlockers.includes("envelope_paid_delivery_without_verified_execution"));
const badInput = structuredClone(base);
badInput.inputBindings.sourceSha256 = "bad";
assert.ok(validateAuditCaseExecutionEnvelope(badInput, policy).includes("envelope_input_digest_invalid:sourceSha256"));
const forgedLocalPaid = structuredClone(base);
forgedLocalPaid.analyzerReceipts[0].paidGateEligible = true;
assert.ok(validateAuditCaseExecutionEnvelope(forgedLocalPaid, policy).includes(`envelope_paid_eligible_without_real_case:${forgedLocalPaid.analyzerReceipts[0].familyId}`));
assert.ok(validateAuditCaseExecutionEnvelope(forgedLocalPaid, policy).includes(`envelope_local_assurance_cannot_be_paid_eligible:${forgedLocalPaid.analyzerReceipts[0].familyId}`));
const forgedBlockedReviewer = structuredClone(base);
const reviewer = forgedBlockedReviewer.analyzerReceipts.find((row) => row.familyId === "qualified_manual_review");
reviewer.status = "VERIFIED";
assert.ok(validateAuditCaseExecutionEnvelope(forgedBlockedReviewer, policy).includes("envelope_blocked_policy_family_cannot_verify:qualified_manual_review"));
const receipt = buildAuditEnvelopeVerificationReceipt({ policy, envelope: base, blockers: [] });
assert.equal(receipt.status, "PASS_AUDIT_EXECUTION_ENVELOPE_CONTRACT");
assert.equal(receipt.paidDeliveryAllowed, false);
console.log(JSON.stringify({ status: "PASS", assertions: 13, inventoryFamilies: policy.capabilityInventory.length, executableRunnerFamiliesMissing: policy.capabilityInventory.filter((row) => row.state.startsWith("MISSING_")).length, localHeuristicFamilies: policy.capabilityInventory.filter((row) => row.state === "IMPLEMENTED_LOCAL_HEURISTIC_NOT_BENCHMARKED").length, sellEnabled: false, fullAuditClaimAllowed: false, paidDeliveryPossible: false }, null, 2));
