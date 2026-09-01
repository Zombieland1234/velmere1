import assert from "node:assert/strict";
import {
  authorizeTrustedProviderIngress,
  createTrustedProviderIngressSignature,
  TRUSTED_PROVIDER_INGRESS_HEADERS,
} from "../../lib/security/trusted-provider-ingress-auth.js";
import {
  PASS4395_DURABLE_IDEMPOTENCY_BOUNDARY,
  type Pass4395DurableIdempotencyReserveResult,
} from "../../lib/security/durable-idempotency-store.js";

const secret = "market-ingress-unit-secret-32-characters-minimum";
const rawBody = JSON.stringify({ assetKey: "BTC", evidenceMode: "trusted_ingress" });
const issuedAt = "2026-07-19T00:00:00.000Z";
const now = new Date("2026-07-19T00:00:30.000Z");
const nonce = "provider_nonce_1234567890";
const pathname = "/api/market-integrity/market-intelligence";

function reservation(
  overrides: Partial<Pass4395DurableIdempotencyReserveResult> = {},
): Pass4395DurableIdempotencyReserveResult {
  return {
    passId: "PASS4395_DURABLE_IDEMPOTENCY_RECEIPT",
    ok: true,
    duplicate: false,
    storageMode: "supabase_durable",
    durable: true,
    failClosed: true,
    keyHash: "sha256:nonce",
    valueHash: "sha256:body",
    ttlSeconds: 300,
    boundary: PASS4395_DURABLE_IDEMPOTENCY_BOUNDARY,
    ...overrides,
  };
}

function signedRequest(args: {
  body?: string;
  signedBody?: string;
  requestIssuedAt?: string;
  signedIssuedAt?: string;
  requestNonce?: string;
  signedNonce?: string;
  signature?: string;
} = {}) {
  const body = args.body ?? rawBody;
  const requestIssuedAt = args.requestIssuedAt ?? issuedAt;
  const requestNonce = args.requestNonce ?? nonce;
  const signed = createTrustedProviderIngressSignature({
    secret,
    method: "POST",
    pathname,
    issuedAt: args.signedIssuedAt ?? requestIssuedAt,
    nonce: args.signedNonce ?? requestNonce,
    rawBody: args.signedBody ?? body,
  });
  return new Request(`https://velmere.test${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [TRUSTED_PROVIDER_INGRESS_HEADERS.issuedAt]: requestIssuedAt,
      [TRUSTED_PROVIDER_INGRESS_HEADERS.nonce]: requestNonce,
      [TRUSTED_PROVIDER_INGRESS_HEADERS.signature]: args.signature ?? `sha256=${signed.signature}`,
    },
    body,
  });
}

async function main() {
let reservedInput: { keyHash: string; valueHash: string; ttlSeconds?: number } | null = null;
const accepted = await authorizeTrustedProviderIngress({
  request: signedRequest(),
  rawBody,
  secret,
  now,
  reserveNonce: async (input) => {
    reservedInput = input;
    return reservation();
  },
});
assert.equal(accepted.authorized, true);
if (!accepted.authorized) throw new Error("accepted ingress unexpectedly denied");
assert.equal(accepted.replayProtection.storageMode, "supabase_durable");
assert.match(accepted.bodySha256, /^sha256:[a-f0-9]{64}$/);
const capturedReservation = reservedInput as {
  keyHash: string;
  valueHash: string;
  ttlSeconds?: number;
} | null;
assert.ok(capturedReservation);
assert.match(capturedReservation.keyHash, /^sha256:[a-f0-9]{64}$/);
assert.equal(capturedReservation.valueHash, accepted.bodySha256);
assert.equal(capturedReservation.ttlSeconds, 300);

const tamperedBody = `${rawBody} `;
const tampered = await authorizeTrustedProviderIngress({
  request: signedRequest({ body: tamperedBody, signedBody: rawBody }),
  rawBody: tamperedBody,
  secret,
  now,
  reserveNonce: async () => {
    throw new Error("signature failure must happen before nonce reservation");
  },
});
assert.deepEqual(tampered, {
  authorized: false,
  error: "ingress_signature_invalid",
  status: 401,
  retryable: false,
});

for (const [label, request, expectedError] of [
  [
    "stale timestamp",
    signedRequest({ requestIssuedAt: "2026-07-18T23:55:00.000Z" }),
    "ingress_timestamp_expired",
  ],
  [
    "future timestamp",
    signedRequest({ requestIssuedAt: "2026-07-19T00:01:00.000Z" }),
    "ingress_timestamp_not_yet_valid",
  ],
  [
    "short nonce",
    signedRequest({ requestNonce: "short", signedNonce: "short" }),
    "ingress_nonce_invalid",
  ],
] as const) {
  const result = await authorizeTrustedProviderIngress({
    request,
    rawBody,
    secret,
    now,
    reserveNonce: async () => {
      throw new Error(`${label} must fail before nonce reservation`);
    },
  });
  assert.equal(result.authorized, false, label);
  if (result.authorized) throw new Error(`${label} unexpectedly authorized`);
  assert.equal(result.error, expectedError, label);
}

const replayed = await authorizeTrustedProviderIngress({
  request: signedRequest(),
  rawBody,
  secret,
  now,
  reserveNonce: async () => reservation({ ok: false, duplicate: true }),
});
assert.deepEqual(replayed, {
  authorized: false,
  error: "ingress_nonce_replayed",
  status: 409,
  retryable: false,
});

const storeOutage = await authorizeTrustedProviderIngress({
  request: signedRequest(),
  rawBody,
  secret,
  now,
  reserveNonce: async () => reservation({
    ok: false,
    duplicate: false,
    storageMode: "durable_write_failed",
    durable: false,
  }),
});
assert.deepEqual(storeOutage, {
  authorized: false,
  error: "ingress_nonce_store_unavailable",
  status: 503,
  retryable: true,
});

console.log("PASS trusted provider ingress is body/time/nonce bound and replay-safe");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
