import assert from "node:assert/strict";
import fs from "node:fs";
import type Stripe from "stripe";
import {
  runCommerceFulfilmentOutboxWorker,
  validateAuthoritativeStripeSession,
  type CommerceFulfilmentExecutionReceipt,
  type CommerceFulfilmentOutboxItem,
  type CommerceFulfilmentOutboxWorkerDependencies,
} from "../../lib/orders/commerce-fulfilment-outbox-worker";
import { PrintfulRequestError } from "../../lib/printful/client";
import { readCurrentConsolidatedRoute } from "../lib/current-route-contract";
import {
  issueMarketIntegrityWorkerMutationEnvelope,
  verifyMarketIntegrityWorkerMutationEnvelope,
} from "../../lib/security/market-integrity-cron-auth";

let passed = 0;
function ok(name: string) {
  passed += 1;
  console.log(`PASS ${name}`);
}

function item(overrides: Partial<CommerceFulfilmentOutboxItem> = {}): CommerceFulfilmentOutboxItem {
  const orderDraftId = overrides.orderDraftId ?? "ord_pass4994";
  const stripeSessionId = overrides.stripeSessionId ?? "cs_pass4994";
  const cartHash = overrides.cartHash ?? "a".repeat(64);
  const lineItems = overrides.order?.lineItems ?? [{
    productId: "product_1",
    variantId: "variant_1",
    title: "Redacted product",
    amount: 2500,
    quantity: 1,
    currency: "EUR" as const,
    provider: "printful" as const,
    fulfilmentMode: "automatic" as const,
    providerVariantId: "12345",
  }];
  return {
    requestId: "commerce_fulfilment_" + "b".repeat(32),
    idempotencyKey: "commerce_paid_outbox:test",
    orderDraftId,
    stripeSessionId,
    stripeEventId: "evt_pass4994",
    stripePaymentIntentId: "pi_pass4994",
    cartHash,
    amountTotal: 2500,
    currency: "EUR",
    stripeLivemode: false,
    fulfilmentAction: "printful_order_draft",
    provider: "printful",
    automaticPrintfulLineCount: 1,
    attemptCount: 1,
    leaseToken: "test_lease",
    durableOrderBinding: {
      cartHash,
      expectedAmountTotal: 2500,
      expectedCurrency: "EUR",
      stripeSessionId,
      stripeLivemode: false,
      stripePaymentIntentId: "pi_pass4994",
    },
    order: {
      id: orderDraftId,
      status: "paid",
      locale: "en",
      cartHash,
      stripeSessionId,
      lineItems,
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T00:00:00.000Z",
      logs: [],
      eventReceiptIds: [],
    },
    ...overrides,
  };
}

function session(forItem: CommerceFulfilmentOutboxItem): Stripe.Checkout.Session {
  return {
    id: forItem.stripeSessionId,
    object: "checkout.session",
    amount_total: forItem.amountTotal,
    currency: forItem.currency.toLowerCase(),
    livemode: forItem.stripeLivemode,
    mode: "payment",
    payment_status: "paid",
    payment_intent: forItem.stripePaymentIntentId,
    metadata: {
      orderDraftId: forItem.orderDraftId,
      cartHash: forItem.cartHash,
      kind: "physical_commerce",
      expectedAmountTotal: String(forItem.amountTotal),
      expectedCurrency: forItem.currency,
    },
  } as unknown as Stripe.Checkout.Session;
}

function dependencies(
  claimedItems: CommerceFulfilmentOutboxItem[],
  overrides: Partial<CommerceFulfilmentOutboxWorkerDependencies> = {},
): CommerceFulfilmentOutboxWorkerDependencies {
  let id = 0;
  return {
    hasDurableStorage: () => true,
    providerExecutionEnabled: () => true,
    providerConfigured: () => true,
    claimBatch: async () => ({ items: claimedItems }),
    complete: async () => undefined,
    fail: async (input) => ({
      status: input.retryable ? "retryable_failed" : "dead_letter",
      retryAfterSeconds: input.retryable ? 17 : null,
    }),
    release: async () => undefined,
    retrieveStripeSession: async (sessionId) => {
      const found = claimedItems.find((entry) => entry.stripeSessionId === sessionId);
      if (!found) throw new Error("missing_test_session");
      return session(found);
    },
    createProviderDraft: async () => ({
      created: true,
      confirm: false,
      printfulOrderId: 991,
      status: "draft",
      reconciled: false,
      reconciliationAttempts: 0,
    }),
    now: () => Date.parse("2026-07-18T00:00:00.000Z"),
    randomId: () => `pass4994_${String(++id).padStart(4, "0")}`,
    ...overrides,
  };
}

