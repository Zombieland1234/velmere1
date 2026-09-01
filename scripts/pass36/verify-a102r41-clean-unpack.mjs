#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { parseDeterministicZipBytes } from "../pass4826/release-package-contract.mjs";
import {
  REVISION_ID, SOURCE_FILE_NAME, SOURCE_MANIFEST_PATH,
  validateA102R41ParsedArchive,
} from "./package-a102r41-deterministic.mjs";
import { collect, payload } from "./a102r41-source-boundary.mjs";
import { buildSanitizedChildEnv, sanitizeChildOutput } from "./sanitized-child-process-boundary.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { readDescriptorBoundRegularFile } from "./descriptor-bound-regular-file.mjs";

const invariant = (condition, code) => { if (!condition) throw new Error(code); };
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const safeId = (value) => value.replace(/[^a-z0-9_.-]+/giu, "_");
const A58_REVISION_ID = "VELMERE_PASS36_A58R0_RELEASE_INTEGRITY_FINAL_BYTE_BINDING";
const ALLOWED_EXECUTION_ADDED_PREFIXES = ["node_modules/", "artifacts/", ".velmere/pass15-diagnostics/"];
const CLEAN_RECEIPT_FILE_NAME = "PASS36_A102R41_CLEAN_UNPACK_RECEIPT.json";
let activeFailureReceiptDir = null;

function replaceLiteralCaseInsensitive(value, literal, replacement) {
  if (typeof literal !== "string" || literal.length < 3) return value;
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return value.replace(new RegExp(escaped, "giu"), replacement);
}

export function sanitizeEvidenceOutput(value, ambient = process.env, additionalRoots = []) {
  const secretScan = sanitizeChildOutput(value, ambient);
  let sanitized = secretScan.sanitized;
  let localPathRedacted = false;
  const candidates = new Set([
    ambient.USERPROFILE,
    process.cwd(),
    ...additionalRoots,
  ].filter((item) => typeof item === "string" && item.length >= 3));
  const variants = [];
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    variants.push(resolved, resolved.replaceAll("\\", "/"), encodeURI(resolved.replaceAll("\\", "/")));
  }
  for (const candidate of [...new Set(variants)].sort((left, right) => right.length - left.length)) {
    const next = replaceLiteralCaseInsensitive(sanitized, candidate, "[REDACTED_LOCAL_PATH]");
    if (next !== sanitized) localPathRedacted = true;
    sanitized = next;
  }
  return { ...secretScan, sanitized, localPathRedacted };
}

function stableFailure(error) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const scan = sanitizeEvidenceOutput(rawMessage, process.env, [activeFailureReceiptDir]);
  const prefix = rawMessage.split(":", 1)[0] ?? "unknown_failure";
  return {
    errorClass: error instanceof Error ? error.name : "NonErrorThrown",
    errorCode: safeId(prefix).slice(0, 160) || "unknown_failure",
    sanitizedMessage: scan.sanitized.slice(0, 2048),
    sanitizedMessageSha256: sha256(scan.sanitized),
    sensitiveOutputDetectedAndRedacted: scan.sensitiveOutputDetected,
    localPathDetectedAndRedacted: scan.localPathRedacted,
  };
}

