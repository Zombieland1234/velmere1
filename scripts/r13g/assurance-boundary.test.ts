import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { disassembleBytecode, buildControlFlowGraph } from "../../lib/security/v2/evm-cfg-dataflow-engine";
import { executeBoundedSymbolicAnalysis } from "../../lib/security/v2/symbolic-formal-engine";
import { validateRemediationPatch } from "../../lib/security/v2/patch-validation-engine";
import { executeFullAuditV2 } from "../../lib/security/v2/master-audit-orchestrator";
import type { StandardFindingV2 } from "../../lib/security/v2/types";

const target = "0x0000000000000000000000000000000000000001";
for (const bytecode of ["0x", "0x00", "0x600160020100", "0x60006000fd", "0xfe", "0x5b600056"]) {
  test(`no invented solver proof for ${bytecode}`, () => {
    const graph = buildControlFlowGraph(disassembleBytecode(bytecode).instructions);
    const result = executeBoundedSymbolicAnalysis(graph.cfg, target);
    assert.ok(result.formalAssurance.length > 0);
    for (const proof of result.formalAssurance) {
      assert.equal(proof.proven, false);
      assert.equal(proof.status, "NOT_RUN");
      assert.equal(proof.solver, "NOT_EXECUTED");
    }
  });
}
function finding(id: string, diff: string): StandardFindingV2 {
  return { findingId: id, remediation: { solidityPatchDiff: diff } } as StandardFindingV2;
}
for (const id of ["OTHER", "REENTRANCY", "ORACLE", "TXORIGIN", "SELFDESTRUCT", "VAULT-INFLATION"]) {
  test(`text patch cannot prove ${id}`, () => {
    const result = validateRemediationPatch(finding(id, "- old\n+ nonReentrant msg.sender TWAP virtualShares"), "contract Target {}");
    assert.equal(result.validationStatus, "INCONCLUSIVE");
    for (const key of ["patchApplied", "compilationClean", "vulnerabilityEliminated", "allInvariantsSatisfied"] as const) assert.equal(result[key], false);
    assert.equal(result.validationScope, "TEXT_PREFLIGHT_ONLY");
    assert.ok(result.evidenceMissing.includes("compiler_receipt"));
  });
}
for (const diff of ["", "--- old\n+++ new", "// x + y", "+   "]) {
  test(`no meaningful edit: ${JSON.stringify(diff)}`, () => {
    assert.equal(validateRemediationPatch(finding("OTHER", diff), "contract Target {}").validationStatus, "FAILED");
  });
}
test("missing source remains inconclusive and explicitly missing", () => {
  const result = validateRemediationPatch(finding("OTHER", "+ candidate"));
  assert.equal(result.validationStatus, "INCONCLUSIVE");
  assert.ok(result.evidenceMissing.includes("original_source"));
  assert.equal(result.patchApplied, false);
});
test("assessment digest is SHA-256 and content bound, not diff length", () => {
  const a = validateRemediationPatch(finding("OTHER", "+ aaa"), "source A");
  const b = validateRemediationPatch(finding("OTHER", "+ bbb"), "source A");
  const c = validateRemediationPatch(finding("OTHER", "+ aaa"), "source B");
  assert.match(a.validationProofDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.notEqual(a.validationProofDigest, b.validationProofDigest);
  assert.notEqual(a.validationProofDigest, c.validationProofDigest);
  assert.equal(a.validationProofDigest, validateRemediationPatch(finding("OTHER", "+ aaa"), "source A").validationProofDigest);
  assert.equal(createHash("sha256").digest("hex").length, 64);
});
for (const tier of ["BASIC", "PRO", "ADVANCED"] as const) {
  test(`${tier} orchestrator never upgrades missing solver or patch execution`, () => {
    const result = executeFullAuditV2({ contractAddress: target, chainId: "1", blockNumber: 1, bytecode: "0x60006000f160005500", sourceCode: "contract X { function withdraw() external { msg.sender.call(''); } }", tier });
    assert.ok(result.formalAssurance.every((p) => !p.proven && p.status === "NOT_RUN"));
    assert.equal(result.patchValidation.patchesPassingRegression, 0);
    assert.ok(result.findings.every((f) => f.remediation?.appliedSuccessfully !== true && f.remediation?.regressionPassed !== true));
  });
}
