#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const A83_REVISION = "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY";
const R44P44_REVISION = "VELMERE_PASS36_A102R44P44_ACTION_REQUIRED_BRUTAL_PRODUCT_REALITY_50_CONTRACT_ANGEL120_PERSONA100_FULL_QA_TEST_CYCLE_3_OF_3_NO_LIVE_CREDIT";
const R44P46_REVISION = "VELMERE_PASS36_A102R44P46_ACTION_REQUIRED_LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE_NO_LIVE_CREDIT";

const canonical = (value) => Array.isArray(value)
  ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const sha256 = (value) => crypto.createHash("sha256").update(Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : canonical(value), "utf8")).digest("hex");
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const readJson = (absolutePath) => JSON.parse(fs.readFileSync(absolutePath, "utf8"));
const sourcePath = (relativePath) => path.join(root, ...relativePath.split("/"));
const sourceRecord = (relativePath) => {
  const bytes = fs.readFileSync(sourcePath(relativePath));
  return { path: relativePath, byteLength: bytes.length, sha256: sha256(bytes), value: JSON.parse(bytes.toString("utf8")) };
};
const externalRecord = (absolutePath, materialsRelativePath, artifactPath) => {
  const bytes = fs.readFileSync(absolutePath);
  return { path: artifactPath, materialsRelativePath, byteLength: bytes.length, sha256: sha256(bytes), value: JSON.parse(bytes.toString("utf8")) };
};

function parseArgs(argv) {
  const result = { historicalMaterialsRoot: null, finalRcEvidenceRoot: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--historical-materials-root") result.historicalMaterialsRoot = path.resolve(argv[++index]);
    else if (argv[index] === "--final-rc-evidence-root") result.finalRcEvidenceRoot = path.resolve(argv[++index]);
    else throw new Error(`a83_summary_unknown_argument:${argv[index]}`);
  }
  assert(!(result.historicalMaterialsRoot && result.finalRcEvidenceRoot), "a83_summary_evidence_modes_conflict");
  return result;
}

function manifestProjection(manifest) {
  return manifest.value.entries.map((entry) => ({
    entryId: entry.entryId,
    path: entry.path,
    byteLength: entry.byteLength,
    pdfSha256: entry.pdfSha256,
    pageCount: entry.pageCount,
    reportDigest: entry.reportDigest,
    renderBindingDigest: entry.renderBindingDigest,
  }));
}

function rasterProjection(raster) {
  return raster.value.documents.map((document) => ({
    entryId: document.entryId,
    pdfSha256: document.pdfSha256,
    pageCount: document.pageCount,
    checksPassed: document.checksPassed,
    pageRasterDigest: sha256(document.pages.map((page) => ({
      page: page.page,
      pngSha256: page.pngSha256,
      blank: page.blank,
      touchesRasterEdge: page.touchesRasterEdge,
    }))),
  }));
}

function manifestSummary(manifest, evidenceState) {
  return {
    path: manifest.path,
    ...(manifest.materialsRelativePath ? { materialsRelativePath: manifest.materialsRelativePath } : {}),
    byteLength: manifest.byteLength,
    sha256: manifest.sha256,
    integrityDigest: manifest.value.integrity.digest,
    entryCount: manifest.value.entries.length,
    totals: manifest.value.totals,
    entryBindingDigest: sha256(manifestProjection(manifest)),
    aggregatePdfByteLength: manifest.value.entries.reduce((sum, entry) => sum + entry.byteLength, 0),
    evidenceState,
  };
}

function rasterSummary(raster, evidenceState) {
  return {
    path: raster.path,
    ...(raster.materialsRelativePath ? { materialsRelativePath: raster.materialsRelativePath } : {}),
    byteLength: raster.byteLength,
    sha256: raster.sha256,
    status: raster.value.status,
    pdfCount: raster.value.pdfCount,
    renderedPageCount: raster.value.renderedPageCount,
    blankPages: raster.value.blankPages,
    pagesTouchingRasterEdge: raster.value.pagesTouchingRasterEdge,
    pypdfPassed: raster.value.pypdfPassed,
    pdfinfoPassed: raster.value.pdfinfoPassed,
    pdftotextPassed: raster.value.pdftotextPassed,
    localeMarkerPassed: raster.value.localeMarkerPassed,
    ghostscriptSamplePassed: raster.value.ghostscriptSamplePassed,
    failedDocuments: raster.value.failedDocuments,
    rasterBindingDigest: sha256(rasterProjection(raster)),
    contactSheetDigest: sha256(raster.value.contactSheets),
    evidenceState,
  };
}

