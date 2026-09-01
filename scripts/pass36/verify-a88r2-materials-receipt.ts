import fs from "node:fs";
import path from "node:path";
import {
  A88R2_REVISION,
  sha256A88R2,
  verifyA88R2Envelope,
  type A88R2SignedEnvelope,
  type A88R2VerificationContext,
} from "../../lib/worldclass/pass36-a88r2-behavioral-verifier.ts";

const root = process.env.VELMERE_A88R2_OUTPUT_DIR?.trim();
if (!root) throw new Error("VELMERE_A88R2_OUTPUT_DIR_required");
const receiptPath = path.join(
  root,
  "PASS36_A88R2_BEHAVIORAL_HANDLER_MUTATION_RECEIPT.json",
);
const keyPath = path.join(root, "LOCAL_TEST_ONLY_A88R2_HMAC_KEY.hex");
const baselinesPath = path.join(
  root,
  "PASS36_A88R2_SANITIZED_SIGNED_BASELINES.json",
);
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const key = Buffer.from(fs.readFileSync(keyPath, "utf8").trim(), "hex");
const baselineEvidence = JSON.parse(fs.readFileSync(baselinesPath, "utf8")) as {
  schemaVersion: string;
  revisionId: string;
  rows: Array<{
    envelope: A88R2SignedEnvelope;
    context: A88R2VerificationContext;
  }>;
};
const failures: string[] = [];
if (receipt.revisionId !== A88R2_REVISION) failures.push("receipt_revision");
if (baselineEvidence.revisionId !== A88R2_REVISION) {
  failures.push("baseline_revision");
}
if (key.length !== 32) failures.push("local_test_key_length");
if (
  receipt.bindings?.supportBindings?.localTestKeySha256 !==
  sha256A88R2(fs.readFileSync(keyPath))
) {
  failures.push("local_test_key_digest");
}
if (
  receipt.bindings?.supportBindings?.baselineEvidenceSha256 !==
  sha256A88R2(fs.readFileSync(baselinesPath))
) {
  failures.push("baseline_evidence_digest");
}
if (
  receipt.bindings?.supportBindings?.baselineEvidenceRows !==
    baselineEvidence.rows.length ||
  baselineEvidence.rows.length !==
    receipt.denominator?.actualHandlerExecutions
) {
  failures.push("baseline_denominator");
}
let verified = 0;
for (const row of baselineEvidence.rows) {
  const result = verifyA88R2Envelope(row.envelope, key, row.context);
  if (result.passed) verified += 1;
}
if (verified !== baselineEvidence.rows.length) {
  failures.push("baseline_signature_or_behavior");
}
if (
  receipt.observed?.reSignedSemanticMutationsKilled !==
    receipt.denominator?.reSignedSemanticMutations ||
  receipt.observed?.mutationSignatureFailures !== 0 ||
  receipt.observed?.baselineFailures !== 0 ||
  receipt.observed?.independentOracleFailures !== 0
) {
  failures.push("mutation_or_oracle_counts");
}
if (
  receipt.executionTruth?.actualExternalProviderCalls !== 0 ||
  receipt.executionTruth?.actualModelCalls !== 0 ||
  receipt.executionTruth?.publicRouteDispatcherExecutions !== 0 ||
  receipt.executionTruth?.live !== false ||
  receipt.executionTruth?.saleEnabled !== false
) {
  failures.push("truth_boundary");
}
const result = {
  status: failures.length
    ? "FAIL_A88R2_MATERIALS_RECEIPT"
    : "PASS_A88R2_MATERIALS_RECEIPT_LOCAL_REPRODUCIBILITY_NO_AUTHENTICITY_CREDIT",
  verifiedBaselines: verified,
  requiredBaselines: baselineEvidence.rows.length,
  failures,
  authenticityCredit: false,
  externalIndependentAssurance: false,
};
console.log(JSON.stringify(result));
if (failures.length) process.exitCode = 1;
