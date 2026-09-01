import assert from "node:assert/strict";
import { withPass4825BrokeredEgressTestTransport } from "../../lib/network/brokered-egress.ts";

type ResponseMode = "success" | "provider_error" | "hang";

type RecordedRequest = {
  url: string;
  method: string;
  headers: Headers;
};

let responseMode: ResponseMode = "success";
const requests: RecordedRequest[] = [];

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  SUPABASE_URL: process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function restoreEnvironment() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

process.env.NODE_ENV = "production";
delete process.env.VERCEL_ENV;
process.env.SUPABASE_URL = "https://angel-memory-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "current-execution-test-service-role-key";
delete process.env.NEXT_PUBLIC_SUPABASE_URL;

try {
  const { clearAngelDurableMemory } = await import("../../lib/ai/angel-durable-memory.ts");

  await withPass4825BrokeredEgressTestTransport(async (url, init) => {
    requests.push({
      url: url.toString(),
      method: (init.method ?? "GET").toUpperCase(),
      headers: new Headers(init.headers),
    });
    if (responseMode === "provider_error") {
      return new Response(JSON.stringify({ message: "synthetic provider detail must stay private" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
    if (responseMode === "hang") {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init.signal;
        if (signal?.aborted) {
          reject(signal.reason);
          return;
        }
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    }
    return new Response(null, { status: 204 });
  }, async () => {
    const invalidInputs = [
      { sessionId: "", accountId: "account-a" },
      { sessionId: "s".repeat(121), accountId: "account-a" },
      { sessionId: "session-a", accountId: "a".repeat(161) },
      { sessionId: "session-a<script>", accountId: "account-a" },
    ];
    for (const input of invalidInputs) {
      const before = requests.length;
      const result = await clearAngelDurableMemory(input);
      assert.equal(result.ok, false);
      assert.equal(result.reason, "invalid_memory_identity");
      assert.equal(requests.length, before, "invalid identities must not reach durable storage");
    }

    responseMode = "provider_error";
    const failed = await clearAngelDurableMemory({ sessionId: "session-a", accountId: "account-a" });
    assert.equal(failed.ok, false);
    assert.equal(failed.reason, "durable_delete_failed");
    assert.equal(failed.mode, "supabase");
    assert(!JSON.stringify(failed).includes("synthetic provider detail"));

    responseMode = "success";
    const firstSuccess = await clearAngelDurableMemory({ sessionId: "session-a", accountId: "account-a" });
    const secondSuccess = await clearAngelDurableMemory({ sessionId: "session-a", accountId: "account-b" });
    assert.equal(firstSuccess.ok, true);
    assert.equal(secondSuccess.ok, true);
    assert.equal(firstSuccess.mode, "supabase");
    assert.equal(secondSuccess.mode, "supabase");

    const successRequests = requests.slice(-2);
    assert.equal(successRequests.length, 2);
    assert.notEqual(successRequests[0]?.url, successRequests[1]?.url, "account binding must change durable identity");
    for (const request of requests) {
      assert.equal(request.method, "DELETE", "durable memory erasure must use an actual PostgREST DELETE");
      assert.equal(request.headers.get("prefer"), "return=minimal");
      assert.equal(request.headers.get("apikey"), "current-execution-test-service-role-key");
      assert.equal(request.headers.get("authorization"), "Bearer current-execution-test-service-role-key");
      assert(request.url.includes("/rest/v1/velmere_angel_memories?session_hash=eq."));
      assert(!request.url.includes("session-a"));
      assert(!request.url.includes("account-a"));
      assert(!request.url.includes("account-b"));
    }

    responseMode = "hang";
    const startedAt = Date.now();
    const timedOut = await clearAngelDurableMemory({ sessionId: "session-timeout", accountId: "account-a" });
    const elapsedMs = Date.now() - startedAt;
    assert.equal(timedOut.ok, false);
    assert.equal(timedOut.reason, "durable_delete_failed");
    assert(elapsedMs >= 4_000 && elapsedMs < 8_000, `unexpected timeout boundary: ${elapsedMs}ms`);

    process.stdout.write(`${JSON.stringify({
      status: "PASS_ANGEL_DURABLE_MEMORY_DELETE_FAIL_CLOSED",
      assertions: 53,
      productionAdapter: "supabase-service-rest",
      actualMethod: "DELETE",
      providerErrorFailClosed: true,
      timeoutFailClosed: true,
      invalidIdentityNetworkCalls: 0,
      accountBoundHashDistinct: true,
      rawIdentityDisclosure: false,
      rawProviderErrorDisclosure: false,
      elapsedMs,
    }, null, 2)}\n`);
  });
} finally {
  restoreEnvironment();
}
