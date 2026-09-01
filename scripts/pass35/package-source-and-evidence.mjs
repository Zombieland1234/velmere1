#!/usr/bin/env node
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { writeDeterministicZip } from "../pass4826/release-package-contract.mjs";
import {
  canonicalJson,
  collectPass35Inventory,
  PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS,
  sha256,
} from "./source-inventory.mjs";
import {
  PASS35_LOCAL_PDF_QA_RECEIPT_PATH,
  PASS35_LOCAL_PDF_QA_SUMMARY_PATH,
  PASS35_LOCAL_PDF_RASTER_RECEIPT_PATH,
  buildPass35LocalPdfQaSummary,
  verifyPass35LocalPdfQaSummary,
} from "./local-pdf-qa-summary.mjs";
import {
  PASS35_CANDIDATE_ID,
  PASS35_MANIFEST_PATHS,
  PASS35_MANIFEST_PROFILES,
  buildPass35ManifestSet,
  setDigest,
  validatePass35ManifestSet,
} from "./release-manifest-set.mjs";

const A44_SOURCE_ONLY_MANIFEST_PATH = "_velmere/PASS35_A44_SOURCE_ONLY_MANIFEST.json";
const CONTROL_METADATA_INCOMPLETE_STATUS = "INCOMPLETE_SOURCE_PACKAGE_CONTROL_METADATA";
const CONTROL_METADATA_COMPLETE_STATUS = "COMPLETE_SOURCE_PACKAGE_CONTROL_METADATA";
const DIGEST_PATTERN = /^[a-f0-9]{64}$/u;
const lexical = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`pass35_argument_missing:${name}`);
  return value;
}

function metadataEntryFromBytes(root, filePath, role, reason, content) {
  const absolutePath = path.join(root, filePath);
  const metadata = statSync(absolutePath);
  return {
    path: filePath,
    role,
    sourceIncluded: true,
    reason,
    byteLength: content.length,
    sha256: sha256(content),
    mode: (metadata.mode & 0o111) === 0 ? 0o100644 : 0o100755,
    content,
  };
}

function metadataEntryFromDisk(root, filePath, role, reason) {
  return metadataEntryFromBytes(root, filePath, role, reason, readFileSync(path.join(root, filePath)));
}

function regularFileExists(root, filePath) {
  try {
    return statSync(path.join(root, filePath)).isFile();
  } catch {
    return false;
  }
}

function loadA44ControlMetadataAnchors(root) {
  if (!regularFileExists(root, A44_SOURCE_ONLY_MANIFEST_PATH)) {
    return {
      source: {
        path: A44_SOURCE_ONLY_MANIFEST_PATH,
        status: "NOT_AVAILABLE",
      },
      entries: new Map(),
    };
  }

  const bytes = readFileSync(path.join(root, A44_SOURCE_ONLY_MANIFEST_PATH));
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    return {
      source: {
        path: A44_SOURCE_ONLY_MANIFEST_PATH,
        status: "INVALID_JSON",
        byteLength: bytes.length,
        sha256: sha256(bytes),
      },
      entries: new Map(),
    };
  }

  const manifestCore = { ...value };
  delete manifestCore.manifestSha256;
  const entriesHaveValidShape = Array.isArray(value?.entries)
    && value.entries.every((entry) =>
      typeof entry?.path === "string"
      && Number.isSafeInteger(entry?.bytes)
      && entry.bytes >= 0
      && DIGEST_PATTERN.test(entry?.sha256 ?? ""));
  const pathSet = entriesHaveValidShape
    ? value.entries.map((entry) => entry.path)
    : [];
  const manifestIntegrityValidated = (
    value?.schemaVersion === "velmere.pass35.a44.source-only-manifest.v1"
    && value?.revisionId === "VELMERE_PASS35_A44_VISUAL_MASTER_ENGINE_BINDING"
    && entriesHaveValidShape
    && Number.isSafeInteger(value?.fileCount)
    && value.fileCount === value.entries.length
    && Number.isSafeInteger(value?.byteLength)
    && value.byteLength === value.entries.reduce((sum, entry) => sum + entry.bytes, 0)
    && new Set(pathSet).size === pathSet.length
    && value?.pathSetSha256 === sha256(pathSet.join("\n"))
    && DIGEST_PATTERN.test(value?.manifestSha256 ?? "")
    && value.manifestSha256 === sha256(canonicalJson(manifestCore))
  );
  const source = {
    path: A44_SOURCE_ONLY_MANIFEST_PATH,
    status: manifestIntegrityValidated
      ? "AVAILABLE_VALIDATED_HISTORICAL_ANCHOR"
      : "INVALID_CONTRACT",
    byteLength: bytes.length,
    sha256: sha256(bytes),
    schemaVersion: value?.schemaVersion ?? null,
    revisionId: value?.revisionId ?? null,
    declaredManifestSha256: DIGEST_PATTERN.test(value?.manifestSha256 ?? "")
      ? value.manifestSha256
      : null,
    manifestIntegrityValidated,
  };
  if (!manifestIntegrityValidated) return { source, entries: new Map() };

  const entries = new Map();
  for (const entry of value.entries) {
    if (
      entry.role !== "CURRENT_CONTROL_METADATA"
      || entries.has(entry.path)
    ) continue;
    entries.set(entry.path, {
      bytes: entry.bytes,
      sha256: entry.sha256,
    });
  }
  return { source, entries };
}

