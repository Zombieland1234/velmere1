#!/usr/bin/env node
const { auditAndSanitizeReportLines } = await import("../../lib/security/evidence/claim-audit-blocker.ts");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const scope = { auditId: "audit-1", commitHash: "abc" };
const base = {
  id: "ev-1",
  auditId: "audit-1",
  category: "CRYPTOGRAPHIC",
  status: "PASS",
  method: "OBSERVED",
  source: "no external TSA; RFC 3161 not available",
  tool: "local-integrity",
  timestamp: new Date().toISOString(),
  inputHash: "a".repeat(64),
  outputHash: "b".repeat(64),
  commitHash: "abc",
};

const bad = auditAndSanitizeReportLines(
  ["RFC 3161 verified timestamp"],
  [{ ...base, normalizedArtifact: { note: "TimeStampToken absent; no external TSA" } }],
  scope,
);
assert(bad.rewrittenCount === 1, "keyword_only_evidence_must_not_verify_rfc3161");
assert(bad.findings[0]?.action === "REWRITTEN", "keyword_only_action_must_be_rewritten");

const wrongScope = auditAndSanitizeReportLines(
  ["RFC3161 verified timestamp"],
  [{
    ...base,
    auditId: "audit-other",
    normalizedArtifact: {
      timeStampTokenPresent: true,
      timeStampTokenSha256: "c".repeat(64),
      messageImprintSha256: "d".repeat(64),
      signatureVerified: true,
      tsaCertificateValidated: true,
      policyOid: "1.2.3.4.5",
    },
  }],
  scope,
);
assert(wrongScope.rewrittenCount === 1, "wrong_scope_must_not_verify_rfc3161");

const good = auditAndSanitizeReportLines(
  ["RFC 3161 verified timestamp"],
  [{
    ...base,
    normalizedArtifact: {
      timeStampTokenPresent: true,
      timeStampTokenSha256: "c".repeat(64),
      messageImprintSha256: "d".repeat(64),
      signatureVerified: true,
      tsaCertificateValidated: true,
      policyOid: "1.2.3.4.5",
    },
  }],
  scope,
);
assert(good.rewrittenCount === 0, "complete_exact_scope_structural_receipt_should_verify");
assert(good.findings[0]?.action === "VERIFIED", "complete_receipt_action_must_be_verified");

console.log(JSON.stringify({ status: "PASS", checks: 6 }, null, 2));