async function main() {
{
  const target = item();
  assert.doesNotThrow(() => validateAuthoritativeStripeSession(target, session(target)));
  assert.throws(
    () => validateAuthoritativeStripeSession(target, {
      ...session(target),
      payment_intent: "pi_attacker",
    }),
    /commerce_outbox_stripe_binding_mismatch/,
  );
  ok("authoritative Stripe session requires exact order/cart/amount/currency/mode/livemode/PI binding");
}

{
  const target = item();
  let claimed = false;
  let providerEffects = 0;
  let completeCount = 0;
  const shared = dependencies([target], {
    claimBatch: async () => {
      if (claimed) return { items: [] };
      claimed = true;
      return { items: [target] };
    },
    createProviderDraft: async () => {
      providerEffects += 1;
      return { created: true, confirm: false, printfulOrderId: 992, status: "draft", reconciled: false, reconciliationAttempts: 0 };
    },
    complete: async () => { completeCount += 1; },
  });
  const [left, right] = await Promise.all([
    runCommerceFulfilmentOutboxWorker({}, shared),
    runCommerceFulfilmentOutboxWorker({}, shared),
  ]);
  assert.equal(left.claimedCount + right.claimedCount, 1);
  assert.equal(providerEffects, 1);
  assert.equal(completeCount, 1);
  ok("concurrent workers cannot execute the same durable lease twice");
}

{
  const first = item();
  const second = item({
    requestId: "commerce_fulfilment_" + "c".repeat(32),
    orderDraftId: "ord_pass4994_second",
    stripeSessionId: "cs_pass4994_second",
    stripeEventId: "evt_pass4994_second",
    stripePaymentIntentId: "pi_pass4994_second",
  });
  second.order = { ...second.order, id: second.orderDraftId, stripeSessionId: second.stripeSessionId };
  second.durableOrderBinding = {
    ...second.durableOrderBinding,
    stripeSessionId: second.stripeSessionId,
    stripePaymentIntentId: second.stripePaymentIntentId,
  };
  let active = 0;
  let maxActive = 0;
  const result = await runCommerceFulfilmentOutboxWorker({}, dependencies([first, second], {
    createProviderDraft: async (order) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active -= 1;
      return { created: true, confirm: false, printfulOrderId: order.id === first.orderDraftId ? 993 : 994, status: "draft", reconciled: false, reconciliationAttempts: 0 };
    },
  }));
  assert.equal(result.providerSucceededCount, 2);
  assert.equal(maxActive, 1);
  ok("provider effects execute sequentially after a durable batch claim");
}

{
  const target = item();
  const externalIds = new Set<string>();
  let actualCreates = 0;
  let providerInvocations = 0;
  let completionAttempts = 0;
  let failureWrites = 0;
  const base = dependencies([target], {
    createProviderDraft: async (order) => {
      providerInvocations += 1;
      if (externalIds.has(order.id)) {
        return { created: true, confirm: false, printfulOrderId: 995, status: "draft", reconciled: true, reconciliationAttempts: 1 };
      }
      externalIds.add(order.id);
      actualCreates += 1;
      return { created: true, confirm: false, printfulOrderId: 995, status: "draft", reconciled: false, reconciliationAttempts: 0 };
    },
    complete: async () => {
      completionAttempts += 1;
      if (completionAttempts === 1) throw new Error("simulated_success_write_failure");
    },
    fail: async () => {
      failureWrites += 1;
      return { status: "dead_letter", retryAfterSeconds: null };
    },
  });
  const first = await runCommerceFulfilmentOutboxWorker({}, base);
  target.attemptCount = 2;
  const second = await runCommerceFulfilmentOutboxWorker({}, base);
  assert.equal(first.completionWriteFailedCount, 1);
  assert.equal(second.providerSucceededCount, 1);
  assert.equal(providerInvocations, 2);
  assert.equal(actualCreates, 1);
  assert.equal(failureWrites, 0);
  ok("success-write failure leaves lease for stale recovery and external_id reconciliation, never marks effect failed");
}

