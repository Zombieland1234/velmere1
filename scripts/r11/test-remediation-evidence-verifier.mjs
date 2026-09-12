#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { verifyRemediationEvidence } from "./verify-remediation-evidence.mjs";

function assertThrows(fn, expected) {
  let message = "";
  try { fn(); } catch (error) { message = String(error?.message || error); }
  if (!message.includes(expected)) throw new Error(`expected_throw:${expected}:got:${message}`);
}

const sha = "a".repeat(40);
const fixtureFingerprint = "71a68559119629d989386448adad9d5920e7e8e83fb7f55282d9ef9fcc7051cf";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-evidence-eval-"));
const write = (name, value) => fs.writeFileSync(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`);

const receipt = {
  sourceSha: sha,
  evidenceClass: "CURRENT_GIT_PROVEN_REMEDIATION",
  coveredFindings: ["VA-F01", "VA-F10"],
  p0RegressionCanaries: "PASS",
  npmAuditVerifier: "FAIL_CLOSED",
  secretFixtureBoundary: "PASS_EXACT_PATH_RULE_FINGERPRINT_AND_ENV",
  typecheck: "PASS",
  securityRegression: "PASS",
  sourceTruthScan: "PASS",
  productionBuild: "PASS",
};
write("RECEIPT.json", receipt);
write("NPM_AUDIT_VERDICT.json", {
  schemaVersion: "velmere.r11.npm-audit-verdict.v1",
  ok: true,
  toolError: false,
  high: 0,
  critical: 0,
});
write("TRUTH_SCOPE_V2.json", {
  schemaVersion: "velmere.r11.truth-scope.v3",
  sourceSha: sha,
  passed: true,
  p0: 0,
  scannedFiles: 10,
  safeNegatedFindings: [],
});
write("PROVIDER_RIGHTS_AUDIT.json", {
  schemaVersion: "velmere.pass21.provider-rights-audit.v2",
  ok: true,
  externalRightsVerified: 0,
  commerciallyEnabledProviders: 0,
});
const secretBoundary = {
  schemaVersion: "velmere.r11.secret-fixture-boundary.v1",
  sourceSha: sha,
  passed: true,
  fixturePolicy: "EXACT_PATH_RULE_AND_SECRET_FINGERPRINT",
  envCoverage: "ALL_DOT_ENV_BASENAMES_REGARDLESS_OF_EXTENSION",
  expectedFixtureCount: 3,
  observedFixtures: [
    { path: "scripts/security/scan-all-secrets.mjs", count: 1, fingerprints: [fixtureFingerprint] },
    { path: "tests/unit/ai-vlm-security.test.ts", count: 1, fingerprints: [fixtureFingerprint] },
    { path: "tests/unit/security-api-error-envelope.test.ts", count: 1, fingerprints: [fixtureFingerprint] },
  ],
  envFindingCount: 0,
  blockers: [],
};
write("SECRET_FIXTURE_BOUNDARY.json", secretBoundary);

const pass = verifyRemediationEvidence({ root, expectedSha: sha });
if (!pass.passed) throw new Error("valid_receipts_did_not_pass");

write("RECEIPT.json", { ...receipt, sourceSha: "b".repeat(40) });
assertThrows(() => verifyRemediationEvidence({ root, expectedSha: sha }), "remediation_receipt_wrong_sha");
write("RECEIPT.json", receipt);

write("TRUTH_SCOPE_V2.json", {
  schemaVersion: "velmere.r11.truth-scope.v3",
  sourceSha: sha,
  passed: true,
  p0: 0,
  scannedFiles: 0,
  safeNegatedFindings: [],
});
assertThrows(() => verifyRemediationEvidence({ root, expectedSha: sha }), "truth_scope_zero_denominator");
write("TRUTH_SCOPE_V2.json", {
  schemaVersion: "velmere.r11.truth-scope.v3",
  sourceSha: sha,
  passed: true,
  p0: 0,
  scannedFiles: 10,
  safeNegatedFindings: [],
});

write("SECRET_FIXTURE_BOUNDARY.json", {
  ...secretBoundary,
  observedFixtures: secretBoundary.observedFixtures.map((row, index) => index === 1 ? { ...row, fingerprints: ["b".repeat(64)] } : row),
});
assertThrows(() => verifyRemediationEvidence({ root, expectedSha: sha }), "secret_fixture_fingerprint_invalid");
write("SECRET_FIXTURE_BOUNDARY.json", secretBoundary);

fs.unlinkSync(path.join(root, "PROVIDER_RIGHTS_AUDIT.json"));
assertThrows(() => verifyRemediationEvidence({ root, expectedSha: sha }), "missing_receipt");

console.log(JSON.stringify({ status: "PASS", checks: 5 }, null, 2));
