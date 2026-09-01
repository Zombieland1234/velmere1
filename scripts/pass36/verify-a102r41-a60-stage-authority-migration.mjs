import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { canonicalJson } from "../pass4826/release-package-contract.mjs";

const REVISION_ID = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const MIGRATION_PATH = "config/pass36/a102r41-a60-stage-authority-migration.json";
const POLICY_PATH = "config/pass36/a60-exact-final-byte-build-browser-acceptance.json";
const RUNNER_PATH = "scripts/a60-exact-final-byte-build-browser-acceptance.mjs";
const PARENT_MANIFEST_PATH = "config/pass36/a102r41-parent-source-package-manifest.json";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const unique = (values) => Array.isArray(values) && new Set(values).size === values.length;

export function verifyA60StageAuthorityMigration(root = process.cwd()) {
  const migration = JSON.parse(fs.readFileSync(path.join(root, MIGRATION_PATH), "utf8"));
  const policy = JSON.parse(fs.readFileSync(path.join(root, POLICY_PATH), "utf8"));
  const runner = fs.readFileSync(path.join(root, RUNNER_PATH), "utf8");
  const parentManifest = JSON.parse(fs.readFileSync(path.join(root, PARENT_MANIFEST_PATH), "utf8"));
  const historicalPath = migration.historicalTestPath;
  const historicalParent = parentManifest.entries.find((row) => row.path === historicalPath);
  const historicalCurrentBytes = fs.readFileSync(path.join(root, historicalPath));
  const checks = [];
  const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
  check("schema", migration.schemaVersion === "velmere.pass36.a102r41.a60-stage-authority-migration.v1");
  check("revision", migration.revisionId === REVISION_ID);
  check("denominator-preserved", migration.oldDenominator === 13 && migration.newDenominator === 13 && migration.denominatorChanged === false);
  check("old-stages", migration.oldRequiredStages?.length === 13 && unique(migration.oldRequiredStages));
  check("new-stages", migration.newRequiredStages?.length === 13 && unique(migration.newRequiredStages));
  check("retained-stages", migration.retainedStageIds?.length === 12 && unique(migration.retainedStageIds));
  check("replacement-exact", JSON.stringify(migration.replacedHistoricalStageIds) === JSON.stringify(["a57-contract"]) && JSON.stringify(migration.addedCurrentAuthorityStageIds) === JSON.stringify(["a58-current-integrity"]));
  check("retained-old", migration.retainedStageIds?.every((id) => migration.oldRequiredStages?.includes(id)));
  check("retained-new", migration.retainedStageIds?.every((id) => migration.newRequiredStages?.includes(id)));
  const laterMigrationStages = ["post-build-typecheck"];
  const authorityProjection = policy.requiredStages.filter((id) => !laterMigrationStages.includes(id));
  check("policy-new-exact-before-later-additive-migration", canonicalJson(authorityProjection) === canonicalJson(migration.newRequiredStages) && migration.nextDenominatorMigrationPath === "config/pass36/a102r41-a60-post-build-typescript-denominator-migration.json");
  check("runner-current-stage", runner.includes('runStage("a58-current-integrity"') && runner.includes('"scripts/pass36/verify-a58-release-integrity.mjs"'));
  check("runner-historical-stage-absent", !runner.includes('runNpmStage("a57-contract"'));
  check("historical-test-retained", fs.existsSync(path.join(root, historicalPath)) && migration.testsDeleted === 0);
  check("historical-test-unchanged", historicalParent?.byteLength === historicalCurrentBytes.length && historicalParent?.sha256 === sha256(historicalCurrentBytes));
  check("current-verifier-present", fs.existsSync(path.join(root, migration.currentIntegrityVerifierPath)));
  check("expected-a58-contract", migration.expectedCurrentIntegrityContract?.checks === 45 && migration.expectedCurrentIntegrityContract?.passed === 38 && migration.expectedCurrentIntegrityContract?.failed === 7 && migration.expectedCurrentIntegrityContract?.blockingFailed === 0);
  check("history-not-rewritten", migration.historicalHashesRewritten === false && migration.reason?.includes("Preserve that test"));
  check("negative-collapse", migration.newDenominator !== 12 && migration.newRequiredStages?.length === migration.newDenominator);
  check("negative-duplicate", new Set(migration.newRequiredStages ?? []).size === migration.newDenominator);
  const core = { ...migration };
  delete core.migrationDigestSha256;
  check("self-digest", /^[a-f0-9]{64}$/u.test(migration.migrationDigestSha256) && migration.migrationDigestSha256 === sha256(canonicalJson(core)));
  const failures = checks.filter((row) => !row.passed);
  return {
    schemaVersion: "velmere.pass36.a102r41.a60-stage-authority-migration-verification.v1",
    revisionId: REVISION_ID,
    status: failures.length === 0 ? "PASS_A102R41_A60_STAGE_AUTHORITY_MIGRATION_NO_PROMOTION" : "FAIL_A102R41_A60_STAGE_AUTHORITY_MIGRATION",
    checks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    oldDenominator: migration.oldDenominator,
    newDenominator: migration.newDenominator,
    retainedStages: migration.retainedStageIds?.length ?? 0,
    replacedHistoricalStages: migration.replacedHistoricalStageIds?.length ?? 0,
    addedCurrentAuthorityStages: migration.addedCurrentAuthorityStageIds?.length ?? 0,
    testsDeleted: migration.testsDeleted,
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
  const result = verifyA60StageAuthorityMigration();
  console.log(JSON.stringify(result, null, 2));
  if (result.failed) process.exit(1);
}
