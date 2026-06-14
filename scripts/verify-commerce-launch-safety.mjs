import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const launch = read("lib/products/launch-readiness.ts");
const shop = read("components/shop/ShopPageClient.tsx");
const catalog = read("lib/products/catalog.generated.ts");

for (const needle of [
  "export function auditProductLaunchReadiness",
  "export function buildCommerceLaunchAudit",
  "checkout_disabled",
  "automatic_mapping_missing",
  "localized_copy_missing",
  "preview mode; checkout should stay closed",
]) {
  if (!launch.includes(needle)) errors.push(`lib/products/launch-readiness.ts missing ${needle}`);
}

for (const forbidden of [
  "investment",
  "profit",
  "guaranteed",
  "VLM blocks purchase",
]) {
  if (launch.toLowerCase().includes(forbidden.toLowerCase())) errors.push(`launch-readiness contains forbidden commerce wording: ${forbidden}`);
}

for (const needle of [
  "buildCommerceLaunchAudit(products)",
  "launchAudit.averageScore",
  "commerce.readinessKicker",
  "commerce.readinessTitle",
  "commerce.issueTitle",
]) {
  if (!shop.includes(needle)) errors.push(`ShopPageClient missing commerce launch surface: ${needle}`);
}

if (!catalog.includes('status: "coming_soon"')) {
  errors.push("catalog.generated.ts should keep preview products as coming_soon until fulfilment is production-ready.");
}

if (catalog.includes('status: "active"') && catalog.includes('fulfilmentMode: "disabled"')) {
  errors.push("catalog.generated.ts has active product with disabled fulfilment.");
}

if (errors.length) {
  console.error("Commerce launch safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Commerce launch safety checks passed.");
