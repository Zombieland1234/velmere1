import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { withPass4825BrokeredEgressTestTransport } from "../../lib/network/brokered-egress";
import {
  completePass4394ClientRequestJsonResponse,
  completePass4394ClientRequestMutation,
  failPass4394ClientRequestMutationRetryable,
  registerPass4394ClientRequestMutation,
} from "../../lib/security/client-request-idempotency";
import {
  PASS4395_UPSTASH_FINALIZE_LUA,
  PASS4395_UPSTASH_RESERVE_LUA,
} from "../../lib/security/durable-idempotency-store";
import {
  pass4396IdempotencyReplayResponse,
  resolvePass4396IdempotencyReplay,
  type Pass4396ReplaySurface,
} from "../../lib/security/idempotency-replay-response";

const originalEnv = { ...process.env };
let assertions = 0;

function equal<T>(actual: T, expected: T, message: string) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

function restoreEnvironment() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

function clearDurableEnvironment() {
  for (const key of [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "VELMERE_DURABLE_IDEMPOTENCY_REQUIRED",
    "VELMERE_IDEMPOTENCY_FAIL_CLOSED",
    "VERCEL",
    "VERCEL_ENV",
  ]) delete process.env[key];
}

function memoryEnvironment() {
  clearDurableEnvironment();
  process.env.NODE_ENV = "test";
}

function productionUpstashEnvironment() {
  clearDurableEnvironment();
  process.env.NODE_ENV = "production";
  process.env.VERCEL = "1";
  process.env.VERCEL_ENV = "production";
  process.env.UPSTASH_REDIS_REST_URL = "https://unit-upstash.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "unit-upstash-token-not-a-placeholder";
}

function mutationRequest(id: string) {
  return new Request("https://velmere.test/api/test/idempotency", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-velmere-client-request-id": id,
    },
  });
}

function register(args: {
  id: string;
  accountId?: string;
  actorId?: string;
  body: unknown;
}) {
  return registerPass4394ClientRequestMutation({
    request: mutationRequest(args.id),
    action: "test_mutation",
    targetType: "test_record",
    targetId: "record-1",
    accountId: args.accountId,
    actorId: args.actorId,
    body: args.body,
  });
}

