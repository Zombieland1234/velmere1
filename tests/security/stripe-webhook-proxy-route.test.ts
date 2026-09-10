import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import Stripe from "stripe";
import { NextRequest } from "next/server";
import proxy from "../../proxy.js";
import { POST as stripeWebhookPost } from "../../app/api/stripe/webhook/route.js";
import {
  stripeWebhookIngressDependencies,
  type StripeWebhookIngressDependencies,
} from "../../lib/payments/stripe-webhook/ingress.js";

const originalDependencies = { ...stripeWebhookIngressDependencies };
const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VELMERE_CANONICAL_ORIGIN: process.env.VELMERE_CANONICAL_ORIGIN,
};

function restoreEnv() {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

function signedHeader(body: string, secret: string, timestamp: number) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function request(body: string, signature: string | Headers) {
  const headers = signature instanceof Headers
    ? signature
    : new Headers({
        "content-type": "application/json",
        "stripe-signature": signature,
      });
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  return new NextRequest("https://velmere.example/api/stripe/webhook", {
    method: "POST",
    headers,
    body,
  });
}

async function dispatchThroughProxy(req: NextRequest) {
  const edgeResponse = proxy(req);
  if (edgeResponse.headers.get("x-middleware-next") !== "1") {
    return { edgeResponse, routeResponse: null };
  }
  return {
    edgeResponse,
    routeResponse: await stripeWebhookPost(req),
  };
}

async function main() {
  process.env.NODE_ENV = "production";
  delete process.env.VERCEL_ENV;
  process.env.VELMERE_CANONICAL_ORIGIN = "https://velmere.example";

  const secret = "whsec_proxy_route_authentic_signature_test";
  const now = Math.floor(Date.now() / 1_000);
  const body = JSON.stringify({
    id: "evt_proxy_route_authentic_001",
    object: "event",
    api_version: "2025-02-24.acacia",
    created: now,
    data: {
      object: {
        id: "cs_proxy_route_authentic_001",
        object: "checkout.session",
        metadata: {},
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: "checkout.session.completed",
  });
  const primaryHeader = signedHeader(body, secret, now);
  const rotatedNonMatchingV1 = "b".repeat(64);
  const counters = {
    construct: 0,
    claim: 0,
    dispatch: 0,
  };
  const stripe = {} as Stripe;

  Object.assign(stripeWebhookIngressDependencies, {
    webhookSecret: () => secret,
    getStripe: () => stripe,
    constructEvent: (
      _stripeClient: Stripe,
      bytes: Uint8Array,
      signature: string,
      webhookSecret: string,
    ) => {
      counters.construct += 1;
      const raw = Buffer.from(bytes).toString("utf8");
      const parts = signature.split(",").map((part) => part.trim());
      const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2) ?? "";
      const candidates = parts
        .filter((part) => part.startsWith("v1="))
        .map((part) => part.slice(3));
      const expected = createHmac("sha256", webhookSecret)
        .update(`${timestamp}.${raw}`, "utf8")
        .digest("hex");
      if (!candidates.includes(expected)) throw new Error("signature_verification_failed");
      return JSON.parse(raw) as Stripe.Event;
    },
    getRuntimeAuthority: () => ({
      requestedMode: "test",
      credentialMode: "test",
      modeMatches: true,
      testPaymentsAllowed: true,
      livePaymentsAllowed: false,
      blockers: [],
    }),
    claimEvent: async () => {
      counters.claim += 1;
      return {
        claimed: false,
        status: "processed",
        attempt: 1,
      };
    },
    maybeOrderDraftIdFromEvent: () => null,
    dispatchEvent: async () => {
      counters.dispatch += 1;
      return new Response(null, { status: 204 });
    },
    orderEventJson: async (responseBody: unknown, init: ResponseInit = {}) =>
      new Response(JSON.stringify(responseBody), {
        ...init,
        headers: {
          "content-type": "application/json",
          ...Object.fromEntries(new Headers(init.headers)),
        },
      }),
    customerWebhookHeaders: () => ({}),
  } satisfies Partial<StripeWebhookIngressDependencies>);

  try {
    const valid = await dispatchThroughProxy(
      request(body, `${primaryHeader},v1=${rotatedNonMatchingV1}`),
    );
    assert.equal(valid.edgeResponse.status, 200);
    assert.equal(valid.edgeResponse.headers.get("x-middleware-next"), "1");
    assert.ok(valid.routeResponse);
    assert.equal(valid.routeResponse.status, 200);
    assert.equal(counters.construct, 1, "authentic signature must be constructed once");
    assert.equal(counters.claim, 1, "valid event must reach one durable claim attempt");
    assert.equal(counters.dispatch, 0, "processed duplicate must not dispatch effects");

    const duplicatedHeaders = new Headers({ "content-type": "application/json" });
    duplicatedHeaders.append("stripe-signature", primaryHeader);
    duplicatedHeaders.append("stripe-signature", primaryHeader);
    const duplicate = await dispatchThroughProxy(request(body, duplicatedHeaders));
    assert.equal(duplicate.edgeResponse.status, 400);
    assert.equal(duplicate.routeResponse, null);
    assert.equal(await duplicate.edgeResponse.json().then((value) => value.mode), "api_stripe_signature_header_ambiguous");

    const injected = await dispatchThroughProxy(
      request(body, `${primaryHeader},authorization=attacker`),
    );
    assert.equal(injected.edgeResponse.status, 400);
    assert.equal(injected.routeResponse, null);
    assert.equal(await injected.edgeResponse.json().then((value) => value.mode), "api_stripe_signature_header_invalid");

    const malformed = await dispatchThroughProxy(
      request(body, `t=${now},v1=short`),
    );
    assert.equal(malformed.edgeResponse.status, 400);
    assert.equal(malformed.routeResponse, null);
    assert.equal(counters.construct, 1, "blocked edge requests must not construct provider events");
    assert.equal(counters.claim, 1, "blocked edge requests must not consume durable claims");
    assert.equal(counters.dispatch, 0, "blocked edge requests must not dispatch effects");
  } finally {
    Object.assign(stripeWebhookIngressDependencies, originalDependencies);
    restoreEnv();
  }

  console.log("Stripe webhook proxy-to-route behavior: PASS (authentic HMAC + 3 negative families)");
}

void main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
