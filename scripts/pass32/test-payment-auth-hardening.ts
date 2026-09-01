import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type Stripe from "stripe";
import { verifyAdminImportRequest } from "../../lib/admin/auth.js";
import {
  buildPasswordRecoveryGrantCookie,
  verifyPasswordRecoveryGrant,
} from "../../lib/auth/password-recovery-grant.js";
import { upsertVlmPaidEntitlementFromStripeSession } from "../../lib/commerce/vlm-entitlement-ledger.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalVercelEnv = process.env.VERCEL_ENV;
process.env.VELMERE_AUTH_FLOW_SECRET_CURRENT = "pass32-recovery-grant-test-secret-32-bytes-minimum";

const subjectId = "11111111-1111-4111-8111-111111111111";
const familyId = "22222222-2222-4222-8222-222222222222";
const setCookie = buildPasswordRecoveryGrantCookie({ subjectId, familyId });
const cookie = setCookie.split(";", 1)[0] ?? "";
assert.match(setCookie, /HttpOnly/);
assert.match(setCookie, /SameSite=Strict/);
assert.match(setCookie, /Path=\/api\/auth\/recovery/);
assert.equal(verifyPasswordRecoveryGrant(new Request("http://velmere.local/api/auth/recovery", { headers: { cookie } }), { subjectId, familyId }), true);
assert.equal(verifyPasswordRecoveryGrant(new Request("http://velmere.local/api/auth/recovery", { headers: { cookie } }), { subjectId: "33333333-3333-4333-8333-333333333333", familyId }), false);
assert.equal(verifyPasswordRecoveryGrant(new Request("http://velmere.local/api/auth/recovery", { headers: { cookie } }), { subjectId, familyId: "44444444-4444-4444-8444-444444444444" }), false);

process.env.NODE_ENV = "production";
process.env.VERCEL_ENV = "production";
process.env.ADMIN_IMPORT_TOKEN = "shared-token-must-not-authorize-production";
const admin = verifyAdminImportRequest(new Request("https://velmere.example/api/admin", {
  headers: { authorization: "Bearer shared-token-must-not-authorize-production" },
}));
assert.equal(admin.ok, false);
if (!admin.ok) assert.equal(admin.response.status, 503);

if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalVercelEnv;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.VELMERE_REQUIRE_PAID_ENTITLEMENT_LEDGER;

function blikSession(overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: "cs_test_pass32_blik",
    object: "checkout.session",
    amount_total: 34999,
    currency: "pln",
    customer: null,
    customer_details: null,
    payment_status: "paid",
    metadata: {
      kind: "vlm_paid_access",
      productId: "vlm_pro_pdf_single",
      locale: "en",
      surface: "browser",
      depth: "pro",
      paymentRail: "stripe_checkout_blik",
      originalCurrency: "eur",
      originalAmount: "7999",
      stripeLineCurrency: "pln",
      stripeLineAmount: "34999",
    },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

const disabledProStripeAttempt = await upsertVlmPaidEntitlementFromStripeSession(
  blikSession(),
  "stripe_webhook",
);
assert.equal(disabledProStripeAttempt.ok, false);
if (!disabledProStripeAttempt.ok) {
  assert.equal(
    disabledProStripeAttempt.error,
    "public_checkout_disabled_invitation_only",
  );
}

const disabledAdvancedSession = blikSession({ id: "cs_test_pass32_advanced" });
disabledAdvancedSession.metadata = {
  ...disabledAdvancedSession.metadata,
  productId: "vlm_advanced_pdf_single",
  depth: "advanced",
  originalAmount: "0",
};
const disabledAdvancedStripeAttempt =
  await upsertVlmPaidEntitlementFromStripeSession(
    disabledAdvancedSession,
    "stripe_webhook",
  );
assert.equal(disabledAdvancedStripeAttempt.ok, false);
if (!disabledAdvancedStripeAttempt.ok) {
  assert.equal(disabledAdvancedStripeAttempt.error, "product_not_for_sale");
}

const recoveryFlow = readFileSync(`${process.cwd()}/lib/auth/supabase-auth-flow.ts`, "utf8");
assert.match(recoveryFlow, /consumePasswordRecoveryGrant/);
assert.match(recoveryFlow, /verified\.status !== "active"/);
assert.match(recoveryFlow, /revokeSubject/);

console.log("PASS recovery password update requires a short-lived subject/family-bound grant and active durable family");
console.log("PASS a shared admin token cannot authorize production mutations");
console.log("PASS Stripe/BLIK receipts cannot mint entitlements while Pro is invitation-only and Advanced is not for sale");