function runtimeSummary(runtime, evidenceState) {
  return {
    path: runtime.path,
    ...(runtime.materialsRelativePath ? { materialsRelativePath: runtime.materialsRelativePath } : {}),
    byteLength: runtime.byteLength,
    sha256: runtime.sha256,
    status: runtime.value.status,
    manifestSha256: runtime.value.manifestSha256,
    manifestIntegrityDigest: runtime.value.manifestIntegrityDigest,
    evidenceState,
  };
}

function receiptSummary(receipt, evidenceState) {
  return {
    path: receipt.path,
    byteLength: receipt.byteLength,
    sha256: receipt.sha256,
    status: receipt.value.status,
    checks: receipt.value.summary?.checks,
    passed: receipt.value.summary?.passed,
    failed: receipt.value.summary?.failed,
    manifestIntegrityDigest: receipt.value.manifestIntegrityDigest,
    evidenceState,
  };
}

function assertCoreEvidence(policy, receipt, manifest, raster, runtime) {
  assert(policy.revisionId === A83_REVISION, "a83_summary_policy_revision");
  assert(manifest.value.revisionId === policy.revisionId && manifest.value.entries?.length === 450, "a83_summary_manifest_denominator");
  assert(manifest.value.integrity?.digest === receipt.value.manifestIntegrityDigest, "a83_summary_manifest_receipt_binding");
  assert(manifest.value.totals?.physicalPdfs === 450 && manifest.value.totals?.renderedPages === 2100 && manifest.value.totals?.channelProjections === 2700 && manifest.value.totals?.semanticMutations === 8100 && manifest.value.totals?.mutationKilled === 8100, "a83_summary_manifest_totals");
  assert(raster.value.status === "PASS_A83_PDF_RASTER_AND_EXTERNAL_PARSE_QA" && raster.value.pdfCount === 450 && raster.value.renderedPageCount === 2100 && raster.value.blankPages === 0 && raster.value.pagesTouchingRasterEdge === 0, "a83_summary_raster_status");
  assert(raster.value.pypdfPassed === 450 && raster.value.pdfinfoPassed === 450 && raster.value.pdftotextPassed === 450 && raster.value.localeMarkerPassed === 450 && raster.value.ghostscriptSamplePassed === 45 && raster.value.failedDocuments === 0, "a83_summary_raster_parsers");
  assert(runtime.value.status === "PASS_A83_SYNTHETIC_PHYSICAL_PDF_CORPUS_NO_REAL_CREDIT" && runtime.value.manifestSha256 === manifest.sha256 && runtime.value.manifestIntegrityDigest === manifest.value.integrity.digest, "a83_summary_runtime_binding");
  assert(receipt.value.status === "PASS_A83_LOCAL_SYNTHETIC_PHYSICAL_PDF_MATRIX_ONLY" && receipt.value.summary?.failed === 0, "a83_summary_test_receipt");
}

function executionTruth() {
  return {
    localSyntheticPhysicalMatrixExecutedHistorically: true,
    physicalCustomerPdfMatrixExecuted: false,
    realPacketsVerified: 0,
    productionBrowserRuns: 0,
    secureCustomerDeliveries: 0,
    externalAccessibilityValidations: 0,
    customerComprehensionLabels: 0,
    customerPurchaseWorthinessProven: false,
    paidGateEligible: false,
    liveProven: false,
    saleEnabled: false,
  };
}

