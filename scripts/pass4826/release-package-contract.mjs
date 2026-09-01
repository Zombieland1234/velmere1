import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import path from "node:path";

export const RELEASE_MANIFEST_SCHEMA = "velmere.pass4826.deterministic-release-manifest.v1";
export const RELEASE_PACKAGE_RECEIPT_SCHEMA = "velmere.pass4826.deterministic-release-package-receipt.v1";
export const RELEASE_VERIFICATION_SCHEMA = "velmere.pass4826.deterministic-release-verification.v1";
export const RELEASE_MANIFEST_PATH = "_velmere/PASS4826_RELEASE_MANIFEST.json";
export const NORMALIZED_ZIP_TIMESTAMP = "1980-01-01T00:00:00.000Z";

const FIXED_DOS_TIME = 0;
const FIXED_DOS_DATE = 0x21;
const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;
const VERSION_NEEDED = 20;
const VERSION_MADE_BY_UNIX = 0x0314;
const MAX_UINT16 = 0xffff;
const MAX_UINT32 = 0xffffffff;
const FIXED_EXCLUDED_DIRECTORY_NAMES = Object.freeze([".git", ".next", "node_modules"]);
const FIXED_EXCLUDED_FILE_PATTERNS = Object.freeze(["^tsconfig\\.tmp.*\\.json$"]);
const NORMALIZED_FILE_MODES = new Set([0o100644, 0o100755]);
const lexicalCompare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

export const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const isDigest = (value) => /^[a-f0-9]{64}$/u.test(String(value ?? ""));
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

export function normalizeArchivePath(value) {
  invariant(typeof value === "string" && value.length > 0, "release_path_invalid");
  invariant(!value.includes("\\"), `release_path_backslash:${value}`);
  invariant(!value.includes("\0"), `release_path_nul:${value}`);
  invariant(!value.startsWith("/"), `release_path_absolute:${value}`);
  invariant(!/^[a-zA-Z]:/u.test(value), `release_path_drive_absolute:${value}`);
  const normalized = path.posix.normalize(value);
  invariant(normalized === value, `release_path_not_normalized:${value}`);
  invariant(![".", ".."].includes(normalized), `release_path_dot:${value}`);
  invariant(!normalized.startsWith("../") && !normalized.includes("/../"), `release_path_traversal:${value}`);
  invariant(!normalized.endsWith("/"), `release_path_directory_entry:${value}`);
  return normalized;
}

export function fixedExclusionReason(relativePath) {
  const normalized = relativePath.replaceAll(path.sep, "/");
  const segments = normalized.split("/");
  const excludedDirectory = segments.find((segment) => FIXED_EXCLUDED_DIRECTORY_NAMES.includes(segment));
  if (excludedDirectory) return `directory:${excludedDirectory}`;
  const baseName = segments.at(-1) ?? "";
  if (/^tsconfig\.tmp.*\.json$/u.test(baseName)) return "file:tsconfig.tmp*.json";
  return null;
}

function normalizeDynamicExclusions(root, dynamicExcludedPaths) {
  const normalized = [];
  for (const value of dynamicExcludedPaths ?? []) {
    const absolute = path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);
    const relative = path.relative(root, absolute);
    if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) continue;
    normalized.push(normalizeArchivePath(relative.split(path.sep).join("/")));
  }
  return [...new Set(normalized)].sort();
}

