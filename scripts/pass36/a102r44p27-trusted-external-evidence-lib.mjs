#!/usr/bin/env node
import crypto from "node:crypto";

const SHA256 = /^[a-f0-9]{64}$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;
const SECRET = /(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{12,}|whsec_[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._~+/=-]{12,}|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/iu;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const ENVELOPE_KEYS = new Set([
  "schemaVersion",
  "evidenceId",
  "revisionId",
  "sourceManifestSha256",
  "environmentClass",
  "observedAt",
  "expiresAt",
  "nonce",
  "payloadSha256",
  "claims",
  "signature",
]);
const SIGNATURE_KEYS = new Set(["algorithm", "keyId", "signatureBase64"]);

function ensure(condition, code) {
  if (!condition) throw new Error(code);
}

function canonicalInternal(value, seen) {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
    case "boolean":
      return JSON.stringify(value);
    case "number":
      ensure(Number.isFinite(value), "canonical_non_finite_number");
      return JSON.stringify(value);
    case "object": {
      ensure(!seen.has(value), "canonical_cycle");
      seen.add(value);
      try {
        if (Array.isArray(value)) {
          return `[${value.map((item) => canonicalInternal(item, seen)).join(",")}]`;
        }
        const prototype = Object.getPrototypeOf(value);
        ensure(prototype === Object.prototype || prototype === null, "canonical_non_plain_object");
        const keys = Object.keys(value).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
        for (const key of keys) ensure(!FORBIDDEN_KEYS.has(key), `canonical_forbidden_key:${key}`);
        return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalInternal(value[key], seen)}`).join(",")}}`;
      } finally {
        seen.delete(value);
      }
    }
    default:
      throw new Error(`canonical_unsupported_type:${typeof value}`);
  }
}

export function canonical(value) {
  return canonicalInternal(value, new Set());
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactKeys(object, allowed) {
  if (!object || typeof object !== "object" || Array.isArray(object)) return false;
  const keys = Object.keys(object);
  return keys.length === allowed.size && keys.every((key) => allowed.has(key));
}

function strictBase64(value, expectedBytes = null) {
  if (typeof value !== "string" || value.length === 0 || value.length > 16384) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(value) || value.length % 4 !== 0) return null;
  try {
    const bytes = Buffer.from(value, "base64");
    if (bytes.toString("base64") !== value) return null;
    if (expectedBytes !== null && bytes.length !== expectedBytes) return null;
    return bytes;
  } catch {
    return null;
  }
}

function validateTrustPolicy(trustPolicy) {
  const keys = Array.isArray(trustPolicy?.productionTrustedKeys) ? trustPolicy.productionTrustedKeys : [];
  const ids = keys.map((row) => row?.keyId);
  const checks = {
    object: Boolean(trustPolicy && typeof trustPolicy === "object" && !Array.isArray(trustPolicy)),
    algorithm: trustPolicy?.requiredAlgorithm === "Ed25519",
    embeddedAuthorityForbidden: trustPolicy?.allowEmbeddedPublicKeyAuthority === false,
    uniqueKeyIds: ids.every((id) => typeof id === "string" && IDENTIFIER.test(id)) && new Set(ids).size === ids.length,
    keyRows: keys.every((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return false;
      const spki = strictBase64(row.publicKeySpkiDerBase64);
      return row.algorithm === "Ed25519"
        && IDENTIFIER.test(row.keyId ?? "")
        && Boolean(spki)
        && SHA256.test(row.spkiSha256 ?? "")
        && sha256(spki) === row.spkiSha256
        && Number.isFinite(Date.parse(row.validFrom ?? ""))
        && Number.isFinite(Date.parse(row.expiresAt ?? ""))
        && typeof row.revoked === "boolean";
    }),
  };
  return { keys, checks, ok: Object.values(checks).every(Boolean) };
}

export function publicKeyRecord({
  keyId,
  publicKey,
  validFrom = "2026-01-01T00:00:00.000Z",
  expiresAt = "2027-01-01T00:00:00.000Z",
  revoked = false,
}) {
  const spki = publicKey.export({ type: "spki", format: "der" });
  return {
    keyId,
    algorithm: "Ed25519",
    publicKeySpkiDerBase64: spki.toString("base64"),
    spkiSha256: sha256(spki),
    validFrom,
    expiresAt,
    revoked,
  };
}

export function createEnvelope({
  claims,
  privateKey,
  keyId,
  revisionId,
  sourceManifestSha256,
  evidenceId = "r44p27-evidence-0001",
  nonce = "nonce-r44p27-0001",
  observedAt = new Date().toISOString(),
  expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(),
}) {
  const payloadSha256 = sha256(canonical(claims));
  const signed = {
    schemaVersion: "velmere.pass36.a102r44p27.external-staging-evidence.v1",
    evidenceId,
    revisionId,
    sourceManifestSha256,
    environmentClass: "DISPOSABLE_TEST",
    observedAt,
    expiresAt,
    nonce,
    payloadSha256,
    claims,
  };
  const signatureBase64 = crypto.sign(null, Buffer.from(canonical(signed)), privateKey).toString("base64");
  return {
    ...signed,
    signature: {
      algorithm: "Ed25519",
      keyId,
      signatureBase64,
    },
  };
}

