import assert from "node:assert/strict";
import type { VelmereAdminSession } from "../../lib/admin/session-roles.js";
import {
  createPaymentIndependentApprovalForServerTest,
  createPaymentOperatorAssertionForServerTest,
  executePaymentOperatorAction,
  PaymentOperatorAuthorizationError,
} from "../../lib/payments/payment-operator-assertions.js";
import type { SupabaseRpcClient } from "../../lib/db/bounded-supabase-rpc.js";

let assertions = 0;
const ok = (value: unknown, message: string) => { assertions += 1; assert.ok(value, message); };
const equal = (actual: unknown, expected: unknown, message: string) => { assertions += 1; assert.equal(actual, expected, message); };

const NOW = 1_900_000_000_000;
const env: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  PAYMENTS_MODE: "test",
  STRIPE_SECRET_KEY: "sk_test_a97r1_secret",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_a97r1_public",
  STRIPE_WEBHOOK_SECRET: "whsec_a97r1_webhook",
  VELMERE_PAYMENT_OPERATOR_ASSERTION_SECRET: "a97r1-primary-assertion-secret-1234567890",
  VELMERE_PAYMENT_INDEPENDENT_APPROVAL_SECRET: "a97r1-independent-approval-secret-12345",
};

const operator: VelmereAdminSession = {
  schemaVersion: "velmere.admin-session.v1",
  actorId: "operator-a97r1",
  role: "operator",
  scopes: ["payment:reconcile", "payment:requeue"],
  issuedAt: NOW - 60_000,
  expiresAt: NOW + 30 * 60_000,
  sessionId: "adm_operator_a97r1_session",
};

function fakeDurableClient() {
  const usedPrimary = new Set<string>();
  const usedApproval = new Set<string>();
  let calls = 0;
  const client: SupabaseRpcClient = {
    rpc(name, args = {}) {
      calls += 1;
      assert.equal(name, "velmere_consume_payment_operator_action_assertion");
      const primary = String(args.p_primary_assertion_id_hash ?? "");
      const approval = args.p_independent_approval_id_hash ? String(args.p_independent_approval_id_hash) : "";
      const duplicate = usedPrimary.has(primary) || (approval && usedApproval.has(approval));
      if (!duplicate) {
        usedPrimary.add(primary);
        if (approval) usedApproval.add(approval);
      }
      return Promise.resolve({ data: duplicate ? "already_consumed" : "consumed", error: null });
    },
  };
  return { client, calls: () => calls };
}

async function expectCode(promise: Promise<unknown>, code: PaymentOperatorAuthorizationError["code"], message: string) {
  let caught: unknown;
  try { await promise; } catch (error) { caught = error; }
  ok(caught instanceof PaymentOperatorAuthorizationError, `${message}: must throw authorization error`);
  if (caught instanceof PaymentOperatorAuthorizationError) equal(caught.code, code, `${message}: exact code`);
}

const reconcilePath = "/api/admin/payments/stripe-webhook-reconcile";
const reconcileBody = JSON.stringify({ staleAfterSeconds: 300, retryThreshold: 5, limit: 25, deadlineMs: 5000 });
const reconcileToken = createPaymentOperatorAssertionForServerTest({
  session: operator,
  scope: "payment:reconcile",
  path: reconcilePath,
  rawBody: reconcileBody,
  assertionId: "assertion_a97r1_reconcile_0001",
  nowMs: NOW,
  env,
});

{
  const durable = fakeDurableClient();
  let actionCalls = 0;
  const result = await executePaymentOperatorAction({
    session: operator,
    scope: "payment:reconcile",
    method: "POST",
    path: reconcilePath,
    rawBody: reconcileBody,
    assertionToken: reconcileToken,
    nowMs: NOW + 1000,
    env,
    clientOverride: durable.client,
    execute: async () => { actionCalls += 1; return { healthy: true }; },
  });
  ok(result.consumption.consumed, "valid reconcile assertion must be consumed");
  equal(result.authorization.independentApprovalIdHash, null, "reconcile must not carry independent approval");
  equal(durable.calls(), 1, "valid reconcile must perform one durable consumption");
  equal(actionCalls, 1, "valid reconcile must execute exactly once");

  await expectCode(executePaymentOperatorAction({
    session: operator,
    scope: "payment:reconcile",
    method: "POST",
    path: reconcilePath,
    rawBody: reconcileBody,
    assertionToken: reconcileToken,
    nowMs: NOW + 2000,
    env,
    clientOverride: durable.client,
    execute: async () => { actionCalls += 1; return { healthy: false }; },
  }), "payment_operator_assertion_already_consumed", "reconcile replay");
  equal(actionCalls, 1, "replayed assertion must not execute action");
}

{
  const durable = fakeDurableClient();
  let actionCalls = 0;
  await expectCode(executePaymentOperatorAction({
    session: operator,
    scope: "payment:reconcile",
    method: "POST",
    path: reconcilePath,
    rawBody: `${reconcileBody} `,
    assertionToken: reconcileToken,
    nowMs: NOW + 1000,
    env,
    clientOverride: durable.client,
    execute: async () => { actionCalls += 1; return true; },
  }), "payment_operator_assertion_binding_mismatch", "body-byte tamper");
  equal(durable.calls(), 0, "body tamper must not consume assertion");
  equal(actionCalls, 0, "body tamper must not execute action");
}

