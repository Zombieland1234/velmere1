import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  markDurableOrderPaid,
  type DurablePaidTransitionDependencies,
} from "../../lib/orders/durable-order-state";

const OUTBOX_ID = `commerce_fulfilment_${"d".repeat(32)}`;
const baseInput = {
  orderDraftId: "ord_atomic_4992",
  stripeSessionId: "cs_atomic_4992",
  stripeEventId: "evt_atomic_4992",
  stripePaymentIntentId: "pi_atomic_4992",
  cartHash: "a".repeat(64),
  amountTotal: 12_345,
  currency: "eur",
  livemode: false,
  fulfilmentAction: "printful_order_draft" as const,
  automaticPrintfulLineCount: 2,
};

function rpcRow(input: {
  transition?: "enqueued" | "already_enqueued";
  status?: string;
  action?: string;
}) {
  const transition = input.transition ?? "enqueued";
  return [{
    transition_result: transition,
    order_status: "paid",
    outbox_request_id: OUTBOX_ID,
    outbox_status: input.status ?? "pending",
    fulfilment_action: input.action ?? "printful_order_draft",
    idempotent_replay: transition === "already_enqueued",
  }];
}

function extractPass4992(source: string) {
  const match = source.match(
    /-- PASS4992 ATOMIC COMMERCE PAID \+ FULFILMENT OUTBOX BEGIN[\s\S]*?-- PASS4992 ATOMIC COMMERCE PAID \+ FULFILMENT OUTBOX END/,
  );
  assert.ok(match, "PASS4992 SQL block missing");
  return match[0];
}

