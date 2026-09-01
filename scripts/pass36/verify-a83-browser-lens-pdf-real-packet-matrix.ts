#!/usr/bin/env node
import fs from "node:fs";
import {
  A83_REVISION,
  canonicalJson,
  evaluateA83RealIntake,
  sha256,
  verifyA83CorpusManifest,
} from "../../lib/worldclass/pass36-a83-browser-lens-pdf-real-packet-runtime.ts";

const R46_REVISION = "VELMERE_PASS36_A102R44P46_ACTION_REQUIRED_LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE_NO_LIVE_CREDIT";
const R45_REVISION = "VELMERE_PASS36_A102R44P45_ACTION_REQUIRED_CONTINUOUS_CURRENT_STATE_CONTEXT_QUALIFIED_INTERACTION_ORDERING_PUBLIC_CONTROL_DELTA_NO_LIVE_CREDIT";
const j = (path: string) => JSON.parse(fs.readFileSync(path, "utf8"));
const policy = j("config/pass36/a83-browser-lens-pdf-real-packet-policy.json");
const receipt = j("config/pass36/a83-test-receipt.json");
const summary = j(policy.corpusOutput.sourceSummaryPath);
const intake = j(policy.realIntakeIndex.path);
const current = j("config/pass35/current-revision.json");
const authority = j("config/pass36/current-release-authority.json");
const state = j("config/pass36/a83-current-state.json");
const continuousPolicy = j(current.worldClassCompletionProgramPath);
const gates = j("config/pass36/r44p46-controllable-gate-registry.json");
const checks: Array<{id:string;passed:boolean;detail?:unknown}> = [];
const check = (id:string, passed:unknown, detail:unknown=null) => checks.push({ id, passed: Boolean(passed), detail });

