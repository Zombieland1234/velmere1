#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  evaluateExternalEvidenceIntake,
  loadExternalEvidenceIntakePolicy,
} from "./external-evidence-intake.mjs";

const NOW = "2026-07-22T12:00:00.000Z";
const H = (character) => character.repeat(64);
const policy = loadExternalEvidenceIntakePolicy(process.cwd());

function record(overrides = {}) {
  const workstreamId = overrides.workstreamId ?? "MERCHANT_LEGAL_FIELDS";
  const variants = {
    MERCHANT_LEGAL_FIELDS: ["merchant-legal:field-01", "EXTERNAL_LEGAL_REVIEW", "INDEPENDENT_LEGAL_REVIEWER"],
    PROVIDER_COMMERCIAL_RIGHTS: ["provider-rights:provider-01", "EXTERNAL_PROVIDER_CONTRACT", "PROVIDER_RIGHTS_HOLDER"],
    STAGING_RLS_REAL_REPLAYS: ["staging-rls:replay-01", "EXTERNAL_STAGING", "INDEPENDENT_TEST_OPERATOR"],
  };
  const [workstreamItemId, environment, issuerType] = variants[workstreamId] ?? variants.MERCHANT_LEGAL_FIELDS;
  return {
    evidenceId: `external-evidence:${workstreamId.toLowerCase()}:0001`,
    workstreamId,
    workstreamItemId,
    evidenceKind: "REAL_EXTERNAL",
    environment,
    sourceUri: "https://evidence.vendor.invalid/immutable/document/0001",
    sourceSha256: H("a"),
    issuedAt: "2026-07-22T11:00:00.000Z",
    expiresAt: "2026-07-22T13:00:00.000Z",
    ttlSeconds: 7200,
    subjectOrganizationId: "organization:velmere-subject",
    issuer: {
      issuerId: "issuer:external-authority-0001",
      organizationId: "organization:external-authority-0001",
      organizationName: "Independent External Authority",
      issuerType,
      independent: true,
      conflictDeclared: false
    },
    signatureReference: {
      referenceUri: "https://evidence.vendor.invalid/signatures/0001",
      algorithm: "ED25519",
      keyId: "key:external-authority-0001",
      signatureSha256: H("b"),
      signedPayloadSha256: H("a"),
      verificationReceiptSha256: H("c"),
      verifiedAt: "2026-07-22T11:05:00.000Z",
      verificationStatus: "EXTERNAL_REFERENCE_REPORTED_VERIFIED"
    },
    fixture: false,
    synthetic: false,
    locallyAuthored: false,
    unsigned: false,
    ...overrides,
  };
}

function envelope(evidence = [record()]) {
  return {
    schemaVersion: "velmere.pass35.external-evidence-intake.v1",
    candidateId: "VELMERE_PASS35_OFFLINE_CANDIDATE_R3",
    batchId: "external-batch:20260722-0001",
    evidence,
  };
}

function evaluate(value) {
  return evaluateExternalEvidenceIntake(value, { evaluatedAt: NOW, policy });
}

function rejectMutation(name, mutate, expectedBlocker) {
  const input = envelope();
  mutate(input);
  const result = evaluate(input);
  assert.equal(result.batchAccepted, false, name);
  assert.equal(result.verifiedDenominatorIncrement, 0, `${name}:denominator`);
  assert.equal(result.promotionAllowed, false, `${name}:promotion`);
  const blockers = [...result.envelopeBlockers, ...result.records.flatMap((item) => item.blockers)];
  assert.ok(blockers.some((item) => item.includes(expectedBlocker)), `${name}:${expectedBlocker}:${blockers.join("|")}`);
}

const valid = evaluate(envelope());
assert.equal(valid.batchAccepted, true);
assert.equal(valid.intakeEligibleCount, 1);
assert.equal(valid.verifiedDenominatorIncrement, 0);
assert.equal(valid.promotionAllowed, false);
assert.equal(valid.globalExternalEvidenceDenominator, 3074);
assert.equal(valid.scopedRequiredCount, 66);

const exactWorkstreams = ["PROVIDER_COMMERCIAL_RIGHTS", "MERCHANT_LEGAL_FIELDS", "STAGING_RLS_REAL_REPLAYS"].map((workstreamId, index) => record({
  workstreamId,
  evidenceId: `external-evidence:exact-workstream:${index + 1}`,
}));
const exactResult = evaluate(envelope(exactWorkstreams));
assert.equal(exactResult.batchAccepted, true);
assert.equal(exactResult.intakeEligibleCount, 3);
assert.equal(exactResult.verifiedDenominatorIncrement, 0);

