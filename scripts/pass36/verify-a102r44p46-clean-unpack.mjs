#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  MATERIALS_FILE_NAME,
  SOURCE_FILE_NAME,
  canonicalJson,
  collectTree,
  invariant,
  requireEmptyOutputDirectory,
  requireRealDirectory,
  sourceBindingFromVerification,
  verifySourceRoot,
} from "./r44p46-packaging-lib.mjs";
import { verifyR44P46MaterialsArchive, verifyR44P46SourceArchive } from "./package-a102r44p46-deterministic.mjs";

function requireArchive(filePath, expectedName) {
  const resolved = path.resolve(filePath);
  const metadata = fs.lstatSync(resolved);
  invariant(metadata.isFile() && !metadata.isSymbolicLink(), "r44p46_clean_archive_not_regular");
  invariant(path.basename(resolved) === expectedName, "r44p46_clean_archive_filename");
  return resolved;
}

function writeExact(filePath, content) {
  const descriptor = fs.openSync(filePath, "wx", 0o600);
  try {
    let offset = 0;
    while (offset < content.length) offset += fs.writeSync(descriptor, content, offset, content.length - offset);
    fs.fchmodSync(descriptor, 0o644);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function extractVerifiedEntries(entries, outputRoot) {
  for (const entry of entries) {
    const target = path.join(outputRoot, ...entry.path.split("/"));
    const parent = path.dirname(target);
    fs.mkdirSync(parent, { recursive: true, mode: 0o755 });
    let cursor = outputRoot;
    for (const segment of path.relative(outputRoot, parent).split(path.sep).filter(Boolean)) {
      cursor = path.join(cursor, segment);
      const metadata = fs.lstatSync(cursor);
      invariant(metadata.isDirectory() && !metadata.isSymbolicLink(), `r44p46_clean_parent_not_real_directory:${entry.path}`);
    }
    writeExact(target, entry.content);
  }
}

function diskRows(rootPath, kind) {
  return collectTree(rootPath, { kind }).map(({ path: entryPath, byteLength, sha256: digest, mode }) => ({ path: entryPath, byteLength, sha256: digest, mode }));
}

export function cleanUnpackA102R44P46({ kind, archive, outputDir, sourceArchive = null }) {
  invariant(kind === "source" || kind === "materials", "r44p46_clean_kind");
  const expectedName = kind === "source" ? SOURCE_FILE_NAME : MATERIALS_FILE_NAME;
  const archivePath = requireArchive(archive, expectedName);
  const output = requireEmptyOutputDirectory(outputDir);
  invariant(!path.resolve(archivePath).startsWith(`${output.real}${path.sep}`), "r44p46_clean_archive_inside_output");
  let sourceBinding = null;
  let verified;
  if (kind === "source") {
    invariant(sourceArchive === null, "r44p46_clean_source_binding_argument_forbidden");
    verified = verifyR44P46SourceArchive(archivePath);
  } else {
    invariant(typeof sourceArchive === "string" && sourceArchive.length > 0, "r44p46_clean_materials_source_archive_required");
    const sourcePath = requireArchive(sourceArchive, SOURCE_FILE_NAME);
    const sourceVerified = verifyR44P46SourceArchive(sourcePath);
    sourceBinding = sourceBindingFromVerification(sourceVerified);
    verified = verifyR44P46MaterialsArchive(archivePath, sourceBinding);
  }
  extractVerifiedEntries(verified.parsed.entries, output.real);
  const expectedRows = verified.parsed.entries.map(({ path: entryPath, byteLength, sha256: digest, mode }) => ({ path: entryPath, byteLength, sha256: digest, mode }));
  const observedRows = diskRows(output.real, kind);
  invariant(canonicalJson(observedRows) === canonicalJson(expectedRows), "r44p46_clean_extracted_disk_mismatch");
  let sourceAuthority = null;
  if (kind === "source") {
    sourceAuthority = verifySourceRoot(output.real);
    invariant(sourceAuthority.sourceFingerprint === verified.sourceFingerprint && sourceAuthority.manifestFileSha256 === verified.sourceManifestSha256, "r44p46_clean_source_authority_mismatch");
  } else {
    const after = verifyR44P46MaterialsArchive(archivePath, sourceBinding);
    invariant(after.archiveSha256 === verified.archiveSha256, "r44p46_clean_materials_archive_changed");
  }
  const outputMetadata = requireRealDirectory(output.real, "r44p46_clean_output_after");
  invariant(outputMetadata.real === output.real, "r44p46_clean_output_alias_after");
  return {
    schemaVersion: "velmere.pass36.a102r44p46.clean-unpack-receipt.v1",
    status: kind === "source" ? "PASS_R44P46_CLEAN_SOURCE_UNPACK" : "PASS_R44P46_CLEAN_MATERIALS_UNPACK",
    kind,
    archiveFileName: expectedName,
    archiveSha256: verified.archiveSha256,
    archiveByteLength: verified.archiveByteLength,
    archiveEntryCount: verified.archiveEntryCount,
    extractedFileCount: observedRows.length,
    pathSafetyVerified: true,
    duplicatePathsRejected: true,
    symlinkEntriesRejected: true,
    sourceAuthorityVerified: kind === "source",
    sourceArchiveBindingVerified: kind === "materials",
    sourceFingerprint: kind === "source" ? sourceAuthority.sourceFingerprint : sourceBinding.sourceFingerprint,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

function parseArguments(argv) {
  const allowed = new Set(["--kind", "--archive", "--output-dir", "--source-archive"]);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    invariant(allowed.has(key) && !values.has(key), `r44p46_clean_argument:${key}`);
    const value = argv[++index];
    invariant(typeof value === "string" && value.length > 0 && !value.startsWith("--"), `r44p46_clean_argument_value:${key}`);
    values.set(key, value);
  }
  for (const key of ["--kind", "--archive", "--output-dir"]) invariant(values.has(key), `r44p46_clean_argument_required:${key}`);
  return { kind: values.get("--kind"), archive: values.get("--archive"), outputDir: values.get("--output-dir"), sourceArchive: values.get("--source-archive") ?? null };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  try {
    process.stdout.write(`${JSON.stringify(cleanUnpackA102R44P46(parseArguments(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "FAIL_R44P46_CLEAN_UNPACK", error: error instanceof Error ? error.message : String(error), globalDecision: "NO_GO" })}\n`);
    process.exitCode = 1;
  }
}
