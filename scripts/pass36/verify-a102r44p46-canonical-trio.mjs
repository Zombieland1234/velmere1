#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  LEDGER_FILE_NAME,
  MATERIALS_FILE_NAME,
  REVISION_ID,
  SOURCE_FILE_NAME,
  invariant,
  requireRealDirectory,
  sha256,
  sourceBindingFromVerification,
  validateLedgerText,
} from "./r44p46-packaging-lib.mjs";
import { verifyR44P46MaterialsArchive, verifyR44P46SourceArchive } from "./package-a102r44p46-deterministic.mjs";

function readRegularSingleton(filePath, code, maxBytes) {
  const metadata = fs.lstatSync(filePath);
  invariant(metadata.isFile() && !metadata.isSymbolicLink(), `${code}_not_regular_file`);
  invariant(metadata.nlink === 1, `${code}_hardlink_forbidden`);
  invariant(metadata.size > 0 && metadata.size <= maxBytes, `${code}_size`);
  const bytes = fs.readFileSync(filePath);
  const after = fs.lstatSync(filePath);
  invariant(after.dev === metadata.dev && after.ino === metadata.ino && after.size === metadata.size, `${code}_changed_during_read`);
  return bytes;
}

export function verifyCanonicalTrioA102R44P46(directoryPath) {
  const directory = requireRealDirectory(directoryPath, "r44p46_trio");
  const entries = fs.readdirSync(directory.real, { withFileTypes: true }).sort((a, b) => Buffer.compare(Buffer.from(a.name), Buffer.from(b.name)));
  const expectedNames = [SOURCE_FILE_NAME, MATERIALS_FILE_NAME, LEDGER_FILE_NAME].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  invariant(entries.length === 3, "r44p46_trio_exact_count");
  invariant(entries.every((entry) => entry.isFile() && !entry.isSymbolicLink()), "r44p46_trio_non_regular_entry");
  invariant(JSON.stringify(entries.map((entry) => entry.name)) === JSON.stringify(expectedNames), "r44p46_trio_exact_names");
  const sourcePath = path.join(directory.real, SOURCE_FILE_NAME);
  const materialsPath = path.join(directory.real, MATERIALS_FILE_NAME);
  const ledgerPath = path.join(directory.real, LEDGER_FILE_NAME);
  const sourceBytes = readRegularSingleton(sourcePath, "r44p46_trio_source", 2 * 1024 * 1024 * 1024);
  const materialsBytes = readRegularSingleton(materialsPath, "r44p46_trio_materials", 2 * 1024 * 1024 * 1024);
  const ledgerBytes = readRegularSingleton(ledgerPath, "r44p46_trio_ledger", 32 * 1024 * 1024);
  const source = verifyR44P46SourceArchive(sourcePath);
  invariant(source.archiveSha256 === sha256(sourceBytes) && source.archiveByteLength === sourceBytes.length, "r44p46_trio_source_read_binding");
  const sourceBinding = sourceBindingFromVerification(source);
  const materials = verifyR44P46MaterialsArchive(materialsPath, sourceBinding);
  invariant(materials.archiveSha256 === sha256(materialsBytes) && materials.archiveByteLength === materialsBytes.length, "r44p46_trio_materials_read_binding");
  let ledgerText;
  try { ledgerText = new TextDecoder("utf-8", { fatal: true }).decode(ledgerBytes); }
  catch { throw new Error("r44p46_trio_ledger_utf8"); }
  const ledger = validateLedgerText(ledgerText, {
    sourceFingerprint: source.sourceFingerprint,
    sourceManifestSha256: source.sourceManifestSha256,
    source: { sha256: source.archiveSha256, byteLength: source.archiveByteLength },
    materials: { sha256: materials.archiveSha256, byteLength: materials.archiveByteLength },
  });
  return {
    schemaVersion: "velmere.pass36.a102r44p46.canonical-trio-receipt.v1",
    status: "PASS_R44P46_EXACT_THREE_CANONICAL_ARTIFACTS_NO_PROMOTION",
    revisionId: REVISION_ID,
    exactArtifactCount: 3,
    source: {
      fileName: SOURCE_FILE_NAME,
      sha256: source.archiveSha256,
      byteLength: source.archiveByteLength,
      entryCount: source.archiveEntryCount,
      sourceFingerprint: source.sourceFingerprint,
      sourceManifestSha256: source.sourceManifestSha256,
    },
    materials: {
      fileName: MATERIALS_FILE_NAME,
      sha256: materials.archiveSha256,
      byteLength: materials.archiveByteLength,
      entryCount: materials.archiveEntryCount,
      sourceArchiveBindingVerified: true,
    },
    ledger: {
      fileName: LEDGER_FILE_NAME,
      sha256: sha256(ledgerBytes),
      byteLength: ledgerBytes.length,
      headerCount: Object.keys(ledger.headers).length,
      sectionCount: ledger.sections.length,
      archiveBindingsVerified: true,
    },
    currentLedgerExcludedFromArchives: true,
    historicalR45LedgerPermittedAsEvidence: true,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

function parseArguments(argv) {
  invariant(argv.length === 2 && argv[0] === "--dir" && typeof argv[1] === "string" && argv[1].length > 0, "r44p46_trio_arguments");
  return argv[1];
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  try {
    process.stdout.write(`${JSON.stringify(verifyCanonicalTrioA102R44P46(parseArguments(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "FAIL_R44P46_CANONICAL_TRIO", error: error instanceof Error ? error.message : String(error), globalDecision: "NO_GO" })}\n`);
    process.exitCode = 1;
  }
}
