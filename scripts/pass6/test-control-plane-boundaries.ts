import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { POST as cspReportPost } from "@/lib/server/security-route-modules/csp-report";
import { GET as providerOperationsGet } from "../../app/api/internal/providers/observation-operations/route";
import { readCurrentConsolidatedRoute } from "../lib/current-route-contract";
import { GET as computationOperationsGet } from "@/lib/server/internal-worker-route-modules/durable-computation-operations";
import { GET as computationPromotionGet } from "@/lib/server/internal-worker-route-modules/durable-computation-promotion";
import { authorizeMarketIntegrityCron } from "../../lib/security/market-integrity-cron-auth";

function chunkedBody(totalBytes: number) {
  const chunk = new Uint8Array(4_096).fill(0x20);
  let sent = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= totalBytes) {
        controller.close();
        return;
      }
      const size = Math.min(chunk.byteLength, totalBytes - sent);
      controller.enqueue(chunk.slice(0, size));
      sent += size;
    },
  });
}

async function main() {
  const saved = {
    nodeEnv: process.env.NODE_ENV,
    cronSecret: process.env.MARKET_INTEGRITY_CRON_SECRET,
    scopedCurrent: process.env.VELMERE_WORKER_INTERNAL_PROVIDERS_OBSERVATION_OPERATIONS_SECRET_CURRENT,
    scopedPrevious: process.env.VELMERE_WORKER_INTERNAL_PROVIDERS_OBSERVATION_OPERATIONS_SECRET_PREVIOUS,
    allowLegacy: process.env.VELMERE_ALLOW_LEGACY_GLOBAL_CRON_SECRET,
  };
  try {
    process.env.NODE_ENV = "test";
    process.env.MARKET_INTEGRITY_CRON_SECRET = "pass6-control-plane-cron-secret-1234567890";

    const oversized = await cspReportPost(new Request("https://velmere.test/api/security/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body: chunkedBody(16 * 1_024 + 1),
      duplex: "half",
    } as RequestInit & { duplex: "half" }));
    assert.equal(oversized.status, 413);

    const compressed = await cspReportPost(new Request("https://velmere.test/api/security/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report", "content-encoding": "gzip" },
      body: "{}",
    }));
    assert.equal(compressed.status, 415);

    const auth = { authorization: `Bearer ${process.env.MARKET_INTEGRITY_CRON_SECRET}` };
    const providerGetMutation = await providerOperationsGet(new Request("https://velmere.test/api/internal/providers/observation-operations?action=run", { headers: auth }));
    assert.equal(providerGetMutation.status, 405);
    const computationGetMutation = await computationOperationsGet(new Request("https://velmere.test/api/internal/workers/durable-computation-operations?action=run", { headers: auth }));
    assert.equal(computationGetMutation.status, 405);
    const promotionGetMutation = await computationPromotionGet(new Request("https://velmere.test/api/internal/workers/durable-computation-promotion?action=reconcile_alerts", { headers: auth }));
    assert.equal(promotionGetMutation.status, 405);

    const migration = readFileSync("supabase/migrations/20260718000002_4991_operator_nonce_and_square_rls.sql", "utf8");
    const schema = readFileSync("lib/db/schema.sql", "utf8");
    assert.match(migration, /drop policy if exists "Public can read visible Velmere Square comments"/);
    assert.match(migration, /using \(moderation_status = 'approved'\)/);
    assert.doesNotMatch(schema.slice(0, 4_000), /using \(moderation_status in \('approved', 'pending'\)\)/);
    assert.match(migration, /create table if not exists public\.velmere_idempotency_keys/);
    assert.match(migration, /revoke all on table public\.velmere_idempotency_keys from public, anon, authenticated/);
    assert.deepEqual(JSON.parse(readFileSync("vercel.json", "utf8")).crons, []);

    process.env.NODE_ENV = "production";
    delete process.env.VELMERE_ALLOW_LEGACY_GLOBAL_CRON_SECRET;
    delete process.env.VELMERE_WORKER_INTERNAL_PROVIDERS_OBSERVATION_OPERATIONS_SECRET_CURRENT;
    delete process.env.VELMERE_WORKER_INTERNAL_PROVIDERS_OBSERVATION_OPERATIONS_SECRET_PREVIOUS;
    const workerUrl = "https://velmere.test/api/internal/providers/observation-operations";
    const globalOnly = authorizeMarketIntegrityCron(new Request(workerUrl, { headers: auth }));
    assert.equal(globalOnly.reason, "missing_secret");
    const currentSecret = "pass6-scoped-worker-current-secret-1234567890";
    const previousSecret = "pass6-scoped-worker-previous-secret-123456789";
    process.env.VELMERE_WORKER_INTERNAL_PROVIDERS_OBSERVATION_OPERATIONS_SECRET_CURRENT = currentSecret;
    process.env.VELMERE_WORKER_INTERNAL_PROVIDERS_OBSERVATION_OPERATIONS_SECRET_PREVIOUS = previousSecret;
    const currentAuth = authorizeMarketIntegrityCron(new Request(workerUrl, { headers: { authorization: `Bearer ${currentSecret}` } }));
    assert.equal(currentAuth.authorized, true);
    assert.equal(currentAuth.keyId, "current");
    const previousAuth = authorizeMarketIntegrityCron(new Request(workerUrl, { headers: { authorization: `Bearer ${previousSecret}` } }));
    assert.equal(previousAuth.authorized, true);
    assert.equal(previousAuth.keyId, "previous");

    const currentMutationSources = [
      ["/api/security/csp-report", readCurrentConsolidatedRoute("/api/security/csp-report").handlerSource],
      ["/api/internal/providers/observation-operations", readFileSync("app/api/internal/providers/observation-operations/route.ts", "utf8")],
      ["/api/internal/workers/durable-computation-operations", readCurrentConsolidatedRoute("/api/internal/workers/durable-computation-operations").handlerSource],
      ["/api/internal/workers/durable-computation-promotion", readCurrentConsolidatedRoute("/api/internal/workers/durable-computation-promotion").handlerSource],
    ] as const;
    for (const [publicPath, source] of currentMutationSources) {
      assert.doesNotMatch(source, /await request\.text\(\)/, publicPath);
    }

    console.log(JSON.stringify({
      suite: "PASS6_CONTROL_PLANE_BOUNDARIES",
      status: "PASS",
      assertions: 20,
      streamedOversizeRejected: true,
      compressedBodyRejected: true,
      getMutationsRejected: 3,
      squarePendingPublicReadRemoved: true,
      durableNonceMigrationPresent: true,
      scheduledGetMutationsDisabled: true,
      perRouteWorkerSecretRotation: true,
    }, null, 2));
  } finally {
    if (saved.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.nodeEnv;
    if (saved.cronSecret === undefined) delete process.env.MARKET_INTEGRITY_CRON_SECRET;
    else process.env.MARKET_INTEGRITY_CRON_SECRET = saved.cronSecret;
    if (saved.scopedCurrent === undefined) delete process.env.VELMERE_WORKER_INTERNAL_PROVIDERS_OBSERVATION_OPERATIONS_SECRET_CURRENT;
    else process.env.VELMERE_WORKER_INTERNAL_PROVIDERS_OBSERVATION_OPERATIONS_SECRET_CURRENT = saved.scopedCurrent;
    if (saved.scopedPrevious === undefined) delete process.env.VELMERE_WORKER_INTERNAL_PROVIDERS_OBSERVATION_OPERATIONS_SECRET_PREVIOUS;
    else process.env.VELMERE_WORKER_INTERNAL_PROVIDERS_OBSERVATION_OPERATIONS_SECRET_PREVIOUS = saved.scopedPrevious;
    if (saved.allowLegacy === undefined) delete process.env.VELMERE_ALLOW_LEGACY_GLOBAL_CRON_SECRET;
    else process.env.VELMERE_ALLOW_LEGACY_GLOBAL_CRON_SECRET = saved.allowLegacy;
  }
}

void main();