{
  const durable = fakeDurableClient();
  let actionCalls = 0;
  await expectCode(executePaymentOperatorAction({
    session: operator,
    scope: "payment:reconcile",
    method: "POST",
    path: reconcilePath,
    rawBody: reconcileBody,
    assertionToken: null,
    nowMs: NOW,
    env,
    clientOverride: durable.client,
    execute: async () => { actionCalls += 1; return true; },
  }), "payment_operator_assertion_missing", "missing assertion");
  equal(durable.calls(), 0, "missing assertion must not reach durable store");
  equal(actionCalls, 0, "missing assertion must not execute action");
}

{
  const stale = createPaymentOperatorAssertionForServerTest({
    session: operator,
    scope: "payment:reconcile",
    path: reconcilePath,
    rawBody: reconcileBody,
    assertionId: "assertion_a97r1_reconcile_stale",
    nowMs: NOW - 7 * 60_000,
    recentAuthAtMs: NOW - 7 * 60_000,
    expiresAtMs: NOW + 60_000,
    env,
  });
  await expectCode(executePaymentOperatorAction({
    session: operator, scope: "payment:reconcile", method: "POST", path: reconcilePath,
    rawBody: reconcileBody, assertionToken: stale, nowMs: NOW, env,
    clientOverride: fakeDurableClient().client, execute: async () => true,
  }), "payment_operator_assertion_stale_auth", "stale signed assertion");
}

{
  const staleAuth = createPaymentOperatorAssertionForServerTest({
    session: operator,
    scope: "payment:reconcile",
    path: reconcilePath,
    rawBody: reconcileBody,
    assertionId: "assertion_a97r1_reconcile_staleauth",
    nowMs: NOW,
    recentAuthAtMs: NOW - 6 * 60_000,
    env,
  });
  await expectCode(executePaymentOperatorAction({
    session: operator, scope: "payment:reconcile", method: "POST", path: reconcilePath,
    rawBody: reconcileBody, assertionToken: staleAuth, nowMs: NOW, env,
    clientOverride: fakeDurableClient().client, execute: async () => true,
  }), "payment_operator_assertion_stale_auth", "stale recent authentication");
}

{
  const badMfa = createPaymentOperatorAssertionForServerTest({
    session: operator,
    scope: "payment:reconcile",
    path: reconcilePath,
    rawBody: reconcileBody,
    assertionId: "assertion_a97r1_reconcile_badmfa",
    nowMs: NOW,
    mfaMethod: "totp",
    env,
  });
  await expectCode(executePaymentOperatorAction({
    session: operator, scope: "payment:reconcile", method: "POST", path: reconcilePath,
    rawBody: reconcileBody, assertionToken: badMfa, nowMs: NOW, env,
    clientOverride: fakeDurableClient().client, execute: async () => true,
  }), "payment_operator_assertion_invalid", "non-phishing-resistant MFA");
}

{
  const badPath = createPaymentOperatorAssertionForServerTest({
    session: operator,
    scope: "payment:reconcile",
    path: "/api/admin/payments/other",
    rawBody: reconcileBody,
    assertionId: "assertion_a97r1_reconcile_badpath",
    nowMs: NOW,
    env,
  });
  await expectCode(executePaymentOperatorAction({
    session: operator, scope: "payment:reconcile", method: "POST", path: reconcilePath,
    rawBody: reconcileBody, assertionToken: badPath, nowMs: NOW, env,
    clientOverride: fakeDurableClient().client, execute: async () => true,
  }), "payment_operator_assertion_binding_mismatch", "path mismatch");
}

