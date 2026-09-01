import assert from "node:assert/strict";
import {
  authorizeMarketIntegrityCron,
  authorizeMarketIntegrityWorkerMutation,
  issueMarketIntegrityWorkerMutationEnvelope,
  verifyMarketIntegrityWorkerMutationEnvelope,
} from "../../lib/security/market-integrity-cron-auth";
import { POST as providerOperationsPost } from "../../app/api/internal/providers/observation-operations/route";
import {
  GET as internalWorkerDispatchGet,
  OPTIONS as internalWorkerDispatchOptions,
} from "../../app/api/internal/workers/[worker]/route";
import { POST as authSecurityAlertsPost } from "@/lib/server/internal-worker-route-modules/auth-security-alerts";
import { POST as computationOperationsPost } from "@/lib/server/internal-worker-route-modules/durable-computation-operations";
import { POST as computationPromotionPost } from "@/lib/server/internal-worker-route-modules/durable-computation-promotion";
import { POST as durableComputationAlertsPost } from "@/lib/server/internal-worker-route-modules/durable-computation-alerts";
import { POST as fulfilmentIncidentOutboxPost } from "@/lib/server/internal-worker-route-modules/fulfilment-incident-outbox";
import { POST as fulfilmentProviderSyncPost } from "@/lib/server/internal-worker-route-modules/fulfilment-provider-sync";
import { POST as stripeWebhookReconciliationPost } from "@/lib/server/internal-worker-route-modules/stripe-webhook-reconciliation";

const PROVIDER_PATH = "/api/internal/providers/observation-operations";
const PROVIDER_SCOPE = "INTERNAL_PROVIDERS_OBSERVATION_OPERATIONS";
const PROVIDER_CURRENT_ENV = `VELMERE_WORKER_${PROVIDER_SCOPE}_SECRET_CURRENT`;
const PROVIDER_PREVIOUS_ENV = `VELMERE_WORKER_${PROVIDER_SCOPE}_SECRET_PREVIOUS`;
const OPERATIONS_CURRENT_ENV = "VELMERE_WORKER_INTERNAL_WORKERS_DURABLE_COMPUTATION_OPERATIONS_SECRET_CURRENT";
const PROMOTION_CURRENT_ENV = "VELMERE_WORKER_INTERNAL_WORKERS_DURABLE_COMPUTATION_PROMOTION_SECRET_CURRENT";
const CURRENT_SECRET = "pass6-worker-envelope-current-secret-1234567890";
const PREVIOUS_SECRET = "pass6-worker-envelope-previous-secret-123456789";
const OPERATIONS_SECRET = "pass6-worker-envelope-operations-secret-123456789";
const PROMOTION_SECRET = "pass6-worker-envelope-promotion-secret-123456789";
const INTERNAL_WORKER_BODY_SECRET = "pass6-internal-worker-body-boundary-secret-123456789";

const helperBoundWorkerRoutes = [
  {
    path: "/api/internal/workers/auth-security-alerts",
    post: authSecurityAlertsPost,
    nonce: "pass6-body-auth-alerts-nonce-0020",
  },
  {
    path: "/api/internal/workers/durable-computation-alerts",
    post: durableComputationAlertsPost,
    nonce: "pass6-body-computation-alerts-nonce-0021",
  },
  {
    path: "/api/internal/workers/fulfilment-incident-outbox",
    post: fulfilmentIncidentOutboxPost,
    nonce: "pass6-body-incident-outbox-nonce-0022",
  },
  {
    path: "/api/internal/workers/fulfilment-provider-sync",
    post: fulfilmentProviderSyncPost,
    nonce: "pass6-body-provider-sync-nonce-0023",
  },
  {
    path: "/api/internal/workers/stripe-webhook-reconciliation",
    post: stripeWebhookReconciliationPost,
    nonce: "pass6-body-stripe-reconcile-nonce-0024",
  },
] as const;

const helperBoundWorkerSecretEnvironments = helperBoundWorkerRoutes.map(
  ({ path }) => `VELMERE_WORKER_${path
    .replace(/^\/api\//u, "")
    .replace(/[^a-zA-Z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .toUpperCase()}_SECRET_CURRENT`,
);

const touchedEnvironment = [
  "NODE_ENV",
  "VERCEL_ENV",
  PROVIDER_CURRENT_ENV,
  PROVIDER_PREVIOUS_ENV,
  OPERATIONS_CURRENT_ENV,
  PROMOTION_CURRENT_ENV,
  ...helperBoundWorkerSecretEnvironments,
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VELMERE_DURABLE_IDEMPOTENCY_REQUIRED",
  "VELMERE_IDEMPOTENCY_FAIL_CLOSED",
] as const;