{
  const target = item();
  const failureInputs: Parameters<CommerceFulfilmentOutboxWorkerDependencies["fail"]>[0][] = [];
  const result = await runCommerceFulfilmentOutboxWorker({}, dependencies([target], {
    createProviderDraft: async () => {
      throw new PrintfulRequestError({
        code: "deadline_exceeded",
        retryable: true,
        ambiguous: true,
        severity: "error",
        operatorAction: "retry_with_backoff",
      }, 1);
    },
    fail: async (input) => {
      failureInputs.push(input);
      return { status: "retryable_failed", retryAfterSeconds: 18 };
    },
  }));
  assert.equal(result.retryableFailedCount, 1);
  assert.equal(failureInputs[0]?.retryable, true);
  assert.equal(failureInputs[0]?.receipt.providerResult.ambiguous, true);
  assert.equal(failureInputs[0]?.receipt.result, "retryable_failed");
  ok("ambiguous provider timeout is retryable and receipt-bound for idempotent reconciliation");
}

{
  const manual = item({
    fulfilmentAction: "manual_fulfilment_review",
    provider: "manual",
    automaticPrintfulLineCount: 0,
  });
  manual.order = {
    ...manual.order,
    lineItems: [{
      productId: "manual_product",
      variantId: "manual_variant",
      title: "Manual product",
      amount: 2500,
      quantity: 1,
      currency: "EUR",
      provider: "manual",
      fulfilmentMode: "manual",
    }],
  };
  let providerCalls = 0;
  let stripeCalls = 0;
  const completedReceipts: CommerceFulfilmentExecutionReceipt[] = [];
  const result = await runCommerceFulfilmentOutboxWorker({}, dependencies([manual], {
    retrieveStripeSession: async () => {
      stripeCalls += 1;
      return session(manual);
    },
    createProviderDraft: async () => {
      providerCalls += 1;
      throw new Error("must_not_run");
    },
    complete: async (input) => {
      assert.equal(input.providerOrderId, null);
      completedReceipts.push(input.receipt);
    },
  }));
  assert.equal(result.manualSettledCount, 1);
  assert.equal(providerCalls, 0);
  assert.equal(stripeCalls, 0);
  assert.equal(completedReceipts[0]?.result, "manual_review_required");
  ok("manual action settles atomically without Stripe retrieval or Printful execution");
}

{
  let claims = 0;
  await assert.rejects(
    () => runCommerceFulfilmentOutboxWorker({}, dependencies([], {
      hasDurableStorage: () => false,
      claimBatch: async () => { claims += 1; return { items: [] }; },
    })),
    /commerce_outbox_durable_storage_required/,
  );
  assert.equal(claims, 0);
  ok("missing service-role durable storage fails closed before claiming");
}

{
  const target = item();
  let providerCalls = 0;
  let stripeCalls = 0;
  let failureCode = "";
  const result = await runCommerceFulfilmentOutboxWorker({}, dependencies([target], {
    providerExecutionEnabled: () => false,
    retrieveStripeSession: async () => { stripeCalls += 1; return session(target); },
    createProviderDraft: async () => { providerCalls += 1; throw new Error("must_not_run"); },
    fail: async (input) => {
      failureCode = input.errorCode;
      return { status: "retryable_failed", retryAfterSeconds: 15 };
    },
  }));
  assert.equal(result.configurationBlockedCount, 1);
  assert.equal(providerCalls, 0);
  assert.equal(stripeCalls, 0);
  assert.equal(failureCode, "commerce_outbox_execution_kill_switch_closed");
  ok("closed production execution switch prevents all external calls");
}

