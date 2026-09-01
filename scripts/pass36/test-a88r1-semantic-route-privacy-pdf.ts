#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { A88R1_REVISION, A88R1_PARENT_REVISION, runA88R1FocusedHarness, sha256 } from "../../lib/worldclass/pass36-a88r1-semantic-adversarial-runtime.ts";

const policy = JSON.parse(fs.readFileSync("config/pass36/a88r1-semantic-route-privacy-pdf-policy.json", "utf8"));
const state = JSON.parse(fs.readFileSync("config/pass36/a88r1-current-state.json", "utf8"));
const program = JSON.parse(fs.readFileSync("config/pass36/a88r1-world-class-completion-program.json", "utf8"));
const routeReceipt = JSON.parse(fs.readFileSync("artifacts/pass36/a88r1/PASS36_A88R1_ROUTE_PREFLIGHT_PROVIDER_SPY_RECEIPT.json", "utf8"));
const pdfIndex = JSON.parse(fs.readFileSync("config/pass36/a88r1-physical-pdf-evidence-retention-index.json", "utf8"));
const trustRoadmap = JSON.parse(fs.readFileSync("config/pass36/a88r1-public-trust-cross-audit-roadmap.json", "utf8"));
const runtime = runA88R1FocusedHarness();
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const add = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });

add("revision", runtime.revisionId === A88R1_REVISION && policy.revisionId === A88R1_REVISION && state.revisionId === A88R1_REVISION && program.revisionId === A88R1_REVISION, { runtime: runtime.revisionId, policy: policy.revisionId, state: state.revisionId, program: program.revisionId });
add("parent", runtime.parentRevisionId === A88R1_PARENT_REVISION && policy.parentRevisionId === A88R1_PARENT_REVISION, { runtime: runtime.parentRevisionId, policy: policy.parentRevisionId });
add("focused:denominator", runtime.focused.cases === 150 && runtime.focused.families === 10 && runtime.focused.locales === 3 && runtime.focused.projections === 750 && runtime.focused.mutations === 1800 && runtime.focused.mutationKilled === 1800 && runtime.focused.mismatches === 0, runtime.focused);
add("combined:denominator", runtime.combined.cases === 510 && runtime.combined.projections === 2550 && runtime.combined.mutations === 7560 && runtime.combined.mutationKilled === 7560, runtime.combined);
add("invariants:zero", Object.values(runtime.invariants).every((value) => value === 0), runtime.invariants);
add("focused:families", Object.keys(runtime.familyCounts).length === 10 && Object.values(runtime.familyCounts).every((value) => value === 15), runtime.familyCounts);
add("focused:locales", Object.keys(runtime.localeCounts).length === 3 && Object.values(runtime.localeCounts).every((value) => value === 50), runtime.localeCounts);
add("mutations:zero-survivors", Object.values(runtime.mutationStats).every((row) => row.generated === 150 && row.killed === 150 && row.survived === 0), runtime.mutationStats);
const replay = runA88R1FocusedHarness();
add("determinism", replay.integrity.digest === runtime.integrity.digest, { first: runtime.integrity.digest, second: replay.integrity.digest });

add("route:receipt-pass", routeReceipt.status === "PASS_A88R1_ROUTE_PREFLIGHT_PROVIDER_ZERO_BEFORE_BOUNDARY" && routeReceipt.summary?.failed === 0, routeReceipt.status);
add("route:denominator", routeReceipt.caseCount === 31 && routeReceipt.blockedCases === 26 && routeReceipt.allowedControlCases === 5 && routeReceipt.providerCallsOnBlockedCases === 0 && routeReceipt.publicStablePromptFingerprints === 0, routeReceipt);
add("route:checks", routeReceipt.summary?.checks === 143 && routeReceipt.summary?.passed === 143, routeReceipt.summary);