export function verifyTrustedEnvelope(envelope, {
  expectedRevisionId,
  expectedSourceManifestSha256,
  trustPolicy,
  now = new Date(),
  maxAgeMs = 10 * 60 * 1000,
  maximumEnvelopeLifetimeMs = 10 * 60 * 1000,
  seenEvidenceIds = new Set(),
  seenNonces = new Set(),
} = {}) {
  const checks = [];
  const add = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
  const policyResult = validateTrustPolicy(trustPolicy);
  add("trust-policy-object", policyResult.checks.object);
  add("trust-policy-algorithm", policyResult.checks.algorithm);
  add("trust-policy-embedded-authority-forbidden", policyResult.checks.embeddedAuthorityForbidden);
  add("trust-policy-unique-key-ids", policyResult.checks.uniqueKeyIds);
  add("trust-policy-key-rows", policyResult.checks.keyRows);
  add("object", Boolean(envelope && typeof envelope === "object" && !Array.isArray(envelope)));
  add("exact-envelope-keys", exactKeys(envelope, ENVELOPE_KEYS));
  add("schema", envelope?.schemaVersion === "velmere.pass36.a102r44p27.external-staging-evidence.v1");
  add("evidence-id", IDENTIFIER.test(envelope?.evidenceId ?? ""));
  add("revision", envelope?.revisionId === expectedRevisionId);
  add("source", SHA256.test(envelope?.sourceManifestSha256 ?? "") && envelope?.sourceManifestSha256 === expectedSourceManifestSha256);
  add("environment", envelope?.environmentClass === "DISPOSABLE_TEST");
  add("nonce", IDENTIFIER.test(envelope?.nonce ?? ""));
  add("evidence-not-replayed", !seenEvidenceIds.has(envelope?.evidenceId));
  add("nonce-not-replayed", !seenNonces.has(envelope?.nonce));

  const observed = Date.parse(envelope?.observedAt ?? "");
  const expires = Date.parse(envelope?.expiresAt ?? "");
  const nowMs = now.getTime();
  add("observed-time", Number.isFinite(observed));
  add("expires-time", Number.isFinite(expires));
  add("timeline-order", Number.isFinite(observed) && Number.isFinite(expires) && expires > observed);
  add("lifetime-bounded", Number.isFinite(observed) && Number.isFinite(expires) && expires - observed <= maximumEnvelopeLifetimeMs);
  add("not-future", Number.isFinite(observed) && observed <= nowMs + 30_000);
  add("fresh", Number.isFinite(observed) && nowMs - observed <= maxAgeMs);
  add("not-expired", Number.isFinite(expires) && expires > nowMs);

  const canonicalClaims = (() => {
    try { return canonical(envelope?.claims); } catch { return null; }
  })();
  add("claims-object", Boolean(envelope?.claims && typeof envelope.claims === "object" && !Array.isArray(envelope.claims)));
  add("claims-canonical", canonicalClaims !== null);
  add("no-secrets", canonicalClaims !== null && !SECRET.test(canonicalClaims));
  add("payload-digest", canonicalClaims !== null && envelope?.payloadSha256 === sha256(canonicalClaims));

  add("signature-object", Boolean(envelope?.signature && typeof envelope.signature === "object" && !Array.isArray(envelope.signature)));
  add("exact-signature-keys", exactKeys(envelope?.signature, SIGNATURE_KEYS));
  add("signature-algorithm", envelope?.signature?.algorithm === "Ed25519");
  add("no-embedded-public-key", !("publicKeySpkiDerBase64" in (envelope?.signature ?? {})));
  const signatureBytes = strictBase64(envelope?.signature?.signatureBase64, 64);
  add("signature-base64", Boolean(signatureBytes));

  const key = policyResult.keys.find((row) => row?.keyId === envelope?.signature?.keyId);
  add("trusted-key-present", Boolean(key));
  let keyActiveNow = false;
  let keyActiveAtObservation = false;
  let keyHashOk = false;
  let signatureOk = false;
  if (key && policyResult.ok) {
    const validFrom = Date.parse(key.validFrom ?? "");
    const validUntil = Date.parse(key.expiresAt ?? "");
    keyActiveNow = !key.revoked && validFrom <= nowMs && validUntil > nowMs;
    keyActiveAtObservation = !key.revoked && Number.isFinite(observed) && validFrom <= observed && validUntil > observed;
    try {
      const spki = strictBase64(key.publicKeySpkiDerBase64);
      keyHashOk = Boolean(spki) && SHA256.test(key.spkiSha256 ?? "") && sha256(spki) === key.spkiSha256;
      if (spki && signatureBytes) {
        const publicKey = crypto.createPublicKey({ key: spki, type: "spki", format: "der" });
        const { signature, ...signed } = envelope;
        signatureOk = keyHashOk && crypto.verify(null, Buffer.from(canonical(signed)), publicKey, signatureBytes);
      }
    } catch {
      keyHashOk = false;
      signatureOk = false;
    }
  }
  add("trusted-key-active-now", keyActiveNow);
  add("trusted-key-active-at-observation", keyActiveAtObservation);
  add("trusted-key-hash", keyHashOk);
  add("signature", signatureOk);

  const failed = checks.filter((row) => !row.ok);
  return {
    schemaVersion: "velmere.pass36.a102r44p27.trusted-external-evidence-verification.v1",
    status: failed.length === 0
      ? "PASS_TRUSTED_SIGNATURE_REQUIRES_SEMANTIC_ARTIFACT_AND_DURABLE_REPLAY_ADMISSION"
      : "REJECTED_FAIL_CLOSED",
    checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    rows: checks,
    cryptographicTrustEstablished: failed.length === 0,
    verifiedDenominatorIncrement: 0,
    stagingCredit: false,
    saleCredit: false,
    liveCredit: false,
  };
}