function sourceControlMetadataCompleteness(root, sourcePayloadInventory) {
  const expectedPaths = [...new Set(PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS)].sort(lexical);
  if (expectedPaths.length !== PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS.length) {
    throw new Error("pass35_source_package_control_metadata_denominator_has_duplicates");
  }

  const payloadByPath = new Map(sourcePayloadInventory.map((entry) => [entry.path, entry]));
  const included = expectedPaths
    .filter((filePath) => regularFileExists(root, filePath))
    .map((filePath) => {
      const entry = payloadByPath.get(filePath);
      if (!entry) throw new Error(`pass35_available_control_metadata_not_packaged:${filePath}`);
      return {
        path: filePath,
        byteLength: entry.byteLength,
        sha256: entry.sha256,
      };
    });
  const { source: a44AnchorSource, entries: a44Anchors } = loadA44ControlMetadataAnchors(root);
  const missing = expectedPaths
    .filter((filePath) => !regularFileExists(root, filePath))
    .map((filePath) => ({
      path: filePath,
      a44Anchor: a44Anchors.has(filePath)
        ? {
            sourceManifestPath: A44_SOURCE_ONLY_MANIFEST_PATH,
            bytes: a44Anchors.get(filePath).bytes,
            sha256: a44Anchors.get(filePath).sha256,
          }
        : null,
    }));
  const a44AnchoredMissingCount = missing.filter((entry) => entry.a44Anchor !== null).length;
  const status = missing.length === 0
    ? CONTROL_METADATA_COMPLETE_STATUS
    : CONTROL_METADATA_INCOMPLETE_STATUS;

  return {
    schemaVersion: "velmere.pass35.source-package-control-metadata-completeness.v1",
    status,
    complete: missing.length === 0,
    promotionAllowed: false,
    expectedCount: expectedPaths.length,
    includedCount: included.length,
    missingCount: missing.length,
    expectedPathSetSha256: sha256(expectedPaths.join("\n")),
    includedPathSetSha256: sha256(included.map((entry) => entry.path).join("\n")),
    missingPathSetSha256: sha256(missing.map((entry) => entry.path).join("\n")),
    included,
    missing,
    a44AnchorSource,
    a44AnchoredMissingCount,
    unanchoredMissingCount: missing.length - a44AnchoredMissingCount,
    denominatorScope: {
      id: "PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS",
      note: "This 109-path supplemental packaging metadata denominator is distinct from verify-control-plane.mjs preflight. Its currently missing historical metadata list is broader than the control-plane missing-required-path list, while control-plane separately evaluates a 399-file total required denominator. These counts are not interchangeable.",
    },
    truthBoundary: "Missing metadata is reported by exact path only. A44 bytes and SHA-256 values are historical anchors, not reconstructed file contents, current-file verification, control completeness, external assurance, LIVE evidence, or promotion approval.",
  };
}

