#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  canonicalJson,
  loadRealEvidenceContext,
  REAL_EVIDENCE_CLASS,
  REAL_EVIDENCE_RECEIPT_SCHEMA,
  REAL_EVIDENCE_TRUST_SCHEMA,
  sha256,
  verifyPhysicalEvidenceFamilies,
} from "../../lib/worldclass/pass36-real-evidence-physical-boundary.mjs";

const sourceRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a102r41-real-evidence-"));
const evidenceRoot = path.join(tempRoot, "evidence");
fs.mkdirSync(evidenceRoot);
const assertions = [];
const add = (id, passed, detail = null) => assertions.push({ id, passed: Boolean(passed), detail });
const authority = JSON.parse(fs.readFileSync(path.join(sourceRoot, "config/pass36/current-release-authority.json"), "utf8"));
const sourceRevisionId = authority.currentSource.revisionId;
const subjectId = "case:001";
const families = ["family_a", "family_b"];

function publicDer(publicKey) {
  return publicKey.export({ format: "der", type: "spki" }).toString("base64");
}

function createEvidence(family, organizationId, privateKey, ordinal) {
  const payloadPath = `payloads/${family}.json`;
  fs.mkdirSync(path.join(evidenceRoot, "payloads"), { recursive: true });
  const payloadBytes = Buffer.from(`${JSON.stringify({ subjectId, family, ordinal })}\n`);
  fs.writeFileSync(path.join(evidenceRoot, ...payloadPath.split("/")), payloadBytes, { flag: "wx" });
  const unsigned = {
    schemaVersion: REAL_EVIDENCE_RECEIPT_SCHEMA,
    evidenceId: `evidence:${family}`,
    subjectId,
    evidenceFamily: family,
    evidenceClass: REAL_EVIDENCE_CLASS,
    sourceRevisionId,
    fixtureOnly: false,
    synthetic: false,
    status: "VERIFIED",
    payload: { path: payloadPath, bytes: payloadBytes.length, sha256: sha256(payloadBytes) },
    verifier: { organizationId, algorithm: "Ed25519", signedAt: "2026-08-01T12:00:00.000Z" },
  };
  const signatureBase64 = crypto.sign(null, Buffer.from(canonicalJson(unsigned)), privateKey).toString("base64");
  const receipt = { ...unsigned, verifier: { ...unsigned.verifier, signatureBase64 } };
  const receiptPath = `receipts/${family}.json`;
  fs.mkdirSync(path.join(evidenceRoot, "receipts"), { recursive: true });
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(path.join(evidenceRoot, ...receiptPath.split("/")), receiptBytes, { flag: "wx" });
  return { evidenceId: receipt.evidenceId, subjectId, evidenceFamily: family, receiptPath, bytes: receiptBytes.length, sha256: sha256(receiptBytes) };
}

let cleanupSafetyError = null;
try {
  const keyA = crypto.generateKeyPairSync("ed25519");
  const keyB = crypto.generateKeyPairSync("ed25519");
  const trust = {
    schemaVersion: REAL_EVIDENCE_TRUST_SCHEMA,
    sourceRevisionId,
    verifiers: [
      { organizationId: "independent_org_a", algorithm: "Ed25519", publicKeySpkiDerBase64: publicDer(keyA.publicKey), allowedFamilies: families },
      { organizationId: "independent_org_b", algorithm: "Ed25519", publicKeySpkiDerBase64: publicDer(keyB.publicKey), allowedFamilies: families },
    ],
  };
  const trustPath = path.join(tempRoot, "trusted-verifiers.json");
  const trustBytes = Buffer.from(`${JSON.stringify(trust, null, 2)}\n`);
  fs.writeFileSync(trustPath, trustBytes, { flag: "wx" });
  const refs = [createEvidence("family_a", "independent_org_a", keyA.privateKey, 1), createEvidence("family_b", "independent_org_b", keyB.privateKey, 2)];
  const env = { VELMERE_REAL_EVIDENCE_ROOT: evidenceRoot, VELMERE_REAL_EVIDENCE_TRUST_POLICY: trustPath, VELMERE_REAL_EVIDENCE_TRUST_POLICY_SHA256: sha256(trustBytes) };
  const context = loadRealEvidenceContext(sourceRoot, env);
  add("context:external-hash-bound", Boolean(context));
  add("positive:two-independent-signed-families", verifyPhysicalEvidenceFamilies({ evidenceRefs: refs }, { context, expectedSubjectId: subjectId, requiredFamilies: families, minimumIndependentOrganizations: 2 }).verified);
  add("negative:no-context-self-assertion-denied", verifyPhysicalEvidenceFamilies({ evidenceRefs: refs, evidenceReady: true }, { context: null, expectedSubjectId: subjectId, requiredFamilies: families }).verified === false);
  add("negative:duplicate-receipt-denied", verifyPhysicalEvidenceFamilies({ evidenceRefs: [refs[0], { ...refs[0], evidenceFamily: "family_b" }] }, { context, expectedSubjectId: subjectId, requiredFamilies: families }).verified === false);
  add("negative:cross-subject-denied", verifyPhysicalEvidenceFamilies({ evidenceRefs: refs }, { context, expectedSubjectId: "case:002", requiredFamilies: families }).verified === false);
  const payloadA = path.join(evidenceRoot, "payloads", "family_a.json");
  fs.appendFileSync(payloadA, "tamper");
  add("negative:payload-byte-tamper-denied", verifyPhysicalEvidenceFamilies({ evidenceRefs: refs }, { context, expectedSubjectId: subjectId, requiredFamilies: families }).verified === false);
  fs.truncateSync(payloadA, refs[0] ? JSON.stringify({ subjectId, family: "family_a", ordinal: 1 }).length + 1 : 0);
  add("negative:trust-anchor-hash-mismatch-denied", loadRealEvidenceContext(sourceRoot, { ...env, VELMERE_REAL_EVIDENCE_TRUST_POLICY_SHA256: "0".repeat(64) }) === null);
  add("negative:path-traversal-denied", verifyPhysicalEvidenceFamilies({ evidenceRefs: [{ ...refs[0], receiptPath: "../trusted-verifiers.json" }, refs[1]] }, { context, expectedSubjectId: subjectId, requiredFamilies: families }).verified === false);
  const wrongSource = { ...trust, sourceRevisionId: `${sourceRevisionId}_WRONG` };
  const wrongBytes = Buffer.from(`${JSON.stringify(wrongSource, null, 2)}\n`);
  fs.writeFileSync(trustPath, wrongBytes);
  add("negative:source-revision-mismatch-denied", loadRealEvidenceContext(sourceRoot, { ...env, VELMERE_REAL_EVIDENCE_TRUST_POLICY_SHA256: sha256(wrongBytes) }) === null);
} finally {
  const resolved = path.resolve(tempRoot);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith("velmere-a102r41-real-evidence-")) cleanupSafetyError = new Error("unsafe_temp_cleanup_target");
  else fs.rmSync(resolved, { recursive: true, force: true });
}
if (cleanupSafetyError) throw cleanupSafetyError;

const failed = assertions.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r41.real-evidence-physical-boundary-test.v1",
  status: failed.length ? "FAIL_A102R41_REAL_EVIDENCE_PHYSICAL_BOUNDARY" : "PASS_A102R41_REAL_EVIDENCE_PHYSICAL_BOUNDARY_LOCAL_CRYPTO_NO_REAL_CREDIT",
  checks: assertions.length,
  passed: assertions.length - failed.length,
  failed: failed.length,
  failures: failed,
  realEvidenceRows: 0,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
}, null, 2));
process.exit(failed.length ? 1 : 0);
