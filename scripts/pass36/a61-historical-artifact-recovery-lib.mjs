import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { crc32, inspectZip } from "../lib/a47-safe-zip.mjs";

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function exactFileState(filePath) {
  try {
    const bytes = fs.readFileSync(filePath);
    return { present: true, byteLength: bytes.length, sha256: sha256(bytes), bytes };
  } catch {
    return { present: false, byteLength: null, sha256: null, bytes: null };
  }
}

function assertSafeRelative(relative) {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative) || relative.includes("\\")) throw new Error(`a61_target_path_invalid:${String(relative)}`);
  const parts = relative.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) throw new Error(`a61_target_path_invalid:${relative}`);
  return relative;
}

function entryContent(inspected, entry) {
  const { buffer } = inspected;
  const offset = entry.localOffset;
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50) throw new Error(`zip_local_signature_invalid:${entry.name}`);
  const localNameLength = buffer.readUInt16LE(offset + 26);
  const localExtraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + localNameLength + localExtraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > buffer.length) throw new Error(`zip_entry_data_out_of_bounds:${entry.name}`);
  const compressed = buffer.subarray(dataStart, dataEnd);
  const content = entry.method === 0
    ? Buffer.from(compressed)
    : zlib.inflateRawSync(compressed, { maxOutputLength: Math.max(1, entry.uncompressedSize) });
  if (content.length !== entry.uncompressedSize) throw new Error(`zip_size_mismatch:${entry.name}:${content.length}!=${entry.uncompressedSize}`);
  if (crc32(content) !== entry.expectedCrc32) throw new Error(`zip_crc_mismatch:${entry.name}`);
  return content;
}

function findTargetEntry(entries, targetPath) {
  const matches = entries.filter((entry) => !entry.isDirectory && (entry.name === targetPath || entry.name.endsWith(`/${targetPath}`)));
  if (matches.length === 0) throw new Error(`a61_archive_target_missing:${targetPath}`);
  if (matches.length !== 1) throw new Error(`a61_archive_target_ambiguous:${targetPath}:${matches.length}`);
  return matches[0];
}

function validateBytes(bytes, expected, origin) {
  const actual = { byteLength: bytes.length, sha256: sha256(bytes) };
  if (actual.byteLength !== expected.byteLength) throw new Error(`a61_artifact_size_mismatch:${expected.id}:${actual.byteLength}!=${expected.byteLength}:${origin}`);
  if (actual.sha256 !== expected.sha256) throw new Error(`a61_artifact_hash_mismatch:${expected.id}:${actual.sha256}!=${expected.sha256}:${origin}`);
  return actual;
}

function acceptedArchive(expected, archivePath, inspected, bytes) {
  const actual = { fileName: path.basename(archivePath), byteLength: bytes.length, sha256: sha256(bytes), entryCount: inspected.entryCount };
  const matches = (expected.acceptedArchives ?? []).filter((row) => (
    row.sha256 === actual.sha256
    && row.byteLength === actual.byteLength
    && row.entryCount === actual.entryCount
  ));
  if (matches.length !== 1) throw new Error(`a61_archive_anchor_mismatch:${expected.id}:${JSON.stringify(actual)}`);
  return { ...actual, fileNameMatch: Array.isArray(matches[0].fileNames) && matches[0].fileNames.includes(actual.fileName), expectedFileNames: matches[0].fileNames ?? [] };
}

