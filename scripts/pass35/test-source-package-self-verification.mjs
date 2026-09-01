#!/usr/bin/env node
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { parseDeterministicZip } from "../pass4826/release-package-contract.mjs";
import { packagePass35SourceAndEvidence } from "./package-source-and-evidence.mjs";
import { verifyPass35LocalPdfQaSummary } from "./local-pdf-qa-summary.mjs";
import {
  PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS,
  canonicalJson,
  sha256,
} from "./source-inventory.mjs";
import { verifyCanonicalPass35ManifestSet } from "./verify-release-manifests.mjs";

const root = process.cwd();
const temporaryRoot = path.join(tmpdir(), `velmere-pass35-source-self-verify-${process.pid}-${Date.now()}`);
const outputDir = path.join(temporaryRoot, "deliverables");
const extractedRoot = path.join(temporaryRoot, "source");
const CONTROL_PLANE_RECEIPT_PATH = "_velmere/pass35/PASS35_CONTROL_PLANE_RECEIPT.json";
const CONTROL_METADATA_COMPLETE_STATUS = "COMPLETE_SOURCE_PACKAGE_CONTROL_METADATA";
const EXPECTED_PACKAGING_CONTROL_METADATA = 109;
const EXPECTED_INCLUDED_PACKAGING_CONTROL_METADATA = 109;
const EXPECTED_MISSING_PACKAGING_CONTROL_METADATA = 0;
const EXPECTED_CONTROL_PLANE_REQUIRED_FILES = 399;
const EXPECTED_CONTROL_PLANE_MISSING_FILES = 0;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/u;
let assertionCount = 0;
mkdirSync(outputDir, { recursive: true });
mkdirSync(extractedRoot, { recursive: true });

function equal(actual, expected, message) {
  assertionCount += 1;
  assert.equal(actual, expected, message);
}

function deepEqual(actual, expected, message) {
  assertionCount += 1;
  assert.deepEqual(actual, expected, message);
}

function ok(value, message) {
  assertionCount += 1;
  assert.ok(value, message);
}

function assertPackagingControlMetadataCompleteness(receipt) {
  const completeness = receipt.sourceControlMetadataCompleteness;
  equal(receipt.status, "PASS_LOCAL_DETERMINISTIC_PACKAGING");
  equal(receipt.promotionAllowed, false);
  equal(completeness?.status, CONTROL_METADATA_COMPLETE_STATUS);
  equal(completeness?.complete, true);
  equal(completeness?.promotionAllowed, false);
  equal(completeness?.expectedCount, EXPECTED_PACKAGING_CONTROL_METADATA);
  equal(completeness?.includedCount, EXPECTED_INCLUDED_PACKAGING_CONTROL_METADATA);
  equal(completeness?.missingCount, EXPECTED_MISSING_PACKAGING_CONTROL_METADATA);
  equal(completeness?.included?.length, EXPECTED_INCLUDED_PACKAGING_CONTROL_METADATA);
  equal(completeness?.missing?.length, EXPECTED_MISSING_PACKAGING_CONTROL_METADATA);
  deepEqual(completeness.missing, []);
  equal(completeness.a44AnchoredMissingCount, 0);
  equal(completeness.unanchoredMissingCount, 0);
  deepEqual(
    completeness.included,
    receipt.sourceSupplementalControlMetadata,
    "receipt control metadata rows must match the reported included set",
  );
  equal(completeness.missingPathSetSha256, sha256(""));
  ok(completeness.denominatorScope?.note?.includes("399-file total required denominator"));
  const pdfPreparation = receipt.sourcePdfQaSummaryPreparation;
  equal(pdfPreparation?.sourceReceiptExpectedCount, 2);
  equal(
    pdfPreparation.sourceReceiptIncludedCount + pdfPreparation.sourceReceiptMissingCount,
    pdfPreparation.sourceReceiptExpectedCount,
  );
  deepEqual(
    pdfPreparation.missingSourceReceiptPaths,
    [...pdfPreparation.missingSourceReceiptPaths].sort(),
  );
  ok(
    (pdfPreparation.status === "REBUILT_FROM_COMPLETE_SOURCE_RECEIPTS"
      && pdfPreparation.sourceReceiptMissingCount === 0)
    || (pdfPreparation.status === "PRESERVED_VERIFIED_COMPACT_SUMMARY_SOURCE_RECEIPTS_INCOMPLETE"
      && pdfPreparation.sourceReceiptMissingCount > 0),
  );
  const receiptCore = { ...receipt };
  delete receiptCore.receiptSha256;
  equal(receipt.receiptSha256, sha256(canonicalJson(receiptCore)));
}

