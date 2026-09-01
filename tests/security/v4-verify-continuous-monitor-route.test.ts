import assert from "node:assert/strict";

import { GET, POST } from "@/lib/server/internal-worker-route-modules/verify-continuous-monitor";
import { issueMarketIntegrityWorkerMutationEnvelope } from "@/lib/security/market-integrity-cron-auth";

const path = "/api/internal/workers/verify-continuous-monitor";
const url = `http://localhost${path}`;
const scopeSecretName = "VELMERE_WORKER_INTERNAL_WORKERS_VERIFY_CONTINUOUS_MONITOR_SECRET_CURRENT";
const original = {
  vercel: process.env.VERCEL_ENV,
  secret: process.env[scopeSecretName],
  cronSecret: process.env.CRON_SECRET,
};

async function main() {
  try {
    process.env.VERCEL_ENV = "production";
    delete process.env[scopeSecretName];
    delete process.env.CRON_SECRET;
    const unauthorizedCron = await GET(new Request(url));
    assert.equal(unauthorizedCron.status, 401);
    assert.equal((await unauthorizedCron.json()).error, "unauthorized_worker");

    const secret = "verify-monitor-worker-route-secret-current-0001";
    process.env[scopeSecretName] = secret;
    const cronSecret = "verify-monitor-vercel-cron-secret-current-0001";
    process.env.CRON_SECRET = cronSecret;
    const authorizedCron = await GET(new Request(url, {
      headers: { authorization: `Bearer ${cronSecret}` },
    }));
    assert.equal(authorizedCron.status, 503, "authorized cron fails closed without durable DB configuration");
    const cronBody = await authorizedCron.json() as Record<string, unknown>;
    assert.equal(cronBody.ok, false);
    assert.equal(authorizedCron.headers.get("cache-control"), "no-store");
    assert.equal(authorizedCron.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");

    const queryDenied = await GET(new Request(`${url}?limit=5`, {
      headers: { authorization: `Bearer ${cronSecret}` },
    }));
    assert.equal(queryDenied.status, 400);
    assert.equal((await queryDenied.json()).error, "worker_query_not_supported");

    const unsigned = await POST(new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "run" }),
    }));
    assert.equal(unsigned.status, 401);
    assert.equal((await unsigned.json()).error, "unauthorized_worker_mutation");

    process.env.VERCEL_ENV = "preview";
    const rawBody = JSON.stringify({ action: "run", unexpected: true });
    const issued = issueMarketIntegrityWorkerMutationEnvelope({
      secret,
      keyId: "current",
      path,
      rawBody,
      nonce: "verify-monitor-route-nonce-0001",
    });
    const signedHeaders = {
      "content-type": "application/json",
      ...issued.headers,
    };
    const unknownField = await POST(new Request(url, {
      method: "POST",
      headers: signedHeaders,
      body: rawBody,
    }));
    assert.equal(unknownField.status, 400);
    assert.equal((await unknownField.json()).error, "worker_body_unknown_fields");

    const replay = await POST(new Request(url, {
      method: "POST",
      headers: signedHeaders,
      body: rawBody,
    }));
    assert.equal(replay.status, 409);
    const replayBody = await replay.json() as Record<string, unknown>;
    assert.equal(replayBody.reason, "worker_envelope_nonce_replayed");

    const bodyBound = JSON.stringify({ action: "run", limit: 1 });
    const tampered = await POST(new Request(url, {
      method: "POST",
      headers: signedHeaders,
      body: bodyBound,
    }));
    assert.equal(tampered.status, 401);
    assert.equal((await tampered.json()).reason, "worker_envelope_body_binding_mismatch");

    console.log("V4 Verify continuous monitor route boundary: PASS");
  } finally {
    if (original.vercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = original.vercel;
    if (original.secret === undefined) delete process.env[scopeSecretName];
    else process.env[scopeSecretName] = original.secret;
    if (original.cronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original.cronSecret;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
