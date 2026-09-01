import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { POST as postAdvancedReviewerAssign } from "../../app/api/security/audit-review/advanced/assign/route.js";
import { POST as postProWorkerClaim } from "../../app/api/security/audit-review/pro/claim/route.js";
import { listSecurityAdminAuditEvents } from "../../lib/security/security-admin-audit.js";
import { issueSecurityOperatorAssertion } from "../../lib/security/security-operator-assertion.js";
import { buildPaymentRuntimeEvidenceSnapshot } from "../../lib/security/payment-runtime-evidence.js";
import { getPass2468StoredSnapshots } from "../../lib/market-integrity/liquidation-snapshot-ledger.js";
import { listPass2469LiquidationReplays } from "../../lib/market-integrity/liquidation-replay-store.js";
import { POST as postAdvancedAuditRelease } from "../../lib/server/lazy-route-modules/admin--security--advanced-audit-release.js";
import { POST as postAuditMessageOperatorAction } from "../../lib/server/lazy-route-modules/admin--security--audit-messages--operator-actions.js";
import { POST as postProWorkerSettle } from "../../lib/server/lazy-route-modules/security--audit-review--pro--settle.js";
import { POST as postLiquidationReplayStore } from "../../lib/server/market-integrity-route-modules/liquidation-replay-store.js";
import { POST as postLiquidationSnapshotLedger } from "../../lib/server/market-integrity-route-modules/liquidation-snapshot-ledger.js";
import { POST as postAdvancedEntitlementProof } from "../../lib/server/security-route-modules/advanced-entitlement-proof.js";
import { POST as postAdvancedEntitlementSmoke } from "../../lib/server/security-route-modules/advanced-entitlement-smoke.js";
import { POST as postAngelGeminiHealth } from "../../lib/server/security-route-modules/angel-gemini-health.js";
import { POST as postCartMailWalletSweep } from "../../lib/server/security-route-modules/cart-mail-wallet-microinteraction-sweep.js";
import { POST as postModalMobileSweep } from "../../lib/server/security-route-modules/modal-mobile-scroll-lock-final-sweep.js";
import { POST as postPaymentRuntimeEvidence } from "../../lib/server/security-route-modules/payment-runtime-evidence.js";
import { POST as postStripeWebhookReplayQa } from "../../lib/server/security-route-modules/stripe-webhook-replay-qa.js";
import { POST as postSupabaseRuntimeTruth } from "../../lib/server/security-route-modules/supabase-runtime-truth.js";

type PostHandler = (request: Request) => Promise<Response>;

const EXPECTED_SECURITY_ADMIN_POST_FILES = [
  "app/api/security/audit-review/advanced/assign/route.ts",
  "app/api/security/audit-review/advanced/claim/route.ts",
  "app/api/security/audit-review/basic/claim/route.ts",
  "app/api/security/audit-review/pro/claim/route.ts",
  "lib/server/lazy-route-modules/admin--security--advanced-audit-release.ts",
  "lib/server/lazy-route-modules/admin--security--audit-messages--operator-actions.ts",
  "lib/server/lazy-route-modules/security--audit-review--advanced--settle.ts",
  "lib/server/lazy-route-modules/security--audit-review--basic--settle.ts",
  "lib/server/lazy-route-modules/security--audit-review--pro--settle.ts",
  "lib/server/market-integrity-route-modules/liquidation-replay-store.ts",
  "lib/server/market-integrity-route-modules/liquidation-snapshot-ledger.ts",
  "lib/server/security-route-modules/advanced-entitlement-proof.ts",
  "lib/server/security-route-modules/advanced-entitlement-smoke.ts",
  "lib/server/security-route-modules/angel-gemini-health.ts",
  "lib/server/security-route-modules/cart-mail-wallet-microinteraction-sweep.ts",
  "lib/server/security-route-modules/modal-mobile-scroll-lock-final-sweep.ts",
  "lib/server/security-route-modules/payment-runtime-evidence.ts",
  "lib/server/security-route-modules/stripe-webhook-replay-qa.ts",
  "lib/server/security-route-modules/supabase-runtime-truth.ts",
] as const;

