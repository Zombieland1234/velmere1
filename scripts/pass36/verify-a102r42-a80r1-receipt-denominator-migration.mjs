import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const PATH = "config/pass36/a102r42-a80r1-receipt-denominator-migration.json";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}` : JSON.stringify(value);
const retainedIds = ["mode-migration:baseline-35-to-58", "mode-migration:denominator-collapse-rejected", "mode-migration:frozen-removal-rejected", "mode-migration:duplicate-addition-rejected", "mode-migration:wildcard-addition-rejected", "mode-migration:self-digest-tamper-rejected", "mode-migration:omitted-current-shebang-and-test-denominator-collapse-rejected", "baseline:self-declared-dual-control-rejected", "baseline:mechanism-remains-blocked", "baseline:verified-still-no-promotion", "baseline:phase1-self-digest", "baseline:same-source-snapshot", "reject:missing-a78", "reject:stale-status", "reject:other-source", "reject:promotion-claim", "reject:physical-pass-absent", "reject:clean-a58-not-first", "reject:one-dual-control-signer", "reject:duplicate-dual-control-signer", "reject:duplicate-json-key", "reject:depth-budget", "reject:byte-budget", "reject:receipt-symlink", "output:external-new-accepted", "reject:output-inside-source", "reject:output-overwrite", "reject:unknown-cli", "reject:duplicate-cli", "reject:old-success-boolean-cli", "reject:phase1-digest-tamper", "reject:false-verified-candidate", "blocked:still-no-promotion", "seal:explicit-local-integrity-only", "seal:blocked-no-a80r1-promotion", "reject:seal-from-tampered-phase1"];
const addedIds = ["mode-migration:baseline-58-to-58-and-a80-36-to-48", "reject:full-regression-denominator-or-immutability", "reject:full-regression-executed-denominator", "reject:full-regression-passed-denominator", "reject:full-regression-failed-stage-contradiction", "reject:full-regression-source-mutability", "reject:receipt-schema-substitution", "reject:wrapper-observed-schema-substitution", "reject:full-regression-stage-row-collapse", "reject:full-regression-stage-order-substitution", "reject:clean-unpack-step-row-collapse", "reject:clean-unpack-provenance-collapse"];
const migration = parseStrictJsonCli(fs.readFileSync(PATH, "utf8"), { maxBytes: 1024 * 1024, maxDepth: 64, maxNodes: 100000, requireObject: true });
const core = { ...migration }; delete core.migrationDigestSha256;
const parentBytes = fs.readFileSync(migration.parentTestPath);
const testSource = fs.readFileSync("scripts/pass36/test-a102r42-a80r1-two-phase-release-controller.mjs", "utf8");
const librarySource = fs.readFileSync("scripts/pass36/a80r1-two-phase-release-controller-lib.mjs", "utf8");
const validateMigration = (document) => {
  const documentCore = { ...document }; delete documentCore.migrationDigestSha256;
  return document.migrationDigestSha256 === sha256(canonical(documentCore))
    && document.oldDenominator === 36 && document.newDenominator === 48
    && document.retainedAssertionCount === 36
    && canonical(document.retainedAssertionIds) === canonical(retainedIds)
    && canonical(document.addedAssertionIds) === canonical(addedIds)
    && Array.isArray(document.removedAssertionIds) && document.removedAssertionIds.length === 0
    && new Set([...document.retainedAssertionIds, ...document.addedAssertionIds]).size === 48
    && document.verifierChecks === 12;
};
const resign = (document) => { const documentCore = { ...document }; delete documentCore.migrationDigestSha256; document.migrationDigestSha256 = sha256(canonical(documentCore)); return document; };
const checks = [];
const check = (id, value, detail = null) => { const row = { id, passed: Boolean(value), detail }; checks.push(row); assert.ok(row.passed, id); };
check("schema", migration.schemaVersion === "velmere.pass36.a102r42.a80r1-receipt-denominator-migration.v1");
check("identity", migration.revisionId === "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT" && migration.parentRevisionId === "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT");
check("digest", migration.migrationDigestSha256 === sha256(canonical(core)) && validateMigration(migration));
check("parent-anchor", parentBytes.length === 17240 && sha256(parentBytes) === "00e69a5a9b8c49d8f346aae7d0375d2f7515c190f371d91eaf8130e58afa0d8f");
check("denominators", migration.oldDenominator === 36 && migration.newDenominator === 48);
check("retained-added-removed", canonical(migration.retainedAssertionIds) === canonical(retainedIds) && canonical(migration.addedAssertionIds) === canonical(addedIds) && migration.removedAssertionIds.length === 0 && new Set([...migration.retainedAssertionIds, ...migration.addedAssertionIds]).size === 48);
check("full-regression-denominator", migration.fullRegressionStageDenominator === 29);
check("test-source", [...retainedIds, ...addedIds].every((id) => testSource.includes(JSON.stringify(id))) && testSource.includes("required: 48") && testSource.includes("checks.length !== 48"));
check("library-source", librarySource.includes("receipt:full_regression:denominator_or_immutability") && librarySource.includes("receipt?.requiredStages === 29") && librarySource.includes("receipt?.failedStages?.length === 0") && librarySource.includes("FULL_REGRESSION_STAGE_IDS") && librarySource.includes("CLEAN_UNPACK_STEP_IDS") && librarySource.includes("receipt?.schemaVersion !== spec.schema"));
check("truth-boundary", migration.scoreImprovementClaimed === false && migration.globalDecision === "NO_GO" && migration.live === false && migration.saleEnabled === false && migration.productionApproved === false && migration.worldClassProven === false);
const collapsed = structuredClone(migration); collapsed.newDenominator = 36; resign(collapsed);
check("negative-collapse", !validateMigration(collapsed));
const removed = structuredClone(migration); removed.retainedAssertionIds.pop(); removed.retainedAssertionCount = 35; resign(removed);
const duplicate = structuredClone(migration); duplicate.addedAssertionIds[11] = duplicate.addedAssertionIds[0]; resign(duplicate);
check("negative-removal", !validateMigration(removed) && !validateMigration(duplicate));
assert.equal(checks.length, 12, "a102r42_a80r1_receipt_migration_verifier_denominator");
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r42.a80r1-receipt-denominator-migration-verification.v1", status: failed.length === 0 ? "PASS_A102R42_A80R1_RECEIPT_DENOMINATOR_MIGRATION_36_TO_48_ZERO_REMOVED" : "FAIL_A102R42_A80R1_RECEIPT_DENOMINATOR_MIGRATION", checks: checks.length, passed: checks.length - failed.length, failed: failed.length, oldDenominator: 36, newDenominator: 48, retainedAssertions: 36, addedAssertions: 12, removedAssertions: 0, globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false, failures: failed }, null, 2));
if (failed.length > 0) process.exit(1);
