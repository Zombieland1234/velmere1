import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fs.realpathSync(process.cwd());
const revisionId = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const migrationPath = path.join(root, "config/pass36/a102r41-next-tracing-and-build-receipt-denominator-migration.json");
const nextConfigPath = path.join(root, "next.config.mjs");
const compatPath = path.join(root, "lib/build/segmented-build-compat.mjs");
const compatTestPath = path.join(root, "scripts/deployment/test-segmented-build-compat.mjs");

let assertions = 0;
let dedicatedAssertions = 0;
function check(value, message, { dedicated = false } = {}) {
  assertions += 1;
  if (dedicated) dedicatedAssertions += 1;
  if (!value) throw new Error(`a102r41_next_tracing_boundary_failed:${message}`);
}
function unique(values) {
  return Array.isArray(values) && new Set(values).size === values.length;
}

const migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));
const withoutDigest = { ...migration };
delete withoutDigest.migrationDigestSha256;
const digest = createHash("sha256").update(JSON.stringify(withoutDigest)).digest("hex");
check(migration.schemaVersion === "velmere.pass36.a102r41.next-tracing-and-build-receipt-denominator-migration.v1", "migration_schema");
check(migration.revisionId === revisionId, "migration_revision");
check(migration.scoreCredit === false, "migration_score_credit_false");
check(migration.testsDeleted === 0, "migration_tests_deleted_zero");
check(migration.migrationDigestSha256 === digest, "migration_self_digest");
const compatMigration = migration.segmentedBuildCompat;
check(compatMigration.parentDenominator === 6, "compat_parent_6");
check(compatMigration.currentDenominator === 8, "compat_current_8");
check(compatMigration.retainedRows === 6 && compatMigration.addedRows === 2 && compatMigration.removedRows === 0, "compat_zero_collapse");
check(compatMigration.currentDenominator === compatMigration.retainedRows + compatMigration.addedRows, "compat_relation");
check(compatMigration.addedRowIds.length === 2 && unique(compatMigration.addedRowIds), "compat_added_ids_unique");
const tracingMigration = migration.nextTracingAuthority;
check(tracingMigration.parentDedicatedDenominator === 0 && tracingMigration.currentDedicatedDenominator === 12, "tracing_0_to_12");
check(tracingMigration.addedRows === 12 && tracingMigration.removedRows === 0, "tracing_zero_collapse");
check(tracingMigration.rowIds.length === 12 && unique(tracingMigration.rowIds), "tracing_ids_unique");

const imported = await import(`${new URL("../../next.config.mjs", import.meta.url).href}?a102r41-tracing-verifier`);
const nextConfig = imported.default;
const configDirectory = path.dirname(fileURLToPath(new URL("../../next.config.mjs", import.meta.url)));
check(nextConfig !== null && typeof nextConfig === "object", "config_export_object", { dedicated: true });
check(path.isAbsolute(nextConfig.outputFileTracingRoot), "tracing_root_absolute", { dedicated: true });
check(fs.realpathSync(nextConfig.outputFileTracingRoot) === root, "tracing_root_canonical", { dedicated: true });
check(fs.realpathSync(configDirectory) === root, "tracing_root_config_directory", { dedicated: true });
const nextSource = fs.readFileSync(nextConfigPath, "utf8");
check(nextSource.includes("path.dirname(fileURLToPath(import.meta.url))"), "tracing_file_url_derivation", { dedicated: true });
let cursor = path.dirname(root);
let ancestorLockPresent = false;
while (cursor !== path.parse(cursor).root) {
  if (fs.existsSync(path.join(cursor, "package-lock.json"))) {
    ancestorLockPresent = true;
    break;
  }
  cursor = path.dirname(cursor);
}
check(ancestorLockPresent && nextConfig.outputFileTracingRoot === root, "ancestor_lock_not_authority", { dedicated: true });

const compatRun = spawnSync(process.execPath, [compatTestPath], {
  cwd: root,
  encoding: "utf8",
  timeout: 30_000,
  windowsHide: true,
});
check(compatRun.status === 0, "compat_test_exit", { dedicated: true });
check(compatRun.stderr === "", "compat_test_stderr", { dedicated: true });
let compatReceipt;
try {
  compatReceipt = JSON.parse(compatRun.stdout);
} catch {
  throw new Error("a102r41_next_tracing_boundary_failed:compat_test_json");
}
check(compatReceipt.status === "OFFLINE-PROVEN", "compat_test_status", { dedicated: true });
check(compatReceipt.assertions === 8, "compat_test_denominator", { dedicated: true });
const compatSource = fs.readFileSync(compatPath, "utf8");
check(compatSource.includes("reportedOutputPath(outputRoot, candidate)"), "compat_relative_reporting_source", { dedicated: true });
check(compatSource.includes("rawAbsolutePathDisclosed: false"), "compat_no_disclosure_source", { dedicated: true });
check(dedicatedAssertions === tracingMigration.currentDedicatedDenominator, "dedicated_denominator_exact");

console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r41.next-tracing-root-and-build-receipt-verification.v1",
  status: "PASS_LOCAL_NEXT_TRACING_SOURCE_AUTHORITY_AND_BUILD_RECEIPT_REDACTION",
  assertions,
  dedicatedAssertions,
  segmentedBuildCompat: { observed: compatReceipt.assertions, required: 8 },
  ancestorLockPhysicallyPresent: ancestorLockPresent,
  tracingRootExactProjectRoot: true,
  rawAbsolutePathDisclosed: false,
  buildCredit: false,
  browserCredit: false,
  truthBoundary: "Configuration authority and fixture receipt redaction only. A final physical Webpack/Turbopack build must independently prove flat standalone layout and no ancestor-lock warning on frozen bytes.",
}, null, 2));
