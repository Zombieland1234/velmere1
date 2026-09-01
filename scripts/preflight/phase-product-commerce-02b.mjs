import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";



setGuardScope("pf.product-commerce.016");

// guard script marker: verify-pass192-payment-runtime-evidence-replay-qa-safety.mjs
// PASS192

// PASS191 payment/webhook security review + commerce release gate integration guard
try {
  const paymentGuardSource = read("lib/security/payment-webhook-guard.ts");
  const paymentReviewSource = read("lib/security/payment-webhook-security.ts");
  const checkoutRouteSource = read("app/api/checkout/route.ts");
  const stripeWebhookRouteSource = read("app/api/stripe/webhook/route.ts");
  const paymentReviewRouteSource = read(
    "app/api/security/payment-webhook-review/route.ts",
  );
  const releaseGateSource = read("lib/security/security-release-gate.ts");
  const runtimeQaSource = read("lib/security/security-runtime-qa.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const exportRouteSource = read("app/api/security/export/route.ts");
  const operationsRouteSource = read(
    "app/api/security/operations-checklist/route.ts",
  );
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const securityConsoleSource = read(
    "components/admin/SecurityConsolePanel.tsx",
  );
  const paymentDocSource = read(
    "docs/security/PAYMENT_WEBHOOK_SECURITY_REVIEW.md",
  );
  const matrixSource = read("VELMERE_PASS191_FULL_MASTER_PROGRESS_MATRIX.md");
  for (const needle of [
    "validateCheckoutRequestBoundary",
    "validateStripeWebhookBoundary",
    "paymentWebhookGuardReadiness",
    "Checkout expects application/json",
    "Webhook payload is too large",
  ]) {
    if (!paymentGuardSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a001.lib-security-payment-webhook-guard-missing-legacy-guard")(
        `lib/security/payment-webhook-guard.ts: missing PASS191 guard marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildPaymentWebhookSecuritySnapshot",
    "signed-webhook",
    "webhook-idempotency",
    "order-persistence",
    "refund-support",
  ]) {
    if (!paymentReviewSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a002.lib-security-payment-webhook-security-missing-legacy-rev")(
        `lib/security/payment-webhook-security.ts: missing PASS191 review marker ${needle}.`,
      );
  }
  for (const needle of ["validateCheckoutRequestBoundary", "paymentGuard"]) {
    if (!checkoutRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a003.app-api-checkout-route-missing-legacy-checkout-marker-va")(
        `app/api/checkout/route.ts: missing PASS191 checkout marker ${needle}.`,
      );
  }
  for (const needle of [
    "validateStripeWebhookBoundary",
    "SUPPORTED_STRIPE_WEBHOOK_EVENTS",
    "unsupported: true",
    "constructEvent",
  ]) {
    if (!stripeWebhookRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a004.app-api-stripe-webhook-route-missing-legacy-webhook-mark")(
        `app/api/stripe/webhook/route.ts: missing PASS191 webhook marker ${needle}.`,
      );
  }
  for (const needle of [
    "applyApiAbuseShield",
    "verifySecurityAdminToken",
    "buildPaymentWebhookSecuritySnapshot",
    "security:events",
  ]) {
    if (!paymentReviewRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a005.app-api-security-payment-webhook-review-route-missing-le")(
        `app/api/security/payment-webhook-review/route.ts: missing PASS191 route marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildPaymentWebhookSecuritySnapshot",
    "paymentWebhookSecurity",
    "payment-webhook-review",
  ]) {
    if (!releaseGateSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a006.lib-security-security-release-gate-missing-legacy-releas")(
        `lib/security/security-release-gate.ts: missing PASS191 release marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildPaymentWebhookSecuritySnapshot",
    "payment-webhook-review-api",
    "stripe-webhook-guard",
    "paymentWebhookSecurity",
  ]) {
    if (!runtimeQaSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a007.lib-security-security-runtime-qa-missing-legacy-runtime")(
        `lib/security/security-runtime-qa.ts: missing PASS191 runtime QA marker ${needle}.`,
      );
  }
  for (const needle of [
    "paymentWebhookSecurity",
    "buildPaymentWebhookSecuritySnapshot",
  ]) {
    if (!readinessRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a008.app-api-security-readiness-route-missing-legacy-payment")(
        `app/api/security/readiness/route.ts: missing PASS191 payment marker ${needle}.`,
      );
    if (!exportRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a009.app-api-security-export-route-missing-legacy-payment-mar")(
        `app/api/security/export/route.ts: missing PASS191 payment marker ${needle}.`,
      );
    if (!operationsRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a010.app-api-security-operations-checklist-route-missing-lega")(
        `app/api/security/operations-checklist/route.ts: missing PASS191 payment marker ${needle}.`,
      );
    if (!abuseRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a011.app-api-security-abuse-shield-route-missing-legacy-payme")(
        `app/api/security/abuse-shield/route.ts: missing PASS191 payment marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildPaymentWebhookSecuritySnapshot",
    "/api/security/payment-webhook-review",
    "paymentWebhook.averageProgress",
  ]) {
    if (!securityConsoleSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a012.components-admin-securityconsolepanelx-missing-legacy-co")(
        `components/admin/SecurityConsolePanel.tsx: missing PASS191 console marker ${needle}.`,
      );
  }
  for (const needle of [
    "Checkout payload",
    "Stripe webhook",
    "Duplicate webhook event",
    "Do not export card data",
  ]) {
    if (!paymentDocSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a013.docs-security-payment-webhook-security-review-md-missing")(
        `docs/security/PAYMENT_WEBHOOK_SECURITY_REVIEW.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Payment/webhook security",
    "Payment checkout request boundary",
    "Stripe webhook request boundary",
    "Commerce/order/payment readiness",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a014.velmere-legacy-full-master-progress-matrix-md-missing-fu")(
        `VELMERE_PASS191_FULL_MASTER_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.016.lib-security-payment-webhook-guard-missing-legacy-guard.a015.legacy-payment-webhook-security-guard-failed-value")(
    `PASS191 payment/webhook security guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