const summaryCore = { ...summary };
delete summaryCore.integrity;
check("policy:revision", policy.revisionId === A83_REVISION, policy.revisionId);
check("policy:parent", policy.parentRevisionId === "VELMERE_PASS36_A82R0_AUDIT_BASIC_PRO_ADVANCED_REAL_CONTRACT_MATRIX_AND_OFFICIAL_TOOL_EVIDENCE_BINDING", policy.parentRevisionId);
check("policy:catalog-hash", sha256(fs.readFileSync(policy.fixtureCatalog.path)) === policy.fixtureCatalog.sha256);
check("policy:intake-hash", sha256(fs.readFileSync(policy.realIntakeIndex.path)) === policy.realIntakeIndex.sha256);
check("policy:gaps", policy.closedByA83?.length === 31, policy.closedByA83?.length);
check("summary:schema", summary.schemaVersion === "velmere.pass36.a83.source-evidence-summary.v3", summary.schemaVersion);
check("summary:path", policy.corpusOutput.sourceSummaryPath === "config/pass36/a83-source-evidence-summary.json", policy.corpusOutput.sourceSummaryPath);
check("summary:revisions", summary.revisionId === A83_REVISION && summary.currentSourceRevisionId === R46_REVISION, { revisionId: summary.revisionId, currentSourceRevisionId: summary.currentSourceRevisionId });
check("summary:integrity", summary.integrity?.algorithm === "sha256" && summary.integrity?.digest === sha256(canonicalJson(summaryCore)), summary.integrity);
check("summary:denominators", summary.corpusManifest?.entryCount === 450 && summary.corpusManifest?.totals?.physicalPdfs === 450 && summary.corpusManifest?.totals?.renderedPages === 2100 && summary.corpusManifest?.totals?.channelProjections === 2700 && summary.corpusManifest?.totals?.semanticMutations === 8100 && summary.corpusManifest?.totals?.mutationKilled === 8100, summary.corpusManifest?.totals);
check("summary:raster", summary.rasterQaReceipt?.status === "PASS_A83_PDF_RASTER_AND_EXTERNAL_PARSE_QA" && summary.rasterQaReceipt?.pdfCount === 450 && summary.rasterQaReceipt?.renderedPageCount === 2100 && summary.rasterQaReceipt?.blankPages === 0 && summary.rasterQaReceipt?.pagesTouchingRasterEdge === 0 && summary.rasterQaReceipt?.pypdfPassed === 450 && summary.rasterQaReceipt?.pdfinfoPassed === 450 && summary.rasterQaReceipt?.pdftotextPassed === 450 && summary.rasterQaReceipt?.localeMarkerPassed === 450 && summary.rasterQaReceipt?.ghostscriptSamplePassed === 45 && summary.rasterQaReceipt?.failedDocuments === 0, summary.rasterQaReceipt);
check("summary:test-receipt", summary.testReceipt?.sha256 === sha256(fs.readFileSync("config/pass36/a83-test-receipt.json")) && summary.testReceipt?.manifestIntegrityDigest === receipt.manifestIntegrityDigest && summary.testReceipt?.status === receipt.status, summary.testReceipt);
check("summary:current-final-rc-truth", summary.status === "PASS_A83_CURRENT_R46_FINAL_RC_TWO_RUN_BOUND" && summary.evidenceClass === "TESTED_LOCAL_REAL_EXECUTION" && summary.currentSourceExecution?.exactR46PdfFinalRcExecuted === true && summary.currentSourceExecution?.twoRunDeterminismProven === true && summary.currentSourceExecution?.g11ClosureEligible === true && summary.currentSourceExecution?.finalRcRerunRequired === false, { status: summary.status, evidenceClass: summary.evidenceClass, currentSourceExecution: summary.currentSourceExecution });
check("summary:negative-retained", summary.negativeEvidence?.initialExactVerifierStatus === "FAIL_A83_BROWSER_LENS_PDF_MATRIX" && summary.negativeEvidence?.initialExactVerifierFailed === 6 && summary.negativeEvidence?.staleSummaryReceiptSha256 === "3da6d48ec19bf4d55295cfacbb0d3285d68f1737b1391d13242757e88e4a5942" && summary.negativeEvidence?.currentReceiptSha256 === sha256(fs.readFileSync("config/pass36/a83-test-receipt.json")) && summary.negativeEvidence?.initialMissingFontCloneFailures?.length === 2 && summary.negativeEvidence.initialMissingFontCloneFailures.every((row: {exitCode?:number;stderrSha256?:string}) => row.exitCode === 1 && /^[a-f0-9]{64}$/.test(row.stderrSha256 ?? "")) && summary.negativeEvidence?.historyRetained === true, summary.negativeEvidence);
check("summary:final-two-run", summary.finalRcTwoRun?.status === "PASS_A83_R44P46_FINAL_RC_TWO_DISPOSABLE_CLONES_BYTE_IDENTICAL" && summary.finalRcTwoRun?.checkCount === 22 && summary.finalRcTwoRun?.passedChecks === 22 && summary.finalRcTwoRun?.denominators?.physicalPdfsTotal === 900 && summary.finalRcTwoRun?.denominators?.renderedPagesTotal === 4200 && summary.finalRcTwoRun?.denominators?.completePdfByteComparisons === 450 && summary.finalRcTwoRun?.denominators?.completePageRasterComparisons === 2100 && summary.finalRcTwoRun?.denominators?.retainedPhysicalPdfArtifacts === 900 && summary.finalRcTwoRun?.denominators?.retainedContactSheetArtifacts === 18 && summary.finalRcTwoRun?.byteIdenticalPdfCount === 450 && summary.finalRcTwoRun?.byteIdenticalPageRasterCount === 2100 && summary.finalRcTwoRun?.g11ClosureEligible === true, summary.finalRcTwoRun);
check("summary:font-provenance", summary.fontRecoveryProvenance?.status === "PASS_EXACT_PARENT_MATERIALS_PDF_FONTFILE2_RECOVERY" && summary.fontRecoveryProvenance?.sourcePdf?.sha256 === "45aeba8009cbf35c4a7043b76d27e3e531953f73b338ba58a6e2f22e0d91da6f" && summary.fontRecoveryProvenance?.fontObject?.resourceName === "/F1" && summary.fontRecoveryProvenance?.fontObject?.streamKey === "/FontFile2" && summary.fontRecoveryProvenance?.recoveredFont?.byteLength === 46464 && summary.fontRecoveryProvenance?.recoveredFont?.sha256 === "a07eea516ecb22957f162d68a559462c9af0534487669969d500f8e92aece0fa" && summary.fontRecoveryProvenance?.recoveredFont?.copiedIntoSource === false, summary.fontRecoveryProvenance);

