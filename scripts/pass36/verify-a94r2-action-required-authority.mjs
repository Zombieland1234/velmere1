#!/usr/bin/env node
import { readFileSync } from "node:fs";
import {
  A94R2_MANIFEST_PATH,
  A94R2_PARENT,
  A94R2_PARENT_MANIFEST_DIGEST,
  A94R2_REVISION,
  buildA94R2Payload,
  collectA94R2SourceRows,
  digestValid,
  readJson,
} from "./a94r2-source-boundary.mjs";

const root = process.cwd();
const authority = readJson(root, "config/pass36/current-release-authority.json");
const mirror = readJson(root, "config/pass35/current-revision.json");
const legacy = readJson(root, "config/current-release.json");
const state = readJson(root, "config/pass36/a94r2-action-required-current-state.json");
const program = readJson(root, "config/pass36/a94r2-world-class-completion-program.json");
const pdfSummary = readJson(root, "config/pass36/a94r2-retained-pdf-evidence-summary.json");
const routeRegistry = readJson(root, "config/pass15/route-export-ast-registry.json");
const crossSurfacePolicy = readJson(root, "config/pass36/a94r2-cross-surface-value-truth-policy.json");
const manifest = readJson(root, A94R2_MANIFEST_PATH);
const active = readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim();
const inventory = collectA94R2SourceRows(root);
const observedPayload = buildA94R2Payload(inventory.rows);

const checks = [];
function check(id, passed, detail = null) {
  checks.push({ id, passed: Boolean(passed), detail });
}

