import { readFileSync } from "node:fs";

const files = {
  gate: "lib/market-integrity/public-commerce-trim-gate.ts",
  shopClient: "components/shop/ShopPageClient.tsx",
  productClient: "components/shop/ProductDetailClient.tsx",
  shopRoute: "app/[locale]/shop/page.tsx",
  clothingRoute: "app/[locale]/clothing/page.tsx",
  productRoute: "app/[locale]/shop/[id]/page.tsx",
  css: "app/globals.css",
};

const src = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")]));

function assert(condition, message) {
  if (!condition) {
    console.error(`PASS316 guard failed: ${message}`);
    process.exit(1);
  }
}

assert(src.gate.includes("PASS316_PUBLIC_COMMERCE_TRIM_GATE"), "public commerce trim gate marker missing");
assert(src.gate.includes("product_first"), "product-first public copy rule missing");
assert(src.gate.includes("hiddenOperatorPanels"), "hidden operator panel contract missing");
assert(src.gate.includes("CommerceLaunchControl") && src.gate.includes("ProviderTruthLedgerPanel") && src.gate.includes("ShippingReturnsTruthPanel"), "operator panel names not tracked in gate");

for (const [key, body] of Object.entries({ shopRoute: src.shopRoute, clothingRoute: src.clothingRoute, productRoute: src.productRoute })) {
  assert(body.includes("PASS316 public commerce trim"), `${key} trim marker missing`);
  assert(!body.includes("CommerceLaunchControl locale="), `${key} still renders CommerceLaunchControl`);
  assert(!body.includes("ProviderTruthLedgerPanel locale="), `${key} still renders ProviderTruthLedgerPanel`);
  assert(!body.includes("ShippingReturnsTruthPanel locale="), `${key} still renders ShippingReturnsTruthPanel`);
}

assert(src.shopClient.includes('data-pass316-public-commerce-trim="shop"'), "shop public trim data marker missing");
assert(src.shopClient.includes('data-pass316-store-buyer-brief="true"'), "shop buyer brief missing");
assert(src.shopClient.includes("publicCommerceTrimGate.customerSignals"), "shop does not use customer-safe gate signals");
if (!src.shopClient.includes('data-pass318-public-storefront-focus="shop"')) {
  assert(src.shopClient.includes('data-pass316-hidden-commerce-audit="shop"'), "shop hidden audit marker missing");
}
assert(!src.shopClient.includes('data-pass316-hidden-commerce-audit="shop"'), "PASS318 should remove shop hidden audit marker from public DOM");
assert(!src.shopClient.includes("Top blockers"), "shop still exposes top blockers wording in public copy");

assert(src.productClient.includes('data-pass316-public-commerce-trim="product"'), "product public trim data marker missing");
assert(src.productClient.includes('data-pass316-product-customer-signals="true"'), "product customer signals missing");
if (!src.productClient.includes('data-pass318-public-storefront-focus="product"')) {
  assert(src.productClient.includes('data-pass316-hidden-commerce-audit="product"'), "product hidden provider audit marker missing");
}
assert(!src.productClient.includes('data-pass316-hidden-commerce-audit="product"'), "PASS318 should remove product hidden provider audit marker from public DOM");
assert(src.productClient.includes("Produkt jest w trybie preview") || src.productClient.includes("This product is in preview mode"), "product customer-safe preview copy missing");
assert(!src.productClient.includes("Provider / SKU truth"), "product still exposes Provider / SKU truth headline");
assert(!src.productClient.includes("Source mode"), "product still exposes raw source mode wording");

assert(src.css.includes("PASS316 · public commerce trim"), "PASS316 CSS marker missing");
assert(src.css.includes(".pass316-commerce-operator-hidden"), "PASS316 operator hidden CSS missing");
assert(src.css.includes('main[data-pass316-public-commerce-trim="shop"] .pass316-commerce-customer-brief'), "shop customer brief containment CSS missing");

console.log("PASS316 Public Commerce Trim + Buyer Surface verified.");
