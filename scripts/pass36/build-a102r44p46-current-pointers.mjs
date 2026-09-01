#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REVISION = "VELMERE_PASS36_A102R44P46_ACTION_REQUIRED_LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE_NO_LIVE_CREDIT";
export const PARENT = "VELMERE_PASS36_A102R44P45_ACTION_REQUIRED_CONTINUOUS_CURRENT_STATE_CONTEXT_QUALIFIED_INTERACTION_ORDERING_PUBLIC_CONTROL_DELTA_NO_LIVE_CREDIT";
export const MANIFEST = "_velmere/PASS36_A102R44P46_SOURCE_ONLY_MANIFEST.json";
export const LEDGER = "VELMERE_CURRENT_STATE_AND_PASS_LEDGER_PASS36_A102R44P46_ACTION_REQUIRED_LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE_NO_LIVE_CREDIT.txt";
export const MANIFEST_SCHEMA = "velmere.pass36.a102r44p46.source-manifest.v1";
export const AUTHORITY_VERIFIER = "scripts/pass36/verify-a102r44p46-current-source-authority.mjs";
export const AUTHORITY_VERIFIER_STATUS = "PASS_A102R44P46_CURRENT_SOURCE_AUTHORITY_EXACT_NO_LIVE_OR_SALE_CREDIT";
export const A83_REVISION = "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY";
export const A83_FINAL_RC_RECEIPT_PATH = "qa/pdf-final-rc/R44P46_A83_FINAL_RC_TWO_RUN_RECEIPT.json";
export const A83_FINAL_RC_RECEIPT_SHA256 = "c1a56b18d111f437841273598a728c06513e83720893f228e899413881141a07";
export const A83_FINAL_RC_STATUS = "PASS_A83_R44P46_FINAL_RC_TWO_DISPOSABLE_CLONES_BYTE_IDENTICAL";

const flags = (value) => Object.assign(value, {
  globalDecision: "NO_GO",
  LIVE: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
});

const currentIdentity = (value) => Object.assign(value, {
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
});

