#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { executeForkReplayAdapter } from "./audit-fork-replay-adapter.mjs";
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const inputPath = "fixtures/pass35/audit-a7/fork-replay/synthetic-fork-replay-case.json";
const base = readJson(inputPath);
const baseTool = readJson("fixtures/pass35/audit-a7/fork-replay/fake-fork-tool.json");
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
const run = (toolPatch = {}, inputPatchValue = {}) => executeForkReplayAdapter({
  rootPath: process.cwd(),
  casePath: inputPath,
  caseInput: { ...structuredClone(base), ...inputPatchValue },
  toolSpec: { ...structuredClone(baseTool), ...toolPatch },
});
const reference = run();
check(reference.status === "VERIFIED" && reference.blockers.length === 0, "reference replay must verify");
check(reference.replay.transactionCount === 2 && reference.replay.assertionCount === 5, "reference counts invalid");
check(reference.replay.successfulTransactions === 1 && reference.replay.revertedTransactions === 1, "transaction status summary invalid");
check(reference.replay.passedAssertions === 5, "assertion pass summary invalid");
check(reference.target.chainId === "1" && reference.target.blockNumber === "19400000", "chain/block binding missing");
check(reference.target.blockHash === base.blockHash && reference.target.preStateRoot === base.preStateRoot, "snapshot binding missing");
check(reference.replay.observedPostStateRoot === base.expectedPostStateRoot, "post-state binding missing");
check(reference.toolBinding.rawOutputSha256?.startsWith("sha256:") && reference.toolBinding.entrypointSha256?.startsWith("sha256:"), "tool/raw digest missing");
check(reference.realCaseExecution === false && reference.paidGateEligible === false && reference.fullAuditClaimAllowed === false, "fixture unlocked real/paid/full claim");
check(!JSON.stringify(reference).includes(process.cwd()), "receipt leaked absolute workspace path");
check(run().receiptSha256 === reference.receiptSha256, "reference receipt must be deterministic");
const mutations = [
  ["WRONG_CHAIN", "a7_fork_chain_id_mismatch"],
  ["WRONG_BLOCK_HASH", "a7_fork_block_hash_mismatch"],
  ["PRE_STATE_DRIFT", "a7_fork_pre_state_root_mismatch"],
  ["POST_STATE_DRIFT", "a7_fork_post_state_root_mismatch"],
  ["TX_FAILURE", "a7_fork_transaction_failure"],
  ["ASSERTION_FAILURE", "a7_fork_assertion_failure"],
  ["DROP_TRANSACTION", "a7_fork_transaction_count_mismatch"],
];
for (const [variant, blocker] of mutations) {
  const receipt = run({ fixtureVariant: variant });
  check(receipt.status === "BLOCKED" && receipt.blockers.includes(blocker), `${variant} mutation not killed`);
}
const relabeled = run({}, {
  inputClass: "CUSTOMER_SUPPLIED_VERIFIED",
  forkProviderEndpointClass: "PRODUCTION",
  forkProviderCommercialRightsEvidenceSha256: `sha256:${"e".repeat(64)}`,
});
check(relabeled.status === "BLOCKED" && relabeled.blockers.includes("a7_fork_real_case_requires_native_tool"), "fixture relabel must block");
check(relabeled.realCaseExecution === false && relabeled.paidGateEligible === false, "fixture relabel received credit");
const badEntrypoint = run({ expectedEntrypointSha256: `sha256:${"0".repeat(64)}` });
check(badEntrypoint.blockers.includes("a7_fork_entrypoint_digest_mismatch"), "entrypoint mismatch not blocked");
const badCase = structuredClone(base); badCase.requiredAssertions[0].expectedObservationSha256 = "not-a-digest";
const badInputReceipt = executeForkReplayAdapter({ rootPath: process.cwd(), casePath: inputPath, caseInput: badCase, toolSpec: baseTool });
check(badInputReceipt.blockers.includes("a7_fork_assertion_digest_invalid"), "invalid assertion digest not blocked");
check(/^sha256:[a-f0-9]{64}$/u.test(reference.receiptSha256), "receipt digest invalid");
console.log(JSON.stringify({ status: "PASS_AUDIT_A7_FORK_REPLAY_ADAPTER", assertions, mutationVariants: mutations.length, killedMutations: mutations.length, paidGateEligible: false, receiptSha256: reference.receiptSha256 }, null, 2));
