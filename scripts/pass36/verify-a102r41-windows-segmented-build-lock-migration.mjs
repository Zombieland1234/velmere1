import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const migrationPath = path.join(root, "config/pass36/a102r41-windows-segmented-build-lock-denominator-migration.json");
const lockSourcePath = path.join(root, "lib/build/segmented-build-integrity.mjs");
const integrityTestPath = path.join(root, "scripts/deployment/test-segmented-build-integrity.mjs");
const orphanTestPath = path.join(root, "scripts/deployment/test-orphan-build-lock-recovery.mjs");
const revisionId = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";

let assertions = 0;
function check(value, message) {
  assertions += 1;
  if (!value) throw new Error(`windows_segmented_build_lock_migration_failed:${message}`);
}
function unique(values) {
  return Array.isArray(values) && new Set(values).size === values.length;
}
function runJson(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
    windowsHide: true,
  });
  check(result.status === 0, `${path.basename(scriptPath)}_exit`);
  check(result.stderr === "", `${path.basename(scriptPath)}_stderr`);
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`windows_segmented_build_lock_migration_failed:${path.basename(scriptPath)}_json`);
  }
}

check(process.platform === "win32", "exact_windows_platform_required");
const migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));
const withoutDigest = { ...migration };
delete withoutDigest.migrationDigestSha256;
const digest = createHash("sha256").update(JSON.stringify(withoutDigest)).digest("hex");
check(migration.schemaVersion === "velmere.pass36.a102r41.windows-segmented-build-lock-denominator-migration.v1", "schema");
check(migration.revisionId === revisionId, "revision");
check(migration.scoreCredit === false, "score_credit_false");
check(migration.testsDeleted === 0, "tests_deleted_zero");
check(migration.migrationDigestSha256 === digest, "self_digest");

const segmented = migration.segmentedBuildIntegrity;
check(segmented.parentLinuxDenominator === 57, "segmented_parent_57");
check(segmented.retainedParentRows === 57, "segmented_retained_57");
check(segmented.addedCommonRows === 21, "segmented_added_21");
check(segmented.removedParentRows === 0, "segmented_removed_zero");
check(segmented.currentLinuxDenominator === segmented.retainedParentRows + segmented.addedCommonRows, "segmented_linux_relation");
check(segmented.currentCommonDenominator === segmented.currentLinuxDenominator - segmented.linuxPlatformRows, "segmented_common_relation");
check(segmented.currentWindowsDenominator === segmented.currentCommonDenominator + segmented.windowsPlatformRows, "segmented_windows_relation");
check(segmented.currentWindowsDenominator === 81, "segmented_windows_81");
check(segmented.addedCommonRowIds.length === 21 && unique(segmented.addedCommonRowIds), "segmented_added_ids_unique");
check(segmented.windowsPlatformRowIds.length === 5 && unique(segmented.windowsPlatformRowIds), "segmented_windows_ids_unique");
check(new Set([...segmented.addedCommonRowIds, ...segmented.windowsPlatformRowIds]).size === 26, "segmented_id_sets_disjoint");
check(segmented.windowsPhysicallyObserved === true, "segmented_windows_observed");
check(segmented.linuxCurrentPhysicallyObservedInThisRevision === false, "segmented_linux_not_overclaimed");

const orphan = migration.orphanRecovery;
check(orphan.parentLinuxDenominator === 26, "orphan_parent_linux_26");
check(orphan.currentLinuxDenominator === 26, "orphan_current_linux_26");
check(orphan.retainedLinuxRows === 26 && orphan.removedLinuxRows === 0, "orphan_linux_retained");
check(orphan.parentWindowsExecutableDenominator === 0, "orphan_parent_windows_zero");
check(orphan.currentWindowsFailClosedDenominator === 34, "orphan_windows_34");
check(orphan.addedWindowsRows === 34, "orphan_added_34");
check(orphan.windowsRowIds.length === 34 && unique(orphan.windowsRowIds), "orphan_windows_ids_unique");
check(orphan.windowsPhysicallyObserved === true, "orphan_windows_observed");

const lockSource = fs.readFileSync(lockSourcePath, "utf8");
const integrityTestSource = fs.readFileSync(integrityTestPath, "utf8");
const orphanTestSource = fs.readFileSync(orphanTestPath, "utf8");
check(lockSource.includes('process.platform !== "linux" && process.platform !== "win32"'), "platform_allowlist");
check(lockSource.includes("fs.constants.O_EXCL | fs.constants.O_RDWR"), "exclusive_read_write_descriptor");
check(lockSource.includes("{ bigint: true }"), "bigint_file_identity");
check(lockSource.includes("boundedDescriptorBytes(lock.descriptor)"), "descriptor_bound_release_read");
check(lockSource.includes("REJECTED_PLATFORM_PROCESS_IDENTITY_UNAVAILABLE"), "orphan_platform_rejection");
check(lockSource.includes("WINDOWS_DIRECTORY_FSYNC_UNAVAILABLE_NO_CRASH_DURABILITY_CREDIT"), "windows_directory_fsync_truth");
check(integrityTestSource.includes('"--probe-race"') && integrityTestSource.includes("raceWinners.length, 1"), "simultaneous_race_test");
check(integrityTestSource.includes('"lock_inode_changed"') && integrityTestSource.includes("intermediate reparse component"), "inode_and_intermediate_reparse_tests");
check(orphanTestSource.includes("PASS_LOCAL_WINDOWS_ORPHAN_RECOVERY_FAIL_CLOSED"), "windows_orphan_negative_lane");

const integrity = runJson(integrityTestPath);
check(integrity.status === "OFFLINE-PROVEN", "integrity_status");
check(integrity.assertions === 81, "integrity_assertions_81");
check(integrity.truthBoundary.includes("Windows ACL ownership") && integrity.truthBoundary.includes("orphan recovery"), "integrity_truth_boundary");
const orphanResult = runJson(orphanTestPath);
check(orphanResult.status === "PASS_LOCAL_WINDOWS_ORPHAN_RECOVERY_FAIL_CLOSED", "orphan_status");
check(orphanResult.assertions === 34, "orphan_assertions_34");
check(orphanResult.productionLocksRecovered === 0 && orphanResult.exactBuildCredit === false, "orphan_zero_external_credit");

console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r41.windows-segmented-build-lock-migration-verification.v1",
  status: "PASS_LOCAL_WINDOWS_BUILD_LOCK_COORDINATION_NO_EXTERNAL_SECURITY_CREDIT",
  assertions,
  segmentedBuildIntegrity: { observed: integrity.assertions, required: 81 },
  orphanRecoveryFailClosed: { observed: orphanResult.assertions, required: 34 },
  testsDeleted: 0,
  buildExecuted: false,
  exactBuildCredit: false,
  browserCredit: false,
  truthBoundary: "Exact Windows local coordination tests only. ACL ownership, native handle-relative reparse resistance, directory-entry crash durability, orphan recovery, production, release, staging, LIVE and sale credit remain unproven.",
}, null, 2));