{
  const liveEnv = { ...env, PAYMENTS_MODE: "live", STRIPE_SECRET_KEY: "sk_live_a97r1", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_a97r1" };
  await expectCode(executePaymentOperatorAction({
    session: operator, scope: "payment:reconcile", method: "POST", path: reconcilePath,
    rawBody: reconcileBody, assertionToken: reconcileToken, nowMs: NOW, env: liveEnv,
    clientOverride: fakeDurableClient().client, execute: async () => true,
  }), "payment_operator_runtime_mode_blocked", "live-mode authority");
}

const requeuePath = "/api/admin/payments/stripe-webhook-dead-letter";
const requeueBody = JSON.stringify({ eventId: "evt_a97r1_0001", effectKey: "vlm_paid_access", requestId: "request_a97r1_0001", reasonCode: "verified_transient_provider_recovery" });
const requeueToken = createPaymentOperatorAssertionForServerTest({
  session: operator,
  scope: "payment:requeue",
  path: requeuePath,
  rawBody: requeueBody,
  assertionId: "assertion_a97r1_requeue_0001",
  nowMs: NOW,
  env,
});

{
  const durable = fakeDurableClient();
  let actionCalls = 0;
  await expectCode(executePaymentOperatorAction({
    session: operator, scope: "payment:requeue", method: "POST", path: requeuePath,
    rawBody: requeueBody, assertionToken: requeueToken, nowMs: NOW, env,
    clientOverride: durable.client, execute: async () => { actionCalls += 1; return true; },
  }), "payment_operator_approval_missing", "requeue without independent approval");
  equal(durable.calls(), 0, "missing requeue approval must not consume assertion");
  equal(actionCalls, 0, "missing requeue approval must not execute action");
}

{
  const sameActorApproval = createPaymentIndependentApprovalForServerTest({
    primaryAssertionToken: requeueToken,
    approverActorId: operator.actorId,
    approverSessionId: operator.sessionId,
    path: requeuePath,
    rawBody: requeueBody,
    approvalId: "approval_a97r1_same_actor_0001",
    nowMs: NOW,
    env,
  });
  const durable = fakeDurableClient();
  let actionCalls = 0;
  await expectCode(executePaymentOperatorAction({
    session: operator, scope: "payment:requeue", method: "POST", path: requeuePath,
    rawBody: requeueBody, assertionToken: requeueToken, independentApprovalToken: sameActorApproval,
    nowMs: NOW, env, clientOverride: durable.client,
    execute: async () => { actionCalls += 1; return true; },
  }), "payment_operator_approval_not_independent", "same actor approval");
  equal(durable.calls(), 0, "same actor approval must not consume assertion");
  equal(actionCalls, 0, "same actor approval must not execute action");
}

{
  const approval = createPaymentIndependentApprovalForServerTest({
    primaryAssertionToken: requeueToken,
    approverActorId: "owner-a97r1-independent",
    approverSessionId: "adm_owner_a97r1_independent_session",
    path: requeuePath,
    rawBody: requeueBody,
    approvalId: "approval_a97r1_independent_0001",
    nowMs: NOW,
    env,
  });
  const durable = fakeDurableClient();
  let actionCalls = 0;
  const first = await executePaymentOperatorAction({
    session: operator, scope: "payment:requeue", method: "POST", path: requeuePath,
    rawBody: requeueBody, assertionToken: requeueToken, independentApprovalToken: approval,
    nowMs: NOW + 1000, env, clientOverride: durable.client,
    execute: async () => { actionCalls += 1; return { status: "requeued" }; },
  });
  ok(Boolean(first.authorization.independentApprovalIdHash), "valid requeue must bind independent approval hash");
  equal(first.authorization.approverActorIdHash === first.authorization.actorIdHash, false, "approver must be distinct");
  equal(durable.calls(), 1, "valid requeue must consume one atomic authorization");
  equal(actionCalls, 1, "valid requeue must execute once");

  await expectCode(executePaymentOperatorAction({
    session: operator, scope: "payment:requeue", method: "POST", path: requeuePath,
    rawBody: requeueBody, assertionToken: requeueToken, independentApprovalToken: approval,
    nowMs: NOW + 2000, env, clientOverride: durable.client,
    execute: async () => { actionCalls += 1; return { status: "requeued" }; },
  }), "payment_operator_assertion_already_consumed", "requeue assertion replay");
  equal(actionCalls, 1, "replayed requeue must not execute twice");
}

{
  const reconcileScopeToken = createPaymentOperatorAssertionForServerTest({
    session: operator,
    scope: "payment:reconcile",
    path: requeuePath,
    rawBody: requeueBody,
    assertionId: "assertion_a97r1_wrong_scope_0001",
    nowMs: NOW,
    env,
  });
  await expectCode(executePaymentOperatorAction({
    session: operator, scope: "payment:requeue", method: "POST", path: requeuePath,
    rawBody: requeueBody, assertionToken: reconcileScopeToken, independentApprovalToken: "bad",
    nowMs: NOW, env, clientOverride: fakeDurableClient().client, execute: async () => true,
  }), "payment_operator_assertion_binding_mismatch", "scope substitution");
}

const tamperedToken = `${reconcileToken.slice(0, -1)}${reconcileToken.endsWith("A") ? "B" : "A"}`;
await expectCode(executePaymentOperatorAction({
  session: operator, scope: "payment:reconcile", method: "POST", path: reconcilePath,
  rawBody: reconcileBody, assertionToken: tamperedToken, nowMs: NOW, env,
  clientOverride: fakeDurableClient().client, execute: async () => true,
}), "payment_operator_assertion_invalid", "signature tamper");

console.log(JSON.stringify({
  ok: true,
  passId: "PASS36_A97R1_PAYMENT_OPERATOR_ASSERTION_DUAL_CONTROL",
  assertions,
  reconcileValidActions: 1,
  requeueValidActions: 1,
  blockedActionExecutions: 0,
  bodyBound: true,
  singleUse: true,
  independentApprovalRequiredForRequeue: true,
  realOperatorSessions: 0,
  realStripeRequeues: 0,
  truthBoundary: "Local cryptographic and provider-spy harness only; no real identity-provider reauthentication, durable Supabase execution or Stripe staging credit.",
}, null, 2));
