#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  SOURCE_FILE_NAME,
  canonicalJson,
  collectTree,
  invariant,
  sourceRowsForManifest,
  verifySourceRoot,
} from "./r44p46-packaging-lib.mjs";
import { verifyR44P46SourceArchive } from "./package-a102r44p46-deterministic.mjs";

export function verifyCleanSourceAuthorityA102R44P46({ sourceRoot, sourceArchive = null }) {
  const authority = verifySourceRoot(sourceRoot);
  const rows = collectTree(sourceRoot, { kind: "source" });
  const payloadRows = rows.filter((row) => row.path !== authority.manifest.manifestPath);
  invariant(canonicalJson(sourceRowsForManifest(payloadRows)) === canonicalJson(authority.manifest.files), "r44p46_clean_authority_payload_scope");
  const manifestRows = rows.filter((row) => row.path === authority.manifest.manifestPath);
  invariant(manifestRows.length === 1 && manifestRows[0].sha256 === authority.manifestFileSha256, "r44p46_clean_authority_manifest_file");
  let archive = null;
  if (sourceArchive !== null) {
    invariant(path.basename(path.resolve(sourceArchive)) === SOURCE_FILE_NAME, "r44p46_clean_authority_archive_filename");
    archive = verifyR44P46SourceArchive(sourceArchive);
    invariant(archive.sourceFingerprint === authority.sourceFingerprint, "r44p46_clean_authority_archive_fingerprint");
    invariant(archive.sourceManifestSha256 === authority.manifestFileSha256, "r44p46_clean_authority_archive_manifest");
    const diskArchiveRows = rows.map(({ path: entryPath, byteLength, sha256: digest, mode }) => ({ path: entryPath, byteLength, sha256: digest, mode }));
    const archiveRows = archive.parsed.entries.map(({ path: entryPath, byteLength, sha256: digest, mode }) => ({ path: entryPath, byteLength, sha256: digest, mode }));
    invariant(canonicalJson(diskArchiveRows) === canonicalJson(archiveRows), "r44p46_clean_authority_archive_disk_mismatch");
  }
  return {
    schemaVersion: "velmere.pass36.a102r44p46.clean-source-authority-receipt.v1",
    status: "PASS_R44P46_CLEAN_SOURCE_AUTHORITY",
    fileCountExcludingManifest: authority.fileCount,
    archiveEntryCount: rows.length,
    payloadBytes: authority.payloadBytes,
    sourceFingerprint: authority.sourceFingerprint,
    sourceManifestSha256: authority.manifestFileSha256,
    archiveBound: sourceArchive !== null,
    archiveSha256: archive?.archiveSha256 ?? null,
    exactFileSet: true,
    exactBytes: true,
    currentLedgerAbsent: true,
    dynamicSourceExclusionsApplied: true,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

function parseArguments(argv) {
  const allowed = new Set(["--source-root", "--source-archive"]);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    invariant(allowed.has(key) && !values.has(key), `r44p46_clean_authority_argument:${key}`);
    const value = argv[++index];
    invariant(typeof value === "string" && value.length > 0 && !value.startsWith("--"), `r44p46_clean_authority_argument_value:${key}`);
    values.set(key, value);
  }
  invariant(values.has("--source-root"), "r44p46_clean_authority_source_root_required");
  return { sourceRoot: values.get("--source-root"), sourceArchive: values.get("--source-archive") ?? null };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  try {
    process.stdout.write(`${JSON.stringify(verifyCleanSourceAuthorityA102R44P46(parseArguments(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "FAIL_R44P46_CLEAN_SOURCE_AUTHORITY", error: error instanceof Error ? error.message : String(error), globalDecision: "NO_GO" })}\n`);
    process.exitCode = 1;
  }
}