function buildHistoricalSummary(policy, receipt, historicalRoot) {
  assert(historicalRoot && fs.statSync(historicalRoot).isDirectory(), "a83_historical_materials_root_missing");
  const record = (relativePath, artifactPath) => externalRecord(path.join(historicalRoot, ...relativePath.split("/")), `04_PDF/${relativePath}`, artifactPath);
  const manifest = record("RUN1/manifest.json", policy.corpusOutput.manifestPath);
  const raster = record("RUN1/qa.json", policy.corpusOutput.rasterReceiptPath);
  const runtime = record("ORCHESTRATION_LOGS/GENERATE_RUN1.stdout.log", policy.corpusOutput.runtimePath);
  const run2Manifest = record("RUN2_VERIFICATION_ONLY/manifest.json", policy.corpusOutput.manifestPath);
  const run2Raster = record("RUN2_VERIFICATION_ONLY/qa.json", policy.corpusOutput.rasterReceiptPath);
  const determinism = record("R44P44_PDF_DETERMINISM_FINAL.json", "materials/04_PDF/R44P44_PDF_DETERMINISM_FINAL.json");
  const run1Sums = fs.readFileSync(path.join(historicalRoot, "RUN1/SHA256SUMS.txt"));
  const run2Sums = fs.readFileSync(path.join(historicalRoot, "RUN2_VERIFICATION_ONLY/SHA256SUMS.txt"));
  const sumRows = run1Sums.toString("utf8").trim().split("\n");
  assert(manifest.sha256 === run2Manifest.sha256 && raster.sha256 === run2Raster.sha256 && run1Sums.equals(run2Sums), "a83_historical_two_run_identity");
  assert(sumRows.length === 450 && determinism.value.status === "PASS" && determinism.value.byteIdentical === true && determinism.value.matched === 450 && determinism.value.mismatches?.length === 0, "a83_historical_determinism_receipt");
  assertCoreEvidence(policy, receipt, manifest, raster, runtime);
  const core = {
    schemaVersion: "velmere.pass36.a83.source-evidence-summary.v2",
    revisionId: A83_REVISION,
    currentSourceRevisionId: R44P46_REVISION,
    evidenceAsOfRevisionId: R44P44_REVISION,
    generatedAt: policy.deterministicEpoch,
    status: "STALE_A83_HISTORICAL_EVIDENCE_BOUND_CURRENT_R46_FINAL_RC_REQUIRED",
    evidenceClass: "STALE",
    evidenceMode: "HISTORICAL_R44P44_RECEIPT_BINDING_PDF_BYTES_NOT_RETAINED",
    sourceSummaryPath: policy.corpusOutput.sourceSummaryPath,
    corpusManifest: manifestSummary(manifest, "STALE"),
    rasterQaReceipt: rasterSummary(raster, "STALE"),
    fixtureRuntime: runtimeSummary(runtime, "STALE"),
    testReceipt: receiptSummary(receipt, "STALE"),
    historicalParentEvidence: {
      authorityRole: "HISTORICAL_PARENT_EVIDENCE",
      sourceRevisionId: R44P44_REVISION,
      run1ManifestSha256: manifest.sha256,
      run2ManifestSha256: run2Manifest.sha256,
      run1RasterReceiptSha256: raster.sha256,
      run2RasterReceiptSha256: run2Raster.sha256,
      runtimeReceiptSha256: runtime.sha256,
      determinismReceiptSha256: determinism.sha256,
      checksumListSha256: sha256(run1Sums),
      checksumRows: sumRows.length,
      sameManifestBytes: true,
      sameRasterReceiptBytes: true,
      samePdfPathAndHashSet: true,
      retainedPhysicalPdfBytes: false,
      independentFullReplayFromRetainedMaterials: false,
    },
    negativeEvidence: {
      initialExactVerifierStatus: "FAIL_A83_BROWSER_LENS_PDF_MATRIX",
      initialExactVerifierChecks: 31,
      initialExactVerifierPassed: 25,
      initialExactVerifierFailed: 6,
      staleSummaryReceiptSha256: "3da6d48ec19bf4d55295cfacbb0d3285d68f1737b1391d13242757e88e4a5942",
      currentReceiptSha256: receipt.sha256,
      staleSummaryManifestIntegrityDigest: "7c533525ad2bebae7afaa71c47d3d65590523ed70705e5e2c9409da257f7e354",
      currentReceiptManifestIntegrityDigest: receipt.value.manifestIntegrityDigest,
      failureIds: ["summary:test-receipt", "authority:plane", "program:revision", "program:a83", "program:evidence", "program:remaining"],
      historyRetained: true,
    },
    currentSourceExecution: {
      exactR46PdfFinalRcExecuted: false,
      twoRunDeterminismProven: false,
      physicalPdfsVerified: 0,
      renderedPagesVerified: 0,
      g11ClosureEligible: false,
      finalRcRerunRequired: true,
    },
    fullEvidenceRequiredForIndependentReplay: true,
    fullEvidenceExpectedInSourceOnly: false,
    fullEvidenceCurrentlyAvailableForIndependentReplay: false,
    executionTruth: executionTruth(),
    truthBoundary: "This SOURCE_ONLY summary binds the retained R44P44 A83 manifest, raster/parser receipt, runtime stdout, semantic receipt, checksum set and two-run determinism receipt as STALE historical evidence. The retained materials do not include all 450 PDF bytes, and no exact R44P46 final-RC PDF execution is credited. G11 remains OPEN until a fresh complete two-run R44P46 corpus is executed and bound. This grants no real-packet, customer, production-browser, LIVE or sale credit.",
  };
  return { ...core, integrity: { algorithm: "sha256", digest: sha256(core) } };
}

