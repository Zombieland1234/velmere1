import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { A42_CRITICAL_RUNTIME_TARGETS } from "../lib/a42-dev-runtime-policy.mjs";
import {
  productionSmokeExpectedAssertionNames,
  productionSmokeExpectedResultIdentities,
} from "../deployment/production-smoke-evidence.mjs";
import { canonicalJson } from "../pass4826/release-package-contract.mjs";

const REVISION_ID = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const MIGRATION_PATH = "config/pass36/a102r41-a60-runtime-smoke-denominator-migration.json";
const PARENT_MANIFEST_PATH = "config/pass36/a102r41-parent-source-package-manifest.json";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

export function verifyA60RuntimeSmokeDenominatorMigration(root = process.cwd()) {
  const migration = JSON.parse(fs.readFileSync(path.join(root, MIGRATION_PATH), "utf8"));
  const policy = JSON.parse(fs.readFileSync(path.join(root, migration.policyPath), "utf8"));
  const runner = fs.readFileSync(path.join(root, migration.runnerPath), "utf8");
  const currentHarness = fs.readFileSync(path.join(root, migration.currentHarnessPath), "utf8");
  const contractTest = fs.readFileSync(path.join(root, migration.currentContractTestPath), "utf8");
  const parentManifest = JSON.parse(fs.readFileSync(path.join(root, PARENT_MANIFEST_PATH), "utf8"));
  const historicalBytes = fs.readFileSync(path.join(root, migration.historicalHarnessPath));
  const historicalParent = parentManifest.entries.find((row) => row.path === migration.historicalHarnessPath);
  const assertionNames = productionSmokeExpectedAssertionNames();
  const resultIdentities = productionSmokeExpectedResultIdentities();
  const checks = [];
  const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

  check("schema", migration.schemaVersion === "velmere.pass36.a102r41.a60-runtime-smoke-denominator-migration.v1");
  check("revision", migration.revisionId === REVISION_ID);
  check("stage-retained", migration.a60StageId === "runtime-smoke" && migration.a60StageDenominatorBefore === 14 && migration.a60StageDenominatorAfter === 14 && policy.requiredStages?.filter((id) => id === "runtime-smoke").length === 1);
  check("historical-denominator", migration.historicalTargetDenominator === 15 && A42_CRITICAL_RUNTIME_TARGETS.length === 15);
  check("current-assertion-denominator", migration.currentAssertionDenominator === 55 && assertionNames.length === 55 && new Set(assertionNames).size === 55);
  check("current-result-denominator", migration.currentResultDenominator === 16 && resultIdentities.length === 16 && new Set(resultIdentities).size === 16);
  check("policy-current-contract", policy.runtimeSmoke?.runnerPath === migration.currentHarnessPath && policy.runtimeSmoke?.mode === "turbopack" && policy.runtimeSmoke?.requiredUniqueAssertions === 55 && policy.runtimeSmoke?.requiredUniqueResults === 16 && policy.runtimeSmoke?.simulatedTlsReverseProxy === true && policy.runtimeSmoke?.realTlsCredit === false && policy.runtimeSmoke?.denominatorMigrationPath === MIGRATION_PATH);
  check("runner-current-harness", runner.includes('runStage("runtime-smoke", [policy.runtimeSmoke.runnerPath, policy.runtimeSmoke.mode]'));
  check("runner-historical-current-use-absent", !runner.includes('runStage("runtime-smoke", ["scripts/a42-runtime-smoke.mjs"'));
  check("runner-summary-contract", runner.includes("value.assertions === policy.runtimeSmoke.requiredUniqueAssertions") && runner.includes("value.results === policy.runtimeSmoke.requiredUniqueResults") && runner.includes("value.uniqueAssertions === policy.runtimeSmoke.requiredUniqueAssertions") && runner.includes("value.uniqueResults === policy.runtimeSmoke.requiredUniqueResults"));
  check("harness-evidence-contract", currentHarness.includes("inspectProductionSmokeEvidence") && currentHarness.includes("assertions.every((row) => row.ok)") && currentHarness.includes("evidenceContract.ok"));
  check("harness-summary-denominators", currentHarness.includes("results: results.length") && currentHarness.includes("uniqueAssertions: receipt.evidenceContract.assertionSet.uniqueCount") && currentHarness.includes("uniqueResults: receipt.evidenceContract.resultSet.uniqueCount"));
  check("simulated-tls-contract", currentHarness.includes("applyProductionSmokeNetworkEnvironment") && currentHarness.includes("productionSmokeNetworkDisclosure") && migration.simulatedTlsReverseProxyRequired === true && migration.realTlsCredit === false);
  check("contract-test-denominators", contractTest.includes('expectedAssertionNames.length, 55') && contractTest.includes('expectedResultIdentities.length, 16'));
  check("historical-retained", fs.existsSync(path.join(root, migration.historicalHarnessPath)) && migration.historicalHarnessDeleted === false && migration.testsDeleted === 0);
  check("historical-unchanged", historicalParent?.byteLength === historicalBytes.length && historicalParent?.sha256 === sha256(historicalBytes) && migration.historicalHashesRewritten === false);
  check("negative-assertion-collapse", migration.currentAssertionDenominator !== 54);
  check("negative-result-collapse", migration.currentResultDenominator !== 15);
  check("negative-duplicate-assertions", new Set(assertionNames).size === migration.currentAssertionDenominator);
  check("negative-duplicate-results", new Set(resultIdentities).size === migration.currentResultDenominator);
  check("no-bypass", migration.testsDeleted === 0 && migration.skipsAdded === 0 && migration.timeoutsIncreased === 0);
  check("truth-boundary", migration.scoreCredit === false && migration.globalDecision === "NO_GO" && migration.live === false && migration.saleEnabled === false && migration.productionApproved === false && migration.worldClassProven === false);
  const core = { ...migration };
  delete core.migrationDigestSha256;
  check("self-digest", /^[a-f0-9]{64}$/u.test(migration.migrationDigestSha256) && migration.migrationDigestSha256 === sha256(canonicalJson(core)));

  const failures = checks.filter((row) => !row.passed);
  return {
    schemaVersion: "velmere.pass36.a102r41.a60-runtime-smoke-denominator-migration-verification.v1",
    revisionId: REVISION_ID,
    status: failures.length === 0 ? "PASS_A102R41_A60_RUNTIME_SMOKE_DENOMINATOR_MIGRATION_NO_PROMOTION" : "FAIL_A102R41_A60_RUNTIME_SMOKE_DENOMINATOR_MIGRATION",
    checks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    stageDenominatorBefore: migration.a60StageDenominatorBefore,
    stageDenominatorAfter: migration.a60StageDenominatorAfter,
    historicalTargetDenominator: migration.historicalTargetDenominator,
    currentAssertionDenominator: migration.currentAssertionDenominator,
    currentResultDenominator: migration.currentResultDenominator,
    testsDeleted: migration.testsDeleted,
    failures,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const result = verifyA60RuntimeSmokeDenominatorMigration();
  console.log(JSON.stringify(result, null, 2));
  if (result.failed) process.exit(1);
}
