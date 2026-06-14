import { readFileSync } from "node:fs";

const files = {
  gate: "lib/market-integrity/public-launch-surface-gate.ts",
  home: "components/home/HomePageClient.tsx",
  cart: "app/[locale]/cart/page.tsx",
  checkout: "app/[locale]/checkout/page.tsx",
  vlm: "app/[locale]/vlm-token/page.tsx",
  legalShipping: "app/[locale]/legal/shipping/page.tsx",
  legalReturns: "app/[locale]/legal/returns/page.tsx",
  security: "components/security/SecurityTrustPage.tsx",
  css: "app/globals.css",
  pkg: "package.json",
};

const src = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")]));

function assert(condition, message) {
  if (!condition) {
    console.error(`PASS317 guard failed: ${message}`);
    process.exit(1);
  }
}

assert(src.gate.includes("PASS317_PUBLIC_LAUNCH_SURFACE_GATE"), "gate marker missing");
assert(src.gate.includes("product_or_action_first"), "public rule missing");
assert(src.gate.includes("hiddenOperatorPanels"), "hidden operator panels contract missing");
for (const name of ["FullSurfaceReadinessIndex", "CommerceLaunchControl", "PaymentOrderReadinessPanel", "OrderEventLedgerPanel", "SecurityOperationsChecklistPanel", "ShippingReturnsTruthPanel"]) {
  assert(src.gate.includes(name), `${name} not tracked by gate`);
}

const pass318Home = src.home.includes('data-pass318-public-storefront-focus="home"');
if (!pass318Home) {
  assert(src.home.includes('FullSurfaceReadinessIndex locale={locale} surface="home"'), "home readiness index marker missing for legacy preflight");
  assert(src.home.includes('data-pass317-hidden-launch-ledger="home"'), "home hidden launch ledger marker missing");
  assert(src.home.includes('pass317-operator-only-hidden'), "home readiness index is not hidden from public surface");
}
assert(!src.home.includes("launchReality.map"), "home still maps launch reality cards on public surface");

assert(src.cart.includes('data-pass317-public-launch-surface="cart"'), "cart public launch marker missing");
assert(src.cart.includes("buildPublicLaunchSurfaceGate"), "cart does not use public launch gate");
if (!src.cart.includes('data-pass318-public-storefront-focus')) {
  assert(src.cart.includes('data-pass317-hidden-launch-panels="cart"'), "cart hidden operator marker missing");
}
assert(!src.cart.includes("CommerceLaunchControl locale="), "cart still renders CommerceLaunchControl");
assert(!src.cart.includes("PaymentOrderReadinessPanel locale="), "cart still renders PaymentOrderReadinessPanel");
assert(!src.cart.includes("OrderEventLedgerPanel locale="), "cart still renders OrderEventLedgerPanel");

assert(src.checkout.includes('data-pass317-public-launch-surface="checkout"'), "checkout public launch marker missing");
assert(src.checkout.includes("buildPublicLaunchSurfaceGate"), "checkout does not use public launch gate");
if (!src.checkout.includes('data-pass318-public-storefront-focus')) {
  assert(src.checkout.includes('data-pass317-hidden-launch-panels="checkout"'), "checkout hidden operator marker missing");
}
for (const forbidden of ["CommerceLaunchControl locale=", "ProviderTruthLedgerPanel locale=", "ShippingReturnsTruthPanel locale=", "PaymentOrderReadinessPanel locale=", "OrderEventLedgerPanel locale=", "FullSurfaceReadinessIndex locale=", "ProductionDataBackbonePanel locale=", "StorageAdapterReadinessPanel locale=", "AccountOrderEventTimelinePanel locale="]) {
  assert(!src.checkout.includes(forbidden), `checkout still renders ${forbidden}`);
}
assert(src.checkout.includes('href="/shop"') && src.checkout.includes('href="/contact"'), "checkout lacks clean shop/contact actions");

if (!src.vlm.includes("PASS318")) {
  assert(src.vlm.includes('data-pass317-hidden-launch-panels="vlm"'), "vlm launch panels not hidden");
}
if (!src.legalShipping.includes("PASS318 route removal")) {
  assert(!src.legalShipping.includes("ShippingReturnsTruthPanel locale="), "shipping legal still renders panel");
}
if (!src.legalReturns.includes("PASS318 route removal")) {
  assert(!src.legalReturns.includes("ShippingReturnsTruthPanel locale="), "returns legal still renders panel");
}
assert(src.security.includes('data-pass317-public-launch-surface="security"'), "security public launch marker missing");
if (!src.security.includes('data-pass318-security-public-note')) {
  assert(src.security.includes('data-pass317-hidden-launch-panels="security-roadmap"'), "security roadmap hidden marker missing");
}

assert(src.css.includes("PASS317 · public launch surface trim"), "PASS317 CSS marker missing");
assert(src.css.includes(".pass317-operator-only-hidden"), "PASS317 hidden class missing");
assert(src.pkg.includes("verify:pass317-public-launch-surface-gate"), "package script missing");

console.log("PASS317 Public Launch Surface Trim verified.");
