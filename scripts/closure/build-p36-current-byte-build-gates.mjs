#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { expectedBuildOutputContract } from "../../lib/build/build-watchdog-policy.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "../..");
export const OUTPUT_PATH = "artifacts/closure/p36/P36_CURRENT_BYTE_BUILD_GATES.json";
export const SCHEMA = "velmere.p36.current-byte-build-gates.v1";

const EXPECTED_NODE = "v24.18.0";
const EXPECTED_NPM = "11.16.0";
const EXPECTED_TYPESCRIPT = "5.9.3";
const EXPECTED_ESLINT = "10.8.0";
const MAX_AGE_MS = 24 * 60 * 60 * 1_000;
const CLOCK_TOLERANCE_MS = 5_000;
const SHA256 = /^[a-f0-9]{64}$/u;
const BUILD_MODES = Object.freeze(["webpack", "turbopack"]);
const TRUSTED_NATIVE_PACKAGES = Object.freeze([
  "@parcel/watcher",
  "@swc/core",
  "esbuild",
  "sharp",
  "unrs-resolver",
]);

const P36_EXCLUDED_COMPONENTS = new Set([
  ".git",
  ".cache",
  ".mypy_cache",
  ".npm",
  ".parcel-cache",
  ".pnpm-store",
  ".pytest_cache",
  ".ruff_cache",
  ".turbo",
  ".velmere",
  "__pycache__",
  "node_modules",
]);
const P36_EXCLUDED_ROOT_DIRECTORIES = new Set(["artifacts", "coverage", "temp", "tmp"]);
const P36_EXCLUDED_PREFIXES = Object.freeze([
  "artifacts/closure",
  "artifacts/pass36/a83/browser-lens-pdf-corpus",
  "artifacts/pass36/a83/renders",
  "artifacts/pass35/a45/screenshots",
]);
const P36_EXCLUDED_EXACT_PATHS = new Set([
  "artifacts/pass35/a45/A45_DETERMINISTIC_LOCAL_REFERENCE_QA_FIXTURE.json",
]);
const P36_EXCLUDED_SUFFIXES = new Set([".pyc", ".pyo"]);
const P36_EXTERNAL_FONT_NAMES = new Set(["manrope-pdf-latin-plus-ext.ttf"]);

function invariant(condition, code, detail = null) {
  if (!condition) {
    const suffix = detail === null ? "" : `:${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
    throw new Error(`p36_current_byte_build_gates:${code}${suffix}`);
  }
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function integritySha256(value) {
  const { integritySha256: _ignored, ...unsigned } = value;
  return sha256Bytes(JSON.stringify(canonicalize(unsigned)));
}

function normalizedPath(value) {
  return value.split(path.sep).join("/");
}

function pathWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function displayPath(root, absolutePath) {
  return pathWithin(root, absolutePath)
    ? normalizedPath(path.relative(root, absolutePath))
    : normalizedPath(absolutePath);
}

function resolvePath(root, requested) {
  invariant(typeof requested === "string" && requested.length > 0, "input_path_missing");
  return path.isAbsolute(requested) ? path.resolve(requested) : path.resolve(root, requested);
}

function rejectSymlinkFile(filePath, label) {
  const stat = fs.lstatSync(filePath);
  invariant(stat.isFile() && !stat.isSymbolicLink(), `${label}_regular_file_required`);
  const realPath = fs.realpathSync(filePath);
  const realStat = fs.lstatSync(realPath);
  invariant(realStat.isFile() && !realStat.isSymbolicLink(), `${label}_real_file_required`);
  return { stat, realPath };
}

export function bindFile(root, requested, label = "input") {
  const absolutePath = resolvePath(root, requested);
  const { stat, realPath } = rejectSymlinkFile(absolutePath, label);
  const bytes = fs.readFileSync(realPath);
  return {
    absolutePath,
    bytes,
    text: bytes.toString("utf8"),
    stat,
    binding: {
      path: displayPath(root, absolutePath),
      pathKind: pathWithin(root, absolutePath) ? "ROOT_RELATIVE" : "ABSOLUTE_EXTERNAL_RUNTIME",
      realPath: displayPath(root, realPath),
      byteLength: bytes.length,
      sha256: sha256Bytes(bytes),
      modifiedAt: new Date(stat.mtimeMs).toISOString(),
    },
  };
}

function parseJson(bound, label) {
  try {
    return JSON.parse(bound.text);
  } catch (error) {
    throw new Error(`p36_current_byte_build_gates:${label}_invalid_json`, { cause: error });
  }
}

function normalizedMode(mode) {
  return mode & 0o111 ? 0o755 : 0o644;
}

function p36Excluded(relativePath) {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length === 0) return true;
  if (P36_EXCLUDED_EXACT_PATHS.has(relativePath)) return true;
  if (parts.some((part) => P36_EXCLUDED_COMPONENTS.has(part) || part.startsWith(".next"))) return true;
  if (P36_EXCLUDED_ROOT_DIRECTORIES.has(parts[0])) return true;
  if (parts[0] === ".yarn" && parts[1] === "cache") return true;
  if (P36_EXCLUDED_PREFIXES.some((prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}/`))) return true;
  if (P36_EXCLUDED_SUFFIXES.has(path.posix.extname(relativePath).toLowerCase())) return true;
  if (P36_EXTERNAL_FONT_NAMES.has(path.posix.basename(relativePath).toLowerCase())) return true;
  if (parts.some((part) => part.toUpperCase() === "MATERIALS")) return true;
  return path.posix.extname(relativePath).toLowerCase() === ".zip"
    && path.posix.basename(relativePath).toUpperCase().includes("MATERIALS");
}

function sortedDirectoryEntries(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
    Buffer.compare(Buffer.from(left.name, "utf8"), Buffer.from(right.name, "utf8")));
}

export function computeP36SourceIdentitySnapshot(root) {
  const resolvedRoot = fs.realpathSync(path.resolve(root));
  const rows = [];
  const casefold = new Map();
  const visit = (directory, relativeDirectory = "") => {
    for (const entry of sortedDirectoryEntries(directory)) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      if (p36Excluded(relativePath)) continue;
      const absolutePath = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolutePath);
      invariant(!stat.isSymbolicLink(), "source_included_symlink", relativePath);
      if (stat.isDirectory()) {
        visit(absolutePath, relativePath);
        continue;
      }
      invariant(stat.isFile(), "source_included_special_file", relativePath);
      const folded = relativePath.toLocaleLowerCase("en-US");
      invariant(!casefold.has(folded), "source_casefold_collision", [casefold.get(folded), relativePath]);
      casefold.set(folded, relativePath);
      const bytes = fs.readFileSync(absolutePath);
      rows.push({
        path: relativePath,
        byteLength: bytes.length,
        mode: normalizedMode(stat.mode),
        sha256: sha256Bytes(bytes),
      });
    }
  };
  visit(resolvedRoot);
  const pathSetSha256 = sha256Bytes(rows.map((row) => row.path).join("\n"));
  const aggregateBytes = rows.map((row) =>
    `${row.path}\0${row.byteLength}\0${row.mode}\0${row.sha256}\n`).join("");
  return {
    files: rows,
    fileCount: rows.length,
    payloadBytes: rows.reduce((sum, row) => sum + row.byteLength, 0),
    pathSetSha256,
    sourceAggregateSha256: sha256Bytes(Buffer.from(aggregateBytes, "utf8")),
  };
}