rejectMutation("fixture", (input) => { input.evidence[0].fixture = true; }, "fixture_must_be_false");
rejectMutation("synthetic", (input) => { input.evidence[0].synthetic = true; }, "synthetic_must_be_false");
rejectMutation("local", (input) => { input.evidence[0].locallyAuthored = true; }, "locally_authored_must_be_false");
rejectMutation("unsigned", (input) => { input.evidence[0].unsigned = true; }, "unsigned_must_be_false");
rejectMutation("local-uri", (input) => { input.evidence[0].sourceUri = "http://localhost/receipt"; }, "source_uri_not_external");
rejectMutation("unknown-workstream", (input) => { input.evidence[0].workstreamId = "CANONICAL_PROVIDER_BOUND_ROWS"; }, "workstream_not_supported_exactly");
rejectMutation("bad-item", (input) => { input.evidence[0].workstreamItemId = "wrong:item-01"; }, "workstream_item_id_invalid");
rejectMutation("bad-hash", (input) => { input.evidence[0].sourceSha256 = "not-a-hash"; }, "source_sha256_invalid");
rejectMutation("expired", (input) => { input.evidence[0].issuedAt = "2026-07-22T09:00:00.000Z"; input.evidence[0].expiresAt = "2026-07-22T11:00:00.000Z"; }, "evidence_expired");
rejectMutation("ttl-binding", (input) => { input.evidence[0].expiresAt = "2026-07-22T14:00:00.000Z"; }, "ttl_expiry_binding_invalid");
rejectMutation("future", (input) => { input.evidence[0].issuedAt = "2026-07-22T13:00:00.000Z"; input.evidence[0].expiresAt = "2026-07-22T15:00:00.000Z"; }, "issued_in_future");
rejectMutation("self-issued", (input) => { input.evidence[0].issuer.organizationId = input.evidence[0].subjectOrganizationId; }, "issuer_same_as_subject");
rejectMutation("not-independent", (input) => { input.evidence[0].issuer.independent = false; }, "issuer_not_independent");
rejectMutation("signature-missing", (input) => { delete input.evidence[0].signatureReference; }, "signature_reference_not_object");
rejectMutation("signature-payload", (input) => { input.evidence[0].signatureReference.signedPayloadSha256 = H("d"); }, "signature_payload_not_source_bound");
rejectMutation("signature-local", (input) => { input.evidence[0].signatureReference.referenceUri = "file:///tmp/signature"; }, "signature_reference_uri_not_external");
rejectMutation("unknown-field", (input) => { input.evidence[0].promotionAllowed = true; }, "unknown_field:promotionAllowed");
rejectMutation("wrong-candidate", (input) => { input.candidateId = "VELMERE_PASS35_OFFLINE_CANDIDATE_R1"; }, "intake:candidate_invalid");
rejectMutation("duplicate-item", (input) => { input.evidence.push(structuredClone(input.evidence[0])); input.evidence[1].evidenceId = "external-evidence:duplicate-item:0002"; }, "duplicate_workstream_item");

const cliDirectory = mkdtempSync(path.join(tmpdir(), "pass35-external-intake-"));
try {
  const cliInput = path.join(cliDirectory, "intake.json");
  writeFileSync(cliInput, `${JSON.stringify(envelope(), null, 2)}\n`, { mode: 0o600 });
  const cli = spawnSync(process.execPath, [
    path.join(process.cwd(), "scripts/pass35/external-evidence-intake.mjs"),
    cliInput,
    "--at",
    NOW,
  ], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  const cliResult = JSON.parse(cli.stdout);
  assert.equal(cliResult.batchAccepted, true);
  assert.equal(cliResult.verifiedDenominatorIncrement, 0);
  assert.equal(cliResult.promotionAllowed, false);
  assert.deepEqual(readdirSync(cliDirectory), ["intake.json"]);
} finally {
  rmSync(cliDirectory, { recursive: true, force: true });
}

console.log(JSON.stringify({
  status: "PASS",
  validCases: 2,
  mutationCases: 19,
  cliReadOnlyCases: 1,
  assertions: 87,
  verifiedDenominatorIncrement: 0,
  promotionAllowed: false,
}, null, 2));
