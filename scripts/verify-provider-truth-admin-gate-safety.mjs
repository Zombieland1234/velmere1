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
  "lib/launch/provider-truth-ledger.ts",
  "components/launch/ProviderTruthLedgerPanel.tsx",
  "app/[locale]/shop/page.tsx",
  "app/[locale]/clothing/page.tsx",
  "app/[locale]/shop/[id]/page.tsx",
  "app/[locale]/checkout/page.tsx",
  "app/[locale]/admin/import-products/page.tsx",
]) {
  if (!exists(file)) errors.push(`${file}: missing provider truth/admin gate file or route integration.`);
}

const ledger = read("lib/launch/provider-truth-ledger.ts");
const panel = read("components/launch/ProviderTruthLedgerPanel.tsx");
const shopPage = read("app/[locale]/shop/page.tsx");
const clothingPage = read("app/[locale]/clothing/page.tsx");
const productPage = read("app/[locale]/shop/[id]/page.tsx");
const checkoutPage = read("app/[locale]/checkout/page.tsx");
const adminPage = read("app/[locale]/admin/import-products/page.tsx");
const commerceControl = read("lib/launch/commerce-launch-control.ts");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");

for (const needle of [
  "providerTruthLedger",
  "buildProductProviderTruthSnapshot",
  "getProviderTruthLedgerSummary",
  "Printful provider truth",
  "Tapstitch provider truth",
  "Contrado provider truth",
  "All SKU readiness",
  "provider variant mapping",
]) {
  if (!ledger.includes(needle)) errors.push(`provider-truth-ledger.ts missing marker: ${needle}`);
}

for (const needle of [
  "ProviderTruthLedgerPanel",
  "surface: \"shop\" | \"product\" | \"admin\" | \"checkout\"",
  "Provider, SKU and shipping need proof.",
  "Provider, SKU i dostawa muszą mieć dowód.",
  "Provider, SKU und Versand brauchen Nachweise.",
]) {
  if (!panel.includes(needle)) errors.push(`ProviderTruthLedgerPanel.tsx missing marker: ${needle}`);
}

const integrations = [
  [shopPage, 'surface="shop"', "shop page"],
  [clothingPage, 'surface="shop"', "clothing page"],
  [productPage, 'surface="product"', "product page"],
  [checkoutPage, 'surface="checkout"', "checkout page"],
  [adminPage, 'surface="admin"', "admin import page"],
];

for (const [source, marker, label] of integrations) {
  if (!source.includes("ProviderTruthLedgerPanel") || !source.includes(marker)) {
    errors.push(`${label} must render ProviderTruthLedgerPanel with ${marker}.`);
  }
}

for (const needle of [
  "adminGateCopy",
  "Admin import is a private tool.",
  "Admin import jest narzędziem prywatnym.",
  "Admin Import ist ein privates Werkzeug.",
  "admin gate / launch control",
]) {
  if (!adminPage.includes(needle)) errors.push(`admin import page missing admin gate marker: ${needle}`);
}

if (!commerceControl.includes("Provider truth ledger now exists")) {
  errors.push("commerce-launch-control.ts must acknowledge provider truth ledger status.");
}
if (!(progress.includes('progress: 70') || progress.includes('progress: 73')) || !(progress.includes('progress: 39') || (progress.includes('progress: 42') || (progress.includes('progress: 45') || (progress.includes('progress: 48') || progress.includes('progress: 50')))))) {
  errors.push("project-progress.ts must include updated product/checkout progress after provider truth ledger.");
}
if (!((audit.includes('progress: 70') || (audit.includes('progress: 76') || (audit.includes('progress: 81') || audit.includes('progress: 85')))) || audit.includes('progress: 73')) || !(audit.includes('progress: 39') || (audit.includes('progress: 42') || (audit.includes('progress: 45') || ((audit.includes('progress: 48') || (audit.includes('progress: 55') || (audit.includes('progress: 64') || (audit.includes('progress: 70') || (audit.includes('progress: 76') || (audit.includes('progress: 81') || audit.includes('progress: 85'))))))) || audit.includes('progress: 50'))))) || !(audit.includes('progress: 41') || (audit.includes('progress: 48') || (audit.includes('progress: 55') || (audit.includes('progress: 64') || (audit.includes('progress: 70') || (audit.includes('progress: 76') || (audit.includes('progress: 81') || audit.includes('progress: 85'))))))))) {
  errors.push("site-page-audit.ts must include updated product/checkout/admin progress after provider truth ledger.");
}

for (const forbidden of [
  "guaranteed delivery",
  "checkout is live",
  "payment is live",
  "no returns",
  "fake stock",
  "risk-free",
]) {
  const haystack = `${ledger}\n${panel}\n${adminPage}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`Provider truth/admin gate contains forbidden wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Provider truth/admin gate safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Provider truth/admin gate safety checks passed.");
