import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildCycloneDxSbom,
  validateCycloneDxSbom,
} from "../pass4992/supply-chain-release.mjs";
import {
  canonicalJson,
  collectPass35Inventory,
  PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS,
  sha256,
} from "./source-inventory.mjs";

export const PASS35_CANDIDATE_ID = "VELMERE_PASS35_OFFLINE_CANDIDATE_R3";
export const PASS35_CANONICAL_GENERATOR = "scripts/pass35/build-release-manifests.mjs";
export const PASS35_CANONICAL_VERIFIER = "scripts/pass35/verify-release-manifests.mjs";
export const PASS35_MANIFEST_PROFILES = Object.freeze({
  WORKSPACE: "workspace",
  SOURCE_PACKAGE: "source-package",
});
export const PASS35_MANIFEST_PATHS = Object.freeze([
  "artifacts/release/FILE_MANIFEST.csv",
  "artifacts/release/SOURCE_IDENTITY.json",
  "artifacts/release/SBOM.cdx.json",
  "artifacts/release/PROVENANCE.intoto.json",
  "artifacts/release/EVIDENCE_INDEX.json",
  "artifacts/release/MANIFEST_AUTHORITY.json",
  "artifacts/release/MASTER_MAP.json",
]);

const CANONICAL_OUTPUTS = new Set(PASS35_MANIFEST_PATHS);
const JSON_PATHS = PASS35_MANIFEST_PATHS.filter((entry) => entry.endsWith(".json"));
const DIGEST = /^[a-f0-9]{64}$/u;
const SOURCE_PACKAGE_CONTROL_METADATA = new Set(PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS);

export function normalizePass35ManifestProfile(value) {
  if (value === PASS35_MANIFEST_PROFILES.WORKSPACE || value === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE) return value;
  throw new Error(`pass35_manifest_profile_invalid:${String(value ?? "")}`);
}

export function detectPass35ManifestProfile(rootPath, fallback = PASS35_MANIFEST_PROFILES.WORKSPACE) {
  const root = path.resolve(rootPath);
  try {
    const authority = JSON.parse(readFileSync(path.join(root, "artifacts/release/MANIFEST_AUTHORITY.json"), "utf8"));
    if (authority?.manifestProfile) return normalizePass35ManifestProfile(authority.manifestProfile);
  } catch {
    // A missing or legacy authority uses the explicit fallback.
  }
  return normalizePass35ManifestProfile(fallback);
}

