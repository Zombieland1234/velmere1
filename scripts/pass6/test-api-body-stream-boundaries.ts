import assert from "node:assert/strict";
import { POST as syncPrintfulPost } from "@/lib/server/admin-route-modules/sync-printful";
import { buildVelmereAccountCookie, buildVelmereAccountSession } from "@/lib/auth/account-session";
import { POST as angelStreamPost } from "../../app/api/angel/stream/route";
import { POST as auditSourceQuorumPost } from "@/lib/server/security-route-modules/audit-source-quorum";
import { POST as auditWatchPost } from "@/lib/server/security-route-modules/audit-watch";
import { POST as auditPdfTokenPost } from "../../app/api/security/audit-watch/pro-pdf/token/route";
import { rejectLargeContentLength } from "../../lib/security/api-guard";
import {
  readBoundedBodyBytes,
  rejectUnexpectedRequestBody,
} from "../../lib/security/payment-webhook-guard";
import {
  handleStripeWebhookRequest,
  stripeWebhookIngressDependencies,
  type StripeWebhookIngressDependencies,
} from "../../lib/payments/stripe-webhook/ingress";

const encoder = new TextEncoder();
let assertions = 0;

function check(condition: unknown, message: string): asserts condition {
  assertions += 1;
  assert.ok(condition, message);
}

function equal<T>(actual: T, expected: T, message: string) {
  assertions += 1;
  assert.equal(actual, expected, message);
}

function chunkedRequest(input: {
  path: string;
  chunks: readonly Uint8Array[];
  headers?: HeadersInit;
}) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of input.chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  const request = new Request(`http://localhost${input.path}`, {
    method: "POST",
    headers: input.headers,
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  equal(request.headers.get("content-length"), null, `${input.path} fixture must omit Content-Length`);
  return request;
}


function previewCookie() {
  const session = buildVelmereAccountSession({ provider: "preview", displayName: "Velmère Preview" });
  return buildVelmereAccountCookie(session).split(";", 1)[0] ?? "";
}
function repeatedChunks(totalBytes: number, chunkBytes = 8_192) {
  const chunks: Uint8Array[] = [];
  let remaining = totalBytes;
  while (remaining > 0) {
    const length = Math.min(chunkBytes, remaining);
    chunks.push(new Uint8Array(length).fill(0x78));
    remaining -= length;
  }
  return chunks;
}

function stripeDependencies(capture: { bytes: Uint8Array | null; constructCalls: number }) {
  return {
    ...stripeWebhookIngressDependencies,
    webhookSecret: () => "whsec_stream_boundary_test",
    getSignature: (request: Request) => request.headers.get("stripe-signature"),
    getStripe: () => ({}),
    constructEvent: (_stripe: unknown, bytes: Uint8Array) => {
      capture.constructCalls += 1;
      capture.bytes = bytes.slice();
      return {
        id: "evt_stream_boundary_test",
        type: "velmere.boundary.test",
        created: 1_784_329_200,
        livemode: false,
        data: { object: {} },
      };
    },
    getRuntimeAuthority: () => ({
      requestedMode: "test",
      credentialMode: "test",
      modeMatches: true,
      testPaymentsAllowed: true,
      livePaymentsAllowed: false,
      blockers: [],
    }),
    claimEvent: async () => ({ claimed: false, status: "processed", attempt: 1 }),
    maybeOrderDraftIdFromEvent: () => null,
    orderEventJson: (body: unknown, init: ResponseInit = {}) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { "content-type": "application/json", ...Object.fromEntries(new Headers(init.headers)) },
      }),
    customerWebhookHeaders: () => ({}),
  } as unknown as StripeWebhookIngressDependencies;
}