function buildCurrentArtifactSummary(policy, receipt) {
  const manifest = sourceRecord(policy.corpusOutput.manifestPath);
  const raster = sourceRecord(policy.corpusOutput.rasterReceiptPath);
  const runtime = sourceRecord(policy.corpusOutput.runtimePath);
  assertCoreEvidence(policy, receipt, manifest, raster, runtime);
  const core = {
    schemaVersion: "velmere.pass36.a83.source-evidence-summary.v2",
    revisionId: A83_REVISION,
    currentSourceRevisionId: R44P46_REVISION,
    evidenceAsOfRevisionId: R44P46_REVISION,
    generatedAt: policy.deterministicEpoch,
    status: "PASS_A83_CURRENT_LOCAL_CORPUS_BOUND_FINAL_TWO_RUN_RECEIPT_STILL_REQUIRED",
    evidenceClass: "TESTED_LOCAL_REAL_EXECUTION",
    evidenceMode: "CURRENT_LOCAL_MATERIALS_HASH_BOUND_SOURCE_SUMMARY",
    sourceSummaryPath: policy.corpusOutput.sourceSummaryPath,
    corpusManifest: manifestSummary(manifest, "TESTED_LOCAL_REAL_EXECUTION"),
    rasterQaReceipt: rasterSummary(raster, "TESTED_LOCAL_REAL_EXECUTION"),
    fixtureRuntime: runtimeSummary(runtime, "TESTED_LOCAL_REAL_EXECUTION"),
    testReceipt: receiptSummary(receipt, "TESTED_LOCAL_REAL_EXECUTION"),
    currentSourceExecution: {
      exactR46PdfCorpusExecuted: true,
      twoRunDeterminismProven: false,
      physicalPdfsVerified: 450,
      renderedPagesVerified: 2100,
      g11ClosureEligible: false,
      finalTwoRunReceiptRequired: true,
    },
    fullEvidenceRequiredForIndependentReplay: true,
    fullEvidenceExpectedInSourceOnly: false,
    fullEvidenceCurrentlyAvailableForIndependentReplay: true,
    executionTruth: executionTruth(),
    truthBoundary: "This summary binds one current local R44P46 A83 corpus execution. A separate two-run final-RC identity receipt is still mandatory before G11 can close. It grants no real-packet, customer, production-browser, LIVE or sale credit.",
  };
  return { ...core, integrity: { algorithm: "sha256", digest: sha256(core) } };
}

