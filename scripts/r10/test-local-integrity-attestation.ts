import assert from "node:assert/strict";
import {
  getVelmereSigningKeys,
  signReportWithPki,
  verifyReportPki,
} from "../../lib/security/audit-pki-signature";

const digest = "a".repeat(64);
const at = "2026-09-12T00:00:00.000Z";
const first = signReportWithPki(digest, at);
const second = signReportWithPki(`sha256:${digest}`, at);

assert.equal(first.attestationType, "LOCAL_FILE_INTEGRITY");
assert.equal(first.signerIdentity, "Velmère Local Integrity Signer");
assert.equal(first.externalTimestampVerified, false);
assert.equal(first.localTimestamp.externalTsa, false);
assert.equal(first.localTimestamp.externalTimestampVerified, false);
assert.equal(first.signedDigest, digest);
assert.equal(first.signatureHex, second.signatureHex);
assert.equal(first.publicKeyPem, second.publicKeyPem);
assert.equal(getVelmereSigningKeys().publicKeyPem, first.publicKeyPem);
assert.equal(verifyReportPki(first), true);

const serialized = JSON.stringify(first);
assert.doesNotMatch(serialized, /RFC\s*3161|TimeStampToken|Trusted Timestamp|Root CA|Trusted Authority/i);
assert.match(first.truthBoundary, /integrity only/i);
assert.match(first.truthBoundary, /not an RFC 3161/i);

const tampered = { ...first, signedDigest: "b".repeat(64) };
assert.equal(verifyReportPki(tampered), false);

console.log("R10 local report-integrity attestation regression: PASS");