{
  const target = item();
  let providerCalls = 0;
  let settledRetryable: boolean | null = null;
  const result = await runCommerceFulfilmentOutboxWorker({}, dependencies([target], {
    retrieveStripeSession: async () => ({ ...session(target), amount_total: 999 }) as Stripe.Checkout.Session,
    createProviderDraft: async () => { providerCalls += 1; throw new Error("must_not_run"); },
    fail: async (input) => {
      settledRetryable = input.retryable;
      return { status: "dead_letter", retryAfterSeconds: null };
    },
  }));
  assert.equal(result.deadLetteredCount, 1);
  assert.equal(providerCalls, 0);
  assert.equal(settledRetryable, false);
  ok("authoritative payment mismatch dead-letters before provider egress");
}

{
  const target = item();
  target.durableOrderBinding = {
    ...target.durableOrderBinding,
    expectedAmountTotal: target.amountTotal + 1,
  };
  let stripeCalls = 0;
  let providerCalls = 0;
  let retryable: boolean | null = null;
  const result = await runCommerceFulfilmentOutboxWorker({}, dependencies([target], {
    retrieveStripeSession: async () => { stripeCalls += 1; return session(target); },
    createProviderDraft: async () => { providerCalls += 1; throw new Error("must_not_run"); },
    fail: async (input) => {
      retryable = input.retryable;
      return { status: "dead_letter", retryAfterSeconds: null };
    },
  }));
  assert.equal(result.deadLetteredCount, 1);
  assert.equal(retryable, false);
  assert.equal(stripeCalls, 0);
  assert.equal(providerCalls, 0);
  ok("outbox versus authoritative durable-order mismatch dead-letters before all external reads/effects");
}

{
  const target = item();
  let clock = 0;
  let releases = 0;
  let providerCalls = 0;
  const result = await runCommerceFulfilmentOutboxWorker({ deadlineMs: 2_000 }, dependencies([target], {
    now: () => clock,
    claimBatch: async () => {
      clock = 2_000;
      return { items: [target] };
    },
    release: async () => { releases += 1; },
    createProviderDraft: async () => { providerCalls += 1; throw new Error("must_not_run"); },
  }));
  assert.equal(result.releasedByDeadlineCount, 1);
  assert.equal(releases, 1);
  assert.equal(providerCalls, 0);
  ok("deadline exhaustion releases lease before any provider effect");
}

