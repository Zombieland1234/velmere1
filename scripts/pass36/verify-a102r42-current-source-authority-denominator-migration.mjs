import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const MIGRATION_PATH = "config/pass36/a102r42-current-source-authority-denominator-migration.json";
const PARENT_PATH = "config/pass36/a102r41-current-source-authority-denominator-migration.json";
const TEST_PATH = "scripts/pass36/test-a102r42-current-source-authority-preflight.mjs";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => Array.isArray(value)
  ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const migration = parseStrictJsonCli(fs.readFileSync(MIGRATION_PATH, "utf8"), { maxBytes: 1024 * 1024, maxDepth: 64, maxNodes: 100000, requireObject: true });
const parentBytes = fs.readFileSync(PARENT_PATH);
const parent = parseStrictJsonCli(parentBytes.toString("utf8"), { maxBytes: 1024 * 1024, maxDepth: 64, maxNodes: 100000, requireObject: true });
const expectedRetained = [...parent.retainedIds, ...parent.addedIds];
const expectedAdded = ["unknown-authority-profile-rejected", "authority-source-parent-alias-rejected", "a58-coherent-archive-contract-substitution-rejected", "compatibility-promotion-escalation-rejected", "compatibility-pointer-plane-reclassification-rejected", "mode-policy-revision-parent-drift-rejected", "browser-denominator-collapse-rejected", "popup-tab-denominator-collapse-rejected", "known-authority-profile-root-downgrade-rejected", "historical-plane-metadata-drift-rejected", "historical-r26-plane-metadata-drift-rejected", "forbidden-promotion-alias-rejected", "authority-duplicate-json-key-rejected", "mode-policy-duplicate-json-key-rejected"];

function validate(document) {
  const errors = [];
  const add = (condition, id) => { if (!condition) errors.push(id); };
  const core = { ...document }; delete core.migrationDigestSha256;
  add(document.schemaVersion === "velmere.pass36.a102r42.current-source-authority-denominator-migration.v1", "schema");
  add(document.classification === "FORMAL_UNKNOWN_AUTHORITY_PROFILE_FAIL_CLOSED_EXPANSION_NO_SCORE_CREDIT", "classification");
  add(document.migrationDigestSha256 === sha256(canonical(core)), "digest");
  add(document.parentMigrationPath === PARENT_PATH && document.parentMigrationRawSha256 === sha256(parentBytes) && document.parentMigrationDigestSha256 === parent.migrationDigestSha256, "parent-anchor");
  add(document.oldDenominator === 46 && document.newDenominator === 60, "denominators");
  add(document.retainedCount === 46 && document.addedCount === 14 && document.removedCount === 0, "counts");
  add(canonical(document.retainedIds) === canonical(expectedRetained) && new Set(document.retainedIds).size === 46, "retained-exact");
  add(canonical(document.addedIds) === canonical(expectedAdded) && new Set(document.addedIds).size === 14, "added-exact");
  add(document.retainedIds.every((id) => !document.addedIds.includes(id)), "sets-disjoint");
  add([...document.retainedIds, ...document.addedIds].every((id) => typeof id === "string" && id.length > 3 && !/[?*]/u.test(id)), "ids-exact");
  add(document.scoreImprovementClaimed === false && document.globalDecision === "NO_GO" && document.live === false && document.saleEnabled === false && document.productionApproved === false && document.worldClassProven === false, "no-promotion");
  return { passed: errors.length === 0, errors };
}
function resign(document) { const core = { ...document }; delete core.migrationDigestSha256; document.migrationDigestSha256 = sha256(canonical(core)); return document; }
const checks = [];
const check = (id, condition, detail = null) => { const row = { id, passed: Boolean(condition), detail }; checks.push(row); assert.ok(row.passed, id); };
const baseline = validate(migration);
check("migration-valid", baseline.passed, baseline.errors);
check("parent-raw-anchor", sha256(parentBytes) === "1e5b5541b318b2e0a804ef37ac754b9cb4ad5f3ae38f5c763adc891d2c4f39ec");
check("parent-retained-exact", canonical(migration.retainedIds) === canonical(expectedRetained));
const testSource = fs.readFileSync(TEST_PATH, "utf8");
for (const id of [...migration.retainedIds, ...migration.addedIds]) {
  const sourceNeedle = id.startsWith("release-binding:") ? JSON.stringify(id.slice("release-binding:".length)) : JSON.stringify(id);
  check(`current-test-id:${id}`, testSource.includes(sourceNeedle), id);
}
for (const [id, mutate] of [
  ["denominator-collapse-rejected", (d) => { d.newDenominator = 59; }],
  ["retained-id-removal-rejected", (d) => { d.retainedIds.pop(); d.retainedCount = 45; }],
  ["duplicate-added-id-rejected", (d) => { d.addedIds[13] = d.addedIds[0]; }],
  ["unknown-or-wildcard-id-rejected", (d) => { d.addedIds[13] = "authority-*"; }],
  ["parent-anchor-tamper-rejected", (d) => { d.parentMigrationRawSha256 = "0".repeat(64); }],
]) {
  const document = structuredClone(migration); mutate(document); resign(document);
  const result = validate(document); check(id, result.passed === false, result.errors);
}
assert.equal(checks.length, 68, "a102r42_current_source_authority_migration_verifier_denominator");
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r42.current-source-authority-denominator-migration-verification.v1",
  status: failed.length === 0 ? "PASS_A102R42_CURRENT_SOURCE_AUTHORITY_DENOMINATOR_MIGRATION_46_TO_60_NO_PROMOTION" : "FAIL_A102R42_CURRENT_SOURCE_AUTHORITY_DENOMINATOR_MIGRATION",
  checks: checks.length, passed: checks.length - failed.length, failed: failed.length,
  oldDenominator: 46, newDenominator: 60, retained: 46, added: 14, removed: 0,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
  failures: failed,
}, null, 2));
if (failed.length > 0) process.exit(1);
