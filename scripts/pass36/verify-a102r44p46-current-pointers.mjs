#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  A83_FINAL_RC_RECEIPT_PATH,
  A83_FINAL_RC_RECEIPT_SHA256,
  A83_FINAL_RC_STATUS,
  A83_REVISION,
  AUTHORITY_VERIFIER,
  AUTHORITY_VERIFIER_STATUS,
  LEDGER,
  MANIFEST,
  MANIFEST_SCHEMA,
  PARENT,
  REVISION,
} from "./build-a102r44p46-current-pointers.mjs";

const root = path.resolve(process.argv[2] ?? process.cwd());
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });

const expectedIdentity = {
  revisionId: REVISION,
  currentRevisionId: REVISION,
  sourceRevisionId: REVISION,
  authorityRevisionId: REVISION,
  currentReleaseAuthorityRevisionId: REVISION,
  currentRootDescendantManifestRevisionId: REVISION,
  parentRevisionId: PARENT,
  sourceParentRevisionId: PARENT,
  currentRevisionParentId: PARENT,
  authoritativeCurrentSourceRevisionId: REVISION,
  authoritativeCurrentSourceParentRevisionId: PARENT,
  sourceManifestPath: MANIFEST,
  currentRootDescendantManifestPath: MANIFEST,
  authoritativeCurrentRootDescendantManifestPath: MANIFEST,
  currentStateAndPassLedgerFileName: LEDGER,
  currentStateLedgerArtifact: LEDGER,
  legacyRoadmapStatus: "HISTORICAL_PARENT_EVIDENCE",
  sourceRevisionStatus: "R44P46_SOURCE_CHANGED_ACTION_REQUIRED_BOUNDED_LEGACY_MULTIPLICATION_AND_TRUTH_REBASE",
};

const noPromotion = (value) => value.globalDecision === "NO_GO"
  && value.LIVE === false
  && value.saleEnabled === false
  && value.productionApproved === false
  && value.worldClassProven === false;
const currentIdentity = (value) => Object.entries(expectedIdentity).every(([key, expected]) => value?.[key] === expected);
const currentA83 = (value) => value.browserLensPdfEvidenceState === "TESTED_LOCAL_REAL_EXECUTION"
  && value.browserLensPdfCurrentFinalRcExecuted === true
  && value.browserLensPdfCurrentTwoRunDeterminismProven === true
  && value.browserLensPdfG11ClosureEligible === true
  && value.browserLensPdfFinalRcReceiptPath === A83_FINAL_RC_RECEIPT_PATH
  && value.browserLensPdfFinalRcReceiptSha256 === A83_FINAL_RC_RECEIPT_SHA256;
const identityProjection = (value) => Object.fromEntries(Object.keys(expectedIdentity).map((key) => [key, value?.[key]]));

const currentRelease = read("config/current-release.json");
const currentRevision = read("config/pass35/current-revision.json");
const authority = read("config/pass36/current-release-authority.json");
const packageJson = read("package.json");
const a58 = read("config/pass36/a58-release-integrity-policy.json");
const a60 = read("config/pass36/a60-exact-final-byte-build-browser-acceptance.json");
const ledgerPointer = read("config/current-state-and-pass-ledger.json");

check("G01_ACTIVE_PASS", fs.readFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), "utf8").trim() === REVISION);
check("G02_CURRENT_RELEASE_IDENTITY", currentIdentity(currentRelease) && noPromotion(currentRelease) && currentA83(currentRelease));
check("G03_CURRENT_REVISION_IDENTITY", currentIdentity(currentRevision) && noPromotion(currentRevision) && currentA83(currentRevision) && currentRevision.roadmapLivingContract === false);
check("G04_CURRENT_AUTHORITY_ROOT_IDENTITY", currentIdentity(authority) && noPromotion(authority));
check("G05_CURRENT_AUTHORITY_SOURCE_PLANE", authority.currentSource?.authorityRole === "SOURCE_ONLY"
  && authority.currentSource?.revisionId === REVISION
  && authority.currentSource?.parentRevisionId === PARENT
  && authority.currentSource?.sourceManifestPath === MANIFEST
  && authority.currentSource?.currentStateLedgerArtifact === LEDGER
  && noPromotion(authority.currentSource));
check("G06_CURRENT_AUTHORITY_CLAIMS_AND_A83_PLANE", authority.claims?.currentRevisionId === REVISION
  && authority.claims?.parentRevisionId === PARENT
  && authority.claims?.decision === "NO_GO"
  && authority.claims?.liveProven === false
  && authority.claims?.saleEnabled === false
  && authority.claims?.productionApproved === false
  && authority.claims?.worldClassProven === false
  && authority.claims?.browserLensPdfEvidenceState === "TESTED_LOCAL_REAL_EXECUTION"
  && authority.claims?.browserLensPdfCurrentFinalRcExecuted === true
  && authority.claims?.browserLensPdfCurrentTwoRunDeterminismProven === true
  && authority.claims?.browserLensPdfG11ClosureEligible === true
  && authority.claims?.browserLensPdfFinalRcReceiptPath === A83_FINAL_RC_RECEIPT_PATH
  && authority.claims?.browserLensPdfFinalRcReceiptSha256 === A83_FINAL_RC_RECEIPT_SHA256
  && authority.planes?.browserLensPdfRealPacketMatrix?.revisionId === A83_REVISION
  && authority.planes?.browserLensPdfRealPacketMatrix?.evidenceState === "TESTED_LOCAL_REAL_EXECUTION"
  && authority.planes?.browserLensPdfRealPacketMatrix?.currentSourceFinalRcExecuted === true
  && authority.planes?.browserLensPdfRealPacketMatrix?.currentSourceTwoRunDeterminismProven === true
  && authority.planes?.browserLensPdfRealPacketMatrix?.g11ClosureEligible === true
  && authority.planes?.browserLensPdfRealPacketMatrix?.finalRcReceiptPath === A83_FINAL_RC_RECEIPT_PATH
  && authority.planes?.browserLensPdfRealPacketMatrix?.finalRcReceiptSha256 === A83_FINAL_RC_RECEIPT_SHA256
  && authority.planes?.browserLensPdfRealPacketMatrix?.finalRcReceiptStatus === A83_FINAL_RC_STATUS
  && authority.planes?.browserLensPdfRealPacketMatrix?.sourceSummaryBindsHistoricalMaterialsEvidence === true
  && authority.planes?.browserLensPdfRealPacketMatrix?.sourceSummaryBindsFullMaterialsEvidence === true);
