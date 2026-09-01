#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { extractZipSafely } from "./lib/a47-safe-zip.mjs";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const fixtureMode = process.argv.includes("--fixture");
const argValue = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a55-independent-retest-legal-customer-release-acceptance.json"), "utf8"));
const artifactsRoot = path.join(root, "artifacts/pass35/a55");
fs.mkdirSync(artifactsRoot, { recursive: true });
const outputJson = path.join(artifactsRoot, "PASS35_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE.json");
const outputMd = path.join(artifactsRoot, "PASS35_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE.md");
const checks = [];
const addCheck = (id, ok, detail = null, category = "semantic") => checks.push({ id, ok: Boolean(ok), category, detail });
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (file) => sha256(fs.readFileSync(file));
const isSha = (value) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const canonicalBytesWithoutSignatures = (value) => Buffer.from(canonical(Object.fromEntries(Object.entries(value).filter(([key]) => key !== "signatures"))), "utf8");
const parseTime = (value) => { if (typeof value !== "string") return null; const t = Date.parse(value); return Number.isFinite(t) && new Date(t).toISOString() === value ? t : null; };
const normalizeRelative = (value) => String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "");
const unique = (values) => new Set(values).size === values.length;
const unknownKeys = (value, allowed) => isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)).sort() : [];
const BUNDLE_KEYS = new Set(["schemaVersion","subjectRevisionId","subjectOrganizationIdHash","sourceManifestSha256","a54EvidenceManifestSha256","generatedAt","reportFiles","releaseAttestationPath"]);
const REPORT_KEYS = new Set(["schemaVersion","reportId","reportType","subjectRevisionId","sourceManifestSha256","a54EvidenceManifestSha256","issuedAt","expiresAt","scope","verdict","fixture","synthetic","locallyAuthored","conflictOfInterestDeclared","methodologySha256","evidenceIndexSha256","findingRegisterSha256","openFindings","releaseBlockingExceptions","assertions","signatures"]);
const RELEASE_KEYS = new Set(["schemaVersion","decision","subjectRevisionId","sourceManifestSha256","a54EvidenceManifestSha256","issuedAt","expiresAt","reportDigests","conditions","signatures"]);
const SIGNATURE_KEYS = new Set(["keyId","role","algorithm","signaturePath","signedPayloadSha256"]);
const TRUST_KEYS = new Set(["schemaVersion","subjectOrganizationIdHash","issuedAt","expiresAt","keys"]);
const TRUST_KEY_KEYS = new Set(["keyId","organizationIdHash","affiliation","roles","algorithm","conflictOfInterest","publicKeyPem"]);
const OPEN_FINDING_KEYS = new Set(["critical","high","medium","low"]);