check("active:revision", active === A94R2_REVISION, active);
check("authority:revision", authority.authorityRevisionId === A94R2_REVISION && authority.currentSource?.revisionId === A94R2_REVISION, authority.currentSource);
check("authority:parent", authority.parentRevisionId === A94R2_PARENT && authority.currentSource?.parentRevisionId === A94R2_PARENT, authority.parentRevisionId);
check("authority:program", authority.planes?.roadmapProgram?.revisionId === A94R2_REVISION && authority.planes?.roadmapProgram?.path === "config/pass36/a94r2-world-class-completion-program.json" && authority.worldClassCompletionProgramRevisionId === A94R2_REVISION && authority.worldClassCompletionRemainingPasses === 31, authority.planes?.roadmapProgram);
check("authority:sparse-non-pass", authority.planes?.localHardeningCheckpoint?.checkpointClass === "ACTION_REQUIRED_NON_PASS" && authority.planes?.localHardeningCheckpoint?.completedThrough === 89 && authority.planes?.localHardeningCheckpoint?.a90PassCredit === false && authority.planes?.localHardeningCheckpoint?.a94PassCredit === false, authority.planes?.localHardeningCheckpoint);
check("authority:no-promotion", authority.claims?.currentRevisionId === A94R2_REVISION && authority.claims?.parentRevisionId === A94R2_PARENT && authority.claims?.checkpointClass === "ACTION_REQUIRED_NON_PASS" && authority.claims?.decision === "NO_GO" && authority.claims?.a90ToA94PassCredit === false && authority.claims?.exactFinalByteBuildExecuted === false && authority.claims?.realStagingExecuted === false && authority.claims?.liveProven === false && authority.claims?.saleEnabled === false && authority.claims?.productionApproved === false && authority.claims?.worldClassProven === false, authority.claims);
check("authority:route-ast-truth", authority.planes?.routeExportAstRegistry?.fileCount >= 250 && authority.planes?.routeExportAstRegistry?.usedExternalDiagnosticTypeScript === true && authority.planes?.routeExportAstRegistry?.exactToolchainCreditEligible === false && authority.planes?.routeExportAstRegistry?.exactA78R1ReparseRequired === true, authority.planes?.routeExportAstRegistry);
check("authority:orphan-lock-truth", authority.planes?.orphanBuildLockDualReviewRecovery?.implemented === true && authority.planes?.orphanBuildLockDualReviewRecovery?.fixtureAssertionsPassed === 26 && authority.planes?.orphanBuildLockDualReviewRecovery?.realRecoveries === 0 && authority.planes?.orphanBuildLockDualReviewRecovery?.automaticLockStealingAllowed === false, authority.planes?.orphanBuildLockDualReviewRecovery);
check("authority:pdf-truth", authority.planes?.retainedPhysicalPdfIndependentQa?.documents === 450 && authority.planes?.retainedPhysicalPdfIndependentQa?.pages === 2100 && authority.planes?.retainedPhysicalPdfIndependentQa?.blankPages === 0 && authority.planes?.retainedPhysicalPdfIndependentQa?.edgeContactPages === 0 && authority.planes?.retainedPhysicalPdfIndependentQa?.syntheticOnly === true && authority.planes?.retainedPhysicalPdfIndependentQa?.realCustomerPdfs === 0, authority.planes?.retainedPhysicalPdfIndependentQa);
check("mirror:revision", mirror.sourceRevisionId === A94R2_REVISION && mirror.parentSourceRevisionId === A94R2_PARENT && mirror.currentReleaseAuthorityRevisionId === A94R2_REVISION && mirror.checkpointClass === "ACTION_REQUIRED_NON_PASS" && mirror.a90ToA94PassCredit === false, { sourceRevisionId: mirror.sourceRevisionId, parentSourceRevisionId: mirror.parentSourceRevisionId, checkpointClass: mirror.checkpointClass });
check("legacy:pointer-class", legacy.notAuthoritativeCurrentSourcePointer === true && legacy.authoritativeCurrentSourceRevisionId === A94R2_REVISION && legacy.authoritativeCurrentSourceParentRevisionId === A94R2_PARENT, { notAuthoritative: legacy.notAuthoritativeCurrentSourcePointer, current: legacy.authoritativeCurrentSourceRevisionId });
check("state:truth", state.revisionId === A94R2_REVISION && state.parentRevisionId === A94R2_PARENT && state.checkpointClass === "ACTION_REQUIRED_NON_PASS" && state.completedThrough === 89 && Object.values(state.passCredit ?? {}).every((value) => value === false) && state.promotion?.live === false && state.promotion?.saleEnabled === false && state.promotion?.productionApproved === false && state.promotion?.worldClassProven === false, state.passCredit);
check("state:targeted-local-only", state.localVerification?.routeAstRegistryBuilt === true && state.localVerification?.routeAstExactToolchainCreditGranted === false && state.localVerification?.orphanBuildLockRecoveryFixturePassed === true && state.localVerification?.realOrphanBuildLockRecoveries === 0 && state.localVerification?.retainedPhysicalPdfQaPassed === true && state.localVerification?.browserExecuted === false && state.localVerification?.currentRoot30Of30PassedOnA94R2FinalBytes === false && state.localVerification?.exactReleaseCreditGranted === false && state.localVerification?.browserCreditGranted === false, state.localVerification);
check("program:truth", program.revisionId === A94R2_REVISION && program.parentRevisionId === A94R2_PARENT && program.completedThrough === 89 && program.remainingPasses === 31 && program.promotion?.globalDecision === "NO_GO" && program.promotion?.live === false && program.promotion?.saleEnabled === false && program.promotion?.productionApproved === false, { revisionId: program.revisionId, remainingPasses: program.remainingPasses, promotion: program.promotion });
check("program:estimate-not-credit", program.planningEstimate?.formalRemainingEntries === 31 && program.planningEstimate?.realisticRemainingCheckpointsLow === 39 && program.planningEstimate?.realisticRemainingCheckpointsHigh === 46 && program.planningEstimate?.classification === "PLANNING_INFERENCE_NOT_CREDIT", program.planningEstimate);
check("denominator:shield", state.denominators?.shieldAssets?.required === 318 && state.denominators?.shieldAssets?.unavailableOrBlocked === 318 && state.denominators?.shieldProMapAssets?.required === 318 && state.denominators?.shieldProMapAssets?.unavailableOrBlocked === 318, state.denominators);
check("denominator:real-markets", state.denominators?.realMarketsInstruments?.required === 583 && state.denominators?.realMarketsInstruments?.unavailableOrBlocked === 583, state.denominators?.realMarketsInstruments);
check("denominator:external-zero", state.denominators?.rlsChecks?.realPassed === 0 && state.denominators?.providerRights?.approved === 0 && state.denominators?.legalDpo?.signed === 0 && state.denominators?.realAuditCases?.fullyVerified === 0 && state.denominators?.officialAuditToolRuns?.executed === 0 && state.denominators?.realCustomerPdfCases?.verified === 0 && state.denominators?.brainAngelRiskRealEval?.verified === 0 && state.denominators?.customerCohorts?.verified === 0 && state.denominators?.crossAudits?.verified === 0, state.denominators);
check("pdf:summary", pdfSummary.revisionId === A94R2_REVISION && pdfSummary.qa?.documents === 450 && pdfSummary.qa?.pages === 2100 && pdfSummary.qa?.blankPages === 0 && pdfSummary.qa?.edgeContactPages === 0 && pdfSummary.realCustomerPdfs === 0 && pdfSummary.productionBrowserRuns === 0 && pdfSummary.secureCustomerDeliveries === 0 && pdfSummary.saleEnabled === false, pdfSummary);
check("route-registry:truth", routeRegistry.fileCount >= 250 && routeRegistry.exactAstReparseCredit === false && routeRegistry.parser?.exactToolchainCreditEligible === false, { fileCount: routeRegistry.fileCount, parser: routeRegistry.parser });
check("cross-surface:no-promotion", crossSurfacePolicy.revisionId === A94R2_REVISION && crossSurfacePolicy.parentRevisionId === A94R2_PARENT && Object.values(crossSurfacePolicy.claims ?? {}).every((value) => value === false) && crossSurfacePolicy.skuDecisions?.basic?.paid === false && crossSurfacePolicy.skuDecisions?.pro?.paid === false && crossSurfacePolicy.skuDecisions?.advanced?.paid === false, { claims: crossSurfacePolicy.claims, sku: crossSurfacePolicy.skuDecisions });
check("manifest:digest", digestValid(manifest), manifest.manifestDigestSha256);
check("manifest:lineage", manifest.revisionId === A94R2_REVISION && manifest.parentRevisionId === A94R2_PARENT && manifest.parentDescendantManifestDigestSha256 === A94R2_PARENT_MANIFEST_DIGEST && manifest.checkpointClass === "ACTION_REQUIRED_NON_PASS", { revisionId: manifest.revisionId, parentRevisionId: manifest.parentRevisionId, parentDigest: manifest.parentDescendantManifestDigestSha256 });
for (const key of Object.keys(observedPayload)) {
  check(`manifest:payload:${key}`, manifest.payload?.[key] === observedPayload[key], { declared: manifest.payload?.[key], observed: observedPayload[key] });
}
check("manifest:no-rejected-source", inventory.rejected.length === 0, inventory.rejected);
check("manifest:no-credit", Object.values(manifest.claims ?? {}).every((value) => value === false), manifest.claims);

const failures = checks.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a94r2.action-required-authority-verification.v1",
  revisionId: A94R2_REVISION,
  status: failures.length ? "FAIL_A94R2_ACTION_REQUIRED_AUTHORITY" : "PASS_A94R2_ACTION_REQUIRED_AUTHORITY_NO_PASS_CREDIT",
  checks: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  failures,
  payload: observedPayload,
  formalRemainingEntries: 31,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
