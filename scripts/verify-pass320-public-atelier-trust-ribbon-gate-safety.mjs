import fs from "node:fs";

const requiredFiles = [
  "lib/market-integrity/public-atelier-trust-ribbon-gate.ts",
  "components/home/HomePageClient.tsx",
  "components/shop/ShopPageClient.tsx",
  "components/shop/ProductDetailClient.tsx",
  "app/[locale]/cart/page.tsx",
  "app/[locale]/checkout/page.tsx",
  "package.json",
];

const fail = (message) => {
  console.error(`PASS320 guard failed: ${message}`);
  process.exit(1);
};

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`missing ${file}`);
}

const read = (file) => fs.readFileSync(file, "utf8");
const gate = read("lib/market-integrity/public-atelier-trust-ribbon-gate.ts");
for (const marker of [
  "PASS320",
  "atelier_trust_ribbon",
  "antiFomoBoundary",
  "MEXC-style source expiry window",
  "DPP traceability class",
  "no wallet pressure",
  "no fake scarcity",
]) {
  if (!gate.includes(marker)) fail(`gate missing marker ${marker}`);
}

for (const file of requiredFiles.filter((file) => file.endsWith(".tsx"))) {
  const source = read(file);
  if (!source.includes("data-pass320-public-atelier-trust-ribbon")) fail(`${file} missing PASS320 surface marker`);
  if (!source.includes("buildPublicAtelierTrustRibbonGate")) fail(`${file} not wired to PASS320 gate`);
  if (source.includes("ProviderTruthLedgerPanel") || source.includes("CommerceLaunchControl") || source.includes("PaymentOrderReadinessPanel")) {
    fail(`${file} reintroduced operator launch wall`);
  }
}

const home = read("components/home/HomePageClient.tsx");
if (!home.includes("Atelier trust ribbon")) fail("home missing customer-safe ribbon copy");
if (!home.includes("atelierTrustRibbon.ribbonSteps")) fail("home does not render ribbon steps");

const shop = read("components/shop/ShopPageClient.tsx");
if (!shop.includes("data-pass320-shop-trust-ribbon")) fail("shop missing PASS320 ribbon block");
if (!shop.includes("Trust before checkout")) fail("shop missing buyer-facing trust headline");

const product = read("components/shop/ProductDetailClient.tsx");
if (!product.includes("data-pass320-product-trust-ribbon")) fail("product missing PASS320 ribbon block");
if (product.includes("providerSnapshot.providerMode") || product.includes("providerSnapshot.sourceMode")) fail("product leaked provider internals again");

const cart = read("app/[locale]/cart/page.tsx");
if (!cart.includes("data-pass320-cart-trust-ribbon")) fail("cart missing PASS320 ribbon block");

const checkout = read("app/[locale]/checkout/page.tsx");
if (!checkout.includes("data-pass320-checkout-trust-ribbon")) fail("checkout missing PASS320 ribbon block");

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts["verify:pass320-public-atelier-trust-ribbon-gate"]) fail("package script missing");

console.log("PASS320 Public Atelier Trust Ribbon Gate verified.");
