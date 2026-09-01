#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  canonicalJson,
  fixedExclusionReason,
  normalizeArchivePath,
  parseDeterministicZip,
  sha256,
  writeDeterministicZip,
} from "../pass4826/release-package-contract.mjs";

export const REVISION_ID =
  "VELMERE_PASS36_A102R9_ACTION_REQUIRED_SYSTEM_CLIPBOARD_PRIVATE_ACCOUNT_DOWNLOAD_SESSION_ADMIN_SUPPORT_EXPORT_REDACTION_FAIL_CLOSED_NO_REAL_CREDIT";
export const PARENT_REVISION_ID =
  "VELMERE_PASS36_A102R8_ACTION_REQUIRED_CHECKOUT_PII_AUDIT_CASE_AND_PDF_ACTIVITY_BROWSER_PERSISTENCE_FAIL_CLOSED_NO_REAL_CREDIT";
export const NORMALIZED_TIMESTAMP = "1980-01-01T00:00:00.000Z";
export const SOURCE_MANIFEST_PATH =
  "_velmere/PASS36_A102R9_SOURCE_ONLY_MANIFEST.json";
export const MATERIALS_MANIFEST_PATH =
  "MANIFESTS/PASS36_A102R9_MATERIALS_MANIFEST.json";
export const SOURCE_MANIFEST_SCHEMA =
  "velmere.pass36.a102r9.source-only-package-manifest.v1";
export const MATERIALS_MANIFEST_SCHEMA =
  "velmere.pass36.a102r9.materials-package-manifest.v1";

const IMMUTABLE_LOG =
  "fixtures/pass35/a42/windows-global-json-crash.log";
const ALLOWED_MODES = new Set([0o100644, 0o100755]);
const DIGEST = /^[a-f0-9]{64}$/u;
const RAW_COMPARE = (left, right) =>
  left < right ? -1 : left > right ? 1 : 0;
const SOURCE_TOP_LEVEL_EXCLUSIONS = new Set([
  ".git",
  ".velmere",
  ".next",
  ".turbo",
  "_velmere",
  "artifacts",
  "coverage",
  "node_modules",
  "dist",
  "out",
  ".cache",
  "cache",
]);
const SOURCE_ANY_LEVEL_EXCLUSIONS = new Set([
  ".git",
  ".next",
  "node_modules",
]);
const ENTRY_KEYS = ["path", "byteLength", "sha256", "mode"];
const COMMON_MANIFEST_KEYS = [
  "schemaVersion",
  "revisionId",
  "parentRevisionId",
  "normalizedTimestamp",
  "fileCount",
  "byteLength",
  "pathSetSha256",
  "aggregateSha256",
  "entries",
  "manifestPath",
  "manifestExcludedFromOwnInventory",
  "checkpointClass",
  "completedThrough",
  "a90ToA102PassCredit",
  "exactReleaseCredit",
  "globalDecision",
  "live",
  "saleEnabled",
  "productionApproved",
  "worldClassProven",
  "manifestSha256",
];

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return (
    isRecord(value)
    && JSON.stringify(Object.keys(value).sort(RAW_COMPARE))
      === JSON.stringify([...expected].sort(RAW_COMPARE))
  );
}

function pathHasNoControlCharacters(value) {
  return [...value].every((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint >= 0x20 && codePoint !== 0x7f;
  });
}

export function validatePortableArchivePath(value) {
  normalizeArchivePath(value);
  invariant(
    pathHasNoControlCharacters(value),
    `a102r9_archive_path_control_character:${JSON.stringify(value)}`,
  );
  return value;
}

function caseFoldKey(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replaceAll("ß", "ss")
    .replaceAll("ς", "σ");
}

function separatorKey(value) {
  return value.replaceAll("\\", "/").replace(/\/+/gu, "/");
}

export function validatePortablePathSet(paths) {
  const transforms = [
    ["raw", (value) => value],
    ["nfkc", (value) => value.normalize("NFKC")],
    ["casefold", caseFoldKey],
    ["separator", separatorKey],
  ];
  for (const entryPath of paths) validatePortableArchivePath(entryPath);
  for (const [label, transform] of transforms) {
    const seen = new Map();
    for (const entryPath of paths) {
      const key = transform(entryPath);
      invariant(
        !seen.has(key),
        `a102r9_${label}_path_collision:${seen.get(key)}:${entryPath}`,
      );
      seen.set(key, entryPath);
    }
  }
}