function request(rawBody: string, headers: Record<string, string>, path = PROVIDER_PATH) {
  return new Request(`https://velmere.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: rawBody,
  });
}

async function main() {
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  const saved = new Map(touchedEnvironment.map((name) => [name, process.env[name]]));
  let assertions = 0;
  const ok = (condition: unknown, message: string) => {
    assert.ok(condition, message);
    assertions += 1;
  };
  const equal = (actual: unknown, expected: unknown, message: string) => {
    assert.equal(actual, expected, message);
    assertions += 1;
  };

  try {
    mutableEnvironment.NODE_ENV = "test";
    delete process.env.VERCEL_ENV;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.VELMERE_DURABLE_IDEMPOTENCY_REQUIRED;
    delete process.env.VELMERE_IDEMPOTENCY_FAIL_CLOSED;
    process.env[PROVIDER_CURRENT_ENV] = CURRENT_SECRET;
    process.env[PROVIDER_PREVIOUS_ENV] = PREVIOUS_SECRET;
    process.env[OPERATIONS_CURRENT_ENV] = OPERATIONS_SECRET;
    process.env[PROMOTION_CURRENT_ENV] = PROMOTION_SECRET;
    for (const environmentName of helperBoundWorkerSecretEnvironments) {
      process.env[environmentName] = INTERNAL_WORKER_BODY_SECRET;
    }

    const now = new Date("2026-07-18T12:00:00.000Z");
    const currentBody = JSON.stringify({ action: "run", retentionLimit: 96 });
    const current = issueMarketIntegrityWorkerMutationEnvelope({
      secret: CURRENT_SECRET,
      keyId: "current",
      path: PROVIDER_PATH,
      rawBody: currentBody,
      nonce: "pass6-worker-current-nonce-0001",
      issuedAt: now,
      expiresInSeconds: 120,
    });
    const currentRequest = request(currentBody, current.headers);
    const currentVerified = verifyMarketIntegrityWorkerMutationEnvelope({ request: currentRequest, rawBody: currentBody, now });
    ok(currentVerified.authorized, "current key envelope must verify");
    if (currentVerified.authorized) equal(currentVerified.keyId, "current", "current key id must stay bound");

    const currentConsumed = await authorizeMarketIntegrityWorkerMutation({ request: currentRequest, rawBody: currentBody, now });
    ok(currentConsumed.authorized, "fresh current-key nonce must be reserved before mutation");
    if (currentConsumed.authorized) {
      equal(currentConsumed.replayProtection.storageMode, "memory_runtime_only", "tests use only the explicit non-production memory fallback");
    }
    const replayed = await authorizeMarketIntegrityWorkerMutation({ request: currentRequest, rawBody: currentBody, now });
    ok(!replayed.authorized && replayed.error === "worker_envelope_nonce_replayed", "same nonce must be rejected atomically");
    const crossKeyReplayEnvelope = issueMarketIntegrityWorkerMutationEnvelope({
      secret: PREVIOUS_SECRET,
      keyId: "previous",
      path: PROVIDER_PATH,
      rawBody: currentBody,
      nonce: "pass6-worker-current-nonce-0001",
      issuedAt: now,
    });
    const crossKeyReplay = await authorizeMarketIntegrityWorkerMutation({
      request: request(currentBody, crossKeyReplayEnvelope.headers),
      rawBody: currentBody,
      now,
    });
    ok(!crossKeyReplay.authorized && crossKeyReplay.error === "worker_envelope_nonce_replayed", "rotation key change must not make a nonce reusable");

    const tamperedBody = JSON.stringify({ action: "run", retentionLimit: 97 });
    const tampered = verifyMarketIntegrityWorkerMutationEnvelope({ request: request(tamperedBody, current.headers), rawBody: tamperedBody, now });
    ok(!tampered.authorized && tampered.error === "worker_envelope_body_binding_mismatch", "body mutation must invalidate envelope");

    const expiredIssuedAt = new Date("2026-07-18T11:57:00.000Z");
    const expired = issueMarketIntegrityWorkerMutationEnvelope({
      secret: CURRENT_SECRET,
      keyId: "current",
      path: PROVIDER_PATH,
      rawBody: currentBody,
      nonce: "pass6-worker-expired-nonce-0002",
      issuedAt: expiredIssuedAt,
      expiresInSeconds: 60,
    });
    const expiredVerdict = verifyMarketIntegrityWorkerMutationEnvelope({
      request: request(currentBody, expired.headers),
      rawBody: currentBody,
      now,
    });
    ok(!expiredVerdict.authorized && expiredVerdict.error === "worker_envelope_expired", "expired envelope must fail closed");

    const wrongScope = issueMarketIntegrityWorkerMutationEnvelope({
      secret: CURRENT_SECRET,
      keyId: "current",
      path: PROVIDER_PATH,
      scope: "INTERNAL_WORKERS_DURABLE_COMPUTATION_OPERATIONS",
      rawBody: currentBody,
      nonce: "pass6-worker-wrong-scope-0003",
      issuedAt: now,
    });
    const wrongScopeVerdict = verifyMarketIntegrityWorkerMutationEnvelope({
      request: request(currentBody, wrongScope.headers),
      rawBody: currentBody,
      now,
    });
    ok(!wrongScopeVerdict.authorized && wrongScopeVerdict.error === "worker_envelope_scope_mismatch", "route scope must be signed and exact");

    const previousBody = JSON.stringify({ action: "quarantine_reconcile", maxAssets: 50 });
    const previous = issueMarketIntegrityWorkerMutationEnvelope({
      secret: PREVIOUS_SECRET,
      keyId: "previous",
      path: PROVIDER_PATH,
      rawBody: previousBody,
      nonce: "pass6-worker-previous-nonce-0004",
      issuedAt: now,
    });
    const previousConsumed = await authorizeMarketIntegrityWorkerMutation({
      request: request(previousBody, previous.headers),
      rawBody: previousBody,
      now,
    });
    ok(previousConsumed.authorized && previousConsumed.keyId === "previous", "previous rotation key must work only when explicitly identified");

    assert.throws(
      () => issueMarketIntegrityWorkerMutationEnvelope({
        secret: CURRENT_SECRET,
        keyId: "current",
        path: PROVIDER_PATH,
        rawBody: currentBody,
        nonce: "pass6-worker-invalid-ttl-0005",
        issuedAt: now,
        expiresInSeconds: 301,
      }),
      /worker_envelope_lifetime_invalid/,
    );
    assertions += 1;

    const bearerRead = authorizeMarketIntegrityCron(new Request(`https://velmere.test${PROVIDER_PATH}`, {
      headers: { authorization: `Bearer ${CURRENT_SECRET}` },
    }));
    ok(bearerRead.authorized && bearerRead.keyId === "current", "read-only bearer authentication must remain compatible");

    for (const [path, post, secret, nonce] of [
      [PROVIDER_PATH, providerOperationsPost, CURRENT_SECRET, "pass6-route-provider-nonce-0010"],
      ["/api/internal/workers/durable-computation-operations", computationOperationsPost, OPERATIONS_SECRET, "pass6-route-operations-nonce-0011"],
      ["/api/internal/workers/durable-computation-promotion", computationPromotionPost, PROMOTION_SECRET, "pass6-route-promotion-nonce-0012"],
    ] as const) {
      const unsupportedBody = JSON.stringify({ action: "unsupported" });
      const unsigned = await post(request(unsupportedBody, {}, path));
      equal(unsigned.status, 401, `${path} must reject unsigned POST before mutation`);
      const signed = issueMarketIntegrityWorkerMutationEnvelope({
        secret,
        keyId: "current",
        path,
        rawBody: unsupportedBody,
        nonce,
      });
      const signedResponse = await post(request(unsupportedBody, signed.headers, path));
      equal(signedResponse.status, 400, `${path} must accept a fresh exact envelope and reach action validation`);
    }

    for (const route of helperBoundWorkerRoutes) {
      const worker = route.path.slice("/api/internal/workers/".length);
      const context = { params: Promise.resolve({ worker }) };
      const dispatchedGet = await internalWorkerDispatchGet(
        new Request(`https://velmere.test${route.path}`, { method: "GET" }),
        context,
      );
      equal(dispatchedGet.status, 405, `${route.path} dispatcher must retain the intentional POST-only contract`);
      const dispatchedGetPayload = await dispatchedGet.json() as { error?: unknown };
      equal(dispatchedGetPayload.error, "method_not_allowed", `${route.path} GET must fail closed before loading the worker`);
      equal(dispatchedGet.headers.get("allow"), "POST", `${route.path} GET rejection must not advertise a removed GET method`);

      const dispatchedOptions = await internalWorkerDispatchOptions(
        new Request(`https://velmere.test${route.path}`, { method: "OPTIONS" }),
        context,
      );
      equal(dispatchedOptions.status, 204, `${route.path} OPTIONS must retain explicit method discovery`);
      equal(dispatchedOptions.headers.get("allow"), "POST, OPTIONS", `${route.path} OPTIONS must advertise only POST and OPTIONS`);

      const unsupportedBody = JSON.stringify({ action: "unsupported" });
      const unsigned = await route.post(request(unsupportedBody, {}, route.path));
      equal(unsigned.status, 401, `${route.path} must reject an unsigned bounded body before mutation`);
      const unsignedPayload = await unsigned.json() as { error?: unknown; reason?: unknown };
      equal(unsignedPayload.error, "unauthorized_worker_mutation", `${route.path} unsigned response must use the worker authorization envelope`);
      equal(unsignedPayload.reason, "worker_envelope_missing", `${route.path} unsigned response must disclose only the bounded missing-envelope reason`);

      const signed = issueMarketIntegrityWorkerMutationEnvelope({
        secret: INTERNAL_WORKER_BODY_SECRET,
        keyId: "current",
        path: route.path,
        rawBody: unsupportedBody,
        nonce: route.nonce,
      });
      const signedResponse = await route.post(request(unsupportedBody, signed.headers, route.path));
      equal(signedResponse.status, 400, `${route.path} must accept a fresh exact bounded body and reach action validation`);
      const signedPayload = await signedResponse.json() as { error?: unknown };
      equal(signedPayload.error, "unsupported_action", `${route.path} signed bounded body must reach the route-owned action allowlist`);

      const oversizedBody = JSON.stringify({ action: "unsupported", padding: "x".repeat(17 * 1024) });
      const oversized = await route.post(request(oversizedBody, {}, route.path));
      equal(oversized.status, 413, `${route.path} must reject actual streamed bytes above the 16 KiB limit without Content-Length`);
      const oversizedPayload = await oversized.json() as { error?: unknown; details?: { maxBytes?: unknown } };
      equal(oversizedPayload.error, "Request payload is too large.", `${route.path} oversized response must use the shared stream-reader schema`);
      equal(oversizedPayload.details?.maxBytes, 16 * 1024, `${route.path} oversized response must retain the exact server-owned byte limit`);

      const duplicateKeyBody = '{"action":"unsupported","action":"run"}';
      const duplicateKey = await route.post(request(duplicateKeyBody, {}, route.path));
      equal(duplicateKey.status, 400, `${route.path} must reject duplicate JSON keys before authorization or mutation`);
      const duplicateKeyPayload = await duplicateKey.json() as { error?: unknown; details?: { key?: unknown } };
      equal(duplicateKeyPayload.error, "Duplicate JSON object key.", `${route.path} duplicate-key response must use the strict JSON schema`);
      equal(duplicateKeyPayload.details?.key, "action", `${route.path} duplicate-key response must identify only the rejected key`);
    }

    mutableEnvironment.NODE_ENV = "production";
    const productionBody = JSON.stringify({ action: "run" });
    const production = issueMarketIntegrityWorkerMutationEnvelope({
      secret: CURRENT_SECRET,
      keyId: "current",
      path: PROVIDER_PATH,
      rawBody: productionBody,
      nonce: "pass6-worker-production-nonce-0006",
      issuedAt: now,
    });
    const noDurableStore = await authorizeMarketIntegrityWorkerMutation({
      request: request(productionBody, production.headers),
      rawBody: productionBody,
      now,
    });
    ok(
      !noDurableStore.authorized && noDurableStore.error === "worker_envelope_nonce_store_unavailable",
      "production must fail closed without a durable nonce adapter",
    );

    console.log(JSON.stringify({
      suite: "PASS6_WORKER_MUTATION_ENVELOPE",
      status: "PASS",
      assertions,
      bodyTamperRejected: true,
      replayRejected: true,
      expiredRejected: true,
      wrongScopeRejected: true,
      currentAndPreviousRotationVerified: true,
      productionWithoutDurableStoreRejected: true,
      mutatingPostRoutesProtected: 3 + helperBoundWorkerRoutes.length,
      helperBoundWorkerRoutesBehaviorallyVerified: helperBoundWorkerRoutes.length,
      helperBoundWorkerOversizeBodiesRejected: helperBoundWorkerRoutes.length,
      helperBoundWorkerDuplicateKeysRejected: helperBoundWorkerRoutes.length,
      liveClaimed: false,
    }, null, 2));
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name];
      else mutableEnvironment[name] = value;
    }
  }
}

void main();
