import assert from "node:assert/strict";
import { auditAndSanitizeReportLines } from "../../lib/security/evidence/claim-audit-blocker";
import type { EvidenceRecord } from "../../lib/security/evidence/evidence-record";

function evidence(overrides: Partial<EvidenceRecord>): EvidenceRecord {
  return {
    id: "EV-R10-TEST",
    auditId: "AUDIT-R10-TEST",
    category: "SYSTEM",
    status: "PASS",
    method: "AUTOMATED_EXECUTION",
    source: "r10 regression fixture",
    tool: "velmere-test",
    timestamp: "2026-09-11T00:00:00.000Z",
    inputHash: "a".repeat(64),
    outputHash: "b".repeat(64),
    ...overrides,
  };
}

function one(line: string, records: EvidenceRecord[]) {
  return auditAndSanitizeReportLines([line], records);
}

// Regression for the R9/R10 discovery: category presence alone must never verify a claim.
{
  const result = one("Full SMT Z3 Solver Verification", [
    evidence({
      id: "EV-FORMAL-NOT-RUN",
      category: "FORMAL",
      status: "NOT_RUN",
      method: "FORMALLY_PROVEN",
      tool: "z3",
    }),
  ]);
  assert.equal(result.findings[0]?.action, "REWRITTEN");
  assert.match(result.sanitizedLines[0] ?? "", /NOT VERIFIED FOR THIS SCOPE/i);
}

// PASS is necessary but not sufficient for a formal claim: method/tool provenance matters.
{
  const result = one("Full SMT Z3 Solver Verification", [
    evidence({
      id: "EV-FORMAL-HEURISTIC",
      category: "FORMAL",
      status: "PASS",
      method: "AUTOMATED_EXECUTION",
      tool: "bounded-cfg-engine",
    }),
  ]);
  assert.equal(result.findings[0]?.action, "REWRITTEN");
}

// Exact formal evidence may authorize the bounded formal wording.
{
  const result = one("Full SMT Z3 Solver Verification", [
    evidence({
      id: "EV-FORMAL-Z3-PASS",
      category: "FORMAL",
      status: "PASS",
      method: "FORMALLY_PROVEN",
      tool: "z3",
      command: "z3 proof.smt2",
    }),
  ]);
  assert.equal(result.findings[0]?.action, "VERIFIED");
  assert.equal(result.findings[0]?.evidenceId, "EV-FORMAL-Z3-PASS");
}

// Human category alone must not authorize a human-reviewed claim.
{
  const result = one("HUMAN REVIEWED", [
    evidence({
      id: "EV-HUMAN-INCOMPLETE",
      category: "HUMAN_REVIEW",
      status: "PASS",
      method: "AUTOMATED_EXECUTION",
    }),
  ]);
  assert.equal(result.findings[0]?.action, "REWRITTEN");
}

// A confirmed human receipt with reviewer identity may authorize it.
{
  const result = one("HUMAN REVIEWED", [
    evidence({
      id: "EV-HUMAN-CONFIRMED",
      category: "HUMAN_REVIEW",
      status: "PASS",
      method: "HUMAN_VERIFIED",
      reviewerId: "reviewer-fixture",
      reviewStatus: "CONFIRMED",
    }),
  ]);
  assert.equal(result.findings[0]?.action, "VERIFIED");
}

// A local SHA receipt is not an RFC 3161 TSA token.
{
  const result = one("RFC 3161 Trusted Timestamp", [
    evidence({
      id: "EV-CRYPTO-LOCAL",
      category: "CRYPTOGRAPHIC",
      status: "PASS",
      method: "CALCULATED",
      tool: "sha256",
      source: "local deterministic digest",
    }),
  ]);
  assert.equal(result.findings[0]?.action, "REWRITTEN");
}

// An observed external TSA token can support RFC 3161 wording.
{
  const result = one("RFC 3161 Trusted Timestamp", [
    evidence({
      id: "EV-CRYPTO-TSA",
      category: "CRYPTOGRAPHIC",
      status: "PASS",
      method: "OBSERVED",
      tool: "RFC3161 verifier",
      source: "external TSA TimeStampToken",
    }),
  ]);
  assert.equal(result.findings[0]?.action, "VERIFIED");
}

// Absolute safety claims are never authorized by a generic evidence record.
{
  const result = one("100% SECURE", [
    evidence({ category: "VULNERABILITY", status: "PASS" }),
  ]);
  assert.equal(result.findings[0]?.action, "REWRITTEN");
}

console.log("R10 claim-audit-blocker evidence-status regression: PASS");
