import assert from "node:assert/strict";
import {
  validateClaimIntegrity,
  type ClaimObject,
  type EvidenceObject,
} from "../../lib/security/evidence/claim-evidence-model";

function claim(overrides: Partial<ClaimObject> = {}): ClaimObject {
  return {
    claim_id: "CLM-TEST-000001",
    asset_id: "ASSET-1",
    subject: "test subject",
    statement: "test statement",
    classification: "A",
    status: "verified",
    evidence_ids: ["EVD-TEST-000001"],
    confidence: 95,
    created_at: "2026-09-11T00:00:00.000Z",
    ...overrides,
  };
}

function evidence(overrides: Partial<EvidenceObject> = {}): EvidenceObject {
  return {
    evidence_id: "EVD-TEST-000001",
    claim_id: "CLM-TEST-000001",
    asset_id: "ASSET-1",
    asset_class: "EVM_CONTRACT",
    chain_or_market: "ethereum",
    source_type: "verified_solidity_source",
    source_uri: "fixture://source",
    source_provider: "test",
    retrieved_at: "2026-09-11T00:00:00.000Z",
    snapshot_id: "snapshot-1",
    block_number: null,
    transaction_hash: null,
    contract_address: null,
    symbol: null,
    raw_input_hash: "a".repeat(64),
    normalized_input_hash: "b".repeat(64),
    analysis_version: "r10-test",
    ruleset_version: "r10-test",
    result_hash: "c".repeat(64),
    status: "verified",
    reproducible: true,
    notes: "fixture",
    ...overrides,
  };
}

{
  const ev = evidence();
  const result = validateClaimIntegrity(claim(), new Map([[ev.evidence_id, ev]]));
  assert.equal(result.isValid, true, result.violations.join("\n"));
}

{
  const ev = evidence({ claim_id: "CLM-OTHER" });
  const result = validateClaimIntegrity(claim(), new Map([[ev.evidence_id, ev]]));
  assert.equal(result.isValid, false);
  assert(result.violations.some((v) => /bound to claim/i.test(v)));
}

{
  const ev = evidence({ asset_id: "ASSET-OTHER" });
  const result = validateClaimIntegrity(claim(), new Map([[ev.evidence_id, ev]]));
  assert.equal(result.isValid, false);
  assert(result.violations.some((v) => /bound to asset/i.test(v)));
}

{
  const ev = evidence({ status: "unverified" });
  const result = validateClaimIntegrity(claim(), new Map([[ev.evidence_id, ev]]));
  assert.equal(result.isValid, false);
  assert(result.violations.some((v) => /cannot authorize/i.test(v)));
}

{
  const ev = evidence({ reproducible: false });
  const result = validateClaimIntegrity(claim(), new Map([[ev.evidence_id, ev]]));
  assert.equal(result.isValid, false);
  assert(result.violations.some((v) => /not reproducible/i.test(v)));
}

{
  const ev = evidence({
    source_type: "simulated_fixture",
    asset_class: "SIMULATED_FIXTURE",
    status: "fixture",
  });
  const result = validateClaimIntegrity(claim(), new Map([[ev.evidence_id, ev]]));
  assert.equal(result.isValid, false);
  assert(result.violations.some((v) => /Simulated fixture/i.test(v)));
}

{
  const ev = evidence({ status: "verified" });
  const derived = claim({ classification: "B", status: "verified" });
  const result = validateClaimIntegrity(derived, new Map([[ev.evidence_id, ev]]));
  assert.equal(result.isValid, false);
  assert(result.violations.some((v) => /must be labeled 'derived'/i.test(v)));
}

{
  const ev = evidence({ status: "verified" });
  const derived = claim({ classification: "B", status: "derived" });
  const result = validateClaimIntegrity(derived, new Map([[ev.evidence_id, ev]]));
  assert.equal(result.isValid, true, result.violations.join("\n"));
}

console.log("R10 claim-evidence binding regression: PASS");
