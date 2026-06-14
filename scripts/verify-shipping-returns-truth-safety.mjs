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
  "lib/launch/shipping-returns-truth.ts",
  "components/launch/ShippingReturnsTruthPanel.tsx",
  "app/[locale]/checkout/page.tsx",
  "app/[locale]/shop/page.tsx",
  "app/[locale]/clothing/page.tsx",
  "app/[locale]/shop/[id]/page.tsx",
  "app/[locale]/legal/shipping/page.tsx",
  "app/[locale]/legal/returns/page.tsx",
]) {
  if (!exists(file)) errors.push(`${file}: missing shipping/returns truth file or route integration.`);
}

const model = read("lib/launch/shipping-returns-truth.ts");
const panel = read("components/launch/ShippingReturnsTruthPanel.tsx");
const checkoutPage = read("app/[locale]/checkout/page.tsx");
const shopPage = read("app/[locale]/shop/page.tsx");
const clothingPage = read("app/[locale]/clothing/page.tsx");
const productRoute = read("app/[locale]/shop/[id]/page.tsx");
const shippingPage = read("app/[locale]/legal/shipping/page.tsx");
const returnsPage = read("app/[locale]/legal/returns/page.tsx");
const pl = JSON.parse(read("messages/pl.json"));
const en = JSON.parse(read("messages/en.json"));
const de = JSON.parse(read("messages/de.json"));
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");
const commerceControl = read("lib/launch/commerce-launch-control.ts");

for (const needle of [
  "shippingReturnsTruthMatrix",
  "getShippingReturnsTruthSummary",
  "getCheckoutBlockingShippingReturnsItems",
  "Shipping regions",
  "Shipping costs",
  "Return rights",
  "Refund flow",
  "Provider exceptions",
]) {
  if (!model.includes(needle)) errors.push(`shipping-returns-truth.ts missing marker: ${needle}`);
}

for (const needle of [
  "ShippingReturnsTruthPanel",
  "surface: \"checkout\" | \"product\" | \"legal\" | \"shop\"",
  "Shipping and returns must be clear before payment.",
  "Dostawa i zwroty muszą być jasne przed płatnością.",
  "Versand und Rückgabe müssen vor Zahlung klar sein.",
]) {
  if (!panel.includes(needle)) errors.push(`ShippingReturnsTruthPanel.tsx missing marker: ${needle}`);
}

const integrations = [
  [checkoutPage, 'surface="checkout"', "checkout page"],
  [shopPage, 'surface="shop"', "shop page"],
  [clothingPage, 'surface="shop"', "clothing page"],
  [productRoute, 'surface="product"', "product detail route"],
  [shippingPage, 'surface="legal"', "shipping legal page"],
  [returnsPage, 'surface="legal"', "returns legal page"],
];

for (const [source, marker, label] of integrations) {
  if (!source.includes("ShippingReturnsTruthPanel") || !source.includes(marker)) {
    errors.push(`${label} must render ShippingReturnsTruthPanel with ${marker}.`);
  }
}

for (const [locale, data] of [["pl", pl], ["en", en], ["de", de]]) {
  if (!data.Legal?.returns?.title || !Array.isArray(data.Legal?.returns?.sections)) {
    errors.push(`messages/${locale}.json must include Legal.returns title and sections.`);
  }
}

if (!(progress.includes('progress: 45') || (progress.includes('progress: 48') || progress.includes('progress: 50'))) || !progress.includes('progress: 72')) {
  errors.push("project-progress.ts must include updated checkout/legal progress after shipping/returns truth.");
}
if (!(audit.includes('progress: 45') || (audit.includes('progress: 48') || audit.includes('progress: 50'))) || !audit.includes('progress: 72')) {
  errors.push("site-page-audit.ts must include updated checkout/legal progress after shipping/returns truth.");
}
if (!commerceControl.includes("Shipping/returns truth matrix now exists")) {
  errors.push("commerce-launch-control.ts must acknowledge shipping/returns truth matrix.");
}

for (const forbidden of [
  "guaranteed delivery",
  "free worldwide shipping",
  "checkout is live",
  "payment is live",
  "no returns",
  "risk-free",
]) {
  const haystack = `${model}\n${panel}\n${checkoutPage}\n${returnsPage}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`Shipping/returns truth contains forbidden wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Shipping/returns truth safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Shipping/returns truth safety checks passed.");