function walkDigest(root, { excludedDirectory, excludedFile, ordering }) {
  const rows = [];
  let totalBytes = 0;
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = normalizedPath(path.relative(root, absolutePath));
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!excludedDirectory(entry.name, relativePath, directory)) visit(absolutePath);
      } else if (entry.isFile() && !excludedFile(entry.name, relativePath)) {
        const bytes = fs.readFileSync(absolutePath);
        totalBytes += bytes.length;
        rows.push(`${relativePath}\0${bytes.length}\0${sha256Bytes(bytes)}`);
      }
    }
  };
  visit(root);
  if (ordering === "LOCALE_COMPARE") {
    // Match scripts/pass13/common.mjs::walkFiles.
    rows.sort((left, right) => left.localeCompare(right));
  } else if (ordering === "NATIVE_UTF16") {
    // Match scripts/deployment/common.mjs::sourceTreeDigest. Native Array#sort
    // can order mixed-case and punctuation paths differently from localeCompare.
    rows.sort();
  } else {
    invariant(false, "source_digest_ordering", ordering ?? null);
  }
  return {
    sha256: sha256Bytes(Buffer.from(rows.join("\n"), "utf8")),
    fileCount: rows.length,
    totalBytes,
  };
}

export function computePass13SourceDigest(root) {
  const resolvedRoot = fs.realpathSync(path.resolve(root));
  const excludedNames = new Set(["node_modules", ".next", ".velmere", "out", "coverage"]);
  return walkDigest(resolvedRoot, {
    ordering: "LOCALE_COMPARE",
    excludedDirectory(name, relativePath, parent) {
      if (excludedNames.has(name)) return true;
      if (parent === resolvedRoot && (name === "build" || name.startsWith(".next-pass25-"))) return true;
      return relativePath === "artifacts" || relativePath.startsWith("artifacts/")
        || relativePath === "archive" || relativePath.startsWith("archive/");
    },
    excludedFile(_name, relativePath) {
      return relativePath.startsWith(".velmere/npm-cache/")
        || relativePath.startsWith(".velmere/exact-runtime/")
        || relativePath.startsWith("artifacts/pass13/");
    },
  });
}

export function computeDeploymentSourceDigest(root) {
  const resolvedRoot = fs.realpathSync(path.resolve(root));
  const excludedRoot = new Set([
    ".git", ".velmere", "_velmere", "node_modules", "artifacts", "coverage", "out", "build",
    ".next", ".next-pass25-webpack", ".next-pass25-turbopack",
  ]);
  const excludedFiles = new Set(["CLEAN_SAFE_VERIFICATION.json", "CLEAN_SAFE_PAYLOAD_MANIFEST.json"]);
  return walkDigest(resolvedRoot, {
    ordering: "NATIVE_UTF16",
    excludedDirectory(name, _relativePath, parent) {
      return parent === resolvedRoot && excludedRoot.has(name);
    },
    excludedFile(name, relativePath) {
      return excludedFiles.has(relativePath) || name.endsWith(".tsbuildinfo");
    },
  });
}

function assertSourceIdentity(identity, current) {
  invariant(identity.schemaVersion === "velmere.p36.source-identity.v1", "source_identity_schema");
  invariant(identity.state === "CURRENT_SOURCE_ONLY_IN_PROGRESS", "source_identity_state");
  invariant(Array.isArray(identity.files), "source_identity_files");
  invariant(identity.fileCount === current.fileCount, "source_identity_file_count", [identity.fileCount, current.fileCount]);
  invariant(identity.payloadBytes === current.payloadBytes, "source_identity_payload", [identity.payloadBytes, current.payloadBytes]);
  invariant(identity.pathSetSha256 === current.pathSetSha256, "source_identity_path_set");
  invariant(identity.sourceAggregateSha256 === current.sourceAggregateSha256, "source_identity_aggregate");
  invariant(JSON.stringify(identity.files) === JSON.stringify(current.files), "source_identity_rows");
  invariant(SHA256.test(identity.sourceAggregateSha256), "source_identity_aggregate_shape");
}

function parseTime(value, code) {
  const parsed = Date.parse(value ?? "");
  invariant(Number.isFinite(parsed), code, value ?? null);
  return parsed;
}

function assertFresh(bound, sourceIdentityMtimeMs, nowMs, maxAgeMs, label) {
  invariant(bound.stat.mtimeMs + CLOCK_TOLERANCE_MS >= sourceIdentityMtimeMs, `${label}_predates_source_identity`);
  invariant(bound.stat.mtimeMs <= nowMs + CLOCK_TOLERANCE_MS, `${label}_mtime_future`);
  invariant(nowMs - bound.stat.mtimeMs <= maxAgeMs, `${label}_stale_mtime`);
}

function assertFreshTimestamp(value, sourceIdentityMtimeMs, nowMs, maxAgeMs, label) {
  const timestamp = parseTime(value, `${label}_timestamp`);
  invariant(timestamp + CLOCK_TOLERANCE_MS >= sourceIdentityMtimeMs, `${label}_predates_source_identity`);
  invariant(timestamp <= nowMs + CLOCK_TOLERANCE_MS, `${label}_future`);
  invariant(nowMs - timestamp <= maxAgeMs, `${label}_stale`);
  return timestamp;
}

function sameBinding(expected, actual, code) {
  invariant(expected && typeof expected === "object", `${code}_missing`);
  invariant(expected.path === actual.path, `${code}_path`, [expected.path, actual.path]);
  invariant(expected.byteLength === actual.byteLength, `${code}_bytes`);
  invariant(expected.sha256 === actual.sha256, `${code}_sha256`);
}

function parseMarker(text, prefix, label) {
  const values = text.split(/\r?\n/u).filter((line) => line.startsWith(prefix));
  invariant(values.length === 1, `${label}_marker_count`, values.length);
  try {
    return JSON.parse(values[0].slice(prefix.length));
  } catch (error) {
    throw new Error(`p36_current_byte_build_gates:${label}_marker_json`, { cause: error });
  }
}

function expectedCommand(runtime, gate) {
  const base = [runtime.node.path, runtime.npm.path];
  const commands = {
    npmCi: [...base, "ci", "--engine-strict=true", "--strict-allow-scripts=true", "--no-audit", "--no-fund", "--progress=false"],
    trustedNative: [...base, "run", "install:trusted-native"],
    typecheck: [...base, "run", "typecheck"],
    lint: [...base, "run", "lint"],
    webpack: [...base, "run", "build:webpack"],
    turbopack: [...base, "run", "build:turbopack"],
  };
  return commands[gate];
}

