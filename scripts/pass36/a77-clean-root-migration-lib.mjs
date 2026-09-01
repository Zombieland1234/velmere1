import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { collectPass35Inventory } from "../pass35/source-inventory.mjs";

export const REVISION = "VELMERE_PASS36_A77R0_HISTORICAL_LINEAGE_CLEAN_ROOT_MIGRATION_AND_DUAL_CONTROL_GOVERNANCE";
export const PARENT = "VELMERE_PASS36_A76R0_CURRENT_REVISION_ROADMAP_AND_REGULATORY_PERIMETER_TRUTH_AUTHORITY";
export const DIGEST = /^[a-f0-9]{64}$/u;
export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function readJson(root, relativePath) { return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8")); }
export function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, filePath);
}
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function strictIso(value) { const ms = typeof value === "string" ? Date.parse(value) : NaN; return Number.isFinite(ms) && new Date(ms).toISOString() === value ? ms : null; }
function unknownKeys(value, allowed) { return object(value) ? Object.keys(value).filter((key) => !allowed.has(key)).sort() : []; }
function add(checks, id, passed, detail = null) { checks.push({ id, passed: Boolean(passed), detail }); }

export function collectCleanRootSnapshot(root, policy) {
  const inventory = collectPass35Inventory(root);
  const excluded = new Set(policy.cleanRoot.inventoryExclusions);
  const rows = inventory.entries
    .filter((row) => row.sourceIncluded && !excluded.has(row.path))
    .map((row) => ({ path: row.path, byteLength: row.byteLength, sha256: row.sha256 }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  const pathSetSha256 = sha256(Buffer.from(rows.map((row) => row.path).join("\n"), "utf8"));
  const aggregateSha256 = sha256(Buffer.from(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}`).join("\n"), "utf8"));
  return {
    fileCount: rows.length,
    byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0),
    pathSetSha256,
    aggregateSha256,
    rows,
    unknownSourcePaths: inventory.entries.filter((row) => row.role === "UNKNOWN").map((row) => row.path),
  };
}

export function digestWithout(value, omittedKeys = []) {
  const omitted = new Set(omittedKeys);
  const core = Object.fromEntries(Object.entries(value).filter(([key]) => !omitted.has(key)));
  return sha256(Buffer.from(canonicalJson(core), "utf8"));
}

export function validateGenesis(root, genesis, policy, options = {}) {
  const checks = [];
  add(checks, "genesis:object", object(genesis));
  add(checks, "genesis:schema", genesis?.schemaVersion === "velmere.pass36.a77.clean-root-genesis.v1", genesis?.schemaVersion);
  add(checks, "genesis:revision", genesis?.revisionId === REVISION, genesis?.revisionId);
  add(checks, "genesis:parent", genesis?.parentRevisionId === PARENT, genesis?.parentRevisionId);
  add(checks, "genesis:epoch", genesis?.generatedAt === policy.deterministicEpoch, genesis?.generatedAt);
  add(checks, "genesis:parent-archive", genesis?.parentSourceArchive?.sha256 === policy.parentSourceArchive.sha256 && genesis?.parentSourceArchive?.fileName === policy.parentSourceArchive.fileName, genesis?.parentSourceArchive);
  add(checks, "genesis:a61-unresolved", genesis?.legacyLineage?.status === "BLOCKED_EXACT_HISTORICAL_BYTES" && genesis?.legacyLineage?.verifiedExact === 0 && genesis?.legacyLineage?.requiredExact === 2 && genesis?.legacyLineage?.a61Passed === false, genesis?.legacyLineage);
  const expectedLegacy = policy.legacyLineage.artifacts.map((row) => ({ id: row.id, targetPath: row.targetPath, byteLength: row.byteLength, sha256: row.sha256 }));
  add(checks, "genesis:legacy-anchor-count", Array.isArray(genesis?.legacyLineage?.artifacts) && genesis.legacyLineage.artifacts.length === expectedLegacy.length, genesis?.legacyLineage?.artifacts?.length);
  add(checks, "genesis:legacy-anchors", canonicalJson(genesis?.legacyLineage?.artifacts ?? []) === canonicalJson(expectedLegacy), genesis?.legacyLineage?.artifacts);
  add(checks, "genesis:no-reconstruction", genesis?.legacyLineage?.syntheticReconstructionPerformed === false && genesis?.legacyLineage?.cleanRootMayClaimLegacyRecovery === false);
  const policyBytes = fs.readFileSync(path.join(root, "config/pass36/a77-clean-root-migration-policy.json"));
  const a61Bytes = fs.readFileSync(path.join(root, "config/pass36/a61-historical-artifact-recovery-policy.json"));
  add(checks, "genesis:policy-binding", genesis?.bindings?.a77PolicySha256 === sha256(policyBytes), genesis?.bindings?.a77PolicySha256);
  add(checks, "genesis:a61-policy-binding", genesis?.bindings?.a61PolicySha256 === sha256(a61Bytes), genesis?.bindings?.a61PolicySha256);
  const verifyCurrentPayload = options.verifyCurrentPayload !== false;
  const snapshot = verifyCurrentPayload ? collectCleanRootSnapshot(root, policy) : null;
  if (snapshot) {
    add(checks, "genesis:unknown-source-zero", snapshot.unknownSourcePaths.length === 0, snapshot.unknownSourcePaths);
    add(checks, "genesis:payload-file-count", genesis?.payload?.fileCount === snapshot.fileCount, { observed: snapshot.fileCount, declared: genesis?.payload?.fileCount });
    add(checks, "genesis:payload-bytes", genesis?.payload?.byteLength === snapshot.byteLength, { observed: snapshot.byteLength, declared: genesis?.payload?.byteLength });
    add(checks, "genesis:path-set", genesis?.payload?.pathSetSha256 === snapshot.pathSetSha256, { observed: snapshot.pathSetSha256, declared: genesis?.payload?.pathSetSha256 });
    add(checks, "genesis:aggregate", genesis?.payload?.aggregateSha256 === snapshot.aggregateSha256, { observed: snapshot.aggregateSha256, declared: genesis?.payload?.aggregateSha256 });
  } else {
    add(checks, "genesis:historical-payload-shape", Number.isSafeInteger(genesis?.payload?.fileCount) && genesis.payload.fileCount > 0 && Number.isSafeInteger(genesis?.payload?.byteLength) && genesis.payload.byteLength > 0 && DIGEST.test(String(genesis?.payload?.pathSetSha256 ?? "")) && DIGEST.test(String(genesis?.payload?.aggregateSha256 ?? "")), genesis?.payload);
  }
  add(checks, "genesis:lineage-mode", genesis?.lineageMode === policy.lineageAdmission.cleanRootMode, genesis?.lineageMode);
  add(checks, "genesis:claims-closed", Object.values(genesis?.claims ?? {}).every((value) => value === false), genesis?.claims);
  add(checks, "genesis:digest-format", DIGEST.test(String(genesis?.genesisDigestSha256 ?? "")), genesis?.genesisDigestSha256);
  add(checks, "genesis:digest", genesis?.genesisDigestSha256 === digestWithout(genesis, ["genesisDigestSha256"]), genesis?.genesisDigestSha256);
  return { checks, passed: checks.every((row) => row.passed), snapshot };
}

const TRUST_ALLOWED = new Set(["schemaVersion", "subjectOrganizationIdHash", "issuedAt", "expiresAt", "keys"]);
const KEY_ALLOWED = new Set(["keyId", "organizationIdHash", "affiliation", "roles", "algorithm", "status", "notBefore", "notAfter", "conflictOfInterest", "publicKeyPem"]);
const ATTEST_ALLOWED = new Set(["schemaVersion", "decision", "revisionId", "genesisDigestSha256", "payloadAggregateSha256", "unresolvedLegacyArtifactSetSha256", "issuedAt", "expiresAt", "conditions", "signatures"]);
const SIG_ALLOWED = new Set(["keyId", "role", "algorithm", "signature"]);

export function unresolvedArtifactSetSha256(policy) {
  return sha256(Buffer.from(canonicalJson(policy.legacyLineage.artifacts.map((row) => ({ id: row.id, targetPath: row.targetPath, byteLength: row.byteLength, sha256: row.sha256 }))), "utf8"));
}

export function signedPayloadBytes(attestation) {
  return Buffer.from(canonicalJson(Object.fromEntries(Object.entries(attestation).filter(([key]) => key !== "signatures"))), "utf8");
}

export function validateGovernance({ policy, genesis, trustRoots, expectedTrustRootsSha256, attestation, nowMs = Date.now() }) {
  const checks = [];
  const trustBytes = Buffer.from(`${JSON.stringify(trustRoots, null, 2)}\n`, "utf8");
  add(checks, "trust:external-anchor-format", DIGEST.test(String(expectedTrustRootsSha256 ?? "")), expectedTrustRootsSha256 ?? null);
  add(checks, "trust:external-anchor", sha256(trustBytes) === expectedTrustRootsSha256, { observed: sha256(trustBytes), expected: expectedTrustRootsSha256 });
  add(checks, "trust:no-unknown-fields", unknownKeys(trustRoots, TRUST_ALLOWED).length === 0, unknownKeys(trustRoots, TRUST_ALLOWED));
  add(checks, "trust:schema", trustRoots?.schemaVersion === policy.governance.trustRootsSchema, trustRoots?.schemaVersion);
  add(checks, "trust:subject-org", DIGEST.test(String(trustRoots?.subjectOrganizationIdHash ?? "")), trustRoots?.subjectOrganizationIdHash);
  const trustIssued = strictIso(trustRoots?.issuedAt); const trustExpires = strictIso(trustRoots?.expiresAt);
  add(checks, "trust:time-format", trustIssued !== null && trustExpires !== null, { issuedAt: trustRoots?.issuedAt, expiresAt: trustRoots?.expiresAt });
  add(checks, "trust:time-active", trustIssued !== null && trustExpires !== null && trustIssued <= nowMs + policy.governance.maximumClockSkewSeconds * 1000 && trustExpires > nowMs, { trustIssued, trustExpires, nowMs });
  const keys = Array.isArray(trustRoots?.keys) ? trustRoots.keys : [];
  add(checks, "trust:key-count", keys.length >= 2, keys.length);
  add(checks, "trust:key-id-unique", new Set(keys.map((row) => row?.keyId)).size === keys.length, keys.map((row) => row?.keyId));
  const keyMap = new Map();
  for (const row of keys) {
    const prefix = `trust:key:${row?.keyId ?? "missing"}`;
    add(checks, `${prefix}:no-unknown-fields`, unknownKeys(row, KEY_ALLOWED).length === 0, unknownKeys(row, KEY_ALLOWED));
    add(checks, `${prefix}:identity`, typeof row?.keyId === "string" && row.keyId.length >= 8 && DIGEST.test(String(row?.organizationIdHash ?? "")), row);
    add(checks, `${prefix}:algorithm-status`, row?.algorithm === "ED25519" && row?.status === "ACTIVE", { algorithm: row?.algorithm, status: row?.status });
    add(checks, `${prefix}:affiliation`, ["SUBJECT", "INDEPENDENT"].includes(row?.affiliation), row?.affiliation);
    add(checks, `${prefix}:roles`, Array.isArray(row?.roles) && row.roles.length >= 1, row?.roles);
    add(checks, `${prefix}:conflict`, row?.conflictOfInterest === false, row?.conflictOfInterest);
    const notBefore = strictIso(row?.notBefore); const notAfter = strictIso(row?.notAfter);
    add(checks, `${prefix}:time`, notBefore !== null && notAfter !== null && notBefore <= nowMs + policy.governance.maximumClockSkewSeconds * 1000 && notAfter > nowMs, { notBefore, notAfter });
    let publicKey = null;
    try { publicKey = crypto.createPublicKey(row?.publicKeyPem); } catch (ignoredError) { void ignoredError; }
    add(checks, `${prefix}:public-key`, Boolean(publicKey) && publicKey.asymmetricKeyType === "ed25519", publicKey?.asymmetricKeyType ?? null);
    if (publicKey) keyMap.set(row.keyId, { ...row, publicKey });
  }

  add(checks, "attestation:no-unknown-fields", unknownKeys(attestation, ATTEST_ALLOWED).length === 0, unknownKeys(attestation, ATTEST_ALLOWED));
  add(checks, "attestation:schema", attestation?.schemaVersion === policy.governance.attestationSchema, attestation?.schemaVersion);
  add(checks, "attestation:decision", attestation?.decision === policy.governance.decision, attestation?.decision);
  add(checks, "attestation:revision", attestation?.revisionId === REVISION, attestation?.revisionId);
  add(checks, "attestation:genesis", attestation?.genesisDigestSha256 === genesis?.genesisDigestSha256, attestation?.genesisDigestSha256);
  add(checks, "attestation:payload", attestation?.payloadAggregateSha256 === genesis?.payload?.aggregateSha256, attestation?.payloadAggregateSha256);
  add(checks, "attestation:legacy-set", attestation?.unresolvedLegacyArtifactSetSha256 === unresolvedArtifactSetSha256(policy), attestation?.unresolvedLegacyArtifactSetSha256);
  const issued = strictIso(attestation?.issuedAt); const expires = strictIso(attestation?.expiresAt);
  add(checks, "attestation:time-format", issued !== null && expires !== null, { issuedAt: attestation?.issuedAt, expiresAt: attestation?.expiresAt });
  add(checks, "attestation:time-window", issued !== null && expires !== null && issued <= nowMs + policy.governance.maximumClockSkewSeconds * 1000 && expires > nowMs && nowMs - issued <= policy.governance.maximumAttestationAgeSeconds * 1000, { issued, expires, nowMs });
  add(checks, "attestation:conditions", canonicalJson(attestation?.conditions ?? {}) === canonicalJson(policy.governance.conditions), attestation?.conditions);
  const signatures = Array.isArray(attestation?.signatures) ? attestation.signatures : [];
  add(checks, "signature:count", signatures.length === policy.governance.requiredRoles.length, signatures.length);
  add(checks, "signature:key-unique", new Set(signatures.map((row) => row?.keyId)).size === signatures.length, signatures.map((row) => row?.keyId));
  add(checks, "signature:role-coverage", policy.governance.requiredRoles.every((role) => signatures.some((row) => row?.role === role)), signatures.map((row) => row?.role));
  const payload = signedPayloadBytes(attestation);
  const organizations = [];
  for (const signature of signatures) {
    const prefix = `signature:${signature?.role ?? "missing"}`;
    add(checks, `${prefix}:no-unknown-fields`, unknownKeys(signature, SIG_ALLOWED).length === 0, unknownKeys(signature, SIG_ALLOWED));
    add(checks, `${prefix}:algorithm`, signature?.algorithm === "ED25519", signature?.algorithm);
    const key = keyMap.get(signature?.keyId);
    add(checks, `${prefix}:trusted-key`, Boolean(key), signature?.keyId);
    add(checks, `${prefix}:role-authorized`, Boolean(key) && key.roles.includes(signature?.role), key?.roles ?? null);
    const expectedAffiliation = signature?.role === "ACCOUNTABLE_RELEASE_OWNER" ? "SUBJECT" : "INDEPENDENT";
    add(checks, `${prefix}:affiliation`, Boolean(key) && key.affiliation === expectedAffiliation, key?.affiliation ?? null);
    if (signature?.role === "ACCOUNTABLE_RELEASE_OWNER") add(checks, `${prefix}:subject-org`, Boolean(key) && key.organizationIdHash === trustRoots.subjectOrganizationIdHash, key?.organizationIdHash ?? null);
    if (signature?.role === "INDEPENDENT_ASSURANCE_CHAIR") add(checks, `${prefix}:independent-org`, Boolean(key) && key.organizationIdHash !== trustRoots.subjectOrganizationIdHash, key?.organizationIdHash ?? null);
    let signatureBytes = null;
    try { signatureBytes = Buffer.from(String(signature?.signature ?? ""), "base64url"); } catch (ignoredError) { void ignoredError; }
    add(checks, `${prefix}:signature-shape`, signatureBytes?.length === 64, signatureBytes?.length ?? null);
    let valid = false;
    try { valid = Boolean(key && signatureBytes?.length === 64 && crypto.verify(null, payload, key.publicKey, signatureBytes)); } catch (ignoredError) { void ignoredError; }
    add(checks, `${prefix}:cryptographic`, valid, valid);
    if (key) organizations.push(key.organizationIdHash);
  }
  add(checks, "signature:organization-separation", new Set(organizations).size >= policy.governance.minimumDistinctOrganizations, organizations);
  const passed = checks.every((row) => row.passed);
  return { checks, passed, decision: passed ? policy.governance.verifiedDecision : policy.governance.rejectedDecision, payloadSha256: sha256(payload) };
}

export function lineageAdmission({ policy, a61Receipt, a77Receipt, criticalGate }) {
  const legacyVerified = a61Receipt?.revisionId === policy.legacyLineage.recoveryRevisionId && a61Receipt?.decision === "VERIFIED_HISTORICAL_ARTIFACTS" && a61Receipt?.fixtureMode !== true;
  const cleanRootVerified = a77Receipt?.revisionId === REVISION && a77Receipt?.decision === policy.governance.verifiedDecision && a77Receipt?.fixtureMode !== true && a77Receipt?.saleEnabled === false && a77Receipt?.liveProven === false;
  const lineageMode = legacyVerified ? policy.lineageAdmission.legacyMode : cleanRootVerified ? policy.lineageAdmission.cleanRootMode : null;
  const expectedGateMode = legacyVerified ? "legacy" : cleanRootVerified ? "current-root" : null;
  const criticalPassed = criticalGate?.suiteCount === policy.lineageAdmission.currentRootCriticalGateSuites && criticalGate?.passedSuiteCount === policy.lineageAdmission.currentRootCriticalGateSuites && criticalGate?.failedSuiteCount === 0 && criticalGate?.offlineReleaseCandidateEligible === true && criticalGate?.lineageMode === expectedGateMode;
  return { passed: Boolean(lineageMode && criticalPassed), lineageMode, legacyVerified, cleanRootVerified, expectedGateMode, criticalPassed };
}
