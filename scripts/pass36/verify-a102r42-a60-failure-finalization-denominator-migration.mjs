import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { canonicalJson } from "../pass4826/release-package-contract.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const REVISION_ID = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const PARENT_REVISION_ID = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const MIGRATION_PATH = "config/pass36/a102r42-a60-failure-finalization-denominator-migration.json";
const TEST_PATH = "scripts/pass36/test-a60-exact-final-byte-build-browser-acceptance.mjs";
const LIBRARY_PATH = "scripts/pass36/a79-exact-build-browser-lib.mjs";
const RUNNER_PATH = "scripts/a60-exact-final-byte-build-browser-acceptance.mjs";
const PARENT_PACKAGE_PATH = "config/pass36/a102r42-parent-source-package-manifest.json";
const PARENT_TEST_PATH = "scripts/pass36/test-a60-exact-final-byte-build-browser-acceptance.mjs";
const PARENT_TEST_BYTE_LENGTH = 16386;
const PARENT_TEST_SHA256 = "1aa07834ece78bb1cabf9e45687d9b4c71f5fe47ab74dfdbfc7a90def7d939c8";
const RETAINED_SEMANTIC_CASE_IDS = Object.freeze([
  "valid", "missing", "duplicate", "reordered", "extra", "nonzero-exit", "signal", "command-substitution",
  "output-contract", "invalid-timing", "duration-mismatch", "log-path-substitution", "log-length-substitution",
  "log-sha-substitution", "observed-log-path-alias", "missing-log",
]);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const unique = (values) => Array.isArray(values) && new Set(values).size === values.length;

