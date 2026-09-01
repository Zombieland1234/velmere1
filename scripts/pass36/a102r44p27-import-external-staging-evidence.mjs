#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readDescriptorBoundRegularFile } from "./descriptor-bound-regular-file.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { verifyTrustedEnvelope, sha256 } from "./a102r44p27-trusted-external-evidence-lib.mjs";
import { verifyStagingSemantics } from "./a102r44p26-staging-semantic-lib.mjs";
import { commitEvidenceAdmission, readAdmissionSnapshot } from "./a102r44p27-external-evidence-admission-journal.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function readJson(filePath, maximumBytes = 16 * 1024 * 1024, label = "r44p27_json") {
  const read = readDescriptorBoundRegularFile(filePath, { maxBytes: maximumBytes, errorPrefix: label });
  return {
    value: parseStrictJsonCli(read.bytes.toString("utf8"), {
      maxBytes: maximumBytes,
      maxDepth: 128,
      maxNodes: 2_000_000,
      requireObject: true,
    }),
    binding: read.binding,
    bytes: read.bytes,
  };
}

const envelopePath = argument("--envelope");
const trustPath = argument("--trust-policy");
const semanticPath = argument("--semantic-policy");
const admissionPolicyPath = argument("--admission-policy");
const artifactRootArgument = argument("--artifact-root");
const admissionRoot = argument("--admission-root");
const revisionId = argument("--expected-revision");
const sourceManifestSha256 = argument("--expected-source");

if (![envelopePath, trustPath, semanticPath, admissionPolicyPath, artifactRootArgument, admissionRoot, revisionId, sourceManifestSha256].every(Boolean)) {
  console.error("Usage: node ... --envelope FILE --trust-policy FILE --semantic-policy FILE --admission-policy FILE --artifact-root DIR --admission-root DIR --expected-revision ID --expected-source SHA");
  process.exit(2);
}