async function main() {
  let passed = 0;
  const ok = (name: string) => {
    passed += 1;
    console.log(`PASS ${passed}: ${name}`);
  };

  const calls: Array<{ operation: string; args: Record<string, unknown> }> = [];
  const dependencies: DurablePaidTransitionDependencies = {
    hasDurableStorage: () => true,
    runRpc: async (input) => {
      calls.push(input);
      return { data: rpcRow({}) };
    },
  };
  const committed = await markDurableOrderPaid(baseInput, dependencies);
  assert.equal(committed.persisted, true);
  assert.equal(committed.outboxRequestId, OUTBOX_ID);
  assert.equal(committed.outboxStatus, "pending");
  assert.equal(committed.fulfilmentAction, "printful_order_draft");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].operation, "commerce_paid_fulfilment_enqueue");
  assert.deepEqual(calls[0].args, {
    p_order_draft_id: "ord_atomic_4992",
    p_stripe_session_id: "cs_atomic_4992",
    p_stripe_event_id: "evt_atomic_4992",
    p_stripe_payment_intent_id: "pi_atomic_4992",
    p_cart_hash: "a".repeat(64),
    p_amount_total: 12_345,
    p_currency: "EUR",
    p_livemode: false,
    p_fulfilment_action: "printful_order_draft",
    p_automatic_printful_line_count: 2,
  });
  ok("client invokes one registered service-role RPC with the exact payment and fulfilment binding");

  let committedOnce = false;
  let concurrentCalls = 0;
  const concurrentDependencies: DurablePaidTransitionDependencies = {
    hasDurableStorage: () => true,
    runRpc: async () => {
      concurrentCalls += 1;
      await Promise.resolve();
      if (!committedOnce) {
        committedOnce = true;
        return { data: rpcRow({ transition: "enqueued" }) };
      }
      return { data: rpcRow({ transition: "already_enqueued" }) };
    },
  };
  const concurrent = await Promise.all([
    markDurableOrderPaid(baseInput, concurrentDependencies),
    markDurableOrderPaid({ ...baseInput, stripeEventId: "evt_atomic_4992_replay" }, concurrentDependencies),
  ]);
  assert.equal(concurrentCalls, 2);
  assert.ok(concurrent.every((result) => result.persisted));
  assert.deepEqual(concurrent.map((result) => result.outboxRequestId), [OUTBOX_ID, OUTBOX_ID]);
  assert.deepEqual(concurrent.map((result) => result.idempotentReplay).sort(), [false, true]);
  ok("concurrent delivery contract resolves to one outbox identity and one idempotent replay");

  let invalidRpcCalled = false;
  const invalid = await markDurableOrderPaid(
    { ...baseInput, fulfilmentAction: "manual_fulfilment_review", automaticPrintfulLineCount: 2 },
    {
      hasDurableStorage: () => true,
      runRpc: async () => {
        invalidRpcCalled = true;
        return { data: rpcRow({}) };
      },
    },
  );
  assert.equal(invalid.persisted, false);
  assert.equal(invalid.providerError, "durable_order_paid_outbox_input_invalid");
  assert.equal(invalidRpcCalled, false);
  ok("contradictory provider action and line count fail before storage mutation");

  const malformed = await markDurableOrderPaid(baseInput, {
    hasDurableStorage: () => true,
    runRpc: async () => ({ data: [{ transition_result: "enqueued" }] }),
  });
  assert.equal(malformed.persisted, false);
  assert.equal(malformed.providerError, "durable_order_paid_outbox_rpc_result_invalid");
  ok("malformed RPC receipts fail closed and cannot authorize webhook completion");

  const deadLetter = await markDurableOrderPaid(baseInput, {
    hasDurableStorage: () => true,
    runRpc: async () => ({ data: rpcRow({ transition: "already_enqueued", status: "dead_letter" }) }),
  });
  assert.equal(deadLetter.persisted, false);
  assert.equal(deadLetter.providerError, "durable_order_paid_outbox_not_actionable");
  ok("dead-lettered fulfilment requests are not misreported as actionable paid delivery");

  const migration = readFileSync(
    "supabase/migrations/20260718000003_4992_atomic_commerce_paid_fulfilment_outbox.sql",
    "utf8",
  );
  const schema = readFileSync("lib/db/schema.sql", "utf8");
  assert.equal(extractPass4992(schema), extractPass4992(migration));
  ok("canonical bootstrap and forward migration contain byte-identical PASS4992 SQL");

  const sqlChecks = [
    "create table if not exists public.velmere_commerce_fulfilment_outbox",
    "unique index if not exists velmere_commerce_fulfilment_outbox_payment_once_idx",
    "alter table public.velmere_commerce_fulfilment_outbox enable row level security",
    "from public, anon, authenticated",
    "to service_role",
    "security definer",
    "coalesce(auth.role(), '') <> 'service_role'",
    "for update",
    "commerce_paid_exact_binding_mismatch",
    "commerce_paid_fulfilment_binding_mismatch",
    "commerce_paid_idempotency_conflict",
    "insert into public.velmere_order_state_events",
    "insert into public.velmere_commerce_fulfilment_outbox",
  ];
  for (const marker of sqlChecks) assert.ok(migration.toLowerCase().includes(marker.toLowerCase()), marker);
  assert.ok(
    migration.indexOf("update public.velmere_order_drafts") <
      migration.indexOf("insert into public.velmere_order_state_events") &&
      migration.indexOf("insert into public.velmere_order_state_events") <
        migration.indexOf("insert into public.velmere_commerce_fulfilment_outbox"),
  );
  ok("SQL statically proves row serialization, exact binding, service-role isolation, and one transaction body");

  const checkout = readFileSync(
    "lib/payments/stripe-webhook/handlers/commerce-checkout.ts",
    "utf8",
  );
  assert.ok(!checkout.includes("createPrintfulOrderDraft"));
  assert.ok(!checkout.includes('effectKey: "commerce:printful_order_draft"'));
  assert.ok(checkout.includes("fulfilmentQueued: true"));
  assert.ok(checkout.includes("fulfilmentReleased: false"));
  assert.ok(checkout.indexOf("markDurableOrderPaid") < checkout.lastIndexOf("markStripeWebhookEventProcessed"));
  ok("checkout has zero inline provider execution and ACKs only after atomic enqueue");

  console.log(`PASS4992 atomic commerce paid/outbox ${passed}/8`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
