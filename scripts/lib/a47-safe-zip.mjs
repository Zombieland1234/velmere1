import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function findEocd(buffer) {
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) return offset;
  }
  throw new Error("zip_eocd_missing");
}

function normalizeEntryName(rawName) {
  const value = rawName.replaceAll("\\", "/");
  if (!value || value.includes("\u0000")) throw new Error("zip_entry_name_invalid");
  if (value.startsWith("/") || /^[a-zA-Z]:\//u.test(value)) throw new Error(`zip_absolute_path:${value}`);
  const parts = value.split("/");
  if (parts.some((part) => part === "..")) throw new Error(`zip_path_traversal:${value}`);
  const normalized = parts.filter((part) => part && part !== ".").join("/");
  if (!normalized && !value.endsWith("/")) throw new Error(`zip_entry_name_invalid:${value}`);
  return value.endsWith("/") ? `${normalized}/` : normalized;
}

function ensureWithin(root, relativePath) {
  const absolute = path.resolve(root, relativePath);
  const normalizedRoot = `${path.resolve(root)}${path.sep}`;
  if (absolute !== path.resolve(root) && !absolute.startsWith(normalizedRoot)) throw new Error(`zip_output_escape:${relativePath}`);
  return absolute;
}

export function inspectZip(zipPath, budgets = {}) {
  const maximumArchiveBytes = budgets.maximumArchiveBytes ?? 256 * 1024 * 1024;
  const maximumEntries = budgets.maximumEntries ?? 10_000;
  const maximumTotalUncompressedBytes = budgets.maximumTotalUncompressedBytes ?? 768 * 1024 * 1024;
  const maximumSingleFileBytes = budgets.maximumSingleFileBytes ?? 128 * 1024 * 1024;
  const stat = fs.statSync(zipPath);
  if (!stat.isFile()) throw new Error("zip_not_file");
  if (stat.size > maximumArchiveBytes) throw new Error(`zip_archive_too_large:${stat.size}>${maximumArchiveBytes}`);
  const buffer = fs.readFileSync(zipPath);
  const eocd = findEocd(buffer);
  const diskNumber = buffer.readUInt16LE(eocd + 4);
  const centralDisk = buffer.readUInt16LE(eocd + 6);
  const entriesOnDisk = buffer.readUInt16LE(eocd + 8);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) throw new Error("zip_multidisk_unsupported");
  if (entryCount > maximumEntries) throw new Error(`zip_too_many_entries:${entryCount}>${maximumEntries}`);
  if (centralOffset + centralSize > buffer.length) throw new Error("zip_central_directory_out_of_bounds");
  const entries = [];
  const names = new Set();
  let cursor = centralOffset;
  let totalUncompressedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) throw new Error(`zip_central_signature_invalid:${index}`);
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const expectedCrc32 = buffer.readUInt32LE(cursor + 16) >>> 0;
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const externalAttributes = buffer.readUInt32LE(cursor + 38);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd + extraLength + commentLength > buffer.length) throw new Error(`zip_central_entry_out_of_bounds:${index}`);
    const encoding = (flags & 0x0800) ? "utf8" : "utf8";
    const rawName = buffer.subarray(nameStart, nameEnd).toString(encoding);
    const name = normalizeEntryName(rawName);
    if (names.has(name)) throw new Error(`zip_duplicate_entry:${name}`);
    names.add(name);
    if (flags & 0x0001) throw new Error(`zip_encrypted_entry:${name}`);
    if (![0, 8].includes(method)) throw new Error(`zip_compression_unsupported:${name}:${method}`);
    const unixMode = (externalAttributes >>> 16) & 0xffff;
    if ((unixMode & 0xf000) === 0xa000) throw new Error(`zip_symlink_rejected:${name}`);
    const isDirectory = name.endsWith("/");
    if (!isDirectory && uncompressedSize > maximumSingleFileBytes) throw new Error(`zip_entry_too_large:${name}:${uncompressedSize}`);
    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > maximumTotalUncompressedBytes) throw new Error(`zip_uncompressed_budget_exceeded:${totalUncompressedBytes}>${maximumTotalUncompressedBytes}`);
    entries.push({ name, isDirectory, flags, method, expectedCrc32, compressedSize, uncompressedSize, localOffset });
    cursor = nameEnd + extraLength + commentLength;
  }
  return { buffer, archiveBytes: stat.size, entries, entryCount, totalUncompressedBytes };
}

export function extractZipSafely(zipPath, destination, budgets = {}) {
  const inspected = inspectZip(zipPath, budgets);
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of inspected.entries) {
    const output = ensureWithin(destination, entry.name);
    if (entry.isDirectory) {
      fs.mkdirSync(output, { recursive: true });
      continue;
    }
    const { buffer } = inspected;
    const offset = entry.localOffset;
    if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== LOCAL_SIGNATURE) throw new Error(`zip_local_signature_invalid:${entry.name}`);
    const localNameLength = buffer.readUInt16LE(offset + 26);
    const localExtraLength = buffer.readUInt16LE(offset + 28);
    const dataStart = offset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataEnd > buffer.length) throw new Error(`zip_entry_data_out_of_bounds:${entry.name}`);
    const compressed = buffer.subarray(dataStart, dataEnd);
    let content;
    if (entry.method === 0) content = Buffer.from(compressed);
    else content = zlib.inflateRawSync(compressed, { maxOutputLength: Math.max(1, entry.uncompressedSize) });
    if (content.length !== entry.uncompressedSize) throw new Error(`zip_size_mismatch:${entry.name}:${content.length}!=${entry.uncompressedSize}`);
    const actualCrc32 = crc32(content);
    if (actualCrc32 !== entry.expectedCrc32) throw new Error(`zip_crc_mismatch:${entry.name}`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, content, { flag: "wx" });
  }
  return { archiveBytes: inspected.archiveBytes, entryCount: inspected.entryCount, totalUncompressedBytes: inspected.totalUncompressedBytes };
}