function buildFinalRcSummary(policy, sourceReceipt, finalRoot) {
  assert(finalRoot && fs.statSync(finalRoot).isDirectory(), "a83_final_rc_evidence_root_missing");
  const record = (relativePath, artifactPath) => externalRecord(
    path.join(finalRoot, ...relativePath.split("/")),
    `qa/pdf-final-rc/${relativePath}`,
    artifactPath,
  );
  const twoRun = record("R44P46_A83_FINAL_RC_TWO_RUN_RECEIPT.json", "materials/qa/pdf-final-rc/R44P46_A83_FINAL_RC_TWO_RUN_RECEIPT.json");
  const font = record("FONT_RECOVERY_PROVENANCE.json", "materials/qa/pdf-final-rc/FONT_RECOVERY_PROVENANCE.json");
  const run1 = {
    result: record("RUN1/RUN_RESULT.json", "materials/qa/pdf-final-rc/RUN1/RUN_RESULT.json"),
    manifest: record("RUN1/CORPUS_MANIFEST.json", policy.corpusOutput.manifestPath),
    raster: record("RUN1/RASTER_QA_RECEIPT.json", policy.corpusOutput.rasterReceiptPath),
    runtime: record("RUN1/FIXTURE_RUNTIME.json", policy.corpusOutput.runtimePath),
    semantic: record("RUN1/SEMANTIC_TEST_RECEIPT.json", "config/pass36/a83-test-receipt.json"),
    pdfRows: record("RUN1/PDF_SHA256_ROWS.json", "materials/qa/pdf-final-rc/RUN1/PDF_SHA256_ROWS.json"),
  };
  const run2 = {
    result: record("RUN2/RUN_RESULT.json", "materials/qa/pdf-final-rc/RUN2/RUN_RESULT.json"),
    manifest: record("RUN2/CORPUS_MANIFEST.json", policy.corpusOutput.manifestPath),
    raster: record("RUN2/RASTER_QA_RECEIPT.json", policy.corpusOutput.rasterReceiptPath),
    runtime: record("RUN2/FIXTURE_RUNTIME.json", policy.corpusOutput.runtimePath),
    semantic: record("RUN2/SEMANTIC_TEST_RECEIPT.json", "config/pass36/a83-test-receipt.json"),
    pdfRows: record("RUN2/PDF_SHA256_ROWS.json", "materials/qa/pdf-final-rc/RUN2/PDF_SHA256_ROWS.json"),
  };
  const missingFontFailures = ["RUN1", "RUN2"].map((label) => record(
    `${label}_INITIAL_MISSING_FONT_FAIL/04_generate_450_pdfs.receipt.json`,
    `materials/qa/pdf-final-rc/${label}_INITIAL_MISSING_FONT_FAIL/04_generate_450_pdfs.receipt.json`,
  ));
  assertCoreEvidence(policy, sourceReceipt, run1.manifest, run1.raster, run1.runtime);
  assert(run1.semantic.sha256 === sourceReceipt.sha256, "a83_final_rc_source_semantic_receipt_bytes");
  assert(run1.manifest.sha256 === run2.manifest.sha256, "a83_final_rc_manifest_byte_identity");
  assert(run1.raster.sha256 === run2.raster.sha256, "a83_final_rc_raster_receipt_byte_identity");
  assert(run1.runtime.sha256 === run2.runtime.sha256, "a83_final_rc_runtime_byte_identity");
  assert(run1.semantic.sha256 === run2.semantic.sha256, "a83_final_rc_semantic_receipt_byte_identity");
  assert(canonical(run1.pdfRows.value) === canonical(run2.pdfRows.value) && run1.pdfRows.value.length === 450, "a83_final_rc_pdf_rows_identity");
  assert(run1.result.value.pass === true && run2.result.value.pass === true, "a83_final_rc_clone_results");
  assert(run1.result.value.pdfCount === 450 && run2.result.value.pdfCount === 450 && run1.result.value.totals?.renderedPages === 2100 && run2.result.value.totals?.renderedPages === 2100, "a83_final_rc_clone_denominators");
  assert(twoRun.value.pass === true && twoRun.value.status === "PASS_A83_R44P46_FINAL_RC_TWO_DISPOSABLE_CLONES_BYTE_IDENTICAL" && twoRun.value.g11ClosureEligible === true, "a83_final_rc_two_run_status");
  assert(twoRun.value.denominators?.physicalPdfsTotal === 900 && twoRun.value.denominators?.renderedPagesTotal === 4200 && twoRun.value.denominators?.completePdfByteComparisons === 450 && twoRun.value.denominators?.completePageRasterComparisons === 2100, "a83_final_rc_two_run_denominators");
  assert(twoRun.value.run1?.manifestSha256 === run1.manifest.sha256 && twoRun.value.run2?.manifestSha256 === run2.manifest.sha256 && twoRun.value.run1?.rasterReceiptSha256 === run1.raster.sha256 && twoRun.value.run2?.rasterReceiptSha256 === run2.raster.sha256, "a83_final_rc_receipt_artifact_binding");
  assert(font.value.pass === true && font.value.recoveredFont?.byteLength === 46464 && font.value.recoveredFont?.sha256 === "a07eea516ecb22957f162d68a559462c9af0534487669969d500f8e92aece0fa" && font.value.recoveredFont?.copiedIntoSource === false, "a83_final_rc_font_provenance");
  assert(missingFontFailures.every((recordValue) => recordValue.value.id === "generate_450_pdfs" && recordValue.value.exitCode === 1 && recordValue.value.pass === false), "a83_final_rc_missing_font_negative_retained");
  const core = {
    schemaVersion: "velmere.pass36.a83.source-evidence-summary.v3",
    revisionId: A83_REVISION,
    currentSourceRevisionId: R44P46_REVISION,
    evidenceAsOfRevisionId: R44P46_REVISION,
    generatedAt: policy.deterministicEpoch,
    status: "PASS_A83_CURRENT_R46_FINAL_RC_TWO_RUN_BOUND",
    evidenceClass: "TESTED_LOCAL_REAL_EXECUTION",
    evidenceMode: "CURRENT_R46_FINAL_RC_TWO_DISPOSABLE_CLONES_EXTERNAL_MATERIALS_BOUND",
    sourceSummaryPath: policy.corpusOutput.sourceSummaryPath,
    corpusManifest: manifestSummary(run1.manifest, "TESTED_LOCAL_REAL_EXECUTION"),
    rasterQaReceipt: rasterSummary(run1.raster, "TESTED_LOCAL_REAL_EXECUTION"),
    fixtureRuntime: runtimeSummary(run1.runtime, "TESTED_LOCAL_REAL_EXECUTION"),
    testReceipt: receiptSummary(run1.semantic, "TESTED_LOCAL_REAL_EXECUTION"),
    finalRcTwoRun: {
      materialsRelativePath: twoRun.materialsRelativePath,
      byteLength: twoRun.byteLength,
      sha256: twoRun.sha256,
      status: twoRun.value.status,
      checkCount: Object.keys(twoRun.value.checks ?? {}).length,
      passedChecks: Object.values(twoRun.value.checks ?? {}).filter(Boolean).length,
      denominators: twoRun.value.denominators,
      dependencySnapshotSha256: run1.result.value.dependencySnapshotBeforeSha256,
      pdfSetAggregateSha256: run1.result.value.pdfSetAggregateSha256,
      pageRasterAggregateSha256: twoRun.value.run1.pageRasterAggregateSha256,
      run1: {
        resultSha256: run1.result.sha256,
        manifestSha256: run1.manifest.sha256,
        rasterReceiptSha256: run1.raster.sha256,
        runtimeSha256: run1.runtime.sha256,
        semanticReceiptSha256: run1.semantic.sha256,
        pdfRowsSha256: run1.pdfRows.sha256,
      },
      run2: {
        resultSha256: run2.result.sha256,
        manifestSha256: run2.manifest.sha256,
        rasterReceiptSha256: run2.raster.sha256,
        runtimeSha256: run2.runtime.sha256,
        semanticReceiptSha256: run2.semantic.sha256,
        pdfRowsSha256: run2.pdfRows.sha256,
      },
      byteIdenticalPdfCount: 450,
      byteIdenticalPageRasterCount: 2100,
      g11ClosureEligible: true,
      evidenceState: "TESTED_LOCAL_REAL_EXECUTION",
    },
    fontRecoveryProvenance: {
      materialsRelativePath: font.materialsRelativePath,
      receiptSha256: font.sha256,
      status: font.value.status,
      parentMaterialsArchive: {
        fileName: path.basename(font.value.parentMaterialsArchive.path),
        byteLength: font.value.parentMaterialsArchive.byteLength,
        sha256: font.value.parentMaterialsArchive.sha256,
        revisionId: font.value.parentMaterialsArchive.revisionId,
      },
      retainedR44P44Materials: {
        manifestRelativePath: "07_RETAINED_PARENT_R44P44/materials/R44P44_MATERIALS_MANIFEST.json",
        manifestByteLength: font.value.retainedR44P44Materials.manifestByteLength,
        manifestSha256: font.value.retainedR44P44Materials.manifestSha256,
        payloadFileCount: font.value.retainedR44P44Materials.payloadFileCount,
        payloadAggregateSha256: font.value.retainedR44P44Materials.payloadAggregateSha256,
      },
      sourcePdf: {
        archiveMember: font.value.sourcePdf.archiveMember,
        materialsRelativePath: "07_RETAINED_PARENT_R44P44/materials/04_PDF/RUN1_FULL_CORPUS/en/basic/94-aapl-basic-en.pdf",
        byteLength: font.value.sourcePdf.byteLength,
        sha256: font.value.sourcePdf.sha256,
        pageIndex: font.value.sourcePdf.pageIndex,
      },
      fontObject: font.value.fontObject,
      recoveredFont: {
        byteLength: font.value.recoveredFont.byteLength,
        sha256: font.value.recoveredFont.sha256,
        copiedIntoSource: font.value.recoveredFont.copiedIntoSource,
        role: font.value.recoveredFont.role,
      },
    },
    negativeEvidence: {
      initialExactVerifierStatus: "FAIL_A83_BROWSER_LENS_PDF_MATRIX",
      initialExactVerifierChecks: 31,
      initialExactVerifierPassed: 25,
      initialExactVerifierFailed: 6,
      staleSummaryReceiptSha256: "3da6d48ec19bf4d55295cfacbb0d3285d68f1737b1391d13242757e88e4a5942",
      currentReceiptSha256: sourceReceipt.sha256,
      staleSummaryManifestIntegrityDigest: "7c533525ad2bebae7afaa71c47d3d65590523ed70705e5e2c9409da257f7e354",
      currentReceiptManifestIntegrityDigest: sourceReceipt.value.manifestIntegrityDigest,
      failureIds: ["summary:test-receipt", "authority:plane", "program:revision", "program:a83", "program:evidence", "program:remaining"],
      initialMissingFontCloneFailures: missingFontFailures.map((recordValue) => ({
        materialsRelativePath: recordValue.materialsRelativePath,
        receiptSha256: recordValue.sha256,
        exitCode: recordValue.value.exitCode,
        stderrSha256: recordValue.value.stderrSha256,
      })),
      historyRetained: true,
    },
    currentSourceExecution: {
      exactR46PdfFinalRcExecuted: true,
      twoRunDeterminismProven: true,
      disposableCloneRuns: 2,
      uniquePhysicalPdfsVerified: 450,
      physicalPdfsExecuted: 900,
      renderedPagesPerRun: 2100,
      renderedPagesExecuted: 4200,
      byteIdenticalPdfComparisons: 450,
      byteIdenticalPageRasterComparisons: 2100,
      semanticMutationsPerRun: 8100,
      mutationKilledPerRun: 8100,
      g11ClosureEligible: true,
      finalRcRerunRequired: false,
    },
    fullEvidenceRequiredForIndependentReplay: true,
    fullEvidenceExpectedInSourceOnly: false,
    fullEvidenceCurrentlyAvailableForIndependentReplay: false,
    fullEvidencePreparedForMaterials: true,
    executionTruth: executionTruth(),
    truthBoundary: "This compact SOURCE_ONLY summary binds the complete R44P46 A83 final-RC evidence retained outside SOURCE: two separately created disposable-clone runs, 900 executed PDFs, 4200 rendered pages, complete 450-PDF byte identity, complete 2100-page raster identity, 8100/8100 semantic mutations killed per run, active-content/font checks and external parser/raster QA. The exact font was recovered byte-for-byte from parent MATERIALS PDF /FontFile2 and remained an external test input. This closes only internal G11 and grants no real-packet, customer, production, legal, LIVE, sale or world-class credit.",
  };
  return { ...core, integrity: { algorithm: "sha256", digest: sha256(core) } };
}

