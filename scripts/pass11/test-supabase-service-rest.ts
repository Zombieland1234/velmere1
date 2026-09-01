import assert from "node:assert/strict";
import {
  getSupabaseServiceRestConfig,
  supabaseServiceRestRequest,
} from "../../lib/db/supabase-service-rest";
import { withPass4825BrokeredEgressTestTransport } from "../../lib/network/brokered-egress";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  SUPABASE_URL: process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
let assertions = 0;
function equal<T>(actual: T, expected: T, message: string) {
  assertions += 1;
  assert.equal(actual, expected, message);
}
function check(value: unknown, message: string): asserts value {
  assertions += 1;
  assert.ok(value, message);
}

function restore() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function main() {
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  equal(getSupabaseServiceRestConfig(), null, "missing credentials must disable service REST");
  equal(await supabaseServiceRestRequest("/x"), null, "disabled adapter must not perform a request");

  process.env.NODE_ENV = "production";
  process.env.SUPABASE_URL = "http://insecure.example";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-secret";
  equal(getSupabaseServiceRestConfig(), null, "production must reject non-HTTPS Supabase URL");

  process.env.SUPABASE_URL = "https://project.supabase.co/?ignored=1#fragment";
  equal(getSupabaseServiceRestConfig(), null, "service REST must reject configured origins with query or fragment");
  process.env.SUPABASE_URL = "https://project.supabase.co/";
  const calls: Array<{ url: string; init: RequestInit; operation: string }> = [];
  const response = await withPass4825BrokeredEgressTestTransport(
    async (url, init, context) => {
      calls.push({ url: String(url), init, operation: context.operation });
      return new Response(null, { status: 204 });
    },
    () => supabaseServiceRestRequest("velmere_test?select=id", {
      method: "POST",
      headers: { Prefer: "return=minimal", authorization: "attacker-value" },
      body: "{}",
      cache: "force-cache",
    }, 200),
  );
  equal(response?.status, 204, "successful REST response must propagate");
  equal(calls.length, 1, "adapter must call fetch once");
  equal(calls[0]?.url, "https://project.supabase.co/rest/v1/velmere_test?select=id", "adapter must normalize the Supabase URL and REST path");
  const headers = new Headers(calls[0]?.init.headers);
  equal(headers.get("apikey"), "service-secret", "service key must be attached as apikey");
  equal(headers.get("authorization"), "Bearer service-secret", "caller must not override service authorization");
  equal(headers.get("content-type"), "application/json", "JSON body must receive content type");
  equal(calls[0]?.init.cache, "no-store", "service REST must never use a response cache");
  check(calls[0]?.init.signal instanceof AbortSignal, "request must carry a bounded abort signal");

  const deleteResponse = await withPass4825BrokeredEgressTestTransport(
    async (url, init, context) => {
      calls.push({ url: String(url), init, operation: context.operation });
      return new Response(null, { status: 204 });
    },
    () => supabaseServiceRestRequest(
      "velmere_angel_memories?session_hash=eq.account-bound-hash",
      {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      },
      200,
    ),
  );
  equal(deleteResponse?.status, 204, "service REST DELETE response must propagate");
  equal(calls.length, 2, "DELETE must use exactly one additional brokered request");
  equal(
    calls[1]?.url,
    "https://project.supabase.co/rest/v1/velmere_angel_memories?session_hash=eq.account-bound-hash",
    "DELETE must preserve the bounded PostgREST filter",
  );
  equal(calls[1]?.init.method, "DELETE", "DELETE must reach the configured Supabase origin as DELETE");
  const deleteHeaders = new Headers(calls[1]?.init.headers);
  equal(deleteHeaders.get("prefer"), "return=minimal", "DELETE must request a minimal response");
  equal(deleteHeaders.get("apikey"), "service-secret", "DELETE must attach the service apikey");
  equal(deleteHeaders.get("authorization"), "Bearer service-secret", "DELETE must use server-controlled authorization");
  equal(calls[1]?.init.body, undefined, "DELETE must not send an accidental request body");
  equal(calls[1]?.init.cache, "no-store", "DELETE must remain non-cacheable");
  check(calls[1]?.init.signal instanceof AbortSignal, "DELETE must carry a bounded abort signal");

  let timeoutSignal: AbortSignal | undefined;
  await assert.rejects(
    () => withPass4825BrokeredEgressTestTransport(
      async (_url, init) => {
        timeoutSignal = init.signal ?? undefined;
        return new Promise<Response>((_resolve, reject) => {
          timeoutSignal?.addEventListener("abort", () => reject(timeoutSignal?.reason), { once: true });
        });
      },
      () => supabaseServiceRestRequest("/timeout", {}, 50),
    ),
    /supabase_service_rest_timeout|aborted/i,
    "hung provider request must be aborted",
  );
  assertions += 1;
  check(timeoutSignal?.aborted, "timeout signal must be aborted");

  console.log(JSON.stringify({
    ok: true,
    passId: "pass11-supabase-service-rest-v1",
    assertions,
    productionHttpsRequired: true,
    boundedTimeout: true,
    serviceCredentialOverrideBlocked: true,
  }, null, 2));
}

main().finally(restore).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