export function collectReleaseInventory(rootPath, { dynamicExcludedPaths = [] } = {}) {
  const root = path.resolve(rootPath);
  invariant(statSync(root).isDirectory(), "release_source_root_not_directory");
  const dynamic = normalizeDynamicExclusions(root, dynamicExcludedPaths);
  const dynamicSet = new Set(dynamic);
  const files = [];
  const excluded = [];

  function walk(directory, prefix = "") {
    for (const directoryEntry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => lexicalCompare(left.name, right.name))) {
      const relativePath = prefix ? `${prefix}/${directoryEntry.name}` : directoryEntry.name;
      const absolutePath = path.join(directory, directoryEntry.name);
      const fixedReason = fixedExclusionReason(relativePath);
      const dynamicReason = dynamicSet.has(relativePath) ? "dynamic:generated-release-output" : null;
      if (fixedReason || dynamicReason) {
        excluded.push({ path: relativePath, type: directoryEntry.isDirectory() ? "directory" : "file", reason: fixedReason ?? dynamicReason });
        continue;
      }
      const metadata = lstatSync(absolutePath);
      invariant(!metadata.isSymbolicLink(), `release_symlink_forbidden:${relativePath}`);
      if (metadata.isDirectory()) {
        walk(absolutePath, relativePath);
        continue;
      }
      invariant(metadata.isFile(), `release_special_file_forbidden:${relativePath}`);
      normalizeArchivePath(relativePath);
      invariant(relativePath !== RELEASE_MANIFEST_PATH, `release_reserved_path_present:${relativePath}`);
      const content = readFileSync(absolutePath);
      const mode = (metadata.mode & 0o111) === 0 ? 0o100644 : 0o100755;
      files.push({ path: relativePath, byteLength: content.length, sha256: sha256(content), mode });
    }
  }

  walk(root);
  files.sort((left, right) => lexicalCompare(left.path, right.path));
  const pathSetSha256 = sha256(files.map((entry) => entry.path).join("\n"));
  const aggregateSha256 = sha256(canonicalJson(files));
  return {
    root,
    files,
    fileCount: files.length,
    byteLength: files.reduce((total, entry) => total + entry.byteLength, 0),
    pathSetSha256,
    aggregateSha256,
    dynamicExcludedPaths: dynamic,
    exclusionSummary: {
      excludedEntryCount: excluded.length,
      byReason: Object.fromEntries(
        [...new Set(excluded.map(({ reason }) => reason))].sort().map((reason) => [reason, excluded.filter((entry) => entry.reason === reason).length]),
      ),
      entries: excluded.sort((left, right) => lexicalCompare(left.path, right.path)),
    },
  };
}

export function buildReleaseManifest(inventory) {
  invariant(inventory.fileCount > 0, "release_inventory_empty");
  const core = {
    schemaVersion: RELEASE_MANIFEST_SCHEMA,
    archiveFormat: "zip-store-v1",
    normalizedArchiveTimestamp: NORMALIZED_ZIP_TIMESTAMP,
    payload: {
      fileCount: inventory.fileCount,
      byteLength: inventory.byteLength,
      pathSetSha256: inventory.pathSetSha256,
      aggregateSha256: inventory.aggregateSha256,
      entries: inventory.files,
    },
    sourceBinding: {
      scope: "complete_release_tree_except_fixed_and_generated-output_exclusions",
      completeReleaseTreeBound: true,
      sourceTreeAggregateSha256: inventory.aggregateSha256,
      sourcePathSetSha256: inventory.pathSetSha256,
    },
    exclusionPolicy: {
      fixedExcludedDirectoryNames: [...FIXED_EXCLUDED_DIRECTORY_NAMES],
      fixedExcludedFilePatterns: [...FIXED_EXCLUDED_FILE_PATTERNS],
      dynamicExcludedPaths: inventory.dynamicExcludedPaths,
      physicalArchiveAbsenceRequired: true,
      observed: inventory.exclusionSummary,
    },
    selfReferenceBoundary: {
      manifestPath: RELEASE_MANIFEST_PATH,
      manifestExcludedFromPayloadAggregate: true,
      completeArchiveBoundByExternalPackageReceipt: true,
    },
  };
  return { ...core, manifestSha256: sha256(canonicalJson(core)) };
}

function crc32Table() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
}