function validateExecutionLog({
  bound,
  gate,
  runtime,
  sourceIdentity,
  sourceBinding,
  packageLockBinding,
  receiptBinding = null,
  sourceIdentityMtimeMs,
  nowMs,
  maxAgeMs,
}) {
  assertFresh(bound, sourceIdentityMtimeMs, nowMs, maxAgeMs, `${gate}_log`);
  const context = parseMarker(bound.text, "P36_GATE_CONTEXT ", `${gate}_context`);
  const result = parseMarker(bound.text, "P36_GATE_RESULT ", `${gate}_result`);
  invariant(context.schemaVersion === "velmere.p36.gate-execution-context.v1", `${gate}_context_schema`);
  invariant(result.schemaVersion === "velmere.p36.gate-execution-result.v1", `${gate}_result_schema`);
  invariant(context.gate === gate && result.gate === gate, `${gate}_identity`);
  invariant(context.sourceIdentitySha256 === sourceBinding.sha256, `${gate}_source_identity_sha`);
  invariant(result.sourceIdentitySha256 === sourceBinding.sha256, `${gate}_result_source_identity_sha`);
  invariant(context.sourceAggregateSha256 === sourceIdentity.sourceAggregateSha256, `${gate}_source_aggregate`);
  invariant(result.sourceAggregateSha256 === sourceIdentity.sourceAggregateSha256, `${gate}_result_source_aggregate`);
  invariant(context.packageLockSha256 === packageLockBinding.sha256, `${gate}_package_lock`);
  invariant(result.packageLockSha256 === packageLockBinding.sha256, `${gate}_result_package_lock`);
  invariant(context.runtime?.nodeVersion === EXPECTED_NODE && context.runtime?.npmVersion === EXPECTED_NPM, `${gate}_runtime_versions`);
  invariant(context.runtime?.nodeExecutablePath === runtime.node.path, `${gate}_node_path`);
  invariant(context.runtime?.nodeExecutableSha256 === runtime.node.sha256, `${gate}_node_sha`);
  invariant(context.runtime?.npmCliPath === runtime.npm.path, `${gate}_npm_path`);
  invariant(context.runtime?.npmCliSha256 === runtime.npm.sha256, `${gate}_npm_sha`);
  invariant(JSON.stringify(context.command) === JSON.stringify(expectedCommand(runtime, gate)), `${gate}_command`);
  const started = assertFreshTimestamp(context.startedAt, sourceIdentityMtimeMs, nowMs, maxAgeMs, `${gate}_started`);
  const resultStarted = parseTime(result.startedAt, `${gate}_result_started`);
  const completed = assertFreshTimestamp(result.completedAt, sourceIdentityMtimeMs, nowMs, maxAgeMs, `${gate}_completed`);
  invariant(started === resultStarted && completed >= started, `${gate}_time_order`);
  invariant(result.durationMs === completed - started, `${gate}_duration`, [result.durationMs, completed - started]);
  invariant(result.status === "PASS" && result.exitCode === 0 && result.signal === null, `${gate}_process_result`);
  if (receiptBinding === null) invariant(result.receipt === null, `${gate}_unexpected_receipt_binding`);
  else sameBinding(result.receipt, receiptBinding, `${gate}_receipt_binding`);
  return { context, result, startedAtMs: started, completedAtMs: completed, durationMs: result.durationMs };
}

function defaultRuntimeProbe({ nodePath, npmPath, root }) {
  const node = spawnSync(nodePath, ["--version"], { cwd: root, encoding: "utf8", timeout: 10_000, shell: false });
  const npm = spawnSync(nodePath, [npmPath, "--version"], { cwd: root, encoding: "utf8", timeout: 10_000, shell: false });
  return {
    node: { status: node.status, signal: node.signal, stdout: node.stdout ?? "", stderr: node.stderr ?? "", error: node.error ?? null },
    npm: { status: npm.status, signal: npm.signal, stdout: npm.stdout ?? "", stderr: npm.stderr ?? "", error: npm.error ?? null },
  };
}

function defaultNpmLsProbe({ nodePath, npmPath, root }) {
  const result = spawnSync(nodePath, [npmPath, "ls", "--depth=0", "--json"], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
    shell: false,
    env: { ...process.env, NPM_CONFIG_AUDIT: "false", NPM_CONFIG_FUND: "false" },
  });
  return { status: result.status, signal: result.signal, stdout: result.stdout ?? "", stderr: result.stderr ?? "", error: result.error ?? null };
}

function dependencyVersions(value) {
  return Object.fromEntries(Object.entries(value?.dependencies ?? {}).sort(([left], [right]) => left.localeCompare(right))
    .map(([name, descriptor]) => [name, descriptor?.version ?? null]));
}

function validateRuntime({ root, nodeBound, npmBound, packageJsonBound, packageLockBound, runtimeProbe }) {
  const packageJson = parseJson(packageJsonBound, "package_json");
  const packageLock = parseJson(packageLockBound, "package_lock");
  invariant(packageJson.engines?.node === EXPECTED_NODE.slice(1), "package_node_pin");
  invariant(packageJson.engines?.npm === EXPECTED_NPM, "package_npm_pin");
  invariant(packageJson.packageManager === `npm@${EXPECTED_NPM}`, "package_manager_pin");
  invariant(packageJson.devEngines?.runtime?.version === EXPECTED_NODE.slice(1), "package_dev_node_pin");
  invariant(packageJson.devEngines?.packageManager?.version === EXPECTED_NPM, "package_dev_npm_pin");
  invariant(packageLock.lockfileVersion === 3, "package_lock_version");
  invariant(packageLock.packages?.[""]?.engines?.node === EXPECTED_NODE.slice(1), "lock_node_pin");
  invariant(packageLock.packages?.[""]?.engines?.npm === EXPECTED_NPM, "lock_npm_pin");
  invariant(packageJson.devDependencies?.typescript === EXPECTED_TYPESCRIPT, "typescript_pin");
  invariant(packageJson.devDependencies?.eslint === EXPECTED_ESLINT, "eslint_pin");
  const probe = runtimeProbe({ nodePath: nodeBound.absolutePath, npmPath: npmBound.absolutePath, root });
  invariant(probe.node?.status === 0 && probe.node.signal === null && !probe.node.error, "node_probe");
  invariant(probe.npm?.status === 0 && probe.npm.signal === null && !probe.npm.error, "npm_probe");
  const nodeVersion = String(probe.node.stdout).trim();
  const npmVersion = String(probe.npm.stdout).trim();
  invariant(nodeVersion === EXPECTED_NODE, "node_version", nodeVersion);
  invariant(npmVersion === EXPECTED_NPM, "npm_version", npmVersion);
  return {
    node: { ...nodeBound.binding, path: displayPath(root, nodeBound.absolutePath), version: nodeVersion },
    npm: { ...npmBound.binding, path: displayPath(root, npmBound.absolutePath), version: npmVersion },
    packageJson,
    packageLock,
  };
}

