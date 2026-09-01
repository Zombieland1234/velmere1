import assert from "node:assert/strict";
import {
  evaluateRuntimePaymentAuthority,
  runtimePaymentModeAllowed,
} from "../../lib/checkout/runtime-payment-authority.js";
import { resolveVlmPaidTerminalBindingFromEvent } from "../../lib/payments/stripe-webhook/vlm-terminal-binding.js";
import {
  handlePaymentFailedOrExpired,
  handleRefundOrChargeback,
} from "../../lib/payments/stripe-webhook/handlers/terminal-events.js";

function env(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    PAYMENTS_MODE: "test",
    STRIPE_SECRET_KEY: "sk_test_unit_only",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_unit_only",
    STRIPE_WEBHOOK_SECRET: "whsec_unit_only",
    ...overrides,
  };
}

{
  const authority = evaluateRuntimePaymentAuthority(env());
  assert.equal(authority.credentialMode, "test");
  assert.equal(authority.testPaymentsAllowed, true);
  assert.equal(authority.livePaymentsAllowed, false);
  assert.equal(runtimePaymentModeAllowed(authority), true);
}

{
  const authority = evaluateRuntimePaymentAuthority(env({ PAYMENTS_MODE: "live" }));
  assert.equal(authority.modeMatches, false);
  assert.equal(authority.livePaymentsAllowed, false);
  assert.equal(runtimePaymentModeAllowed(authority), false);
}

{
  const authority = evaluateRuntimePaymentAuthority(env({
    PAYMENTS_MODE: "live",
    STRIPE_SECRET_KEY: "sk_live_unit_only",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_unit_only",
  }));
  assert.equal(authority.credentialMode, "live");
  assert.equal(authority.livePaymentsAllowed, false);
  assert.ok(authority.blockers.some((blocker) => blocker.includes("releaseDecision")));
}

{
  const authority = evaluateRuntimePaymentAuthority(env({
    PAYMENTS_MODE: "live",
    STRIPE_SECRET_KEY: "sk_live_unit_only",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_unit_only",
    VELMERE_RELEASE_DECISION: "GO",
    VELMERE_LIVE: "true",
    VELMERE_SALE_ENABLED: "true",
    VELMERE_PRODUCTION_APPROVED: "true",
    VELMERE_PROVIDER_RIGHTS_APPROVED: "true",
    VELMERE_LEGAL_APPROVED: "true",
    VELMERE_EXACT_RELEASE_ID: "VELMERE_EXACT_UNIT",
    VELMERE_RELEASE_APPROVAL_SHA256: "a".repeat(64),
  }));
  assert.equal(authority.livePaymentsAllowed, true);
  assert.equal(runtimePaymentModeAllowed(authority), true);
}

const bindingMetadata = {
  kind: "vlm_paid_access",
  productId: "vlm_pro_pdf_single",
  contextHash: "a".repeat(64),
  auditCaseRef: "",
  auditTier: "",
};

function stripeLookup(sessionMetadata = bindingMetadata, sessionCount = 1) {
  return {
    paymentIntents: {
      retrieve: async () => ({ id: "pi_unit", metadata: {} }),
    },
    checkout: {
      sessions: {
        list: async () => ({
          data: Array.from({ length: sessionCount }, (_, index) => ({
            id: `cs_unit_${index}`,
            metadata: sessionMetadata,
          })),
        }),
      },
    },
  };
}

{
  const result = await resolveVlmPaidTerminalBindingFromEvent(
    {
      id: "evt_unit",
      type: "charge.refunded",
      data: { object: { payment_intent: "pi_unit", metadata: {} } },
    } as never,
    stripeLookup() as never,
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.binding.productId, "vlm_pro_pdf_single");
    assert.equal(result.binding.stripeSessionId, "cs_unit_0");
  }
}

{
  const result = await resolveVlmPaidTerminalBindingFromEvent(
    {
      id: "evt_ambiguous",
      type: "charge.refunded",
      data: { object: { payment_intent: "pi_unit", metadata: {} } },
    } as never,
    stripeLookup(bindingMetadata, 2) as never,
  );
  assert.deepEqual(result, {
    ok: false,
    error: "vlm_paid_checkout_session_ambiguous",
    retryable: true,
  });
}

function terminalDependencies() {
  const calls = {
    localFailure: 0,
    localRefund: 0,
    processed: 0,
    retryable: 0,
  };
  const dependencies = {
    commercePaymentMetadataFromEvent: async () => ({ orderDraftId: "ord_unit" }),
    auditPaymentMetadataFromEvent: async () => null,
    isPaidAuditProduct: () => false,
    applyAuditCasePaymentTerminalEvent: async () => ({ ok: false }),
    runStripeWebhookEffect: async () => null,
    applyVlmPaidEntitlementLifecycleEvent: async () => ({ ok: true }),
    findVlmPaidEntitlementByStripeBinding: async () => ({ ok: false }),
    resolveVlmPaidTerminalBindingFromEvent: async () => ({
      ok: false,
      error: "not_vlm_paid_access",
      retryable: false,
      notVlmPaidAccess: true,
    }),
    maybeOrderDraftIdFromEvent: () => "ord_unit",
    stripeSessionIdFromEvent: () => "cs_unit",
    markPaymentFailed: () => { calls.localFailure += 1; },
    markRefunded: () => { calls.localRefund += 1; },
    markDurableOrderPaymentFailed: async () => ({
      persisted: false,
      providerError: "db_unavailable",
    }),
    markDurableOrderRefunded: async () => ({
      persisted: false,
      providerError: "db_unavailable",
    }),
    recordDurableOrderPartialRefund: async () => ({ persisted: false }),
    appendOrderEvent: () => {
      throw new Error("event must not be appended after failed durable transition");
    },
    markStripeWebhookEventProcessed: async () => { calls.processed += 1; },
    markWebhookTerminalFailure: async () => null,
    markWebhookRetryableFailure: async () => { calls.retryable += 1; },
    orderEventJson: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
    customerWebhookHeaders: () => ({}),
  };
  return { calls, dependencies };
}

{
  const { calls, dependencies } = terminalDependencies();
  const response = await handlePaymentFailedOrExpired(
    {
      event: {
        id: "evt_failed",
        type: "payment_intent.payment_failed",
        data: { object: { metadata: {} } },
      },
      stripe: {},
      attempt: 1,
    } as never,
    dependencies as never,
  ) as unknown as { status: number };
  assert.equal(response.status, 500);
  assert.equal(calls.retryable, 1);
  assert.equal(calls.localFailure, 0);
  assert.equal(calls.processed, 0);
}

{
  const { calls, dependencies } = terminalDependencies();
  const response = await handleRefundOrChargeback(
    {
      event: {
        id: "evt_refund",
        type: "charge.dispute.created",
        data: { object: { metadata: {} } },
      },
      stripe: {},
      attempt: 1,
    } as never,
    dependencies as never,
  ) as unknown as { status: number };
  assert.equal(response.status, 500);
  assert.equal(calls.retryable, 1);
  assert.equal(calls.localRefund, 0);
  assert.equal(calls.processed, 0);
}

console.log("A90-A92 runtime boundary behavior: PASS");
