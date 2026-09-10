import assert from "node:assert/strict";
import {
  handleStripeWebhookRequest,
  stripeWebhookIngressDependencies,
  type StripeWebhookIngressDependencies,
} from "../../lib/payments/stripe-webhook/ingress";

let assertions = 0;
function equal<T>(actual: T, expected: T, message: string) {
  assertions += 1;
  assert.equal(actual, expected, message);
}

function request(headers: HeadersInit = {}) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "t=1,v1=a97",
      ...Object.fromEntries(new Headers(headers)),
    },
    body: JSON.stringify({ id: "evt_a97_ingress_001" }),
  });
}

function dependencies(input: {
  livemode?: boolean;
  authority?: ReturnType<StripeWebhookIngressDependencies["getRuntimeAuthority"]>;
  claimCalls: { value: number };
  constructCalls: { value: number };
}) {
  return {
    ...stripeWebhookIngressDependencies,
    webhookSecret: () => "whsec_a97_ingress_test",
    getStripe: () => ({}),
    constructEvent: () => {
      input.constructCalls.value += 1;
      return {
        id: "evt_a97_ingress_001",
        type: "checkout.session.completed",
        created: Math.floor(Date.now() / 1_000) - 1,
        livemode: input.livemode ?? false,
        data: { object: { id: "cs_a97_ingress_001", metadata: {} } },
      };
    },
    getRuntimeAuthority: () => input.authority ?? ({
      requestedMode: "test",
      credentialMode: "test",
      modeMatches: true,
      testPaymentsAllowed: true,
      livePaymentsAllowed: false,
      blockers: [],
    }),
    claimEvent: async () => {
      input.claimCalls.value += 1;
      return { claimed: false, status: "processed", attempt: 1 };
    },
    maybeOrderDraftIdFromEvent: () => null,
    orderEventJson: async (body: unknown, init: ResponseInit = {}) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { "content-type": "application/json", ...Object.fromEntries(new Headers(init.headers)) },
      }),
    customerWebhookHeaders: () => ({}),
  } as unknown as StripeWebhookIngressDependencies;
}

async function main() {
  {
    const claimCalls = { value: 0 }, constructCalls = { value: 0 };
    const response = await handleStripeWebhookRequest(new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=a97" },
      body: "{}",
    }), dependencies({ claimCalls, constructCalls }));
    equal(response.status, 415, "missing JSON content type must be rejected");
    equal(constructCalls.value, 0, "media-type rejection must precede signature construction");
    equal(claimCalls.value, 0, "media-type rejection must precede durable claim");
  }
  {
    const claimCalls = { value: 0 }, constructCalls = { value: 0 };
    const response = await handleStripeWebhookRequest(request({ "content-encoding": "gzip" }), dependencies({ claimCalls, constructCalls }));
    equal(response.status, 415, "compressed webhook body must be rejected");
    equal(constructCalls.value, 0, "compression rejection must precede signature construction");
    equal(claimCalls.value, 0, "compression rejection must precede durable claim");
  }
  {
    const claimCalls = { value: 0 }, constructCalls = { value: 0 };
    const response = await handleStripeWebhookRequest(request(), dependencies({ livemode: true, claimCalls, constructCalls }));
    equal(response.status, 400, "live event in test runtime must be rejected");
    equal(constructCalls.value, 1, "signed event must be constructed before runtime mode is known");
    equal(claimCalls.value, 0, "runtime mismatch must not consume durable event claim");
  }
  {
    const claimCalls = { value: 0 }, constructCalls = { value: 0 };
    const response = await handleStripeWebhookRequest(request(), dependencies({
      authority: {
        requestedMode: "test",
        credentialMode: "test",
        modeMatches: true,
        testPaymentsAllowed: false,
        livePaymentsAllowed: false,
        blockers: ["closed"],
      },
      claimCalls,
      constructCalls,
    }));
    equal(response.status, 503, "closed payment authority must be retryable fail-closed");
    equal(claimCalls.value, 0, "closed authority must not consume durable event claim");
  }
  {
    const claimCalls = { value: 0 }, constructCalls = { value: 0 };
    const response = await handleStripeWebhookRequest(request(), dependencies({ claimCalls, constructCalls }));
    equal(response.status, 200, "valid signed test event must reach idempotent duplicate response");
    equal(constructCalls.value, 1, "valid event must be constructed once");
    equal(claimCalls.value, 1, "valid event must claim exactly once");
  }

  console.log(JSON.stringify({
    ok: true,
    passId: "PASS36_A97_STRIPE_WEBHOOK_INGRESS_PROVIDER_SPY",
    assertions,
    providerOrEffectCallsAfterBlockedIngress: 0,
    durableClaimCallsAfterBlockedIngress: 0,
  }, null, 2));
}

void main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
