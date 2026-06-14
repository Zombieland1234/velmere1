import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const types = read("lib/products/types.ts");
const catalog = read("lib/products/catalog.generated.ts");
const readiness = read("lib/products/launch-readiness.ts");
const detail = read("components/shop/ProductDetailClient.tsx");
const card = read("components/product/ProductCard.tsx");

for (const needle of [
  "export type ProductTruthProfile",
  "ProductSizeMeasurement",
  "truth?: ProductTruthProfile",
]) {
  if (!types.includes(needle)) errors.push(`lib/products/types.ts missing ${needle}`);
}

for (const needle of [
  "material:",
  "composition:",
  "weight:",
  "fit:",
  "care:",
  "sizeGuide:",
  "deliveryNote:",
  "returnNote:",
  "launchNote:",
]) {
  const count = catalog.split(needle).length - 1;
  if (count < 4) errors.push(`catalog.generated.ts should include product truth field ${needle} for all preview products; found ${count}`);
}

for (const needle of [
  "product_truth_missing",
  "material_missing",
  "composition_missing",
  "fit_missing",
  "care_missing",
  "size_guide_missing",
  "delivery_note_missing",
  "return_note_missing",
  "productTruthIssues(product)",
]) {
  if (!readiness.includes(needle)) errors.push(`launch-readiness.ts missing product truth check ${needle}`);
}

for (const needle of [
  "const truth = selectedProduct.truth",
  "productMeasurements",
  "productSpecs",
  "truth.launchNote",
  "truth.deliveryNote",
  "truth.returnNote",
  "truth.composition",
]) {
  if (!detail.includes(needle)) errors.push(`ProductDetailClient missing dynamic product truth surface ${needle}`);
}

for (const needle of [
  "product.truth?.weight",
  "getLocalizedString(product.truth.fit",
  "getLocalizedString(product.truth.material",
  "productMetrics",
]) {
  if (!card.includes(needle)) errors.push(`ProductCard missing product truth card metric ${needle}`);
}

for (const forbidden of [
  "safe investment",
  "guaranteed",
  "profit promise",
  "checkout active",
]) {
  if (catalog.toLowerCase().includes(forbidden)) errors.push(`catalog contains forbidden product wording: ${forbidden}`);
}

if (errors.length) {
  console.error("Product truth safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Product truth safety checks passed.");