async function testMemoryStateMachine() {
  memoryEnvironment();

  const accountA = await register({
    id: "account-scope",
    accountId: "account-a",
    body: { amount: 10 },
  });
  const accountB = await register({
    id: "account-scope",
    accountId: "account-b",
    body: { amount: 10 },
  });
  equal(accountA.state, "accepted_first_seen", "first account must acquire its scoped key");
  equal(accountB.state, "accepted_first_seen", "a second account must have an independent key");
  ok(accountA.accountScopeHash !== accountB.accountScopeHash, "account scopes must hash independently");
  ok(accountA.idempotencyKeyHash !== accountB.idempotencyKeyHash, "account scope must participate in the key");
  ok(!JSON.stringify(accountA).includes("account-a"), "raw account id must not enter the receipt");

  const bodyFirst = await register({
    id: "body-conflict",
    accountId: "account-body",
    body: { amount: 10, currency: "EUR" },
  });
  const bodyConflict = await register({
    id: "body-conflict",
    accountId: "account-body",
    body: { amount: 11, currency: "EUR" },
  });
  equal(bodyFirst.state, "accepted_first_seen", "first body fingerprint must acquire the key");
  equal(bodyConflict.state, "request_fingerprint_conflict", "same key with a changed body must conflict");
  equal(bodyConflict.ok, false, "a body mutation must not reach its side effect");
  equal(bodyConflict.pass4395Durable?.disposition, "REQUEST_FINGERPRINT_CONFLICT", "durable receipt must retain the conflict");

  const canonicalFirst = await register({
    id: "canonical-order",
    accountId: "account-canonical",
    body: { alpha: 1, beta: { x: true, y: false } },
  });
  const canonicalDuplicate = await register({
    id: "canonical-order",
    accountId: "account-canonical",
    body: { beta: { y: false, x: true }, alpha: 1 },
  });
  equal(canonicalFirst.bodyFingerprintHash, canonicalDuplicate.bodyFingerprintHash, "object-key order must not alter a semantic fingerprint");
  equal(canonicalDuplicate.state, "pending_blocked", "a canonical duplicate must be pending, not a false conflict");

  const raced = await Promise.all(
    Array.from({ length: 24 }, () => register({
      id: "race-24",
      accountId: "account-race",
      body: { operation: "single-effect" },
    })),
  );
  equal(raced.filter((receipt) => receipt.ok).length, 1, "exactly one of 24 racing requests must acquire PENDING");
  equal(raced.filter((receipt) => receipt.state === "pending_blocked").length, 23, "all racing losers must be fail-closed PENDING duplicates");

  const originalBody = {
    ok: true,
    data: {
      orderId: "order-123",
      attributes: { z: 3, a: 1 },
    },
  };
  const completedFirst = await register({
    id: "completed-replay",
    accountId: "account-complete",
    body: { sku: "advanced", quantity: 1 },
  });
  const completed = await completePass4394ClientRequestMutation({
    receipt: completedFirst,
    status: 201,
    body: originalBody,
  });
  equal(completed?.ok, true, "a PENDING request must atomically transition to COMPLETED");
  equal(completed?.state, "COMPLETED", "completion must expose the durable state");
  const completedDuplicate = await register({
    id: "completed-replay",
    accountId: "account-complete",
    body: { quantity: 1, sku: "advanced" },
  });
  equal(completedDuplicate.state, "completed_replay", "a completed duplicate must select outcome replay");
  equal(completedDuplicate.replayOutcome?.status, 201, "replay must preserve the original status");
  equal(completedDuplicate.replayOutcome?.body, originalBody, "replay must preserve the original JSON body");
  const replay = resolvePass4396IdempotencyReplay({
    surface: "commerce_checkout",
    pass4394Idempotency: completedDuplicate,
  });
  equal(replay.status, 201, "PASS4396 must return the stored original status");
  equal(replay.body, originalBody, "PASS4396 must return the stored original body");
  equal(replay.replayReceipt.originalOutcomeReplayed, true, "receipt must distinguish exact replay");
  (replay.body as { data: { orderId: string } }).data.orderId = "mutated-by-caller";
  const completedDuplicateAgain = await register({
    id: "completed-replay",
    accountId: "account-complete",
    body: { sku: "advanced", quantity: 1 },
  });
  equal(
    (completedDuplicateAgain.replayOutcome?.body as { data: { orderId: string } }).data.orderId,
    "order-123",
    "callers must receive a clone, not mutable durable state",
  );
  const conflictingCompletion = await completePass4394ClientRequestMutation({
    receipt: completedFirst,
    status: 202,
    body: { ok: true, changed: true },
  });
  equal(conflictingCompletion?.ok, false, "a second non-identical completion must fail closed");
  equal(conflictingCompletion?.reason, "completed_outcome_conflict", "completion conflict must be explicit");

  const retryFirst = await register({
    id: "retry-before-effect",
    accountId: "account-retry",
    body: { operation: "provider-call" },
  });
  const retryable = await failPass4394ClientRequestMutationRetryable({
    receipt: retryFirst,
    reasonCode: "provider_timeout_before_dispatch",
    sideEffectStarted: false,
  });
  equal(retryable?.ok, true, "an explicit pre-effect failure may become FAILED_RETRYABLE");
  equal(retryable?.state, "FAILED_RETRYABLE", "retryable transition must persist its state");
  const retrySecond = await register({
    id: "retry-before-effect",
    accountId: "account-retry",
    body: { operation: "provider-call" },
  });
  equal(retrySecond.state, "accepted_retryable_reacquired", "FAILED_RETRYABLE must be reacquired");
  equal(retrySecond.pass4395Durable?.attempt, 2, "reacquisition must increment the attempt");

  const afterEffect = await register({
    id: "no-retry-after-effect",
    accountId: "account-after-effect",
    body: { operation: "provider-call" },
  });
  const forbiddenRetry = await failPass4394ClientRequestMutationRetryable({
    receipt: afterEffect,
    reasonCode: "unknown_provider_outcome",
    sideEffectStarted: true,
  });
  equal(forbiddenRetry?.ok, false, "unknown post-dispatch outcomes must never be auto-retried");
  equal(forbiddenRetry?.reason, "retryable_transition_forbidden_after_side_effect_start", "post-effect retry denial must be explicit");
  const afterEffectDuplicate = await register({
    id: "no-retry-after-effect",
    accountId: "account-after-effect",
    body: { operation: "provider-call" },
  });
  equal(afterEffectDuplicate.state, "pending_blocked", "an unknown post-effect outcome must remain PENDING");

  let crashWindowEffectCalls = 0;
  const crashWindowFirst = await register({
    id: "crash-window",
    accountId: "account-crash",
    body: { operation: "effect-then-crash" },
  });
  if (crashWindowFirst.ok) crashWindowEffectCalls += 1;
  const crashWindowDuplicate = await register({
    id: "crash-window",
    accountId: "account-crash",
    body: { operation: "effect-then-crash" },
  });
  if (crashWindowDuplicate.ok) crashWindowEffectCalls += 1;
  equal(crashWindowEffectCalls, 1, "a crash-window duplicate must not execute the effect twice");
  equal(crashWindowDuplicate.state, "pending_blocked", "crash-window uncertainty must remain fail-closed");
  equal(crashWindowDuplicate.crossSystemEffectOutcomeAtomicityProven, false, "local state must not claim cross-system atomicity");

  const oversizeFirst = await register({
    id: "oversize-outcome",
    accountId: "account-oversize",
    body: { operation: "large-response" },
  });
  const oversize = await completePass4394ClientRequestMutation({
    receipt: oversizeFirst,
    status: 200,
    body: { value: "x".repeat(70_000) },
  });
  equal(oversize?.ok, false, "outcomes above the replay budget must fail closed");
  equal(oversize?.reason, "idempotency_outcome_body_too_large", "oversize outcomes must be explicit");
  const invalidStatus = await completePass4394ClientRequestMutation({
    receipt: oversizeFirst,
    status: 99,
    body: { ok: true },
  });
  equal(invalidStatus?.ok, false, "invalid HTTP statuses must not enter durable replay state");
  equal(invalidStatus?.reason, "idempotency_outcome_status_invalid", "invalid status must be explicit");
}

