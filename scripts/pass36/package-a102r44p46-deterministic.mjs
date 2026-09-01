#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { parseDeterministicZip, writeDeterministicZip } from "../pass4826/release-package-contract.mjs";
import {
  MATERIALS_FILE_NAME,
  MATERIALS_MANIFEST_PATH,
  REVISION_ID,
  SOURCE_FILE_NAME,
  SOURCE_MANIFEST_PATH,
  assertDistinctInputRoots,
  assertNoCurrentLedgerPath,
  buildMaterialsManifest,
  canonicalJson,
  collectTree,
  invariant,
  inventoryIdentity,
  normalizePortablePath,
  parseStrictObject,
  requireEmptyOutputDirectory,
  sha256,
  sourceBindingFromVerification,
  sourceExcluded,
  sourceRowsForManifest,
  validateMaterialsManifest,
  validatePortablePathSet,
  validateSourceArchiveBinding,
  validateSourceManifest,
  verifySourceRoot,
} from "./r44p46-packaging-lib.mjs";

function archiveRows(parsed, excludedPath) {
  return parsed.entries.filter((entry) => entry.path !== excludedPath).map(({ path: entryPath, byteLength, sha256: digest, mode }) => ({ path: entryPath, byteLength, sha256: digest, mode }));
}

export function verifyR44P46SourceArchive(archivePath) {
  const parsed = parseDeterministicZip(archivePath);
  const manifests = parsed.entries.filter((entry) => entry.path === SOURCE_MANIFEST_PATH);
  invariant(manifests.length === 1 && manifests[0].mode === 0o100644, "r44p46_source_archive_manifest_count_or_mode");
  const manifest = validateSourceManifest(parseStrictObject(manifests[0].content, "r44p46_source_archive_manifest_parse"));
  const payload = parsed.entries.filter((entry) => entry.path !== SOURCE_MANIFEST_PATH);
  for (const entry of parsed.entries) {
    normalizePortablePath(entry.path);
    assertNoCurrentLedgerPath(entry.path);
    invariant(entry.mode === 0o100644, `r44p46_source_archive_mode:${entry.path}`);
    if (entry.path !== SOURCE_MANIFEST_PATH) invariant(!sourceExcluded(entry.path), `r44p46_source_archive_excluded_path:${entry.path}`);
  }
  validatePortablePathSet(parsed.entries.map((entry) => entry.path));
  const observed = sourceRowsForManifest(payload);
  invariant(canonicalJson(observed) === canonicalJson(manifest.files), "r44p46_source_archive_manifest_payload_mismatch");
  return {
    status: "PASS_R44P46_SOURCE_ARCHIVE",
    archiveSha256: parsed.archiveSha256,
    archiveByteLength: parsed.byteLength,
    archiveEntryCount: parsed.entries.length,
    sourceFingerprint: manifest.sourceAggregateSha256,
    sourceManifestSha256: manifests[0].sha256,
    sourceManifestSelfSha256: manifest.manifestSha256,
    payloadFileCount: payload.length,
    payloadBytes: payload.reduce((sum, entry) => sum + entry.byteLength, 0),
    manifest,
    parsed,
  };
}

export function verifyR44P46MaterialsArchive(archivePath, expectedSourceBinding = null) {
  const parsed = parseDeterministicZip(archivePath);
  const manifests = parsed.entries.filter((entry) => entry.path === MATERIALS_MANIFEST_PATH);
  invariant(manifests.length === 1 && manifests[0].mode === 0o100644, "r44p46_materials_archive_manifest_count_or_mode");
  const manifest = validateMaterialsManifest(parseStrictObject(manifests[0].content, "r44p46_materials_archive_manifest_parse"));
  for (const entry of parsed.entries) {
    normalizePortablePath(entry.path);
    assertNoCurrentLedgerPath(entry.path);
    invariant(entry.mode === 0o100644, `r44p46_materials_archive_mode:${entry.path}`);
  }
  validatePortablePathSet(parsed.entries.map((entry) => entry.path));
  const observed = archiveRows(parsed, MATERIALS_MANIFEST_PATH);
  invariant(canonicalJson(observed) === canonicalJson(manifest.entries), "r44p46_materials_archive_manifest_payload_mismatch");
  if (expectedSourceBinding !== null) {
    validateSourceArchiveBinding(expectedSourceBinding);
    invariant(canonicalJson(manifest.sourceArchiveBinding) === canonicalJson(expectedSourceBinding), "r44p46_materials_archive_source_binding_mismatch");
  }
  return {
    status: "PASS_R44P46_MATERIALS_ARCHIVE",
    archiveSha256: parsed.archiveSha256,
    archiveByteLength: parsed.byteLength,
    archiveEntryCount: parsed.entries.length,
    materialsManifestSha256: manifests[0].sha256,
    materialsManifestSelfSha256: manifest.manifestSha256,
    payloadFileCount: observed.length,
    payloadBytes: observed.reduce((sum, entry) => sum + entry.byteLength, 0),
    sourceArchiveBinding: manifest.sourceArchiveBinding,
    manifest,
    parsed,
  };
}

