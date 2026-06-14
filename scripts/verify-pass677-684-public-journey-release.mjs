import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requireAll = (file, needles) => {
  const text = read(file);
  for (const needle of needles) {
    if (!text.includes(needle)) throw new Error(`${file}: missing ${needle}`);
  }
  return text;
};

requireAll("components/PageTransition.tsx", ["data-pass677-route-motion", "velmere-route-wash"]);
const cart = requireAll("app/[locale]/cart/page.tsx", ["data-pass678-cart-quiet-empty-state", "velmere-empty-state", "Przejdź do kolekcji"]);
const checkout = requireAll("app/[locale]/checkout/page.tsx", ["data-pass679-checkout-calm-state", "velmere-checkout-state", "Bez presji"]);
const contact = requireAll("app/[locale]/contact/page.tsx", ["data-pass680-contact-clean-service", "velmere-contact-mail", "Bezpieczeństwo przed pośpiechem"]);
const faq = requireAll("app/[locale]/faq/page.tsx", ["data-pass680-faq-calm-accordion", "velmere-faq-item", "<details"]);
const about = requireAll("app/[locale]/market-integrity/about/page.tsx", ["data-pass681-shield-about-public-story", "velmere-shield-orbit", "Granica odpowiedzialności"]);
requireAll("app/[locale]/research-lab/page.tsx", ["data-pass682-research-editorial-surface", "velmere-research-details", "velmere-research-orbit"]);
requireAll("app/[locale]/loading.tsx", ["aria-busy=\"true\"", "velmere-skeleton"]);
requireAll("app/[locale]/not-found.tsx", ["data-pass683-localized-not-found", "useLocale", "velmere-not-found"]);
requireAll("app/globals.css", ["PASS677–684", "@media (prefers-reduced-motion: reduce)", "velmere-skeleton-sweep", "velmere-faq-item[open]"]);

if (contact.includes("LegalDraftPage") || contact.includes("getTranslations")) {
  throw new Error("contact page still renders the legal draft surface");
}
if (/82%|72%|42%/.test(about)) throw new Error("Shield about still exposes internal build percentages");
if (/Printful|Contrado|Tapstitch|Stripe\/checkout/.test(checkout)) throw new Error("checkout still exposes provider implementation copy");
if ((cart.match(/data-pass/g) ?? []).length < 8) throw new Error("cart compatibility markers were lost");
if (!faq.includes('href="/shipping"') && !faq.includes('const routeHrefs')) throw new Error("FAQ service routes missing");

console.log("PASS677–684 public journey release verified · route motion · cart/checkout · FAQ/contact · Shield story · research · loading/404");