function safeReadJson(file, maxBytes = contract.budgets.maximumJsonBytes) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > maxBytes) throw new Error(`json_file_invalid:${path.basename(file)}:${stat.size}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function findExact(base, relative) {
  const normalized = normalizeRelative(relative);
  if (!normalized || normalized.includes("../") || normalized.startsWith("/")) throw new Error(`path_invalid:${relative}`);
  const absolute = path.resolve(base, normalized);
  if (!absolute.startsWith(`${path.resolve(base)}${path.sep}`)) throw new Error(`path_escape:${relative}`);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) throw new Error(`file_missing:${relative}`);
  return absolute;
}
function verifyManifest(base, manifestName, expectedSchema, expectedSubjectRevision) {
  const manifestPath = findExact(base, manifestName);
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const errors = [];
  if (manifest.schemaVersion !== expectedSchema) errors.push("manifest_schema_invalid");
  if ((manifest.subjectRevisionId ?? manifest.revisionId) !== expectedSubjectRevision) errors.push("manifest_subject_revision_invalid");
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) errors.push("manifest_files_invalid");
  const seen = new Set();
  const listed = new Set();
  for (const row of manifest.files ?? []) {
    const relative = normalizeRelative(row.path);
    if (!relative || relative === manifestName || relative.includes("../") || seen.has(relative)) { errors.push(`manifest_path_invalid:${relative}`); continue; }
    seen.add(relative); listed.add(relative);
    try {
      const absolute = findExact(base, relative);
      const bytes = fs.readFileSync(absolute);
      if (row.bytes !== bytes.length) errors.push(`manifest_size_mismatch:${relative}`);
      if (row.sha256 !== sha256(bytes)) errors.push(`manifest_hash_mismatch:${relative}`);
    } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  }
  const actual = [];
  const walk = (current) => { for (const entry of fs.readdirSync(current, { withFileTypes: true })) { const absolute = path.join(current, entry.name); if (entry.isDirectory()) walk(absolute); else if (entry.isFile()) actual.push(normalizeRelative(path.relative(base, absolute))); else errors.push(`manifest_non_regular_entry:${entry.name}`); } };
  walk(base);
  const actualSet = new Set(actual.filter((relative) => relative !== manifestName));
  for (const relative of actualSet) if (!listed.has(relative)) errors.push(`manifest_unlisted_file:${relative}`);
  for (const relative of listed) if (!actualSet.has(relative)) errors.push(`manifest_listed_file_absent:${relative}`);
  return { ok: errors.length === 0, errors, manifest, manifestPath, manifestSha256: sha256(manifestBytes) };
}
function verifySourceManifest() {
  const file = path.join(root, "config/pass35/a55-source-manifest.json");
  if (!fs.existsSync(file)) return { ok: false, reason: "source_manifest_missing", manifestSha256: null, digest: null, rows: 0 };
  const bytes = fs.readFileSync(file);
  const manifest = JSON.parse(bytes.toString("utf8"));
  const aggregate = crypto.createHash("sha256");
  for (const row of manifest.files ?? []) {
    const absolute = path.resolve(root, row.path);
    if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`) || !fs.existsSync(absolute)) return { ok: false, reason: `source_file_invalid:${row.path}`, manifestSha256: sha256(bytes), rows: manifest.files?.length ?? 0 };
    const current = fs.readFileSync(absolute);
    if (current.length !== row.bytes || sha256(current) !== row.sha256) return { ok: false, reason: `source_hash_mismatch:${row.path}`, manifestSha256: sha256(bytes), rows: manifest.files?.length ?? 0 };
    aggregate.update(row.path); aggregate.update("\0"); aggregate.update(row.sha256); aggregate.update("\0");
  }
  return { ok: manifest.revisionId === contract.revisionId, reason: null, manifestSha256: sha256(bytes), digest: aggregate.digest("hex"), rows: manifest.files?.length ?? 0 };
}
function loadTrustRoots(file, expectedSha, subjectOrgHash) {
  const bytes = fs.readFileSync(file);
  const observedSha = sha256(bytes);
  const trust = JSON.parse(bytes.toString("utf8"));
  const errors = [];
  if (!isSha(expectedSha) || observedSha !== expectedSha) errors.push("trust_roots_external_anchor_mismatch");
  for (const key of unknownKeys(trust, TRUST_KEYS)) errors.push(`trust_roots_unknown_field:${key}`);
  if (trust.schemaVersion !== "velmere.pass35.a55.trust-roots.v1") errors.push("trust_roots_schema_invalid");
  if (trust.subjectOrganizationIdHash !== subjectOrgHash) errors.push("trust_roots_subject_mismatch");
  const issued = parseTime(trust.issuedAt); const expires = parseTime(trust.expiresAt); const now = Date.now();
  if (issued === null || expires === null || issued > now + contract.budgets.maximumClockSkewSeconds * 1000 || expires <= now) errors.push("trust_roots_time_invalid");
  if (!Array.isArray(trust.keys) || trust.keys.length < 3) errors.push("trust_roots_keys_invalid");
  const ids = (trust.keys ?? []).map((row) => row.keyId);
  if (!unique(ids)) errors.push("trust_roots_duplicate_key_id");
  const byId = new Map();
  for (const row of trust.keys ?? []) {
    for (const key of unknownKeys(row, TRUST_KEY_KEYS)) errors.push(`trust_root_key_unknown_field:${row.keyId ?? "missing"}:${key}`);
    if (row.algorithm !== "ED25519" || typeof row.publicKeyPem !== "string" || !Array.isArray(row.roles) || !isSha(row.organizationIdHash) || !["SUBJECT", "INDEPENDENT"].includes(row.affiliation)) { errors.push(`trust_root_key_invalid:${row.keyId ?? "missing"}`); continue; }
    try { crypto.createPublicKey(row.publicKeyPem); } catch { errors.push(`trust_root_public_key_invalid:${row.keyId}`); continue; }
    byId.set(row.keyId, row);
  }
  return { ok: errors.length === 0, errors, trust, byId, observedSha };
}
function verifySignedObject(object, base, trust, requiredRoles, subjectOrgHash, label) {
  const errors = [];
  const signatures = object.signatures;
  const payload = canonicalBytesWithoutSignatures(object);
  const payloadSha256 = sha256(payload);
  if (!Array.isArray(signatures) || signatures.length !== requiredRoles.length) return { ok: false, errors: [`${label}:signature_count_invalid`], payloadSha256, organizations: [] };
  const orgs = []; const keys = []; const roles = [];
  for (const [index, sigRef] of signatures.entries()) {
    const prefix = `${label}:signature[${index}]`;
    if (isRecord(sigRef)) for (const key of unknownKeys(sigRef, SIGNATURE_KEYS)) errors.push(`${prefix}:unknown_field:${key}`);
    if (!isRecord(sigRef) || sigRef.algorithm !== "ED25519" || !requiredRoles.includes(sigRef.role) || !isSha(sigRef.signedPayloadSha256) || sigRef.signedPayloadSha256 !== payloadSha256) { errors.push(`${prefix}:metadata_invalid`); continue; }
    const key = trust.byId.get(sigRef.keyId);
    if (!key || !key.roles.includes(sigRef.role)) { errors.push(`${prefix}:untrusted_key_or_role`); continue; }
    let signature;
    try { signature = Buffer.from(fs.readFileSync(findExact(base, sigRef.signaturePath), "utf8").trim(), "base64"); } catch { errors.push(`${prefix}:signature_file_invalid`); continue; }
    let verified = false;
    try { verified = crypto.verify(null, payload, key.publicKeyPem, signature); } catch (ignoredError) { void ignoredError; }
    if (!verified) errors.push(`${prefix}:cryptographic_verification_failed`);
    if (sigRef.role === "ACCOUNTABLE_RELEASE_OWNER") {
      if (key.affiliation !== "SUBJECT" || key.organizationIdHash !== subjectOrgHash) errors.push(`${prefix}:owner_not_subject_affiliated`);
    } else {
      if (key.affiliation !== "INDEPENDENT" || key.organizationIdHash === subjectOrgHash || key.conflictOfInterest !== false) errors.push(`${prefix}:independence_invalid`);
    }
    orgs.push(key.organizationIdHash); keys.push(key.keyId); roles.push(sigRef.role);
  }
  if (!unique(keys)) errors.push(`${label}:duplicate_signing_key`);
  if (!unique(roles)) errors.push(`${label}:duplicate_signing_role`);
  if (requiredRoles.every((role) => role !== "ACCOUNTABLE_RELEASE_OWNER") && !unique(orgs)) errors.push(`${label}:reviewer_organizations_not_distinct`);
  if (requiredRoles.includes("INDEPENDENT_ASSURANCE_CHAIR")) {
    const ownerIndex = roles.indexOf("ACCOUNTABLE_RELEASE_OWNER"); const chairIndex = roles.indexOf("INDEPENDENT_ASSURANCE_CHAIR");
    if (ownerIndex >= 0 && chairIndex >= 0 && orgs[ownerIndex] === orgs[chairIndex]) errors.push(`${label}:owner_chair_same_organization`);
  }
  return { ok: errors.length === 0, errors, payloadSha256, organizations: orgs };
}
function validateTimes(record, label) {
  const errors = []; const now = Date.now(); const issued = parseTime(record.issuedAt); const expires = parseTime(record.expiresAt);
  if (issued === null || expires === null) errors.push(`${label}:timestamp_invalid`);
  if (issued !== null && issued > now + contract.budgets.maximumClockSkewSeconds * 1000) errors.push(`${label}:issued_in_future`);
  if (issued !== null && now - issued > contract.budgets.maximumEvidenceAgeSeconds * 1000) errors.push(`${label}:evidence_too_old`);
  if (expires !== null && expires <= now) errors.push(`${label}:expired`);
  if (issued !== null && expires !== null) {
    const validity = (expires - issued) / 1000;
    if (validity < contract.budgets.minimumValiditySeconds || validity > contract.budgets.maximumValiditySeconds) errors.push(`${label}:validity_window_invalid`);
  }
  return errors;
}
function validateReport(report, type, bundle, base, trust, subjectOrgHash) {
  const errors = [];
  const label = `report:${type}`;
  for (const key of unknownKeys(report, REPORT_KEYS)) errors.push(`${label}:unknown_field:${key}`);
  if (report.schemaVersion !== "velmere.pass35.a55.independent-retest-report.v1") errors.push(`${label}:schema_invalid`);
  if (report.reportType !== type || report.subjectRevisionId !== contract.parentRevisionId) errors.push(`${label}:identity_invalid`);
  if (report.sourceManifestSha256 !== bundle.sourceManifestSha256 || report.a54EvidenceManifestSha256 !== bundle.a54EvidenceManifestSha256) errors.push(`${label}:evidence_binding_invalid`);
  errors.push(...validateTimes(report, label));
  const expectedScope = contract.requiredScopes[type];
  if (!Array.isArray(report.scope) || [...report.scope].sort().join("|") !== [...expectedScope].sort().join("|")) errors.push(`${label}:scope_not_exact`);
  if (report.verdict !== "PASS") errors.push(`${label}:verdict_not_pass`);
  if (report.fixture !== false || report.synthetic !== false || report.locallyAuthored !== false) errors.push(`${label}:not_external_real_review`);
  if (report.conflictOfInterestDeclared !== false) errors.push(`${label}:conflict_not_clear`);
  if (![report.methodologySha256, report.evidenceIndexSha256, report.findingRegisterSha256].every(isSha)) errors.push(`${label}:digest_invalid`);
  if (isRecord(report.openFindings)) for (const key of unknownKeys(report.openFindings, OPEN_FINDING_KEYS)) errors.push(`${label}:open_findings_unknown_field:${key}`);
  if (!isRecord(report.openFindings) || !["critical","high","medium","low"].every((key) => Number.isInteger(report.openFindings[key]) && report.openFindings[key] >= 0)) errors.push(`${label}:finding_counts_invalid`);
  if (report.openFindings?.critical !== 0 || report.openFindings?.high !== 0) errors.push(`${label}:open_critical_or_high`);
  if (!Array.isArray(report.releaseBlockingExceptions) || report.releaseBlockingExceptions.length !== 0) errors.push(`${label}:release_blocking_exception`);
  const a = report.assertions;
  const assertionChecks = {
    SECURITY: a?.applicationApiCloudRetest === true && a?.tenantIsolationRetested === true && a?.secretRotationObserved === true && a?.zeroOpenCriticalHigh === true,
    DATA_PROVIDER: a?.rightsMappingReviewed === true && a?.displayExportPdfRightsReviewed === true && a?.dataIntegrityRetest === true && a?.providerExitReviewed === true && a?.unresolvedRightsBlocks === 0,
    PAYMENTS: a?.testPaymentRefundReconciliationObserved === true && a?.webhookReplayObserved === true && a?.entitlementRevocationObserved === true && a?.unresolvedFinancialControlBlocks === 0,
    OPERATIONS: a?.a54DrillObserved === true && a?.recoveryObserved === true && a?.alertAckObserved === true && a?.unresolvedOperationalBlocks === 0,
    LEGAL_CUSTOMER: a?.legalApplicabilityReviewed === true && a?.privacyAndConsumerTermsReviewed === true && a?.customerCommunicationReviewed === true && a?.prohibitedSafetyClaimsFound === 0 && a?.unresolvedLegalBlocks === 0
  };
  if (!assertionChecks[type]) errors.push(`${label}:required_assertions_failed`);
  const signatures = verifySignedObject(report, base, trust, [contract.primaryRoles[type], contract.secondaryRole], subjectOrgHash, label);
  errors.push(...signatures.errors);
  return { ok: errors.length === 0, errors, reportSha256: sha256(fs.readFileSync(findExact(base, bundle.reportFiles[type]))), signedPayloadSha256: signatures.payloadSha256 };
}
function verifyA54Evidence(zipPath, expectedZipSha) {
  const errors = [];
  if (sha256File(zipPath) !== expectedZipSha) errors.push("a54_evidence_zip_anchor_mismatch");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a55-a54-"));
  try {
    extractZipSafely(zipPath, temp, contract.zipBudgets);
    const manifest = verifyManifest(temp, "PASS35_A54_EVIDENCE_MANIFEST.json", "velmere.pass35.a54.evidence-manifest.v1", contract.parentRevisionId);
    errors.push(...manifest.errors.map((e) => `a54:${e}`));
    const receiptPath = findExact(temp, "PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.json");
    const receipt = safeReadJson(receiptPath);
    if (receipt.revisionId !== contract.requiredA54RevisionId || receipt.decision !== contract.requiredA54Decision || receipt.fixtureMode !== false || receipt.summary?.failed !== 0 || receipt.recovery?.restorationSucceeded !== true || receipt.saleEnabled !== false || receipt.sourceFingerprint?.before !== receipt.sourceFingerprint?.after) errors.push("a54_receipt_semantic_invalid");
    return { ok: errors.length === 0, errors, manifestSha256: manifest.manifestSha256, receiptSha256: sha256File(receiptPath), sourceManifestSha256: receipt.sourceFingerprint?.manifestSha256 ?? null };
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

function writeReport(decision, extra = {}) {
  const failures = checks.filter((row) => !row.ok);
  const report = {
    schemaVersion: "velmere.pass35.a55.independent-retest-legal-customer-release-acceptance-receipt.v1",
    revisionId: contract.revisionId,
    parentRevisionId: contract.parentRevisionId,
    generatedAt: new Date().toISOString(),
    fixtureMode,
    decision,
    truthBoundary: contract.truthBoundary,
    independentAssuranceProven: decision === "VERIFIED_STAGING_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE",
    controlledCanaryPreparationApproved: decision === "VERIFIED_STAGING_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE",
    productionApproved: false,
    liveProven: false,
    saleEnabled: false,
    summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
    failures,
    checks,
    ...extra
  };
  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outputMd, `# PASS35 A55 — independent retest, legal/customer review and release dual-control\n\nDecision: **${decision}**\n\n- Checks: ${report.summary.checks}\n- Passed: ${report.summary.passed}\n- Failed: ${report.summary.failed}\n- Independent assurance proven: ${report.independentAssuranceProven}\n- Controlled canary preparation approved: ${report.controlledCanaryPreparationApproved}\n- Production approved: false\n- LIVE proven: false\n- Sale enabled: false\n\n${failures.length ? "## Failures\n\n" + failures.map((row) => `- ${row.id}: ${JSON.stringify(row.detail)}`).join("\n") : "All declared A55 intake and cryptographic verification checks passed within the bounded truth boundary."}\n`);
  console.log(JSON.stringify({ decision, summary: report.summary }, null, 2));
  if (!["FIXTURE_PASS", "VERIFIED_STAGING_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE"].includes(decision)) process.exitCode = 1;
  return report;
}

async function main() {
  const source = verifySourceManifest();
  addCheck("source-manifest-valid", source.ok, source, "integrity");
  const expectedSourceManifest = String(process.env.VELMERE_A55_EXPECTED_SOURCE_MANIFEST_SHA256 ?? argValue("--source-manifest-sha") ?? "").toLowerCase();
  addCheck("source-manifest-external-anchor", fixtureMode || (isSha(expectedSourceManifest) && expectedSourceManifest === source.manifestSha256), { observed: source.manifestSha256, expectedPresent: Boolean(expectedSourceManifest) }, "integrity");
  addCheck("runtime-exact", fixtureMode || (process.versions.node === contract.runtime.node && currentNpmVersion() === contract.runtime.npm), { node: process.versions.node, npm: currentNpmVersion(), expected: contract.runtime }, "preflight");
  const confirmation = process.env.VELMERE_A55_CONFIRM ?? argValue("--confirm") ?? "";
  addCheck("confirmation-token", confirmation === contract.confirmationToken, { present: Boolean(confirmation) }, "preflight");
  const subjectOrgHash = String(process.env.VELMERE_A55_SUBJECT_ORGANIZATION_ID_HASH ?? argValue("--subject-org") ?? "").toLowerCase();
  addCheck("subject-organization-binding", isSha(subjectOrgHash), { present: Boolean(subjectOrgHash) }, "preflight");
  const bundleZip = path.resolve(root, process.env.VELMERE_A55_REVIEW_BUNDLE_ZIP ?? argValue("--bundle") ?? "");
  const trustFile = path.resolve(root, process.env.VELMERE_A55_TRUST_ROOTS_JSON ?? argValue("--trust-roots") ?? "");
  const a54Zip = path.resolve(root, process.env.VELMERE_A55_A54_EVIDENCE_ZIP ?? argValue("--a54-evidence") ?? "");
  addCheck("required-input-files", [bundleZip, trustFile, a54Zip].every((f) => fs.existsSync(f) && fs.statSync(f).isFile()), { bundle: fs.existsSync(bundleZip), trust: fs.existsSync(trustFile), a54: fs.existsSync(a54Zip) }, "preflight");
  if (checks.some((row) => !row.ok)) return writeReport(fixtureMode ? "FIXTURE_FAIL" : "INCOMPLETE_EVIDENCE");

  const trustSha = String(process.env.VELMERE_A55_TRUST_ROOTS_SHA256 ?? argValue("--trust-roots-sha") ?? "").toLowerCase();
  const trust = loadTrustRoots(trustFile, trustSha, subjectOrgHash);
  addCheck("trust-roots-integrity-and-anchor", trust.ok, trust.errors, "integrity");
  const a54ExpectedSha = String(process.env.VELMERE_A55_A54_EVIDENCE_SHA256 ?? argValue("--a54-evidence-sha") ?? "").toLowerCase();
  const a54 = verifyA54Evidence(a54Zip, a54ExpectedSha);
  addCheck("a54-evidence-integrity-and-semantics", a54.ok, a54.errors, "integrity");
  if (checks.some((row) => !row.ok)) return writeReport(fixtureMode ? "FIXTURE_FAIL" : "REJECTED_INTEGRITY", { a54 });

  const extracted = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a55-bundle-"));
  try {
    const archive = extractZipSafely(bundleZip, extracted, contract.zipBudgets);
    addCheck("review-bundle-safe-zip", true, archive, "integrity");
    const manifest = verifyManifest(extracted, "PASS35_A55_REVIEW_BUNDLE_MANIFEST.json", "velmere.pass35.a55.review-bundle-manifest.v1", contract.parentRevisionId);
    addCheck("review-bundle-manifest-valid", manifest.ok, manifest.errors, "integrity");
    const bundle = safeReadJson(findExact(extracted, "bundle.json"));
    const bundleUnknown = unknownKeys(bundle, BUNDLE_KEYS);
    addCheck("bundle-no-unknown-fields", bundleUnknown.length === 0, bundleUnknown, "semantic");
    addCheck("bundle-schema-and-subject", bundle.schemaVersion === "velmere.pass35.a55.review-bundle.v1" && bundle.subjectRevisionId === contract.parentRevisionId && bundle.subjectOrganizationIdHash === subjectOrgHash, { schema: bundle.schemaVersion, subject: bundle.subjectRevisionId }, "semantic");
    addCheck("bundle-source-binding", bundle.sourceManifestSha256 === a54.sourceManifestSha256 && bundle.a54EvidenceManifestSha256 === a54.manifestSha256, { bundleSource: bundle.sourceManifestSha256, a54SubjectSource: a54.sourceManifestSha256, a55HarnessSource: source.manifestSha256, bundleA54: bundle.a54EvidenceManifestSha256, a54Manifest: a54.manifestSha256 }, "semantic");
    addCheck("bundle-report-map-complete", isRecord(bundle.reportFiles) && contract.reportTypes.every((type) => typeof bundle.reportFiles[type] === "string") && Object.keys(bundle.reportFiles ?? {}).length === contract.reportTypes.length, bundle.reportFiles, "semantic");
    if (checks.some((row) => !row.ok && row.category === "integrity")) return writeReport(fixtureMode ? "FIXTURE_FAIL" : "REJECTED_INTEGRITY", { a54, bundleManifestSha256: manifest.manifestSha256 });
    if (checks.some((row) => !row.ok)) return writeReport(fixtureMode ? "FIXTURE_FAIL" : "ACTION_REQUIRED", { a54, bundleManifestSha256: manifest.manifestSha256 });

    const reportResults = {};
    for (const type of contract.reportTypes) {
      try {
        const report = safeReadJson(findExact(extracted, bundle.reportFiles[type]));
        const result = validateReport(report, type, bundle, extracted, trust, subjectOrgHash);
        reportResults[type] = result;
        addCheck(`report-${type.toLowerCase()}-valid-and-dual-signed`, result.ok, result.errors, result.errors.some((e) => e.includes("cryptographic") || e.includes("untrusted") || e.includes("signature")) ? "integrity" : "semantic");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        reportResults[type] = { ok: false, errors: [message] };
        addCheck(`report-${type.toLowerCase()}-valid-and-dual-signed`, false, [message], "integrity");
      }
    }

    const release = safeReadJson(findExact(extracted, bundle.releaseAttestationPath));
    const releaseErrors = unknownKeys(release, RELEASE_KEYS).map((key) => `release:unknown_field:${key}`);
    if (release.schemaVersion !== "velmere.pass35.a55.release-attestation.v1" || release.subjectRevisionId !== contract.parentRevisionId || release.decision !== "APPROVE_CONTROLLED_CANARY_PREPARATION") releaseErrors.push("release_identity_or_decision_invalid");
    if (release.sourceManifestSha256 !== bundle.sourceManifestSha256 || release.a54EvidenceManifestSha256 !== bundle.a54EvidenceManifestSha256) releaseErrors.push("release_evidence_binding_invalid");
    releaseErrors.push(...validateTimes(release, "release"));
    if (!isRecord(release.reportDigests) || contract.reportTypes.some((type) => release.reportDigests[type] !== reportResults[type]?.reportSha256)) releaseErrors.push("release_report_digest_map_invalid");
    const conditions = release.conditions;
    if (conditions?.saleEnabled !== false || conditions?.liveProven !== false || conditions?.productionApproved !== false || conditions?.controlledCanaryOnly !== true || conditions?.killSwitchRequired !== true || conditions?.unresolvedCriticalHigh !== 0) releaseErrors.push("release_conditions_invalid");
    const releaseSignatures = verifySignedObject(release, extracted, trust, contract.releaseRoles, subjectOrgHash, "release");
    releaseErrors.push(...releaseSignatures.errors);
    addCheck("release-attestation-dual-control", releaseErrors.length === 0, releaseErrors, releaseErrors.some((e) => e.includes("signature") || e.includes("untrusted")) ? "integrity" : "semantic");

    const integrityFailures = checks.filter((row) => !row.ok && row.category === "integrity");
    const semanticFailures = checks.filter((row) => !row.ok && row.category !== "integrity");
    const decision = fixtureMode ? (integrityFailures.length || semanticFailures.length ? "FIXTURE_FAIL" : "FIXTURE_PASS") : integrityFailures.length ? "REJECTED_INTEGRITY" : semanticFailures.length ? "ACTION_REQUIRED" : "VERIFIED_STAGING_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE";
    return writeReport(decision, { a54, bundleManifestSha256: manifest.manifestSha256, trustRootsSha256: trust.observedSha, reviewBundleSha256: sha256File(bundleZip), reportResults, releaseSignedPayloadSha256: releaseSignatures.payloadSha256 });
  } finally { fs.rmSync(extracted, { recursive: true, force: true }); }
}

main().catch((error) => {
  addCheck("unhandled-error", false, error instanceof Error ? error.message : String(error), "integrity");
  writeReport(fixtureMode ? "FIXTURE_FAIL" : "REJECTED_INTEGRITY", { fatalError: error instanceof Error ? error.message : String(error) });
});