export function writeFailureReceipt(receiptDir, error) {
  if (typeof receiptDir !== "string" || !fs.existsSync(receiptDir)) return false;
  const metadata = fs.lstatSync(receiptDir);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) return false;
  const receipt = {
    schemaVersion: "velmere.pass36.a102r41.clean-unpack-verification.v1",
    revisionId: REVISION_ID,
    status: "FAIL_A102R41_CLEAN_UNPACK",
    passed: false,
    failure: stableFailure(error),
    a77r1ToA80r1Credit: false,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
  try {
    fs.writeFileSync(path.join(receiptDir, CLEAN_RECEIPT_FILE_NAME), `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    return true;
  } catch (writeError) {
    if (writeError?.code === "EEXIST") return false;
    throw writeError;
  }
}

function parseArguments(argv) {
  const values = new Map();
  const allowed = new Set(["--source-zip", "--receipt-dir"]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    invariant(allowed.has(name), `a102r41_clean_argument_unknown:${name}`);
    invariant(!values.has(name), `a102r41_clean_argument_duplicate:${name}`);
    const value = argv[++index];
    invariant(typeof value === "string" && value.length > 0 && !value.startsWith("--"), `a102r41_clean_argument_value:${name}`);
    values.set(name, value);
  }
  for (const name of allowed) invariant(values.has(name), `a102r41_clean_argument_required:${name}`);
  return { sourceZip: path.resolve(values.get("--source-zip")), receiptDir: path.resolve(values.get("--receipt-dir")) };
}

function parseStrictStdout(stdout) {
  try {
    return {
      value: parseStrictJsonCli(stdout, { maxBytes: 16 * 1024 * 1024, maxDepth: 96, maxNodes: 1000000, requireObject: true }),
      error: null,
    };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function writeEntry(cleanRoot, entry) {
  const absolute = path.resolve(cleanRoot, ...entry.path.split("/"));
  invariant(absolute.startsWith(`${cleanRoot}${path.sep}`), `a102r41_clean_extract_escape:${entry.path}`);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, entry.content, { mode: entry.mode & 0o777, flag: "wx" });
  fs.chmodSync(absolute, entry.mode & 0o777);
}

function completeTreeSnapshot(root) {
  const rows = [];
  const stack = [{ absolute: root, prefix: "" }];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current.absolute, { withFileTypes: true }).sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
      const relative = current.prefix ? `${current.prefix}/${entry.name}` : entry.name;
      const absolute = path.join(current.absolute, entry.name);
      const metadata = fs.lstatSync(absolute);
      invariant(!metadata.isSymbolicLink(), `a102r41_clean_tree_symlink:${relative}`);
      if (entry.isDirectory()) { stack.push({ absolute, prefix: relative }); continue; }
      invariant(entry.isFile(), `a102r41_clean_tree_special:${relative}`);
      const observed = readDescriptorBoundRegularFile(absolute, { errorPrefix: `a102r41_clean_tree_${safeId(relative)}` });
      rows.push({ path: relative, byteLength: observed.binding.byteLength, sha256: observed.binding.sha256, mode: metadata.mode & 0o777 });
    }
  }
  rows.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return {
    fileCount: rows.length,
    byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0),
    pathSetSha256: sha256(rows.map((row) => row.path).join("\n")),
    aggregateSha256: sha256(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n")),
  };
}

export function verifyExecutionPackagedBytes(parsedEntries, executionRoot) {
  const packaged = new Map(parsedEntries.map((entry) => [entry.path, {
    byteLength: entry.byteLength,
    sha256: entry.sha256,
  }]));
  const observedRows = [];
  const stack = [{ absolute: executionRoot, prefix: "" }];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current.absolute, { withFileTypes: true })
      .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const relative = current.prefix ? `${current.prefix}/${entry.name}` : entry.name;
      const absolute = path.join(current.absolute, entry.name);
      const metadata = fs.lstatSync(absolute);
      invariant(!metadata.isSymbolicLink(), `a102r41_clean_execution_symlink_or_reparse:${relative}`);
      if (entry.isDirectory()) {
        stack.push({ absolute, prefix: relative });
        continue;
      }
      invariant(entry.isFile(), `a102r41_clean_execution_special:${relative}`);
      if (packaged.has(relative)) {
        const observed = readDescriptorBoundRegularFile(absolute, { errorPrefix: `a102r41_clean_execution_${safeId(relative)}` });
        observedRows.push({ path: relative, byteLength: observed.binding.byteLength, sha256: observed.binding.sha256, packaged: true });
      } else {
        observedRows.push({ path: relative, byteLength: metadata.size, sha256: null, packaged: false });
      }
    }
  }
  observedRows.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const observed = new Map(observedRows.map((row) => [row.path, row]));
  const changedOrMissing = [];
  for (const [relativePath, expected] of packaged) {
    const actual = observed.get(relativePath);
    if (!actual || actual.byteLength !== expected.byteLength || actual.sha256 !== expected.sha256) {
      changedOrMissing.push({ path: relativePath, expected, actual: actual ?? null });
    }
  }
  const added = observedRows.filter((row) => !packaged.has(row.path));
  const forbiddenAdded = added.filter((row) => !ALLOWED_EXECUTION_ADDED_PREFIXES.some((prefix) => row.path.startsWith(prefix)));
  return {
    passed: changedOrMissing.length === 0 && forbiddenAdded.length === 0,
    packagedFileCount: packaged.size,
    packagedFilesVerified: packaged.size - changedOrMissing.length,
    changedOrMissing,
    addedFileCount: added.length,
    allowedAddedPrefixes: ALLOWED_EXECUTION_ADDED_PREFIXES,
    forbiddenAdded,
    addedPathSetSha256: sha256(added.map((row) => row.path).join("\n")),
    addedMetadataAggregateSha256: sha256(added.map((row) => `${row.path}\0${row.byteLength}`).join("\n")),
    addedContentsHashedForSourceAuthority: false,
  };
}

export function nestedReceiptContract(fileName, value) {
  const common = value?.revisionId === REVISION_ID
    && value?.passed === true
    && value?.globalDecision === "NO_GO"
    && value?.live === false
    && value?.saleEnabled === false
    && value?.productionApproved === false
    && value?.worldClassProven === false;
  if (!common) return false;
  if (fileName === "A102R41_FULL_REGRESSION_RECEIPT.json") {
    return value.schemaVersion === "velmere.pass36.a102r41.frozen-local-regression-receipt.v1"
      && value.status === "PASS_A102R41_FROZEN_SOURCE_FULL_LOCAL_REGRESSION_NO_PROMOTION"
      && value.requiredStages === 28 && value.executedStages === 28 && value.passedStages === 28
      && value.sourceImmutable === true && value.exactBuildBrowserCredit === false && value.a77r1ToA80r1Credit === false;
  }
  const expectedStatuses = {
    "A102R41_CURRENT_AUTHORITY_RECEIPT.json": "PASS_A102R41_ACTION_REQUIRED_AUTHORITY_SECURITY_EVIDENCE_EXACT_WINDOWS_PREFLIGHT_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT",
    "A102R41_DESCENDANT_RECEIPT.json": "PASS_A102R41_CURRENT_ROOT_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION",
    "A102R41_APPROVED_CHANGES_RECEIPT.json": "PASS_A102R41_APPROVED_CURRENT_SOURCE_CHANGES_COMPLETE_NO_PROMOTION",
  };
  return value.schemaVersion === "velmere.pass36.a102r41.physical-command-receipt-wrapper.v1"
    && value.status === expectedStatuses[fileName]
    && value.validatorContractPassed === true
    && value.commandResultBinding?.exitCode === 0;
}

function nested(value, dotted) { return dotted.split(".").reduce((current, key) => current?.[key], value); }

export function validateA58(parsed) {
  if (!Array.isArray(parsed?.checks) || !parsed?.summary) return false;
  const failedRows = parsed.checks.filter((row) => row?.ok === false);
  const blockingFailed = parsed.checks.filter((row) => row?.blocking === true && row?.ok === false);
  const expectedFailedIds = [
    "a57-historical-manifest-verifies",
    "historical-a57-current-supplement-bound:_velmere/pass35/PASS35_EXTERNAL_BLOCKER_RECEIPT.json",
    "historical-a57-current-supplement-bound:_velmere/pass35/PASS35_LOCAL_PDF_QA_SUMMARY.json",
    "historical-a57-current-supplement-bound:_velmere/pass35/PASS35_LOCAL_PRODUCT_QUALITY_RECEIPT.json",
    "historical-a57-current-supplement-bound:_velmere/pass35/PASS35_READINESS_DASHBOARD.json",
    "historical-exact-byte-recovery:.velmere/orphan-quarantine-pass6.json",
    "historical-exact-byte-recovery:_velmere/VLM_PASS5_RELEASE_MANIFEST.json",
  ];
  return parsed.schemaVersion === "velmere.pass36.a58.release-integrity-verification.v1"
    && parsed.revisionId === A58_REVISION_ID
    && parsed.status === "PASS_RELEASE_INTEGRITY_NO_PROMOTION"
    && parsed.summary.checks === parsed.checks.length
    && parsed.summary.passed + parsed.summary.failed === parsed.summary.checks
    && parsed.summary.passed === parsed.checks.filter((row) => row?.ok === true).length
    && parsed.summary.failed === failedRows.length
    && parsed.summary.blockingFailed === blockingFailed.length
    && parsed.summary.checks === 45 && parsed.summary.passed === 38 && parsed.summary.failed === 7
    && blockingFailed.length === 0
    && new Set(parsed.checks.map((row) => row?.id)).size === parsed.checks.length
    && JSON.stringify(failedRows.map((row) => row.id).sort()) === JSON.stringify(expectedFailedIds.sort())
    && parsed.historicalArtifactRecoveryComplete === false
    && parsed.promotionAllowed === false && parsed.productionApproved === false
    && parsed.saleEnabled === false && parsed.liveProven === false && parsed.worldClassProven === false;
}

function runStep(cleanRoot, receiptDir, step, index) {
  const timeoutMs = step.timeoutMs ?? 900000;
  const result = spawnSync(step.command[0], step.command.slice(1), {
    cwd: cleanRoot,
    env: buildSanitizedChildEnv(process.env, step.env ?? {}),
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    timeout: timeoutMs,
    shell: false,
    windowsHide: true,
  });
  const stdoutScan = sanitizeEvidenceOutput(result.stdout ?? "", process.env, [cleanRoot, receiptDir]);
  const stderrScan = sanitizeEvidenceOutput(result.stderr ?? "", process.env, [cleanRoot, receiptDir]);
  const prefix = `${String(index).padStart(2, "0")}-${safeId(step.id)}`;
  fs.writeFileSync(path.join(receiptDir, `${prefix}.stdout.txt`), stdoutScan.sanitized, { encoding: "utf8", flag: "wx" });
  fs.writeFileSync(path.join(receiptDir, `${prefix}.stderr.txt`), stderrScan.sanitized, { encoding: "utf8", flag: "wx" });
  const parseResult = step.plainOutput ? { value: null, error: null } : parseStrictStdout(stdoutScan.sanitized);
  const parsed = parseResult.value;
  const stderrAllowed = stderrScan.sanitized.length === 0
    || (Number.isInteger(step.allowedStderrBytes) && Buffer.byteLength(stderrScan.sanitized) === step.allowedStderrBytes
      && sha256(stderrScan.sanitized) === step.allowedStderrSha256);
  let passed = result.status === 0 && result.signal === null && !result.error && !stdoutScan.sensitiveOutputDetected && !stderrScan.sensitiveOutputDetected && stderrAllowed && (step.plainOutput === true || parsed !== null);
  if (!step.plainOutput) passed &&= (parsed?.status ?? parsed?.decision) === step.expected;
  for (const [field, expected] of step.exact ?? []) passed &&= nested(parsed, field) === expected;
  if (step.approvedLedgerFormula) passed &&= Number.isInteger(parsed?.fileCount) && parsed.fileCount >= 1 && parsed?.checks === 11 + (4 * parsed.fileCount) && parsed?.passed === parsed?.checks && parsed?.failed === 0;
  for (const field of step.falseFields ?? []) passed &&= nested(parsed, field) === false;
  if (step.noGo) passed &&= parsed?.globalDecision === "NO_GO";
  if (step.firstA58) passed &&= validateA58(parsed);
  return {
    index,
    id: step.id,
    command: step.command.map((part, position) => position === 0 ? "<EXACT_NODE>" : part === process.execPath ? "<EXACT_NODE>" : path.isAbsolute(part) ? `<ABSOLUTE_${path.basename(part).toUpperCase()}>` : part),
    exitCode: result.status,
    signal: result.signal ?? null,
    timeoutMs,
    timedOut: result.error?.code === "ETIMEDOUT",
    spawnErrorCode: result.error?.code ?? null,
    parseError: parseResult.error,
    parsedStatus: parsed?.status ?? parsed?.decision ?? null,
    summary: parsed?.summary ?? null,
    stdoutBytes: Buffer.byteLength(stdoutScan.sanitized),
    stdoutSha256: sha256(stdoutScan.sanitized),
    stderrBytes: Buffer.byteLength(stderrScan.sanitized),
    stderrSha256: sha256(stderrScan.sanitized),
    sensitiveOutputDetected: stdoutScan.sensitiveOutputDetected || stderrScan.sensitiveOutputDetected,
    stderrAllowed,
    stderrPolicy: step.allowedStderrSha256 ? { kind: "EXACT_REVIEWED_WARNING", bytes: step.allowedStderrBytes, sha256: step.allowedStderrSha256 } : { kind: "EMPTY_REQUIRED" },
    passed,
  };
}

export function dependencyInstallPostconditionPassed(value) {
  return value?.checked === true
    && value?.packageLockUnchanged === true
    && value?.npmCliUnchanged === true
    && value?.nodeModulesRegularInTree === true
    && value?.nodeModulesPresentBefore === false;
}

function main() {
  const { sourceZip, receiptDir } = parseArguments(process.argv.slice(2));
  invariant(process.version === "v24.18.0", `a102r41_clean_exact_node_required:${process.version}`);
  const sourceObserved = readDescriptorBoundRegularFile(sourceZip, { errorPrefix: "a102r41_clean_source_zip" });
  invariant(sourceObserved.binding.fileName === SOURCE_FILE_NAME, "a102r41_clean_source_zip_filename");
  invariant(!fs.existsSync(receiptDir), "a102r41_clean_receipt_dir_must_be_new");
  fs.mkdirSync(receiptDir, { recursive: false });
  activeFailureReceiptDir = receiptDir;
  const parsed = parseDeterministicZipBytes(sourceObserved.bytes);
  const packageValidation = validateA102R41ParsedArchive(parsed, "source");
  const cleanRoot = `${receiptDir}.clean-source`;
  invariant(!fs.existsSync(cleanRoot), "a102r41_clean_work_root_must_be_new");
  fs.mkdirSync(cleanRoot, { recursive: false });
  for (const entry of parsed.entries) writeEntry(cleanRoot, entry);
  invariant(fs.existsSync(path.join(cleanRoot, SOURCE_MANIFEST_PATH)), "a102r41_clean_source_manifest_missing");
  const beforeInventory = collect(cleanRoot, { platform: process.platform });
  invariant(beforeInventory.rejected.length === 0, `a102r41_clean_rejected_before:${JSON.stringify(beforeInventory.rejected)}`);
  const beforeAuthority = payload(beforeInventory.rows);
  const before = completeTreeSnapshot(cleanRoot);
  const descendantBytes = fs.readFileSync(path.join(cleanRoot, "config/pass36/a102r41-current-root-descendant-manifest.json"));
  const descendant = parseStrictJsonCli(descendantBytes.toString("utf8"), { maxBytes: 8 * 1024 * 1024, maxDepth: 64, maxNodes: 250000, requireObject: true });
  const expectedSourceBinding = { revisionId: REVISION_ID, descendantManifestRawSha256: sha256(descendantBytes), descendantManifestDigestSha256: descendant.manifestDigestSha256, aggregateSha256: beforeAuthority.aggregateSha256 };
  const node = process.execPath;
  const executionRoot = `${receiptDir}.execution-source`;
  invariant(!fs.existsSync(executionRoot), "a102r41_clean_execution_root_must_be_new");
  fs.cpSync(cleanRoot, executionRoot, { recursive: true, errorOnExist: true });
  const runtimeRoot = path.dirname(process.execPath);
  const npmCliPath = path.join(runtimeRoot, "node_modules/npm/bin/npm-cli.js");
  const npmCliBefore = readDescriptorBoundRegularFile(npmCliPath, { maxBytes: 4 * 1024 * 1024, errorPrefix: "a102r41_clean_exact_npm_cli_before" });
  const npmPackageObserved = readDescriptorBoundRegularFile(path.join(runtimeRoot, "node_modules/npm/package.json"), { maxBytes: 1024 * 1024, errorPrefix: "a102r41_clean_exact_npm_package" });
  const npmPackage = parseStrictJsonCli(npmPackageObserved.bytes.toString("utf8"), { maxBytes: 1024 * 1024, maxDepth: 32, maxNodes: 10000, requireObject: true });
  invariant(npmPackage.version === "11.16.0", `a102r41_clean_exact_npm_version:${npmPackage.version}`);
  const packageLockPath = path.join(executionRoot, "package-lock.json");
  const packageLockBefore = readDescriptorBoundRegularFile(packageLockPath, { maxBytes: 32 * 1024 * 1024, errorPrefix: "a102r41_clean_package_lock_before" });
  const nodeModulesPath = path.join(executionRoot, "node_modules");
  invariant(!fs.existsSync(nodeModulesPath), "a102r41_clean_node_modules_must_be_absent_before_install");
  const systemRootValue = process.env.SystemRoot ?? process.env.SYSTEMROOT;
  invariant(typeof systemRootValue === "string" && path.isAbsolute(systemRootValue) && !systemRootValue.includes(";"), "a102r41_clean_system_root_invalid");
  const systemRoot = fs.realpathSync(systemRootValue);
  invariant(fs.lstatSync(systemRoot).isDirectory(), "a102r41_clean_system_root_not_directory");
  const system32 = path.join(systemRoot, "System32");
  invariant(fs.lstatSync(system32).isDirectory(), "a102r41_clean_system32_not_directory");
  invariant(!runtimeRoot.includes(";"), "a102r41_clean_runtime_root_path_separator");
  const exactPath = `${runtimeRoot};${system32}`;
  const tsLoader = [node, "--import", "./scripts/pass11/register-offline-ts-loader.mjs"];
  const steps = [
    { id: "a58_release_integrity_literal_first_child", cwd: cleanRoot, command: [node, "scripts/pass36/verify-a58-release-integrity.mjs"], expected: "PASS_RELEASE_INTEGRITY_NO_PROMOTION", firstA58: true },
    { id: "exact_dependency_install_ignore_scripts_no_a78r1_credit", cwd: executionRoot, command: [node, npmCliPath, "ci", "--ignore-scripts", "--no-audit", "--no-fund"], expected: undefined, plainOutput: true, env: { PATH: exactPath }, timeoutMs: 1200000, allowedStderrBytes: 162, allowedStderrSha256: "a4be33f03cdfab0a479d30f0e40fdc8df9419f2c7ad07ea2e0b46392bfe048ed" },
    { id: "a102r41_authority", command: [node, "scripts/pass36/verify-a102r41-action-required-authority.mjs"], expected: "PASS_A102R41_ACTION_REQUIRED_AUTHORITY_SECURITY_EVIDENCE_EXACT_WINDOWS_PREFLIGHT_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT", exact: [["checks", 46], ["passed", 46], ["failed", 0]], noGo: true, falseFields: ["live", "saleEnabled", "productionApproved", "worldClassProven"] },
    { id: "a102r41_descendant", command: [node, "scripts/pass36/verify-a102r41-current-root-descendant.mjs"], expected: "PASS_A102R41_CURRENT_ROOT_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION", exact: [["checks", 20], ["passed", 20], ["failed", 0], ["historicalChainChecks", 415]], noGo: true, falseFields: ["live", "saleEnabled"] },
    { id: "a102r41_approved_changes", command: [node, "scripts/pass36/verify-a102r41-approved-current-source-changes.mjs"], expected: "PASS_A102R41_APPROVED_CURRENT_SOURCE_CHANGES_COMPLETE_NO_PROMOTION", exact: [["failed", 0]], approvedLedgerFormula: true, noGo: true, falseFields: ["live", "saleEnabled"] },
    { id: "a102r41_authority_denominator", command: [node, "scripts/pass36/verify-a102r41-current-source-authority-denominator-migration.mjs"], expected: "PASS_A102R41_CURRENT_SOURCE_AUTHORITY_DENOMINATOR_MIGRATION_NO_PROMOTION", exact: [["checks", 54], ["passed", 54], ["failed", 0]], noGo: true, falseFields: ["live", "saleEnabled"] },
    { id: "a102r41_a78_denominator", command: [node, "scripts/pass36/verify-a102r41-a78-lockfile-denominator-migration.mjs"], expected: "PASS_A102R41_A78_FORMAL_DENOMINATOR_MIGRATION_NO_PROMOTION", exact: [["checks", 24], ["passed", 24], ["failed", 0]], noGo: true, falseFields: ["live", "saleEnabled"] },
    { id: "a102r41_sparse_edge", command: [node, "scripts/pass36/test-a102r41-historical-sparse-edge-ledger.mjs"], expected: "PASS_EXACT_SINGLE_HISTORICAL_EXCEPTION_NO_AUTHORITY_OR_PROMOTION", exact: [["total", 11], ["passed", 11], ["failed", 0]], falseFields: ["live", "saleEnabled", "productionApproved", "worldClassProven"] },
    { id: "a102r41_rls", command: [node, "scripts/pass36/test-a102r41-entitlement-revocation-rls-remediation.mjs"], expected: "PASS_A102R41_ENTITLEMENT_REVOCATION_RLS_LOCAL_STATIC_NO_STAGING_CREDIT", exact: [["checks", 18], ["passed", 18], ["failed", 0]], noGo: true, falseFields: ["live", "saleEnabled", "productionApproved", "worldClassProven"] },
    { id: "a102r41_external_command_containment", command: [...tsLoader, "scripts/pass36/test-a102r41-external-command-containment-and-tool-spec.mjs"], expected: undefined, exact: [["total", 11], ["passed", 11], ["failed", 0], ["externalCommandExecutionCredit", false], ["platformContainment.executable", false], ["platformContainment.status", "BLOCKED_WINDOWS_JOB_OBJECT_BROKER_REQUIRED"]], falseFields: ["live", "saleEnabled"] },
    { id: "a102r41_sanitized_child", command: [node, "scripts/pass36/test-a102r41-sanitized-child-process-boundary.mjs"], expected: "PASS_A102R41_SANITIZED_CHILD_PROCESS_NO_SECRET_PERSISTENCE", exact: [["checks", 11], ["passed", 11], ["failed", 0]], noGo: true, falseFields: ["live", "saleEnabled", "productionApproved", "worldClassProven"] },
    { id: "a102r41_physical_evidence_boundary", command: [node, "scripts/pass36/test-a102r41-real-evidence-physical-boundary.mjs"], expected: "PASS_A102R41_REAL_EVIDENCE_PHYSICAL_BOUNDARY_LOCAL_CRYPTO_NO_REAL_CREDIT", exact: [["checks", 9], ["passed", 9], ["failed", 0], ["realEvidenceRows", 0]], noGo: true, falseFields: ["live", "saleEnabled", "productionApproved", "worldClassProven"] },
    { id: "historical_sparse_checkpoint", command: [node, "scripts/pass36/test-historical-descendant-sparse-checkpoint.mjs"], expected: "PASS", exact: [["checks", 19], ["passed", 19], ["failed", 0]] },
    { id: "a80_admission", command: [node, "scripts/pass36/test-a80-frozen-local-release-candidate-admission.mjs"], expected: "PASS_A80_LOCAL_ADMISSION_BLOCKED_EXACT_PREREQUISITES", exact: [["summary.checks", 41], ["summary.passed", 41], ["summary.failed", 0], ["exactReleaseCandidateVerified", false]], falseFields: ["liveProven", "saleEnabled"] },
    { id: "a102r41_package_boundary", command: [node, "scripts/pass36/test-a102r41-package-portability-and-parser.mjs"], expected: "PASS_A102R41_PACKAGE_PORTABILITY_AND_STRICT_MANIFEST_BOUNDARY_NO_PROMOTION", exact: [["required", 36], ["executed", 36], ["passed", 36], ["failed", 0], ["denominatorMigration.old", 17], ["denominatorMigration.current", 36], ["denominatorMigration.retained", 17], ["denominatorMigration.added", 19], ["denominatorMigration.removed", 0], ["denominatorMigration.verifierChecks", 20]], noGo: true, falseFields: ["live", "saleEnabled", "productionApproved", "worldClassProven"] },
    { id: "a80r1_mechanism", command: [node, "scripts/pass36/test-a102r41-a80r1-two-phase-release-controller.mjs"], expected: "PASS_A102R41_A80R1_TWO_PHASE_CONTROLLER_MECHANISM_NO_PROMOTION", exact: [["required", 36], ["executed", 36], ["passed", 36], ["failed", 0]], noGo: true, falseFields: ["live", "saleEnabled", "productionApproved", "worldClassProven"] },
    { id: "a102r41_frozen_local_regression", command: [node, "scripts/pass36/run-a102r41-frozen-local-regression.mjs", "--receipt-dir", path.join(receiptDir, "full-regression")], expected: "PASS_A102R41_FROZEN_SOURCE_FULL_LOCAL_REGRESSION_NO_PROMOTION", exact: [["requiredStages", 28], ["executedStages", 28], ["passedStages", 28], ["sourceImmutable", true], ["exactBuildBrowserCredit", false], ["a77r1ToA80r1Credit", false]], noGo: true, falseFields: ["live", "saleEnabled", "productionApproved", "worldClassProven"], timeoutMs: 3600000 },
  ];
  const results = [];
  for (const [offset, step] of steps.entries()) {
    const result = runStep(step.cwd ?? executionRoot, receiptDir, step, offset + 1);
    results.push(result);
    if (!result.passed) break;
  }
  let dependencyInstallPostcondition = {
    checked: false,
    packageLockUnchanged: false,
    npmCliUnchanged: false,
    nodeModulesRegularInTree: false,
    nodeModulesPresentBefore: false,
  };
  if (results[1]?.passed) {
    const packageLockAfter = readDescriptorBoundRegularFile(packageLockPath, { maxBytes: 32 * 1024 * 1024, errorPrefix: "a102r41_clean_package_lock_after" });
    const npmCliAfter = readDescriptorBoundRegularFile(npmCliPath, { maxBytes: 4 * 1024 * 1024, errorPrefix: "a102r41_clean_exact_npm_cli_after" });
    const nodeModulesMetadata = fs.lstatSync(nodeModulesPath);
    const executionReal = fs.realpathSync(executionRoot);
    const nodeModulesReal = fs.realpathSync(nodeModulesPath);
    dependencyInstallPostcondition = {
      checked: true,
      packageLockUnchanged: packageLockBefore.binding.byteLength === packageLockAfter.binding.byteLength && packageLockBefore.binding.sha256 === packageLockAfter.binding.sha256,
      npmCliUnchanged: npmCliBefore.binding.byteLength === npmCliAfter.binding.byteLength && npmCliBefore.binding.sha256 === npmCliAfter.binding.sha256,
      nodeModulesRegularInTree: nodeModulesMetadata.isDirectory() && !nodeModulesMetadata.isSymbolicLink() && nodeModulesReal.startsWith(`${executionReal}${path.sep}`),
      nodeModulesPresentBefore: false,
      packageLock: packageLockAfter.binding,
      npmCli: npmCliAfter.binding,
    };
  }
  const nestedReceiptProvenance = [];
  const regressionStep = results.find((row) => row.id === "a102r41_frozen_local_regression");
  if (regressionStep?.passed) {
    for (const fileName of [
      "A102R41_CURRENT_AUTHORITY_RECEIPT.json",
      "A102R41_DESCENDANT_RECEIPT.json",
      "A102R41_APPROVED_CHANGES_RECEIPT.json",
      "A102R41_FULL_REGRESSION_RECEIPT.json",
    ]) {
      const relativeSource = `full-regression/${fileName}`;
      const sourceReceipt = readDescriptorBoundRegularFile(path.join(receiptDir, ...relativeSource.split("/")), { maxBytes: 16 * 1024 * 1024, errorPrefix: "a102r41_clean_nested_receipt" });
      const value = parseStrictJsonCli(sourceReceipt.bytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 96, maxNodes: 1000000, requireObject: true });
      invariant(value.revisionId === REVISION_ID && JSON.stringify(value.sourceBinding) === JSON.stringify(expectedSourceBinding), `a102r41_clean_nested_receipt_source_binding:${fileName}`);
      invariant(nestedReceiptContract(fileName, value), `a102r41_clean_nested_receipt_contract:${fileName}`);
      const destination = path.join(receiptDir, fileName);
      fs.copyFileSync(sourceReceipt.absolutePath, destination, fs.constants.COPYFILE_EXCL);
      const copied = readDescriptorBoundRegularFile(destination, { maxBytes: 16 * 1024 * 1024, errorPrefix: "a102r41_clean_copied_receipt" });
      invariant(copied.binding.byteLength === sourceReceipt.binding.byteLength && copied.binding.sha256 === sourceReceipt.binding.sha256, `a102r41_clean_nested_receipt_copy_binding:${fileName}`);
      nestedReceiptProvenance.push({ fileName, sourceRelativePath: relativeSource, byteLength: copied.binding.byteLength, sha256: copied.binding.sha256 });
    }
  }
  const afterInventory = collect(cleanRoot, { platform: process.platform });
  const executionInventory = collect(executionRoot, { platform: process.platform });
  const afterAuthority = payload(afterInventory.rows);
  const executionAuthority = payload(executionInventory.rows);
  const after = completeTreeSnapshot(cleanRoot);
  const executionPackagedBytes = verifyExecutionPackagedBytes(parsed.entries, executionRoot);
  const cleanExtractImmutable = JSON.stringify(before) === JSON.stringify(after);
  const sourceImmutable = afterInventory.rejected.length === 0
    && executionInventory.rejected.length === 0
    && JSON.stringify(beforeAuthority) === JSON.stringify(afterAuthority)
    && JSON.stringify(beforeAuthority) === JSON.stringify(executionAuthority)
    && cleanExtractImmutable
    && executionPackagedBytes.passed
    && dependencyInstallPostconditionPassed(dependencyInstallPostcondition);
  const a58LiteralFirstChild = results[0]?.id === "a58_release_integrity_literal_first_child";
  const passed = results.length === steps.length && results.every((row) => row.passed) && sourceImmutable && a58LiteralFirstChild;
  const receipt = {
    schemaVersion: "velmere.pass36.a102r41.clean-unpack-verification.v1",
    revisionId: REVISION_ID,
    status: passed ? "PASS_A102R41_ACTION_REQUIRED_CLEAN_UNPACK_A58_FIRST_NO_PROMOTION" : "FAIL_A102R41_CLEAN_UNPACK",
    sourceZip: { fileName: SOURCE_FILE_NAME, byteLength: parsed.byteLength, sha256: parsed.archiveSha256, entries: parsed.entries.length, payloadFileCount: packageValidation.payloadFileCount, payloadByteLength: packageValidation.payloadByteLength, manifestSha256: packageValidation.manifest.manifestSha256, manifestFileSha256: packageValidation.manifestFileSha256, descriptorBound: sourceObserved.descriptorBound, noFollowFlagApplied: sourceObserved.noFollowFlagApplied },
    sourceBinding: expectedSourceBinding,
    cleanWorkRootClass: "SEPARATE_EXTERNAL_CLEAN_ROOT_NOT_PACKAGED_AS_MATERIALS",
    exactNodeVersion: process.version.replace(/^v/u, ""),
    exactNodeExecutable: { fileName: path.basename(process.execPath), byteLength: fs.statSync(process.execPath).size, sha256: sha256(fs.readFileSync(process.execPath)) },
    exactNpmCli: { version: npmPackage.version, ...npmCliBefore.binding, descriptorBound: npmCliBefore.descriptorBound, noFollowFlagApplied: npmCliBefore.noFollowFlagApplied, lifecycleScriptsExecuted: false, a78r1Credit: false },
    dependencyInstallPostcondition,
    passed,
    a58LiteralFirstChild,
    firstChildCommand: results[0]?.command ?? null,
    sourceBefore: before,
    sourceAfter: after,
    cleanExtractImmutable,
    authoritySourceBefore: beforeAuthority,
    authoritySourceAfter: afterAuthority,
    executionSourceAfter: executionAuthority,
    executionPackagedBytes,
    sourceImmutable,
    requiredSteps: steps.length,
    executedSteps: results.length,
    passedSteps: results.filter((row) => row.passed).length,
    failedSteps: results.filter((row) => !row.passed).map((row) => row.id),
    steps: results,
    nestedReceiptProvenance,
    windowsProcessTreeContainment: false,
    processTreeContainmentBlocker: "BLOCKED_WINDOWS_JOB_OBJECT_BROKER_REQUIRED",
    a77r1ToA80r1Credit: false,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
  fs.writeFileSync(path.join(receiptDir, CLEAN_RECEIPT_FILE_NAME), `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  activeFailureReceiptDir = null;
  console.log(JSON.stringify(receipt, null, 2));
  if (!passed) process.exitCode = 1;
}

function runCli() {
  try { main(); }
  catch (error) {
    const failure = stableFailure(error);
    try { writeFailureReceipt(activeFailureReceiptDir, error); }
    catch (writeError) { failure.failureReceiptWriteErrorCode = stableFailure(writeError).errorCode; }
    process.stderr.write(`${JSON.stringify({ schemaVersion: "velmere.pass36.a102r41.clean-unpack-verification.v1", revisionId: REVISION_ID, status: "FAIL_A102R41_CLEAN_UNPACK", passed: false, failure, a77r1ToA80r1Credit: false, globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false })}\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) runCli();