function validateNpmCi(text, execution) {
  const matches = [...text.matchAll(/added\s+(\d+)\s+packages?\s+in\s+/giu)];
  invariant(matches.length === 1, "npm_ci_added_denominator", matches.length);
  const packagesAdded = Number(matches[0][1]);
  invariant(Number.isSafeInteger(packagesAdded) && packagesAdded > 0, "npm_ci_packages_added");
  invariant(execution.result.details?.packagesAdded === packagesAdded, "npm_ci_result_denominator");
  return { packagesAdded };
}

function validateTrustedNative(text, execution) {
  const rows = text.split(/\r?\n/u).map((line) => line.trim()).filter((line) => line.startsWith("{") && line.endsWith("}"));
  const parsed = rows.map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
  const receipt = parsed.find((row) => row.status === "PASS_EXACT_TRUSTED_NATIVE_REBUILD");
  invariant(receipt, "trusted_native_pass_receipt_missing");
  invariant(receipt.node === EXPECTED_NODE.slice(1) && receipt.npm === EXPECTED_NPM, "trusted_native_runtime");
  invariant(JSON.stringify(receipt.packages) === JSON.stringify(TRUSTED_NATIVE_PACKAGES), "trusted_native_packages");
  invariant(execution.result.details?.packages === TRUSTED_NATIVE_PACKAGES.length, "trusted_native_result_denominator");
  return { packageCount: TRUSTED_NATIVE_PACKAGES.length, packages: [...TRUSTED_NATIVE_PACKAGES] };
}

function validateTypeScript(receipt, currentSourceDigest) {
  invariant(receipt.schemaVersion === "velmere.pass13.partitioned-typescript.v1", "typescript_schema");
  invariant(receipt.ok === true && receipt.typescriptVersion === EXPECTED_TYPESCRIPT, "typescript_status");
  invariant(Number.isSafeInteger(receipt.partitionCount) && receipt.partitionCount > 0, "typescript_partition_count");
  invariant(Array.isArray(receipt.partitions) && receipt.partitions.length === receipt.partitionCount, "typescript_partitions");
  invariant(receipt.configuredRootFiles > 0 && receipt.rootFilesCovered === receipt.configuredRootFiles, "typescript_root_coverage");
  invariant(receipt.transitiveFirstPartyFiles >= receipt.rootFilesCovered, "typescript_transitive_coverage");
  invariant(receipt.toolingSyntaxFiles > 0 && Array.isArray(receipt.toolingSyntaxErrors) && receipt.toolingSyntaxErrors.length === 0, "typescript_tooling");
  const diagnostics = receipt.partitions.flatMap((part) => part.diagnostics ?? []);
  invariant(diagnostics.length === 0, "typescript_diagnostics", diagnostics.slice(0, 10));
  invariant(receipt.partitions.every((part) => part.exitCode === 0 && part.signal === null && part.timedOut === false), "typescript_worker_status");
  invariant(receipt.sourceImmutable === true && receipt.sourceBefore === receipt.sourceAfter, "typescript_source_immutable");
  invariant(receipt.sourceBefore === currentSourceDigest.sha256, "typescript_current_source_digest");
  invariant(receipt.nextEnvImmutable === true && receipt.nextEnvBeforeSha256 === receipt.nextEnvAfterSha256, "typescript_next_env");
  return {
    partitions: receipt.partitionCount,
    passedPartitions: receipt.partitions.length,
    configuredRootFiles: receipt.configuredRootFiles,
    rootFilesCovered: receipt.rootFilesCovered,
    transitiveFirstPartyFiles: receipt.transitiveFirstPartyFiles,
    toolingSyntaxFiles: receipt.toolingSyntaxFiles,
    diagnostics: 0,
  };
}

function validateTypeScriptLog(text, receipt) {
  const match = text.match(/PASS13 TypeScript:\s+(\d+)\/(\d+) partitions\s+·\s+roots\s+(\d+)\/(\d+)\s+·\s+transitive\s+(\d+)\s+·\s+tooling\s+(\d+)\s+·\s+diagnostics\s+(\d+)/u);
  invariant(match, "typescript_log_summary");
  const values = match.slice(1).map(Number);
  invariant(JSON.stringify(values) === JSON.stringify([
    receipt.partitionCount,
    receipt.partitionCount,
    receipt.rootFilesCovered,
    receipt.configuredRootFiles,
    receipt.transitiveFirstPartyFiles,
    receipt.toolingSyntaxFiles,
    0,
  ]), "typescript_log_denominators", values);
}

function validateEslint(receipt, currentSourceDigest, runtime) {
  invariant(receipt.schemaVersion === "velmere.pass13.partitioned-eslint.v4", "eslint_schema");
  invariant(receipt.ok === true, "eslint_status");
  invariant(Number.isSafeInteger(receipt.partitionCount) && receipt.partitionCount > 0, "eslint_partition_count");
  invariant(receipt.requestedPartitionStart === 1 && receipt.requestedPartitionEnd === receipt.partitionCount, "eslint_requested_range");
  invariant(receipt.completedPartitions === receipt.partitionCount && receipt.passedPartitions === receipt.partitionCount, "eslint_partition_coverage");
  invariant(receipt.fileCount > 0 && receipt.filesCovered === receipt.fileCount, "eslint_file_coverage");
  invariant(receipt.lintErrors === 0 && receipt.lintWarnings === 0, "eslint_findings");
  invariant(receipt.processFailureCount === 0 && receipt.firstProcessFailure === null, "eslint_process_failures");
  invariant(Array.isArray(receipt.messages) && receipt.messages.length === 0, "eslint_messages");
  invariant(Array.isArray(receipt.processFailures) && receipt.processFailures.length === 0, "eslint_process_failure_rows");
  invariant(Array.isArray(receipt.parts) && receipt.parts.length === receipt.partitionCount, "eslint_parts");
  invariant(receipt.parts.every((part, index) => part.index === index + 1
    && part.passed === true
    && part.lintErrors === 0
    && part.lintWarnings === 0
    && part.processFailure === null
    && part.resultPathSetMatch === true
    && part.completedInvocations === part.plannedInvocations
    && Array.isArray(part.invocations)
    && part.invocations.length === part.plannedInvocations
    && part.invocations.every((invocation) => invocation.exitCode === 0
      && invocation.signal === null
      && invocation.timedOut === false
      && invocation.lintErrors === 0
      && invocation.lintWarnings === 0
      && invocation.processFailure === null
      && invocation.resultPathSetMatch === true)), "eslint_part_details");
  invariant(receipt.eslintIdentity?.packageVersion === EXPECTED_ESLINT, "eslint_version");
  invariant(receipt.eslintIdentity?.cliSha256 && SHA256.test(receipt.eslintIdentity.cliSha256), "eslint_cli_sha");
  invariant(displayPath(path.resolve(runtime.root), path.resolve(receipt.nodeExecutable)) === runtime.node.path, "eslint_node_executable");
  invariant(receipt.sourceImmutable === true && receipt.sourceBefore === receipt.sourceAfter, "eslint_source_immutable");
  invariant(receipt.sourceBefore === currentSourceDigest.sha256, "eslint_current_source_digest");
  return {
    partitions: receipt.partitionCount,
    passedPartitions: receipt.passedPartitions,
    files: receipt.fileCount,
    filesCovered: receipt.filesCovered,
    invocations: receipt.parts.reduce((sum, part) => sum + part.completedInvocations, 0),
    errors: 0,
    warnings: 0,
    processFailures: 0,
  };
}