async function testFiveHandlerCallers() {
  memoryEnvironment();
  const callers: Array<{ file: string; surface: Pass4396ReplaySurface }> = [
    { file: "app/api/square/comments/route.ts", surface: "square_comment" },
    { file: "app/api/square/posts/route.ts", surface: "square_post" },
    { file: "app/api/contact/message/route.ts", surface: "contact_message" },
    { file: "app/api/checkout/route.ts", surface: "commerce_checkout" },
    { file: "app/api/checkout/vlm-service/route.ts", surface: "vlm_service_checkout" },
  ];
  for (const caller of callers) {
    const source = readFileSync(caller.file, "utf8");
    ok(
      source.includes("completePass4394ClientRequestJsonResponse"),
      `${caller.file} must commit terminal JSON outcomes`,
    );
    ok(
      source.includes("pass4396IdempotencyReplayResponse"),
      `${caller.file} must return exact completed outcome replay`,
    );

    let effectCalls = 0;
    const handler = async (request: Request) => {
      const receipt = await registerPass4394ClientRequestMutation({
        request,
        action: `handler_${caller.surface}`,
        targetType: caller.surface,
        accountId: `account_${caller.surface}`,
        body: { input: "same-semantic-body", surface: caller.surface },
      });
      if (!receipt.ok) {
        return pass4396IdempotencyReplayResponse({
          surface: caller.surface,
          pass4394Idempotency: receipt,
        });
      }
      effectCalls += 1;
      return completePass4394ClientRequestJsonResponse({
        receipt,
        status: 207,
        body: {
          ok: true,
          surface: caller.surface,
          effectReceipt: `effect_${caller.surface}`,
        },
      });
    };
    const requestId = `handler-race-${caller.surface}`;
    const [first, raced] = await Promise.all([
      handler(mutationRequest(requestId)),
      handler(mutationRequest(requestId)),
    ]);
    equal(effectCalls, 1, `${caller.surface} race must execute exactly one effect`);
    ok(
      [first.status, raced.status].every((status) => status === 207 || status === 409),
      `${caller.surface} race loser must be pending or exact replay`,
    );
    const replay = await handler(mutationRequest(requestId));
    equal(effectCalls, 1, `${caller.surface} completed replay must execute zero additional effects`);
    equal(replay.status, 207, `${caller.surface} must replay the exact terminal status`);
    equal(
      await replay.json(),
      {
        ok: true,
        surface: caller.surface,
        effectReceipt: `effect_${caller.surface}`,
      },
      `${caller.surface} must replay the exact terminal JSON body`,
    );
    equal(
      replay.headers.get("x-velmere-pass4396-original-outcome-replayed"),
      "true",
      `${caller.surface} must expose exact outcome replay without raw ids`,
    );
  }
}