export function buildCurrentPointers(rootPath = process.cwd()) {
  const root = path.resolve(rootPath);
  const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
  const write = (relative, value) => fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);

  fs.writeFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), `${REVISION}\n`);

  for (const relative of ["config/current-release.json", "config/pass35/current-revision.json"]) {
    const value = currentIdentity(flags(read(relative)));
    Object.assign(value, {
      browserLensPdfEvidenceState: "TESTED_LOCAL_REAL_EXECUTION",
      browserLensPdfCurrentFinalRcExecuted: true,
      browserLensPdfCurrentTwoRunDeterminismProven: true,
      browserLensPdfG11ClosureEligible: true,
      browserLensPdfFinalRcReceiptPath: A83_FINAL_RC_RECEIPT_PATH,
      browserLensPdfFinalRcReceiptSha256: A83_FINAL_RC_RECEIPT_SHA256,
    });
    if (relative.includes("pass35")) value.roadmapLivingContract = false;
    write(relative, value);
  }

  const authority = currentIdentity(flags(read("config/pass36/current-release-authority.json")));
  authority.currentSource = flags({
    authorityRole: "SOURCE_ONLY",
    revisionId: REVISION,
    parentRevisionId: PARENT,
    sourceManifestPath: MANIFEST,
    currentStateLedgerArtifact: LEDGER,
  });
  authority.claims = Object.assign(authority.claims ?? {}, {
    currentRevisionId: REVISION,
    parentRevisionId: PARENT,
    decision: "NO_GO",
    liveProven: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
    browserLensPdfEvidenceState: "TESTED_LOCAL_REAL_EXECUTION",
    browserLensPdfCurrentFinalRcExecuted: true,
    browserLensPdfCurrentTwoRunDeterminismProven: true,
    browserLensPdfG11ClosureEligible: true,
    browserLensPdfFinalRcReceiptPath: A83_FINAL_RC_RECEIPT_PATH,
    browserLensPdfFinalRcReceiptSha256: A83_FINAL_RC_RECEIPT_SHA256,
  });
  authority.planes = authority.planes ?? {};
  authority.planes.browserLensPdfRealPacketMatrix = Object.assign(
    authority.planes.browserLensPdfRealPacketMatrix ?? {},
    {
      revisionId: A83_REVISION,
      evidenceState: "TESTED_LOCAL_REAL_EXECUTION",
      currentSourceFinalRcExecuted: true,
      currentSourceTwoRunDeterminismProven: true,
      g11ClosureEligible: true,
      finalRcReceiptPath: A83_FINAL_RC_RECEIPT_PATH,
      finalRcReceiptSha256: A83_FINAL_RC_RECEIPT_SHA256,
      finalRcReceiptStatus: A83_FINAL_RC_STATUS,
      sourceSummaryBindsHistoricalMaterialsEvidence: true,
      sourceSummaryBindsFullMaterialsEvidence: true,
    },
  );
  write("config/pass36/current-release-authority.json", authority);

  const packageJson = read("package.json");
  packageJson.velmerePass = REVISION;
  packageJson.velmereCurrentReleaseAuthorityPass = REVISION;
  packageJson.velmereCurrentRootDescendantManifestPath = MANIFEST;
  packageJson.velmereCurrentStateAndPassLedgerFileName = LEDGER;
  packageJson.authorityRevisionId = REVISION;
  packageJson.velmerePassMetadata = Object.assign(packageJson.velmerePassMetadata ?? {}, {
    currentRevisionId: REVISION,
    parentRevisionId: PARENT,
  });
  packageJson.velmere = currentIdentity(flags(packageJson.velmere ?? {}));
  write("package.json", packageJson);

  const a58 = read("config/pass36/a58-release-integrity-policy.json");
  Object.assign(a58, {
    currentCheckpointRevisionId: REVISION,
    currentCheckpointParentRevisionId: PARENT,
    currentDescendantManifestPath: MANIFEST,
    currentAuthorityVerifierPath: AUTHORITY_VERIFIER,
    currentAuthorityVerifierExpectedStatus: AUTHORITY_VERIFIER_STATUS,
    archiveManifestPath: MANIFEST,
    archiveManifestSchemaVersion: MANIFEST_SCHEMA,
    currentSourceRevisionId: REVISION,
    archiveManifestContract: {
      schemaVersion: MANIFEST_SCHEMA,
      revisionId: REVISION,
      parentRevisionId: PARENT,
      path: MANIFEST,
      manifestPath: MANIFEST,
      manifestExcludedFromOwnInventory: true,
      fileFields: ["path", "byteLength", "sha256"],
      sourceFingerprintField: "sourceAggregateSha256",
      selfDigestField: "manifestSha256",
      checkpointClass: "ACTION_REQUIRED_NON_PASS",
      normalizedArchiveFileMode: 33188,
    },
    truthBoundary: "R44P46 binds the exact SOURCE_ONLY manifest schema, revision, parent, path, file bytes and sourceAggregateSha256. The manifest normalizes archive entries to regular-file mode and does not grant exact build, Browser, LIVE, production or sale credit.",
  });
  write("config/pass36/a58-release-integrity-policy.json", a58);

  const a60 = read("config/pass36/a60-exact-final-byte-build-browser-acceptance.json");
  Object.assign(a60, {
    currentSourceRevisionId: REVISION,
    currentSourceParentRevisionId: PARENT,
    sourceManifestPath: MANIFEST,
    currentSourceProfile: "R44P46_SOURCE_ONLY_MANIFEST_V1",
    sourceManifestSchema: MANIFEST_SCHEMA,
    sourceFingerprintField: "sourceAggregateSha256",
    manifestFileSha256AnchorRequired: true,
  });
  write("config/pass36/a60-exact-final-byte-build-browser-acceptance.json", a60);

  write("config/current-state-and-pass-ledger.json", {
    schemaVersion: "velmere.current-state-ledger-pointer.v2",
    revisionId: REVISION,
    parentRevisionId: PARENT,
    artifactFileName: LEDGER,
    oldRoadmapStatus: "HISTORICAL_PARENT_EVIDENCE",
    isCodeAuthority: false,
    detachedFromSourceAndMaterials: true,
  });

  return { status: "BUILT_R44P46_CURRENT_POINTERS", revisionId: REVISION, manifest: MANIFEST, ledger: LEDGER };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(buildCurrentPointers(process.argv[2]), null, 2)}\n`);
}