function assertUnpackedControlMetadataDenominator(targetRoot) {
  const expectedPaths = [...new Set(PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS)].sort();
  const includedPaths = expectedPaths.filter((filePath) => existsSync(path.join(targetRoot, filePath)));
  const missingPaths = expectedPaths.filter((filePath) => !existsSync(path.join(targetRoot, filePath)));
  equal(expectedPaths.length, EXPECTED_PACKAGING_CONTROL_METADATA);
  equal(includedPaths.length, EXPECTED_INCLUDED_PACKAGING_CONTROL_METADATA);
  equal(missingPaths.length, EXPECTED_MISSING_PACKAGING_CONTROL_METADATA);
  deepEqual(missingPaths, [...missingPaths].sort());
  return { expectedPaths, includedPaths, missingPaths };
}

function runUnpackedChecks(targetRoot, { simulatePortableModes = false } = {}) {
  const manifestResult = verifyCanonicalPass35ManifestSet(targetRoot);
  equal(manifestResult.manifestProfile, "source-package");
  equal(manifestResult.status, "PASS_LOCAL_SOURCE_PACKAGE_MANIFEST_SET_NO_PROMOTION");
  deepEqual(manifestResult.blockers, []);
  const packagingControlMetadata = assertUnpackedControlMetadataDenominator(targetRoot);

  if (simulatePortableModes) {
    const embeddedManifest = JSON.parse(readFileSync(path.join(targetRoot, "_velmere/PASS35_SOURCE_ONLY_MANIFEST.json"), "utf8"));
    for (const entry of embeddedManifest.entries) chmodSync(path.join(targetRoot, entry.path), 0o644);
    chmodSync(path.join(targetRoot, "_velmere/PASS35_SOURCE_ONLY_MANIFEST.json"), 0o644);
    const portableModeResult = verifyCanonicalPass35ManifestSet(targetRoot);
    equal(portableModeResult.status, "PASS_LOCAL_SOURCE_PACKAGE_MANIFEST_SET_NO_PROMOTION");
    deepEqual(portableModeResult.blockers, []);
  }

  const pdfSummaryResult = verifyPass35LocalPdfQaSummary(targetRoot);
  equal(pdfSummaryResult.status, "PASS_LOCAL_PDF_QA_SUMMARY_NO_PROMOTION");
  deepEqual(pdfSummaryResult.blockers, []);

  const controlPlane = spawnSync(process.execPath, ["scripts/pass35/verify-control-plane.mjs"], {
    cwd: targetRoot,
    encoding: "utf8",
    timeout: 120_000,
  });
  equal(controlPlane.error, undefined, controlPlane.error?.message);
  equal(controlPlane.signal, null, controlPlane.stderr || controlPlane.stdout);
  equal(controlPlane.status, 0, controlPlane.stderr || controlPlane.stdout);
  const controlResult = JSON.parse(controlPlane.stdout);
  equal(controlResult.status, "PASS_STATIC_CONTROLS");
  equal(controlResult.passed, controlResult.checkCount);
  equal(controlResult.failed.length, 0);
  ok(controlResult.checkCount >= EXPECTED_CONTROL_PLANE_REQUIRED_FILES);

  const controlReceipt = JSON.parse(readFileSync(path.join(targetRoot, CONTROL_PLANE_RECEIPT_PATH), "utf8"));
  equal(controlReceipt.status, "PASS_STATIC_CONTROLS");
  equal(controlReceipt.manifestProfile, "source-package");
  equal(controlReceipt.promotionAllowed, false);
  equal(controlReceipt.failedCount, 0);
  equal(controlReceipt.missingRequiredFileCount, EXPECTED_CONTROL_PLANE_MISSING_FILES);
  equal(controlReceipt.passedCount, controlReceipt.checkCount);
  ok(controlReceipt.checkCount >= EXPECTED_CONTROL_PLANE_REQUIRED_FILES);
  equal(controlReceipt.receiptSha256, sha256(JSON.stringify(Object.fromEntries(Object.entries(controlReceipt).filter(([key]) => key !== "receiptSha256")))));

  const afterControlPlane = verifyCanonicalPass35ManifestSet(targetRoot);
  equal(afterControlPlane.status, "PASS_LOCAL_SOURCE_PACKAGE_MANIFEST_SET_NO_PROMOTION");
  deepEqual(afterControlPlane.blockers, []);
  return { manifestResult, controlResult, controlReceipt, packagingControlMetadata, controlPlaneExitCode: controlPlane.status };
}

