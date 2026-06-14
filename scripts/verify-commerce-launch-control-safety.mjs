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
  "lib/launch/commerce-launch-control.ts",
  "components/launch/CommerceLaunchControl.tsx",
  "app/[locale]/shop/page.tsx",
  "app/[locale]/clothing/page.tsx",
  "app/[locale]/shop/[id]/page.tsx",
  "app/[locale]/cart/page.tsx",
  "app/[locale]/checkout/page.tsx",
  "app/[locale]/admin/import-products/page.tsx",
]) {
  if (!exists(file)) errors.push(`${file}: missing commerce launch-control file or route integration.`);
}

const model = read("lib/launch/commerce-launch-control.ts");
const component = read("components/launch/CommerceLaunchControl.tsx");
const shopPage = read("app/[locale]/shop/page.tsx");
const clothingPage = read("app/[locale]/clothing/page.tsx");
const productPage = read("app/[locale]/shop/[id]/page.tsx");
const cartPage = read("app/[locale]/cart/page.tsx");
const checkoutPage = read("app/[locale]/checkout/page.tsx");
const adminPage = read("app/[locale]/admin/import-products/page.tsx");
const audit = read("lib/launch/site-page-audit.ts");
const progress = read("lib/launch/project-progress.ts");

for (const needle of [
  "commerceLaunchControl",
  "getCommerceLaunchControlSummary",
  "No fake stock, fake discount, fake scarcity or hidden delivery cost.",
  "No payment flow, card entry or unverified order confirmation may appear before production wiring.",
  "Admin route must be gated, disabled or environment-protected before public launch.",
  "Fulfillment provider truth",
]) {
  if (!model.includes(needle)) errors.push(`commerce-launch-control.ts missing marker: ${needle}`);
}

for (const needle of [
  "CommerceLaunchControl",
  "surface: \"shop\" | \"product\" | \"cart\" | \"checkout\" | \"admin\"",
  "The store must be operationally ready, not just beautiful.",
  "Sklep musi być gotowy operacyjnie, nie tylko ładny.",
  "Der Shop muss operativ bereit sein, nicht nur schön aussehen.",
]) {
  if (!component.includes(needle)) errors.push(`CommerceLaunchControl.tsx missing marker: ${needle}`);
}

const integrations = [
  [shopPage, 'surface="shop"', "shop page"],
  [clothingPage, 'surface="shop"', "clothing page"],
  [productPage, 'surface="product"', "product page"],
  [cartPage, 'surface="cart"', "cart page"],
  [checkoutPage, 'surface="checkout"', "checkout page"],
  [adminPage, 'surface="admin"', "admin import page"],
];

for (const [source, marker, label] of integrations) {
  if (!source.includes(marker)) errors.push(`${label} must render CommerceLaunchControl with ${marker}.`);
}

if (!checkoutPage.includes("Checkout is not publicly active yet.") || !checkoutPage.includes("Payment stays blocked")) {
  errors.push("checkout page must explain blocked checkout in EN copy.");
}
if (!checkoutPage.includes("Checkout nie jest jeszcze publicznie aktywny.")) {
  errors.push("checkout page must explain blocked checkout in PL copy.");
}
if (!checkoutPage.includes("Checkout ist noch nicht öffentlich aktiv.")) {
  errors.push("checkout page must explain blocked checkout in DE copy.");
}
if (!audit.includes('route: "/[locale]/cart + /[locale]/checkout"') || !(audit.includes('progress: 36') || audit.includes('progress: 39') || (audit.includes('progress: 42') || (audit.includes('progress: 45') || (audit.includes('progress: 48') || audit.includes('progress: 50')))))) {
  errors.push("site-page-audit.ts must include updated cart/checkout launch-control progress.");
}
if (!(progress.includes('progress: 36') || progress.includes('progress: 39') || (progress.includes('progress: 42') || (progress.includes('progress: 45') || (progress.includes('progress: 48') || progress.includes('progress: 50'))))) || !(progress.includes("provider checkout, tax, shipping") || (progress.includes("provider truth ledger, tax, shipping") || (progress.includes("real provider snapshots, tax, shipping") || (progress.includes("shipping/returns truth, tax") || (progress.includes("payment provider, tax engine") || progress.includes("event ledger is persistent"))))))) {
  errors.push("project-progress.ts must include updated checkout launch-control progress.");
}

for (const forbidden of [
  "guaranteed delivery",
  "checkout is live",
  "payment is live",
  "guaranteed profit",
  "risk-free",
]) {
  const haystack = `${model}\n${component}\n${checkoutPage}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`Commerce launch control contains forbidden wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Commerce launch-control safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Commerce launch-control safety checks passed.");
