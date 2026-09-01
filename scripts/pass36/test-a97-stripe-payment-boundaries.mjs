import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const runtimeModule = await import(pathToFileURL(path.join(root, "lib/payments/stripe-webhook-runtime-contract.ts")).href);
const receiptModule = await import(pathToFileURL(path.join(root, "lib/payments/vlm-paid-stripe-receipt-contract.ts")).href);
const { evaluateStripeWebhookRuntimeContract } = runtimeModule;
const { evaluateVlmPaidStripeReceiptContract } = receiptModule;

let assertions = 0;
function ok(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.equal(actual, expected, message); }

const NOW = 1_800_000_000;
const testAuthority = {
  requestedMode: "test",
  credentialMode: "test",
  modeMatches: true,
  testPaymentsAllowed: true,
  livePaymentsAllowed: false,
  blockers: [],
};
const liveAuthority = {
  requestedMode: "live",
  credentialMode: "live",
  modeMatches: true,
  testPaymentsAllowed: false,
  livePaymentsAllowed: true,
  blockers: [],
};

const validRuntime = evaluateStripeWebhookRuntimeContract({
  eventId: "evt_a97_runtime_001",
  eventType: "checkout.session.completed",
  eventCreatedAt: NOW - 30,
  eventLivemode: false,
  authority: testAuthority,
  nowUnixSeconds: NOW,
});
ok(validRuntime.ok, "test-mode signed event must pass an open test authority");

const runtimeCases = [
  ["live-event-in-test", { eventLivemode: true, authority: testAuthority }, "stripe_event_runtime_mode_mismatch"],
  ["test-event-in-live", { eventLivemode: false, authority: liveAuthority }, "stripe_event_runtime_mode_mismatch"],
  ["missing-mode", { authority: { ...testAuthority, requestedMode: "missing", modeMatches: false, testPaymentsAllowed: false } }, "payment_runtime_mode_missing"],
  ["mixed-credentials", { authority: { ...testAuthority, credentialMode: "mixed", modeMatches: false, testPaymentsAllowed: false } }, "payment_runtime_credentials_invalid"],
  ["closed-test-authority", { authority: { ...testAuthority, testPaymentsAllowed: false } }, "payment_runtime_authority_closed"],
  ["future-event", { eventCreatedAt: NOW + 301 }, "stripe_event_created_in_future"],
  ["bad-id", { eventId: "bad" }, "stripe_event_identity_invalid"],
  ["bad-type", { eventType: "bad" }, "stripe_event_identity_invalid"],
];
for (const [name, patch, error] of runtimeCases) {
  const verdict = evaluateStripeWebhookRuntimeContract({
    eventId: "evt_a97_runtime_001",
    eventType: "checkout.session.completed",
    eventCreatedAt: NOW - 30,
    eventLivemode: false,
    authority: testAuthority,
    nowUnixSeconds: NOW,
    ...patch,
  });
  ok(!verdict.ok, `${name} must fail closed`);
  if (!verdict.ok) equal(verdict.error, error, `${name} must return exact reason`);
}

const H = "a".repeat(64);
const B = "b".repeat(64);
const A = "c".repeat(64);
const expected = {
  eventType: "checkout.session.completed",
  eventLivemode: false,
  expectedLivemode: false,
  productId: "vlm_pro_analysis_single",
  productCellId: "shield_pro_terminal_analysis",
  productCellBindingSha256: B,
  contextHash: H,
  accountIdHash: A,
  paymentRail: "stripe_checkout_card",
  amount: 7999,
  currency: "eur",
};
const commonMetadata = {
  kind: "vlm_paid_access",
  productId: expected.productId,
  productCellId: expected.productCellId,
  productCellBindingSha256: expected.productCellBindingSha256,
  contextHash: expected.contextHash,
  accountIdHash: expected.accountIdHash,
  paymentRail: expected.paymentRail,
};
const session = {
  id: "cs_a97_receipt_001",
  mode: "payment",
  status: "complete",
  payment_status: "paid",
  livemode: false,
  amount_total: 7999,
  amount_subtotal: 7999,
  currency: "eur",
  payment_intent: "pi_a97_receipt_001",
  metadata: commonMetadata,
  total_details: { amount_discount: 0, amount_tax: 0 },
};
const paymentIntent = {
  id: "pi_a97_receipt_001",
  status: "succeeded",
  livemode: false,
  amount: 7999,
  amount_received: 7999,
  currency: "eur",
  metadata: commonMetadata,
};
const validReceipt = evaluateVlmPaidStripeReceiptContract({ session, paymentIntent, expected });
ok(validReceipt.ok, "fully bound paid receipt must pass");
if (validReceipt.ok) {
  equal(validReceipt.mode, "test", "receipt mode must remain test");
  equal(validReceipt.paymentIntentId, paymentIntent.id, "payment intent identity must be exact");
}

