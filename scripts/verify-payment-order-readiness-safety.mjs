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

for (const file of [
  "lib/launch/payment-order-readiness.ts",
  "components/launch/PaymentOrderReadinessPanel.tsx",
  "app/[locale]/checkout/page.tsx",
  "app/[locale]/cart/page.tsx",
]) {
  if (!exists(file)) errors.push(`${file}: missing payment/order readiness file or route integration.`);
}

const model = read("lib/launch/payment-order-readiness.ts");
const panel = read("components/launch/PaymentOrderReadinessPanel.tsx");
const checkoutPage = read("app/[locale]/checkout/page.tsx");
const cartPage = read("app/[locale]/cart/page.tsx");
const commerceControl = read("lib/launch/commerce-launch-control.ts");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");

for (const needle of [
  "paymentOrderReadinessMatrix",
  "getPaymentOrderReadinessSummary",
  "getCheckoutBlockingPaymentOrderItems",
  "Payment provider",
  "Tax calculation",
  "Order confirmation",
  "Webhook and audit trail",
  "Refund state",
  "Customer emails",
]) {
  if (!model.includes(needle)) errors.push(`payment-order-readiness.ts missing marker: ${needle}`);
}

for (const needle of [
  "PaymentOrderReadinessPanel",
  "surface: \"cart\" | \"checkout\" | \"ops\"",
  "Payment and order state must be real.",
  "Płatność i status zamówienia muszą być prawdziwe.",
  "Zahlung und Bestellstatus müssen echt sein.",
]) {
  if (!panel.includes(needle)) errors.push(`PaymentOrderReadinessPanel.tsx missing marker: ${needle}`);
}

if (!checkoutPage.includes("PaymentOrderReadinessPanel") || !checkoutPage.includes('surface="checkout"')) {
  errors.push("checkout page must render PaymentOrderReadinessPanel with surface=checkout.");
}
if (!cartPage.includes("PaymentOrderReadinessPanel") || !cartPage.includes('surface="cart"')) {
  errors.push("cart page must render PaymentOrderReadinessPanel with surface=cart.");
}

if (!commerceControl.includes("Payment/order state matrix now exists")) {
  errors.push("commerce-launch-control.ts must acknowledge payment/order state matrix.");
}
if (!progress.includes('id: "payment-order-state"') || !(progress.includes('progress: 48') || progress.includes('progress: 50')) || !(progress.includes('progress: 23') || progress.includes('progress: 28'))) {
  errors.push("project-progress.ts must include payment-order-state and updated checkout progress.");
}
if (!audit.includes('id: "payment-order-state"') || !(audit.includes('progress: 48') || audit.includes('progress: 50')) || !(audit.includes('progress: 23') || audit.includes('progress: 28'))) {
  errors.push("site-page-audit.ts must include payment-order-state and updated checkout progress.");
}

for (const forbidden of [
  "checkout is live",
  "payment is live",
  "card entry is enabled",
  "production payment ready",
  "tax guaranteed",
  "risk-free",
  "guaranteed profit",
]) {
  const haystack = `${model}\n${panel}\n${checkoutPage}\n${cartPage}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`Payment/order readiness contains forbidden wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Payment/order readiness safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Payment/order readiness safety checks passed.");