function semanticCaseIds(source) {
  const start = source.indexOf("const stageSequenceCases = [");
  const end = source.indexOf("const stageSequenceCaseIds", start);
  if (start < 0 || end <= start) return [];
  return [...source.slice(start, end).matchAll(/^ {2}\{ id: "([^"]+)"/gmu)].map((match) => match[1]);
}

export function verifyA60FailureFinalizationDenominatorMigration(root = process.cwd()) {
  const migration = parseStrictJsonCli(fs.readFileSync(path.join(root, MIGRATION_PATH), "utf8"), { maxBytes: 1024 * 1024, maxDepth: 64, maxNodes: 100000, requireObject: true });
  const parentPackage = parseStrictJsonCli(fs.readFileSync(path.join(root, PARENT_PACKAGE_PATH), "utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
  const parentTestEntry = parentPackage.entries?.find((entry) => entry?.path === PARENT_TEST_PATH);
  const testSource = fs.readFileSync(path.join(root, TEST_PATH), "utf8");
  const librarySource = fs.readFileSync(path.join(root, LIBRARY_PATH), "utf8");
  const runnerSource = fs.readFileSync(path.join(root, RUNNER_PATH), "utf8");
  const observedIds = semanticCaseIds(testSource);
  const declaredIds = [...migration.retainedSemanticCaseIds, ...migration.addedSemanticCaseIds];
  const checks = [];
  const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
  check("schema", migration.schemaVersion === "velmere.pass36.a102r42.a60-failure-finalization-denominator-migration.v1");
  check("identity", migration.revisionId === REVISION_ID && migration.parentRevisionId === PARENT_REVISION_ID);
  check("stage-denominator-retained", migration.stageDenominatorBefore === 14 && migration.stageDenominatorAfter === 14);
  check("top-level-denominator-retained", migration.topLevelHarnessChecksBefore === 36 && migration.topLevelHarnessChecksAfter === 36);
  check("semantic-denominator-increased", migration.oldSemanticDenominator === 16 && migration.newSemanticDenominator === 34 && migration.newSemanticDenominator > migration.oldSemanticDenominator);
  check("retained-cases",
    migration.retainedSemanticCaseIds.length === 16
      && unique(migration.retainedSemanticCaseIds)
      && canonicalJson(migration.retainedSemanticCaseIds) === canonicalJson(RETAINED_SEMANTIC_CASE_IDS)
      && canonicalJson(migration.parentRetainedSemanticCaseIds) === canonicalJson(RETAINED_SEMANTIC_CASE_IDS)
      && migration.parentTestPath === PARENT_TEST_PATH
      && migration.parentTestByteLength === PARENT_TEST_BYTE_LENGTH
      && migration.parentTestSha256 === PARENT_TEST_SHA256
      && parentPackage.revisionId === PARENT_REVISION_ID
      && parentTestEntry?.byteLength === PARENT_TEST_BYTE_LENGTH
      && parentTestEntry?.sha256 === PARENT_TEST_SHA256,
    { declared: migration.retainedSemanticCaseIds, parentTestEntry },
  );
  check("added-cases", migration.addedSemanticCaseIds.length === 18 && unique(migration.addedSemanticCaseIds));
  check("zero-removed", Array.isArray(migration.removedSemanticCaseIds) && migration.removedSemanticCaseIds.length === 0 && migration.testsDeleted === 0);
  check("cross-family-unique", unique(declaredIds) && declaredIds.length === migration.newSemanticDenominator);
  check("source-case-set", canonicalJson(observedIds) === canonicalJson(declaredIds), { observed: observedIds.length, declared: declaredIds.length });
  check("case-identity", migration.semanticCaseIdentitySha256 === sha256(observedIds.join("\n")));
  check("canonical-stage-authority", librarySource.includes("export const A60_REQUIRED_STAGE_IDS = Object.freeze([") && testSource.includes("canonicalStageListExact"));
  check("malformed-row-totality", librarySource.includes("const declaredIds = Array.from(declared") && librarySource.includes("candidate !== null && typeof candidate === \"object\"") && observedIds.includes("undefined-row") && observedIds.includes("null-row") && observedIds.includes("sparse-row"));
  check("missing-runtime-stage", observedIds.includes("missing-runtime-bound-stage") && librarySource.includes("const detail = row?.detail"));
  check("runtime-binding-negatives", ["runtime-base-url-substitution", "runtime-build-id-substitution", "runtime-instance-substitution", "runtime-probe-substitution"].every((id) => observedIds.includes(id)));
  check("bounded-finalizer", runnerSource.includes('id: "stage-validation-internal-error"') && runnerSource.includes('detail: "bounded_internal_error"') && runnerSource.includes('failure = "a60_stage_validation_internal_error"'));
  check("original-failure-preserved", runnerSource.includes("if (failure === null) failure = \"a60_stage_validation_internal_error\"") && migration.originalStageFailurePreserved === true);
  check("provider-token-boundary", librarySource.includes("(?:^|[^a-z0-9])(?:sk|pk|whsec|sess|cus|pi|pm|cs|acct|acc)_") && observedIds.includes("log-safety-risk-token-boundary") && observedIds.includes("log-safety-provider-secret-rejected"));
  check("receipt-schema-migration", migration.receiptSchemaBefore.endsWith(".v2") && migration.receiptSchemaAfter.endsWith(".v3") && runnerSource.includes(migration.receiptSchemaAfter));
  check("truth-boundary", migration.validatorTotalForJsonSerializableMalformedRows === true && migration.boundedUnexpectedValidatorFailure === true && migration.rawErrorStackPersisted === false && migration.windowsUserPathPersisted === false && migration.denominatorCollapseNegativeTest === true && migration.scoreImprovementClaimed === false && migration.globalDecision === "NO_GO" && migration.live === false && migration.saleEnabled === false && migration.productionApproved === false && migration.worldClassProven === false);
  const core = { ...migration };
  delete core.migrationDigestSha256;
  check("self-digest", /^[a-f0-9]{64}$/u.test(migration.migrationDigestSha256) && migration.migrationDigestSha256 === sha256(canonicalJson(core)));
  const failures = checks.filter((row) => !row.passed);
  return {
    schemaVersion: "velmere.pass36.a102r42.a60-failure-finalization-denominator-migration-verification.v1",
    revisionId: REVISION_ID,
    status: failures.length === 0 ? "PASS_A102R42_A60_TOTAL_FAIL_CLOSED_FAILURE_FINALIZATION_MIGRATION_NO_PROMOTION" : "FAIL_A102R42_A60_FAILURE_FINALIZATION_MIGRATION",
    checks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    stageDenominator: migration.stageDenominatorAfter,
    topLevelHarnessChecks: migration.topLevelHarnessChecksAfter,
    oldSemanticDenominator: migration.oldSemanticDenominator,
    newSemanticDenominator: migration.newSemanticDenominator,
    retainedSemanticCases: migration.retainedSemanticCaseIds.length,
    addedSemanticCases: migration.addedSemanticCaseIds.length,
    removedSemanticCases: migration.removedSemanticCaseIds.length,
    semanticCaseIdentitySha256: migration.semanticCaseIdentitySha256,
    failures,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const result = verifyA60FailureFinalizationDenominatorMigration();
  console.log(JSON.stringify(result, null, 2));
  if (result.failed) process.exit(1);
}
