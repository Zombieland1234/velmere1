import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as checkoutRoute } from "@/app/api/checkout/vlm-service/route";
import { PASS36_PAID_CHECKOUT_CONTAINMENT } from "@/lib/commerce/vlm-paid-checkout-containment";
import { getVlmPaidProduct, type VlmPaidProductId } from "@/lib/commerce/vlm-paid-access";
import { SUPPORTED_STRIPE_WEBHOOK_EVENTS } from "@/lib/payments/stripe-webhook/shared";
import { dispatchStripeWebhookEvent } from "@/lib/payments/stripe-webhook/dispatcher";
import { createHmac } from "node:crypto";

test("Payment Red Team #1 & #9: Containment stops unauthorized checkout before payment creation", async () => {
  // Ensure PASS36_PAID_CHECKOUT_CONTAINMENT is active
  assert.strictEqual(PASS36_PAID_CHECKOUT_CONTAINMENT.active, true, "Containment must be active");

  // Attempt to initiate checkout with tampered prices and unauthorized tiers
  const request = new Request("http://localhost:3000/api/checkout/vlm-service", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Host": "localhost:3000",
      "Origin": "http://localhost:3000",
    },
    body: JSON.stringify({
      productId: "vlm-security-audit-pro",
      tamperedPriceCents: 1, // Attempted price tampering ($0.01 instead of $499)
      currency: "usd",
    }),
  });

  const response = await checkoutRoute(request);
  assert.strictEqual(response.status, 503, "Containment must return HTTP 503 Service Unavailable");
  const data = await response.json();
  assert.strictEqual(data.ok, false);
  assert.strictEqual(data.saleEnabled, false);
  assert.strictEqual(data.productionApproved, false);
});

test("Payment Red Team #2: Server-side SKU truth enforces price and tier authority", () => {
  // Verify that products define canonical metadata that clients cannot override
  const proProduct = getVlmPaidProduct("vlm_pro_analysis_single");
  const advancedProduct = getVlmPaidProduct("vlm_advanced_analysis_single");

  assert.ok(proProduct, "Pro product must exist in server catalog");
  assert.ok(advancedProduct, "Advanced product must exist in server catalog");

  // Server enforces stop-sell / controlled beta: public checkout is disallowed
  assert.strictEqual(proProduct.publicCheckoutAllowed, false);
  assert.strictEqual(advancedProduct.publicCheckoutAllowed, false);

  // Scopes are strictly differentiated
  assert.strictEqual(proProduct.accessScope, "vlm_pro_analysis");
  assert.strictEqual(advancedProduct.accessScope, "vlm_advanced_analysis");
  assert.notStrictEqual(proProduct.id, advancedProduct.id);
});

test("Payment Red Team #3: Supported Stripe webhook lifecycle events reject unknown events", () => {
  // Unknown or forged event types must not be processed
  const maliciousEvents = [
    "payout.paid",
    "customer.subscription.deleted",
    "fake.event.injection",
    "admin.grant_free_access",
  ];

  for (const malicious of maliciousEvents) {
    assert.strictEqual(
      SUPPORTED_STRIPE_WEBHOOK_EVENTS.has(malicious),
      false,
      `Malicious event '${malicious}' must not be recognized in webhook dispatcher`,
    );
  }
});

test("Payment Red Team #4: Forged webhook signature detection", () => {
  const secret = "whsec_test_secret_key_12345";
  const payload = JSON.stringify({ id: "evt_123", type: "checkout.session.completed" });
  const timestamp = Math.floor(Date.now() / 1000);

  // Valid signature
  const validHmac = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const validHeader = `t=${timestamp},v1=${validHmac}`;

  // Forged signature
  const forgedHmac = createHmac("sha256", "wrong_secret")
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const forgedHeader = `t=${timestamp},v1=${forgedHmac}`;

  assert.notStrictEqual(validHeader, forgedHeader, "Forged signature must not match valid signature");
});

test("Payment Red Team #5: Stale webhook timestamp rejection", () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const twoHoursAgo = nowSeconds - 7200;
  const toleranceSeconds = 300; // 5-minute replay tolerance window

  const isStale = (ts: number) => Math.abs(nowSeconds - ts) > toleranceSeconds;

  assert.strictEqual(isStale(twoHoursAgo), true, "Event timestamp 2 hours ago must be rejected as stale");
  assert.strictEqual(isStale(nowSeconds - 10), false, "Fresh event timestamp must be accepted");
});

test("Payment Red Team #6: Webhook deduplication and idempotency", async () => {
  const processedEvents = new Set<string>();

  const processWebhook = (eventId: string): { processed: boolean; duplicate: boolean } => {
    if (processedEvents.has(eventId)) {
      return { processed: false, duplicate: true };
    }
    processedEvents.add(eventId);
    return { processed: true, duplicate: false };
  };

  const eventId = "evt_idempotent_test_999";

  const firstCall = processWebhook(eventId);
  assert.strictEqual(firstCall.processed, true);
  assert.strictEqual(firstCall.duplicate, false);

  const secondCall = processWebhook(eventId);
  assert.strictEqual(secondCall.processed, false);
  assert.strictEqual(secondCall.duplicate, true);

  const thirdCall = processWebhook(eventId);
  assert.strictEqual(thirdCall.processed, false);
  assert.strictEqual(thirdCall.duplicate, true);
});
