#!/usr/bin/env node
import crypto from "node:crypto";
import { readDescriptorBoundRegularFile } from "./descriptor-bound-regular-file.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const REVISION = "VELMERE_PASS36_A102R44P3_ACTION_REQUIRED_CURRENT_BYTE_SHIELD_PRO_REAL_MARKETS_AND_MULTILINGUAL_AI_MATRIX_CLOSURE_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P2_ACTION_REQUIRED_AUTOMATED_INFORMATIONAL_SKU_PDF_POSIX_TOOL_BOUNDARY_AND_OFFICIAL_TOOLCHAIN_ADMISSION_NO_LIVE_CREDIT";
const MIGRATION_PATH = "config/pass36/a102r44p3-current-byte-product-matrix-rebaseline.json";
const HEX64 = /^[a-f0-9]{64}$/u;

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const readJson = (filePath, maxBytes = 16 * 1024 * 1024) => {
  const row = readDescriptorBoundRegularFile(filePath, { maxBytes, errorPrefix: "a102r44p3_json" });
  return { row, value: parseStrictJsonCli(row.bytes.toString("utf8"), { maxBytes, maxDepth: 128, maxNodes: 2_000_000, requireObject: true }) };
};
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const expectRejected = (id, fn) => {
  let rejected = false;
  try { fn(); } catch { rejected = true; }
  check(id, rejected);
};
const invariant = (condition, code) => { if (!condition) throw new Error(code); };

const { row: migrationFile, value: migration } = readJson(MIGRATION_PATH);
check("migration:descriptor-bound", migrationFile.descriptorBound === true, migrationFile.binding);
check("migration:schema", migration.schemaVersion === "velmere.pass36.a102r44p3.current-byte-product-matrix-rebaseline.v1", migration.schemaVersion);
check("migration:revision", migration.revisionId === REVISION && migration.parentRevisionId === PARENT, { revisionId: migration.revisionId, parentRevisionId: migration.parentRevisionId });
check("migration:rows", Array.isArray(migration.migrations) && migration.migrations.length === 2 && new Set(migration.migrations.map((row) => row.id)).size === 2);
check("migration:digest-shape", HEX64.test(String(migration.migrationDigestSha256 ?? "")), migration.migrationDigestSha256);
const digestInput = structuredClone(migration);
delete digestInput.migrationDigestSha256;
check("migration:self-digest", sha256(Buffer.from(canonicalJson(digestInput))) === migration.migrationDigestSha256);

const { row: parentManifestFile, value: parentManifest } = readJson(migration.parentSourceManifest.path);
check("parent-manifest:descriptor-bound", parentManifestFile.descriptorBound === true, parentManifestFile.binding);
check("parent-manifest:sha", parentManifestFile.binding.sha256 === migration.parentSourceManifest.sha256, parentManifestFile.binding);
check("parent-manifest:identity", parentManifest.revisionId === PARENT && parentManifest.aggregateSha256 === migration.parentSourceManifest.aggregateSha256 && parentManifest.fileCount === migration.parentSourceManifest.fileCount, { revisionId: parentManifest.revisionId, aggregateSha256: parentManifest.aggregateSha256, fileCount: parentManifest.fileCount });
const parentEntries = new Map(parentManifest.entries.map((row) => [row.path, row]));

const verifyMigrationRow = (row) => {
  invariant(row && typeof row === "object", "row_invalid");
  invariant(HEX64.test(row.parentPolicySha256) && HEX64.test(row.currentPolicySha256) && HEX64.test(row.oldBoundSha256) && HEX64.test(row.currentBoundSha256), "row_hash_invalid");
  invariant(row.denominatorsChanged === false, "row_denominator_change_forbidden");
  const parentEntry = parentEntries.get(row.policyPath);
  invariant(parentEntry?.sha256 === row.parentPolicySha256, "parent_policy_manifest_mismatch");
  const policyFile = readDescriptorBoundRegularFile(row.policyPath, { maxBytes: 2 * 1024 * 1024, errorPrefix: "a102r44p3_policy" });
  invariant(policyFile.binding.sha256 === row.currentPolicySha256, "current_policy_hash_mismatch");
  const policyRaw = policyFile.bytes.toString("utf8");
  const policy = parseStrictJsonCli(policyRaw, { maxBytes: 2 * 1024 * 1024, maxDepth: 64, maxNodes: 200_000, requireObject: true });
  const binding = policy.inputs?.[row.bindingKey];
  invariant(binding?.path === row.boundPath && binding?.sha256 === row.currentBoundSha256, "current_binding_mismatch");
  const boundFile = readDescriptorBoundRegularFile(row.boundPath, { maxBytes: 16 * 1024 * 1024, errorPrefix: "a102r44p3_bound" });
  invariant(boundFile.binding.sha256 === row.currentBoundSha256, "bound_file_hash_mismatch");
  invariant(policyRaw.split(row.currentBoundSha256).length - 1 === 1, "current_hash_occurrence_not_one");
  invariant(!policyRaw.includes(row.oldBoundSha256), "old_hash_still_present");
  const reconstructedParent = policyRaw.replace(row.currentBoundSha256, row.oldBoundSha256);
  invariant(Buffer.byteLength(reconstructedParent) === policyFile.binding.byteLength, "replacement_length_changed");
  invariant(sha256(Buffer.from(reconstructedParent)) === row.parentPolicySha256, "parent_policy_reconstruction_mismatch");
  return { policy: policyFile.binding, bound: boundFile.binding };
};