function validateEslintLog(text, receipt) {
  const match = text.match(/PASS13 ESLint shard:\s+(\d+)\/(\d+) passed\s+·\s+(\d+) files\s+·\s+(\d+) errors\s+·\s+(\d+) warnings\s+·\s+(\d+) process failures/u);
  invariant(match, "eslint_log_summary");
  const values = match.slice(1).map(Number);
  invariant(JSON.stringify(values) === JSON.stringify([
    receipt.passedPartitions,
    receipt.partitionCount,
    receipt.filesCovered,
    0,
    0,
    0,
  ]), "eslint_log_denominators", values);
}

function exactDigestMatch(observed, expected) {
  return observed?.sha256 === expected.sha256
    && observed?.fileCount === expected.fileCount
    && observed?.totalBytes === expected.totalBytes;
}

function bindBuildOutput(root, filePath, label) {
  const bound = bindFile(root, filePath, label);
  return bound.binding;
}

function validatePostLock(receipt) {
  invariant(receipt.schemaVersion === "velmere.segmented-build-lock-post-process-verifier.v1", "post_lock_schema");
  invariant(receipt.phase === "post-build" && receipt.status === "PASS" && receipt.ok === true, "post_lock_status");
  invariant(receipt.firstFailure === null && receipt.checks >= 2, "post_lock_checks");
  invariant(receipt.finalInspection?.ok === true, "post_lock_final_inspection");
}

function validateBuild({ root, mode, receipt, currentSourceDigest, postLockReceipt }) {
  invariant(BUILD_MODES.includes(mode), "build_mode", mode);
  invariant(receipt.schemaVersion === "velmere.segmented-build.v1", `${mode}_schema`);
  invariant(receipt.mode === mode && receipt.status === "PASS" && receipt.ok === true, `${mode}_status`);
  invariant(receipt.node === EXPECTED_NODE && receipt.npm === EXPECTED_NPM, `${mode}_runtime`);
  const distDir = `.next-pass25-${mode}`;
  const buildId = `vlm-deployment-${mode}-${currentSourceDigest.sha256.slice(0, 16)}`;
  invariant(receipt.distDir === distDir && receipt.buildId === buildId, `${mode}_identity`);
  invariant(exactDigestMatch(receipt.sourceAtInvocation, currentSourceDigest), `${mode}_source_invocation`);
  invariant(exactDigestMatch(receipt.sourceBefore, currentSourceDigest), `${mode}_source_before`);
  invariant(exactDigestMatch(receipt.sourceAfter, currentSourceDigest), `${mode}_source_after`);
  invariant(receipt.sourceStableAtLock === true && receipt.sourceImmutable === true, `${mode}_source_immutable`);
  for (const phaseName of ["compile", "generate"]) {
    const phase = receipt[phaseName];
    invariant(phase?.phase === phaseName && phase.status === "PASS" && phase.ok === true, `${mode}_${phaseName}_status`);
    invariant(phase.exitCode === 0 && phase.signal === null && !phase.timedOut && !phase.stalled && !phase.memoryBudgetExceeded && !phase.spawnError, `${mode}_${phaseName}_process`);
    invariant(Number.isFinite(phase.durationMs) && phase.durationMs >= 0, `${mode}_${phaseName}_duration`);
  }
  invariant(receipt.buildLock?.acquisition?.acquired === true && receipt.buildLock.acquisition.status === "ACQUIRED", `${mode}_lock_acquisition`);
  invariant(receipt.buildLock?.release?.released === true && receipt.buildLock.release.status === "RELEASED" && receipt.buildLock.release.absentAtRelease === true, `${mode}_lock_release`);
  invariant(receipt.buildIdCheckpoints?.afterCompile?.ok === true, `${mode}_build_id_after_compile`);
  invariant(receipt.buildIdCheckpoints?.beforeGenerate?.ok === true, `${mode}_build_id_before_generate`);
  invariant(receipt.buildIdCheckpoints?.final?.ok === true, `${mode}_build_id_final`);
  invariant(receipt.managedNextEnv?.observed?.exactExpectedContent === true, `${mode}_next_env_observed`);
  invariant(receipt.managedNextEnv?.restored?.restored === true, `${mode}_next_env_restored`);
  invariant(receipt.outputContract?.ok === true && receipt.outputContract.checks?.every((row) => row.ok === true), `${mode}_output_contract`);
  invariant(receipt.runtimeClosure?.status === "PASS", `${mode}_runtime_closure`);
  invariant(receipt.fatal === null, `${mode}_fatal`);
  validatePostLock(postLockReceipt);

  const contract = expectedBuildOutputContract(root, distDir, buildId);
  const buildIdBytes = fs.readFileSync(contract.buildIdPath, "utf8").trim();
  const standaloneBuildIdBytes = fs.readFileSync(contract.standaloneBuildIdPath, "utf8").trim();
  invariant(buildIdBytes === buildId && standaloneBuildIdBytes === buildId, `${mode}_physical_build_ids`);
  for (const directory of [contract.standalonePath, contract.standaloneStaticPath, contract.standalonePublicPath]) {
    const stat = fs.lstatSync(directory);
    invariant(stat.isDirectory() && !stat.isSymbolicLink(), `${mode}_output_directory`, displayPath(root, directory));
  }
  const outputBindings = {
    buildId: bindBuildOutput(root, contract.buildIdPath, `${mode}_build_id`),
    standaloneBuildId: bindBuildOutput(root, contract.standaloneBuildIdPath, `${mode}_standalone_build_id`),
    routesManifest: bindBuildOutput(root, contract.routesManifestPath, `${mode}_routes_manifest`),
    appPathsManifest: bindBuildOutput(root, contract.requiredServerManifestPath, `${mode}_app_paths_manifest`),
    standaloneServer: bindBuildOutput(root, contract.standaloneServerPath, `${mode}_standalone_server`),
    standaloneNextBootstrap: bindBuildOutput(root, contract.standaloneNextBootstrapPath, `${mode}_standalone_next`),
    standaloneStartServer: bindBuildOutput(root, contract.standaloneStartServerPath, `${mode}_standalone_start`),
  };
  const phaseLogs = {};
  for (const phaseName of ["compile", "generate"]) {
    const phaseBound = bindFile(root, receipt[phaseName].log, `${mode}_${phaseName}_log`);
    invariant(phaseBound.binding.sha256 === receipt[phaseName].logSha256, `${mode}_${phaseName}_log_sha`);
    phaseLogs[phaseName] = phaseBound.binding;
  }
  return {
    mode,
    buildId,
    distDir,
    outputDirectory: distDir,
    compileDurationMs: receipt.compile.durationMs,
    generateDurationMs: receipt.generate.durationMs,
    totalPhaseDurationMs: receipt.compile.durationMs + receipt.generate.durationMs,
    outputChecks: receipt.outputContract.checks.length,
    outputBindings,
    phaseLogs,
  };
}