const evidencePaths = [policy.corpusOutput.manifestPath, policy.corpusOutput.rasterReceiptPath, policy.corpusOutput.runtimePath];
const evidencePresent = evidencePaths.filter((path: string) => fs.existsSync(path));
check("evidence:all-or-none", evidencePresent.length === 0 || evidencePresent.length === evidencePaths.length, evidencePresent);
let evidenceMode = "SOURCE_SUMMARY_CURRENT_R46_FINAL_RC_TWO_RUN_MATERIALS_BOUND";
if (evidencePresent.length === evidencePaths.length) {
  evidenceMode = "FULL_LOCAL_ARTIFACTS_PRESENT_CURRENT_R46_FINAL_RC_SUMMARY_BOUND";
  const manifest = j(policy.corpusOutput.manifestPath);
  const raster = j(policy.corpusOutput.rasterReceiptPath);
  check("materials:manifest-hash", summary.corpusManifest.sha256 === sha256(fs.readFileSync(policy.corpusOutput.manifestPath)), summary.corpusManifest.sha256);
  check("materials:raster-hash", summary.rasterQaReceipt.sha256 === sha256(fs.readFileSync(policy.corpusOutput.rasterReceiptPath)), summary.rasterQaReceipt.sha256);
  check("materials:runtime-hash", summary.fixtureRuntime.sha256 === sha256(fs.readFileSync(policy.corpusOutput.runtimePath)), summary.fixtureRuntime.sha256);
  const verified = verifyA83CorpusManifest(process.cwd(), policy, manifest, receipt.manifestIntegrityDigest);
  check("corpus:verified", (verified as {ok?:boolean})?.ok === true, verified);
  check("raster:pass", raster.status === "PASS_A83_PDF_RASTER_AND_EXTERNAL_PARSE_QA" && raster.pdfCount === 450 && raster.renderedPageCount === 2100 && raster.blankPages === 0 && raster.pagesTouchingRasterEdge === 0, raster);
  check("raster:parsers", raster.pypdfPassed === 450 && raster.pdfinfoPassed === 450 && raster.pdftotextPassed === 450 && raster.localeMarkerPassed === 450 && raster.ghostscriptSamplePassed === 45 && raster.failedDocuments === 0, raster);
} else {
  check("source-summary:materials-external", summary.fullEvidenceExpectedInSourceOnly === false && summary.fullEvidenceCurrentlyAvailableForIndependentReplay === false && summary.fullEvidencePreparedForMaterials === true && summary.currentSourceExecution?.physicalPdfsExecuted === 900 && summary.currentSourceExecution?.renderedPagesExecuted === 4200, { evidencePresent, currentSourceExecution: summary.currentSourceExecution });
}

