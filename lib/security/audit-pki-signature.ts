/**
 * Velmère report file-integrity attestation.
 *
 * R10 truth boundary:
 * - this module provides a LOCAL Ed25519 integrity signature over a report digest;
 * - it does NOT create, emulate, or claim an RFC 3161 TimeStampToken;
 * - external TSA timestamping, when used, must be supplied as separate observed evidence.
 */

import crypto from "crypto";

export interface LocalIntegrityTimestamp {
  scheme: "LOCAL_GENERATED_AT";
  generatedAt: string;
  externalTsa: false;
  externalTimestampVerified: false;
}

export interface ReportPkiAttestation {
  attestationType: "LOCAL_FILE_INTEGRITY";
  signerIdentity: "Velmère Local Integrity Signer";
  signatureAlgorithm: "Ed25519";
  digestAlgorithm: "SHA-256";
  publicKeyPem: string;
  signatureHex: string;
  signedDigest: string;
  localTimestamp: LocalIntegrityTimestamp;
  externalTimestampVerified: false;
  integrityBindingSha256: string;
  truthBoundary: string;
}

const PKCS8_ED25519_SEED_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const LOCAL_SIGNING_SEED = crypto
  .createHash("sha256")
  .update("velmere-local-report-integrity-v1", "utf8")
  .digest();

let keyPairCache: {
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
  publicKeyPem: string;
  privateKeyPem: string;
  publicKeyJwk: JsonWebKey;
} | null = null;

/**
 * Deterministic local signing identity used only for reproducible file-integrity
 * fixtures/artifacts. This key is embedded in source and therefore MUST NOT be
 * treated as a private production CA or external trust anchor.
 */
export function getVelmereSigningKeys() {
  if (!keyPairCache) {
    const privateKeyDer = Buffer.concat([PKCS8_ED25519_SEED_PREFIX, LOCAL_SIGNING_SEED]);
    const privateKey = crypto.createPrivateKey({ key: privateKeyDer, format: "der", type: "pkcs8" });
    const publicKey = crypto.createPublicKey(privateKey);
    keyPairCache = {
      privateKey,
      publicKey,
      privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
      publicKeyJwk: publicKey.export({ format: "jwk" }) as JsonWebKey,
    };
  }
  return keyPairCache;
}

export function signWithVelmereKey(data: Buffer): Buffer {
  return crypto.sign(null, data, getVelmereSigningKeys().privateKey);
}

function cleanSha256Digest(reportDigest: string): string {
  const cleanDigest = reportDigest.startsWith("sha256:") ? reportDigest.slice(7) : reportDigest;
  if (!/^[a-f0-9]{64}$/i.test(cleanDigest)) {
    throw new Error("report_integrity_digest_must_be_sha256_hex");
  }
  return cleanDigest.toLowerCase();
}

/**
 * Backward-compatible function name. The returned object is deliberately NOT
 * an RFC3161/TSA claim; it is a local integrity attestation only.
 */
export function signReportWithPki(
  reportDigest: string,
  timestampIso?: string,
): ReportPkiAttestation {
  const cleanDigest = cleanSha256Digest(reportDigest);
  const generatedAt = timestampIso || new Date().toISOString();
  const signBuffer = Buffer.from(`VLM-LOCAL-INTEGRITY-V1|SHA-256|${cleanDigest}`, "utf8");
  const signature = crypto.sign(null, signBuffer, getVelmereSigningKeys().privateKey);
  const integrityBindingSha256 = crypto
    .createHash("sha256")
    .update(`${cleanDigest}|${signature.toString("hex")}`)
    .digest("hex");

  return {
    attestationType: "LOCAL_FILE_INTEGRITY",
    signerIdentity: "Velmère Local Integrity Signer",
    signatureAlgorithm: "Ed25519",
    digestAlgorithm: "SHA-256",
    publicKeyPem: getVelmereSigningKeys().publicKeyPem,
    signatureHex: signature.toString("hex"),
    signedDigest: cleanDigest,
    localTimestamp: {
      scheme: "LOCAL_GENERATED_AT",
      generatedAt,
      externalTsa: false,
      externalTimestampVerified: false,
    },
    externalTimestampVerified: false,
    integrityBindingSha256,
    truthBoundary: "Local signature verifies report-digest integrity only. It is not an RFC 3161 timestamp, external TSA receipt, content-correctness attestation, or release authority.",
  };
}

export function verifyReportPki(attestation: ReportPkiAttestation): boolean {
  try {
    if (attestation.attestationType !== "LOCAL_FILE_INTEGRITY") return false;
    if (attestation.externalTimestampVerified !== false) return false;
    const cleanDigest = cleanSha256Digest(attestation.signedDigest);
    const signBuffer = Buffer.from(`VLM-LOCAL-INTEGRITY-V1|SHA-256|${cleanDigest}`, "utf8");
    const signature = Buffer.from(attestation.signatureHex, "hex");
    return crypto.verify(null, signBuffer, attestation.publicKeyPem, signature);
  } catch {
    return false;
  }
}
