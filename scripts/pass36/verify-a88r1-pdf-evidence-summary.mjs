#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

const INDEX_PATH = "config/pass36/a88r1-physical-pdf-evidence-retention-index.json";
const REVISION = "VELMERE_PASS36_A88R1_SEMANTIC_GENERALIZATION_ROUTE_EXECUTION_PRIVACY_AND_PDF_EVIDENCE_RETENTION";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
add("revision", index.revisionId === REVISION, index.revisionId);
add("mode", index.retentionMode === "PHYSICAL_SYNTHETIC_FILES_IN_MATERIALS_HASH_BOUND_FROM_SOURCE_ONLY" && index.sourceOnlyIncludesPhysicalPdfs === false && index.materialsMustIncludePhysicalPdfs === true, index.retentionMode);
add("denominator", index.corpus?.pdfCount === 450 && index.corpus?.pageCount === 2100 && index.corpus?.caseCount === 50 && index.corpus?.byLocale?.pl === 150 && index.corpus?.byLocale?.en === 150 && index.corpus?.byLocale?.de === 150 && index.corpus?.byTier?.basic === 150 && index.corpus?.byTier?.pro === 150 && index.corpus?.byTier?.advanced === 150, index.corpus);
add("qa", index.qa?.pdfCount === 450 && index.qa?.renderedPageCount === 2100 && index.qa?.blankPages === 0 && index.qa?.pagesTouchingRasterEdge === 0 && index.qa?.pypdfPassed === 450 && index.qa?.pdfinfoPassed === 450 && index.qa?.pdftotextPassed === 450 && index.qa?.localeMarkerPassed === 450 && index.qa?.ghostscriptSamplePassed === 45 && index.qa?.failedDocuments === 0, index.qa);
add("contacts", Array.isArray(index.bindings?.contactSheets) && index.bindings.contactSheets.length === 9, index.bindings?.contactSheets?.length);
const physicalBindings = [index.bindings?.manifest, index.bindings?.qaReceipt, index.bindings?.runtimeReceipt].filter(Boolean);
const presence = physicalBindings.map((row) => fs.existsSync(row.sourcePath));
const allPresent = presence.every(Boolean);
const nonePresent = presence.every((value) => !value);
add("presence:all-or-none", allPresent || nonePresent, presence);
if (allPresent) {
  for (const row of physicalBindings) {
    const bytes = fs.readFileSync(row.sourcePath);
    add(`binding:${row.sourcePath}`, bytes.length === row.byteLength && sha256(bytes) === row.sha256, { bytes: bytes.length, expectedBytes: row.byteLength, sha256: sha256(bytes), expectedSha256: row.sha256 });
  }
}
add("truth:no-promotion", index.truthBoundary?.realCustomerPdfCount === 0 && index.truthBoundary?.productionBrowserRuns === 0 && index.truthBoundary?.secureCustomerDeliveries === 0 && index.truthBoundary?.externalAccessibilityValidations === 0 && index.truthBoundary?.customerComprehensionLabels === 0 && index.truthBoundary?.paidGateEligible === false && index.truthBoundary?.liveProven === false && index.truthBoundary?.saleEnabled === false, index.truthBoundary);
// Integrity is recomputed with Python's recursive canonical JSON in the pass test. Here require shape/algorithm/non-empty digest.
add("integrity:declared", index.integrity?.algorithm === "sha256" && /^[a-f0-9]{64}$/.test(index.integrity?.digest ?? ""), index.integrity);
const failed = checks.filter((row) => !row.passed);
const verdict = {
  schemaVersion: "velmere.pass36.a88r1.pdf-evidence-summary-verifier.v1",
  revisionId: REVISION,
  status: failed.length ? "FAIL_A88R1_PDF_EVIDENCE_SUMMARY" : allPresent ? "PASS_A88R1_PDF_FULL_LOCAL_BINDING" : "PASS_A88R1_PDF_SOURCE_SUMMARY_BOUND_MATERIALS_REQUIRED",
  physicalMaterialsPresent: allPresent,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  liveProven: false,
  saleEnabled: false,
};
console.log(JSON.stringify(verdict, null, 2));
if (failed.length) process.exit(1);