async function main() {
  const exactRaw = encoder.encode('{  "id" : "evt_exact", "unicode" : "Velmère"  }\n');
  const boundedExact = await readBoundedBodyBytes(chunkedRequest({
    path: "/api/test/bounded-exact",
    chunks: [exactRaw.slice(0, 7), exactRaw.slice(7, 23), exactRaw.slice(23)],
  }), exactRaw.byteLength);
  check(boundedExact.ok, "exact-limit chunked body must be accepted");
  if (boundedExact.ok) {
    equal(boundedExact.byteLength, exactRaw.byteLength, "exact-limit byte count must match");
    check(Buffer.from(boundedExact.bytes).equals(Buffer.from(exactRaw)), "bounded reader must preserve exact raw bytes");
  }

  const directOverflow = await readBoundedBodyBytes(chunkedRequest({
    path: "/api/test/bounded-overflow",
    chunks: repeatedChunks(4_097, 1_024),
  }), 4_096);
  check(!directOverflow.ok, "chunked byte overflow must fail");
  if (!directOverflow.ok) equal(directOverflow.response.status, 413, "chunked byte overflow must return 413");

  const contentLengthOnly = rejectLargeContentLength(chunkedRequest({
    path: "/api/test/content-length-only",
    chunks: repeatedChunks(4_097),
  }), 4_096);
  equal(contentLengthOnly, null, "Content-Length-only guard must not be credited for a headerless stream");

  const emptyBody = await rejectUnexpectedRequestBody(new Request("http://localhost/api/test/no-body", { method: "POST" }));
  equal(emptyBody, null, "body-forbidden route must accept an actually empty request");
  const unexpectedBody = await rejectUnexpectedRequestBody(chunkedRequest({
    path: "/api/test/no-body",
    chunks: [encoder.encode("{}")],
  }));
  equal(unexpectedBody?.status, 413, "body-forbidden route must reject a chunked body");
  equal(unexpectedBody?.headers.get("x-velmere-request-body-policy"), "body-forbidden", "body rejection must be explicit");

  const previousVercelEnvironment = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "production";
    const angelMissingProductionOrigin = await angelStreamPost(chunkedRequest({
      path: "/api/angel/stream",
      chunks: [encoder.encode("{}")],
      headers: { "content-type": "application/json" },
    }));
    equal(angelMissingProductionOrigin.status, 403, "production Angel stream must require an Origin before provider work");

    const auditWatchMissingProductionOrigin = await auditWatchPost(chunkedRequest({
      path: "/api/security/audit-watch",
      chunks: [encoder.encode("{}")],
      headers: { "content-type": "application/json" },
    }));
    equal(auditWatchMissingProductionOrigin.status, 403, "production Audit Watch POST must require an Origin before provider work");
  } finally {
    if (previousVercelEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercelEnvironment;
  }

  const angelOverflow = await angelStreamPost(chunkedRequest({
    path: "/api/angel/stream",
    chunks: repeatedChunks(48 * 1024 + 1, 7_777),
    headers: { "content-type": "application/json", origin: "http://localhost" },
  }));
  equal(angelOverflow.status, 413, "Angel stream must reject chunked payload above 48 KiB before SSE bootstrap");

  const stripeCapture = { bytes: null as Uint8Array | null, constructCalls: 0 };
  const stripeRawResponse = await handleStripeWebhookRequest(chunkedRequest({
    path: "/api/stripe/webhook",
    chunks: [exactRaw.slice(0, 5), exactRaw.slice(5, 29), exactRaw.slice(29)],
    headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=test" },
  }), stripeDependencies(stripeCapture));
  equal(stripeRawResponse.status, 200, "Stripe fixture must reach the idempotent duplicate response");
  equal(stripeCapture.constructCalls, 1, "Stripe signature constructor must run once for an accepted body");
  check(
    stripeCapture.bytes !== null && Buffer.from(stripeCapture.bytes).equals(Buffer.from(exactRaw)),
    "Stripe signature verification must receive the exact streamed raw bytes",
  );

  const stripeOverflowCapture = { bytes: null as Uint8Array | null, constructCalls: 0 };
  const stripeOverflow = await handleStripeWebhookRequest(chunkedRequest({
    path: "/api/stripe/webhook",
    chunks: repeatedChunks(1_000_001, 65_537),
    headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=test" },
  }), stripeDependencies(stripeOverflowCapture));
  equal(stripeOverflow.status, 413, "Stripe webhook must reject a headerless stream above 1,000,000 bytes");
  equal(stripeOverflowCapture.constructCalls, 0, "Stripe must reject overflow before signature construction or event dispatch");

  const auditProviderUnauthenticated = await auditSourceQuorumPost(chunkedRequest({
    path: "/api/security/audit-source-quorum",
    chunks: [encoder.encode("{}")],
    headers: { "content-type": "application/json", origin: "http://localhost" },
  }));
  equal(auditProviderUnauthenticated.status, 401, "cost-bearing audit-provider POST must require an account session");

  const auditProviderOverflow = await auditSourceQuorumPost(chunkedRequest({
    path: "/api/security/audit-source-quorum",
    chunks: repeatedChunks(32_768 + 1, 5_003),
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      cookie: previewCookie(),
    },
  }));
  equal(auditProviderOverflow.status, 413, "shared audit-provider wrapper must reject chunked overflow");

  const auditWatchOverflow = await auditWatchPost(chunkedRequest({
    path: "/api/security/audit-watch",
    chunks: repeatedChunks(256 * 1024 + 1, 31_337),
    headers: { "content-type": "application/json", origin: "http://localhost" },
  }));
  equal(auditWatchOverflow.status, 413, "delegated Audit Watch handler must reject chunked overflow");

  const auditTokenOverflow = await auditPdfTokenPost(chunkedRequest({
    path: "/api/security/audit-watch/pro-pdf/token",
    chunks: repeatedChunks(16 * 1024 + 1, 2_333),
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      cookie: previewCookie(),
    },
  }));
  equal(auditTokenOverflow.status, 413, "paid Audit PDF token route must reject chunked overflow before vault access");

  const adminSyncOverflow = await syncPrintfulPost(chunkedRequest({
    path: "/api/admin/sync-printful",
    chunks: repeatedChunks(256 * 1024 + 1, 32_771),
    headers: { origin: "http://localhost" },
  }));
  equal(adminSyncOverflow.status, 413, "header-driven Printful sync must reject any chunked body before provider access");
  equal(adminSyncOverflow.headers.get("x-velmere-request-body-policy"), "body-forbidden", "Printful rejection must expose the body policy");

  console.log(JSON.stringify({
    ok: true,
    passId: "pass4995-api-body-stream-boundaries-v1",
    assertions,
    chunkedWithoutContentLength: true,
    rawStripeBytesPreserved: true,
    auditProviderAccountAuthRequired: true,
    productionOriginFailClosed: true,
    covered: [
      "shared-byte-reader",
      "body-forbidden-reader",
      "/api/angel/stream",
      "/api/stripe/webhook",
      "/api/security/audit-source-quorum",
      "/api/security/audit-watch",
      "/api/security/audit-watch/pro-pdf/token",
      "/api/admin/sync-printful",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