function json(root, relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function digestObject(core) {
  return sha256(canonicalJson(core));
}

function without(object, key) {
  const clone = { ...object };
  delete clone[key];
  return clone;
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function normalizedMode(mode) {
  return Number(mode).toString(8).padStart(6, "0");
}

function manifestMode(mode, manifestProfile) {
  // SOURCE_ONLY must remain reproducible after ordinary extraction on Windows,
  // Python zipfile and Unix tools that do not preserve POSIX executable bits.
  // Archive-entry modes remain bound separately by the embedded ZIP manifest;
  // the canonical source-package identity is intentionally content/path based.
  return manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
    ? "100644"
    : normalizedMode(mode);
}

function evidenceClass(entry) {
  if (entry.role === "HISTORY") return "HISTORICAL_RELEASE_MATERIAL";
  if (entry.role === "QUARANTINE") return "RECOVERY_ONLY_QUARANTINE";
  if (entry.path === "_velmere/pass35/PASS35_OFFLINE_EXECUTION_RECEIPT.json") return "DECLARED_EXECUTION_SUMMARY_NOT_CANONICAL_PROOF";
  if (entry.path.startsWith("_velmere/pass35/")) return "PASS35_CANDIDATE_RECEIPT";
  if (entry.path.startsWith(".velmere/deployment-builds/")) return "LOCAL_BUILD_RECEIPT";
  if (entry.path.startsWith(".velmere/deployment-smoke/")) return "LOCAL_PRODUCTION_PROCESS_SMOKE_RECEIPT";
  if (entry.path.startsWith("artifacts/release/commands/")) return "SUPERSEDED_COMMAND_RECEIPT";
  return "LOCAL_ENGINEERING_EVIDENCE";
}

function referencedEvidencePaths(value, available, result = new Set()) {
  if (typeof value === "string") {
    if (available.has(value)) result.add(value);
    return result;
  }
  if (Array.isArray(value)) {
    for (const item of value) referencedEvidencePaths(item, available, result);
    return result;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) referencedEvidencePaths(item, available, result);
  }
  return result;
}

function artifactReference(relativePath, bytes) {
  return {
    path: relativePath,
    byteLength: bytes.length,
    sha256: sha256(bytes),
  };
}

function provenanceFor({ epoch, manifestProfile, sourceIdentityBytes, sbomBytes, evidenceIndexBytes, sourceSha256, lockfileSha256 }) {
  return {
    _type: "https://in-toto.io/Statement/v1",
    subject: [
      { name: "artifacts/release/SOURCE_IDENTITY.json", digest: { sha256: sha256(sourceIdentityBytes) } },
      { name: "artifacts/release/SBOM.cdx.json", digest: { sha256: sha256(sbomBytes) } },
      { name: "artifacts/release/EVIDENCE_INDEX.json", digest: { sha256: sha256(evidenceIndexBytes) } },
    ],
    predicateType: "https://slsa.dev/provenance/v1",
    predicate: {
      buildDefinition: {
        buildType: "https://velmere.invalid/build-types/pass35-local-manifest-set/v1",
        externalParameters: {
          candidateId: PASS35_CANDIDATE_ID,
          manifestProfile,
          purpose: manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
            ? "local_source_package_self_verification_only"
            : "local_offline_workspace_manifest_generation_only",
          networkRequired: false,
        },
        internalParameters: {
          trustedBuilder: false,
          signatureIssued: false,
          independentVerificationCompleted: false,
        },
        resolvedDependencies: [
          { uri: "urn:velmere:pass35-source-tree", digest: { sha256: sourceSha256 } },
          { uri: "package-lock.json", digest: { sha256: lockfileSha256 } },
        ],
      },
      runDetails: {
        builder: { id: "https://velmere.invalid/builders/local-pass35-unsigned" },
        metadata: {
          invocationId: `urn:sha256:${sha256(`pass35-manifest-set:${manifestProfile}:${sourceSha256}:${epoch}`)}`,
          startedOn: epoch,
          finishedOn: epoch,
        },
        byproducts: [],
      },
    },
    signatures: [],
    trust: {
      status: "LOCAL_UNSIGNED_UNTRUSTED",
      productionProvenance: false,
      externalAttestation: false,
    },
    truthBoundary: "This is deterministic local, unsigned and explicitly untrusted provenance. It is not an external attestation, trusted-builder statement, transparency-log record, signature, or production provenance.",
  };
}

export function buildPass35ManifestSet(rootPath, { profile = null } = {}) {
  const root = path.resolve(rootPath);
  const manifestProfile = normalizePass35ManifestProfile(profile ?? detectPass35ManifestProfile(root));
  const current = json(root, "config/current-release.json");
  const execution = json(root, "_velmere/pass35/PASS35_OFFLINE_EXECUTION_RECEIPT.json");
  const preGates = json(root, "config/pass35/pre-gates.json");
  const catalog = json(root, "config/pass35/product-cell-catalog.json");
  const legal = json(root, "config/pass35/legal-applicability.json");
  const staging = json(root, "config/pass35/staging-plan.json");
  const provider = json(root, "config/pass35/provider-denominator.json");
  const audit = json(root, "config/pass35/audit-program.json");
  if (current.candidateId !== PASS35_CANDIDATE_ID || execution.candidateId !== PASS35_CANDIDATE_ID) {
    throw new Error("pass35_candidate_identity_mismatch");
  }
  if (current.releaseId !== null || current.productionPromotionAllowed !== false || preGates.promotionAllowed !== false) {
    throw new Error("pass35_manifest_generation_requires_no_promotion_state");
  }
  if (typeof preGates.evaluatedAt !== "string" || !Number.isFinite(Date.parse(preGates.evaluatedAt))) {
    throw new Error("pass35_deterministic_epoch_missing");
  }

  const epoch = preGates.evaluatedAt;
  const inventory = collectPass35Inventory(root);
  if (inventory.unknownCount !== 0) throw new Error(`pass35_inventory_unknown_paths:${inventory.unknownCount}`);

  const sourceEntries = inventory.entries
    .filter((entry) => entry.sourceIncluded)
    .map((entry) => ({
      path: entry.path,
      role: entry.role,
      byteLength: entry.byteLength,
      mode: manifestMode(entry.mode, manifestProfile),
      sha256: entry.sha256,
    }));
  const fileManifestText = [
    "path,role,bytes,mode,sha256",
    ...sourceEntries.map((entry) => [
      csvCell(entry.path),
      csvCell(entry.role),
      entry.byteLength,
      csvCell(entry.mode),
      entry.sha256,
    ].join(",")),
  ].join("\n") + "\n";
  const fileManifestBytes = Buffer.from(fileManifestText);

  const packageJsonText = readFileSync(path.join(root, "package.json"), "utf8");
  const packageLockText = readFileSync(path.join(root, "package-lock.json"), "utf8");
  const lockfileSha256 = sha256(packageLockText);
  const sbom = buildCycloneDxSbom({ packageJsonText, packageLockText, generatedAt: epoch });
  const sbomBytes = jsonBytes(sbom);

  const evidenceEntries = inventory.entries
    .filter((entry) => !entry.sourceIncluded && ["EVIDENCE", "HISTORY", "QUARANTINE"].includes(entry.role))
    .filter((entry) => !CANONICAL_OUTPUTS.has(entry.path))
    .filter((entry) => manifestProfile === PASS35_MANIFEST_PROFILES.WORKSPACE
      || SOURCE_PACKAGE_CONTROL_METADATA.has(entry.path))
    .map((entry) => ({
      path: entry.path,
      role: entry.role,
      evidenceClass: evidenceClass(entry),
      byteLength: entry.byteLength,
      sha256: entry.sha256,
    }));
  const availableEvidence = new Set(evidenceEntries.map((entry) => entry.path));
  const currentEvidencePaths = [...referencedEvidencePaths(execution, availableEvidence)].sort();
  if (availableEvidence.has("_velmere/pass35/PASS35_OFFLINE_EXECUTION_RECEIPT.json")) {
    currentEvidencePaths.unshift("_velmere/pass35/PASS35_OFFLINE_EXECUTION_RECEIPT.json");
  }
  const uniqueCurrentEvidencePaths = [...new Set(currentEvidencePaths)].sort();
  const evidenceCore = {
    schemaVersion: "velmere.pass35.evidence-index.v1",
    candidateId: PASS35_CANDIDATE_ID,
    deterministicEpoch: epoch,
    manifestProfile,
    status: manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
      ? "LOCAL_SOURCE_PACKAGE_EVIDENCE_INDEX_NO_EXTERNAL_ASSURANCE"
      : "LOCAL_WORKSPACE_EVIDENCE_INDEX_NO_EXTERNAL_ASSURANCE",
    promotionAllowed: false,
    entryCount: evidenceEntries.length,
    byteLength: evidenceEntries.reduce((sum, entry) => sum + entry.byteLength, 0),
    aggregateSha256: sha256(canonicalJson(evidenceEntries)),
    currentCandidateEvidencePaths: uniqueCurrentEvidencePaths,
    entries: evidenceEntries,
    exclusions: [
      ...PASS35_MANIFEST_PATHS.map((entry) => ({ path: entry, reason: "canonical_output_self_reference_prevention" })),
      ...(manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
        ? [{ path: "workspace-only-evidence", reason: "source_package_profile_indexes_only_explicit_bundled_control_metadata" }]
        : []),
    ],
    truthBoundary: manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
      ? "The source-package index authenticates only the explicit control metadata shipped inside SOURCE_ONLY. Workspace evidence/history remains bound separately by the detached evidence archive and receipt. No external, legal, staging, LIVE, independent, signed, or production proof is created."
      : "The workspace index authenticates local evidence, history and quarantine bytes. Presence in this index does not upgrade evidence to legal, staging, LIVE, independent, signed, or production proof.",
  };
  const evidenceIndex = { ...evidenceCore, evidenceIndexSha256: digestObject(evidenceCore) };
  const evidenceIndexBytes = jsonBytes(evidenceIndex);

  const pointerBytes = readFileSync(path.join(root, "config/current-release.json"));
  const identityCore = {
    schemaVersion: "velmere.pass35.source-identity.v1",
    candidateId: PASS35_CANDIDATE_ID,
    releaseId: null,
    baselineReleaseId: current.baselineReleaseId,
    deterministicEpoch: epoch,
    manifestProfile,
    status: manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
      ? "OFFLINE_SOURCE_PACKAGE_IDENTITY_NO_PROMOTION"
      : "OFFLINE_WORKSPACE_CANDIDATE_IDENTITY_NO_PROMOTION",
    promotionAllowed: false,
    inputSourceArchive: current.inputSourceArchive,
    sourceTree: {
      fileCount: sourceEntries.length,
      byteLength: sourceEntries.reduce((sum, entry) => sum + entry.byteLength, 0),
      pathSetSha256: sha256(sourceEntries.map((entry) => entry.path).join("\n")),
      aggregateSha256: sha256(canonicalJson(sourceEntries)),
      modePolicy: manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
        ? "PORTABLE_CONTENT_IDENTITY_NORMALIZED_TO_100644"
        : "WORKSPACE_NATIVE_POSIX_MODE_BOUND",
    },
    packageLock: { path: "package-lock.json", sha256: lockfileSha256 },
    currentReleasePointer: { path: "config/current-release.json", sha256: sha256(pointerBytes) },
    canonicalInputs: {
      fileManifest: artifactReference("artifacts/release/FILE_MANIFEST.csv", fileManifestBytes),
      sbom: artifactReference("artifacts/release/SBOM.cdx.json", sbomBytes),
      evidenceIndex: artifactReference("artifacts/release/EVIDENCE_INDEX.json", evidenceIndexBytes),
    },
    inventoryCrossCheck: manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
      ? {
        sourceFileCount: sourceEntries.length,
        sourceByteLength: sourceEntries.reduce((sum, entry) => sum + entry.byteLength, 0),
        sourcePathSetSha256: sha256(sourceEntries.map((entry) => entry.path).join("\n")),
        sourceAggregateSha256: sha256(canonicalJson(sourceEntries)),
        modeNormalizationApplied: true,
      }
      : {
        sourceFileCount: inventory.source.fileCount,
        sourceByteLength: inventory.source.byteLength,
        sourcePathSetSha256: inventory.source.pathSetSha256,
        sourceAggregateSha256: inventory.source.aggregateSha256,
        modeNormalizationApplied: false,
      },
    truthBoundary: manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
      ? "Source identity covers the explicit unpacked SOURCE_ONLY package profile and its bundled control metadata boundary. It excludes workspace-only evidence and does not claim external verification, signature, legal approval, staging, LIVE operation, or production promotion."
      : "Source identity covers the explicit PASS35 workspace source classification. It excludes generated build output and does not claim external verification, signature, legal approval, staging, LIVE operation, or production promotion.",
  };
  const sourceIdentity = { ...identityCore, identitySha256: digestObject(identityCore) };
  const sourceIdentityBytes = jsonBytes(sourceIdentity);

  const provenance = provenanceFor({
    epoch,
    manifestProfile,
    sourceIdentityBytes,
    sbomBytes,
    evidenceIndexBytes,
    sourceSha256: sourceIdentity.sourceTree.aggregateSha256,
    lockfileSha256,
  });
  const provenanceBytes = jsonBytes(provenance);

  const authorityCore = {
    schemaVersion: "velmere.pass35.manifest-authority.v1",
    candidateId: PASS35_CANDIDATE_ID,
    deterministicEpoch: epoch,
    manifestProfile,
    canonicalGenerator: PASS35_CANONICAL_GENERATOR,
    canonicalVerifier: PASS35_CANONICAL_VERIFIER,
    generationMode: manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
      ? "SOURCE_PACKAGE_SCOPED_DETERMINISTIC_SET_REQUIRES_UNPACKED_VERIFICATION"
      : "WORKSPACE_SCOPED_STAGED_ATOMIC_PER_FILE_FULL_SET_REQUIRES_VERIFICATION",
    canonicalArtifacts: PASS35_MANIFEST_PATHS.filter((entry) => !entry.endsWith("MASTER_MAP.json")),
    compatibilityAliases: [
      "scripts/release/build-source-identity.mjs",
      "scripts/release/build-evidence-index.mjs",
      "scripts/release/build-master-map.mjs",
    ],
    supersededCurrentSchemas: [
      "velmere.source-identity.v1",
      "velmere.evidence-index.v1",
      "velmere.master-map.v1",
    ],
    nonCanonicalSummaries: [{
      path: "_velmere/pass35/PASS35_OFFLINE_EXECUTION_RECEIPT.json",
      status: "DECLARED_SUMMARY_BYTE_BOUND_BUT_NOT_ACCEPTED_AS_CANONICAL_PROOF",
      reason: "The summary is manually assembled, has no self-digest, and is not reproducibly derived from all named command/build receipts. The canonical set indexes and hashes it without upgrading its claims.",
    }],
    preservationPolicy: {
      deleteSupersededArtifacts: false,
      archiveBeforeFirstPass35Overwrite: true,
      archiveRoot: "artifacts/release/history/pass30_superseded_manifest_set",
    },
    promotionAllowed: false,
    truthBoundary: manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
      ? "Authority establishes the package-scoped local generator used for unpacked SOURCE_ONLY self-verification. Workspace evidence is not silently imported. This does not create a signature, trusted builder, external provenance, release promotion, or independent assurance."
      : "Authority establishes the workspace-scoped local generator for the PASS35 manifest set. It does not create a signature, trusted builder, external provenance, release promotion, or independent assurance.",
  };
  const authority = { ...authorityCore, authoritySha256: digestObject(authorityCore) };
  const authorityBytes = jsonBytes(authority);

  const artifactBytes = new Map([
    ["artifacts/release/FILE_MANIFEST.csv", fileManifestBytes],
    ["artifacts/release/SOURCE_IDENTITY.json", sourceIdentityBytes],
    ["artifacts/release/SBOM.cdx.json", sbomBytes],
    ["artifacts/release/PROVENANCE.intoto.json", provenanceBytes],
    ["artifacts/release/EVIDENCE_INDEX.json", evidenceIndexBytes],
    ["artifacts/release/MANIFEST_AUTHORITY.json", authorityBytes],
  ]);
  const masterCore = {
    schemaVersion: "velmere.pass35.master-map.v1",
    candidateId: PASS35_CANDIDATE_ID,
    releaseId: null,
    deterministicEpoch: epoch,
    manifestProfile,
    status: manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
      ? "NO_GO_OFFLINE_SOURCE_PACKAGE"
      : "NO_GO_OFFLINE_CANDIDATE",
    promotionAllowed: false,
    readinessScoreIssued: false,
    canonicalGenerator: PASS35_CANONICAL_GENERATOR,
    artifactSet: [...artifactBytes].map(([relativePath, bytes]) => artifactReference(relativePath, bytes)),
    preGates: Object.fromEntries(Object.entries(preGates.preGates).map(([id, gate]) => [id, gate.status])),
    blockers: {
      preGates: Object.fromEntries(Object.entries(preGates.preGates).map(([id, gate]) => [id, { status: gate.status, reason: gate.reason }])),
      providerRights: provider.status,
      legal: legal.status,
      staging: staging.status,
      benchmark: audit.benchmarkCorpus,
    },
    sellEnabledProductCells: catalog.productCells.filter((cell) => cell.sellEnabled === true).length,
    truthBoundary: manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE
      ? "The master map binds the unpacked SOURCE_ONLY package-scoped manifest set and preserves NO_GO/NO_PROMOTION. It does not bind omitted workspace evidence and is not a readiness score, production release receipt, signature, or external approval."
      : "The master map binds current local PASS35 workspace artifacts and preserves NO_GO/NO_PROMOTION. It is not a weighted readiness score, production release receipt, signature, or external approval.",
  };
  const masterMap = { ...masterCore, masterMapSha256: digestObject(masterCore) };
  artifactBytes.set("artifacts/release/MASTER_MAP.json", jsonBytes(masterMap));

  return {
    root,
    epoch,
    manifestProfile,
    artifacts: artifactBytes,
    parsed: { sourceIdentity, sbom, provenance, evidenceIndex, authority, masterMap },
    inventory,
  };
}

export function readPass35ManifestSet(rootPath) {
  const root = path.resolve(rootPath);
  const artifacts = new Map();
  for (const relativePath of PASS35_MANIFEST_PATHS) {
    const absolutePath = path.join(root, relativePath);
    if (existsSync(absolutePath)) artifacts.set(relativePath, readFileSync(absolutePath));
  }
  const parsed = {};
  const names = {
    "artifacts/release/SOURCE_IDENTITY.json": "sourceIdentity",
    "artifacts/release/SBOM.cdx.json": "sbom",
    "artifacts/release/PROVENANCE.intoto.json": "provenance",
    "artifacts/release/EVIDENCE_INDEX.json": "evidenceIndex",
    "artifacts/release/MANIFEST_AUTHORITY.json": "authority",
    "artifacts/release/MASTER_MAP.json": "masterMap",
  };
  for (const relativePath of JSON_PATHS) {
    const bytes = artifacts.get(relativePath);
    if (!bytes) continue;
    try {
      parsed[names[relativePath]] = JSON.parse(bytes.toString("utf8"));
    } catch {
      parsed[names[relativePath]] = null;
    }
  }
  return { root, artifacts, parsed };
}

export function validatePass35ManifestSet(set, { rootPath = set.root } = {}) {
  const blockers = [];
  const add = (condition, code) => { if (!condition) blockers.push(code); };
  const { artifacts, parsed } = set;
  for (const relativePath of PASS35_MANIFEST_PATHS) add(artifacts.has(relativePath), `canonical_artifact_missing:${relativePath}`);
  const identity = parsed.sourceIdentity;
  const sbom = parsed.sbom;
  const provenance = parsed.provenance;
  const evidence = parsed.evidenceIndex;
  const authority = parsed.authority;
  const master = parsed.masterMap;
  add(identity?.schemaVersion === "velmere.pass35.source-identity.v1", "source_identity_schema_invalid");
  add(identity?.candidateId === PASS35_CANDIDATE_ID && identity?.releaseId === null, "source_identity_candidate_mismatch");
  add(identity?.promotionAllowed === false, "source_identity_promotion_must_be_false");
  const manifestProfile = identity?.manifestProfile;
  add(manifestProfile === PASS35_MANIFEST_PROFILES.WORKSPACE || manifestProfile === PASS35_MANIFEST_PROFILES.SOURCE_PACKAGE, "manifest_profile_invalid");
  add(evidence?.manifestProfile === manifestProfile, "evidence_index_manifest_profile_mismatch");
  add(authority?.manifestProfile === manifestProfile, "manifest_authority_profile_mismatch");
  add(master?.manifestProfile === manifestProfile, "master_map_profile_mismatch");
  add(provenance?.predicate?.buildDefinition?.externalParameters?.manifestProfile === manifestProfile, "provenance_manifest_profile_mismatch");
  add(identity?.identitySha256 === digestObject(without(identity ?? {}, "identitySha256")), "source_identity_digest_invalid");
  const fileBytes = artifacts.get("artifacts/release/FILE_MANIFEST.csv");
  add(Boolean(fileBytes) && identity?.canonicalInputs?.fileManifest?.sha256 === sha256(fileBytes), "source_identity_file_manifest_binding_invalid");
  const sbomBytes = artifacts.get("artifacts/release/SBOM.cdx.json");
  add(Boolean(sbomBytes) && identity?.canonicalInputs?.sbom?.sha256 === sha256(sbomBytes), "source_identity_sbom_binding_invalid");
  const evidenceBytes = artifacts.get("artifacts/release/EVIDENCE_INDEX.json");
  add(Boolean(evidenceBytes) && identity?.canonicalInputs?.evidenceIndex?.sha256 === sha256(evidenceBytes), "source_identity_evidence_binding_invalid");
  if (rootPath && sbom) {
    try {
      const packageJsonText = readFileSync(path.join(rootPath, "package.json"), "utf8");
      const packageLockText = readFileSync(path.join(rootPath, "package-lock.json"), "utf8");
      blockers.push(...validateCycloneDxSbom({ sbom, packageJsonText, packageLockText }).map((item) => `sbom:${item}`));
    } catch (error) {
      blockers.push(`sbom_validation_exception:${error instanceof Error ? error.message : "unknown"}`);
    }
  }
  add(evidence?.schemaVersion === "velmere.pass35.evidence-index.v1", "evidence_index_schema_invalid");
  add(evidence?.evidenceIndexSha256 === digestObject(without(evidence ?? {}, "evidenceIndexSha256")), "evidence_index_digest_invalid");
  add(evidence?.entryCount === evidence?.entries?.length, "evidence_index_count_invalid");
  add(evidence?.promotionAllowed === false, "evidence_index_promotion_must_be_false");
  add(provenance?._type === "https://in-toto.io/Statement/v1" && provenance?.predicateType === "https://slsa.dev/provenance/v1", "provenance_schema_invalid");
  add(provenance?.predicate?.buildDefinition?.internalParameters?.trustedBuilder === false, "provenance_trusted_builder_claim_forbidden");
  add(provenance?.predicate?.buildDefinition?.internalParameters?.signatureIssued === false, "provenance_signature_claim_forbidden");
  add(provenance?.predicate?.buildDefinition?.internalParameters?.independentVerificationCompleted === false, "provenance_independent_verification_claim_forbidden");
  add(Array.isArray(provenance?.signatures) && provenance.signatures.length === 0, "provenance_signatures_must_be_empty");
  add(provenance?.trust?.productionProvenance === false && provenance?.trust?.externalAttestation === false, "provenance_trust_boundary_invalid");
  const subjects = new Map((provenance?.subject ?? []).map((subject) => [subject.name, subject?.digest?.sha256]));
  for (const relativePath of ["artifacts/release/SOURCE_IDENTITY.json", "artifacts/release/SBOM.cdx.json", "artifacts/release/EVIDENCE_INDEX.json"]) {
    const bytes = artifacts.get(relativePath);
    add(Boolean(bytes) && subjects.get(relativePath) === sha256(bytes), `provenance_subject_binding_invalid:${relativePath}`);
  }
  add(authority?.schemaVersion === "velmere.pass35.manifest-authority.v1", "manifest_authority_schema_invalid");
  add(authority?.canonicalGenerator === PASS35_CANONICAL_GENERATOR, "manifest_authority_generator_invalid");
  add(authority?.authoritySha256 === digestObject(without(authority ?? {}, "authoritySha256")), "manifest_authority_digest_invalid");
  add(master?.schemaVersion === "velmere.pass35.master-map.v1", "master_map_schema_invalid");
  add(master?.candidateId === PASS35_CANDIDATE_ID && master?.releaseId === null, "master_map_candidate_mismatch");
  add(master?.promotionAllowed === false && master?.readinessScoreIssued === false, "master_map_no_promotion_boundary_invalid");
  add(master?.masterMapSha256 === digestObject(without(master ?? {}, "masterMapSha256")), "master_map_digest_invalid");
  const masterRefs = new Map((master?.artifactSet ?? []).map((entry) => [entry.path, entry]));
  for (const relativePath of PASS35_MANIFEST_PATHS.filter((entry) => !entry.endsWith("MASTER_MAP.json"))) {
    const bytes = artifacts.get(relativePath);
    const reference = masterRefs.get(relativePath);
    add(Boolean(bytes) && reference?.sha256 === sha256(bytes) && reference?.byteLength === bytes.length, `master_map_artifact_ref_mismatch:${relativePath}`);
  }
  add(DIGEST.test(identity?.sourceTree?.aggregateSha256 ?? ""), "source_identity_source_digest_invalid");
  return [...new Set(blockers)].sort();
}

export function compareManifestSets(expected, observed) {
  const mismatches = [];
  for (const relativePath of PASS35_MANIFEST_PATHS) {
    const expectedBytes = expected.artifacts.get(relativePath);
    const observedBytes = observed.artifacts.get(relativePath);
    if (!observedBytes) mismatches.push(`canonical_artifact_missing:${relativePath}`);
    else if (!expectedBytes.equals(observedBytes)) mismatches.push(`canonical_artifact_stale_or_modified:${relativePath}`);
  }
  return mismatches;
}

export function setDigest(set) {
  const rows = PASS35_MANIFEST_PATHS.map((relativePath) => ({
    path: relativePath,
    sha256: sha256(set.artifacts.get(relativePath) ?? Buffer.alloc(0)),
  }));
  return createHash("sha256").update(canonicalJson(rows)).digest("hex");
}