check("G07_PACKAGE_TOP_LEVEL_AND_METADATA", packageJson.velmerePass === REVISION
  && packageJson.velmereCurrentReleaseAuthorityPass === REVISION
  && packageJson.authorityRevisionId === REVISION
  && packageJson.velmereCurrentRootDescendantManifestPath === MANIFEST
  && packageJson.velmereCurrentStateAndPassLedgerFileName === LEDGER
  && packageJson.velmerePassMetadata?.currentRevisionId === REVISION
  && packageJson.velmerePassMetadata?.parentRevisionId === PARENT);
check("G08_PACKAGE_NESTED_VELMERE_IDENTITY", currentIdentity(packageJson.velmere ?? {}) && noPromotion(packageJson.velmere ?? {}));
check("G09_A58_CURRENT_SOURCE_AND_ARCHIVE_CONTRACT", a58.currentSourceRevisionId === REVISION
  && a58.currentCheckpointRevisionId === REVISION
  && a58.currentCheckpointParentRevisionId === PARENT
  && a58.currentDescendantManifestPath === MANIFEST
  && a58.currentAuthorityVerifierPath === AUTHORITY_VERIFIER
  && a58.currentAuthorityVerifierExpectedStatus === AUTHORITY_VERIFIER_STATUS
  && a58.archiveManifestPath === MANIFEST
  && a58.archiveManifestSchemaVersion === MANIFEST_SCHEMA
  && a58.archiveManifestContract?.manifestPath === MANIFEST
  && a58.archiveManifestContract?.path === MANIFEST
  && a58.archiveManifestContract?.schemaVersion === MANIFEST_SCHEMA
  && a58.archiveManifestContract?.revisionId === REVISION
  && a58.archiveManifestContract?.parentRevisionId === PARENT
  && a58.archiveManifestContract?.manifestExcludedFromOwnInventory === true
  && a58.archiveManifestContract?.sourceFingerprintField === "sourceAggregateSha256"
  && a58.archiveManifestContract?.selfDigestField === "manifestSha256");
check("G10_A60_CURRENT_SOURCE_PROFILE", a60.currentSourceRevisionId === REVISION
  && a60.currentSourceParentRevisionId === PARENT
  && a60.sourceManifestPath === MANIFEST
  && a60.currentSourceAuthorityPath === "config/pass36/current-release-authority.json"
  && a60.currentSourceProfile === "R44P46_SOURCE_ONLY_MANIFEST_V1"
  && a60.sourceManifestSchema === MANIFEST_SCHEMA
  && a60.sourceFingerprintField === "sourceAggregateSha256"
  && a60.manifestFileSha256AnchorRequired === true);
check("G11_DETACHED_CURRENT_LEDGER_POINTER", ledgerPointer.schemaVersion === "velmere.current-state-ledger-pointer.v2"
  && ledgerPointer.revisionId === REVISION
  && ledgerPointer.parentRevisionId === PARENT
  && ledgerPointer.artifactFileName === LEDGER
  && ledgerPointer.oldRoadmapStatus === "HISTORICAL_PARENT_EVIDENCE"
  && ledgerPointer.detachedFromSourceAndMaterials === true
  && ledgerPointer.isCodeAuthority === false);

const projections = [currentRelease, currentRevision, authority, packageJson.velmere].map(identityProjection);
const projectionBytes = projections.map((value) => JSON.stringify(value));
check("G12_CROSS_FILE_COHERENCE_NO_SPLIT_BRAIN", new Set(projectionBytes).size === 1
  && projections.every((value) => value.revisionId === REVISION && value.parentRevisionId === PARENT)
  && authority.currentSource.revisionId === packageJson.velmerePass
  && authority.claims.currentRevisionId === packageJson.velmerePassMetadata.currentRevisionId
  && a58.currentCheckpointRevisionId === a60.currentSourceRevisionId
  && a58.currentDescendantManifestPath === a60.sourceManifestPath
  && ledgerPointer.revisionId === authority.revisionId,
{
  revision: REVISION,
  parent: PARENT,
  manifest: MANIFEST,
  ledger: LEDGER,
});

const failed = checks.filter((row) => !row.pass);
process.stdout.write(`${JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p46.current-pointers-verification.v2",
  status: failed.length ? "FAIL_R44P46_CURRENT_POINTERS" : "PASS_R44P46_CURRENT_POINTERS",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  rows: checks,
  truthBoundary: "Twelve coherent identity groups prevent stale authority, source, manifest, ledger, package, claim or A83 receipt fields from receiving current R44P46 pointer credit. Current A83 pointer credit is bounded to the exact TESTED_LOCAL_REAL_EXECUTION two-clone receipt and grants no external, LIVE, sale, production or world-class credit. This verifier does not validate current source bytes; the separate exact source authority verifier does that after manifest freeze.",
}, null, 2)}\n`);
if (failed.length) process.exitCode = 1;