check("receipt:current-final-rc-pass", receipt.status === "PASS_A83_LOCAL_SYNTHETIC_PHYSICAL_PDF_MATRIX_ONLY" && receipt.summary.failed === 0 && summary.testReceipt.evidenceState === "TESTED_LOCAL_REAL_EXECUTION", { status: receipt.status, evidenceState: summary.testReceipt.evidenceState });
check("receipt:denominators", receipt.fixtureDenominators.physicalPdfs === 450 && receipt.fixtureDenominators.renderedPages === 2100 && receipt.fixtureDenominators.channelProjections === 2700 && receipt.fixtureDenominators.semanticMutations === 8100 && receipt.fixtureDenominators.mutationKilled === 8100, receipt.fixtureDenominators);
const real = evaluateA83RealIntake(intake, policy);
check("real:blocked", real.realPacketReady === 0 && real.rightsApproved === 0 && real.browserEvidence === 0 && real.secureDeliveryEvidence === 0 && real.comprehensionLabels === 0 && real.decision === "BLOCKED_REAL_PACKET_EVIDENCE", real);
check("current:revision", current.sourceRevisionId === R46_REVISION && current.sourceRevisionId === current.currentReleaseAuthorityRevisionId && current.currentRootDescendantManifestRevisionId === current.sourceRevisionId, current.sourceRevisionId);
check("current:a83-compatibility", current.browserLensPdfRealPacketMatrixRevisionId === A83_REVISION && current.browserLensPdfRealPacketMatrixImplemented === true && current.localSyntheticPhysicalPdfMatrixExecuted === true && current.physicalCustomerPdfMatrixExecuted === false && current.browserLensPdfClosedGaps === 31 && current.realBrowserLensPdfPacketsVerified === 0 && current.browserLensPdfEvidenceState === "TESTED_LOCAL_REAL_EXECUTION" && current.browserLensPdfCurrentFinalRcExecuted === true && current.browserLensPdfCurrentTwoRunDeterminismProven === true && current.browserLensPdfG11ClosureEligible === true, { revisionId: current.browserLensPdfRealPacketMatrixRevisionId, evidenceState: current.browserLensPdfEvidenceState, currentFinalRcExecuted: current.browserLensPdfCurrentFinalRcExecuted });
check("authority:revision", authority.authorityRevisionId === R46_REVISION && authority.currentSource?.revisionId === R46_REVISION, authority.currentSource);
check("authority:a83-plane", authority.planes?.browserLensPdfRealPacketMatrix?.revisionId === A83_REVISION && authority.planes?.browserLensPdfRealPacketMatrix?.evidenceState === "TESTED_LOCAL_REAL_EXECUTION" && authority.planes?.browserLensPdfRealPacketMatrix?.currentSourceFinalRcExecuted === true && authority.planes?.browserLensPdfRealPacketMatrix?.currentSourceTwoRunDeterminismProven === true && authority.planes?.browserLensPdfRealPacketMatrix?.g11ClosureEligible === true && authority.planes?.browserLensPdfRealPacketMatrix?.sourceSummaryBindsHistoricalMaterialsEvidence === true && authority.planes?.browserLensPdfRealPacketMatrix?.sourceSummaryBindsFullMaterialsEvidence === true && authority.planes?.browserLensPdfRealPacketMatrix?.realPacketsVerified === 0, authority.planes?.browserLensPdfRealPacketMatrix);
check("state:historical", state.revisionId === A83_REVISION && state.localHarness?.localSyntheticPhysicalMatrixExecuted === true && state.localHarness?.physicalCustomerPdfMatrixExecuted === false && state.claims.realPacketsVerified === false && state.claims.liveProven === false && state.claims.saleEnabled === false, state.claims);
check("continuous-policy", continuousPolicy.schemaVersion === "velmere.pass36.a102r44p45.continuous-closure-policy.v1" && continuousPolicy.revisionId === R45_REVISION && continuousPolicy.sourceOnlyIsSoleCodeAuthority === true && continuousPolicy.parallelRoadmapAuthorityForbidden === true && continuousPolicy.saleEnabled === false && continuousPolicy.LIVE === false, { schemaVersion: continuousPolicy.schemaVersion, revisionId: continuousPolicy.revisionId });
const g11 = gates.gates?.find((entry: {id?:string}) => entry.id === "G11");
check("current-truth:g11-closed-local", gates.denominator === 26 && gates.closed === 1 && gates.internalClosurePercent === 3.8 && g11?.status === "CLOSED" && g11?.evidenceClass === "TESTED_LOCAL_REAL_EXECUTION", { denominator: gates.denominator, closed: gates.closed, internalClosurePercent: gates.internalClosurePercent, g11 });
check("active", fs.readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim() === R46_REVISION);
check("runner", fs.existsSync("VELMERE_RUN_A83_BROWSER_LENS_PDF_REAL_PACKET_MATRIX.cmd"));
check("patch", fs.existsSync("VELMERE_A83_PATCH.txt"));
check("truth:no-sale", authority.claims.localSyntheticPhysicalPdfMatrixExecuted === true && authority.claims.physicalCustomerPdfMatrixExecuted === false && authority.claims.liveProven === false && authority.claims.saleEnabled === false && authority.claims.worldClassProven === false, authority.claims);

const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a83.browser-lens-pdf-real-packet-verification.v4",
  revisionId: A83_REVISION,
  currentSourceRevisionId: R46_REVISION,
  status: failed.length ? "FAIL_A83_BROWSER_LENS_PDF_MATRIX" : "PASS_A83_R44P46_FINAL_RC_TWO_RUN_BOUND_G11_INTERNAL_ONLY",
  evidenceMode,
  evidenceClass: "TESTED_LOCAL_REAL_EXECUTION",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  fixtureDenominators: summary.corpusManifest.totals,
  realIntake: real,
  rasterSummary: {
    pdfCount: summary.rasterQaReceipt.pdfCount,
    renderedPageCount: summary.rasterQaReceipt.renderedPageCount,
    blankPages: summary.rasterQaReceipt.blankPages,
    pagesTouchingRasterEdge: summary.rasterQaReceipt.pagesTouchingRasterEdge,
  },
  sourceSummaryIntegrityDigest: summary.integrity.digest,
  historicalEvidenceHashes: {
    corpusManifestSha256: summary.corpusManifest.sha256,
    rasterReceiptSha256: summary.rasterQaReceipt.sha256,
    runtimeSha256: summary.fixtureRuntime.sha256,
  },
  currentR46PdfFinalRcExecuted: true,
  g11Closed: true,
  realPacketsVerified: 0,
  browserRuns: 0,
  secureDeliveries: 0,
  customerComprehensionLabels: 0,
  paidGateEligible: false,
  liveProven: false,
  saleEnabled: false,
  truthBoundary: "This verifier proves the compact SOURCE binding for the complete current R44P46 A83 two-disposable-clone final RC. It closes only internal PDF gate G11 and grants no real-packet, customer, production, legal, provider, LIVE, sale or world-class credit.",
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
