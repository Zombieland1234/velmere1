import fs from "node:fs";
import path from "node:path";

const root = path.resolve(decodeURIComponent(new URL("..", import.meta.url).pathname));
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const required = [
  "lib/launch/order-event-ledger.ts",
  "components/launch/OrderEventLedgerPanel.tsx",
  "app/[locale]/admin/import-products/page.tsx",
  "app/[locale]/checkout/page.tsx",
  "app/[locale]/cart/page.tsx",
  "lib/security/payment-webhook-security.ts",
  "lib/market-integrity/public-launch-surface-gate.ts",
];
for (const file of required) if (!exists(file)) errors.push(`${file}: missing current order-ledger boundary`);

const model = read(required[0]);
const panel = read(required[1]);
const admin = read(required[2]);
const checkout = read(required[3]);
const cart = read(required[4]);
const webhookSecurity = read(required[5]);
const publicGate = read(required[6]);

for (const marker of ["orderEventLedgerMatrix", "getOrderEventLedgerSummary", "getPaymentBlockingOrderEventItems", "Event identity", "Idempotency key", "Signed webhook verification", "Retry and failure policy"]) {
  if (!model.includes(marker)) errors.push(`order-event-ledger.ts missing ${marker}`);
}
for (const marker of ["OrderEventLedgerPanel", 'surface: "checkout" | "cart" | "admin" | "ops"', "Every order event needs a trace."]) {
  if (!panel.includes(marker)) errors.push(`OrderEventLedgerPanel.tsx missing ${marker}`);
}
if (!admin.includes("OrderEventLedgerPanel") || !admin.includes('surface="admin"')) errors.push("admin surface must retain the internal ledger panel");
for (const [label, source] of [["checkout", checkout], ["cart", cart]]) {
  if (source.includes("OrderEventLedgerPanel")) errors.push(`${label} must not expose the internal operational ledger panel`);
}
for (const marker of ["getOrderEventLedgerSummary", "webhook", "idempot"]) if (!webhookSecurity.toLowerCase().includes(marker.toLowerCase())) errors.push(`payment webhook security missing ${marker}`);
for (const marker of ["OrderEventLedgerPanel", "hiddenOperatorPanels", "publicRule"]) if (!publicGate.includes(marker)) errors.push(`public launch gate missing ${marker}`);

const haystack = [model, panel, admin, checkout, cart].join("\n").toLowerCase();
for (const forbidden of ["checkout is live", "payment is live", "production payment ready", "guaranteed profit", "risk-free"]) if (haystack.includes(forbidden)) errors.push(`forbidden wording: ${forbidden}`);

if (errors.length) { console.error("Order event ledger current-architecture verification failed:"); for (const error of errors) console.error(`- ${error}`); process.exit(1); }
console.log("Order event ledger current-architecture checks passed.");
