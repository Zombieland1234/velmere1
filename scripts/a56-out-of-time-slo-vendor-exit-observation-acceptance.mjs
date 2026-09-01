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
const args = process.argv.slice(2);
const argValue = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a56-out-of-time-slo-vendor-exit-observation-acceptance.json"), "utf8"));
const artifactsRoot = path.join(root, "artifacts/pass35/a56");
const outputJson = path.join(artifactsRoot, "PASS35_A56_OUT_OF_TIME_SLO_VENDOR_EXIT_OBSERVATION_ACCEPTANCE.json");
const outputMd = path.join(artifactsRoot, "PASS35_A56_OUT_OF_TIME_SLO_VENDOR_EXIT_OBSERVATION_ACCEPTANCE.md");
fs.mkdirSync(artifactsRoot, { recursive: true });

const checks = [];
const addCheck = (id, ok, detail = null, category = "semantic") => checks.push({ id, ok: Boolean(ok), category, detail });
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (file) => sha256(fs.readFileSync(file));
const shaText = (value) => sha256(Buffer.from(String(value), "utf8"));
const isSha = (value) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const parseTime = (value) => { const parsed = typeof value === "string" ? Date.parse(value) : NaN; return Number.isFinite(parsed) ? parsed : null; };
const normalize = (value) => String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "");
const unknownKeys = (value, allowed) => isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : ["not_object"];
const safeReadJson = (file) => {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > contract.budgets.maximumJsonBytes) throw new Error(`json_budget_or_type:${path.basename(file)}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
};
const canonicalize = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const signedPayload = (value) => { const clone = structuredClone(value); delete clone.signatures; return Buffer.from(canonicalize(clone), "utf8"); };

function walkFiles(directory) {
  const rows = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else rows.push(absolute);
    }
  };
  walk(directory);
  return rows;
}
function findExact(directory, basename) {
  const matches = walkFiles(directory).filter((file) => path.basename(file) === basename);
  if (matches.length !== 1) throw new Error(`exact_file_count:${basename}:${matches.length}`);
  return matches[0];
}
function verifyExactManifest(directory, manifestName, schemaVersion, revisionId) {
  const errors = [];
  const manifestPath = findExact(directory, manifestName);
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (manifest.schemaVersion !== schemaVersion) errors.push("manifest_schema_invalid");
  if (revisionId && manifest.revisionId !== revisionId) errors.push("manifest_revision_invalid");
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) errors.push("manifest_files_missing");
  const base = path.dirname(manifestPath);
  const seen = new Set();
  for (const row of manifest.files ?? []) {
    const relative = normalize(row.path);
    if (!relative || relative.startsWith("/") || relative.split("/").includes("..")) { errors.push(`manifest_path_invalid:${relative}`); continue; }
    if (seen.has(relative)) { errors.push(`manifest_duplicate:${relative}`); continue; }
    seen.add(relative);
    const absolute = path.resolve(base, relative);
    if (!absolute.startsWith(`${path.resolve(base)}${path.sep}`)) { errors.push(`manifest_escape:${relative}`); continue; }
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) { errors.push(`manifest_missing:${relative}`); continue; }
    const bytes = fs.readFileSync(absolute);
    if (!Number.isInteger(row.bytes) || row.bytes !== bytes.length) errors.push(`manifest_size_mismatch:${relative}`);
    if (!isSha(row.sha256) || row.sha256 !== sha256(bytes)) errors.push(`manifest_hash_mismatch:${relative}`);
  }
  const actual = walkFiles(base).map((file) => normalize(path.relative(base, file))).filter((file) => file !== normalize(path.relative(base, manifestPath))).sort();
  const declared = [...seen].sort();
  if (JSON.stringify(actual) !== JSON.stringify(declared)) {
    const unlisted = actual.filter((file) => !seen.has(file));
    const absent = declared.filter((file) => !actual.includes(file));
    errors.push(`manifest_inventory_mismatch:unlisted=${unlisted.join(",")}:absent=${absent.join(",")}`);
  }
  return { ok: errors.length === 0, errors, manifest, manifestPath, manifestSha256: sha256(manifestBytes), base };
}
function verifySourceManifest() {
  const file = path.join(root, "config/pass35/a56-source-manifest.json");
  if (!fs.existsSync(file)) return { ok: false, errors: ["source_manifest_missing"], manifestSha256: null, rows: 0 };
  const bytes = fs.readFileSync(file);
  const manifest = JSON.parse(bytes.toString("utf8"));
  const errors = [];
  if (manifest.revisionId !== contract.revisionId) errors.push("source_manifest_revision_invalid");
  if ((manifest.files ?? []).some((row) => row.path === "config/pass35/a56-source-manifest.json")) errors.push("source_manifest_self_reference");
  for (const row of manifest.files ?? []) {
    const absolute = path.resolve(root, row.path);
    if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) { errors.push(`source_escape:${row.path}`); continue; }
    if (!fs.existsSync(absolute)) { errors.push(`source_missing:${row.path}`); continue; }
    const current = fs.readFileSync(absolute);
    if (current.length !== row.bytes || sha256(current) !== row.sha256) errors.push(`source_mismatch:${row.path}`);
  }
  return { ok: errors.length === 0, errors, manifestSha256: sha256(bytes), rows: manifest.files?.length ?? 0 };
}
function validateTimeWindow(value, label) {
  const errors = [];
  const issued = parseTime(value.issuedAt);
  const expires = parseTime(value.expiresAt);
  const now = Date.now();
  if (issued === null || expires === null || issued > expires) errors.push(`${label}:time_invalid`);
  if (issued !== null && issued > now + contract.observation.maximumClockSkewSeconds * 1000) errors.push(`${label}:issued_future`);
  if (expires !== null && expires <= now - contract.observation.maximumClockSkewSeconds * 1000) errors.push(`${label}:expired`);
  if (issued !== null && expires !== null) {
    const validity = (expires - issued) / 1000;
    if (validity < contract.budgets.minimumValiditySeconds || validity > contract.budgets.maximumValiditySeconds) errors.push(`${label}:validity_window_invalid`);
  }
  return errors;
}
function loadTrustRoots(file, expectedSha, subjectOrganizationIdHash) {
  const errors = [];
  const observedSha = sha256File(file);
  if (!isSha(expectedSha) || expectedSha !== observedSha) errors.push("trust_roots_external_anchor_mismatch");
  const trust = safeReadJson(file);
  const allowed = new Set(["schemaVersion", "subjectOrganizationIdHash", "issuedAt", "expiresAt", "keys"]);
  for (const key of unknownKeys(trust, allowed)) errors.push(`trust_unknown_field:${key}`);
  if (trust.schemaVersion !== "velmere.pass35.a56.trust-roots.v1" || trust.subjectOrganizationIdHash !== subjectOrganizationIdHash) errors.push("trust_identity_invalid");
  errors.push(...validateTimeWindow(trust, "trust"));
  if (!Array.isArray(trust.keys) || trust.keys.length < 4) errors.push("trust_keys_missing");
  const keys = new Map();
  for (const row of trust.keys ?? []) {
    const rowAllowed = new Set(["keyId", "algorithm", "publicKeyPem", "organizationIdHash", "affiliation", "roles", "conflictOfInterest"]);
    for (const key of unknownKeys(row, rowAllowed)) errors.push(`trust_key_unknown_field:${key}`);
    if (typeof row.keyId !== "string" || keys.has(row.keyId)) { errors.push(`trust_key_duplicate_or_invalid:${row.keyId}`); continue; }
    if (row.algorithm !== "ED25519" || typeof row.publicKeyPem !== "string" || !isSha(row.organizationIdHash) || !["SUBJECT", "INDEPENDENT"].includes(row.affiliation) || !Array.isArray(row.roles) || row.conflictOfInterest !== false) errors.push(`trust_key_invalid:${row.keyId}`);
    keys.set(row.keyId, row);
  }
  return { ok: errors.length === 0, errors, observedSha, trust, keys };
}
function verifySignatures(object, trust, expectedRoles, subjectOrganizationIdHash, label) {
  const errors = [];
  if (!Array.isArray(object.signatures) || object.signatures.length !== expectedRoles.length) return { ok: false, errors: [`${label}:signature_count_invalid`], payloadSha256: sha256(signedPayload(object)), signers: [] };
  const payload = signedPayload(object);
  const signers = [];
  const seenKeys = new Set();
  for (const role of expectedRoles) {
    const rows = object.signatures.filter((row) => row?.role === role);
    if (rows.length !== 1) { errors.push(`${label}:role_signature_count:${role}`); continue; }
    const signature = rows[0];
    const key = trust.keys.get(signature.keyId);
    if (!key) { errors.push(`${label}:untrusted_key:${signature.keyId}`); continue; }
    if (seenKeys.has(signature.keyId)) errors.push(`${label}:duplicate_signing_key:${signature.keyId}`);
    seenKeys.add(signature.keyId);
    if (!key.roles.includes(role)) errors.push(`${label}:role_not_allowed:${role}`);
    if (key.conflictOfInterest !== false) errors.push(`${label}:conflict_of_interest:${role}`);
    let verified = false;
    try { verified = crypto.verify(null, payload, key.publicKeyPem, Buffer.from(signature.signatureBase64 ?? "", "base64")); } catch (ignoredError) { void ignoredError; }
    if (!verified) errors.push(`${label}:cryptographic_signature_invalid:${role}`);
    signers.push({ role, keyId: key.keyId, organizationIdHash: key.organizationIdHash, affiliation: key.affiliation });
  }
  for (const signer of signers) {
    if (signer.role === contract.roles.operationsOwner) {
      if (signer.affiliation !== "SUBJECT" || signer.organizationIdHash !== subjectOrganizationIdHash) errors.push(`${label}:owner_not_subject_affiliated`);
    } else if (signer.affiliation !== "INDEPENDENT" || signer.organizationIdHash === subjectOrganizationIdHash) errors.push(`${label}:independent_signer_invalid:${signer.role}`);
  }
  if (new Set(signers.map((row) => row.organizationIdHash)).size !== signers.length) errors.push(`${label}:signer_organizations_not_distinct`);
  return { ok: errors.length === 0, errors, payloadSha256: sha256(payload), signers };
}
function verifyA55Evidence(zipPath, expectedZipSha) {
  const errors = [];
  if (!isSha(expectedZipSha) || sha256File(zipPath) !== expectedZipSha) errors.push("a55_evidence_zip_anchor_mismatch");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a56-a55-"));
  try {
    extractZipSafely(zipPath, temp, contract.zipBudgets);
    const manifest = verifyExactManifest(temp, "PASS35_A55_EVIDENCE_MANIFEST.json", "velmere.pass35.a55.evidence-manifest.v1", contract.requiredA55RevisionId);
    errors.push(...manifest.errors.map((error) => `a55:${error}`));
    const receiptPath = findExact(temp, "PASS35_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE.json");
    const receipt = safeReadJson(receiptPath);
    if (receipt.revisionId !== contract.requiredA55RevisionId || receipt.decision !== contract.requiredA55Decision || receipt.fixtureMode !== false || receipt.summary?.failed !== 0 || receipt.independentAssuranceProven !== true || receipt.controlledCanaryPreparationApproved !== true || receipt.productionApproved !== false || receipt.liveProven !== false || receipt.saleEnabled !== false) errors.push("a55_receipt_semantic_invalid");
    const a54SourceManifestSha256 = receipt.a54?.sourceManifestSha256;
    if (!isSha(a54SourceManifestSha256)) errors.push("a55_a54_source_binding_missing");
    return { ok: errors.length === 0, errors, manifestSha256: manifest.manifestSha256, receiptSha256: sha256File(receiptPath), a54SourceManifestSha256, receipt };
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
const PROVIDER_KEYS = ["providerIdDigest", "vendorFamilyDigest", "accountDigestDigest", "regionDigest", "failureDomainDigestDigest", "controlPlaneDigestDigest"];
function providerIdentityValid(value) { return isRecord(value) && PROVIDER_KEYS.every((key) => isSha(value[key])); }
function checkMap(receipt) { return new Map((receipt.checks ?? []).map((row) => [row.id, row])); }
function verifyA54Evidence(zipPath, expectedZipSha) {
  const errors = [];
  if (!isSha(expectedZipSha) || sha256File(zipPath) !== expectedZipSha) errors.push("a54_evidence_zip_anchor_mismatch");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a56-a54-"));
  try {
    extractZipSafely(zipPath, temp, contract.zipBudgets);
    const manifest = verifyExactManifest(temp, "PASS35_A54_EVIDENCE_MANIFEST.json", "velmere.pass35.a54.evidence-manifest.v1", contract.requiredA54RevisionId);
    errors.push(...manifest.errors.map((error) => `a54:${error}`));
    const mainReceiptPath = findExact(temp, "PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.json");
    const runReceiptPath = path.join(manifest.base, "run/receipt.json");
    const journalPath = path.join(manifest.base, "run/journal.json");
    if (!fs.existsSync(runReceiptPath) || !fs.existsSync(journalPath)) errors.push("a54_run_receipt_or_journal_missing");
    const mainBytes = fs.readFileSync(mainReceiptPath);
    const runBytes = fs.existsSync(runReceiptPath) ? fs.readFileSync(runReceiptPath) : Buffer.alloc(0);
    if (!mainBytes.equals(runBytes)) errors.push("a54_main_and_run_receipt_mismatch");
    const receipt = JSON.parse(mainBytes.toString("utf8"));
    const journal = fs.existsSync(journalPath) ? safeReadJson(journalPath) : { rows: [] };
    if (receipt.revisionId !== contract.requiredA54RevisionId || receipt.decision !== contract.requiredA54Decision || receipt.fixtureMode !== false || receipt.summary?.failed !== 0 || receipt.recovery?.mutationStarted !== true || receipt.recovery?.restorationAttempted !== true || receipt.recovery?.restorationSucceeded !== true || receipt.saleEnabled !== false || receipt.liveProven !== false || receipt.sourceFingerprint?.before !== receipt.sourceFingerprint?.after || receipt.sourceFingerprint?.manifestSha256 !== manifest.manifest.sourceManifestSha256) errors.push("a54_receipt_semantic_invalid");
    if (!providerIdentityValid(receipt.providerIdentity?.primary) || !providerIdentityValid(receipt.providerIdentity?.alternate)) errors.push("a54_provider_identity_invalid");
    const metrics = receipt.boundedMetrics;
    if (!isRecord(metrics) || !isFiniteNumber(metrics.availabilityPct) || metrics.availabilityPct < contract.metricFloors.availabilityMinimumPct || !isFiniteNumber(metrics.p95Ms) || metrics.p95Ms < 0 || metrics.p95Ms > contract.metricFloors.p95MaximumMs || !isFiniteNumber(metrics.p99Ms) || metrics.p99Ms < metrics.p95Ms || metrics.p99Ms > contract.metricFloors.p99MaximumMs || !isFiniteNumber(metrics.errorBudgetConsumedPct) || metrics.errorBudgetConsumedPct < 0 || metrics.errorBudgetConsumedPct > contract.metricFloors.errorBudgetMaximumPct || !isFiniteNumber(metrics.deliverySeconds) || metrics.deliverySeconds < 0 || metrics.deliverySeconds > contract.metricFloors.alertDeliveryMaximumSeconds || !isFiniteNumber(metrics.acknowledgementSeconds) || metrics.acknowledgementSeconds < 0 || metrics.acknowledgementSeconds > contract.metricFloors.acknowledgementMaximumSeconds || !isFiniteNumber(metrics.exitSeconds) || metrics.exitSeconds < 0 || metrics.exitSeconds > contract.metricFloors.vendorExitMaximumSeconds || !Number.isInteger(metrics.probeCount) || metrics.probeCount < contract.metricFloors.minimumServiceProbes || !isFiniteNumber(metrics.serviceAvailabilityPct) || metrics.serviceAvailabilityPct < contract.metricFloors.serviceAvailabilityMinimumPct || !isFiniteNumber(metrics.serviceP95Ms) || metrics.serviceP95Ms < 0 || metrics.serviceP95Ms > contract.metricFloors.serviceP95MaximumMs || !isFiniteNumber(metrics.freshnessMaximumSeconds) || metrics.freshnessMaximumSeconds < 0 || metrics.freshnessMaximumSeconds > contract.metricFloors.freshnessMaximumSeconds) errors.push("a54_metrics_invalid");
    const checksById = checkMap(receipt);
    for (const id of contract.requiredA54Checks) if (checksById.get(id)?.ok !== true) errors.push(`a54_required_check_missing_or_failed:${id}`);
    if (journal.schemaVersion !== "velmere.pass35.a54.journal.v1" || journal.revisionId !== contract.requiredA54RevisionId || journal.runId !== receipt.runId || !Array.isArray(journal.rows) || journal.rows.length < 4) errors.push("a54_journal_identity_invalid");
    const rows = journal.rows ?? [];
    let previousAt = null;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]; const at = parseTime(row.at);
      if (row.sequence !== index + 1 || at === null || (previousAt !== null && at < previousAt)) errors.push(`a54_journal_order_invalid:${index}`);
      previousAt = at;
    }
    const first = rows[0]; const last = rows.at(-1);
    if (first?.stepId !== "run" || first?.status !== "STARTED" || last?.stepId !== "run" || last?.status !== "COMPLETED" || !rows.some((row) => row.stepId === "restore-primary" && row.status === "SUCCEEDED")) errors.push("a54_journal_lifecycle_invalid");
    const prefixRows = last?.stepId === "run" && last?.status === "COMPLETED" ? rows.slice(0, -1) : rows;
    if (receipt.journalDigest !== shaText(JSON.stringify(prefixRows))) errors.push("a54_journal_digest_invalid");
    const startedAt = parseTime(first?.at); const completedAt = parseTime(last?.at); const generatedAt = parseTime(receipt.generatedAt);
    if (startedAt === null || completedAt === null || generatedAt === null || startedAt > completedAt || generatedAt < startedAt - contract.observation.maximumClockSkewSeconds * 1000 || generatedAt > completedAt + contract.observation.maximumClockSkewSeconds * 1000) errors.push("a54_run_timeline_invalid");
    return {
      ok: errors.length === 0, errors, runId: receipt.runId, sourceManifestSha256: receipt.sourceFingerprint?.manifestSha256,
      manifestSha256: manifest.manifestSha256, receiptSha256: sha256(mainBytes), journalSha256: fs.existsSync(journalPath) ? sha256File(journalPath) : null,
      startedAt, completedAt, generatedAt, journalRows: rows.length, journalDigest: receipt.journalDigest, metrics,
      primary: receipt.providerIdentity?.primary, alternate: receipt.providerIdentity?.alternate, receipt
    };
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
const BUNDLE_KEYS = new Set(["schemaVersion", "subjectRevisionId", "subjectOrganizationIdHash", "a55EvidenceManifestSha256", "a54SourceManifestSha256", "generatedAt", "runs", "aggregateAttestationPath"]);
const RUN_ENTRY_KEYS = new Set(["evidencePath", "evidenceSha256", "observerAttestationPath"]);
const RUN_ATTESTATION_KEYS = new Set(["schemaVersion", "subjectRevisionId", "runId", "evidenceZipSha256", "evidenceManifestSha256", "receiptSha256", "journalSha256", "sourceManifestSha256", "observedStartAt", "observedEndAt", "issuedAt", "expiresAt", "assertions", "signatures"]);
const AGGREGATE_KEYS = new Set(["schemaVersion", "decision", "subjectRevisionId", "a55EvidenceManifestSha256", "a54SourceManifestSha256", "issuedAt", "expiresAt", "runEvidenceDigests", "runAttestationDigests", "conditions", "signatures"]);
function validateRunAttestation(attestation, a54, evidenceZipSha256, trust, subjectOrganizationIdHash, label) {
  const errors = unknownKeys(attestation, RUN_ATTESTATION_KEYS).map((key) => `${label}:unknown_field:${key}`);
  if (attestation.schemaVersion !== "velmere.pass35.a56.run-observer-attestation.v1" || attestation.subjectRevisionId !== contract.requiredA54RevisionId || attestation.runId !== a54.runId) errors.push(`${label}:identity_invalid`);
  if (attestation.evidenceZipSha256 !== evidenceZipSha256 || attestation.evidenceManifestSha256 !== a54.manifestSha256 || attestation.receiptSha256 !== a54.receiptSha256 || attestation.journalSha256 !== a54.journalSha256 || attestation.sourceManifestSha256 !== a54.sourceManifestSha256) errors.push(`${label}:evidence_binding_invalid`);
  errors.push(...validateTimeWindow(attestation, label));
  const observedStart = parseTime(attestation.observedStartAt); const observedEnd = parseTime(attestation.observedEndAt);
  const skew = contract.observation.maximumClockSkewSeconds * 1000;
  if (observedStart === null || observedEnd === null || observedStart > observedEnd || Math.abs(observedStart - a54.startedAt) > skew || Math.abs(observedEnd - a54.completedAt) > skew) errors.push(`${label}:real_time_observation_window_invalid`);
  if (!isRecord(attestation.assertions) || Object.keys(attestation.assertions).length !== contract.requiredRunAssertions.length || contract.requiredRunAssertions.some((key) => attestation.assertions[key] !== true)) errors.push(`${label}:assertions_invalid`);
  const signatures = verifySignatures(attestation, trust, [contract.roles.runObserver], subjectOrganizationIdHash, label);
  errors.push(...signatures.errors);
  return { ok: errors.length === 0, errors, observedStart, observedEnd, signedPayloadSha256: signatures.payloadSha256, signer: signatures.signers[0] ?? null };
}
function writeReport(decision, extra = {}) {
  const failures = checks.filter((row) => !row.ok);
  const verified = decision === "VERIFIED_STAGING_OUT_OF_TIME_SLO_VENDOR_EXIT_OBSERVATION";
  const report = {
    schemaVersion: "velmere.pass35.a56.out-of-time-slo-vendor-exit-observation-acceptance-receipt.v1",
    revisionId: contract.revisionId,
    parentRevisionId: contract.parentRevisionId,
    generatedAt: new Date().toISOString(),
    fixtureMode,
    decision,
    truthBoundary: contract.truthBoundary,
    repeatedOutOfTimeObservationProven: verified,
    controlledCanaryEntryEligible: verified,
    controlledCanaryExecuted: false,
    continuousMonitoringProven: false,
    productionSloProven: false,
    contractualSlaProven: false,
    productionVendorExitProven: false,
    productionApproved: false,
    liveProven: false,
    saleEnabled: false,
    summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
    failures,
    checks,
    ...extra
  };
  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outputMd, `# PASS35 A56 — out-of-time SLO/vendor-exit observation acceptance\n\nDecision: **${decision}**\n\n- Checks: ${report.summary.checks}\n- Passed: ${report.summary.passed}\n- Failed: ${report.summary.failed}\n- Repeated out-of-time observation proven: ${report.repeatedOutOfTimeObservationProven}\n- Controlled canary executed: false\n- Continuous monitoring proven: false\n- Production/LIVE/sale: false\n\n${failures.length ? "## Failures\n\n" + failures.map((row) => `- ${row.id}: ${JSON.stringify(row.detail)}`).join("\n") : "All declared A56 checks passed within the bounded observation-window truth boundary."}\n`);
  console.log(JSON.stringify({ decision, summary: report.summary }, null, 2));
  if (!verified && decision !== "FIXTURE_PASS") process.exitCode = 1;
  return report;
}
async function main() {
  const source = verifySourceManifest();
  addCheck("source-manifest-valid", source.ok, source, "integrity");
  const expectedSourceSha = String(process.env.VELMERE_A56_EXPECTED_SOURCE_MANIFEST_SHA256 ?? argValue("--source-manifest-sha") ?? "").toLowerCase();
  addCheck("source-manifest-external-anchor", fixtureMode || (isSha(expectedSourceSha) && expectedSourceSha === source.manifestSha256), { observed: source.manifestSha256, expectedPresent: Boolean(expectedSourceSha) }, "integrity");
  addCheck("runtime-exact", fixtureMode || (process.versions.node === contract.runtime.node && currentNpmVersion() === contract.runtime.npm), { observed: { node: process.versions.node, npm: currentNpmVersion() }, expected: contract.runtime }, "preflight");
  const confirmation = process.env.VELMERE_A56_CONFIRM ?? argValue("--confirm") ?? "";
  addCheck("confirmation-token", confirmation === contract.confirmationToken, { present: Boolean(confirmation) }, "preflight");
  const subjectOrganizationIdHash = String(process.env.VELMERE_A56_SUBJECT_ORGANIZATION_ID_HASH ?? argValue("--subject-org") ?? "").toLowerCase();
  addCheck("subject-organization-binding", isSha(subjectOrganizationIdHash), { present: Boolean(subjectOrganizationIdHash) }, "preflight");
  const bundleZip = path.resolve(root, process.env.VELMERE_A56_OBSERVATION_BUNDLE_ZIP ?? argValue("--bundle") ?? "");
  const trustFile = path.resolve(root, process.env.VELMERE_A56_TRUST_ROOTS_JSON ?? argValue("--trust-roots") ?? "");
  const a55Zip = path.resolve(root, process.env.VELMERE_A56_A55_EVIDENCE_ZIP ?? argValue("--a55-evidence") ?? "");
  addCheck("required-input-files", [bundleZip, trustFile, a55Zip].every((file) => fs.existsSync(file) && fs.statSync(file).isFile()), { bundle: fs.existsSync(bundleZip), trust: fs.existsSync(trustFile), a55: fs.existsSync(a55Zip) }, "preflight");
  if (checks.some((row) => !row.ok)) return writeReport(fixtureMode ? "FIXTURE_FAIL" : "INCOMPLETE_EVIDENCE");

  const trustSha = String(process.env.VELMERE_A56_TRUST_ROOTS_SHA256 ?? argValue("--trust-roots-sha") ?? "").toLowerCase();
  const trust = loadTrustRoots(trustFile, trustSha, subjectOrganizationIdHash);
  addCheck("trust-roots-integrity-and-anchor", trust.ok, trust.errors, "integrity");
  const a55ExpectedSha = String(process.env.VELMERE_A56_A55_EVIDENCE_SHA256 ?? argValue("--a55-evidence-sha") ?? "").toLowerCase();
  const a55 = verifyA55Evidence(a55Zip, a55ExpectedSha);
  addCheck("a55-evidence-integrity-and-semantics", a55.ok, a55.errors, "integrity");
  if (checks.some((row) => !row.ok)) return writeReport(fixtureMode ? "FIXTURE_FAIL" : "REJECTED_INTEGRITY", { a55 });

  const extracted = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a56-bundle-"));
  try {
    const archive = extractZipSafely(bundleZip, extracted, contract.zipBudgets);
    addCheck("observation-bundle-safe-zip", true, archive, "integrity");
    const manifest = verifyExactManifest(extracted, "PASS35_A56_OBSERVATION_BUNDLE_MANIFEST.json", "velmere.pass35.a56.observation-bundle-manifest.v1", contract.revisionId);
    addCheck("observation-bundle-manifest-valid", manifest.ok, manifest.errors, "integrity");
    const bundle = safeReadJson(findExact(extracted, "bundle.json"));
    const bundleUnknown = unknownKeys(bundle, BUNDLE_KEYS);
    addCheck("bundle-no-unknown-fields", bundleUnknown.length === 0, bundleUnknown, "semantic");
    addCheck("bundle-identity-and-parent-binding", bundle.schemaVersion === "velmere.pass35.a56.observation-bundle.v1" && bundle.subjectRevisionId === contract.requiredA54RevisionId && bundle.subjectOrganizationIdHash === subjectOrganizationIdHash && bundle.a55EvidenceManifestSha256 === a55.manifestSha256 && bundle.a54SourceManifestSha256 === a55.a54SourceManifestSha256, bundle, "semantic");
    addCheck("bundle-run-count", Array.isArray(bundle.runs) && bundle.runs.length >= contract.observation.minimumRuns && bundle.runs.length <= contract.observation.maximumRuns, { count: bundle.runs?.length }, "semantic");
    if (checks.some((row) => !row.ok && row.category === "integrity")) return writeReport(fixtureMode ? "FIXTURE_FAIL" : "REJECTED_INTEGRITY", { a55, bundleManifestSha256: manifest.manifestSha256 });
    if (checks.some((row) => !row.ok)) return writeReport(fixtureMode ? "FIXTURE_FAIL" : "ACTION_REQUIRED", { a55, bundleManifestSha256: manifest.manifestSha256 });

    const runResults = [];
    for (let index = 0; index < bundle.runs.length; index += 1) {
      const entry = bundle.runs[index]; const label = `run-${index + 1}`;
      const entryUnknown = unknownKeys(entry, RUN_ENTRY_KEYS);
      addCheck(`${label}-entry-no-unknown-fields`, entryUnknown.length === 0, entryUnknown, "semantic");
      const evidencePath = path.resolve(manifest.base, normalize(entry.evidencePath));
      const attestationPath = path.resolve(manifest.base, normalize(entry.observerAttestationPath));
      const inBundle = evidencePath.startsWith(`${path.resolve(manifest.base)}${path.sep}`) && attestationPath.startsWith(`${path.resolve(manifest.base)}${path.sep}`);
      addCheck(`${label}-paths-safe-and-present`, inBundle && fs.existsSync(evidencePath) && fs.existsSync(attestationPath), { evidencePath: entry.evidencePath, attestationPath: entry.observerAttestationPath }, "integrity");
      if (!inBundle || !fs.existsSync(evidencePath) || !fs.existsSync(attestationPath)) continue;
      const evidenceSha = sha256File(evidencePath);
      addCheck(`${label}-evidence-zip-hash-bound`, isSha(entry.evidenceSha256) && entry.evidenceSha256 === evidenceSha, { expected: entry.evidenceSha256, observed: evidenceSha }, "integrity");
      const a54 = verifyA54Evidence(evidencePath, entry.evidenceSha256);
      addCheck(`${label}-a54-evidence-valid`, a54.ok, a54.errors, "integrity");
      const attestation = safeReadJson(attestationPath);
      const attestationResult = validateRunAttestation(attestation, a54, evidenceSha, trust, subjectOrganizationIdHash, label);
      addCheck(`${label}-observer-attestation-valid`, attestationResult.ok, attestationResult.errors, attestationResult.errors.some((error) => /signature|untrusted|evidence_binding/iu.test(error)) ? "integrity" : "semantic");
      runResults.push({ ...a54, evidenceZipSha256: evidenceSha, observerAttestationSha256: sha256File(attestationPath), observerPayloadSha256: attestationResult.signedPayloadSha256, observerSigner: attestationResult.signer, observedStart: attestationResult.observedStart, observedEnd: attestationResult.observedEnd });
    }
    if (checks.some((row) => !row.ok && row.category === "integrity")) return writeReport(fixtureMode ? "FIXTURE_FAIL" : "REJECTED_INTEGRITY", { a55, bundleManifestSha256: manifest.manifestSha256, runResults });

    const completeRuns = runResults.filter((row) => row.ok && row.observerSigner);
    const sorted = [...completeRuns].sort((a, b) => a.startedAt - b.startedAt);
    const uniqueRunIds = new Set(sorted.map((row) => row.runId));
    const uniqueEvidence = new Set(sorted.map((row) => row.evidenceZipSha256));
    const uniqueJournals = new Set(sorted.map((row) => row.journalSha256));
    addCheck("runs-unique-and-complete", sorted.length === bundle.runs.length && uniqueRunIds.size === sorted.length && uniqueEvidence.size === sorted.length && uniqueJournals.size === sorted.length, { runs: sorted.length, runIds: uniqueRunIds.size, evidence: uniqueEvidence.size, journals: uniqueJournals.size }, "semantic");
    addCheck("frozen-source-across-runs", sorted.length > 0 && sorted.every((row) => row.sourceManifestSha256 === a55.a54SourceManifestSha256), { expected: a55.a54SourceManifestSha256, observed: [...new Set(sorted.map((row) => row.sourceManifestSha256))] }, "semantic");
    const gaps = [];
    for (let index = 1; index < sorted.length; index += 1) gaps.push((sorted[index].startedAt - sorted[index - 1].completedAt) / 1000);
    const spanSeconds = sorted.length ? (sorted.at(-1).completedAt - sorted[0].startedAt) / 1000 : 0;
    addCheck("out-of-time-span-and-gaps", spanSeconds >= contract.observation.minimumObservationSpanSeconds && spanSeconds <= contract.observation.maximumObservationSpanSeconds && gaps.every((gap) => gap >= contract.observation.minimumGapBetweenRunsSeconds), { spanSeconds, gaps, minimumSpan: contract.observation.minimumObservationSpanSeconds, minimumGap: contract.observation.minimumGapBetweenRunsSeconds }, "semantic");
    const now = Date.now();
    addCheck("run-evidence-current", sorted.every((row) => row.completedAt <= now + contract.observation.maximumClockSkewSeconds * 1000 && (now - row.completedAt) / 1000 <= contract.observation.maximumEvidenceAgeSeconds), { agesSeconds: sorted.map((row) => (now - row.completedAt) / 1000) }, "semantic");
    const primaryDigests = new Set(sorted.map((row) => canonicalize(row.primary)));
    const alternateProviderIds = new Set(sorted.map((row) => row.alternate?.providerIdDigest));
    const alternateVendorFamilies = new Set(sorted.map((row) => row.alternate?.vendorFamilyDigest));
    const alternateControlPlanes = new Set(sorted.map((row) => row.alternate?.controlPlaneDigestDigest));
    addCheck("primary-provider-stable", primaryDigests.size === 1, { distinctPrimaryIdentities: primaryDigests.size }, "semantic");
    addCheck("alternate-provider-diversity", alternateProviderIds.size >= contract.observation.minimumDistinctAlternateProviderIds && alternateVendorFamilies.size >= contract.observation.minimumDistinctAlternateVendorFamilies && alternateControlPlanes.size >= contract.observation.minimumDistinctAlternateControlPlanes, { providerIds: alternateProviderIds.size, vendorFamilies: alternateVendorFamilies.size, controlPlanes: alternateControlPlanes.size }, "semantic");
    const observerOrganizations = new Set(sorted.map((row) => row.observerSigner?.organizationIdHash));
    const observerKeys = new Set(sorted.map((row) => row.observerSigner?.keyId));
    addCheck("observer-organizational-diversity", observerOrganizations.size >= contract.observation.minimumIndependentObserverOrganizations && observerKeys.size >= contract.observation.minimumIndependentObserverKeys, { organizations: observerOrganizations.size, keys: observerKeys.size }, "semantic");
    const averageServiceAvailability = sorted.length ? sorted.reduce((sum, row) => sum + row.metrics.serviceAvailabilityPct, 0) / sorted.length : 0;
    addCheck("cross-run-metric-floors", sorted.length > 0 && sorted.every((row) => row.metrics.availabilityPct >= contract.metricFloors.availabilityMinimumPct && row.metrics.p95Ms <= contract.metricFloors.p95MaximumMs && row.metrics.p99Ms <= contract.metricFloors.p99MaximumMs && row.metrics.errorBudgetConsumedPct <= contract.metricFloors.errorBudgetMaximumPct && row.metrics.serviceAvailabilityPct >= contract.metricFloors.serviceAvailabilityMinimumPct) && averageServiceAvailability >= contract.metricFloors.minimumAverageServiceAvailabilityPct, { averageServiceAvailability, worstAvailability: sorted.length ? Math.min(...sorted.map((row) => row.metrics.availabilityPct)) : null, worstP95: sorted.length ? Math.max(...sorted.map((row) => row.metrics.p95Ms)) : null, worstP99: sorted.length ? Math.max(...sorted.map((row) => row.metrics.p99Ms)) : null }, "semantic");

    const aggregate = safeReadJson(path.resolve(manifest.base, normalize(bundle.aggregateAttestationPath)));
    const aggregateErrors = unknownKeys(aggregate, AGGREGATE_KEYS).map((key) => `aggregate:unknown_field:${key}`);
    if (aggregate.schemaVersion !== "velmere.pass35.a56.aggregate-attestation.v1" || aggregate.decision !== "APPROVE_CONTROLLED_CANARY_ENTRY_AFTER_OUT_OF_TIME_OBSERVATION" || aggregate.subjectRevisionId !== contract.revisionId || aggregate.a55EvidenceManifestSha256 !== a55.manifestSha256 || aggregate.a54SourceManifestSha256 !== a55.a54SourceManifestSha256) aggregateErrors.push("aggregate_identity_or_binding_invalid");
    aggregateErrors.push(...validateTimeWindow(aggregate, "aggregate"));
    const evidenceMap = Object.fromEntries(sorted.map((row) => [row.runId, row.evidenceZipSha256]));
    const attestationMap = Object.fromEntries(sorted.map((row) => [row.runId, row.observerAttestationSha256]));
    if (canonicalize(aggregate.runEvidenceDigests) !== canonicalize(evidenceMap) || canonicalize(aggregate.runAttestationDigests) !== canonicalize(attestationMap)) aggregateErrors.push("aggregate_run_digest_maps_invalid");
    const conditions = aggregate.conditions;
    if (conditions?.saleEnabled !== false || conditions?.liveProven !== false || conditions?.productionApproved !== false || conditions?.controlledCanaryOnly !== true || conditions?.killSwitchRequired !== true || conditions?.stopRulesRequired !== true || conditions?.supportTelemetryRequired !== true || conditions?.refundTelemetryRequired !== true || conditions?.outcomeTelemetryRequired !== true || conditions?.unresolvedCriticalHigh !== 0) aggregateErrors.push("aggregate_conditions_invalid");
    const aggregateSignatures = verifySignatures(aggregate, trust, [contract.roles.operationsOwner, contract.roles.assuranceChair], subjectOrganizationIdHash, "aggregate");
    aggregateErrors.push(...aggregateSignatures.errors);
    const chair = aggregateSignatures.signers.find((row) => row.role === contract.roles.assuranceChair);
    if (chair && observerOrganizations.has(chair.organizationIdHash)) aggregateErrors.push("aggregate_chair_not_independent_from_run_observers");
    addCheck("aggregate-attestation-dual-control", aggregateErrors.length === 0, aggregateErrors, aggregateErrors.some((error) => /signature|untrusted|binding|digest/iu.test(error)) ? "integrity" : "semantic");

    const integrityFailures = checks.filter((row) => !row.ok && row.category === "integrity");
    const semanticFailures = checks.filter((row) => !row.ok && row.category !== "integrity");
    const decision = fixtureMode ? (integrityFailures.length || semanticFailures.length ? "FIXTURE_FAIL" : "FIXTURE_PASS") : integrityFailures.length ? "REJECTED_INTEGRITY" : semanticFailures.length ? "ACTION_REQUIRED" : "VERIFIED_STAGING_OUT_OF_TIME_SLO_VENDOR_EXIT_OBSERVATION";
    return writeReport(decision, {
      a55: { manifestSha256: a55.manifestSha256, receiptSha256: a55.receiptSha256, a54SourceManifestSha256: a55.a54SourceManifestSha256 },
      observationBundleSha256: sha256File(bundleZip), bundleManifestSha256: manifest.manifestSha256, trustRootsSha256: trust.observedSha,
      observation: { runs: sorted.length, spanSeconds, gapsSeconds: gaps, observerOrganizations: observerOrganizations.size, observerKeys: observerKeys.size, distinctAlternateProviders: alternateProviderIds.size, distinctAlternateVendorFamilies: alternateVendorFamilies.size, distinctAlternateControlPlanes: alternateControlPlanes.size, averageServiceAvailabilityPct: averageServiceAvailability },
      aggregateSignedPayloadSha256: aggregateSignatures.payloadSha256,
      runs: sorted.map((row) => ({ runId: row.runId, evidenceZipSha256: row.evidenceZipSha256, manifestSha256: row.manifestSha256, receiptSha256: row.receiptSha256, journalSha256: row.journalSha256, observerAttestationSha256: row.observerAttestationSha256, startedAt: new Date(row.startedAt).toISOString(), completedAt: new Date(row.completedAt).toISOString(), sourceManifestSha256: row.sourceManifestSha256, primary: row.primary, alternate: row.alternate, metrics: row.metrics, observer: row.observerSigner }))
    });
  } finally { fs.rmSync(extracted, { recursive: true, force: true }); }
}
main().catch((error) => {
  addCheck("unhandled-error", false, error instanceof Error ? error.message : String(error), "integrity");
  writeReport(fixtureMode ? "FIXTURE_FAIL" : "REJECTED_INTEGRITY", { fatalError: error instanceof Error ? error.message : String(error) });
});