const CRC32_TABLE = crc32Table();
export function crc32(content) {
  let value = 0xffffffff;
  for (const byte of content) value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function validateZipEntry(entry) {
  normalizeArchivePath(entry.path);
  invariant(Buffer.isBuffer(entry.content), `release_zip_content_invalid:${entry.path}`);
  invariant(NORMALIZED_FILE_MODES.has(entry.mode), `release_zip_mode_invalid:${entry.path}`);
  invariant(entry.content.length <= MAX_UINT32, `release_zip_file_too_large:${entry.path}`);
}

function localHeader({ name, content, checksum }) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(VERSION_NEEDED, 4);
  header.writeUInt16LE(UTF8_FLAG, 6);
  header.writeUInt16LE(STORE_METHOD, 8);
  header.writeUInt16LE(FIXED_DOS_TIME, 10);
  header.writeUInt16LE(FIXED_DOS_DATE, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(content.length, 18);
  header.writeUInt32LE(content.length, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function centralHeader({ name, content, checksum, mode, localOffset }) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(VERSION_MADE_BY_UNIX, 4);
  header.writeUInt16LE(VERSION_NEEDED, 6);
  header.writeUInt16LE(UTF8_FLAG, 8);
  header.writeUInt16LE(STORE_METHOD, 10);
  header.writeUInt16LE(FIXED_DOS_TIME, 12);
  header.writeUInt16LE(FIXED_DOS_DATE, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(content.length, 20);
  header.writeUInt32LE(content.length, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE((mode << 16) >>> 0, 38);
  header.writeUInt32LE(localOffset, 42);
  return header;
}

function endOfCentralDirectory(entryCount, centralSize, centralOffset) {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(entryCount, 8);
  record.writeUInt16LE(entryCount, 10);
  record.writeUInt32LE(centralSize, 12);
  record.writeUInt32LE(centralOffset, 16);
  record.writeUInt16LE(0, 20);
  return record;
}

function writeAll(file, content) {
  let offset = 0;
  while (offset < content.length) offset += writeSync(file, content, offset, content.length - offset);
}

export function writeDeterministicZip(outputPath, entries, { overwrite = false } = {}) {
  invariant(Array.isArray(entries) && entries.length > 0, "release_zip_entries_empty");
  invariant(entries.length <= MAX_UINT16, "release_zip_entry_limit_exceeded");
  const ordered = [...entries].sort((left, right) => lexicalCompare(left.path, right.path));
  invariant(new Set(ordered.map(({ path: entryPath }) => entryPath)).size === ordered.length, "release_zip_duplicate_path");
  ordered.forEach(validateZipEntry);
  const absoluteOutput = path.resolve(outputPath);
  invariant(overwrite || !existsSync(absoluteOutput), `release_archive_already_exists:${absoluteOutput}`);
  mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  const temporary = `${absoluteOutput}.tmp-pass4826`;
  invariant(!existsSync(temporary), `release_archive_temporary_exists:${temporary}`);
  const file = openSync(temporary, "wx", 0o600);
  const central = [];
  let offset = 0;
  let completed = false;
  try {
    for (const entry of ordered) {
      const name = Buffer.from(entry.path, "utf8");
      invariant(name.length <= MAX_UINT16, `release_zip_name_too_long:${entry.path}`);
      const checksum = crc32(entry.content);
      const header = localHeader({ name, content: entry.content, checksum });
      invariant(offset + header.length + name.length + entry.content.length <= MAX_UINT32, "release_zip_offset_limit_exceeded");
      writeAll(file, header);
      writeAll(file, name);
      writeAll(file, entry.content);
      central.push({ ...entry, name, checksum, localOffset: offset });
      offset += header.length + name.length + entry.content.length;
    }
    const centralOffset = offset;
    for (const entry of central) {
      const header = centralHeader(entry);
      writeAll(file, header);
      writeAll(file, entry.name);
      offset += header.length + entry.name.length;
    }
    const centralSize = offset - centralOffset;
    invariant(offset + 22 <= MAX_UINT32, "release_zip_size_limit_exceeded");
    writeAll(file, endOfCentralDirectory(ordered.length, centralSize, centralOffset));
    offset += 22;
    completed = true;
  } finally {
    closeSync(file);
    if (!completed && existsSync(temporary)) unlinkSync(temporary);
  }
  renameSync(temporary, absoluteOutput);
  return { path: absoluteOutput, entryCount: ordered.length, byteLength: offset, sha256: sha256(readFileSync(absoluteOutput)) };
}

function assertArchivePathAllowed(entryPath) {
  normalizeArchivePath(entryPath);
  invariant(entryPath === RELEASE_MANIFEST_PATH || fixedExclusionReason(entryPath) === null, `release_archive_forbidden_entry:${entryPath}`);
}

export function parseDeterministicZipBytes(archiveBytes) {
  const archive = Buffer.from(archiveBytes);
  invariant(archive.length >= 22, "release_zip_too_small");
  const eocdOffset = archive.length - 22;
  invariant(archive.readUInt32LE(eocdOffset) === 0x06054b50, "release_zip_eocd_missing_or_not_terminal");
  invariant(archive.readUInt16LE(eocdOffset + 4) === 0 && archive.readUInt16LE(eocdOffset + 6) === 0, "release_zip_multidisk_forbidden");
  const diskEntries = archive.readUInt16LE(eocdOffset + 8);
  const totalEntries = archive.readUInt16LE(eocdOffset + 10);
  invariant(diskEntries === totalEntries && totalEntries > 0, "release_zip_entry_count_invalid");
  const centralSize = archive.readUInt32LE(eocdOffset + 12);
  const centralOffset = archive.readUInt32LE(eocdOffset + 16);
  invariant(archive.readUInt16LE(eocdOffset + 20) === 0, "release_zip_comment_forbidden");
  invariant(centralOffset + centralSize === eocdOffset, "release_zip_central_bounds_invalid");
  const entries = [];
  let cursor = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    invariant(cursor + 46 <= eocdOffset && archive.readUInt32LE(cursor) === 0x02014b50, `release_zip_central_header_invalid:${index}`);
    invariant(archive.readUInt16LE(cursor + 4) === VERSION_MADE_BY_UNIX, `release_zip_version_made_by_invalid:${index}`);
    invariant(archive.readUInt16LE(cursor + 6) === VERSION_NEEDED, `release_zip_version_needed_invalid:${index}`);
    invariant(archive.readUInt16LE(cursor + 8) === UTF8_FLAG, `release_zip_flags_invalid:${index}`);
    invariant(archive.readUInt16LE(cursor + 10) === STORE_METHOD, `release_zip_compression_forbidden:${index}`);
    invariant(archive.readUInt16LE(cursor + 12) === FIXED_DOS_TIME && archive.readUInt16LE(cursor + 14) === FIXED_DOS_DATE, `release_zip_timestamp_not_normalized:${index}`);
    const checksum = archive.readUInt32LE(cursor + 16);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const uncompressedSize = archive.readUInt32LE(cursor + 24);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    invariant(extraLength === 0 && commentLength === 0, `release_zip_extra_or_comment_forbidden:${index}`);
    invariant(archive.readUInt16LE(cursor + 34) === 0, `release_zip_entry_disk_invalid:${index}`);
    invariant(archive.readUInt16LE(cursor + 36) === 0, `release_zip_internal_attributes_invalid:${index}`);
    const externalAttributes = archive.readUInt32LE(cursor + 38);
    invariant((externalAttributes & 0xffff) === 0, `release_zip_external_attributes_invalid:${index}`);
    const mode = externalAttributes >>> 16;
    const localOffset = archive.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLength;
    invariant(nameEnd <= eocdOffset, `release_zip_name_bounds_invalid:${index}`);
    const nameBytes = archive.subarray(nameStart, nameEnd);
    const entryPath = nameBytes.toString("utf8");
    invariant(Buffer.from(entryPath, "utf8").equals(nameBytes), `release_zip_name_utf8_invalid:${index}`);
    assertArchivePathAllowed(entryPath);
    invariant(compressedSize === uncompressedSize, `release_zip_stored_size_mismatch:${entryPath}`);
    invariant(NORMALIZED_FILE_MODES.has(mode), `release_zip_mode_not_normalized:${entryPath}`);
    invariant(localOffset + 30 <= centralOffset && archive.readUInt32LE(localOffset) === 0x04034b50, `release_zip_local_header_invalid:${entryPath}`);
    invariant(archive.readUInt16LE(localOffset + 4) === VERSION_NEEDED, `release_zip_local_version_invalid:${entryPath}`);
    invariant(archive.readUInt16LE(localOffset + 6) === UTF8_FLAG && archive.readUInt16LE(localOffset + 8) === STORE_METHOD, `release_zip_local_flags_invalid:${entryPath}`);
    invariant(archive.readUInt16LE(localOffset + 10) === FIXED_DOS_TIME && archive.readUInt16LE(localOffset + 12) === FIXED_DOS_DATE, `release_zip_local_timestamp_invalid:${entryPath}`);
    invariant(archive.readUInt32LE(localOffset + 14) === checksum, `release_zip_local_crc_mismatch:${entryPath}`);
    invariant(archive.readUInt32LE(localOffset + 18) === compressedSize && archive.readUInt32LE(localOffset + 22) === uncompressedSize, `release_zip_local_size_mismatch:${entryPath}`);
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    invariant(localExtraLength === 0 && localNameLength === nameLength, `release_zip_local_name_metadata_invalid:${entryPath}`);
    const localNameStart = localOffset + 30;
    const localNameEnd = localNameStart + localNameLength;
    invariant(archive.subarray(localNameStart, localNameEnd).equals(archive.subarray(nameStart, nameEnd)), `release_zip_local_name_mismatch:${entryPath}`);
    const contentStart = localNameEnd;
    const contentEnd = contentStart + uncompressedSize;
    invariant(contentEnd <= centralOffset, `release_zip_content_bounds_invalid:${entryPath}`);
    const content = archive.subarray(contentStart, contentEnd);
    invariant(crc32(content) === checksum, `release_zip_crc_mismatch:${entryPath}`);
    entries.push({ path: entryPath, content: Buffer.from(content), byteLength: content.length, sha256: sha256(content), mode, localOffset, contentEnd });
    cursor = nameEnd;
  }
  invariant(cursor === eocdOffset, "release_zip_central_entry_count_mismatch");
  invariant(new Set(entries.map(({ path: entryPath }) => entryPath)).size === entries.length, "release_zip_duplicate_path");
  const paths = entries.map(({ path: entryPath }) => entryPath);
  invariant(JSON.stringify(paths) === JSON.stringify([...paths].sort(lexicalCompare)), "release_zip_entry_order_not_canonical");
  const localOrder = [...entries].sort((left, right) => left.localOffset - right.localOffset);
  let expectedOffset = 0;
  for (const entry of localOrder) {
    invariant(entry.localOffset === expectedOffset, `release_zip_hidden_gap_or_overlap:${entry.path}`);
    expectedOffset = entry.contentEnd;
  }
  invariant(expectedOffset === centralOffset, "release_zip_hidden_local_payload");
  return { archive, archiveSha256: sha256(archive), byteLength: archive.length, entries };
}

export function parseDeterministicZip(archivePath) {
  return parseDeterministicZipBytes(readFileSync(archivePath));
}

export function validateReleaseManifest(manifest) {
  invariant(isObject(manifest), "release_manifest_invalid");
  invariant(manifest.schemaVersion === RELEASE_MANIFEST_SCHEMA, "release_manifest_schema_mismatch");
  invariant(isDigest(manifest.manifestSha256), "release_manifest_checksum_invalid");
  const core = { ...manifest };
  delete core.manifestSha256;
  invariant(manifest.manifestSha256 === sha256(canonicalJson(core)), "release_manifest_checksum_mismatch");
  invariant(manifest.archiveFormat === "zip-store-v1", "release_manifest_archive_format_mismatch");
  invariant(manifest.normalizedArchiveTimestamp === NORMALIZED_ZIP_TIMESTAMP, "release_manifest_timestamp_mismatch");
  invariant(Array.isArray(manifest.payload?.entries) && manifest.payload.entries.length > 0, "release_manifest_entries_invalid");
  const entries = manifest.payload.entries;
  invariant(entries.length === manifest.payload.fileCount, "release_manifest_file_count_mismatch");
  invariant(entries.reduce((total, entry) => total + entry.byteLength, 0) === manifest.payload.byteLength, "release_manifest_byte_length_mismatch");
  for (const entry of entries) {
    assertArchivePathAllowed(entry.path);
    invariant(entry.path !== RELEASE_MANIFEST_PATH, "release_manifest_self_in_payload");
    invariant(Number.isInteger(entry.byteLength) && entry.byteLength >= 0, `release_manifest_entry_length_invalid:${entry.path}`);
    invariant(isDigest(entry.sha256), `release_manifest_entry_digest_invalid:${entry.path}`);
    invariant(NORMALIZED_FILE_MODES.has(entry.mode), `release_manifest_entry_mode_invalid:${entry.path}`);
  }
  invariant(new Set(entries.map(({ path: entryPath }) => entryPath)).size === entries.length, "release_manifest_duplicate_path");
  invariant(JSON.stringify(entries.map(({ path: entryPath }) => entryPath)) === JSON.stringify([...entries.map(({ path: entryPath }) => entryPath)].sort(lexicalCompare)), "release_manifest_order_invalid");
  invariant(manifest.payload.pathSetSha256 === sha256(entries.map(({ path: entryPath }) => entryPath).join("\n")), "release_manifest_path_set_digest_mismatch");
  invariant(manifest.payload.aggregateSha256 === sha256(canonicalJson(entries)), "release_manifest_aggregate_digest_mismatch");
  invariant(manifest.sourceBinding?.completeReleaseTreeBound === true, "release_manifest_complete_tree_binding_missing");
  invariant(manifest.sourceBinding?.sourceTreeAggregateSha256 === manifest.payload.aggregateSha256, "release_manifest_source_aggregate_mismatch");
  invariant(manifest.sourceBinding?.sourcePathSetSha256 === manifest.payload.pathSetSha256, "release_manifest_source_path_set_mismatch");
  invariant(JSON.stringify(manifest.exclusionPolicy?.fixedExcludedDirectoryNames) === JSON.stringify([...FIXED_EXCLUDED_DIRECTORY_NAMES]), "release_manifest_directory_exclusion_policy_mismatch");
  invariant(JSON.stringify(manifest.exclusionPolicy?.fixedExcludedFilePatterns) === JSON.stringify([...FIXED_EXCLUDED_FILE_PATTERNS]), "release_manifest_file_exclusion_policy_mismatch");
  invariant(manifest.exclusionPolicy?.physicalArchiveAbsenceRequired === true, "release_manifest_physical_exclusion_not_required");
  invariant(manifest.selfReferenceBoundary?.manifestPath === RELEASE_MANIFEST_PATH, "release_manifest_self_boundary_mismatch");
  invariant(manifest.selfReferenceBoundary?.completeArchiveBoundByExternalPackageReceipt === true, "release_manifest_archive_binding_boundary_missing");
  return manifest;
}

export function validateReleasePackageReceipt(receipt, verifiedArchive) {
  invariant(isObject(receipt), "release_package_receipt_invalid");
  invariant(receipt.schemaVersion === RELEASE_PACKAGE_RECEIPT_SCHEMA, "release_package_receipt_schema_mismatch");
  invariant(receipt.status === "PASS", "release_package_receipt_status_not_pass");
  invariant(isDigest(receipt.receiptSha256), "release_package_receipt_checksum_invalid");
  const core = { ...receipt };
  delete core.receiptSha256;
  invariant(receipt.receiptSha256 === sha256(canonicalJson(core)), "release_package_receipt_checksum_mismatch");
  invariant(receipt.sourceUnchanged === true, "release_package_receipt_source_changed");
  invariant(receipt.sourceTreeBeforeSha256 === receipt.sourceTreeAfterSha256, "release_package_receipt_source_digest_mismatch");
  invariant(receipt.sourceTreeBeforeSha256 === verifiedArchive.payloadAggregateSha256, "release_package_receipt_payload_source_mismatch");
  invariant(receipt.sourcePathSetSha256 === verifiedArchive.manifest.payload.pathSetSha256, "release_package_receipt_path_set_mismatch");
  invariant(receipt.payloadFileCount === verifiedArchive.payloadFileCount, "release_package_receipt_file_count_mismatch");
  invariant(receipt.payloadByteLength === verifiedArchive.payloadByteLength, "release_package_receipt_payload_bytes_mismatch");
  invariant(receipt.manifestSha256 === verifiedArchive.manifestSha256, "release_package_receipt_manifest_mismatch");
  invariant(receipt.archive?.sha256 === verifiedArchive.archiveSha256, "release_package_receipt_archive_digest_mismatch");
  invariant(receipt.archive?.byteLength === verifiedArchive.archiveByteLength, "release_package_receipt_archive_bytes_mismatch");
  invariant(receipt.archive?.entryCount === verifiedArchive.archiveEntryCount, "release_package_receipt_archive_entry_count_mismatch");
  invariant(receipt.physicalExclusionsVerified === true, "release_package_receipt_exclusions_not_verified");
  invariant(receipt.deterministicZipStructureVerified === true, "release_package_receipt_structure_not_verified");
  return receipt;
}

export function verifyReleaseArchive(archivePath, { sourceRoot = null, allowedDynamicExcludedPaths = [] } = {}) {
  const parsed = parseDeterministicZip(archivePath);
  const manifestEntries = parsed.entries.filter((entry) => entry.path === RELEASE_MANIFEST_PATH);
  invariant(manifestEntries.length === 1, "release_archive_manifest_count_mismatch");
  let manifest;
  try { manifest = JSON.parse(manifestEntries[0].content.toString("utf8")); }
  catch { throw new Error("release_archive_manifest_json_invalid"); }
  validateReleaseManifest(manifest);
  const payload = parsed.entries.filter((entry) => entry.path !== RELEASE_MANIFEST_PATH);
  invariant(payload.length === manifest.payload.fileCount, "release_archive_payload_count_mismatch");
  const observedEntries = payload.map(({ path: entryPath, byteLength, sha256: digest, mode }) => ({ path: entryPath, byteLength, sha256: digest, mode }));
  invariant(canonicalJson(observedEntries) === canonicalJson(manifest.payload.entries), "release_archive_payload_manifest_mismatch");
  invariant(payload.every((entry) => fixedExclusionReason(entry.path) === null), "release_archive_physical_exclusion_failed");
  let currentSource = null;
  if (sourceRoot !== null) {
    const allowedDynamic = normalizeDynamicExclusions(path.resolve(sourceRoot), allowedDynamicExcludedPaths);
    invariant(
      canonicalJson(manifest.exclusionPolicy.dynamicExcludedPaths) === canonicalJson(allowedDynamic),
      "release_archive_dynamic_exclusion_policy_mismatch",
    );
    currentSource = collectReleaseInventory(sourceRoot, {
      dynamicExcludedPaths: allowedDynamic,
    });
    invariant(currentSource.aggregateSha256 === manifest.payload.aggregateSha256, "release_archive_source_tree_not_current");
    invariant(currentSource.pathSetSha256 === manifest.payload.pathSetSha256, "release_archive_source_path_set_not_current");
  }
  return {
    status: "PASS",
    archiveSha256: parsed.archiveSha256,
    archiveByteLength: parsed.byteLength,
    archiveEntryCount: parsed.entries.length,
    payloadFileCount: manifest.payload.fileCount,
    payloadByteLength: manifest.payload.byteLength,
    payloadAggregateSha256: manifest.payload.aggregateSha256,
    manifestSha256: manifest.manifestSha256,
    sourceTreeCurrent: sourceRoot === null ? null : true,
    currentSourceAggregateSha256: currentSource?.aggregateSha256 ?? null,
    physicalExclusionsVerified: true,
    deterministicZipStructureVerified: true,
    manifest,
  };
}

export function releaseEntriesFromInventory(inventory, manifest) {
  const entries = inventory.files.map((entry) => ({
    path: entry.path,
    content: readFileSync(path.join(inventory.root, ...entry.path.split("/"))),
    mode: entry.mode,
  }));
  entries.push({
    path: RELEASE_MANIFEST_PATH,
    content: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    mode: 0o100644,
  });
  return entries;
}
