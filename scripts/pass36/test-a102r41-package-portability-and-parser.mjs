import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  parseA102R41ManifestBytes,
  validateA102R41PortablePathSet,
  validateA102R41SourcePath,
} from "./package-a102r41-deterministic.mjs";
import {
  dependencyInstallPostconditionPassed,
  nestedReceiptContract,
  sanitizeEvidenceOutput,
  validateA58,
  verifyExecutionPackagedBytes,
  writeFailureReceipt,
} from "./verify-a102r41-clean-unpack.mjs";
import { verifyPackageBoundaryMigration } from "./verify-a102r41-package-boundary-denominator-migration.mjs";

const REVISION_ID = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const rejects = (id, fn, fragment) => {
  let error = null;
  try { fn(); } catch (caught) { error = caught; }
  check(id, error instanceof Error && error.message.includes(fragment), error?.message ?? null);
};

check("accept:portable-path-set", (() => { validateA102R41PortablePathSet(["a/file.txt", "b/script.mjs"]); return true; })());
check("accept:source-path", validateA102R41SourcePath("scripts/pass36/example.mjs") === "scripts/pass36/example.mjs");
rejects("reject:ntfs-ads", () => validateA102R41PortablePathSet(["a/file.txt:stream"]), "windows_ads_or_drive_segment");
rejects("reject:wildcard-segment", () => validateA102R41PortablePathSet(["a/file?.txt"]), "windows_invalid_segment_character");
rejects("reject:dos-con", () => validateA102R41PortablePathSet(["CON"]), "windows_reserved_segment");
rejects("reject:dos-nul-extension", () => validateA102R41PortablePathSet(["NUL.txt"]), "windows_reserved_segment");
rejects("reject:trailing-dot", () => validateA102R41PortablePathSet(["a/file."]), "windows_trailing_dot_or_space");
rejects("reject:trailing-space", () => validateA102R41PortablePathSet(["a/file "]), "windows_trailing_dot_or_space");
rejects("reject:file-directory-prefix", () => validateA102R41PortablePathSet(["a", "a/file"]), "file_directory_prefix_collision");
rejects("reject:casefold-collision", () => validateA102R41PortablePathSet(["A/file", "a/file"]), "casefold_path_collision");
rejects("reject:environment-source", () => validateA102R41SourcePath(".env.production"), "source_forbidden_payload_path");
rejects("reject:artifacts-source", () => validateA102R41SourcePath("artifacts/receipt.json"), "source_forbidden_payload_path");
rejects("reject:database-source", () => validateA102R41SourcePath("data/runtime.sqlite"), "source_forbidden_payload_path");
rejects("reject:runtime-log-source", () => validateA102R41SourcePath("logs/runtime.log"), "source_forbidden_payload_path");
rejects("reject:duplicate-manifest-key", () => parseA102R41ManifestBytes(Buffer.from('{"schemaVersion":"x","schemaVersion":"y"}'), "source"), "strict_json_duplicate_key");
rejects("reject:forbidden-manifest-key", () => parseA102R41ManifestBytes(Buffer.from('{"__proto__":{}}'), "source"), "strict_json_forbidden_key");
rejects("reject:invalid-utf8-manifest", () => parseA102R41ManifestBytes(Buffer.from([0xff, 0xfe, 0xfd]), "source"), "a102r41_source_manifest_parse");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a102r41-package-hardening-"));
let cleanupError = null;
try {
  const executionRoot = path.join(tempRoot, "execution");
  fs.mkdirSync(executionRoot);
  const packagedBytes = Buffer.from("abc", "utf8");
  const packaged = [{ path: "a.txt", byteLength: packagedBytes.length, sha256: sha256(packagedBytes) }];
  const packagedPath = path.join(executionRoot, "a.txt");
  fs.writeFileSync(packagedPath, packagedBytes, { flag: "wx" });

  let execution = verifyExecutionPackagedBytes(packaged, executionRoot);
  check("accept:execution-packaged-exact", execution.passed && execution.packagedFilesVerified === 1 && execution.changedOrMissing.length === 0);

  fs.writeFileSync(packagedPath, "tampered", "utf8");
  execution = verifyExecutionPackagedBytes(packaged, executionRoot);
  check("reject:execution-packaged-tamper", !execution.passed && execution.changedOrMissing.length === 1);

  fs.unlinkSync(packagedPath);
  execution = verifyExecutionPackagedBytes(packaged, executionRoot);
  check("reject:execution-packaged-missing", !execution.passed && execution.changedOrMissing[0]?.actual === null);

  fs.writeFileSync(packagedPath, packagedBytes, { flag: "wx" });
  const forbiddenPath = path.join(executionRoot, ".env");
  fs.writeFileSync(forbiddenPath, "forbidden", { encoding: "utf8", flag: "wx" });
  execution = verifyExecutionPackagedBytes(packaged, executionRoot);
  check("reject:execution-forbidden-env", !execution.passed && execution.forbiddenAdded.some((row) => row.path === ".env"));
  fs.unlinkSync(forbiddenPath);

  const nodeModulesPath = path.join(executionRoot, "node_modules");
  fs.mkdirSync(nodeModulesPath);
  fs.writeFileSync(path.join(nodeModulesPath, "metadata.txt"), "allowed", { encoding: "utf8", flag: "wx" });
  execution = verifyExecutionPackagedBytes(packaged, executionRoot);
  check("accept:execution-allowed-node-modules-metadata", execution.passed && execution.addedFileCount === 1 && execution.addedContentsHashedForSourceAuthority === false);
  fs.rmSync(nodeModulesPath, { recursive: true, force: false });

  const junctionTarget = path.join(tempRoot, "junction-target");
  const junctionPath = path.join(executionRoot, "junction");
  fs.mkdirSync(junctionTarget);
  fs.symlinkSync(junctionTarget, junctionPath, "junction");
  rejects("reject:execution-symlink-reparse", () => verifyExecutionPackagedBytes(packaged, executionRoot), "a102r41_clean_execution_symlink_or_reparse:junction");
  fs.unlinkSync(junctionPath);

  const expectedFailedIds = [
    "a57-historical-manifest-verifies",
    "historical-a57-current-supplement-bound:_velmere/pass35/PASS35_EXTERNAL_BLOCKER_RECEIPT.json",
    "historical-a57-current-supplement-bound:_velmere/pass35/PASS35_LOCAL_PDF_QA_SUMMARY.json",
    "historical-a57-current-supplement-bound:_velmere/pass35/PASS35_LOCAL_PRODUCT_QUALITY_RECEIPT.json",
    "historical-a57-current-supplement-bound:_velmere/pass35/PASS35_READINESS_DASHBOARD.json",
    "historical-exact-byte-recovery:.velmere/orphan-quarantine-pass6.json",
    "historical-exact-byte-recovery:_velmere/VLM_PASS5_RELEASE_MANIFEST.json",
  ];
  const a58Checks = [
    ...Array.from({ length: 38 }, (_, index) => ({ id: `positive-${index + 1}`, ok: true, blocking: index === 0 })),
    ...expectedFailedIds.map((id) => ({ id, ok: false, blocking: false })),
  ];
  const a58 = {
    schemaVersion: "velmere.pass36.a58.release-integrity-verification.v1",
    revisionId: "VELMERE_PASS36_A58R0_RELEASE_INTEGRITY_FINAL_BYTE_BINDING",
    status: "PASS_RELEASE_INTEGRITY_NO_PROMOTION",
    checks: a58Checks,
    summary: { checks: 45, passed: 38, failed: 7, blockingFailed: 0 },
    historicalArtifactRecoveryComplete: false,
    promotionAllowed: false,
    productionApproved: false,
    saleEnabled: false,
    liveProven: false,
    worldClassProven: false,
  };
  check("accept:a58-exact-failed-set", validateA58(a58));
  const wrongA58 = structuredClone(a58);
  wrongA58.checks[38].id = "unexpected-failure-id";
  check("reject:a58-failed-set-mismatch", validateA58(wrongA58) === false);

  const nested = {
    schemaVersion: "velmere.pass36.a102r41.frozen-local-regression-receipt.v1",
    revisionId: REVISION_ID,
    status: "PASS_A102R41_FROZEN_SOURCE_FULL_LOCAL_REGRESSION_NO_PROMOTION",
    passed: true,
    requiredStages: 28,
    executedStages: 28,
    passedStages: 28,
    sourceImmutable: true,
    exactBuildBrowserCredit: false,
    a77r1ToA80r1Credit: false,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
  check("accept:nested-full-regression-contract", nestedReceiptContract("A102R41_FULL_REGRESSION_RECEIPT.json", nested));
  check("reject:nested-bad-schema", nestedReceiptContract("A102R41_FULL_REGRESSION_RECEIPT.json", { ...nested, schemaVersion: "wrong" }) === false);
  check("reject:nested-bad-status", nestedReceiptContract("A102R41_FULL_REGRESSION_RECEIPT.json", { ...nested, status: "PASS" }) === false);

  const dependency = { checked: true, packageLockUnchanged: true, npmCliUnchanged: true, nodeModulesRegularInTree: true, nodeModulesPresentBefore: false };
  check("accept:dependency-postcondition", dependencyInstallPostconditionPassed(dependency));
  check("reject:dependency-lock-change", dependencyInstallPostconditionPassed({ ...dependency, packageLockUnchanged: false }) === false);
  check("reject:dependency-npm-cli-change", dependencyInstallPostconditionPassed({ ...dependency, npmCliUnchanged: false }) === false);
  check("reject:dependency-node-modules-boundary", dependencyInstallPostconditionPassed({ ...dependency, nodeModulesRegularInTree: false }) === false);

  const localRoot = process.env.USERPROFILE ?? process.cwd();
  const localSentinel = path.join(localRoot, "private", "negative-evidence-sentinel.txt");
  const redacted = sanitizeEvidenceOutput(`failure at ${localSentinel}`, process.env, [localRoot]);
  check("accept:negative-output-path-redaction", redacted.localPathRedacted && !redacted.sanitized.includes(localRoot));

  const failureReceiptDir = path.join(tempRoot, "failure-receipt");
  fs.mkdirSync(failureReceiptDir);
  const failureWritten = writeFailureReceipt(failureReceiptDir, new Error(`forced_failure:${localSentinel}`));
  const failureBytes = fs.readFileSync(path.join(failureReceiptDir, "PASS36_A102R41_CLEAN_UNPACK_RECEIPT.json"), "utf8");
  const failureReceipt = JSON.parse(failureBytes);
  check("accept:failure-receipt-no-clobber", failureWritten && failureReceipt.status === "FAIL_A102R41_CLEAN_UNPACK" && failureReceipt.passed === false && failureReceipt.globalDecision === "NO_GO" && !failureBytes.includes(localRoot));
  check("reject:failure-receipt-overwrite", writeFailureReceipt(failureReceiptDir, new Error("second_failure")) === false);

  const migration = verifyPackageBoundaryMigration();
  check("accept:package-boundary-denominator-migration", migration.checks === 20 && migration.passed === 20 && migration.failed === 0 && migration.oldDenominator === 17 && migration.newDenominator === 36 && migration.removedChecks === 0, migration);
} finally {
  const resolvedTemp = path.resolve(tempRoot);
  const resolvedSystemTemp = path.resolve(os.tmpdir());
  if (path.dirname(resolvedTemp) !== resolvedSystemTemp || !path.basename(resolvedTemp).startsWith("velmere-a102r41-package-hardening-")) cleanupError = new Error("unsafe_package_hardening_temp_cleanup_target");
  else fs.rmSync(resolvedTemp, { recursive: true, force: true });
}
if (cleanupError) throw cleanupError;

const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r41.package-portability-and-parser-test.v1",
  status: failed.length === 0 ? "PASS_A102R41_PACKAGE_PORTABILITY_AND_STRICT_MANIFEST_BOUNDARY_NO_PROMOTION" : "FAIL_A102R41_PACKAGE_PORTABILITY_AND_STRICT_MANIFEST_BOUNDARY",
  required: 36, executed: checks.length, passed: checks.length - failed.length, failed: failed.length,
  denominatorMigration: { old: 17, current: 36, retained: 17, added: 19, removed: 0, verifierChecks: 20 },
  globalDecision: "NO_GO", live: false, saleEnabled: false,
  productionApproved: false, worldClassProven: false, failures: failed,
}, null, 2));
if (failed.length || checks.length !== 36) process.exit(1);