try {
  const currentManifest = verifyCanonicalPass35ManifestSet(root);
  let sourceArchiveSha256 = null;
  let embeddedSourceOnlyManifestSha256 = null;
  let sourceEntries = null;
  let packagingConstructionExecuted = false;
  let checks;

  if (currentManifest.manifestProfile === "source-package") {
    // SOURCE_ONLY must be self-verifiable without the omitted PDF corpus or
    // EVIDENCE_HISTORY. The compact PDF QA summary is the explicit binding.
    const embeddedBytes = readFileSync(path.join(root, "_velmere/PASS35_SOURCE_ONLY_MANIFEST.json"));
    embeddedSourceOnlyManifestSha256 = sha256(embeddedBytes);
    sourceEntries = JSON.parse(embeddedBytes.toString("utf8")).entries.length + 1;
    checks = runUnpackedChecks(root, { simulatePortableModes: false });
  } else {
    const packaged = packagePass35SourceAndEvidence({ rootPath: root, outputDir });
    packagingConstructionExecuted = true;
    equal(packaged.receipt.sourceArchive.canonicalManifestProfile, "source-package");
    equal(packaged.receipt.sourceArchive.unpackedSelfVerificationExpectedStatus, "PASS_LOCAL_SOURCE_PACKAGE_MANIFEST_SET_NO_PROMOTION");
    assertPackagingControlMetadataCompleteness(packaged.receipt);

    const archive = parseDeterministicZip(packaged.sourcePath);
    for (const entry of archive.entries) {
      const target = path.join(extractedRoot, entry.path);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, entry.content, { mode: entry.mode & 0o777 });
    }
    sourceArchiveSha256 = packaged.receipt.sourceArchive.sha256;
    sourceEntries = archive.entries.length;
    checks = runUnpackedChecks(extractedRoot, { simulatePortableModes: true });
  }

  if (sourceArchiveSha256 !== null) ok(DIGEST_PATTERN.test(sourceArchiveSha256), "source archive digest must be SHA-256");
  if (embeddedSourceOnlyManifestSha256 !== null) ok(DIGEST_PATTERN.test(embeddedSourceOnlyManifestSha256), "embedded manifest digest must be SHA-256");
  console.log(JSON.stringify({
    status: "PASS_PACKAGING_SELF_AUDIT_WITH_COMPLETE_CONTROL_METADATA",
    packagingSelfAuditPassed: true,
    controlMetadataComplete: true,
    assertions: assertionCount,
    packagingConstructionExecuted,
    sourceArchiveSha256,
    embeddedSourceOnlyManifestSha256,
    sourceEntries,
    manifestProfile: checks.manifestResult.manifestProfile,
    packagingControlMetadata: {
      expected: EXPECTED_PACKAGING_CONTROL_METADATA,
      included: EXPECTED_INCLUDED_PACKAGING_CONTROL_METADATA,
      missing: EXPECTED_MISSING_PACKAGING_CONTROL_METADATA,
    },
    controlPlanePreflight: {
      status: checks.controlReceipt.status,
      processExitCode: checks.controlPlaneExitCode,
      required: checks.controlReceipt.requiredFileCount,
      present: checks.controlReceipt.passedCount,
      missing: checks.controlReceipt.missingRequiredFileCount,
    },
    truthBoundary: "PASS means deterministic packaging, canonical SOURCE_ONLY manifest self-audit, the complete current 109-path supplemental metadata denominator and the complete 399-file static control-plane denominator succeeded. Historical exact recovery remains 0/2 under A61; current supplemental metadata completeness is not proof that historical bytes were recovered. This is not current runtime, signature, independent verification, staging, LIVE, legal, customer, sale, or promotion evidence.",
  }, null, 2));
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
