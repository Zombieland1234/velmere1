import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { executeModelFuzzInvariants, type Pass35A6A08Case } from "../../lib/security/audit-a08-model-fuzz.ts";

const base = JSON.parse(readFileSync("fixtures/pass35/audit-a6/synthetic-a08-model-fuzz-case.json", "utf8")) as Pass35A6A08Case;
let assertions = 0;
const check = (condition: unknown, message: string) => { assertions += 1; assert.ok(condition, message); };
const receipt = executeModelFuzzInvariants(base);
check(receipt.execution.status === "VERIFIED_LOCAL_MODEL_FUZZ", "reference model fuzz should pass");
check(receipt.execution.assuranceClass === "LOCAL_STATE_MODEL_NOT_EVM", "model assurance boundary invalid");
check(receipt.execution.realCaseExecution === false && receipt.execution.paidGateEligible === false, "model fuzz received real/paid credit");
check(receipt.operationCount === 10000 && receipt.iterations === 10000, "iteration count invalid");
check(receipt.invariantChecks > 20000, "invariant check count too low");
check(receipt.invariantFailureCount === 0 && receipt.invariantFailureIds.length === 0, "reference model has invariant failure");
check(receipt.appliedCount > 0 && receipt.rejectedCount > 0, "fuzz distribution did not exercise applied/rejected operations");
check(/^sha256:[a-f0-9]{64}$/u.test(receipt.operationTraceSha256) && /^sha256:[a-f0-9]{64}$/u.test(receipt.receiptSha256), "fuzz digests invalid");
check(receipt.receiptSha256 === executeModelFuzzInvariants(base).receiptSha256, "model fuzz receipt not deterministic");

const mutants: Array<[Pass35A6A08Case["implementationVariant"], string]> = [
  ["MUTANT_UNAUTHORIZED_MINT", "INV_UNAUTHORIZED_MINT_NO_STATE_CHANGE"],
  ["MUTANT_TRANSFER_INFLATES", "INV_TOTAL_SUPPLY_EQUALS_BALANCE_SUM"],
  ["MUTANT_BURN_SUPPLY_DRIFT", "INV_BURN_SUPPLY_DELTA"],
];
for (const [variant, expectedInvariant] of mutants) {
  const mutated = executeModelFuzzInvariants({ ...base, caseRef: `AUD-PASS35-A6-${variant.replaceAll("_", "-")}`, implementationVariant: variant });
  check(mutated.execution.status === "FAILED_INVARIANT", `${variant} was not killed`);
  check(mutated.invariantFailureIds.includes(expectedInvariant), `${variant} missing expected invariant failure`);
  check(mutated.execution.paidGateEligible === false, `${variant} unlocked paid gate`);
}

const badSupply = executeModelFuzzInvariants({ ...base, caseRef: "AUD-PASS35-A6-BADSUPPLY", initialTotalSupply: base.initialTotalSupply + 1 });
check(badSupply.execution.status === "BLOCKED" && badSupply.blockers.includes("a6_a08_initial_supply_mismatch"), "initial supply mismatch not blocked");
const badIterations = executeModelFuzzInvariants({ ...base, caseRef: "AUD-PASS35-A6-BADITER", iterations: 99 });
check(badIterations.blockers.includes("a6_a08_iterations_invalid"), "invalid iteration count not blocked");
const duplicateActors = executeModelFuzzInvariants({ ...base, caseRef: "AUD-PASS35-A6-BADACTORS", actors: ["ACTOR_OWNER", "ACTOR_ALICE", "ACTOR_ALICE"] });
check(duplicateActors.blockers.includes("a6_a08_actor_ids_invalid"), "duplicate actors not blocked");
const fakeReal = executeModelFuzzInvariants({ ...base, caseRef: "AUD-PASS35-A6-FAKEREAL", inputClass: "CUSTOMER_SUPPLIED_VERIFIED" });
check(fakeReal.execution.realCaseExecution === false && fakeReal.execution.paidGateEligible === false, "model-only fuzz became real by relabeling");
check(fakeReal.limitations.some((row: string) => row.includes("not deployed EVM bytecode")), "EVM limitation missing");

console.log(JSON.stringify({ status: "PASS_AUDIT_A6_A08_MODEL_FUZZ", assertions, iterations: receipt.iterations, invariantChecks: receipt.invariantChecks, killedMutants: mutants.length, paidGateEligible: false }, null, 2));