export function sourceExclusionReason(relativePath) {
  const segments = relativePath.split("/");
  const top = segments[0];
  const base = segments.at(-1) ?? "";
  if (
    SOURCE_TOP_LEVEL_EXCLUSIONS.has(top)
    || top.startsWith(".next-")
  ) {
    return `top-level:${top}`;
  }
  const excludedSegment = segments.find((segment) =>
    SOURCE_ANY_LEVEL_EXCLUSIONS.has(segment));
  if (excludedSegment) return `segment:${excludedSegment}`;
  if (segments.includes("__pycache__") || base.endsWith(".pyc")) {
    return "python-cache";
  }
  if (base === ".env" || base.startsWith(".env.")) {
    return "environment-file";
  }
  if (base === ".eslintcache" || base.endsWith(".tsbuildinfo")) {
    return "tool-cache";
  }
  if (/^tsconfig\.tmp.*\.json$/u.test(base)) {
    return "temporary-tsconfig";
  }
  if (base.endsWith(".log") && relativePath !== IMMUTABLE_LOG) {
    return "runtime-log";
  }
  if (/\.(?:db|sqlite|sqlite3)$/iu.test(base)) {
    return "runtime-database";
  }
  return null;
}

function modeFor(metadata) {
  return metadata.mode & 0o111 ? 0o100755 : 0o100644;
}

function assertRegularDirectory(root) {
  const metadata = fs.lstatSync(root);
  invariant(metadata.isDirectory(), `a102r9_root_not_directory:${root}`);
  invariant(!metadata.isSymbolicLink(), `a102r9_root_symlink_forbidden:${root}`);
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return (
    relative === ""
    || (
      relative !== ".."
      && !relative.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relative)
    )
  );
}

function projectedRealPath(targetPath) {
  let cursor = path.resolve(targetPath);
  const suffix = [];
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    invariant(parent !== cursor, `a102r9_output_ancestor_missing:${targetPath}`);
    suffix.unshift(path.basename(cursor));
    cursor = parent;
  }
  return path.resolve(fs.realpathSync(cursor), ...suffix);
}

function assertOutputOutsideRoot(root, output) {
  const realRoot = fs.realpathSync(root);
  const resolvedOutput = path.resolve(output);
  const projectedOutput = projectedRealPath(resolvedOutput);
  invariant(
    !isInside(realRoot, resolvedOutput) && !isInside(realRoot, projectedOutput),
    `a102r9_output_inside_input_root:${resolvedOutput}`,
  );
}

export function collectA102R9Inventory(rootPath, kind) {
  invariant(
    kind === "source" || kind === "materials",
    `a102r9_package_kind_invalid:${kind}`,
  );
  const root = path.resolve(rootPath);
  assertRegularDirectory(root);
  const manifestPath =
    kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH;
  const rows = [];

  function walk(directory, prefix = "") {
    const directoryEntries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => RAW_COMPARE(left.name, right.name));
    for (const directoryEntry of directoryEntries) {
      const relativePath = prefix
        ? `${prefix}/${directoryEntry.name}`
        : directoryEntry.name;
      const absolutePath = path.join(directory, directoryEntry.name);

      if (kind === "source" && sourceExclusionReason(relativePath)) {
        continue;
      }

      if (relativePath === manifestPath) {
        const metadata = fs.lstatSync(absolutePath);
        invariant(
          metadata.isFile() && !metadata.isSymbolicLink(),
          `a102r9_reserved_manifest_not_regular:${relativePath}`,
        );
        invariant(
          metadata.nlink === 1,
          `a102r9_hardlink_forbidden:${relativePath}`,
        );
        continue;
      }

      const metadata = fs.lstatSync(absolutePath);
      invariant(
        !metadata.isSymbolicLink(),
        `a102r9_symlink_forbidden:${relativePath}`,
      );
      if (metadata.isDirectory()) {
        validatePortableArchivePath(relativePath);
        if (
          kind === "materials"
          && fixedExclusionReason(relativePath) !== null
        ) {
          throw new Error(`a102r9_materials_forbidden_path:${relativePath}`);
        }
        walk(absolutePath, relativePath);
        continue;
      }
      invariant(
        metadata.isFile(),
        `a102r9_special_file_forbidden:${relativePath}`,
      );
      invariant(
        metadata.nlink === 1,
        `a102r9_hardlink_forbidden:${relativePath}`,
      );
      validatePortableArchivePath(relativePath);
      if (
        kind === "materials"
        && fixedExclusionReason(relativePath) !== null
      ) {
        throw new Error(`a102r9_materials_forbidden_path:${relativePath}`);
      }
      const content = fs.readFileSync(absolutePath);
      rows.push({
        path: relativePath,
        byteLength: content.length,
        sha256: sha256(content),
        mode: modeFor(metadata),
        content,
      });
    }
  }

  walk(root);
  rows.sort((left, right) => RAW_COMPARE(left.path, right.path));
  invariant(rows.length > 0, `a102r9_${kind}_inventory_empty`);
  validatePortablePathSet(rows.map((row) => row.path));
  return { root, rows };
}