function atomicInstall(root, expected, bytes) {
  const relative = assertSafeRelative(expected.targetPath);
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error(`a61_install_escape:${relative}`);
  const previous = exactFileState(target);
  if (previous.present && previous.byteLength === expected.byteLength && previous.sha256 === expected.sha256) {
    return { installed: true, changed: false, previous: { present: true, byteLength: previous.byteLength, sha256: previous.sha256 } };
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.a61-tmp-${process.pid}`;
  fs.rmSync(temporary, { force: true });
  fs.writeFileSync(temporary, bytes, { flag: "wx", mode: 0o644 });
  const staged = validateBytes(fs.readFileSync(temporary), expected, "staged_install");
  fs.renameSync(temporary, target);
  const installed = validateBytes(fs.readFileSync(target), expected, "installed_target");
  return {
    installed: true,
    changed: true,
    previous: { present: previous.present, byteLength: previous.byteLength, sha256: previous.sha256 },
    staged,
    installedState: installed,
  };
}

export function evaluateHistoricalRecovery({ root, policy, inputs = {}, install = false }) {
  const results = [];
  const errors = [];
  for (const expected of policy.artifacts) {
    const targetPath = path.join(root, assertSafeRelative(expected.targetPath));
    const existing = exactFileState(targetPath);
    let candidate = null;
    let origin = null;
    let archive = null;
    try {
      if (existing.present && existing.byteLength === expected.byteLength && existing.sha256 === expected.sha256) {
        candidate = existing.bytes;
        origin = { type: "existing_exact_target", path: expected.targetPath };
      } else if (inputs.direct?.[expected.id]) {
        const directPath = path.resolve(inputs.direct[expected.id]);
        const state = exactFileState(directPath);
        if (!state.present) throw new Error(`a61_direct_artifact_missing:${expected.id}:${directPath}`);
        validateBytes(state.bytes, expected, "direct_artifact");
        candidate = state.bytes;
        origin = { type: "direct_exact_artifact", path: directPath };
      } else if (inputs.archives?.[expected.id]) {
        const archivePath = path.resolve(inputs.archives[expected.id]);
        const archiveBytes = fs.readFileSync(archivePath);
        const inspected = inspectZip(archivePath, policy.budgets);
        archive = acceptedArchive(expected, archivePath, inspected, archiveBytes);
        const entry = findTargetEntry(inspected.entries, expected.targetPath);
        if (expected.zipEntry?.compressedByteLength != null && entry.compressedSize !== expected.zipEntry.compressedByteLength) throw new Error(`a61_zip_entry_compressed_size_mismatch:${expected.id}`);
        if (expected.zipEntry?.crc32Hex && entry.expectedCrc32.toString(16).padStart(8, "0") !== expected.zipEntry.crc32Hex) throw new Error(`a61_zip_entry_crc_mismatch:${expected.id}`);
        const bytes = entryContent(inspected, entry);
        validateBytes(bytes, expected, "anchored_archive_entry");
        candidate = bytes;
        origin = { type: "anchored_archive_entry", path: archivePath, entry: entry.name };
      }
      let installation = null;
      if (candidate && install) installation = atomicInstall(root, expected, candidate);
      const final = exactFileState(targetPath);
      const verifiedInput = Boolean(candidate);
      const installedExact = final.present && final.byteLength === expected.byteLength && final.sha256 === expected.sha256;
      results.push({
        id: expected.id,
        targetPath: expected.targetPath,
        expected: { byteLength: expected.byteLength, sha256: expected.sha256 },
        existingBefore: { present: existing.present, byteLength: existing.byteLength, sha256: existing.sha256 },
        origin,
        archive,
        verifiedInput,
        installRequested: install,
        installation,
        installedExact,
        final: { present: final.present, byteLength: final.byteLength, sha256: final.sha256 },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ id: expected.id, error: message });
      results.push({
        id: expected.id,
        targetPath: expected.targetPath,
        expected: { byteLength: expected.byteLength, sha256: expected.sha256 },
        existingBefore: { present: existing.present, byteLength: existing.byteLength, sha256: existing.sha256 },
        verifiedInput: false,
        installedExact: false,
        error: message,
      });
    }
  }
  const verifiedInputs = results.filter((row) => row.verifiedInput).length;
  const installedExact = results.filter((row) => row.installedExact).length;
  let decision;
  if (errors.length) decision = policy.decisions.rejected;
  else if (installedExact === policy.artifacts.length) decision = policy.decisions.verified;
  else if (verifiedInputs === policy.artifacts.length) decision = policy.decisions.verifiedNotInstalled;
  else if (verifiedInputs > 0 || installedExact > 0) decision = policy.decisions.partial;
  else decision = policy.decisions.blocked;
  return {
    schemaVersion: "velmere.pass36.a61.historical-artifact-recovery.v1",
    revisionId: policy.revisionId,
    decision,
    promotionAllowed: false,
    installRequested: install,
    summary: {
      required: policy.artifacts.length,
      verifiedInputs,
      installedExact,
      rejected: errors.length,
      criticalOfflineGateEligible: installedExact === policy.artifacts.length && errors.length === 0,
    },
    results,
    errors,
    metadataOnlyCreditAllowed: false,
    saleEnabled: false,
    liveProven: false,
    truthBoundary: policy.truthBoundary,
  };
}
