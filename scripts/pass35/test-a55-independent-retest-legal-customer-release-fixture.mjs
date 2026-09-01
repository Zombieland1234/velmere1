#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { crc32 } from "../lib/a47-safe-zip.mjs";

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a55-independent-retest-legal-customer-release-acceptance.json"), "utf8"));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a55-fixture-"));
const checks = [];
let scenarioCount = 0;
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const payloadBytes = (value) => Buffer.from(canonical(Object.fromEntries(Object.entries(value).filter(([key]) => key !== "signatures"))), "utf8");
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
const now = Date.now();
const issuedAt = new Date(now - 60_000).toISOString();
const expiresAt = new Date(now + 7 * 86400_000).toISOString();
const subjectOrg = sha256("velmere-subject-org");
const a54SubjectManifestSha = "a".repeat(64);

function zipStore(output, entries) {
  const localParts = []; const centralParts = []; let offset = 0;
  for (const [name, raw] of entries) {
    const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw); const nameBuffer = Buffer.from(name, "utf8"); const crc = crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(0, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuffer.length, 26);
    localParts.push(local, nameBuffer, data);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(0x0314, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(0, 10); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuffer.length, 28); central.writeUInt32LE((0o100644 << 16) >>> 0, 38); central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer); offset += local.length + nameBuffer.length + data.length;
  }
  const centralBuffer = Buffer.concat(centralParts); const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10); eocd.writeUInt32LE(centralBuffer.length, 12); eocd.writeUInt32LE(offset, 16);
  fs.writeFileSync(output, Buffer.concat([...localParts, centralBuffer, eocd]));
}
function makeKey(keyId, organizationIdHash, affiliation, roles) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  return { keyId, organizationIdHash, affiliation, roles, conflictOfInterest: false, publicKeyPem: publicKey.export({ type: "spki", format: "pem" }), privateKey };
}
const primaryRoles = Object.values(contract.primaryRoles);
const keys = {
  primary: makeKey("independent-primary-key", sha256("independent-primary-org"), "INDEPENDENT", primaryRoles),
  secondary: makeKey("independent-secondary-key", sha256("independent-secondary-org"), "INDEPENDENT", [contract.secondaryRole]),
  owner: makeKey("subject-release-owner-key", subjectOrg, "SUBJECT", ["ACCOUNTABLE_RELEASE_OWNER"]),
  chair: makeKey("independent-chair-key", sha256("independent-chair-org"), "INDEPENDENT", ["INDEPENDENT_ASSURANCE_CHAIR"])
};
function trustRows(overrides = {}) {
  return Object.values(keys).map((key) => ({ keyId: key.keyId, organizationIdHash: overrides[key.keyId]?.organizationIdHash ?? key.organizationIdHash, affiliation: overrides[key.keyId]?.affiliation ?? key.affiliation, roles: key.roles, algorithm: "ED25519", conflictOfInterest: overrides[key.keyId]?.conflictOfInterest ?? key.conflictOfInterest, publicKeyPem: key.publicKeyPem }));
}
function writeTrust(file, overrides = {}, extra = {}) {
  const data = json({ schemaVersion: "velmere.pass35.a55.trust-roots.v1", subjectOrganizationIdHash: subjectOrg, issuedAt, expiresAt, keys: trustRows(overrides), ...extra });
  fs.writeFileSync(file, data); return sha256(data);
}
function signObject(object, signers, signaturePrefix, entries, corruptRole = null) {
  const bytes = payloadBytes(object); const digest = sha256(bytes); const refs = [];
  for (const { key, role } of signers) {
    const sigPath = `signatures/${signaturePrefix}-${role.toLowerCase()}.sig`;
    let signature = crypto.sign(null, bytes, key.privateKey);
    if (role === corruptRole) signature = Buffer.from(signature.map((byte, index) => index === 0 ? byte ^ 0xff : byte));
    entries.push([sigPath, Buffer.from(signature.toString("base64"), "utf8")]);
    refs.push({ keyId: key.keyId, role, algorithm: "ED25519", signaturePath: sigPath, signedPayloadSha256: digest });
  }
  return { ...object, signatures: refs };
}
function assertionsFor(type) {
  return {
    SECURITY: { applicationApiCloudRetest: true, tenantIsolationRetested: true, secretRotationObserved: true, zeroOpenCriticalHigh: true },
    DATA_PROVIDER: { rightsMappingReviewed: true, displayExportPdfRightsReviewed: true, dataIntegrityRetest: true, providerExitReviewed: true, unresolvedRightsBlocks: 0 },
    PAYMENTS: { testPaymentRefundReconciliationObserved: true, webhookReplayObserved: true, entitlementRevocationObserved: true, unresolvedFinancialControlBlocks: 0 },
    OPERATIONS: { a54DrillObserved: true, recoveryObserved: true, alertAckObserved: true, unresolvedOperationalBlocks: 0 },
    LEGAL_CUSTOMER: { legalApplicabilityReviewed: true, privacyAndConsumerTermsReviewed: true, customerCommunicationReviewed: true, prohibitedSafetyClaimsFound: 0, unresolvedLegalBlocks: 0 }
  }[type];
}
function makeA54Evidence(output, { decision = contract.requiredA54Decision, fixtureMode = false, restorationSucceeded = true } = {}) {
  const receipt = json({ schemaVersion: "velmere.pass35.a54.strict-slo-alert-ack-vendor-exit-recovery-receipt.v1", revisionId: contract.requiredA54RevisionId, decision, fixtureMode, summary: { failed: 0 }, recovery: { restorationSucceeded }, saleEnabled: false, sourceFingerprint: { before: "b".repeat(64), after: "b".repeat(64), manifestSha256: a54SubjectManifestSha } });
  const manifest = json({ schemaVersion: "velmere.pass35.a54.evidence-manifest.v1", revisionId: contract.parentRevisionId, runId: "fixture-a54-run", decision, generatedAt: issuedAt, files: [{ path: "PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.json", bytes: receipt.length, sha256: sha256(receipt) }] });
  zipStore(output, [["PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.json", receipt], ["PASS35_A54_EVIDENCE_MANIFEST.json", manifest]]);
  return { zipSha: sha256(fs.readFileSync(output)), manifestSha: sha256(manifest) };
}
function makeReviewBundle(output, a54ManifestSha, options = {}) {
  const entries = []; const reportFiles = {}; const reportDigests = {};
  const missingType = options.missingType ?? null;
  for (const type of contract.reportTypes) {
    if (type === missingType) continue;
    const reportPath = `reports/${type.toLowerCase()}.json`;
    reportFiles[type] = reportPath;
    const reportBase = {
      schemaVersion: "velmere.pass35.a55.independent-retest-report.v1",
      reportId: `report-${type.toLowerCase()}-20260725`, reportType: type, subjectRevisionId: contract.parentRevisionId,
      sourceManifestSha256: a54SubjectManifestSha, a54EvidenceManifestSha256: a54ManifestSha,
      issuedAt: options.futureType === type ? new Date(now + 3600_000).toISOString() : options.expiredType === type ? new Date(now - 10 * 86400_000).toISOString() : issuedAt,
      expiresAt: options.expiredType === type ? new Date(now - 86400_000).toISOString() : expiresAt,
      scope: options.missingScopeType === type ? contract.requiredScopes[type].slice(1) : contract.requiredScopes[type],
      verdict: options.failVerdictType === type ? "CONDITIONAL" : "PASS",
      fixture: options.fixtureType === type, synthetic: false, locallyAuthored: false, conflictOfInterestDeclared: false,
      methodologySha256: sha256(`method-${type}`), evidenceIndexSha256: sha256(`evidence-${type}`), findingRegisterSha256: sha256(`findings-${type}`),
      openFindings: { critical: 0, high: options.openHighType === type ? 1 : 0, medium: 0, low: 0 },
      releaseBlockingExceptions: options.exceptionType === type ? ["blocking"] : [], assertions: assertionsFor(type),
      ...(options.unknownFieldType === type ? { unsignedExtraApproval: true } : {})
    };
    const report = signObject(reportBase, [{ key: keys.primary, role: contract.primaryRoles[type] }, { key: keys.secondary, role: contract.secondaryRole }], `report-${type.toLowerCase()}`, entries, options.corruptSignatureType === type ? contract.secondaryRole : null);
    const bytes = json(report); entries.push([reportPath, bytes]); reportDigests[type] = sha256(bytes);
  }
  const bundle = { schemaVersion: "velmere.pass35.a55.review-bundle.v1", subjectRevisionId: contract.parentRevisionId, subjectOrganizationIdHash: subjectOrg, sourceManifestSha256: a54SubjectManifestSha, a54EvidenceManifestSha256: a54ManifestSha, generatedAt: issuedAt, reportFiles, releaseAttestationPath: "release-attestation.json" };
  entries.push(["bundle.json", json(bundle)]);
  const releaseBase = {
    schemaVersion: "velmere.pass35.a55.release-attestation.v1", decision: options.releaseDecision ?? "APPROVE_CONTROLLED_CANARY_PREPARATION", subjectRevisionId: contract.parentRevisionId,
    sourceManifestSha256: a54SubjectManifestSha, a54EvidenceManifestSha256: a54ManifestSha, issuedAt, expiresAt,
    reportDigests: options.releaseDigestMismatch ? { ...reportDigests, SECURITY: "f".repeat(64) } : reportDigests,
    conditions: { saleEnabled: options.saleEnabled ?? false, liveProven: false, productionApproved: false, controlledCanaryOnly: true, killSwitchRequired: true, unresolvedCriticalHigh: 0 }
  };
  const release = signObject(releaseBase, [{ key: keys.owner, role: "ACCOUNTABLE_RELEASE_OWNER" }, { key: keys.chair, role: "INDEPENDENT_ASSURANCE_CHAIR" }], "release", entries, options.corruptReleaseSignature ? "INDEPENDENT_ASSURANCE_CHAIR" : null);
  entries.push(["release-attestation.json", json(release)]);
  const manifestFiles = entries.map(([name, data]) => ({ path: name, bytes: data.length, sha256: sha256(data) }));
  let manifest = json({ schemaVersion: "velmere.pass35.a55.review-bundle-manifest.v1", subjectRevisionId: contract.parentRevisionId, generatedAt: issuedAt, files: manifestFiles });
  if (options.tamperAfterManifest) entries.find(([name]) => name === "reports/security.json")[1] = Buffer.from(`${entries.find(([name]) => name === "reports/security.json")[1].toString("utf8")}tamper`);
  if (options.traversal) return zipStore(output, [["../evil.txt", Buffer.from("evil")]]);
  if (options.extraUnlistedFile) entries.push(["unlisted/hidden-approval.json", json({ approved: true })]);
  zipStore(output, [...entries, ["PASS35_A55_REVIEW_BUNDLE_MANIFEST.json", manifest]]);
}
function runCase(name, options = {}) {
  const caseDir = path.join(temp, name); fs.mkdirSync(caseDir, { recursive: true });
  const a54Zip = path.join(caseDir, "a54.zip"); const a54 = makeA54Evidence(a54Zip, options.a54 ?? {});
  const bundleZip = path.join(caseDir, "bundle.zip"); makeReviewBundle(bundleZip, a54.manifestSha, options.bundle ?? {});
  const trustFile = path.join(caseDir, "trust.json"); const trustSha = writeTrust(trustFile, options.trustOverrides ?? {}, options.trustExtra ?? {});
  const sourceManifestSha = sha256(fs.readFileSync(path.join(root, "config/pass35/a55-source-manifest.json")));
  const args = ["scripts/a55-independent-retest-legal-customer-release-acceptance.mjs", "--fixture", "--bundle", bundleZip, "--trust-roots", trustFile, "--trust-roots-sha", trustSha, "--a54-evidence", a54Zip, "--a54-evidence-sha", a54.zipSha, "--subject-org", subjectOrg, "--source-manifest-sha", sourceManifestSha, "--confirm", contract.confirmationToken];
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const report = JSON.parse(fs.readFileSync(path.join(root, "artifacts/pass35/a55/PASS35_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE.json"), "utf8"));
  return { result, report };
}
try {
  const scenarios = [
    ["valid", {}, true],
    ["tampered-manifest", { bundle: { tamperAfterManifest: true } }, false],
    ["unlisted-extra-file", { bundle: { extraUnlistedFile: true } }, false],
    ["unknown-report-field", { bundle: { unknownFieldType: "SECURITY" } }, false],
    ["zip-traversal", { bundle: { traversal: true } }, false],
    ["bad-signature", { bundle: { corruptSignatureType: "SECURITY" } }, false],
    ["bad-release-signature", { bundle: { corruptReleaseSignature: true } }, false],
    ["same-reviewer-org", { trustOverrides: { "independent-secondary-key": { organizationIdHash: keys.primary.organizationIdHash } } }, false],
    ["reviewer-subject-affiliated", { trustOverrides: { "independent-primary-key": { organizationIdHash: subjectOrg, affiliation: "SUBJECT" } } }, false],
    ["missing-report", { bundle: { missingType: "PAYMENTS" } }, false],
    ["missing-scope", { bundle: { missingScopeType: "DATA_PROVIDER" } }, false],
    ["open-high", { bundle: { openHighType: "SECURITY" } }, false],
    ["conditional-verdict", { bundle: { failVerdictType: "OPERATIONS" } }, false],
    ["release-blocking-exception", { bundle: { exceptionType: "LEGAL_CUSTOMER" } }, false],
    ["fixture-report", { bundle: { fixtureType: "PAYMENTS" } }, false],
    ["expired-report", { bundle: { expiredType: "SECURITY" } }, false],
    ["future-report", { bundle: { futureType: "DATA_PROVIDER" } }, false],
    ["release-digest-mismatch", { bundle: { releaseDigestMismatch: true } }, false],
    ["sale-enabled", { bundle: { saleEnabled: true } }, false],
    ["a54-not-verified", { a54: { decision: "ACTION_REQUIRED" } }, false],
    ["a54-fixture", { a54: { fixtureMode: true } }, false],
    ["a54-not-restored", { a54: { restorationSucceeded: false } }, false],
    ["chair-subject-affiliated", { trustOverrides: { "independent-chair-key": { organizationIdHash: subjectOrg, affiliation: "SUBJECT" } } }, false],
    ["duplicate-key-id", { trustExtra: { keys: undefined } }, false]
  ];
  for (const [name, options, expectedPass] of scenarios) {
    scenarioCount += 1;
    if (name === "duplicate-key-id") {
      const caseDir = path.join(temp, name); fs.mkdirSync(caseDir, { recursive: true });
      const a54Zip = path.join(caseDir, "a54.zip"); const a54 = makeA54Evidence(a54Zip); const bundleZip = path.join(caseDir, "bundle.zip"); makeReviewBundle(bundleZip, a54.manifestSha);
      const trustFile = path.join(caseDir, "trust.json"); const duplicateRows = trustRows(); duplicateRows.push({ ...duplicateRows[0] }); const data = json({ schemaVersion: "velmere.pass35.a55.trust-roots.v1", subjectOrganizationIdHash: subjectOrg, issuedAt, expiresAt, keys: duplicateRows }); fs.writeFileSync(trustFile, data);
      const sourceManifestSha = sha256(fs.readFileSync(path.join(root, "config/pass35/a55-source-manifest.json")));
      const result = spawnSync(process.execPath, ["scripts/a55-independent-retest-legal-customer-release-acceptance.mjs", "--fixture", "--bundle", bundleZip, "--trust-roots", trustFile, "--trust-roots-sha", sha256(data), "--a54-evidence", a54Zip, "--a54-evidence-sha", a54.zipSha, "--subject-org", subjectOrg, "--source-manifest-sha", sourceManifestSha, "--confirm", contract.confirmationToken], { cwd: root, encoding: "utf8" });
      const report = JSON.parse(fs.readFileSync(path.join(root, "artifacts/pass35/a55/PASS35_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE.json"), "utf8"));
      check(`${name}:decision`, report.decision === "FIXTURE_FAIL", report.decision); check(`${name}:exit`, result.status !== 0, result.status); continue;
    }
    const { result, report } = runCase(name, options);
    check(`${name}:decision`, report.decision === (expectedPass ? "FIXTURE_PASS" : "FIXTURE_FAIL"), { decision: report.decision, failures: report.failures });
    check(`${name}:exit`, expectedPass ? result.status === 0 : result.status !== 0, { status: result.status, stderr: result.stderr, stdout: result.stdout });
    check(`${name}:sale-disabled`, report.saleEnabled === false && report.liveProven === false && report.productionApproved === false, { sale: report.saleEnabled, live: report.liveProven, production: report.productionApproved });
  }
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
const failures = checks.filter((row) => !row.ok);
const report = { schemaVersion: "velmere.pass35.a55.strict-adversarial-fixture.v1", revisionId: contract.revisionId, generatedAt: new Date().toISOString(), scenarios: scenarioCount, assertions: checks.length, passed: checks.length - failures.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, "artifacts/pass35/a55"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass35/a55/PASS35_A55_STRICT_ADVERSARIAL_FIXTURE.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenarios: report.scenarios, assertions: report.assertions, passed: report.passed, failed: report.failed }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); }