export function inventoryFields(rows) {
  const entries = rows.map((row) => ({
    path: row.path,
    byteLength: row.byteLength,
    sha256: row.sha256,
    mode: row.mode,
  }));
  return {
    entries,
    fileCount: entries.length,
    byteLength: entries.reduce(
      (total, entry) => total + entry.byteLength,
      0,
    ),
    pathSetSha256: sha256(entries.map((entry) => entry.path).join("\n")),
    aggregateSha256: sha256(
      entries
        .map(
          (entry) =>
            `${entry.path}\0${entry.byteLength}\0${entry.sha256}\0${entry.mode}`,
        )
        .join("\n"),
    ),
  };
}

function truthCore(kind, inventory, sourceArchiveBinding) {
  const manifestPath =
    kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH;
  const schemaVersion =
    kind === "source" ? SOURCE_MANIFEST_SCHEMA : MATERIALS_MANIFEST_SCHEMA;
  const core = {
    schemaVersion,
    revisionId: REVISION_ID,
    parentRevisionId: PARENT_REVISION_ID,
    normalizedTimestamp: NORMALIZED_TIMESTAMP,
    fileCount: inventory.fileCount,
    byteLength: inventory.byteLength,
    pathSetSha256: inventory.pathSetSha256,
    aggregateSha256: inventory.aggregateSha256,
    entries: inventory.entries,
    manifestPath,
    manifestExcludedFromOwnInventory: true,
    checkpointClass: "ACTION_REQUIRED_NON_PASS",
    completedThrough: 89,
    a90ToA102PassCredit: false,
    exactReleaseCredit: false,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
  if (kind === "materials") {
    core.sourceArchiveBinding = sourceArchiveBinding;
  }
  return core;
}

export function buildA102R9Manifest(
  kind,
  inventory,
  sourceArchiveBinding = null,
) {
  if (kind === "source") {
    invariant(
      sourceArchiveBinding === null,
      "a102r9_source_manifest_binding_forbidden",
    );
  } else {
    invariant(
      exactKeys(sourceArchiveBinding, ["fileName", "byteLength", "sha256"]),
      "a102r9_materials_source_binding_shape",
    );
  }
  const core = truthCore(kind, inventory, sourceArchiveBinding);
  return {
    ...core,
    manifestSha256: sha256(canonicalJson(core)),
  };
}

function parseManifestEntry(entry, kind) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(entry.content);
    const manifest = JSON.parse(text);
    invariant(isRecord(manifest), `a102r9_${kind}_manifest_not_object`);
    return manifest;
  } catch (error) {
    if (
      error instanceof Error
      && error.message.startsWith(`a102r9_${kind}_manifest_`)
    ) {
      throw error;
    }
    throw new Error(
      `a102r9_${kind}_manifest_parse:${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
}

function validateManifestShape(manifest, kind) {
  const manifestPath =
    kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH;
  const schemaVersion =
    kind === "source" ? SOURCE_MANIFEST_SCHEMA : MATERIALS_MANIFEST_SCHEMA;
  const expectedKeys =
    kind === "source"
      ? COMMON_MANIFEST_KEYS
      : [...COMMON_MANIFEST_KEYS, "sourceArchiveBinding"];
  invariant(
    exactKeys(manifest, expectedKeys),
    `a102r9_${kind}_manifest_top_level_fields`,
  );
  invariant(
    manifest.schemaVersion === schemaVersion,
    `a102r9_${kind}_manifest_schema`,
  );
  invariant(
    manifest.revisionId === REVISION_ID,
    `a102r9_${kind}_manifest_revision`,
  );
  invariant(
    manifest.parentRevisionId === PARENT_REVISION_ID,
    `a102r9_${kind}_manifest_parent`,
  );
  invariant(
    manifest.normalizedTimestamp === NORMALIZED_TIMESTAMP,
    `a102r9_${kind}_manifest_timestamp`,
  );
  invariant(
    manifest.manifestPath === manifestPath
      && manifest.manifestExcludedFromOwnInventory === true,
    `a102r9_${kind}_manifest_self_boundary`,
  );
  invariant(
    manifest.checkpointClass === "ACTION_REQUIRED_NON_PASS"
      && manifest.completedThrough === 89
      && manifest.a90ToA102PassCredit === false
      && manifest.exactReleaseCredit === false
      && manifest.globalDecision === "NO_GO"
      && manifest.live === false
      && manifest.saleEnabled === false
      && manifest.productionApproved === false
      && manifest.worldClassProven === false,
    `a102r9_${kind}_manifest_truth_boundary`,
  );
  invariant(
    typeof manifest.manifestSha256 === "string"
      && DIGEST.test(manifest.manifestSha256),
    `a102r9_${kind}_manifest_digest_shape`,
  );
  const core = { ...manifest };
  delete core.manifestSha256;
  invariant(
    manifest.manifestSha256 === sha256(canonicalJson(core)),
    `a102r9_${kind}_manifest_self_hash`,
  );
  invariant(
    Array.isArray(manifest.entries),
    `a102r9_${kind}_manifest_entries_array`,
  );
  invariant(
    Number.isSafeInteger(manifest.fileCount) && manifest.fileCount > 0,
    `a102r9_${kind}_manifest_file_count_shape`,
  );
  invariant(
    Number.isSafeInteger(manifest.byteLength) && manifest.byteLength >= 0,
    `a102r9_${kind}_manifest_byte_length_shape`,
  );

  for (const entry of manifest.entries) {
    invariant(
      exactKeys(entry, ENTRY_KEYS),
      `a102r9_${kind}_manifest_entry_fields`,
    );
    validatePortableArchivePath(entry.path);
    invariant(
      entry.path !== manifestPath,
      `a102r9_${kind}_manifest_self_entry`,
    );
    invariant(
      Number.isSafeInteger(entry.byteLength) && entry.byteLength >= 0,
      `a102r9_${kind}_manifest_entry_length:${entry.path}`,
    );
    invariant(
      typeof entry.sha256 === "string" && DIGEST.test(entry.sha256),
      `a102r9_${kind}_manifest_entry_digest:${entry.path}`,
    );
    invariant(
      Number.isSafeInteger(entry.mode) && ALLOWED_MODES.has(entry.mode),
      `a102r9_${kind}_manifest_entry_mode:${entry.path}`,
    );
    if (kind === "source") {
      invariant(
        sourceExclusionReason(entry.path) === null,
        `a102r9_source_manifest_hygiene:${entry.path}`,
      );
    }
  }
  const declaredPaths = manifest.entries.map((entry) => entry.path);
  validatePortablePathSet([...declaredPaths, manifestPath]);
  invariant(
    JSON.stringify(declaredPaths)
      === JSON.stringify([...declaredPaths].sort(RAW_COMPARE)),
    `a102r9_${kind}_manifest_entry_order`,
  );
  invariant(
    manifest.fileCount === manifest.entries.length,
    `a102r9_${kind}_manifest_file_count`,
  );
  invariant(
    manifest.byteLength
      === manifest.entries.reduce(
        (total, entry) => total + entry.byteLength,
        0,
      ),
    `a102r9_${kind}_manifest_byte_length`,
  );
  invariant(
    manifest.pathSetSha256
      === sha256(manifest.entries.map((entry) => entry.path).join("\n")),
    `a102r9_${kind}_manifest_path_set`,
  );
  invariant(
    manifest.aggregateSha256
      === sha256(
        manifest.entries
          .map(
            (entry) =>
              `${entry.path}\0${entry.byteLength}\0${entry.sha256}\0${entry.mode}`,
          )
          .join("\n"),
      ),
    `a102r9_${kind}_manifest_aggregate`,
  );

  if (kind === "materials") {
    const binding = manifest.sourceArchiveBinding;
    invariant(
      exactKeys(binding, ["fileName", "byteLength", "sha256"]),
      "a102r9_materials_source_binding_fields",
    );
    validatePortableArchivePath(binding.fileName);
    invariant(
      !binding.fileName.includes("/"),
      "a102r9_materials_source_binding_filename",
    );
    invariant(
      Number.isSafeInteger(binding.byteLength) && binding.byteLength > 0,
      "a102r9_materials_source_binding_bytes",
    );
    invariant(
      typeof binding.sha256 === "string" && DIGEST.test(binding.sha256),
      "a102r9_materials_source_binding_digest",
    );
  }
}

export function validateA102R9ParsedArchive(
  parsed,
  kind,
  expectedSourceArchive = null,
) {
  invariant(
    kind === "source" || kind === "materials",
    `a102r9_archive_kind_invalid:${kind}`,
  );
  const manifestPath =
    kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH;
  const archivePaths = parsed.entries.map((entry) => entry.path);
  validatePortablePathSet(archivePaths);
  const manifestEntries = parsed.entries.filter(
    (entry) => entry.path === manifestPath,
  );
  invariant(
    manifestEntries.length === 1,
    `a102r9_${kind}_archive_manifest_count`,
  );
  invariant(
    manifestEntries[0].mode === 0o100644,
    `a102r9_${kind}_archive_manifest_mode`,
  );
  const manifest = parseManifestEntry(manifestEntries[0], kind);
  validateManifestShape(manifest, kind);

  const payload = parsed.entries.filter(
    (entry) => entry.path !== manifestPath,
  );
  const observedRows = payload.map((entry) => ({
    path: entry.path,
    byteLength: entry.byteLength,
    sha256: entry.sha256,
    mode: entry.mode,
  }));
  invariant(
    canonicalJson(observedRows) === canonicalJson(manifest.entries),
    `a102r9_${kind}_archive_payload_manifest_mismatch`,
  );
  if (kind === "source") {
    for (const entry of payload) {
      invariant(
        sourceExclusionReason(entry.path) === null,
        `a102r9_source_archive_hygiene:${entry.path}`,
      );
    }
  }
  if (kind === "materials" && expectedSourceArchive !== null) {
    invariant(
      canonicalJson(manifest.sourceArchiveBinding)
        === canonicalJson(expectedSourceArchive),
      "a102r9_materials_source_archive_binding_mismatch",
    );
  }
  return {
    manifest,
    manifestFileSha256: manifestEntries[0].sha256,
    payloadFileCount: payload.length,
    payloadByteLength: payload.reduce(
      (total, entry) => total + entry.byteLength,
      0,
    ),
  };
}

function assertRegularArchive(archivePath, label) {
  const metadata = fs.lstatSync(archivePath);
  invariant(
    metadata.isFile() && !metadata.isSymbolicLink(),
    `a102r9_${label}_archive_not_regular:${archivePath}`,
  );
}

export function sourceArchiveIdentity(sourceZipPath) {
  const sourceZip = path.resolve(sourceZipPath);
  assertRegularArchive(sourceZip, "source");
  const fileName = path.basename(sourceZip);
  validatePortableArchivePath(fileName);
  invariant(
    !fileName.includes("/"),
    "a102r9_source_archive_filename_invalid",
  );
  const parsed = parseDeterministicZip(sourceZip);
  validateA102R9ParsedArchive(parsed, "source");
  return {
    fileName,
    byteLength: parsed.byteLength,
    sha256: parsed.archiveSha256,
  };
}

function parseArguments(argv) {
  const values = new Map();
  let overwrite = false;
  const valueOptions = new Set([
    "--kind",
    "--root",
    "--output",
    "--source-zip",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--overwrite") {
      invariant(!overwrite, "a102r9_argument_duplicate:--overwrite");
      overwrite = true;
      continue;
    }
    invariant(valueOptions.has(token), `a102r9_argument_unknown:${token}`);
    invariant(!values.has(token), `a102r9_argument_duplicate:${token}`);
    const value = argv[index + 1];
    invariant(
      typeof value === "string" && value.length > 0 && !value.startsWith("--"),
      `a102r9_argument_value_missing:${token}`,
    );
    values.set(token, value);
    index += 1;
  }
  for (const required of ["--kind", "--root", "--output"]) {
    invariant(values.has(required), `a102r9_argument_required:${required}`);
  }
  const kind = values.get("--kind");
  invariant(
    kind === "source" || kind === "materials",
    `a102r9_argument_kind:${kind}`,
  );
  const sourceZip = values.get("--source-zip") ?? null;
  invariant(
    kind === "materials" ? sourceZip !== null : sourceZip === null,
    kind === "materials"
      ? "a102r9_materials_source_zip_required"
      : "a102r9_source_source_zip_forbidden",
  );
  return {
    kind,
    root: path.resolve(values.get("--root")),
    output: path.resolve(values.get("--output")),
    sourceZip: sourceZip === null ? null : path.resolve(sourceZip),
    overwrite,
  };
}

function inventoriesEqual(left, right) {
  return (
    left.fileCount === right.fileCount
    && left.byteLength === right.byteLength
    && left.pathSetSha256 === right.pathSetSha256
    && left.aggregateSha256 === right.aggregateSha256
    && canonicalJson(left.entries) === canonicalJson(right.entries)
  );
}

export function packageA102R9(options) {
  assertOutputOutsideRoot(options.root, options.output);
  if (options.sourceZip !== null) {
    invariant(
      options.sourceZip !== options.output,
      "a102r9_source_archive_output_collision",
    );
  }
  const beforeRows = collectA102R9Inventory(options.root, options.kind);
  const before = inventoryFields(beforeRows.rows);
  const binding =
    options.kind === "materials"
      ? sourceArchiveIdentity(options.sourceZip)
      : null;
  const manifest = buildA102R9Manifest(options.kind, before, binding);
  const manifestPath =
    options.kind === "source"
      ? SOURCE_MANIFEST_PATH
      : MATERIALS_MANIFEST_PATH;
  const manifestContent = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  const archiveEntries = [
    ...beforeRows.rows.map((row) => ({
      path: row.path,
      content: row.content,
      mode: row.mode,
    })),
    {
      path: manifestPath,
      content: manifestContent,
      mode: 0o100644,
    },
  ];
  validatePortablePathSet(archiveEntries.map((entry) => entry.path));
  const archive = writeDeterministicZip(
    options.output,
    archiveEntries,
    { overwrite: options.overwrite },
  );
  const parsed = parseDeterministicZip(options.output);
  const verified = validateA102R9ParsedArchive(
    parsed,
    options.kind,
    binding,
  );
  invariant(
    archive.sha256 === parsed.archiveSha256
      && archive.byteLength === parsed.byteLength
      && archive.entryCount === parsed.entries.length,
    "a102r9_archive_post_write_identity_mismatch",
  );
  invariant(
    verified.manifest.manifestSha256 === manifest.manifestSha256,
    "a102r9_archive_post_write_manifest_mismatch",
  );

  const afterRows = collectA102R9Inventory(options.root, options.kind);
  const after = inventoryFields(afterRows.rows);
  invariant(
    inventoriesEqual(before, after),
    "a102r9_input_root_changed_during_packaging",
  );

  return {
    schemaVersion: "velmere.pass36.a102r9.deterministic-package.v1",
    revisionId: REVISION_ID,
    status:
      options.kind === "source"
        ? "PASS_A102R9_DETERMINISTIC_SOURCE_PACKAGE_NO_PROMOTION"
        : "PASS_A102R9_DETERMINISTIC_MATERIALS_PACKAGE_NO_PROMOTION",
    kind: options.kind,
    inputRoot: options.root,
    inputRootUnchanged: true,
    output: options.output,
    fileName: path.basename(options.output),
    byteLength: archive.byteLength,
    sha256: archive.sha256,
    entries: archive.entryCount,
    manifestPath,
    manifestSha256: manifest.manifestSha256,
    manifestFileSha256: verified.manifestFileSha256,
    sourceArchiveBinding: binding,
    archiveFormat: "zip-store-v1",
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const result = packageA102R9(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        status: "FAIL_A102R9_DETERMINISTIC_PACKAGE",
        error: error instanceof Error ? error.message : String(error),
        globalDecision: "NO_GO",
        live: false,
        saleEnabled: false,
        productionApproved: false,
        worldClassProven: false,
      })}\n`,
    );
    process.exitCode = 1;
  }
}
