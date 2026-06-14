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
  "lib/launch/order-event-ledger.ts",
  "components/launch/OrderEventLedgerPanel.tsx",
  "app/[locale]/checkout/page.tsx",
  "app/[locale]/cart/page.tsx",
  "app/[locale]/admin/import-products/page.tsx",
]) {
  if (!exists(file)) errors.push(`${file}: missing order event ledger file or route integration.`);
}

const model = read("lib/launch/order-event-ledger.ts");
const panel = read("components/launch/OrderEventLedgerPanel.tsx");
const checkoutPage = read("app/[locale]/checkout/page.tsx");
const cartPage = read("app/[locale]/cart/page.tsx");
const adminPage = read("app/[locale]/admin/import-products/page.tsx");
const paymentOrder = read("lib/launch/payment-order-readiness.ts");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");

for (const needle of [
  "orderEventLedgerMatrix",
  "getOrderEventLedgerSummary",
  "getPaymentBlockingOrderEventItems",
  "Event identity",
  "Idempotency key",
  "Signed webhook verification",
  "Retry and failure policy",
  "Order timeline",
  "Support handoff",
]) {
  if (!model.includes(needle)) errors.push(`order-event-ledger.ts missing marker: ${needle}`);
}

for (const needle of [
  "OrderEventLedgerPanel",
  "surface: \"checkout\" | \"cart\" | \"admin\" | \"ops\"",
  "Every order event needs a trace.",
  "Każde zdarzenie zamówienia musi mieć ślad.",
  "Jedes Bestellereignis braucht eine Spur.",
]) {
  if (!panel.includes(needle)) errors.push(`OrderEventLedgerPanel.tsx missing marker: ${needle}`);
}

for (const [source, marker, label] of [
  [checkoutPage, 'surface="checkout"', "checkout page"],
  [cartPage, 'surface="cart"', "cart page"],
  [adminPage, 'surface="admin"', "admin import page"],
]) {
  if (!source.includes("OrderEventLedgerPanel") || !source.includes(marker)) {
    errors.push(`${label} must render OrderEventLedgerPanel with ${marker}.`);
  }
}

for (const needle of [
  "Order event ledger now exists",
  "signed webhook events",
  "idempotency keys",
]) {
  if (!paymentOrder.includes(needle)) errors.push(`payment-order-readiness.ts missing order event update marker: ${needle}`);
}

if (!progress.includes('id: "order-event-ledger"') || !progress.includes('progress: 50') || !progress.includes('progress: 28') || !progress.includes('progress: 21')) {
  errors.push("project-progress.ts must include order-event-ledger and updated checkout/payment progress.");
}
if (!audit.includes('id: "order-event-ledger"') || !audit.includes('progress: 50') || !audit.includes('progress: 28') || !audit.includes('progress: 21')) {
  errors.push("site-page-audit.ts must include order-event-ledger and updated checkout/payment progress.");
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
  const haystack = `${model}\n${panel}\n${checkoutPage}\n${cartPage}\n${adminPage}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`Order event ledger contains forbidden wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Order event ledger safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Order event ledger safety checks passed.");
