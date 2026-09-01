#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { evaluateAssuranceCustomerEvidence, loadAssuranceCustomerPolicy } from "./assurance-customer-evidence.mjs";

const policy = loadAssuranceCustomerPolicy();
const NOW = "2026-07-22T12:00:00.000Z";
const H = (character) => character.repeat(64);

function common(index) {
  return {
    sourceUri: `https://evidence.external.invalid/artifacts/${index}`,
    artifactSha256: H(index % 2 ? "a" : "b"),
    issuedAt: "2026-07-01T00:00:00.000Z",
    expiresAt: "2026-09-29T00:00:00.000Z",
    ttlSeconds: 7776000,
    fixture: false,
    synthetic: false,
    locallyAuthored: false,
    issuer: { issuerIdHash: H("c"), organizationIdHash: H(index % 2 ? "d" : "e"), independent: true, conflictOfInterest: false },
    signatureReference: {
      referenceUri: `https://signatures.external.invalid/${index}`,
      algorithm: "ED25519",
      keyId: `external:key:${String(index).padStart(4, "0")}`,
      signatureSha256: H("f"),
      signedPayloadSha256: H(index % 2 ? "a" : "b"),
      verificationReceiptSha256: H("1"),
      verifiedAt: "2026-07-01T01:00:00.000Z",
      verificationStatus: "EXTERNAL_REFERENCE_REPORTED_VERIFIED",
    },
  };
}

function baseline() {
  const assuranceReports = policy.requiredAssuranceReportTypes.map((reportType, index) => ({
    reportId: `assurance:report:${String(index + 1).padStart(2, "0")}`,
    reportType,
    framework: `${reportType} independent framework`,
    scope: "exact PASS35 candidate and release boundary",
    verdict: "PASS_WITH_NO_OPEN_RELEASE_BLOCKERS",
    openCriticalFindings: 0,
    openHighFindings: 0,
    findingRegisterSha256: H("2"),
    ...common(index + 1),
  }));
  const customerCohorts = [1, 2].map((index) => ({
    cohortId: `customer:cohort:${String(index).padStart(2, "0")}`,
    customerOrganizationIdHash: H(index === 1 ? "3" : "4"),
    realCustomers: true,
    consentVerified: true,
    consentRegisterSha256: H("5"),
    participantCount: 10,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-07-15T00:00:00.000Z",
    retentionWindowDays: 30,
    outcome: { metricId: "customer:time-to-decision", direction: "LOWER_IS_BETTER", unit: "minutes", baseline: 120, followup: 60, threshold: 90, targetMet: true, observationCount: 10, evidenceSha256: H("6") },
    operations: { retainedCount: 8, supportTicketCount: 2, refundCount: 1, incidentCount: 0, evidenceSha256: H("7") },
    stopRule: { triggered: false, decision: "CONTINUE", reason: "pre-registered threshold met", evidenceSha256: H("8") },
    ...common(index + 10),
  }));
  return {
    schemaVersion: "velmere.pass35.assurance-customer-evidence.v1",
    candidateId: policy.candidateId,
    subjectOrganizationIdHash: H("9"),
    sourceArchiveSha256: H("a"),
    evidenceIndexSha256: H("b"),
    evidenceClass: "REAL_EXTERNAL",
    fixture: false,
    synthetic: false,
    assuranceReports,
    customerCohorts,
  };
}

function evaluate(value) {
  return evaluateAssuranceCustomerEvidence(value, { now: NOW, policy });
}

const pass = evaluate(baseline());
assert.equal(pass.structurallyEligible, true, pass.errors.join("\n"));
assert.equal(pass.status, "PASS_METADATA_STRUCTURE_REQUIRES_CRYPTOGRAPHIC_VERIFICATION");
assert.equal(pass.assuranceReports.structurallyEligible, 4);
assert.equal(pass.customerCohorts.structurallyEligible, 2);
assert.equal(pass.assuranceReports.verified, 0);
assert.equal(pass.customerCohorts.verified, 0);
assert.equal(pass.verifiedDenominatorIncrement, 0);
assert.equal(pass.promotionAllowed, false);