function prepareLocalPdfQaSummary(root) {
  const sourceReceiptPaths = [
    PASS35_LOCAL_PDF_QA_RECEIPT_PATH,
    PASS35_LOCAL_PDF_RASTER_RECEIPT_PATH,
  ].sort(lexical);
  const includedSourceReceiptPaths = sourceReceiptPaths.filter((filePath) => regularFileExists(root, filePath));
  const missingSourceReceiptPaths = sourceReceiptPaths.filter((filePath) => !regularFileExists(root, filePath));

  if (missingSourceReceiptPaths.length === 0) {
    buildPass35LocalPdfQaSummary(root);
    return {
      status: "REBUILT_FROM_COMPLETE_SOURCE_RECEIPTS",
      sourceReceiptExpectedCount: sourceReceiptPaths.length,
      sourceReceiptIncludedCount: includedSourceReceiptPaths.length,
      sourceReceiptMissingCount: 0,
      missingSourceReceiptPaths: [],
    };
  }

  if (!regularFileExists(root, PASS35_LOCAL_PDF_QA_SUMMARY_PATH)) {
    throw new Error(`pass35_local_pdf_summary_unavailable_and_source_receipts_incomplete:${missingSourceReceiptPaths.join(",")}`);
  }
  const verification = verifyPass35LocalPdfQaSummary(root, { verifySourceReceiptsWhenPresent: false });
  if (verification.blockers.length > 0) {
    throw new Error(`pass35_existing_local_pdf_summary_invalid:${verification.blockers.join("|")}`);
  }
  return {
    status: "PRESERVED_VERIFIED_COMPACT_SUMMARY_SOURCE_RECEIPTS_INCOMPLETE",
    sourceReceiptExpectedCount: sourceReceiptPaths.length,
    sourceReceiptIncludedCount: includedSourceReceiptPaths.length,
    sourceReceiptMissingCount: missingSourceReceiptPaths.length,
    missingSourceReceiptPaths,
  };
}

function manifest(kind, rows) {
  const core = {
    schemaVersion: `velmere.pass35.${kind.toLowerCase()}-manifest.v1`,
    candidateId: PASS35_CANDIDATE_ID,
    kind,
    fileCount: rows.length,
    byteLength: rows.reduce((sum, entry) => sum + entry.byteLength, 0),
    pathSetSha256: sha256(rows.map((entry) => entry.path).join("\n")),
    aggregateSha256: sha256(canonicalJson(rows.map(({ path: filePath, role, byteLength, sha256: digest, mode }) => ({
      path: filePath,
      role,
      byteLength,
      sha256: digest,
      mode,
    })))),
    entries: rows.map(({ path: filePath, role, byteLength, sha256: digest, mode }) => ({ path: filePath, role, byteLength, sha256: digest, mode })),
    selfReferenceBoundary: "This embedded archive manifest excludes itself. SOURCE_ONLY contains a source-package-scoped canonical manifest set; workspace-only evidence remains in EVIDENCE_HISTORY and is bound by the detached package receipt.",
  };
  return { ...core, manifestSha256: sha256(canonicalJson(core)) };
}

function archiveEntries(root, rows, manifestPath, manifestValue) {
  return [
    ...rows.map((entry) => ({
      path: entry.path,
      content: entry.content ?? readFileSync(path.join(root, entry.path)),
      mode: entry.mode,
    })),
    { path: manifestPath, content: Buffer.from(`${JSON.stringify(manifestValue, null, 2)}\n`), mode: 0o100644 },
  ];
}