add("pdf:index", pdfIndex.revisionId === A88R1_REVISION && pdfIndex.corpus?.pdfCount === 450 && pdfIndex.corpus?.pageCount === 2100 && pdfIndex.retentionMode === "PHYSICAL_SYNTHETIC_FILES_IN_MATERIALS_HASH_BOUND_FROM_SOURCE_ONLY", pdfIndex.corpus);
add("pdf:qa", pdfIndex.qa?.pdfCount === 450 && pdfIndex.qa?.renderedPageCount === 2100 && pdfIndex.qa?.blankPages === 0 && pdfIndex.qa?.pagesTouchingRasterEdge === 0 && pdfIndex.qa?.pypdfPassed === 450 && pdfIndex.qa?.pdfinfoPassed === 450 && pdfIndex.qa?.pdftotextPassed === 450 && pdfIndex.qa?.ghostscriptSamplePassed === 45 && pdfIndex.qa?.failedDocuments === 0, pdfIndex.qa);
const manifestBinding = pdfIndex.bindings.manifest;
const qaBinding = pdfIndex.bindings.qaReceipt;
add("pdf:manifest-binding-shape", typeof manifestBinding?.sourcePath === "string" && typeof manifestBinding?.materialsPath === "string" && Number.isSafeInteger(manifestBinding?.byteLength) && /^[a-f0-9]{64}$/u.test(String(manifestBinding?.sha256 ?? "")), manifestBinding);
add("pdf:qa-binding-shape", typeof qaBinding?.sourcePath === "string" && typeof qaBinding?.materialsPath === "string" && Number.isSafeInteger(qaBinding?.byteLength) && /^[a-f0-9]{64}$/u.test(String(qaBinding?.sha256 ?? "")) && qaBinding?.status === "PASS_A83_PDF_RASTER_AND_EXTERNAL_PARSE_QA", qaBinding);
add("pdf:materials-required", pdfIndex.sourceOnlyIncludesPhysicalPdfs === false && pdfIndex.materialsMustIncludePhysicalPdfs === true && pdfIndex.corpus?.entryAggregateSha256?.length === 64 && pdfIndex.corpus?.manifestIntegritySha256?.length === 64, { sourceOnlyIncludesPhysicalPdfs: pdfIndex.sourceOnlyIncludesPhysicalPdfs, materialsMustIncludePhysicalPdfs: pdfIndex.materialsMustIncludePhysicalPdfs });
add("pdf:no-promotion", pdfIndex.truthBoundary?.realCustomerPdfCount === 0 && pdfIndex.truthBoundary?.paidGateEligible === false && pdfIndex.truthBoundary?.liveProven === false && pdfIndex.truthBoundary?.saleEnabled === false, pdfIndex.truthBoundary);

const bridge = spawnSync(process.execPath, ["scripts/pass36/verify-a88r1-clean-unpack-sequence.mjs", "--bridge-smoke"], { cwd: process.cwd(), shell: false, encoding: "utf8", timeout: 15_000, windowsHide: true });
add("clean-unpack:async-bridge-exits", bridge.status === 0 && bridge.stdout.includes("PASS_A88R1_ASYNC_BRIDGE_PROCESS_EXIT"), { status: bridge.status, signal: bridge.signal, stderr: bridge.stderr?.slice(-1000), stdout: bridge.stdout?.slice(-1000) });

for (const [name, input] of Object.entries(policy.inputs as Record<string, { path: string; sha256: string }>)) {
  add(`input:${name}`, fs.existsSync(input.path) && sha256(fs.readFileSync(input.path)) === input.sha256, input);
}
for (const assertion of policy.productionAssertions) {
  const source = fs.readFileSync(assertion.path, "utf8");
  const included = assertion.includes.every((fragment: string) => source.includes(fragment));
  const excluded = assertion.excludes.every((fragment: string) => !source.includes(fragment));
  add(`production:${assertion.id}`, included && excluded, { path: assertion.path, included, excluded });
}
const brainSource = fs.readFileSync("lib/server/market-integrity-route-modules/brain.ts", "utf8");
const angelSource = fs.readFileSync("lib/server/market-integrity-route-modules/angel.ts", "utf8");
add("production:brain-order", brainSource.indexOf("evaluateVlmRoutePreflight") >= 0 && brainSource.indexOf("evaluateVlmRoutePreflight") < brainSource.indexOf("resolveMarketResult(query)"), null);
add("production:angel-order", angelSource.indexOf("evaluateVlmRoutePreflight") >= 0 && angelSource.indexOf("evaluateVlmRoutePreflight") < angelSource.indexOf("resolveMarketResult(query)"), null);
add("production:no-public-fingerprint", !brainSource.includes("adviceBoundary.fingerprint") && !angelSource.includes("adviceBoundary.fingerprint"), null);