const mutations = [
  ["missing-report", (value) => value.assuranceReports.pop(), "assurance:report_count_not_exact"],
  ["duplicate-report-type", (value) => { value.assuranceReports[1].reportType = value.assuranceReports[0].reportType; }, "duplicate_report_type"],
  ["open-critical", (value) => { value.assuranceReports[0].openCriticalFindings = 1; }, "critical_findings_open"],
  ["fixture-report", (value) => { value.assuranceReports[0].fixture = true; }, "fixture_must_be_false"],
  ["local-source", (value) => { value.assuranceReports[0].sourceUri = "http://localhost/report"; }, "source_uri_not_external"],
  ["self-issued", (value) => { value.assuranceReports[0].issuer.organizationIdHash = value.subjectOrganizationIdHash; }, "issuer_not_independent_from_subject"],
  ["unbound-signature", (value) => { value.assuranceReports[0].signatureReference.signedPayloadSha256 = H("0"); }, "signature_payload_not_bound"],
  ["expired", (value) => { value.assuranceReports[0].expiresAt = "2026-07-21T00:00:00.000Z"; value.assuranceReports[0].ttlSeconds = 1728000; }, "expired"],
  ["one-cohort", (value) => value.customerCohorts.pop(), "cohorts:count_not_exact"],
  ["fake-customer", (value) => { value.customerCohorts[0].realCustomers = false; }, "real_customers_not_confirmed"],
  ["missing-consent", (value) => { value.customerCohorts[0].consentVerified = false; }, "consent_not_verified"],
  ["short-retention", (value) => { value.customerCohorts[0].retentionWindowDays = 7; }, "retention_window_too_short"],
  ["observation-mismatch", (value) => { value.customerCohorts[0].outcome.observationCount = 9; }, "outcome_observation_count_mismatch"],
  ["refund-overflow", (value) => { value.customerCohorts[0].operations.refundCount = 11; }, "refund_count_exceeds_cohort"],
  ["trigger-continue", (value) => { value.customerCohorts[0].stopRule.triggered = true; }, "triggered_stop_rule_cannot_continue"],
  ["duplicate-customer", (value) => { value.customerCohorts[1].customerOrganizationIdHash = value.customerCohorts[0].customerOrganizationIdHash; }, "customer_organization_duplicate"],
  ["unknown-field", (value) => { value.customerCohorts[0].participantEmails = ["hidden@example.invalid"]; }, "unknown_field:participantEmails"],
];

for (const [name, mutate, blocker] of mutations) {
  const value = baseline();
  mutate(value);
  const result = evaluate(value);
  assert.equal(result.structurallyEligible, false, name);
  assert.equal(result.status, "FAIL_CLOSED_ZERO_CREDIT", name);
  assert.equal(result.verifiedDenominatorIncrement, 0, name);
  assert.equal(result.promotionAllowed, false, name);
  assert(result.errors.some((error) => error.includes(blocker)), `${name}:${blocker}:${result.errors.join("|")}`);
}

const temp = mkdtempSync(path.join(tmpdir(), "velmere-pass35-assurance-customer-"));
try {
  const input = path.join(temp, "input.json");
  writeFileSync(input, `${JSON.stringify(baseline(), null, 2)}\n`, { mode: 0o600 });
  const cli = spawnSync(process.execPath, [path.resolve("scripts/pass35/assurance-customer-evidence.mjs"), "--input", input, "--now", NOW], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  const output = JSON.parse(cli.stdout);
  assert.equal(output.structurallyEligible, true);
  assert.equal(output.verifiedDenominatorIncrement, 0);
  assert.deepEqual(readdirSync(temp), ["input.json"]);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log(JSON.stringify({ status: "PASS", structuralCases: 1, failClosedMutations: mutations.length, verifiedDenominatorIncrement: 0, promotionAllowed: false }, null, 2));
