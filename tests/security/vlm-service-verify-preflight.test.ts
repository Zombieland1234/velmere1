import assert from "node:assert/strict";
import type Stripe from "stripe";
import {
  handleVlmServiceVerifyRequest,
  type VlmServiceVerifyDependencies,
  vlmServiceVerifyDependencies,
} from "../../lib/server/vlm-service-verify-handler.js";
import type { VelmereResolvedAccount } from "../../lib/auth/account-session.js";
import {
  createVlmCheckoutVerificationBinding,
  verifyVlmCheckoutSessionMetadataBinding,
  verifyVlmCheckoutVerificationBinding,
} from "../../lib/commerce/vlm-checkout-verification-binding.js";
import {
  normalizePaidContext,
  type VlmPaidAccessContext,
  type VlmPaidProductId,
} from "../../lib/commerce/vlm-paid-access.js";
import { hashVlmPaidAccessContext } from "../../lib/commerce/vlm-paid-access-server.js";
import { resolvePass35ProductCellBinding } from "../../lib/commerce/pass35-product-cell-readiness.js";
import { hashVelmereAccountBinding } from "../../lib/auth/account-session.js";
import type { PaymentRuntimeEvidenceRecord } from "../../lib/security/payment-runtime-evidence.js";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VELMERE_PAID_ACCESS_SECRET: process.env.VELMERE_PAID_ACCESS_SECRET,
};

function restoreEnv() {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

type EffectCounters = {
  providerClient: number;
  sessionRetrieve: number;
  paymentIntentVerifier: number;
  entitlementWrite: number;
  demoEntitlementWrite: number;
  auditWrite: number;
  evidenceRecordWrite: number;
  durableEvidenceWrite: number;
};

function emptyCounters(): EffectCounters {
  return {
    providerClient: 0,
    sessionRetrieve: 0,
    paymentIntentVerifier: 0,
    entitlementWrite: 0,
    demoEntitlementWrite: 0,
    auditWrite: 0,
    evidenceRecordWrite: 0,
    durableEvidenceWrite: 0,
  };
}

function totalProviderCalls(counters: EffectCounters) {
  return counters.providerClient
    + counters.sessionRetrieve
    + counters.paymentIntentVerifier;
}

function totalDurableEffects(counters: EffectCounters) {
  return counters.entitlementWrite
    + counters.demoEntitlementWrite
    + counters.auditWrite
    + counters.evidenceRecordWrite
    + counters.durableEvidenceWrite;
}

const owner: VelmereResolvedAccount = {
  accountId: "supabase:11111111-1111-4111-8111-111111111111",
  displayName: "Owner",
  handle: "@owner",
  provider: "server",
  sessionSource: "server",
};
const attacker: VelmereResolvedAccount = {
  accountId: "supabase:22222222-2222-4222-8222-222222222222",
  displayName: "Other account",
  handle: "@other",
  provider: "server",
  sessionSource: "server",
};

function productCell(args: {
  productId: VlmPaidProductId;
  surface: VlmPaidAccessContext["surface"];
  depth: "pro" | "advanced";
}) {
  const verdict = resolvePass35ProductCellBinding({
    legacyProductId: args.productId,
    surface: args.surface,
    tier: args.depth,
  });
  assert.equal(verdict.ok, true);
  if (!verdict.ok) throw new Error(verdict.error);
  return verdict;
}

function signedBinding(args: {
  sessionId: string;
  productId: VlmPaidProductId;
  context: Partial<VlmPaidAccessContext>;
  account: VelmereResolvedAccount;
}) {
  const depth =
    args.context.depth === "advanced" ? "advanced" as const : "pro" as const;
  const cell = productCell({
    productId: args.productId,
    surface: args.context.surface ?? "unknown",
    depth,
  });
  const accountIdHash = hashVelmereAccountBinding(args.account.accountId);
  const binding = createVlmCheckoutVerificationBinding({
    sessionId: args.sessionId,
    productId: args.productId,
    productCellId: cell.productCell.productCellId,
    productCellBindingSha256: cell.bindingSha256,
    accountIdHash,
    context: args.context,
  });
  assert.equal(binding.ok, true);
  if (!binding.ok) throw new Error(binding.error);
  return { binding, cell, accountIdHash };
}

function verifyRequest(body: Record<string, unknown>) {
  return new Request(
    "https://velmere.example/api/checkout/vlm-service/verify",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://velmere.example",
      },
      body: JSON.stringify(body),
    },
  );
}

