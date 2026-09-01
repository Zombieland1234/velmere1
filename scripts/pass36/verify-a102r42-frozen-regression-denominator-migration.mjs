import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const REV = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const MIGRATION_PATH = "config/pass36/a102r42-frozen-regression-denominator-migration.json";
const PARENT_RUNNER = "scripts/pass36/run-a102r41-frozen-local-regression.mjs";
const CURRENT_RUNNER = "scripts/pass36/run-a102r42-frozen-local-regression.mjs";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonicalJson = (value) => Array.isArray(value)
  ? `[${value.map(canonicalJson).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const stageIds = (source) => [...source.matchAll(/\{\s*id:\s*"([a-z0-9-]+)"\s*,\s*command:/gu)].map((match) => match[1]);
const expectedParent = ["current-authority", "descendant", "approved-changes", "authority-harness", "historical-chain", "a42-critical", "route-dispatch", "route-tamper", "lazy-routes", "production-smoke-contract", "a45-browser-fixture", "product-tiers", "zero-budget", "rls", "external-command", "sanitized-child", "physical-evidence", "self-assertion-denial", "account-operation", "checkout", "paid-browser", "package-boundary", "a80", "a80r1", "source-audit-generated-types", "source-audit", "eslint", "typescript"];
const expectedCurrent = [...expectedParent.slice(0, 24), "a60-total-fail-closed", ...expectedParent.slice(24)];
const migration = parseStrictJsonCli(fs.readFileSync(MIGRATION_PATH, "utf8"), { maxBytes: 1024 * 1024, maxDepth: 64, maxNodes: 100000, requireObject: true });
const core = { ...migration }; delete core.migrationDigestSha256;
const checks = [];
const check = (id, value, detail = null) => { const row = { id, passed: Boolean(value), detail }; checks.push(row); assert.ok(row.passed, id); };
const parentBytes = fs.readFileSync(PARENT_RUNNER);
const currentBytes = fs.readFileSync(CURRENT_RUNNER);
check("schema", migration.schemaVersion === "velmere.pass36.a102r42.frozen-regression-denominator-migration.v1");
check("identity", migration.revisionId === REV && migration.parentRevisionId === PARENT);
check("self-digest", migration.migrationDigestSha256 === sha256(canonicalJson(core)));
check("denominators", migration.oldDenominator === 28 && migration.newDenominator === 29);
check("retained-added-removed", migration.retainedCount === 28 && migration.addedCount === 1 && migration.removedCount === 0);
check("retained-exact", canonicalJson(migration.retainedStageIds) === canonicalJson(expectedParent));
check("added-exact", canonicalJson(migration.addedStageIds) === canonicalJson(["a60-total-fail-closed"]));
check("current-exact", canonicalJson(migration.currentStageIds) === canonicalJson(expectedCurrent));
check("unique", new Set(migration.retainedStageIds).size === 28 && new Set(migration.currentStageIds).size === 29);
check("identity-hashes", migration.parentStageIdentitySha256 === sha256(expectedParent.join("\n")) && migration.currentStageIdentitySha256 === sha256(expectedCurrent.join("\n")));
check("parent-runner-anchor", parentBytes.length === 28028 && sha256(parentBytes) === "eaf3bd632c788ef7ed760ba914265b1a62ff1371f6d532cccd7a11977d85bcc3");
check("parent-runner-stage-set", canonicalJson(stageIds(parentBytes.toString("utf8"))) === canonicalJson(expectedParent));
check("current-runner-stage-set", canonicalJson(stageIds(currentBytes.toString("utf8"))) === canonicalJson(expectedCurrent));
check("no-deletion", expectedParent.every((id) => expectedCurrent.includes(id)) && expectedCurrent.filter((id) => !expectedParent.includes(id)).length === 1);
check("truth-boundary", migration.scoreImprovementClaimed === false && migration.globalDecision === "NO_GO" && migration.live === false && migration.saleEnabled === false && migration.productionApproved === false && migration.worldClassProven === false);
const collapsed = structuredClone(migration); collapsed.currentStageIds.pop(); collapsed.newDenominator = 28;
const collapsedCore = { ...collapsed }; delete collapsedCore.migrationDigestSha256;
check("negative-collapse", collapsed.migrationDigestSha256 !== sha256(canonicalJson(collapsedCore)) && collapsed.currentStageIds.length !== 29);
const tampered = structuredClone(migration); tampered.migrationDigestSha256 = "0".repeat(64);
const tamperedCore = { ...tampered }; delete tamperedCore.migrationDigestSha256;
check("negative-digest", tampered.migrationDigestSha256 !== sha256(canonicalJson(tamperedCore)));
assert.equal(checks.length, 17, "a102r42_frozen_regression_migration_verifier_denominator");
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r42.frozen-regression-denominator-migration-verification.v1",
  revisionId: REV,
  status: failed.length === 0 ? "PASS_A102R42_FROZEN_REGRESSION_DENOMINATOR_MIGRATION_28_TO_29_ZERO_REMOVED" : "FAIL_A102R42_FROZEN_REGRESSION_DENOMINATOR_MIGRATION",
  checks: checks.length, passed: checks.length - failed.length, failed: failed.length,
  oldDenominator: 28, newDenominator: 29, retainedStages: 28, addedStages: 1, removedStages: 0,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
  failures: failed,
}, null, 2));
if (failed.length > 0) process.exit(1);