add("policy:gaps", policy.closedByA88R1.length === 21, policy.closedByA88R1.length);
add("program:horizon", program.programRange?.completedThrough === 88 && program.programRange?.remainingAfterA88 === 28 && program.programRange?.lastPlannedPass === 116, program.programRange);
add("program:resource-truth", Array.isArray(program.resourceAndCostTruth?.zeroBudgetEngineeringCanCover) && Array.isArray(program.resourceAndCostTruth?.notHonestlyGuaranteedFree) && program.resourceAndCostTruth.notHonestlyGuaranteedFree.length >= 6, program.resourceAndCostTruth);
const parallelTracks = program.parallelMandatoryTracks as Array<{ id?: string }> | undefined;
add("program:parallel-tracks", Array.isArray(parallelTracks) && parallelTracks.length >= 4 && parallelTracks.some((row) => row.id === "CROSS_AUDIT_VALIDATION") && parallelTracks.some((row) => row.id === "PUBLIC_TRUST_WEBSITE"), parallelTracks);
add("trust:roadmap-boundary", trustRoadmap.revisionId === A88R1_REVISION && trustRoadmap.crossAuditValidation?.projectsRequired === 20 && trustRoadmap.crossAuditValidation?.externallyAcceptedMediumOrHighRequired === 5 && trustRoadmap.crossAuditValidation?.confirmedRemediationsRequired === 3 && trustRoadmap.crossAuditValidation?.successfulRetestsRequired === 3 && trustRoadmap.currentEvidence?.projectsCompleted === 0 && trustRoadmap.publicTrustWebsite?.requiredSections?.length === 20 && trustRoadmap.publicTrustWebsite?.implementedSections === 0 && trustRoadmap.claimBoundary?.publicClaimAllowedNow === false && trustRoadmap.claimBoundary?.mayClaimAccreditedCertification === false, trustRoadmap);
add("state:truth", state.decision === "NO_GO" && state.combinedSyntheticCases === 510 && state.providerCallsOnBlockedCases === 0 && state.physicalSyntheticPdfsRetained === 450 && state.realEvalCasesVerified === 0 && state.legalRegulatoryDecisionsSigned === 0 && state.paidGateEligible === false && state.liveProven === false && state.saleEnabled === false && state.worldClassProven === false, state);

const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a88r1.semantic-route-privacy-pdf-test-receipt.v1",
  revisionId: A88R1_REVISION,
  parentRevisionId: A88R1_PARENT_REVISION,
  generatedAt: policy.deterministicEpoch,
  status: failed.length ? "FAIL_A88R1_SEMANTIC_ROUTE_PRIVACY_PDF" : "PASS_A88R1_LOCAL_SEMANTIC_ROUTE_PRIVACY_PDF_NO_PROMOTION",
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  combined: runtime.combined,
  focused: runtime.focused,
  invariants: runtime.invariants,
  routeEvidence: { cases: routeReceipt.caseCount, blockedCases: routeReceipt.blockedCases, checks: routeReceipt.summary.checks, providerCallsOnBlockedCases: routeReceipt.providerCallsOnBlockedCases },
  pdfEvidence: { physicalMaterialsPresentInSourceOnly: false, materialsRequired: true, hashBindingsDeclared: true, pdfCount: 450, pageCount: 2100, blankPages: 0, edgeContactPages: 0 },
  closedGaps: policy.closedByA88R1.length,
  realEvalCasesVerified: 0,
  realModelExecutions: 0,
  rightsApprovedCases: 0,
  independentAdjudications: 0,
  customerDecisionUtilityLabels: 0,
  realCalibrationWindowsClosed: 0,
  legalRegulatoryDecisionsSigned: 0,
  exactA80CandidateBound: false,
  paidGateEligible: false,
  liveProven: false,
  saleEnabled: false,
  failures: failed,
  checks,
  truthBoundary: policy.truthBoundary,
};
fs.mkdirSync("artifacts/pass36/a88r1", { recursive: true });
fs.writeFileSync("config/pass36/a88r1-test-receipt.json", `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync("artifacts/pass36/a88r1/PASS36_A88R1_SEMANTIC_GENERALIZATION_RUNTIME.json", `${JSON.stringify(runtime, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