function makeDependencies(args: {
  account: VelmereResolvedAccount;
  counters: EffectCounters;
  session?: Stripe.Checkout.Session;
  context?: VlmPaidAccessContext;
  productId?: VlmPaidProductId;
  productCellId?: string;
  productCellBindingSha256?: string;
}): VlmServiceVerifyDependencies {
  const fakeStripe = {
    checkout: {
      sessions: {
        retrieve: async () => {
          args.counters.sessionRetrieve += 1;
          if (!args.session) throw new Error("unexpected_provider_retrieve");
          return args.session;
        },
      },
    },
  } as unknown as Stripe;
  const evidence: PaymentRuntimeEvidenceRecord = {
    id: "payev_vlm_verify_preflight_test",
    area: "vlm_service",
    status: "pass",
    label: "verify preflight test",
    summary: "handler effect spy",
    evidenceRef: args.session?.id ?? "blocked",
    operator: "test",
    createdAt: new Date().toISOString(),
  };

  return {
    ...vlmServiceVerifyDependencies,
    resolveRequestAccount: async () => args.account,
    getStripeServerClient: () => {
      args.counters.providerClient += 1;
      return fakeStripe;
    },
    verifyVlmPaidStripeReceipt: async ({ session }) => {
      args.counters.paymentIntentVerifier += 1;
      if (
        !args.context
        || !args.productId
        || !args.productCellId
        || !args.productCellBindingSha256
      ) {
        throw new Error("unexpected_payment_intent_verifier");
      }
      return {
        ok: true,
        productId: args.productId,
        context: args.context,
        contextHash: hashVlmPaidAccessContext(args.context),
        paymentIntent: {
          id: "pi_vlm_verify_preflight_test",
          object: "payment_intent",
        } as Stripe.PaymentIntent,
        productCellId: args.productCellId,
        productCellBindingSha256: args.productCellBindingSha256,
        mode: "test",
        session,
      } as Awaited<
        ReturnType<
          VlmServiceVerifyDependencies["verifyVlmPaidStripeReceipt"]
        >
      >;
    },
    upsertVlmPaidEntitlementFromDemoReceipt: async () => {
      args.counters.demoEntitlementWrite += 1;
      throw new Error("unexpected_demo_entitlement_write");
    },
    upsertVlmPaidEntitlementFromStripeSession: async () => {
      args.counters.entitlementWrite += 1;
      if (!args.context || !args.productId || !args.session) {
        throw new Error("unexpected_entitlement_write");
      }
      const now = new Date();
      return {
        ok: true,
        record: {
          id: "vlment_vlm_verify_preflight_test",
          stripeSessionId: args.session.id,
          productId: args.productId,
          accessScope: "vlm_pro_analysis",
          status: "active",
          contextHash: hashVlmPaidAccessContext(args.context),
          context: args.context,
          locale: args.context.locale,
          amountTotal: 100,
          currency: "eur",
          paymentStatus: "paid",
          source: "checkout_verify",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 60 * 60 * 1_000).toISOString(),
          auditQueueId: null,
        },
        persisted: true,
        mode: "durable",
        idempotent: false,
        created: true,
      };
    },
    promoteAuditCaseFromPaidEntitlement: async () => {
      args.counters.auditWrite += 1;
      throw new Error("unexpected_audit_write");
    },
    recordPaymentRuntimeEvidence: () => {
      args.counters.evidenceRecordWrite += 1;
      return evidence;
    },
    storePaymentRuntimeEvidenceDurable: async (record) => {
      args.counters.durableEvidenceWrite += 1;
      return {
        record,
        source: "memory",
        durableWrite: false,
        linkedAuditQueue: false,
        linkedAccountMessage: false,
      };
    },
  } as VlmServiceVerifyDependencies;
}