let result;
try {
  const envelopeRead = readJson(envelopePath, 16 * 1024 * 1024, "r44p27_envelope");
  const trustRead = readJson(trustPath, 2 * 1024 * 1024, "r44p27_trust_policy");
  const semanticRead = readJson(semanticPath, 2 * 1024 * 1024, "r44p27_semantic_policy");
  const admissionRead = readJson(admissionPolicyPath, 2 * 1024 * 1024, "r44p27_admission_policy");
  const admissionPolicySha256 = sha256(admissionRead.bytes);
  const policyChecks = {
    revision: admissionRead.value.revisionId === revisionId,
    sourceBinding: admissionRead.value.sourceBinding?.providedAtRuntime === true && admissionRead.value.sourceBinding?.exactSha256Required === true && admissionRead.value.sourceBinding?.selfReferenceForbidden === true,
    semanticRevision: semanticRead.value.revisionId === revisionId,
    environment: semanticRead.value.environmentClass === "DISPOSABLE_TEST",
    replayRequired: admissionRead.value.replayJournal?.required === true,
    atomicCommitRequired: admissionRead.value.replayJournal?.atomicCommitRequired === true,
    rawIdentifierStorageForbidden: admissionRead.value.replayJournal?.storeRawEvidenceIdOrNonce === false,
  };
  const policyPass = Object.values(policyChecks).every(Boolean);

  let snapshotBefore = null;
  try {
    snapshotBefore = readAdmissionSnapshot({
      sourceRoot: ROOT,
      admissionRoot,
      revisionId,
      sourceManifestSha256,
      policySha256: admissionPolicySha256,
      maximumEntries: admissionRead.value.replayJournal.maximumEntries,
      maximumEntryBytes: admissionRead.value.replayJournal.maximumEntryBytes,
      allowUninitialized: true,
    });
  } catch (error) {
    throw new Error(`admission_journal_preflight_failed:${String(error?.message ?? error)}`, { cause: error });
  }

  const trust = verifyTrustedEnvelope(envelopeRead.value, {
    expectedRevisionId: revisionId,
    expectedSourceManifestSha256: sourceManifestSha256,
    trustPolicy: trustRead.value,
    maxAgeMs: admissionRead.value.envelope.maximumAgeMs,
    maximumEnvelopeLifetimeMs: admissionRead.value.envelope.maximumLifetimeMs,
  });
  const semantic = verifyStagingSemantics(envelopeRead.value.claims, semanticRead.value);

  const artifactRoot = path.resolve(artifactRootArgument);
  const artifacts = Array.isArray(envelopeRead.value.claims?.artifacts) ? envelopeRead.value.claims.artifacts : [];
  const rows = [];
  const seenPaths = new Set();
  const artifactByPath = new Map();
  let totalBytes = 0;
  let artifactPass = true;
  for (const item of artifacts) {
    let ok = true;
    let code = "PASS";
    try {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("artifact_row_invalid");
      if (typeof item.path !== "string" || path.isAbsolute(item.path) || item.path.split(/[\\/]/u).includes("..") || seenPaths.has(item.path)) {
        throw new Error("artifact_path_invalid");
      }
      seenPaths.add(item.path);
      const full = path.resolve(artifactRoot, item.path);
      if (full !== artifactRoot && !full.startsWith(`${artifactRoot}${path.sep}`)) throw new Error("artifact_path_escape");
      const read = readDescriptorBoundRegularFile(full, {
        maxBytes: semanticRead.value.artifactPolicy.maximumArtifactBytes,
        errorPrefix: "r44p27_artifact",
      });
      totalBytes += read.bytes.length;
      if (totalBytes > semanticRead.value.artifactPolicy.maximumTotalBytes) throw new Error("artifact_total_limit");
      if (read.binding.sha256 !== item.sha256 || read.binding.byteLength !== item.byteLength) throw new Error("artifact_binding_mismatch");
      artifactByPath.set(item.path, { sha256: item.sha256, byteLength: item.byteLength });
    } catch (error) {
      ok = false;
      code = String(error?.message ?? error);
    }
    artifactPass &&= ok;
    rows.push({ pathSha256: typeof item?.path === "string" ? sha256(item.path) : null, ok, code });
  }
  if (artifacts.length > semanticRead.value.artifactPolicy.maximumArtifacts) artifactPass = false;

  const semanticRows = Object.values(envelopeRead.value.claims?.tracks ?? {}).flatMap((track) => Array.isArray(track?.rows) ? track.rows : []);
  const semanticArtifactPaths = semanticRows.map((row) => row?.artifactPath);
  const semanticArtifactSet = new Set(semanticArtifactPaths);
  const exactArtifactSet = semanticArtifactPaths.length === semanticRows.length
    && semanticArtifactSet.size === semanticRows.length
    && semanticRows.every((row) => {
      const artifact = artifactByPath.get(row.artifactPath);
      return artifact && artifact.sha256 === row.artifactSha256 && artifact.byteLength === row.artifactBytes;
    })
    && artifacts.length === semanticRows.length
    && artifacts.every((artifact) => semanticArtifactSet.has(artifact.path));
  artifactPass &&= exactArtifactSet;

  const preAdmissionPass = policyPass
    && trust.failed === 0
    && semantic.semanticPass
    && artifactPass
    && envelopeRead.value.claims.syntheticFixture === false;

  let admission = null;
  let admissionError = null;
  if (preAdmissionPass) {
    try {
      admission = commitEvidenceAdmission({
        sourceRoot: ROOT,
        admissionRoot,
        revisionId,
        sourceManifestSha256,
        policySha256: admissionPolicySha256,
        evidenceId: envelopeRead.value.evidenceId,
        nonce: envelopeRead.value.nonce,
        envelopeSha256: envelopeRead.binding.sha256,
        payloadSha256: envelopeRead.value.payloadSha256,
        keyId: envelopeRead.value.signature.keyId,
        programId: envelopeRead.value.claims.programId,
        executionId: envelopeRead.value.claims.executionId,
        observedAt: envelopeRead.value.observedAt,
        maximumEntries: admissionRead.value.replayJournal.maximumEntries,
        maximumEntryBytes: admissionRead.value.replayJournal.maximumEntryBytes,
        maximumWaitMs: admissionRead.value.replayJournal.maximumLockWaitMs,
      });
    } catch (error) {
      admissionError = String(error?.message ?? error);
    }
  }

  let snapshotAfter = snapshotBefore;
  try {
    snapshotAfter = readAdmissionSnapshot({
      sourceRoot: ROOT,
      admissionRoot,
      revisionId,
      sourceManifestSha256,
      policySha256: admissionPolicySha256,
      maximumEntries: admissionRead.value.replayJournal.maximumEntries,
      maximumEntryBytes: admissionRead.value.replayJournal.maximumEntryBytes,
      allowUninitialized: true,
    });
  } catch (error) {
    admissionError ??= `admission_journal_postflight_failed:${String(error?.message ?? error)}`;
  }

  const accepted = preAdmissionPass && admission !== null && admissionError === null;
  result = {
    schemaVersion: "velmere.pass36.a102r44p27.external-staging-evidence-import.v1",
    status: accepted
      ? "PASS_EXTERNAL_EVIDENCE_DURABLY_ADMITTED_PENDING_INDEPENDENT_STAGING_CREDIT"
      : "ACTION_REQUIRED_EXTERNAL_EVIDENCE_REJECTED",
    envelopeBinding: envelopeRead.binding,
    trustPolicyBinding: trustRead.binding,
    semanticPolicyBinding: semanticRead.binding,
    admissionPolicyBinding: admissionRead.binding,
    policyChecks,
    trust,
    semantic,
    artifactVerification: {
      status: artifactPass ? "PASS" : "FAIL",
      artifacts: artifacts.length,
      semanticRows: semanticRows.length,
      totalBytes,
      exactSemanticArtifactBijection: exactArtifactSet,
      rows,
    },
    durableAdmission: {
      status: admission?.status ?? "NOT_COMMITTED",
      error: admissionError,
      sequenceBefore: snapshotBefore.sequence,
      sequenceAfter: snapshotAfter.sequence,
      journalId: snapshotAfter.coordinates.journalId,
      entryDigest: admission?.entryDigest ?? null,
      rawIdentifiersStored: false,
    },
    acceptedForIndependentReview: accepted,
    verifiedDenominatorIncrement: accepted ? semantic.verifiedDenominatorIncrement : 0,
    stagingCredit: false,
    saleCredit: false,
    liveCredit: false,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(accepted ? 0 : admissionError?.includes("replay") ? 4 : 3);
} catch (error) {
  result = {
    schemaVersion: "velmere.pass36.a102r44p27.external-staging-evidence-import.v1",
    status: "ACTION_REQUIRED_EXTERNAL_EVIDENCE_REJECTED",
    error: String(error?.message ?? error),
    acceptedForIndependentReview: false,
    verifiedDenominatorIncrement: 0,
    stagingCredit: false,
    saleCredit: false,
    liveCredit: false,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(3);
}