{
  const target = item();
  const receipts: CommerceFulfilmentExecutionReceipt[] = [];
  await runCommerceFulfilmentOutboxWorker({}, dependencies([target], {
    complete: async (input) => { receipts.push(input.receipt); },
  }));
  const receipt = receipts[0];
  assert.ok(receipt);
  const serialized = JSON.stringify(receipt);
  assert.match(receipt.receiptDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(receipt.requestBindingDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(receipt.stripePaymentIntentIdHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(receipt.requestId, target.requestId);
  assert.equal(receipt.orderDraftId, target.orderDraftId);
  assert.equal(receipt.providerResult.externalId, target.orderDraftId);
  assert.doesNotMatch(serialized, /customer@example|street address|secret-token/i);
  ok("redacted receipt binds request, order, payment intent and provider result");
}

{
  const raw = JSON.stringify({ action: "drain", limit: 5 });
  const path = "/api/internal/workers/commerce-fulfilment-outbox";
  const secret = "pass4994-worker-secret-current-0000000000000000";
  const issued = issueMarketIntegrityWorkerMutationEnvelope({
    secret,
    keyId: "current",
    path,
    rawBody: raw,
    nonce: "pass4994_worker_nonce_000001",
    issuedAt: "2026-07-18T00:00:00.000Z",
  });
  const previous = process.env.VELMERE_WORKER_INTERNAL_WORKERS_COMMERCE_FULFILMENT_OUTBOX_SECRET_CURRENT;
  process.env.VELMERE_WORKER_INTERNAL_WORKERS_COMMERCE_FULFILMENT_OUTBOX_SECRET_CURRENT = secret;
  try {
    const request = new Request(`https://velmere.invalid${path}`, {
      method: "POST",
      headers: issued.headers,
      body: raw,
    });
    assert.equal(verifyMarketIntegrityWorkerMutationEnvelope({
      request,
      rawBody: raw,
      now: "2026-07-18T00:00:01.000Z",
    }).authorized, true);
    assert.equal(verifyMarketIntegrityWorkerMutationEnvelope({
      request,
      rawBody: JSON.stringify({ action: "drain", limit: 6 }),
      now: "2026-07-18T00:00:01.000Z",
    }).authorized, false);
  } finally {
    if (previous === undefined) delete process.env.VELMERE_WORKER_INTERNAL_WORKERS_COMMERCE_FULFILMENT_OUTBOX_SECRET_CURRENT;
    else process.env.VELMERE_WORKER_INTERNAL_WORKERS_COMMERCE_FULFILMENT_OUTBOX_SECRET_CURRENT = previous;
  }
  ok("worker POST signature binds path, scope, body, time and rotating current key");
}

{
  const migration = fs.readFileSync(
    "supabase/migrations/20260718000004_4994_commerce_fulfilment_outbox_worker.sql",
    "utf8",
  );
  const schema = fs.readFileSync("lib/db/schema.sql", "utf8");
  const canonical = schema.match(
    /-- PASS4994 COMMERCE FULFILMENT OUTBOX WORKER BEGIN[\s\S]*?-- PASS4994 COMMERCE FULFILMENT OUTBOX WORKER END/,
  );
  assert.ok(canonical);
  assert.equal(`${canonical[0]}\n`, migration);
  for (const required of [
    "for update skip locked",
    "coalesce(o.leased_until, '-infinity'::timestamptz) <= now()",
    "coalesce(auth.role(), '') <> 'service_role'",
    "from public, anon, authenticated",
    "to service_role",
    "v_item.status is distinct from 'processing' or v_item.lease_token is distinct from p_lease_token",
    "power(2::numeric",
    "get_byte(",
    "least(3600, v_base_seconds + v_jitter_seconds)",
    "status = 'dead_letter'",
    "status = 'retryable_failed'",
    "status = 'manual_fulfilment_required'",
    "on conflict (idempotency_key) do nothing",
    "velmere_guard_paid_commerce_order_binding_immutable",
    "new.line_items is distinct from old.line_items",
    "order_expected_amount_total bigint",
    "commerce_outbox_worker_completion_idempotency_conflict",
    "v_item.execution_receipt->>'receiptDigest' is not distinct from",
    "velmere.commerce-fulfilment-request-binding.v1",
    "velmere_is_commerce_fulfilment_receipt_redacted",
    "jsonb_object_keys(p_receipt) as keys(key)",
    "p_execution_receipt->>'attempt' is distinct from v_item.attempt_count::text",
  ]) assert.ok(migration.toLowerCase().includes(required.toLowerCase()), required);
  assert.doesNotMatch(migration, /customer_email|shipping_details|billing_details|raw_provider_payload/i);
  ok("PASS4994 SQL is canonical, service-role/RLS-only, leased, atomic and PII-free");
}

{
  const routeSurface = readCurrentConsolidatedRoute("/api/internal/workers/commerce-fulfilment-outbox");
  const route = routeSurface.handlerSource;
  assert.deepEqual(routeSurface.methods.sort(), ["GET", "POST"]);
  assert.match(routeSurface.dispatcherSource, /unknown_internal_worker/);
  const worker = fs.readFileSync("lib/orders/commerce-fulfilment-outbox-worker.ts", "utf8");
  const printful = fs.readFileSync("lib/printful/orders.ts", "utf8");
  const registry = fs.readFileSync("lib/db/supabase-rpc-operation-registry.ts", "utf8");
  assert.match(route, /authorizeMarketIntegrityWorkerMutation/);
  assert.match(route, /verifyMarketIntegrityWorkerMutationEnvelope/);
  assert.match(route, /export function GET\(\)/);
  assert.match(route, /mutation_requires_signed_post/);
  assert.match(worker, /VELMERE_COMMERCE_FULFILMENT_EXECUTION_ENABLED/);
  assert.match(worker, /completionWriteFailedCount/);
  assert.match(worker, /next run reconciles by external_id/);
  assert.match(printful, /external_id: order\.id/);
  assert.match(printful, /findPrintfulOrderByExternalId\(order\.id\)/);
  for (const operation of ["claim", "complete", "fail", "release"]) {
    assert.match(registry, new RegExp(`commerce_fulfilment_outbox_${operation}`));
  }
  ok("route, kill switch, provider external_id idempotency and registered RPC boundary are present");
}

console.log(`PASS4994 commerce fulfilment outbox worker ${passed}/15; externalLiveCalls=0`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