async function testDurableProviderStateMachine() {
  productionUpstashEnvironment();
  const stored = new Map<string, string>();
  let providerCalls = 0;

  const durableResult = await withPass4825BrokeredEgressTestTransport(
    async (_target, init) => {
      providerCalls += 1;
      const command = JSON.parse(String(init.body)) as string[];
      equal(command[0], "EVAL", "durable adapter must use one atomic EVAL command");
      const script = command[1];
      const key = command[3];
      if (script === PASS4395_UPSTASH_RESERVE_LUA) {
        const pendingJson = command[4];
        const valueHash = command[5];
        const existingJson = stored.get(key);
        if (!existingJson) {
          stored.set(key, pendingJson);
          return Response.json({
            result: JSON.stringify({ decision: "STARTED", record: pendingJson }),
          });
        }
        const existing = JSON.parse(existingJson) as {
          valueHash: string;
          state: string;
        };
        const decision = existing.valueHash !== valueHash
          ? "REQUEST_CONFLICT"
          : existing.state === "COMPLETED"
            ? "REPLAY_COMPLETED"
            : "PENDING";
        return Response.json({
          result: JSON.stringify({ decision, record: existingJson }),
        });
      }
      equal(script, PASS4395_UPSTASH_FINALIZE_LUA, "second adapter operation must use the atomic finalizer");
      const existingJson = stored.get(key);
      ok(existingJson, "finalization must target an existing PENDING key");
      const existing = JSON.parse(existingJson) as Record<string, unknown>;
      equal(existing.valueHash, command[4], "finalization must bind the original fingerprint");
      equal(existing.state, "PENDING", "only PENDING may be completed");
      existing.state = command[5];
      existing.updatedAt = command[6];
      existing.outcome = JSON.parse(command[7]) as unknown;
      stored.set(key, JSON.stringify(existing));
      return Response.json({
        result: JSON.stringify({
          decision: command[5],
          record: JSON.stringify(existing),
        }),
      });
    },
    async () => {
      const first = await register({
        id: "durable-exact-replay",
        accountId: "durable-account",
        body: { beta: 2, alpha: 1 },
      });
      equal(first.storageMode, "upstash_rest_durable", "production reservation must use the durable adapter");
      equal(first.state, "accepted_first_seen", "durable first request must acquire PENDING");
      const completed = await completePass4394ClientRequestMutation({
        receipt: first,
        status: 202,
        body: { accepted: true, receiptId: "provider-123" },
      });
      equal(completed?.ok, true, "durable finalizer must commit the bounded outcome");
      const duplicate = await register({
        id: "durable-exact-replay",
        accountId: "durable-account",
        body: { alpha: 1, beta: 2 },
      });
      const replay = resolvePass4396IdempotencyReplay({
        surface: "vlm_service_checkout",
        pass4394Idempotency: duplicate,
      });
      equal(replay.status, 202, "durable replay must preserve provider status");
      equal(replay.body, { accepted: true, receiptId: "provider-123" }, "durable replay must preserve provider JSON");
      return duplicate;
    },
  );
  equal(durableResult.state, "completed_replay", "durable duplicate must select COMPLETED replay");
  equal(providerCalls, 3, "reserve, finalize and replay lookup must issue exactly three atomic provider calls");

  ok(PASS4395_UPSTASH_RESERVE_LUA.includes("'NX'"), "reserve script must atomically create the first PENDING record");
  ok(PASS4395_UPSTASH_RESERVE_LUA.includes("FAILED_RETRYABLE"), "reserve script must gate explicit retry reacquisition");
  ok(PASS4395_UPSTASH_FINALIZE_LUA.includes("state ~= 'PENDING'"), "finalizer must reject non-PENDING transitions");
  ok(PASS4395_UPSTASH_FINALIZE_LUA.includes("record.outcome"), "finalizer must store status/body in the same atomic record transition");

  productionUpstashEnvironment();
  let timeoutProviderCalls = 0;
  const timeout = await withPass4825BrokeredEgressTestTransport(
    async () => {
      timeoutProviderCalls += 1;
      return new Promise<Response>(() => undefined);
    },
    () => register({
      id: "durable-timeout",
      accountId: "durable-timeout-account",
      body: { operation: "timeout" },
    }),
  );
  equal(timeoutProviderCalls, 1, "provider timeout test must issue exactly one durable call");
  equal(timeout.state, "durable_unavailable", "durable provider timeout must fail closed");
  equal(timeout.storageMode, "durable_write_failed", "timeout must not fall back to memory");
  equal(timeout.pass4395Durable?.disposition, "DURABLE_UNAVAILABLE", "timeout disposition must be explicit");
  ok(
    timeout.pass4395Durable?.providerError?.includes("exceeded 2200ms"),
    "timeout receipt must preserve a bounded provider timeout reason",
  );
}

async function main() {
  await testMemoryStateMachine();
  await testFiveHandlerCallers();
  await testDurableProviderStateMachine();
  console.log(JSON.stringify({
    ok: true,
    schemaVersion: "velmere.idempotency-outcome-replay-test.v1",
    assertions,
    memoryRace: "24/24",
    durableProviderCalls: 4,
    accountBodyFingerprintBound: true,
    states: ["PENDING", "COMPLETED", "FAILED_RETRYABLE"],
    exactStatusBodyReplay: true,
    handlerCallers: "5/5",
    crashWindowDuplicatesFailClosed: true,
    crossSystemEffectOutcomeAtomicityProven: false,
    externalCalls: 0,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(restoreEnvironment);
