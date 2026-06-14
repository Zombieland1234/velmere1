import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const shop = read("components/shop/ShopPageClient.tsx");
const productCard = read("components/product/ProductCard.tsx");
const lookbook = read("app/[locale]/lookbook/page.tsx");
const archive = read("app/[locale]/archive/page.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");

const checks = [];
const add = (name, ok) => checks.push({ name, ok });

add("Shop normalizes unknown category query values", shop.includes('categoryParam === "outerwear"') && shop.includes('categoryParam === "tops"') && shop.includes('categoryParam === "bottoms"'));
add("Shop category filters use real product tags", shop.includes("function matchesCategory(tags: string[]") && shop.includes('["hoodie", "jacket", "coat", "outerwear"]') && shop.includes('["pants", "trouser", "shorts", "bottoms"]'));
add("Filtered products are computed before sorting and counting", shop.includes("!product.isVlmLocked && matchesCategory(product.tags, category)") && shop.includes("}, [category, sort])"));
add("Fake Men/Women filters are removed", !shop.includes('key: "men"') && !shop.includes('key: "women"'));
add("Shop no longer runs an endless typewriter state loop", !shop.includes("setPromptState") && !shop.includes("animatedHeroTitle") && shop.includes("{matrix.title}"));
add("Shop exposes a localized empty category state", shop.includes("pass2008-shop-empty") && shop.includes("matrix.emptyTitle") && shop.includes("matrix.emptyBody"));
add("Product cards use short entrance motion and cyan focus", productCard.includes("duration: 0.24") && productCard.includes('data-pass2008-product-card="solid-cyan-focus-low-motion"') && productCard.includes("focus-visible:ring-cyan-200"));
add("Lookbook uses varied editorial spans", lookbook.includes('md:col-span-2 xl:col-span-2') && lookbook.includes('data-pass2008-lookbook="editorial-grid-overlay-captions"'));
add("Lookbook uses localized intro and image-overlay captions", lookbook.includes('t("intro")') && lookbook.includes("bg-gradient-to-t") && !lookbook.includes('bg-[#F5F0E8] p-4 text-black'));
add("Lookbook uses a valid stable spacing token", lookbook.includes('className="py-24 md:py-32"') && !lookbook.includes("md:py-30"));
add("Archive no longer embeds unrelated Bajak protocol UI", !archive.includes("BajakProtocolVisual") && !archive.includes("systemNotes"));
add("Archive preview disclosure is localized", archive.includes("const previewNote = locale ===") && archive.includes("{previewNote}"));
add("Archive uses restrained dark disclosure band", archive.includes('data-pass2008-archive="fashion-only-localized-solid"') && archive.includes("pass2008-archive-note"));
add("PASS2008 CSS includes solid surfaces and cyan focus", css.includes("PASS2008 - commerce catalog, Lookbook and Archive logic/visual sweep") && css.includes('data-pass2008-shop="real-category-filter-static-hero-solid-low-lag"') && css.includes("rgba(165, 243, 252, 0.34)"));
add("PASS2008 CSS includes mobile sticky-filter containment", css.includes("max-height: calc(100dvh - var(--velmere-header-mobile, 68px) - 1rem)") && css.includes("overscroll-behavior: contain"));
add("PASS2008 CSS includes reduced-motion coverage", css.includes('[data-pass2008-archive="fashion-only-localized-solid"] *') && css.includes("animation-iteration-count: 1 !important"));
add("Package includes PASS2008 verifier", pkg.includes("verify:pass2008-commerce-lookbook-archive-sweep"));
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
  console.error(`PASS2008 verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS2008 verification passed: ${checks.length}/${checks.length}`);
