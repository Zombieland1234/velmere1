#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const EXPECTED_SYNTHETIC_SECRET_FINGERPRINT = "71a68559119629d989386448adad9d5920e7e8e83fb7f55282d9ef9fcc7051cf";

function readJson(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`missing_receipt:${file}`);
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { throw new Error(`malformed_receipt:${file}`); }
  return parsed;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function verifyRemediationEvidence({ root, expectedSha }) {
  assert(typeof expectedSha === "string" && /^[0-9a-f]{40}$/i.test(expectedSha), "expected_sha_invalid");

  const receipt = readJson(path.join(root, "RECEIPT.json"));
  const npmVerdict = readJson(path.join(root, "NPM_AUDIT_VERDICT.json"));
  const truth = readJson(path.join(root, "TRUTH_SCOPE_V2.json"));
  const providerRights = readJson(path.join(root, "PROVIDER_RIGHTS_AUDIT.json"));
  const secretBoundary = readJson(path.join(root, "SECRET_FIXTURE_BOUNDARY.json"));

  assert(receipt.sourceSha === expectedSha, "remediation_receipt_wrong_sha");
  assert(receipt.evidenceClass === "CURRENT_GIT_PROVEN_REMEDIATION", "remediation_evidence_class_invalid");
  assert(receipt.p0RegressionCanaries === "PASS", "p0_canaries_not_passed");
  assert(receipt.npmAuditVerifier === "FAIL_CLOSED", "npm_verifier_not_fail_closed");
  assert(receipt.secretFixtureBoundary === "PASS_EXACT_PATH_RULE_FINGERPRINT_AND_ENV", "secret_fixture_receipt_not_passed");
  assert(receipt.typecheck === "PASS", "typecheck_not_passed");
  assert(receipt.securityRegression === "PASS", "security_regression_not_passed");
  assert(receipt.sourceTruthScan === "PASS", "source_truth_not_passed");
  assert(receipt.productionBuild === "PASS", "production_build_not_passed");
  assert(Array.isArray(receipt.coveredFindings) && receipt.coveredFindings.length > 0, "covered_findings_empty");

  assert(npmVerdict.schemaVersion === "velmere.r11.npm-audit-verdict.v1", "npm_verdict_schema_invalid");
  assert(npmVerdict.ok === true, "npm_audit_not_clean");
  assert(npmVerdict.toolError === false, "npm_audit_tool_error");
  assert(npmVerdict.high === 0 && npmVerdict.critical === 0, "npm_audit_high_or_critical");

  assert(truth.sourceSha === expectedSha, "truth_scope_wrong_sha");
  assert(truth.schemaVersion === "velmere.r11.truth-scope.v3", "truth_scope_schema_invalid");
  assert(truth.passed === true && truth.p0 === 0, "truth_scope_p0_remaining");
  assert(Number.isInteger(truth.scannedFiles) && truth.scannedFiles > 0, "truth_scope_zero_denominator");
  assert(Array.isArray(truth.safeNegatedFindings), "truth_scope_negation_inventory_missing");

  assert(providerRights.schemaVersion === "velmere.pass21.provider-rights-audit.v2", "provider_rights_schema_invalid");
  assert(providerRights.ok === true, "provider_rights_registry_integrity_fail");
  assert(providerRights.externalRightsVerified === 0, "unexpected_external_rights_credit");
  assert(providerRights.commerciallyEnabledProviders === 0, "unexpected_commercial_provider_enablement");

  assert(secretBoundary.schemaVersion === "velmere.r11.secret-fixture-boundary.v1", "secret_fixture_schema_invalid");
  assert(secretBoundary.sourceSha === expectedSha, "secret_fixture_wrong_sha");
  assert(secretBoundary.passed === true, "secret_fixture_boundary_failed");
  assert(secretBoundary.fixturePolicy === "EXACT_PATH_RULE_AND_SECRET_FINGERPRINT", "secret_fixture_policy_invalid");
  assert(secretBoundary.envCoverage === "ALL_DOT_ENV_BASENAMES_REGARDLESS_OF_EXTENSION", "secret_env_coverage_invalid");
  assert(secretBoundary.expectedFixtureCount === 3, "secret_fixture_denominator_invalid");
  assert(Array.isArray(secretBoundary.blockers) && secretBoundary.blockers.length === 0, "secret_fixture_blockers_present");
  assert(secretBoundary.envFindingCount === 0, "secret_env_findings_present");
  assert(Array.isArray(secretBoundary.observedFixtures) && secretBoundary.observedFixtures.length === 3, "secret_fixture_observed_denominator_invalid");
  for (const observed of secretBoundary.observedFixtures) {
    assert(observed.count === 1, `secret_fixture_count_invalid:${observed.path}`);
    assert(Array.isArray(observed.fingerprints) && observed.fingerprints.length === 1, `secret_fixture_fingerprint_count_invalid:${observed.path}`);
    assert(observed.fingerprints[0] === EXPECTED_SYNTHETIC_SECRET_FINGERPRINT, `secret_fixture_fingerprint_invalid:${observed.path}`);
  }

  return {
    schemaVersion: "velmere.r11.remediation-evidence-evaluation.v3",
    sourceSha: expectedSha,
    passed: true,
    verifiedSubjects: [
      "RECEIPT.json",
      "NPM_AUDIT_VERDICT.json",
      "TRUTH_SCOPE_V2.json",
      "PROVIDER_RIGHTS_AUDIT.json",
      "SECRET_FIXTURE_BOUNDARY.json",
    ],
    releaseAuthorityCredit: false,
    officialRelease: false,
    productionCredit: false,
    truthBoundary:
      "This evaluator verifies receipt semantics and exact subject SHA for the R11 remediation scope. It does not convert local/CI evidence into release, staging, provider-rights or production proof.",
  };
}

function main() {
  const rootArg = process.argv.includes("--root") ? process.argv[process.argv.indexOf("--root") + 1] : null;
  const expectedSha = process.argv.includes("--sha") ? process.argv[process.argv.indexOf("--sha") + 1] : process.env.GITHUB_SHA;
  const output = process.argv.includes("--output") ? process.argv[process.argv.indexOf("--output") + 1] : null;
  if (!rootArg) throw new Error("--root_required");
  const result = verifyRemediationEvidence({ root: path.resolve(rootArg), expectedSha });
  if (output) {
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(path.resolve(output), `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) main();