function validateGeneratedTimestamp(receipt, sourceIdentityMtimeMs, nowMs, maxAgeMs, label) {
  return assertFreshTimestamp(receipt.generatedAt, sourceIdentityMtimeMs, nowMs, maxAgeMs, `${label}_generated`);
}

function assertSequence(executions) {
  const ordered = [
    executions.npmCi,
    executions.trustedNative,
    executions.typecheck,
    executions.lint,
    executions.webpack,
    executions.turbopack,
  ];
  for (let index = 1; index < ordered.length; index += 1) {
    invariant(ordered[index].startedAtMs >= ordered[index - 1].completedAtMs, "execution_sequence", index);
  }
}

function bindRequestedInputs(root, paths) {
  return {
    sourceIdentity: bindFile(root, paths.sourceIdentity, "source_identity"),
    node: bindFile(root, paths.node, "node_executable"),
    npm: bindFile(root, paths.npmCli, "npm_cli"),
    packageJson: bindFile(root, paths.packageJson ?? "package.json", "package_json"),
    packageLock: bindFile(root, paths.packageLock ?? "package-lock.json", "package_lock"),
    npmCiLog: bindFile(root, paths.npmCiLog, "npm_ci_log"),
    npmLs: bindFile(root, paths.npmLsReceipt, "npm_ls_receipt"),
    trustedNativeLog: bindFile(root, paths.trustedNativeLog, "trusted_native_log"),
    typeScriptReceipt: bindFile(root, paths.typeScriptReceipt, "typescript_receipt"),
    typeScriptLog: bindFile(root, paths.typeScriptLog, "typescript_log"),
    eslintReceipt: bindFile(root, paths.eslintReceipt, "eslint_receipt"),
    eslintLog: bindFile(root, paths.eslintLog, "eslint_log"),
    webpackReceipt: bindFile(root, paths.webpackReceipt, "webpack_receipt"),
    webpackLog: bindFile(root, paths.webpackLog, "webpack_log"),
    webpackPostLock: bindFile(root, paths.webpackPostLockReceipt, "webpack_post_lock_receipt"),
    turbopackReceipt: bindFile(root, paths.turbopackReceipt, "turbopack_receipt"),
    turbopackLog: bindFile(root, paths.turbopackLog, "turbopack_log"),
    turbopackPostLock: bindFile(root, paths.turbopackPostLockReceipt, "turbopack_post_lock_receipt"),
  };
}

