import fs from "node:fs";

const requiredFiles = [
  "lib/market-integrity/public-first-purchase-flow-gate.ts",
  "components/home/HomePageClient.tsx",
  "components/shop/ShopPageClient.tsx",
  "components/shop/ProductDetailClient.tsx",
  "app/[locale]/cart/page.tsx",
  "app/[locale]/checkout/page.tsx",
  "package.json",
];

const fail = (message) => {
  console.error(`PASS319 guard failed: ${message}`);
  process.exit(1);
};

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`missing ${file}`);
}

const read = (file) => fs.readFileSync(file, "utf8");
const gate = read("lib/market-integrity/public-first-purchase-flow-gate.ts");
for (const marker of [
  "PASS319",
  "quiet_first_purchase_constellation",
  "antiFomoBoundary",
  "MEXC-style live expiry window",
  "reserve/provenance snapshot class",
  "No countdowns",
  "wallet pressure",
]) {
  if (!gate.includes(marker)) fail(`gate missing marker ${marker}`);
}

for (const file of requiredFiles.filter((file) => file.endsWith(".tsx"))) {
  const source = read(file);
  if (!source.includes("data-pass319-public-first-purchase-flow")) fail(`${file} missing PASS319 public first purchase marker`);
  if (!source.includes("buildPublicFirstPurchaseFlowGate")) fail(`${file} not wired to PASS319 gate`);
}

const home = read("components/home/HomePageClient.tsx");
if (!home.includes("Quiet first purchase")) fail("home missing customer-safe first purchase rail");
if (!home.includes("firstPurchaseFlow.customerSteps")) fail("home does not render first purchase steps");

const shop = read("components/shop/ShopPageClient.tsx");
if (!shop.includes("data-pass319-shop-purchase-constellation")) fail("shop missing PASS319 constellation card");
if (shop.includes("FullSurfaceReadinessIndex")) fail("shop reintroduced readiness wall");

const product = read("components/shop/ProductDetailClient.tsx");
if (!product.includes("firstPurchaseFlow.customerSteps")) fail("product missing PASS319 customer steps");
if (product.includes("providerSnapshot.providerMode") || product.includes("providerSnapshot.sourceMode")) fail("product leaked provider internals again");

const cart = read("app/[locale]/cart/page.tsx");
if (!cart.includes("quiet cart review")) fail("cart missing quiet review copy");

const checkout = read("app/[locale]/checkout/page.tsx");
if (!checkout.includes("proof-gated checkout")) fail("checkout missing proof-gated copy");

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts["verify:pass319-public-first-purchase-flow-gate"]) fail("package script missing");

console.log("PASS319 Public First Purchase Flow Gate verified.");
