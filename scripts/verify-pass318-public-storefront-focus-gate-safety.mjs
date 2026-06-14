import fs from "node:fs";

const requiredFiles = [
  "lib/market-integrity/public-storefront-focus-gate.ts",
  "components/home/HomePageClient.tsx",
  "components/shop/ShopPageClient.tsx",
  "components/shop/ProductDetailClient.tsx",
  "components/square/VelmereSquareClient.tsx",
  "components/security/SecurityTrustPage.tsx",
  "app/[locale]/community/page.tsx",
  "app/[locale]/square/page.tsx",
  "app/[locale]/vlm-token/page.tsx",
  "app/[locale]/research-lab/page.tsx",
  "app/[locale]/legal/shipping/page.tsx",
  "app/[locale]/legal/returns/page.tsx",
];

const fail = (message) => {
  console.error(`PASS318 guard failed: ${message}`);
  process.exit(1);
};

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`missing ${file}`);
}

const read = (file) => fs.readFileSync(file, "utf8");

const gate = read("lib/market-integrity/public-storefront-focus-gate.ts");
for (const marker of ["PASS318", "buildPublicStorefrontFocusGate", "operatorSurfaceMode", "blockedPublicSignals", "fake urgency", "buy/sell command"]) {
  if (!gate.includes(marker)) fail(`gate missing marker ${marker}`);
}

const publicSources = requiredFiles
  .filter((file) => !file.startsWith("lib/"))
  .map((file) => [file, read(file)]);

for (const [file, source] of publicSources) {
  for (const hidden of [
    "pass314-operator-only-hidden",
    "pass315-operator-only-hidden",
    "pass316-commerce-operator-hidden",
    "pass317-operator-only-hidden",
  ]) {
    if (source.includes(hidden)) fail(`${file} still renders hidden operator marker ${hidden}`);
  }
}

const forbiddenPublicImports = [
  "FullSurfaceReadinessIndex",
  "SquareVlmLaunchControl",
  "ShippingReturnsTruthPanel",
  "SecurityOperationsChecklistPanel",
  "CommerceLaunchControl",
  "ProviderTruthLedgerPanel",
  "PaymentOrderReadinessPanel",
  "OrderEventLedgerPanel",
];

for (const [file, source] of publicSources) {
  if (file.includes("ShopPageClient") || file.includes("ProductDetailClient")) continue;
  for (const forbidden of forbiddenPublicImports) {
    if (source.includes(forbidden)) fail(`${file} still imports/renders ${forbidden}`);
  }
}

for (const [file, source] of publicSources) {
  if (["components/home/HomePageClient.tsx", "components/shop/ShopPageClient.tsx", "components/shop/ProductDetailClient.tsx", "components/security/SecurityTrustPage.tsx", "app/[locale]/community/page.tsx", "app/[locale]/research-lab/page.tsx"].includes(file)) {
    if (!source.includes("pass318")) fail(`${file} missing PASS318 public marker`);
  }
}

const shop = read("components/shop/ShopPageClient.tsx");
if (!shop.includes("buildPublicStorefrontFocusGate")) fail("shop not wired to storefront focus gate");
if (shop.includes("data-pass316-hidden-commerce-audit")) fail("shop still exposes hidden commerce audit marker");

const home = read("components/home/HomePageClient.tsx");
if (!home.includes("data-pass318-home-focus-rail")) fail("home focus rail missing");
if (home.includes("Launch Reality Ledger") && home.includes("FullSurfaceReadinessIndex")) fail("home still couples launch ledger to public UI");

const product = read("components/shop/ProductDetailClient.tsx");
if (product.includes("providerSnapshot.providerMode") || product.includes("providerSnapshot.sourceMode")) fail("product still emits provider internals");

console.log("PASS318 Public Storefront Focus Gate verified.");
