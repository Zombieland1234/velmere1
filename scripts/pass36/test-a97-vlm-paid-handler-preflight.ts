import assert from "node:assert/strict";
import {
  handleVlmPaidAccess,
  vlmPaidAccessDependencies,
  type VlmPaidAccessDependencies,
} from "../../lib/payments/stripe-webhook/handlers/vlm-paid-access";
import { StripeWebhookTerminalEffectError } from "../../lib/payments/stripe-webhook-effect-ledger";

let assertions = 0;
function equal<T>(actual: T, expected: T, message: string) {
  assertions += 1;
  assert.equal(actual, expected, message);
}
function ok(value: unknown, message: string): asserts value {
  assertions += 1;
  assert.ok(value, message);
}

const context = {
  event: {
    id: "evt_a97_vlm_handler_001",
    type: "checkout.session.completed",
    created: Math.floor(Date.now() / 1_000),
    livemode: false,
    data: { object: {} },
  },
  stripe: {},
  attempt: 1,
} as never;
const session = {
  id: "cs_a97_vlm_handler_001",
  metadata: { kind: "vlm_paid_access" },
} as never;

async function runCase(verdict: { ok: false; error: string; retryable: boolean; terminal: boolean }) {
  const effectCalls = { value: 0 };
  const entitlementCalls = { value: 0 };
  const deps = {
    ...vlmPaidAccessDependencies,
    verifyVlmPaidStripeReceipt: async () => verdict,
    runStripeWebhookEffect: async () => {
      effectCalls.value += 1;
      throw new Error("effect_must_not_run");
    },
    upsertVlmPaidEntitlementFromStripeSession: async () => {
      entitlementCalls.value += 1;
      throw new Error("entitlement_must_not_run");
    },
  } as unknown as VlmPaidAccessDependencies;
  let caught: unknown = null;
  try {
    await handleVlmPaidAccess(context, session, deps);
  } catch (error) {
    caught = error;
  }
  ok(caught instanceof Error, "blocked receipt must throw before effect execution");
  equal(effectCalls.value, 0, "blocked receipt must not claim or execute entitlement effect");
  equal(entitlementCalls.value, 0, "blocked receipt must not write entitlement ledger");
  return caught;
}

const terminal = await runCase({
  ok: false,
  error: "vlm_paid_session_price_mismatch",
  retryable: false,
  terminal: true,
});
ok(terminal instanceof StripeWebhookTerminalEffectError, "terminal receipt mismatch must dead-letter instead of retrying forever");

const retryable = await runCase({
  ok: false,
  error: "vlm_paid_payment_intent_retrieve_failed",
  retryable: true,
  terminal: false,
});
ok(!(retryable instanceof StripeWebhookTerminalEffectError), "temporary receipt dependency failure must remain retryable");

console.log(JSON.stringify({
  ok: true,
  passId: "PASS36_A97_VLM_PAID_HANDLER_RECEIPT_PREFLIGHT",
  assertions,
  effectCallsAfterBlockedReceipt: 0,
  entitlementWritesAfterBlockedReceipt: 0,
}, null, 2));
