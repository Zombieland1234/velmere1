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
  "components/product/ProductCard.tsx",
  "components/shop/ProductDetailClient.tsx",
  "lib/launch/provider-truth-ledger.ts",
]) {
  if (!exists(file)) errors.push(`${file}: missing product provider snapshot dependency.`);
}

const card = read("components/product/ProductCard.tsx");
const detail = read("components/shop/ProductDetailClient.tsx");
const ledger = read("lib/launch/provider-truth-ledger.ts");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");

for (const needle of [
  "buildProductProviderTruthSnapshot(product)",
  "providerSnapshotCopy",
  "providerSnapshotStatusLabel",
  "providerSnapshot.score",
  "providerSnapshot.sourceMode",
  "providerSnapshot.missing",
]) {
  if (!card.includes(needle)) errors.push(`ProductCard.tsx missing provider snapshot card marker: ${needle}`);
}

for (const needle of [
  "buildProductProviderTruthSnapshot(selectedProduct)",
  "providerSnapshotTitle",
  "Provider / SKU truth",
  "Provider / SKU Truth",
  "Provider / SKU truth",
  "providerSnapshot.missing.join",
  "providerSnapshot.providerMode",
]) {
  if (!detail.includes(needle)) errors.push(`ProductDetailClient.tsx missing provider snapshot detail marker: ${needle}`);
}

for (const needle of [
  "buildProductProviderTruthSnapshot",
  "SKU truth snapshots now surface on cards/details",
  "progress: 39",
]) {
  if (!ledger.includes(needle)) errors.push(`provider-truth-ledger.ts missing updated provider snapshot marker: ${needle}`);
}

if (!progress.includes('progress: 73') || !(progress.includes('progress: 42') || (progress.includes('progress: 45') || (progress.includes('progress: 48') || progress.includes('progress: 50'))))) {
  errors.push("project-progress.ts must include updated product/checkout progress after product provider snapshot.");
}
if (!((audit.includes('progress: 73') || audit.includes('progress: 70')) && (audit.includes('progress: 42') || (audit.includes('progress: 45') || (audit.includes('progress: 48') || audit.includes('progress: 50')))))) {
  errors.push("site-page-audit.ts must include updated product/checkout audit progress after product provider snapshot.");
}

for (const forbidden of [
  "checkout is live",
  "payment is live",
  "guaranteed delivery",
  "risk-free",
  "guaranteed profit",
]) {
  const haystack = `${card}\n${detail}\n${ledger}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`Product provider snapshot contains forbidden wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Product provider snapshot safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Product provider snapshot safety checks passed.");
