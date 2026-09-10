import assert from "node:assert/strict";
import { SUPPORTED_STRIPE_WEBHOOK_EVENTS } from "../../lib/payments/stripe-webhook/shared.ts";
import { dispatchStripeWebhookEvent, type StripeWebhookDispatcherDependencies } from "../../lib/payments/stripe-webhook/dispatcher.ts";

async function main() {
  let assertions = 0;
  const ok = (cond: boolean, msg: string) => {
    assertions += 1;
    assert.ok(cond, msg);
  };

  console.log("=== PASS-017: PAYMENT, CHECKOUT & ENTITLEMENT WEBHOOKS SUITE ===");

  // 1. Supported Stripe Lifecycle Events
  const requiredEvents = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
    "payment_intent.payment_failed",
    "charge.refunded",
    "charge.dispute.created",
  ];
  for (const ev of requiredEvents) {
    ok(SUPPORTED_STRIPE_WEBHOOK_EVENTS.has(ev), `Stripe webhook event ${ev} must be supported`);
  }

  // 2. Dispatcher Event Routing & Lifecycle Handlers
  let terminalHandled = false;
  let refundHandled = false;
  let commerceHandled = false;

  const mockDeps: StripeWebhookDispatcherDependencies = {
    appendOrderEvent: () => {},
    markStripeWebhookEventProcessed: async () => {},
    maybeOrderDraftIdFromEvent: () => "draft_test_123",
    orderEventJson: (body, init) => new Response(JSON.stringify(body), init),
    customerWebhookHeaders: () => ({ "x-velmere-test": "true" }),
    terminal: {
      auditPaymentMetadataFromEvent: async () => null,
      commercePaymentMetadataFromEvent: async () => null,
      isPaidAuditProduct: () => false,
      applyAuditCasePaymentTerminalEvent: async () => ({} as any),
      runStripeWebhookEffect: async () => ({} as any),
      applyVlmPaidEntitlementLifecycleEvent: async () => ({} as any),
      findVlmPaidEntitlementByStripeBinding: async () => null,
      resolveVlmPaidTerminalBindingFromEvent: () => ({ ok: false, error: "not_vlm", retryable: false } as any),
      maybeOrderDraftIdFromEvent: () => "draft_test_123",
      stripeSessionIdFromEvent: () => "cs_test_123",
      markPaymentFailed: () => {},
      markRefunded: () => {},
      markDurableOrderPaymentFailed: async () => ({ persisted: true } as any),
      markDurableOrderRefunded: async () => ({ persisted: true } as any),
      recordDurableOrderPartialRefund: async () => ({ persisted: true } as any),
      appendOrderEvent: () => {},
      markStripeWebhookEventProcessed: async () => {},
      markWebhookTerminalFailure: async () => {},
      markWebhookRetryableFailure: async () => {},
      orderEventJson: (body, init) => new Response(JSON.stringify(body), { status: 200, ...init }),
      customerWebhookHeaders: () => ({ "x-velmere-test": "true" }),
    },
    vlmPaidAccess: {} as any,
    commerce: {
      handleCommerceCheckout: async () => {
        commerceHandled = true;
        return new Response(JSON.stringify({ ok: true, status: "commerce_handled" }), { status: 200 });
      },
    } as any,
  };

  // 3. Test Payment Failed / Expired Event
  const expiredEvent = {
    id: "evt_expired_1",
    type: "checkout.session.expired",
    data: { object: { id: "cs_expired_1" } },
  } as any;
  const expiredRes = await dispatchStripeWebhookEvent({ event: expiredEvent, stripe: {} as any, attempt: 1 }, {
    ...mockDeps,
    terminal: {
      ...mockDeps.terminal,
      handlePaymentFailedOrExpired: async () => {
        terminalHandled = true;
        return new Response(JSON.stringify({ ok: true, status: "payment_failed_marked" }));
      },
    } as any,
  });
  ok(expiredRes.status === 200, "Expired checkout session handled gracefully");

  // 4. Test Refund / Chargeback Event
  const refundEvent = {
    id: "evt_refund_1",
    type: "charge.refunded",
    data: {
      object: {
        id: "ch_refund_1",
        amount: 7999,
        amount_refunded: 7999,
        refunded: true,
        currency: "eur",
      },
    },
  } as any;
  const refundRes = await dispatchStripeWebhookEvent({ event: refundEvent, stripe: {} as any, attempt: 1 }, {
    ...mockDeps,
    terminal: {
      ...mockDeps.terminal,
      handleRefundOrChargeback: async () => {
        refundHandled = true;
        return new Response(JSON.stringify({ ok: true, status: "refund_recorded" }));
      },
    } as any,
  });
  ok(refundRes.status === 200, "Charge refund event handled gracefully");

  // 5. Test Unsupported Event (Fail-Safe Ack without State Mutation)
  const unknownEvent = {
    id: "evt_unknown_1",
    type: "customer.discount.created",
    data: { object: {} },
  } as any;
  const unknownRes = await dispatchStripeWebhookEvent({ event: unknownEvent, stripe: {} as any, attempt: 1 }, mockDeps);
  const unknownJson = await unknownRes.json();
  ok(unknownJson.unsupported === true, "Unsupported event is acknowledged without throwing");
  ok(unknownJson.received === true, "Unsupported event returns received: true");

  console.log(`PASS-017 Payment & Entitlement Webhooks: PASS (${assertions}/${assertions} assertions)`);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