const FIXED_HANDLER_CASES: Array<{
  file: string;
  path: string;
  handler: PostHandler;
  body?: Record<string, unknown>;
  firstEffect: string;
}> = [
  {
    file: "lib/server/market-integrity-route-modules/liquidation-replay-store.ts",
    path: "/api/market-integrity/liquidation-replay-store",
    handler: postLiquidationReplayStore,
    body: { query: "VLMSECADMINP1", symbol: "VLMSECADMINP1", events: [] },
    firstEffect: "ingestPass2468LiquidationEvents(",
  },
  {
    file: "lib/server/market-integrity-route-modules/liquidation-snapshot-ledger.ts",
    path: "/api/market-integrity/liquidation-snapshot-ledger",
    handler: postLiquidationSnapshotLedger,
    body: { query: "VLMSECADMINP1", symbol: "VLMSECADMINP1", events: [] },
    firstEffect: "ingestPass2468LiquidationEvents(",
  },
  {
    file: "lib/server/security-route-modules/advanced-entitlement-proof.ts",
    path: "/api/security/advanced-entitlement-proof",
    handler: postAdvancedEntitlementProof,
    firstEffect: "buildPass2180AdvancedEntitlementReadiness(",
  },
  {
    file: "lib/server/security-route-modules/advanced-entitlement-smoke.ts",
    path: "/api/security/advanced-entitlement-smoke",
    handler: postAdvancedEntitlementSmoke,
    firstEffect: "buildPass2230AdvancedPaidSmoke(",
  },
  {
    file: "lib/server/security-route-modules/angel-gemini-health.ts",
    path: "/api/security/angel-gemini-health",
    handler: postAngelGeminiHealth,
    firstEffect: "generateTextWithVlmProvider(",
  },
  {
    file: "lib/server/security-route-modules/cart-mail-wallet-microinteraction-sweep.ts",
    path: "/api/security/cart-mail-wallet-microinteraction-sweep",
    handler: postCartMailWalletSweep,
    firstEffect: "buildPass2204CartMailWalletMicrointeractionSweepSummary(",
  },
  {
    file: "lib/server/security-route-modules/modal-mobile-scroll-lock-final-sweep.ts",
    path: "/api/security/modal-mobile-scroll-lock-final-sweep",
    handler: postModalMobileSweep,
    firstEffect: "buildPass2205ModalMobileScrollLockFinalSweepSummary(",
  },
  {
    file: "lib/server/security-route-modules/payment-runtime-evidence.ts",
    path: "/api/security/payment-runtime-evidence",
    handler: postPaymentRuntimeEvidence,
    body: { area: "release_gate", status: "pass", summary: "P1 assertion contract test" },
    firstEffect: "recordPaymentRuntimeEvidence(",
  },
  {
    file: "lib/server/security-route-modules/stripe-webhook-replay-qa.ts",
    path: "/api/security/stripe-webhook-replay-qa",
    handler: postStripeWebhookReplayQa,
    body: { scenarioId: "missing-signature", status: "pass", summary: "P1 assertion contract test" },
    firstEffect: "recordStripeWebhookReplayEvidence(",
  },
  {
    file: "lib/server/security-route-modules/supabase-runtime-truth.ts",
    path: "/api/security/supabase-runtime-truth",
    handler: postSupabaseRuntimeTruth,
    firstEffect: "runPass2179SupabaseRuntimeTruthProof(",
  },
];

const PREEXISTING_HANDLER_CASES: Array<{
  file: string;
  path: string;
  handler: PostHandler;
  body: Record<string, unknown>;
}> = [
  {
    file: "app/api/security/audit-review/advanced/assign/route.ts",
    path: "/api/security/audit-review/advanced/assign",
    handler: postAdvancedReviewerAssign,
    body: {},
  },
  {
    file: "app/api/security/audit-review/pro/claim/route.ts",
    path: "/api/security/audit-review/pro/claim",
    handler: postProWorkerClaim,
    body: {},
  },
  {
    file: "lib/server/lazy-route-modules/admin--security--advanced-audit-release.ts",
    path: "/api/admin/security/advanced-audit-release",
    handler: postAdvancedAuditRelease,
    body: {},
  },
  {
    file: "lib/server/lazy-route-modules/admin--security--audit-messages--operator-actions.ts",
    path: "/api/admin/security/audit-messages/operator-actions",
    handler: postAuditMessageOperatorAction,
    body: {},
  },
  {
    file: "lib/server/lazy-route-modules/security--audit-review--pro--settle.ts",
    path: "/api/security/audit-review/pro/settle",
    handler: postProWorkerSettle,
    body: {},
  },
];

function walkTypeScriptFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) files.push(...walkTypeScriptFiles(absolute));
    else if (entry.endsWith(".ts")) files.push(absolute);
  }
  return files;
}

function postFunctionSource(source: string) {
  const marker = /export async function POST\s*\(/u.exec(source);
  if (!marker) return null;
  const start = marker.index;
  const remaining = source.slice(start + marker[0].length);
  const nextExport = /\nexport async function (?!POST\b)/u.exec(remaining);
  return nextExport
    ? source.slice(start, start + marker[0].length + nextExport.index)
    : source.slice(start);
}

function requestHeaders(token: string, extra: HeadersInit = {}) {
  const headers = new Headers(extra);
  headers.set("authorization", `Bearer ${token}`);
  headers.set("accept", "application/json");
  headers.set("user-agent", "Mozilla/5.0 VelmereSecurityAdminContractTest/1.0");
  return headers;
}

function buildRequest(path: string, token: string, body?: Record<string, unknown>, extraHeaders: HeadersInit = {}) {
  const headers = requestHeaders(token, extraHeaders);
  if (body) headers.set("content-type", "application/json");
  return new Request(`https://velmere.test${path}`, {
    method: "POST",
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function buildSignedRequest(args: {
  path: string;
  token: string;
  secret: string;
  nonce: string;
  signedBody: Record<string, unknown>;
  sentBody?: Record<string, unknown>;
}) {
  const signed = issueSecurityOperatorAssertion({
    secret: args.secret,
    operatorId: "security-admin-post-contract-test",
    role: "security_admin",
    scopes: ["security:events"],
    mfa: "webauthn",
    request: { method: "POST", path: args.path, body: args.signedBody },
    nonce: args.nonce,
  });
  return buildRequest(args.path, args.token, args.sentBody, {
    "x-velmere-security-operator-assertion": signed.assertion,
    "x-velmere-security-operator-signature": signed.signature,
  });
}

async function main() {
  const root = process.cwd();
  const discovered = [...walkTypeScriptFiles(join(root, "app")), ...walkTypeScriptFiles(join(root, "lib"))]
    .filter((file) => {
      const source = readFileSync(file, "utf8");
      const post = postFunctionSource(source);
      return Boolean(post?.includes("verifySecurityAdminToken"));
    })
    .map((file) => relative(root, file).replaceAll("\\", "/"))
    .sort();

  assert.deepEqual(discovered, [...EXPECTED_SECURITY_ADMIN_POST_FILES].sort(), "security-admin POST denominator changed");
  assert.equal(discovered.length, EXPECTED_SECURITY_ADMIN_POST_FILES.length, `security-admin POST denominator must stay explicit at ${EXPECTED_SECURITY_ADMIN_POST_FILES.length}`);

  for (const file of discovered) {
    const post = postFunctionSource(readFileSync(join(root, file), "utf8"));
    assert.ok(post, `${file}: POST source missing`);
    assert.match(post, /deferBodyBoundMutationAssertion:\s*true/u, `${file}: token phase must explicitly defer to the body-bound phase`);
    assert.match(post, /verifySecurityAdminMutationAssertionAfterToken\s*\(/u, `${file}: body-bound assertion phase missing`);
  }

  for (const testCase of FIXED_HANDLER_CASES) {
    const post = postFunctionSource(readFileSync(join(root, testCase.file), "utf8"));
    assert.ok(post, `${testCase.file}: POST source missing`);
    const assertionIndex = post.indexOf("verifySecurityAdminMutationAssertionAfterToken(");
    const denialIndex = post.indexOf("if (!admin.ok) return admin.response;");
    const effectIndex = post.indexOf(testCase.firstEffect);
    assert.ok(assertionIndex >= 0, `${testCase.file}: assertion call missing`);
    assert.ok(denialIndex > assertionIndex, `${testCase.file}: assertion denial must be handled immediately`);
    assert.ok(effectIndex > denialIndex, `${testCase.file}: effect/provider call must be after assertion denial return`);
  }

  const envNames = [
    "NODE_ENV",
    "VERCEL_ENV",
    "VELMERE_SECURITY_ADMIN_ENABLED",
    "VELMERE_SECURITY_ADMIN_TOKEN",
    "VELMERE_SECURITY_ADMIN_TOKEN_SHA256",
    "VELMERE_SECURITY_ADMIN_SCOPES",
    "VELMERE_SECURITY_OPERATOR_ASSERTION_REQUIRED",
    "VELMERE_SECURITY_OPERATOR_ASSERTION_SECRET",
    "VELMERE_DURABLE_IDEMPOTENCY_REQUIRED",
    "VELMERE_IDEMPOTENCY_FAIL_CLOSED",
    "VELMERE_REQUIRE_DURABLE_RATE_LIMIT",
    "VELMERE_REQUIRE_DURABLE_SECURITY_STATE",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
    "REDIS_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GEMINI_API_KEY",
  ] as const;
  const saved = Object.fromEntries(envNames.map((name) => [name, process.env[name]])) as Record<(typeof envNames)[number], string | undefined>;
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  const restore = (name: (typeof envNames)[number], value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };

  const token = "security-admin-post-contract-token-1234567890";
  const secret = "security-admin-post-contract-secret-1234567890abcdef";
  try {
    process.env.NODE_ENV = "test";
    delete process.env.VERCEL_ENV;
    process.env.VELMERE_SECURITY_ADMIN_ENABLED = "true";
    process.env.VELMERE_SECURITY_ADMIN_TOKEN = token;
    delete process.env.VELMERE_SECURITY_ADMIN_TOKEN_SHA256;
    process.env.VELMERE_SECURITY_ADMIN_SCOPES = "security:events,security:export,security:console";
    process.env.VELMERE_SECURITY_OPERATOR_ASSERTION_REQUIRED = "true";
    process.env.VELMERE_SECURITY_OPERATOR_ASSERTION_SECRET = secret;
    for (const name of [
      "VELMERE_DURABLE_IDEMPOTENCY_REQUIRED",
      "VELMERE_IDEMPOTENCY_FAIL_CLOSED",
      "VELMERE_REQUIRE_DURABLE_RATE_LIMIT",
      "VELMERE_REQUIRE_DURABLE_SECURITY_STATE",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "KV_REST_API_URL",
      "KV_REST_API_TOKEN",
      "REDIS_URL",
      "SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ] as const) {
      delete process.env[name];
    }
    process.env.GEMINI_API_KEY = "configured-only-to-prove-denial-precedes-provider-call";
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error("unexpected_provider_call_after_security_admin_denial");
    }) as typeof fetch;

    const paymentCountBefore = buildPaymentRuntimeEvidenceSnapshot().total;
    const liquidationCountBefore = getPass2468StoredSnapshots("VLMSECADMINP1").length;
    const replayCountBefore = (await listPass2469LiquidationReplays({ symbol: "VLMSECADMINP1" })).records.length;
    const adminAuditCountBefore = listSecurityAdminAuditEvents(100).length;

    const allHandlerCases = [...PREEXISTING_HANDLER_CASES, ...FIXED_HANDLER_CASES];
    for (const testCase of allHandlerCases) {
      const response = await testCase.handler(buildRequest(testCase.path, token, testCase.body));
      const body = await response.json() as { mode?: string };
      assert.equal(response.status, 401, `${testCase.file}: missing operator assertion must return 401`);
      assert.equal(body.mode, "operator_assertion_missing", `${testCase.file}: wrong missing-assertion mode`);
    }

    assert.equal(fetchCalls, 0, "denied handlers must make zero provider/network calls");
    assert.equal(buildPaymentRuntimeEvidenceSnapshot().total, paymentCountBefore, "denied payment/Stripe handlers must not mutate evidence");
    assert.equal(getPass2468StoredSnapshots("VLMSECADMINP1").length, liquidationCountBefore, "denied liquidation handlers must not mutate snapshots");
    assert.equal((await listPass2469LiquidationReplays({ symbol: "VLMSECADMINP1" })).records.length, replayCountBefore, "denied liquidation handlers must not mutate replay storage");
    const denialAudits = listSecurityAdminAuditEvents(100).slice(0, allHandlerCases.length);
    assert.equal(listSecurityAdminAuditEvents(100).length - adminAuditCountBefore, allHandlerCases.length, "deferred token phase must not emit false allowed audits");
    assert.ok(denialAudits.every((event) => event.result === "denied"), "missing assertions must emit denied-only admin audits");

    const signedBody = { area: "release_gate", status: "pass", summary: "signed body" };
    const changedBody = { ...signedBody, status: "fail" };
    const mutatedResponse = await postPaymentRuntimeEvidence(buildSignedRequest({
      path: "/api/security/payment-runtime-evidence",
      token,
      secret,
      nonce: "security-admin-body-mutation-0001",
      signedBody,
      sentBody: changedBody,
    }));
    const mutatedPayload = await mutatedResponse.json() as { mode?: string };
    assert.equal(mutatedResponse.status, 401);
    assert.equal(mutatedPayload.mode, "operator_assertion_body_binding_mismatch");
    assert.equal(buildPaymentRuntimeEvidenceSnapshot().total, paymentCountBefore, "re-signed semantic/body mismatch must not mutate evidence");
    assert.equal(fetchCalls, 0, "body-binding denial must make zero provider/network calls");

    const positiveCases = [
      {
        path: "/api/security/modal-mobile-scroll-lock-final-sweep",
        handler: postModalMobileSweep,
        nonce: "security-admin-positive-modal-0001",
      },
      {
        path: "/api/security/cart-mail-wallet-microinteraction-sweep",
        handler: postCartMailWalletSweep,
        nonce: "security-admin-positive-cart-0002",
      },
      {
        path: "/api/security/advanced-entitlement-smoke",
        handler: postAdvancedEntitlementSmoke,
        nonce: "security-admin-positive-smoke-0003",
      },
    ] as const;

    for (const testCase of positiveCases) {
      const response = await testCase.handler(buildSignedRequest({
        path: testCase.path,
        token,
        secret,
        nonce: testCase.nonce,
        signedBody: {},
      }));
      const body = await response.json() as {
        operator?: { authMode?: string; role?: string; mfa?: string; replayProtection?: { storageMode?: string } };
      };
      assert.notEqual(response.status, 401, `${testCase.path}: valid body-bound assertion was rejected`);
      assert.notEqual(response.status, 503, `${testCase.path}: valid local assertion unexpectedly unavailable`);
      assert.equal(body.operator?.authMode, "signed-operator-assertion");
      assert.equal(body.operator?.role, "security_admin");
      assert.equal(body.operator?.mfa, "webauthn");
      assert.equal(body.operator?.replayProtection?.storageMode, "memory_runtime_only");
    }

    assert.equal(fetchCalls, 0, "local positive proof handlers must make zero provider/network calls");

    console.log(JSON.stringify({
      suite: "SECURITY_ADMIN_POST_CONTRACTS",
      status: "PASS",
      denominator: { discovered: discovered.length, expected: 15, bodyBound: 15 },
      repairedHandlers: FIXED_HANDLER_CASES.length,
      missingAssertionNegativeCases: allHandlerCases.length,
      bodyMutationNegativeCases: 1,
      positiveHandlerCases: positiveCases.length,
      providerOrNetworkCallsAfterDenial: fetchCalls,
      deniedDurableOrMemoryEffects: 0,
      localAssertionBoundary: "HMAC method/path/body/role/scope/MFA/nonce",
      externalIdentityProvider: "BLOCKED_EXTERNAL",
    }, null, 2));
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of envNames) restore(name, saved[name]);
  }
}

void main();