export function buildP36CurrentByteBuildGates({
  root = ROOT,
  paths,
  nowMs = Date.now(),
  maxAgeMs = MAX_AGE_MS,
  runtimeProbe = defaultRuntimeProbe,
  npmLsProbe = defaultNpmLsProbe,
} = {}) {
  invariant(paths && typeof paths === "object", "paths_required");
  invariant(Number.isSafeInteger(nowMs) && nowMs > 0, "now_invalid");
  invariant(Number.isSafeInteger(maxAgeMs) && maxAgeMs >= 60_000, "max_age_invalid");
  const resolvedRoot = fs.realpathSync(path.resolve(root));
  const bound = bindRequestedInputs(resolvedRoot, paths);
  const sourceIdentity = parseJson(bound.sourceIdentity, "source_identity");
  const currentP36 = computeP36SourceIdentitySnapshot(resolvedRoot);
  assertSourceIdentity(sourceIdentity, currentP36);
  const sourceIdentityMtimeMs = bound.sourceIdentity.stat.mtimeMs;
  invariant(nowMs - sourceIdentityMtimeMs <= maxAgeMs, "source_identity_stale");
  const currentPass13 = computePass13SourceDigest(resolvedRoot);
  const currentDeployment = computeDeploymentSourceDigest(resolvedRoot);

  const runtimeData = validateRuntime({
    root: resolvedRoot,
    nodeBound: bound.node,
    npmBound: bound.npm,
    packageJsonBound: bound.packageJson,
    packageLockBound: bound.packageLock,
    runtimeProbe,
  });
  const runtime = { root: resolvedRoot, node: runtimeData.node, npm: runtimeData.npm };
  const sourceBinding = bound.sourceIdentity.binding;
  const packageLockBinding = bound.packageLock.binding;

  for (const [label, input] of Object.entries(bound)) {
    if (["sourceIdentity", "node", "npm", "packageJson", "packageLock"].includes(label)) continue;
    assertFresh(input, sourceIdentityMtimeMs, nowMs, maxAgeMs, label);
  }

  const typeScript = parseJson(bound.typeScriptReceipt, "typescript_receipt");
  const eslint = parseJson(bound.eslintReceipt, "eslint_receipt");
  const webpack = parseJson(bound.webpackReceipt, "webpack_receipt");
  const turbopack = parseJson(bound.turbopackReceipt, "turbopack_receipt");
  const webpackPostLock = parseJson(bound.webpackPostLock, "webpack_post_lock");
  const turbopackPostLock = parseJson(bound.turbopackPostLock, "turbopack_post_lock");
  for (const [label, receipt] of Object.entries({ typeScript, eslint, webpack, turbopack, webpackPostLock, turbopackPostLock })) {
    validateGeneratedTimestamp(receipt, sourceIdentityMtimeMs, nowMs, maxAgeMs, label);
  }

  const executions = {
    npmCi: validateExecutionLog({ bound: bound.npmCiLog, gate: "npmCi", runtime, sourceIdentity, sourceBinding, packageLockBinding, sourceIdentityMtimeMs, nowMs, maxAgeMs }),
    trustedNative: validateExecutionLog({ bound: bound.trustedNativeLog, gate: "trustedNative", runtime, sourceIdentity, sourceBinding, packageLockBinding, sourceIdentityMtimeMs, nowMs, maxAgeMs }),
    typecheck: validateExecutionLog({ bound: bound.typeScriptLog, gate: "typecheck", runtime, sourceIdentity, sourceBinding, packageLockBinding, receiptBinding: bound.typeScriptReceipt.binding, sourceIdentityMtimeMs, nowMs, maxAgeMs }),
    lint: validateExecutionLog({ bound: bound.eslintLog, gate: "lint", runtime, sourceIdentity, sourceBinding, packageLockBinding, receiptBinding: bound.eslintReceipt.binding, sourceIdentityMtimeMs, nowMs, maxAgeMs }),
    webpack: validateExecutionLog({ bound: bound.webpackLog, gate: "webpack", runtime, sourceIdentity, sourceBinding, packageLockBinding, receiptBinding: bound.webpackReceipt.binding, sourceIdentityMtimeMs, nowMs, maxAgeMs }),
    turbopack: validateExecutionLog({ bound: bound.turbopackLog, gate: "turbopack", runtime, sourceIdentity, sourceBinding, packageLockBinding, receiptBinding: bound.turbopackReceipt.binding, sourceIdentityMtimeMs, nowMs, maxAgeMs }),
  };
  assertSequence(executions);

  const npmCiDenominator = validateNpmCi(bound.npmCiLog.text, executions.npmCi);
  const trustedNativeDenominator = validateTrustedNative(bound.trustedNativeLog.text, executions.trustedNative);
  const typeScriptDenominator = validateTypeScript(typeScript, currentPass13);
  validateTypeScriptLog(bound.typeScriptLog.text, typeScript);
  const eslintDenominator = validateEslint(eslint, currentPass13, runtime);
  validateEslintLog(bound.eslintLog.text, eslint);

  const capturedNpmLs = parseJson(bound.npmLs, "npm_ls_receipt");
  invariant(!Array.isArray(capturedNpmLs.problems) || capturedNpmLs.problems.length === 0, "npm_ls_captured_problems");
  const liveNpmLsResult = npmLsProbe({ nodePath: bound.node.absolutePath, npmPath: bound.npm.absolutePath, root: resolvedRoot });
  invariant(liveNpmLsResult.status === 0 && liveNpmLsResult.signal === null && !liveNpmLsResult.error, "npm_ls_live_process");
  let liveNpmLs;
  try { liveNpmLs = JSON.parse(liveNpmLsResult.stdout); } catch (error) {
    throw new Error("p36_current_byte_build_gates:npm_ls_live_json", { cause: error });
  }
  invariant(!Array.isArray(liveNpmLs.problems) || liveNpmLs.problems.length === 0, "npm_ls_live_problems");
  invariant(JSON.stringify(dependencyVersions(capturedNpmLs)) === JSON.stringify(dependencyVersions(liveNpmLs)), "npm_ls_dependency_mismatch");
  const npmLsDenominator = {
    topLevelDependencies: Object.keys(dependencyVersions(liveNpmLs)).length,
    problems: 0,
  };

  const webpackDenominator = validateBuild({ root: resolvedRoot, mode: "webpack", receipt: webpack, currentSourceDigest: currentDeployment, postLockReceipt: webpackPostLock });
  const turbopackDenominator = validateBuild({ root: resolvedRoot, mode: "turbopack", receipt: turbopack, currentSourceDigest: currentDeployment, postLockReceipt: turbopackPostLock });

  const webpackPostLockAt = parseTime(webpackPostLock.generatedAt, "webpack_post_lock_time");
  const turbopackPostLockAt = parseTime(turbopackPostLock.generatedAt, "turbopack_post_lock_time");
  invariant(
    webpackPostLockAt >= parseTime(webpack.generatedAt, "webpack_generated_time")
      && webpackPostLockAt <= executions.webpack.completedAtMs,
    "webpack_post_lock_order",
  );
  invariant(
    turbopackPostLockAt >= parseTime(turbopack.generatedAt, "turbopack_generated_time")
      && turbopackPostLockAt <= executions.turbopack.completedAtMs,
    "turbopack_post_lock_order",
  );

  const inputs = {
    sourceIdentity: bound.sourceIdentity.binding,
    npmCiLog: bound.npmCiLog.binding,
    npmLsReceipt: bound.npmLs.binding,
    trustedNativeLog: bound.trustedNativeLog.binding,
    typeScriptReceipt: bound.typeScriptReceipt.binding,
    typeScriptLog: bound.typeScriptLog.binding,
    eslintReceipt: bound.eslintReceipt.binding,
    eslintLog: bound.eslintLog.binding,
    webpackReceipt: bound.webpackReceipt.binding,
    webpackLog: bound.webpackLog.binding,
    webpackPostLockReceipt: bound.webpackPostLock.binding,
    turbopackReceipt: bound.turbopackReceipt.binding,
    turbopackLog: bound.turbopackLog.binding,
    turbopackPostLockReceipt: bound.turbopackPostLock.binding,
    webpackPhaseLogs: webpackDenominator.phaseLogs,
    turbopackPhaseLogs: turbopackDenominator.phaseLogs,
  };
  const positiveGates = {
    exactNodeNpm: true,
    cleanDependencyClosure: true,
    fullTypecheck: true,
    fullLint: true,
    webpackProductionBuild: true,
    turbopackProductionBuild: true,
  };
  const payload = {
    schemaVersion: SCHEMA,
    generatedAt: new Date(nowMs).toISOString(),
    sourceIdentity: {
      receipt: sourceBinding,
      fileCount: sourceIdentity.fileCount,
      payloadBytes: sourceIdentity.payloadBytes,
      pathSetSha256: sourceIdentity.pathSetSha256,
      sourceAggregateSha256: sourceIdentity.sourceAggregateSha256,
      pass13SourceDigest: currentPass13,
      deploymentSourceDigest: currentDeployment,
    },
    runtime: {
      nodeExecutable: runtime.node,
      npmCli: runtime.npm,
      packageJson: bound.packageJson.binding,
      packageLock: packageLockBinding,
      nodeVersion: EXPECTED_NODE,
      npmVersion: EXPECTED_NPM,
      typescriptVersion: EXPECTED_TYPESCRIPT,
      eslintVersion: EXPECTED_ESLINT,
      platform: process.platform,
      architecture: process.arch,
    },
    inputs,
    executionOrder: Object.fromEntries(Object.entries(executions).map(([gate, value]) => [gate, {
      startedAt: value.context.startedAt,
      completedAt: value.result.completedAt,
      durationMs: value.durationMs,
      exitCode: value.result.exitCode,
      signal: value.result.signal,
    }])),
    denominators: {
      dependencyInstall: npmCiDenominator,
      dependencyTree: npmLsDenominator,
      trustedNative: trustedNativeDenominator,
      typeScript: typeScriptDenominator,
      eslint: eslintDenominator,
      webpack: webpackDenominator,
      turbopack: turbopackDenominator,
    },
    buildOutputs: {
      webpack: {
        buildId: webpackDenominator.buildId,
        outputDirectory: webpackDenominator.outputDirectory,
        outputBindings: webpackDenominator.outputBindings,
      },
      turbopack: {
        buildId: turbopackDenominator.buildId,
        outputDirectory: turbopackDenominator.outputDirectory,
        outputBindings: turbopackDenominator.outputBindings,
      },
    },
    gates: { ...positiveGates, exactWindows: false },
    summary: {
      pass: Object.values(positiveGates).every(Boolean),
      passedRequiredGates: Object.values(positiveGates).filter(Boolean).length,
      requiredGateDenominator: Object.keys(positiveGates).length,
      exactWindows: false,
    },
    creditBoundary: {
      currentLinuxExactRuntimeInternal: true,
      exactWindows: false,
      staging: false,
      externalEvidence: false,
      providerRights: false,
      realCustomers: false,
      independentReview: false,
      paidRelease: false,
      live: false,
      worldClass: false,
    },
    truthBoundary: "Exact current-byte Linux Node/npm, clean dependency closure, full project TypeScript, full zero-warning ESLint, Webpack and Turbopack production-build gates only. This receipt grants no exact Windows, staging, external evidence, provider-rights, real-customer, independent-review, paid, LIVE or world-class credit.",
  };
  invariant(payload.summary.pass === true, "summary_not_pass");
  payload.integritySha256 = integritySha256(payload);

  const afterP36 = computeP36SourceIdentitySnapshot(resolvedRoot);
  const afterPass13 = computePass13SourceDigest(resolvedRoot);
  const afterDeployment = computeDeploymentSourceDigest(resolvedRoot);
  invariant(afterP36.sourceAggregateSha256 === currentP36.sourceAggregateSha256, "source_changed_during_builder_p36");
  invariant(afterPass13.sha256 === currentPass13.sha256, "source_changed_during_builder_pass13");
  invariant(afterDeployment.sha256 === currentDeployment.sha256, "source_changed_during_builder_deployment");
  return payload;
}