async function main() {
  process.env.NODE_ENV = "test";
  delete process.env.VERCEL_ENV;
  process.env.VELMERE_PAID_ACCESS_SECRET =
    "vlmere-vlm-checkout-preflight-test-secret-2026";

  try {
    const auditSessionId = "cs_test_vlm_verify_audit_binding_001";
    const auditProductId = "vlm_pro_audit_review" as const;
    const auditContext = normalizePaidContext({
      surface: "audit",
      locale: "en",
      depth: "pro",
      auditCaseRef: "AUD-CASE000001",
      requestId: "request-audit-preflight-001",
    }, "en");
    const audit = signedBinding({
      sessionId: auditSessionId,
      productId: auditProductId,
      context: auditContext,
      account: owner,
    });
    const exactBinding = verifyVlmCheckoutVerificationBinding({
      token: audit.binding.token,
      sessionId: auditSessionId,
      productId: auditProductId,
      productCellId: audit.cell.productCell.productCellId,
      accountIdHash: audit.accountIdHash,
      context: auditContext,
    });
    assert.equal(exactBinding.ok, true);
    if (!exactBinding.ok) throw new Error(exactBinding.error);

    const exactSession = {
      id: auditSessionId,
      object: "checkout.session",
      metadata: {
        kind: "vlm_paid_access",
        productId: auditProductId,
        productCellId: audit.cell.productCell.productCellId,
        productCellBindingSha256: audit.cell.bindingSha256,
        accountIdHash: audit.accountIdHash,
        contextHash: hashVlmPaidAccessContext({
          ...auditContext,
          accountIdHash: audit.accountIdHash,
        }),
        surface: "audit",
        locale: "en",
        depth: "pro",
        auditCaseRef: "AUD-CASE000001",
      },
    } as Stripe.Checkout.Session;
    assert.equal(
      verifyVlmCheckoutSessionMetadataBinding({
        session: exactSession,
        binding: exactBinding.payload,
      }).ok,
      true,
    );

    const baseBody = {
      sessionId: auditSessionId,
      productId: auditProductId,
      productCellId: audit.cell.productCell.productCellId,
      checkoutVerificationBindingToken: audit.binding.token,
      locale: "en",
      context: auditContext,
    };
    const negativeCases: Array<{
      name: string;
      account: VelmereResolvedAccount;
      patch: Record<string, unknown>;
    }> = [
      {
        name: "wrong authenticated account",
        account: attacker,
        patch: {},
      },
      {
        name: "wrong product",
        account: owner,
        patch: { productId: "vlm_advanced_audit_human_review" },
      },
      {
        name: "wrong surface",
        account: owner,
        patch: { context: { ...auditContext, surface: "shield" } },
      },
      {
        name: "wrong depth",
        account: owner,
        patch: { context: { ...auditContext, depth: "advanced" } },
      },
      {
        name: "wrong case",
        account: owner,
        patch: {
          context: { ...auditContext, auditCaseRef: "AUD-CASE000002" },
        },
      },
    ];

    for (const testCase of negativeCases) {
      const counters = emptyCounters();
      const response = await handleVlmServiceVerifyRequest(
        verifyRequest({ ...baseBody, ...testCase.patch }),
        makeDependencies({ account: testCase.account, counters }),
      );
      assert.equal(
        response.status,
        409,
        `${testCase.name} must fail at signed preflight`,
      );
      assert.equal(
        totalProviderCalls(counters),
        0,
        `${testCase.name} must make zero provider calls`,
      );
      assert.equal(
        totalDurableEffects(counters),
        0,
        `${testCase.name} must make zero durable writes`,
      );
    }

    const sessionId = "cs_test_vlm_verify_positive_001";
    const productId = "vlm_pro_analysis_single" as const;
    const clientContext = normalizePaidContext({
      surface: "shield",
      locale: "en",
      assetId: "ethereum",
      symbol: "ETH",
      depth: "pro",
      requestId: "request-positive-preflight-001",
    }, "en");
    const positive = signedBinding({
      sessionId,
      productId,
      context: clientContext,
      account: owner,
    });
    const serverContext = normalizePaidContext({
      ...clientContext,
      accountIdHash: positive.accountIdHash,
    }, "en");
    const session = {
      id: sessionId,
      object: "checkout.session",
      payment_status: "paid",
      payment_intent: "pi_vlm_verify_positive_001",
      currency: "eur",
      amount_total: 100,
      metadata: {
        kind: "vlm_paid_access",
        productId,
        productCellId: positive.cell.productCell.productCellId,
        productCellBindingSha256: positive.cell.bindingSha256,
        accountIdHash: positive.accountIdHash,
        contextHash: hashVlmPaidAccessContext(serverContext),
        surface: serverContext.surface,
        locale: serverContext.locale,
        assetId: serverContext.assetId ?? "",
        symbol: serverContext.symbol ?? "",
        depth: serverContext.depth ?? "",
        requestId: serverContext.requestId ?? "",
        auditCaseRef: "",
        paymentRail: "stripe_checkout_card",
      },
    } as Stripe.Checkout.Session;
    const positiveCounters = emptyCounters();
    const positiveResponse = await handleVlmServiceVerifyRequest(
      verifyRequest({
        sessionId,
        productId,
        productCellId: positive.cell.productCell.productCellId,
        checkoutVerificationBindingToken: positive.binding.token,
        locale: "en",
        context: clientContext,
      }),
      makeDependencies({
        account: owner,
        counters: positiveCounters,
        session,
        context: serverContext,
        productId,
        productCellId: positive.cell.productCell.productCellId,
        productCellBindingSha256: positive.cell.bindingSha256,
      }),
    );
    assert.equal(positiveResponse.status, 200);
    const positivePayload = await positiveResponse.json() as {
      ok?: boolean;
      accessToken?: unknown;
      entitlement?: { id?: unknown; status?: unknown; ledgerMode?: unknown };
    };
    assert.equal(positivePayload.ok, true);
    assert.equal("accessToken" in positivePayload, false);
    assert.equal(typeof positivePayload.entitlement?.id, "string");
    assert.ok(positivePayload.entitlement?.status === "active" || positivePayload.entitlement?.status === "paid");
    assert.ok(positivePayload.entitlement?.ledgerMode === "durable" || positivePayload.entitlement?.ledgerMode === "memory");
    assert.deepEqual(positiveCounters, {
      providerClient: 1,
      sessionRetrieve: 1,
      paymentIntentVerifier: 1,
      entitlementWrite: 1,
      demoEntitlementWrite: 0,
      auditWrite: 0,
      evidenceRecordWrite: 1,
      durableEvidenceWrite: 1,
    });

    console.log(
      "VLM verify signed preflight: PASS (1 handler positive + 5 zero-provider/zero-write negatives)",
    );
  } finally {
    restoreEnv();
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});