export function packagePass35SourceAndEvidence({ rootPath = process.cwd(), outputDir: requestedOutputDir = null } = {}) {
  const root = path.resolve(rootPath);
  const outputDir = path.resolve(requestedOutputDir ?? path.resolve(root, "../deliverables"));
  const relativeOutput = path.relative(root, outputDir);
  if (!relativeOutput.startsWith("..") || path.isAbsolute(relativeOutput)) throw new Error("pass35_output_must_be_outside_source_root");
  mkdirSync(outputDir, { recursive: true });

  const localPdfQaSummaryPreparation = prepareLocalPdfQaSummary(root);
  const inventory = collectPass35Inventory(root);
  if (inventory.unknownCount !== 0) throw new Error(`pass35_unknown_paths_blocked:${inventory.unknownCount}`);
  const sourceInventory = inventory.entries.filter((entry) => entry.sourceIncluded);
  const sourceInventoryPaths = new Set(sourceInventory.map((entry) => entry.path));
  const canonicalManifestPaths = new Set(PASS35_MANIFEST_PATHS);
  const currentControlMetadataPaths = [...new Set(PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS)].sort(lexical);

  const sourceCanonicalSet = buildPass35ManifestSet(root, { profile: PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE });
  const sourceCanonicalBlockers = validatePass35ManifestSet(sourceCanonicalSet, { rootPath: root });
  if (sourceCanonicalBlockers.length) {
    throw new Error(`pass35_source_package_manifest_set_invalid:${sourceCanonicalBlockers.join("|")}`);
  }

  const canonicalManifestInventory = PASS35_MANIFEST_PATHS
    .filter((filePath) => !sourceInventoryPaths.has(filePath))
    .map((filePath) => {
      const content = sourceCanonicalSet.artifacts.get(filePath);
      if (!content) throw new Error(`pass35_source_package_manifest_missing:${filePath}`);
      return metadataEntryFromBytes(
        root,
        filePath,
        "CANONICAL_SOURCE_PACKAGE_METADATA",
        "virtual_package_scoped_manifest_excluded_from_its_own_source_identity",
        content,
      );
    });
  const currentControlMetadataInventory = currentControlMetadataPaths
    .filter((filePath) => !sourceInventoryPaths.has(filePath))
    .filter((filePath) => regularFileExists(root, filePath))
    .map((filePath) => metadataEntryFromDisk(
      root,
      filePath,
      "CURRENT_CONTROL_METADATA",
      "explicit_bundled_control_output_required_for_source_only_offline_audit",
    ));
  const supplementalMetadataPaths = new Set([
    ...canonicalManifestInventory.map((entry) => entry.path),
    ...currentControlMetadataInventory.map((entry) => entry.path),
  ]);
  const embeddedArchiveManifestPaths = new Set([
    "_velmere/PASS35_SOURCE_ONLY_MANIFEST.json",
    "_velmere/PASS35_EVIDENCE_HISTORY_MANIFEST.json",
  ]);
  const sourcePayloadInventory = [...sourceInventory, ...canonicalManifestInventory, ...currentControlMetadataInventory]
    .sort((left, right) => lexical(left.path, right.path));
  const controlMetadataCompleteness = sourceControlMetadataCompleteness(root, sourcePayloadInventory);
  const evidenceInventory = inventory.entries.filter((entry) =>
    !entry.sourceIncluded
    && ["EVIDENCE", "HISTORY", "QUARANTINE"].includes(entry.role)
    && !canonicalManifestPaths.has(entry.path)
    && !supplementalMetadataPaths.has(entry.path)
    && !embeddedArchiveManifestPaths.has(entry.path),
  );
  if (!sourceInventory.length || !evidenceInventory.length) throw new Error("pass35_split_inventory_empty");

  const sourceManifest = manifest("SOURCE_ONLY", sourcePayloadInventory);
  const evidenceManifest = manifest("EVIDENCE_HISTORY", evidenceInventory);
  const sourcePath = path.join(outputDir, "VELMERE_PASS35_OFFLINE_CANDIDATE_SOURCE_ONLY.zip");
  const evidencePath = path.join(outputDir, "VELMERE_PASS35_EVIDENCE_HISTORY.zip");
  const sourceArchive = writeDeterministicZip(
    sourcePath,
    archiveEntries(root, sourcePayloadInventory, "_velmere/PASS35_SOURCE_ONLY_MANIFEST.json", sourceManifest),
    { overwrite: true },
  );
  const evidenceArchive = writeDeterministicZip(
    evidencePath,
    archiveEntries(root, evidenceInventory, "_velmere/PASS35_EVIDENCE_HISTORY_MANIFEST.json", evidenceManifest),
    { overwrite: true },
  );
  const receiptCore = {
    schemaVersion: "velmere.pass35.detached-package-receipt.v2",
    candidateId: PASS35_CANDIDATE_ID,
    generatedAt: JSON.parse(readFileSync(path.join(root, "config/pass35/pre-gates.json"), "utf8")).evaluatedAt,
    status: "PASS_LOCAL_DETERMINISTIC_PACKAGING",
    promotionAllowed: false,
    sourceArchive: {
      fileName: path.basename(sourcePath),
      sha256: sourceArchive.sha256,
      byteLength: sourceArchive.byteLength,
      entryCount: sourceArchive.entryCount,
      manifestSha256: sourceManifest.manifestSha256,
      canonicalManifestProfile: PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE,
      canonicalManifestSetSha256: setDigest(sourceCanonicalSet),
      unpackedSelfVerificationCommand: "npm run pass35:verify-manifests",
      unpackedSelfVerificationExpectedStatus: "PASS_LOCAL_SOURCE_PACKAGE_MANIFEST_SET_NO_PROMOTION",
    },
    evidenceArchive: {
      fileName: path.basename(evidencePath),
      sha256: evidenceArchive.sha256,
      byteLength: evidenceArchive.byteLength,
      entryCount: evidenceArchive.entryCount,
      manifestSha256: evidenceManifest.manifestSha256,
    },
    excludedGeneratedDirectories: inventory.skippedGeneratedDirectories,
    sourceContainsNodeModules: false,
    sourceContainsNextBuild: false,
    sourceContainsHistoricalArtifacts: false,
    sourceContainsRecoveredHistoricalControlMetadata: false,
    historicalControlMetadataVerifiedExact: 0,
    historicalControlMetadataRequiredExact: 2,
    sourceContainsCompleteCurrentSupplementalControlMetadata: true,
    sourceContainsCanonicalManifestSet: true,
    sourcePdfQaSummaryPreparation: localPdfQaSummaryPreparation,
    sourceSupplementalCanonicalMetadata: canonicalManifestInventory.map((entry) => ({
      path: entry.path,
      sha256: entry.sha256,
      byteLength: entry.byteLength,
    })),
    sourceSupplementalControlMetadata: currentControlMetadataInventory.map((entry) => ({
      path: entry.path,
      sha256: entry.sha256,
      byteLength: entry.byteLength,
    })),
    sourceControlMetadataCompleteness: controlMetadataCompleteness,
    organizationalSignature: null,
    independentVerifier: null,
    limitations: [
      "Local deterministic construction is not an independent organizational signature.",
      "SOURCE_ONLY self-verifies its package-scoped canonical manifests and includes the complete 109-path supplemental control metadata denominator recovered as exact A44-bound bytes.",
      "Recovered historical control metadata remains historical evidence; completeness does not make it current runtime, staging, LIVE, legal, customer, sale, or promotion proof.",
      "When full PDF QA source receipts are incomplete, packaging preserves only a structurally verified compact summary and records the exact missing receipt paths; it does not regenerate or infer the omitted evidence.",
      "Evidence history is quarantined from source and must not be used to promote PASS35 without exact source/hash/TTL verification.",
      "Staging, live, legal, provider rights, customer outcomes, and external benchmark are not claimed.",
    ],
  };
  const receipt = { ...receiptCore, receiptSha256: sha256(canonicalJson(receiptCore)) };
  const receiptPath = path.join(outputDir, "PASS35_DETACHED_PACKAGE_RECEIPT.json");
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  return { receipt, receiptPath, sourcePath, evidencePath };
}

function isMain() {
  return process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href;
}

if (isMain()) {
  try {
    const outputDir = path.resolve(arg("--output-dir", path.resolve(process.cwd(), "../deliverables")));
    console.log(JSON.stringify(packagePass35SourceAndEvidence({ rootPath: process.cwd(), outputDir }).receipt, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      status: "FAIL_PASS35_PACKAGING",
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  }
}
