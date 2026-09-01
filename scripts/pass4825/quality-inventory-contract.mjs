import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { attachChecksum, sha256Bytes, verifyChecksum } from "./build-output-contract.mjs";

const LINT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const LINT_ALWAYS_IGNORED_DIRECTORIES = new Set([".git", "node_modules"]);
const LINT_ROOT_IGNORED_DIRECTORIES = new Set([
  ".next", ".velmere", "artifacts", "archive", "coverage", "out", "build",
]);

export function isLintIgnoredDirectory(name, prefix = "") {
  return LINT_ALWAYS_IGNORED_DIRECTORIES.has(name)
    || (prefix === "" && LINT_ROOT_IGNORED_DIRECTORIES.has(name));
}

function relativeInside(root, candidate, code) {
  const absoluteRoot = path.resolve(root);
  const absolute = path.resolve(candidate);
  const relative = path.relative(absoluteRoot, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${code}_outside_root`);
  return { absolute, relative: relative.split(path.sep).join("/") };
}

async function collectLintFiles(root, directory = root, prefix = "") {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  for (const entry of entries) {
    if (entry.isDirectory() && isLintIgnoredDirectory(entry.name, prefix)) continue;
    const absolute = path.join(directory, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`lint_input_symlink_forbidden:${relative}`);
    if (entry.isDirectory()) files.push(...await collectLintFiles(root, absolute, relative));
    else if (entry.isFile()
      && LINT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      && relative !== "next-env.d.ts") files.push({ absolute, relative });
  }
  return files;
}

export async function createLintInputManifest(root) {
  const files = await collectLintFiles(path.resolve(root));
  files.sort((left, right) => left.relative.localeCompare(right.relative, "en"));
  if (!files.length) throw new Error("lint_input_manifest_empty");
  const entries = [];
  let byteLength = 0;
  for (const file of files) {
    const bytes = await readFile(file.absolute);
    byteLength += bytes.byteLength;
    entries.push({ path: file.relative, byteLength: bytes.byteLength, checksumSha256: sha256Bytes(bytes) });
  }
  return {
    schemaVersion: "velmere.pass4825.eslint-input-manifest.v1",
    fileCount: entries.length,
    byteLength,
    aggregateChecksumSha256: sha256Bytes(JSON.stringify(entries)),
    entries,
  };
}

function sameManifest(left, right) {
  return left?.schemaVersion === right?.schemaVersion
    && left?.fileCount === right?.fileCount
    && left?.byteLength === right?.byteLength
    && left?.aggregateChecksumSha256 === right?.aggregateChecksumSha256
    && JSON.stringify(left?.entries) === JSON.stringify(right?.entries);
}

export async function validateEslintResults({ root, results, inputManifest }) {
  if (!Array.isArray(results) || results.length === 0) throw new Error("eslint_results_empty_or_invalid");
  if (!inputManifest || !Array.isArray(inputManifest.entries) || inputManifest.entries.length === 0) {
    throw new Error("eslint_input_manifest_empty_or_invalid");
  }
  const expected = new Map(inputManifest.entries.map((entry) => [entry.path, entry]));
  if (expected.size !== inputManifest.entries.length) throw new Error("eslint_input_manifest_duplicate_path");
  if (inputManifest.fileCount !== inputManifest.entries.length) throw new Error("eslint_input_manifest_count_mismatch");
  const seen = new Set();
  const seenLower = new Set();
  let sourceBearingResultCount = 0;
  let suppressedMessageCount = 0;
  for (const result of results) {
    if (!result || typeof result !== "object" || typeof result.filePath !== "string") {
      throw new Error("eslint_result_file_path_missing");
    }
    const resolved = relativeInside(root, result.filePath, "eslint_result");
    const lower = resolved.relative.toLowerCase();
    if (seenLower.has(lower)) throw new Error(`eslint_result_duplicate_path:${resolved.relative}`);
    seen.add(resolved.relative);
    seenLower.add(lower);
    const expectedEntry = expected.get(resolved.relative);
    if (!expectedEntry) throw new Error(`eslint_result_unexpected_path:${resolved.relative}`);
    const fileStats = await lstat(resolved.absolute).catch(() => null);
    if (!fileStats?.isFile() || fileStats.isSymbolicLink()) throw new Error(`eslint_result_file_missing_or_invalid:${resolved.relative}`);
    const currentBytes = await readFile(resolved.absolute);
    if (currentBytes.byteLength !== expectedEntry.byteLength
      || sha256Bytes(currentBytes) !== expectedEntry.checksumSha256) {
      throw new Error(`eslint_result_current_bytes_mismatch:${resolved.relative}`);
    }
    if (Object.hasOwn(result, "source") && result.source !== null) {
      if (typeof result.source !== "string" || sha256Bytes(result.source) !== expectedEntry.checksumSha256) {
        throw new Error(`eslint_result_embedded_source_mismatch:${resolved.relative}`);
      }
      sourceBearingResultCount += 1;
    }
    if (!Array.isArray(result.messages) || !Array.isArray(result.suppressedMessages || [])) {
      throw new Error(`eslint_result_messages_invalid:${resolved.relative}`);
    }
    const computedErrors = result.messages.filter((message) => message?.severity === 2).length;
    const computedWarnings = result.messages.filter((message) => message?.severity === 1).length;
    if (result.errorCount !== computedErrors || result.warningCount !== computedWarnings) {
      throw new Error(`eslint_result_declared_counts_mismatch:${resolved.relative}`);
    }
    suppressedMessageCount += (result.suppressedMessages || []).length;
  }
  if (seen.size !== expected.size || results.length !== expected.size) {
    const missing = [...expected.keys()].filter((relative) => !seen.has(relative));
    throw new Error(`eslint_results_incomplete:${seen.size}/${expected.size}:${missing.slice(0, 5).join(",")}`);
  }
  return {
    resultCount: results.length,
    uniquePathCount: seen.size,
    expectedPathCount: expected.size,
    sourceBearingResultCount,
    suppressedMessageCount,
    complete: true,
  };
}

export function createLintEvidenceEnvelope({ sourceTree, inputManifest, results, eslintExitCode }) {
  if (!Array.isArray(results) || results.length === 0) throw new Error("eslint_results_empty_or_invalid");
  return attachChecksum({
    schemaVersion: "velmere.pass4825.eslint-source-bound-evidence.v1",
    evidenceClass: "local_checksum_not_signature",
    createdAt: new Date().toISOString(),
    sourceTree: {
      schemaVersion: sourceTree.schemaVersion,
      sha256: sourceTree.sha256,
      fileCount: sourceTree.fileCount,
      totalBytes: sourceTree.totalBytes,
    },
    inputManifest,
    eslintExitCode,
    results,
  });
}

export async function validateLintEvidenceEnvelope({ root, envelope, currentSourceTree }) {
  verifyChecksum(envelope, "eslint_evidence");
  if (envelope.schemaVersion !== "velmere.pass4825.eslint-source-bound-evidence.v1") {
    throw new Error("eslint_evidence_schema_mismatch");
  }
  if (envelope.sourceTree?.schemaVersion !== currentSourceTree.schemaVersion
    || envelope.sourceTree?.sha256 !== currentSourceTree.sha256
    || envelope.sourceTree?.fileCount !== currentSourceTree.fileCount
    || envelope.sourceTree?.totalBytes !== currentSourceTree.totalBytes) {
    throw new Error("eslint_evidence_source_tree_mismatch");
  }
  const currentManifest = await createLintInputManifest(root);
  if (!sameManifest(envelope.inputManifest, currentManifest)) throw new Error("eslint_evidence_input_manifest_mismatch");
  const completeness = await validateEslintResults({ root, results: envelope.results, inputManifest: currentManifest });
  if (envelope.eslintExitCode !== 0 && envelope.eslintExitCode !== 1) throw new Error("eslint_evidence_exit_code_invalid");
  return { results: envelope.results, inputManifest: currentManifest, completeness };
}