export function validateP36CurrentByteBuildGates(receipt) {
  const errors = [];
  const check = (condition, code) => { if (!condition) errors.push(code); };
  check(receipt?.schemaVersion === SCHEMA, "schema");
  check(SHA256.test(receipt?.integritySha256 ?? ""), "integrity_shape");
  if (receipt && typeof receipt === "object") check(receipt.integritySha256 === integritySha256(receipt), "integrity");
  const required = ["exactNodeNpm", "cleanDependencyClosure", "fullTypecheck", "fullLint", "webpackProductionBuild", "turbopackProductionBuild"];
  check(required.every((gate) => receipt?.gates?.[gate] === true), "required_gates");
  check(receipt?.gates?.exactWindows === false, "exact_windows_gate");
  check(receipt?.summary?.pass === true, "summary_pass");
  check(receipt?.summary?.passedRequiredGates === required.length && receipt?.summary?.requiredGateDenominator === required.length, "summary_denominator");
  check(receipt?.runtime?.nodeVersion === EXPECTED_NODE && receipt?.runtime?.npmVersion === EXPECTED_NPM, "runtime_versions");
  check(SHA256.test(receipt?.runtime?.nodeExecutable?.sha256 ?? "") && SHA256.test(receipt?.runtime?.npmCli?.sha256 ?? ""), "runtime_hashes");
  check(SHA256.test(receipt?.runtime?.packageLock?.sha256 ?? ""), "lock_hash");
  check(SHA256.test(receipt?.sourceIdentity?.sourceAggregateSha256 ?? ""), "source_aggregate");
  check(receipt?.denominators?.dependencyTree?.problems === 0, "npm_ls");
  check(receipt?.denominators?.typeScript?.diagnostics === 0, "typescript");
  check(receipt?.denominators?.eslint?.errors === 0 && receipt?.denominators?.eslint?.warnings === 0 && receipt?.denominators?.eslint?.processFailures === 0, "eslint");
  check(receipt?.buildOutputs?.webpack?.buildId === receipt?.denominators?.webpack?.buildId, "webpack_build_id");
  check(receipt?.buildOutputs?.turbopack?.buildId === receipt?.denominators?.turbopack?.buildId, "turbopack_build_id");
  check(receipt?.creditBoundary?.exactWindows === false
    && receipt?.creditBoundary?.staging === false
    && receipt?.creditBoundary?.externalEvidence === false
    && receipt?.creditBoundary?.paidRelease === false
    && receipt?.creditBoundary?.live === false
    && receipt?.creditBoundary?.worldClass === false, "credit_boundary");
  return { ok: errors.length === 0, errors };
}

function parseArgs(argv) {
  const values = {};
  for (const arg of argv) {
    invariant(arg.startsWith("--") && arg.includes("="), "cli_argument", arg);
    const [name, ...rest] = arg.slice(2).split("=");
    invariant(name.length > 0 && rest.length > 0, "cli_argument", arg);
    values[name] = rest.join("=");
  }
  return values;
}

function requiredArg(args, name, fallback = null) {
  const value = args[name] ?? fallback;
  invariant(typeof value === "string" && value.length > 0, "cli_required", name);
  return value;
}

function rejectUnsafeOutput(outputPath) {
  if (!fs.existsSync(outputPath)) return;
  const stat = fs.lstatSync(outputPath);
  invariant(stat.isFile() && !stat.isSymbolicLink(), "output_regular_file_required");
}

export function writeP36CurrentByteBuildGates(outputPath, receipt) {
  const result = validateP36CurrentByteBuildGates(receipt);
  invariant(result.ok, "output_validation", result.errors);
  rejectUnsafeOutput(outputPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporary = `${outputPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, outputPath);
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const root = path.resolve(args.root ?? ROOT);
  const output = resolvePath(root, args.output ?? OUTPUT_PATH);
  const paths = {
    sourceIdentity: requiredArg(args, "source-identity", "artifacts/closure/p36/source-identity.json"),
    node: requiredArg(args, "node"),
    npmCli: requiredArg(args, "npm-cli"),
    packageJson: args["package-json"] ?? "package.json",
    packageLock: args["package-lock"] ?? "package-lock.json",
    npmCiLog: requiredArg(args, "npm-ci-log"),
    npmLsReceipt: requiredArg(args, "npm-ls-receipt"),
    trustedNativeLog: requiredArg(args, "trusted-native-log"),
    typeScriptReceipt: requiredArg(args, "typescript-receipt"),
    typeScriptLog: requiredArg(args, "typescript-log"),
    eslintReceipt: requiredArg(args, "eslint-receipt"),
    eslintLog: requiredArg(args, "eslint-log"),
    webpackReceipt: requiredArg(args, "webpack-receipt"),
    webpackLog: requiredArg(args, "webpack-log"),
    webpackPostLockReceipt: requiredArg(args, "webpack-post-lock-receipt"),
    turbopackReceipt: requiredArg(args, "turbopack-receipt"),
    turbopackLog: requiredArg(args, "turbopack-log"),
    turbopackPostLockReceipt: requiredArg(args, "turbopack-post-lock-receipt"),
  };
  const receipt = buildP36CurrentByteBuildGates({ root, paths });
  writeP36CurrentByteBuildGates(output, receipt);
  process.stdout.write(`${JSON.stringify({
    status: "PASS_P36_CURRENT_BYTE_BUILD_GATES",
    output: displayPath(root, output),
    sourceAggregateSha256: receipt.sourceIdentity.sourceAggregateSha256,
    gates: receipt.gates,
    summary: receipt.summary,
    integritySha256: receipt.integritySha256,
  })}\n`);
  return receipt;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