for (const row of migration.migrations) {
  let result = null;
  let error = null;
  try { result = verifyMigrationRow(row); } catch (caught) { error = caught instanceof Error ? caught.message : String(caught); }
  check(`row:${row.id}`, error === null, error ?? result);
}

const d = migration.denominatorMigration;
check("denominator:a85-assets", d.a85Assets.old === 318 && d.a85Assets.new === 318 && d.a85Assets.removed === 0, d.a85Assets);
check("denominator:a85-packets", d.a85TierPackets.old === 954 && d.a85TierPackets.new === 954 && d.a85TierPackets.removed === 0, d.a85TierPackets);
check("denominator:a85-mutations", d.a85SemanticMutations.old === 15264 && d.a85SemanticMutations.new === 15264 && d.a85SemanticMutations.removed === 0, d.a85SemanticMutations);
check("denominator:a86-instruments", d.a86Instruments.old === 583 && d.a86Instruments.new === 583 && d.a86Instruments.removed === 0, d.a86Instruments);
check("denominator:a86-packets", d.a86TierPackets.old === 1749 && d.a86TierPackets.new === 1749 && d.a86TierPackets.removed === 0, d.a86TierPackets);
check("denominator:a86-mutations", d.a86SemanticMutations.old === 31482 && d.a86SemanticMutations.new === 31482 && d.a86SemanticMutations.removed === 0, d.a86SemanticMutations);
check("credit:fail-closed", migration.creditBoundary.localFixtureCredit === true && ["realDataCredit", "providerRightsCredit", "productionBrowserCredit", "paidCredit", "liveCredit", "saleEnabled"].every((key) => migration.creditBoundary[key] === false), migration.creditBoundary);

expectRejected("negative:collapsed-a85-assets", () => {
  const clone = structuredClone(migration); clone.denominatorMigration.a85Assets.new = 317;
  invariant(clone.denominatorMigration.a85Assets.old === clone.denominatorMigration.a85Assets.new && clone.denominatorMigration.a85Assets.removed === 0, "collapse");
});
expectRejected("negative:removed-a86-row", () => {
  const clone = structuredClone(migration); clone.denominatorMigration.a86Instruments.removed = 1;
  invariant(clone.denominatorMigration.a86Instruments.removed === 0, "removed");
});
expectRejected("negative:binding-tamper", () => {
  const clone = structuredClone(migration.migrations[0]); clone.currentBoundSha256 = "0".repeat(64); verifyMigrationRow(clone);
});
expectRejected("negative:parent-hash-tamper", () => {
  const clone = structuredClone(migration.migrations[1]); clone.parentPolicySha256 = "f".repeat(64); verifyMigrationRow(clone);
});
expectRejected("negative:credit-promotion", () => {
  const clone = structuredClone(migration); clone.creditBoundary.liveCredit = true;
  invariant(["realDataCredit", "providerRightsCredit", "productionBrowserCredit", "paidCredit", "liveCredit", "saleEnabled"].every((key) => clone.creditBoundary[key] === false), "promotion");
});

const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a102r44p3.current-byte-product-matrix-rebaseline-verification.v1",
  revisionId: REVISION,
  status: failed.length ? "FAIL_A102R44P3_CURRENT_BYTE_PRODUCT_MATRIX_REBASELINE" : "PASS_A102R44P3_CURRENT_BYTE_PRODUCT_MATRIX_REBASELINE_NO_REAL_OR_LIVE_CREDIT",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  migrations: migration.migrations.map((row) => ({ id: row.id, policyPath: row.policyPath, boundPath: row.boundPath, parentPolicySha256: row.parentPolicySha256, currentPolicySha256: row.currentPolicySha256, oldBoundSha256: row.oldBoundSha256, currentBoundSha256: row.currentBoundSha256 })),
  denominatorMigration: migration.denominatorMigration,
  creditBoundary: migration.creditBoundary,
  truthBoundary: migration.truthBoundary,
  rows: checks,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
