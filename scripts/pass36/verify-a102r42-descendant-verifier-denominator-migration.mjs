import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const PATH = "config/pass36/a102r42-descendant-verifier-denominator-migration.json";
const PARENT_PATH = "scripts/pass36/verify-a102r41-current-root-descendant.mjs";
const CURRENT_PATH = "scripts/pass36/verify-a102r42-current-root-descendant.mjs";
const REV = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}` : JSON.stringify(value);
const retainedIds = [
  "identity", "parent", "source-rejected", "payload", "binding:stateSha256", "binding:completionProgramSha256",
  "binding:sourceModePolicySha256", "binding:sourceModeMigrationSha256", "binding:approvedChangeLedgerSha256",
  "binding:historicalSparseEdgeLedgerSha256", "binding:currentSourceAuthorityMigrationSha256", "binding:a78LockfileMigrationSha256",
  "self-digest", "authority-denominator", "browser-denominator", "security-containment", "real-denominators-zero", "sku",
  "promotion", "historical-chain",
];
const addedIds = [
  "parent-raw", "binding:failureFinalizationMigrationSha256", "binding:frozenRegressionMigrationSha256",
  "binding:a80r1ReceiptMigrationSha256", "binding:packageBoundaryMigrationSha256", "binding:a42CriticalRebaselineSha256",
  "binding:descendantVerifierMigrationSha256", "static-semantic-documents",
];
const currentIds = ["identity", "parent", "parent-raw", "source-rejected", "payload", "binding:stateSha256", "binding:completionProgramSha256", "binding:sourceModePolicySha256", "binding:sourceModeMigrationSha256", "binding:approvedChangeLedgerSha256", "binding:historicalSparseEdgeLedgerSha256", "binding:currentSourceAuthorityMigrationSha256", "binding:failureFinalizationMigrationSha256", "binding:frozenRegressionMigrationSha256", "binding:a80r1ReceiptMigrationSha256", "binding:packageBoundaryMigrationSha256", "binding:a42CriticalRebaselineSha256", "binding:a78LockfileMigrationSha256", "binding:descendantVerifierMigrationSha256", "self-digest", "authority-denominator", "browser-denominator", "security-containment", "real-denominators-zero", "sku", "promotion", "static-semantic-documents", "historical-chain"];
const migration = parseStrictJsonCli(fs.readFileSync(PATH, "utf8"), { maxBytes: 1024 * 1024, maxDepth: 64, maxNodes: 100000, requireObject: true });
const parentBytes = fs.readFileSync(PARENT_PATH);
const currentSource = fs.readFileSync(CURRENT_PATH, "utf8");
const validate = (document) => {
  const core = { ...document }; delete core.migrationDigestSha256;
  return document.migrationDigestSha256 === sha256(canonical(core))
    && document.parentVerifierPath === PARENT_PATH
    && document.parentVerifierByteLength === 4348
    && document.parentVerifierSha256 === "034f5152f64791d4af4133973c65ebd585fd0b00adfe85bfdf13673214867c0f"
    && document.oldDenominator === 20 && document.newDenominator === 28
    && document.retainedCount === 20 && document.addedCount === 8 && document.removedCount === 0
    && canonical(document.retainedIds) === canonical(retainedIds)
    && canonical(document.addedIds) === canonical(addedIds)
    && canonical(document.currentIds) === canonical(currentIds)
    && new Set(document.currentIds).size === 28;
};
const resign = (document) => { const core = { ...document }; delete core.migrationDigestSha256; document.migrationDigestSha256 = sha256(canonical(core)); return document; };
const checks = [];
const check = (id, passed, detail = null) => { const row = { id, passed: Boolean(passed), detail }; checks.push(row); assert.ok(row.passed, id); };
check("schema", migration.schemaVersion === "velmere.pass36.a102r42.descendant-verifier-denominator-migration.v1");
check("identity", migration.revisionId === REV && migration.parentRevisionId === PARENT);
check("digest", validate(migration));
check("parent-anchor", migration.parentVerifierPath === PARENT_PATH && migration.parentVerifierByteLength === 4348 && migration.parentVerifierSha256 === "034f5152f64791d4af4133973c65ebd585fd0b00adfe85bfdf13673214867c0f" && parentBytes.length === migration.parentVerifierByteLength && sha256(parentBytes) === migration.parentVerifierSha256);
check("denominators", migration.oldDenominator === 20 && migration.newDenominator === 28);
check("counts", migration.retainedCount === 20 && migration.addedCount === 8 && migration.removedCount === 0);
check("retained-exact", canonical(migration.retainedIds) === canonical(retainedIds));
check("added-exact", canonical(migration.addedIds) === canonical(addedIds));
check("current-exact", canonical(migration.currentIds) === canonical(currentIds));
check("set-integrity", new Set([...migration.retainedIds, ...migration.addedIds]).size === 28 && migration.retainedIds.every((id) => migration.currentIds.includes(id)) && migration.addedIds.every((id) => migration.currentIds.includes(id)));
check("current-source-contract", currentSource.includes('assert.equal(checks.length, 28') && ["A78_MIGRATION", "DESCENDANT_VERIFIER_MIGRATION", "static-semantic-documents"].every((needle) => currentSource.includes(needle)));
check("truth-boundary", migration.scoreImprovementClaimed === false && migration.globalDecision === "NO_GO" && migration.live === false && migration.saleEnabled === false && migration.productionApproved === false && migration.worldClassProven === false);
const collapsed = structuredClone(migration); collapsed.newDenominator = 27; collapsed.currentIds.pop(); resign(collapsed);
check("negative-collapse", !validate(collapsed));
const removed = structuredClone(migration); removed.retainedIds.pop(); removed.retainedCount = 19; resign(removed);
check("negative-retained-removal", !validate(removed));
const duplicate = structuredClone(migration); duplicate.addedIds[7] = duplicate.addedIds[0]; resign(duplicate);
check("negative-added-duplicate", !validate(duplicate));
const tampered = structuredClone(migration); tampered.parentVerifierSha256 = "0".repeat(64); resign(tampered);
check("negative-parent-anchor", !validate(tampered));
assert.equal(checks.length, 16, "a102r42_descendant_migration_verifier_denominator");
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r42.descendant-verifier-denominator-migration-verification.v1", revisionId: REV, status: failed.length === 0 ? "PASS_A102R42_DESCENDANT_VERIFIER_DENOMINATOR_MIGRATION_20_TO_28_ZERO_REMOVED" : "FAIL_A102R42_DESCENDANT_VERIFIER_DENOMINATOR_MIGRATION", checks: checks.length, passed: checks.length - failed.length, failed: failed.length, oldDenominator: 20, newDenominator: 28, retained: 20, added: 8, removed: 0, globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false, failures: failed }, null, 2));
if (failed.length > 0) process.exit(1);
