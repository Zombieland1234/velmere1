#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { collectCleanRootSnapshot, digestWithout, readJson, REVISION, PARENT, sha256, writeJsonAtomic } from "./a77-clean-root-migration-lib.mjs";

const root = process.cwd();
const policy = readJson(root, "config/pass36/a77-clean-root-migration-policy.json");
if (policy.revisionId !== REVISION || policy.parentRevisionId !== PARENT) throw new Error("a77_policy_revision_invalid");
const snapshot = collectCleanRootSnapshot(root, policy);
if (snapshot.unknownSourcePaths.length > 0) throw new Error(`a77_unknown_source_paths:${snapshot.unknownSourcePaths.join("|")}`);
const a61PolicyBytes = fs.readFileSync(path.join(root, "config/pass36/a61-historical-artifact-recovery-policy.json"));
const a77PolicyBytes = fs.readFileSync(path.join(root, "config/pass36/a77-clean-root-migration-policy.json"));
const authorityBytes = fs.readFileSync(path.join(root, "config/pass36/current-release-authority.json"));
const programBytes = fs.readFileSync(path.join(root, "config/pass36/a77-world-class-completion-program.json"));
const legacyArtifacts = policy.legacyLineage.artifacts.map((row) => ({ id: row.id, targetPath: row.targetPath, byteLength: row.byteLength, sha256: row.sha256 }));
const genesis = {
  schemaVersion: "velmere.pass36.a77.clean-root-genesis.v1",
  revisionId: REVISION,
  parentRevisionId: PARENT,
  generatedAt: policy.deterministicEpoch,
  lineageMode: policy.lineageAdmission.cleanRootMode,
  parentSourceArchive: policy.parentSourceArchive,
  legacyLineage: {
    recoveryRevisionId: policy.legacyLineage.recoveryRevisionId,
    status: policy.legacyLineage.status,
    verifiedExact: 0,
    requiredExact: 2,
    a61Passed: false,
    syntheticReconstructionPerformed: false,
    cleanRootMayClaimLegacyRecovery: false,
    artifacts: legacyArtifacts
  },
  payload: {
    fileCount: snapshot.fileCount,
    byteLength: snapshot.byteLength,
    pathSetSha256: snapshot.pathSetSha256,
    aggregateSha256: snapshot.aggregateSha256,
    excludedSelfReferentialPaths: policy.cleanRoot.inventoryExclusions
  },
  bindings: {
    a61PolicySha256: sha256(a61PolicyBytes),
    a77PolicySha256: sha256(a77PolicyBytes),
    currentReleaseAuthoritySha256: sha256(authorityBytes),
    completionProgramSha256: sha256(programBytes)
  },
  governance: {
    dualControlRequired: true,
    requiredRoles: policy.governance.requiredRoles,
    externalTrustRootsSha256Required: true,
    verifiedDecision: policy.governance.verifiedDecision,
    currentDecision: policy.governance.blockedDecision
  },
  claims: {
    historicalArtifactsRecovered: false,
    cleanRootGovernanceApproved: false,
    exactFinalByteBuildExecuted: false,
    realStagingExecuted: false,
    liveProven: false,
    saleEnabled: false,
    worldClassProven: false
  },
  truthBoundary: policy.truthBoundary
};
genesis.genesisDigestSha256 = digestWithout(genesis, ["genesisDigestSha256"]);
const output = path.join(root, policy.cleanRoot.genesisPath);
writeJsonAtomic(output, genesis);
console.log(JSON.stringify({ status: "PASS_LOCAL_CLEAN_ROOT_CONSTRUCTION_NO_GOVERNANCE_PROMOTION", output: policy.cleanRoot.genesisPath, fileCount: snapshot.fileCount, byteLength: snapshot.byteLength, aggregateSha256: snapshot.aggregateSha256, genesisDigestSha256: genesis.genesisDigestSha256 }, null, 2));