function zipEntries(rows, extra = []) {
  return [...rows.map((row) => ({ path: row.path, content: row.content, mode: 0o100644 })), ...extra];
}

function byteIdentical(leftPath, rightPath, code) {
  const left = fs.readFileSync(leftPath);
  const right = fs.readFileSync(rightPath);
  invariant(left.equals(right), code);
  return { sha256: sha256(left), byteLength: left.length };
}

function deleteExactFiles(paths) {
  for (const filePath of paths) if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) fs.unlinkSync(filePath);
}

export function packageA102R44P46({ sourceRoot, materialsRoot, outputDir }) {
  const roots = assertDistinctInputRoots(sourceRoot, materialsRoot);
  const output = requireEmptyOutputDirectory(outputDir, [roots.source.real, roots.materials.real]);
  invariant(!fs.existsSync(path.join(roots.materials.real, ...MATERIALS_MANIFEST_PATH.split("/"))), "r44p46_materials_reserved_manifest_input");
  const sourceBefore = verifySourceRoot(roots.source.real);
  const sourceRows = collectTree(roots.source.real, { kind: "source" });
  const expectedSourceArchivePaths = [...sourceBefore.manifest.files.map((row) => row.path), SOURCE_MANIFEST_PATH].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  invariant(canonicalJson(sourceRows.map((row) => row.path)) === canonicalJson(expectedSourceArchivePaths), "r44p46_source_archive_scope_drift_from_embedded_manifest");
  const materialsRows = collectTree(roots.materials.real, { kind: "materials", excludePaths: new Set([MATERIALS_MANIFEST_PATH]) });
  const materialsBefore = inventoryIdentity(materialsRows);

  const temporaryPaths = {
    sourceOne: path.join(output.real, ".r44p46-source-run-1.zip"),
    sourceTwo: path.join(output.real, ".r44p46-source-run-2.zip"),
    materialsOne: path.join(output.real, ".r44p46-materials-run-1.zip"),
    materialsTwo: path.join(output.real, ".r44p46-materials-run-2.zip"),
  };
  const finalSource = path.join(output.real, SOURCE_FILE_NAME);
  const finalMaterials = path.join(output.real, MATERIALS_FILE_NAME);
  const cleanup = [...Object.values(temporaryPaths), finalSource, finalMaterials];
  invariant(cleanup.every((filePath) => !fs.existsSync(filePath)), "r44p46_package_output_collision");
  let committed = false;
  try {
    const sourceEntries = zipEntries(sourceRows);
    writeDeterministicZip(temporaryPaths.sourceOne, sourceEntries, { overwrite: false });
    writeDeterministicZip(temporaryPaths.sourceTwo, sourceEntries, { overwrite: false });
    const sourceDeterminism = byteIdentical(temporaryPaths.sourceOne, temporaryPaths.sourceTwo, "r44p46_source_two_runs_not_byte_identical");
    const sourceVerifiedOne = verifyR44P46SourceArchive(temporaryPaths.sourceOne);
    const sourceVerifiedTwo = verifyR44P46SourceArchive(temporaryPaths.sourceTwo);
    invariant(canonicalJson({ ...sourceVerifiedOne, manifest: null, parsed: null }) === canonicalJson({ ...sourceVerifiedTwo, manifest: null, parsed: null }), "r44p46_source_two_run_receipt_mismatch");
    invariant(sourceVerifiedOne.archiveSha256 === sourceDeterminism.sha256 && sourceVerifiedOne.archiveByteLength === sourceDeterminism.byteLength, "r44p46_source_determinism_identity");
    const sourceBinding = sourceBindingFromVerification(sourceVerifiedOne);

    const materialsManifest = buildMaterialsManifest(materialsRows, sourceBinding);
    const materialsManifestBytes = Buffer.from(`${JSON.stringify(materialsManifest, null, 2)}\n`, "utf8");
    const materialsEntries = zipEntries(materialsRows, [{ path: MATERIALS_MANIFEST_PATH, content: materialsManifestBytes, mode: 0o100644 }]);
    writeDeterministicZip(temporaryPaths.materialsOne, materialsEntries, { overwrite: false });
    writeDeterministicZip(temporaryPaths.materialsTwo, materialsEntries, { overwrite: false });
    const materialsDeterminism = byteIdentical(temporaryPaths.materialsOne, temporaryPaths.materialsTwo, "r44p46_materials_two_runs_not_byte_identical");
    const materialsVerifiedOne = verifyR44P46MaterialsArchive(temporaryPaths.materialsOne, sourceBinding);
    const materialsVerifiedTwo = verifyR44P46MaterialsArchive(temporaryPaths.materialsTwo, sourceBinding);
    invariant(canonicalJson({ ...materialsVerifiedOne, manifest: null, parsed: null }) === canonicalJson({ ...materialsVerifiedTwo, manifest: null, parsed: null }), "r44p46_materials_two_run_receipt_mismatch");
    invariant(materialsVerifiedOne.archiveSha256 === materialsDeterminism.sha256 && materialsVerifiedOne.archiveByteLength === materialsDeterminism.byteLength, "r44p46_materials_determinism_identity");

    const sourceAfter = verifySourceRoot(roots.source.real);
    const materialsAfter = inventoryIdentity(collectTree(roots.materials.real, { kind: "materials", excludePaths: new Set([MATERIALS_MANIFEST_PATH]) }));
    invariant(canonicalJson(sourceBefore) === canonicalJson(sourceAfter), "r44p46_source_changed_during_package");
    invariant(canonicalJson(materialsBefore) === canonicalJson(materialsAfter), "r44p46_materials_changed_during_package");

    fs.renameSync(temporaryPaths.sourceOne, finalSource);
    fs.renameSync(temporaryPaths.materialsOne, finalMaterials);
    fs.unlinkSync(temporaryPaths.sourceTwo);
    fs.unlinkSync(temporaryPaths.materialsTwo);
    committed = true;
    invariant(canonicalJson(fs.readdirSync(output.real).sort()) === canonicalJson([MATERIALS_FILE_NAME, SOURCE_FILE_NAME].sort()), "r44p46_package_output_exact_two");
    return {
      schemaVersion: "velmere.pass36.a102r44p46.deterministic-package-receipt.v1",
      status: "PASS_R44P46_DETERMINISTIC_SOURCE_AND_MATERIALS_PACKAGE_NO_PROMOTION",
      revisionId: REVISION_ID,
      deterministicRunsPerArchive: 2,
      byteIdenticalSource: true,
      byteIdenticalMaterials: true,
      source: {
        fileName: SOURCE_FILE_NAME,
        sha256: sourceVerifiedOne.archiveSha256,
        byteLength: sourceVerifiedOne.archiveByteLength,
        entryCount: sourceVerifiedOne.archiveEntryCount,
        sourceFingerprint: sourceVerifiedOne.sourceFingerprint,
        sourceManifestSha256: sourceVerifiedOne.sourceManifestSha256,
      },
      materials: {
        fileName: MATERIALS_FILE_NAME,
        sha256: materialsVerifiedOne.archiveSha256,
        byteLength: materialsVerifiedOne.archiveByteLength,
        entryCount: materialsVerifiedOne.archiveEntryCount,
        materialsManifestSha256: materialsVerifiedOne.materialsManifestSha256,
        sourceArchiveBinding: materialsVerifiedOne.sourceArchiveBinding,
      },
      sourceInputUnchanged: true,
      materialsInputUnchanged: true,
      exactOutputFiles: 2,
      globalDecision: "NO_GO",
      live: false,
      saleEnabled: false,
      productionApproved: false,
      worldClassProven: false,
    };
  } finally {
    if (!committed) deleteExactFiles(cleanup);
  }
}

function parseArguments(argv) {
  const allowed = new Set(["--source-root", "--materials-root", "--output-dir"]);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    invariant(allowed.has(key) && !values.has(key), `r44p46_package_argument:${key}`);
    const value = argv[++index];
    invariant(typeof value === "string" && value.length > 0 && !value.startsWith("--"), `r44p46_package_argument_value:${key}`);
    values.set(key, value);
  }
  for (const key of allowed) invariant(values.has(key), `r44p46_package_argument_required:${key}`);
  return { sourceRoot: values.get("--source-root"), materialsRoot: values.get("--materials-root"), outputDir: values.get("--output-dir") };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  try {
    process.stdout.write(`${JSON.stringify(packageA102R44P46(parseArguments(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "FAIL_R44P46_DETERMINISTIC_PACKAGE", error: error instanceof Error ? error.message : String(error), globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false })}\n`);
    process.exitCode = 1;
  }
}
