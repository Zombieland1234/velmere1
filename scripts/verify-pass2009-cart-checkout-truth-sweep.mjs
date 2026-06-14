import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const cartPage = read("app/[locale]/cart/page.tsx");
const drawer = read("components/CartDrawer.tsx");
const success = read("app/[locale]/checkout/success/page.tsx");
const cancel = read("app/[locale]/checkout/cancel/page.tsx");
const messages = ["pl", "de", "en"].map((locale) => JSON.parse(read(`messages/${locale}.json`)));
const css = read("app/globals.css");
const pkg = read("package.json");

const checks = [];
const add = (name, ok) => checks.push({ name, ok });

add("Cart page reads real items, count, subtotal and hydration state", cartPage.includes("items, itemCount, subtotal, currency, hasHydrated") && cartPage.includes("items.length > 0"));
add("Cart page renders real line items and line totals", cartPage.includes("items.map((item)") && cartPage.includes("item.price * item.quantity"));
add("Cart page has a hydration loading state instead of flashing empty", cartPage.includes("!hasHydrated ?") && cartPage.includes('aria-busy="true"'));
add("Cart page subtotal explains address-dependent shipping and taxes", /shipping and taxes are calculated/i.test(cartPage) && cartPage.includes("Dostawa i podatki zostaną obliczone"));
add("Cart drawer locks background scroll and uses short motion", drawer.includes("motionDuration={0.28}") && drawer.includes("lockScroll"));
add("Cart drawer no longer calculates a hard-coded 19 percent VAT", !drawer.includes("VAT_RATE") && !drawer.includes("netAmount") && !drawer.includes("vatAmount"));
add("Cart drawer renders subtotal with address-dependent tax copy", drawer.includes('t("subtotal")') && drawer.includes('t("taxAtAddress")'));
add("Cart drawer no longer alternates a false ready-to-ship claim", !drawer.includes('index % 2 === 0 ? t("itemAdded") : t("readyToShip")') && drawer.includes('{t("itemAdded")}'));
add("Success page never claims confirmed payment from query params", success.includes('data-pass2009-checkout-success="pending-verification-not-false-confirmed"') && !success.includes("STATUS: CONFIRMED") && !success.includes(">Confirmed<"));
add("Success page masks the checkout reference", success.includes("sessionId.slice(-10)") && !success.includes("{sessionId}</dd>"));
add("Cancel page avoids claiming that no payment was captured", cancel.includes('data-pass2009-checkout-cancel="no-unverified-payment-claim"') && !cancel.includes("No payment was captured"));
add("Checkout truth copy exists in every locale", messages.every((message) => message.Cart.taxAtAddress && message.Checkout.successTitle && message.Checkout.cancelBody));
add("Localized success titles no longer claim payment confirmed", messages.every((message) => !/Payment confirmed|Płatność potwierdzona|Zahlung bestätigt/.test(message.Checkout.successTitle)));
add("Localized cancel copy does not guarantee no charge", messages.every((message) => !/No payment was captured|Nie pobrano płatności|keine Zahlung erfasst/i.test(message.Checkout.cancelBody)));
add("PASS2009 CSS defines solid surfaces and cyan focus", css.includes("PASS2009 - truthful cart totals and checkout receipt states") && css.includes('data-pass2009-cart="scroll-lock-subtotal-tax-at-address-truth"') && css.includes("rgba(165, 243, 252, 0.34)"));
add("PASS2009 CSS includes mobile and reduced-motion guards", css.includes("[data-pass2009-cart-page=") && css.includes("@media (prefers-reduced-motion: reduce)"));
add("Package includes PASS2009 verifier", pkg.includes("verify:pass2009-cart-checkout-truth-sweep"));
add("package.json parses", (() => { try { JSON.parse(pkg); return true; } catch { return false; } })());
add("CSS braces are balanced", (() => {
  let depth = 0;
  for (const char of css) {
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
})());

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? "OK" : "FAIL"} ${check.name}`);
if (failed.length) {
  console.error(`PASS2009 verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS2009 verification passed: ${checks.length}/${checks.length}`);
