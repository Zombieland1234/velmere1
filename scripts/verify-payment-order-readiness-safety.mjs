import fs from "node:fs";
import path from "node:path";

const root = path.resolve(decodeURIComponent(new URL("..", import.meta.url).pathname));
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const required = [
  "components/checkout/VelmereCheckoutFlowClient.tsx",
  "lib/checkout/live-checkout-safety.ts",
  "lib/commerce/pass35-paid-ui-stop-sell.ts",
  "lib/commerce/vlm-current-sku-truth.ts",
  "lib/security/payment-webhook-security.ts",
  "app/[locale]/checkout/page.tsx",
  "app/[locale]/cart/page.tsx",
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`${file}: missing current payment/order boundary`);
}
if (errors.length === 0) {
  const [checkoutClient, liveSafety, stopSell, skuTruth, webhookSecurity, checkoutPage, cartPage] = required.map(read);
  for (const marker of ["serviceStopSell", "productCellId", "resolvePass35PaidUiStopSell"]) {
    if (!checkoutClient.includes(marker)) errors.push(`checkout client missing ${marker}`);
  }
  for (const marker of ["publicCheckoutAllowed", "saleEnabled", "NOT_FOR_SALE", "INVITATION_ONLY_CONTROLLED_BETA"]) {
    if (!skuTruth.includes(marker)) errors.push(`current SKU truth missing ${marker}`);
  }
  for (const marker of ["checkoutAllowed", "product_cell_not_sell_ready", "PASS35_PRODUCT_CELL_SELL_DISABLED"]) {
    if (!stopSell.includes(marker)) errors.push(`paid stop-sell missing ${marker}`);
  }
  for (const marker of ["assessLiveCheckoutIdempotency", "checkout_durable_idempotency_required", "pass4395Durable", "clientRequestIdPresent", "retryMode"]) {
    if (!liveSafety.includes(marker)) errors.push(`live checkout safety missing ${marker}`);
  }
  for (const marker of ["getOrderEventLedgerSummary", "webhook", "idempot"]) {
    if (!webhookSecurity.toLowerCase().includes(marker.toLowerCase())) errors.push(`payment webhook security missing ${marker}`);
  }
  for (const [label, source] of [["checkout", checkoutPage], ["cart", cartPage]]) {
    if (/PaymentOrderReadinessPanel/u.test(source)) errors.push(`${label} must not expose retired internal readiness panel`);
  }
  const haystack = required.map(read).join("\n").toLowerCase();
  for (const forbidden of ["checkout is live", "payment is live", "production payment ready", "tax guaranteed", "risk-free", "guaranteed profit"]) {
    if (haystack.includes(forbidden)) errors.push(`forbidden wording: ${forbidden}`);
  }
}
if (errors.length) {
  console.error("Payment/order current-architecture verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Payment/order current-architecture checks passed (current stop-sell + SKU truth + webhook safety).");