const args = parseArgs(process.argv.slice(2));
const policy = readJson(sourcePath("config/pass36/a83-browser-lens-pdf-real-packet-policy.json"));
const receipt = sourceRecord("config/pass36/a83-test-receipt.json");
const artifactPaths = [policy.corpusOutput.manifestPath, policy.corpusOutput.rasterReceiptPath, policy.corpusOutput.runtimePath];
const artifactsPresent = artifactPaths.filter((relativePath) => fs.existsSync(sourcePath(relativePath)));
assert(artifactsPresent.length === 0 || artifactsPresent.length === artifactPaths.length, "a83_summary_artifacts_partial");
const summary = args.finalRcEvidenceRoot
  ? buildFinalRcSummary(policy, receipt, args.finalRcEvidenceRoot)
  : artifactsPresent.length === artifactPaths.length
    ? buildCurrentArtifactSummary(policy, receipt)
    : buildHistoricalSummary(policy, receipt, args.historicalMaterialsRoot);
const output = sourcePath(policy.corpusOutput.sourceSummaryPath);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({
  status: summary.status,
  evidenceClass: summary.evidenceClass,
  evidenceMode: summary.evidenceMode,
  output: policy.corpusOutput.sourceSummaryPath,
  integrityDigest: summary.integrity.digest,
  corpusManifestSha256: summary.corpusManifest.sha256,
  rasterReceiptSha256: summary.rasterQaReceipt.sha256,
  g11ClosureEligible: summary.currentSourceExecution.g11ClosureEligible,
}, null, 2));