const mutationFamilies = [
  ["event-type", { expected: { eventType: "charge.refunded" } }],
  ["event-mode", { expected: { eventLivemode: true } }],
  ["expected-local-demo-rail", { expected: { paymentRail: "local_demo_zero_euro" } }],
  ["session-mode", { session: { mode: "setup" } }],
  ["session-status", { session: { status: "open" } }],
  ["payment-status", { session: { payment_status: "unpaid" } }],
  ["session-livemode", { session: { livemode: true } }],
  ["session-amount", { session: { amount_total: 1 } }],
  ["session-subtotal", { session: { amount_subtotal: 1 } }],
  ["session-currency", { session: { currency: "usd" } }],
  ["discount", { session: { total_details: { amount_discount: 1, amount_tax: 0 } } }],
  ["tax", { session: { total_details: { amount_discount: 0, amount_tax: 1 } } }],
  ["session-product", { sessionMetadata: { productId: "vlm_advanced_analysis_single" } }],
  ["session-cell", { sessionMetadata: { productCellId: "shield_map_advanced_investigation" } }],
  ["session-cell-hash", { sessionMetadata: { productCellBindingSha256: "d".repeat(64) } }],
  ["session-context", { sessionMetadata: { contextHash: "e".repeat(64) } }],
  ["session-account", { sessionMetadata: { accountIdHash: "f".repeat(64) } }],
  ["session-rail", { sessionMetadata: { paymentRail: "stripe_checkout_blik" } }],
  ["pi-binding", { session: { payment_intent: "pi_other_001" } }],
  ["pi-status", { paymentIntent: { status: "requires_action" } }],
  ["pi-livemode", { paymentIntent: { livemode: true } }],
  ["pi-amount", { paymentIntent: { amount: 1 } }],
  ["pi-received", { paymentIntent: { amount_received: 1 } }],
  ["pi-currency", { paymentIntent: { currency: "usd" } }],
  ["pi-metadata", { piMetadata: { contextHash: "0".repeat(64) } }],
];
let killed = 0;
for (const [name, patch] of mutationFamilies) {
  const mutatedSession = {
    ...session,
    ...(patch.session ?? {}),
    metadata: { ...commonMetadata, ...(patch.sessionMetadata ?? {}) },
  };
  const mutatedIntent = {
    ...paymentIntent,
    ...(patch.paymentIntent ?? {}),
    metadata: { ...commonMetadata, ...(patch.piMetadata ?? {}) },
  };
  const mutatedExpected = { ...expected, ...(patch.expected ?? {}) };
  const verdict = evaluateVlmPaidStripeReceiptContract({
    session: mutatedSession,
    paymentIntent: mutatedIntent,
    expected: mutatedExpected,
  });
  ok(!verdict.ok, `mutation ${name} must be rejected`);
  if (!verdict.ok) killed += 1;
}
equal(killed, mutationFamilies.length, "every receipt mutation family must be killed");

const ingress = fs.readFileSync(path.join(root, "lib/payments/stripe-webhook/ingress.ts"), "utf8");
const guard = fs.readFileSync(path.join(root, "lib/security/payment-webhook-guard.ts"), "utf8");
const vlmHandler = fs.readFileSync(path.join(root, "lib/payments/stripe-webhook/handlers/vlm-paid-access.ts"), "utf8");
const verifyHandler = fs.readFileSync(path.join(root, "lib/server/vlm-service-verify-handler.ts"), "utf8");
const runtimeIndex = ingress.indexOf("validateRuntimeEvent");
const claimIndex = ingress.indexOf("claimEvent({");
ok(runtimeIndex >= 0 && claimIndex > runtimeIndex, "runtime mode validation must happen before durable webhook claim");
ok(guard.includes('Stripe webhook expects application/json.'), "webhook must require strict JSON media type");
ok(guard.includes('Compressed Stripe webhook bodies are not accepted.'), "webhook must reject compressed bodies");
ok(vlmHandler.includes("verifyVlmPaidStripeReceipt"), "webhook VLM handler must verify full Stripe receipt before entitlement effect");
ok(verifyHandler.includes("verifyVlmPaidStripeReceipt"), "server verify handler must verify full Stripe receipt before entitlement upsert");

console.log(JSON.stringify({
  ok: true,
  passId: "PASS36_A97_STRIPE_TEST_RUNTIME_RECEIPT_BOUNDARY",
  assertions,
  runtimeCases: runtimeCases.length + 1,
  receiptMutationsKilled: killed,
  receiptMutationDenominator: mutationFamilies.length,
  realStripeRequests: 0,
  realRefunds: 0,
  realReconciliationRuns: 0,
  truthBoundary: "Local pure-contract and static integration proof only; no Stripe TEST staging credit.",
}, null, 2));
