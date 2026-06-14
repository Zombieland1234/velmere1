import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const required = [
  "lib/security/payment-webhook-guard.ts",
  "lib/security/payment-webhook-security.ts",
  "app/api/security/payment-webhook-review/route.ts",
  "docs/security/PAYMENT_WEBHOOK_SECURITY_REVIEW.md",
  "VELMERE_PASS191_PAYMENT_WEBHOOK_SECURITY_REVIEW_REPORT.md",
  "VELMERE_PASS191_FULL_MASTER_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const guardSource = read("lib/security/payment-webhook-guard.ts");
const reviewSource = read("lib/security/payment-webhook-security.ts");
const checkoutRoute = read("app/api/checkout/route.ts");
const webhookRoute = read("app/api/stripe/webhook/route.ts");
const reviewRoute = read("app/api/security/payment-webhook-review/route.ts");
const releaseGate = read("lib/security/security-release-gate.ts");
const runtimeQa = read("lib/security/security-runtime-qa.ts");
const readinessRoute = read("app/api/security/readiness/route.ts");
const exportRoute = read("app/api/security/export/route.ts");
const operationsRoute = read("app/api/security/operations-checklist/route.ts");
const abuseRoute = read("app/api/security/abuse-shield/route.ts");
const consolePanel = read("components/admin/SecurityConsolePanel.tsx");
const doc = read("docs/security/PAYMENT_WEBHOOK_SECURITY_REVIEW.md");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS191_FULL_MASTER_PROGRESS_MATRIX.md");

for (const token of [
  "validateCheckoutRequestBoundary",
  "validateStripeWebhookBoundary",
  "paymentWebhookGuardReadiness",
  "Checkout expects application/json",
  "Webhook payload is too large",
  "Missing Stripe signature",
]) {
  if (!guardSource.includes(token)) errors.push(`payment-webhook-guard.ts missing token: ${token}`);
}

for (const token of [
  "buildPaymentWebhookSecuritySnapshot",
  "stripe-provider-env",
  "signed-webhook",
  "webhook-idempotency",
  "order-persistence",
  "fulfilment-handoff",
  "refund-support",
]) {
  if (!reviewSource.includes(token)) errors.push(`payment-webhook-security.ts missing token: ${token}`);
}

for (const token of ["validateCheckoutRequestBoundary", "paymentGuard", "Checkout is disabled"]) {
  if (!checkoutRoute.includes(token)) errors.push(`checkout route missing payment guard token: ${token}`);
}

for (const token of ["validateStripeWebhookBoundary", "SUPPORTED_STRIPE_WEBHOOK_EVENTS", "unsupported: true", "constructEvent", "stripe-signature"]) {
  if (!webhookRoute.includes(token)) errors.push(`stripe webhook route missing security token: ${token}`);
}

for (const token of ["applyApiAbuseShield", "verifySecurityAdminToken", "buildPaymentWebhookSecuritySnapshot", "security:events"]) {
  if (!reviewRoute.includes(token)) errors.push(`payment webhook review route missing token: ${token}`);
}

for (const token of ["buildPaymentWebhookSecuritySnapshot", "paymentWebhookSecurity", "payment-webhook-review"]) {
  if (!releaseGate.includes(token)) errors.push(`security release gate missing payment token: ${token}`);
}

for (const token of ["buildPaymentWebhookSecuritySnapshot", "payment-webhook-review-api", "stripe-webhook-guard", "paymentWebhookSecurity"]) {
  if (!runtimeQa.includes(token)) errors.push(`security runtime QA missing payment token: ${token}`);
}

for (const token of ["paymentWebhookSecurity", "buildPaymentWebhookSecuritySnapshot"]) {
  if (!readinessRoute.includes(token)) errors.push(`readiness route missing payment token: ${token}`);
  if (!exportRoute.includes(token)) errors.push(`export route missing payment token: ${token}`);
  if (!operationsRoute.includes(token)) errors.push(`operations route missing payment token: ${token}`);
  if (!abuseRoute.includes(token)) errors.push(`abuse route missing payment token: ${token}`);
}

for (const token of ["buildPaymentWebhookSecuritySnapshot", "/api/security/payment-webhook-review", "paymentWebhook.averageProgress"]) {
  if (!consolePanel.includes(token)) errors.push(`admin security console missing payment token: ${token}`);
}

for (const token of ["Checkout payload", "Stripe webhook", "Duplicate webhook event", "Do not export card data"]) {
  if (!doc.includes(token)) errors.push(`payment webhook security doc missing token: ${token}`);
}

for (const area of [
  "Payment/webhook security",
  "Payment checkout request boundary",
  "Stripe webhook request boundary",
  "Commerce/order/payment readiness",
  "Całość launch-ready",
]) {
  if (!matrix.includes(area)) errors.push(`PASS191 full master matrix missing area: ${area}`);
}

const safeSurface = `${guardSource}\n${reviewSource}\n${checkoutRoute}\n${webhookRoute}\n${reviewRoute}\n${releaseGate}\n${runtimeQa}\n${doc}`.toLowerCase();
for (const forbidden of ["card number", "cvc", "secret:", "unhackable", "guaranteed secure", "best security in the world"]) {
  if (safeSurface.includes(forbidden)) errors.push(`Unsafe payment/security wording or sensitive field found: ${forbidden}`);
}

for (const token of ["verify-pass191-payment-webhook-security-safety.mjs", "PASS191"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS191 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS191 payment/webhook security safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS191 payment/webhook security safety OK");
