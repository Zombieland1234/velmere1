import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const dashboard = read("app/[locale]/dashboard/page.tsx");
const clothing = read("app/[locale]/clothing/page.tsx");
const collection = read("app/[locale]/collection/page.tsx");
const rootCollection = read("app/collection/page.tsx");
const privacyAlias = read("app/[locale]/privacy-policy/page.tsx");
const sitemap = read("app/sitemap.ts");
const navbar = read("components/Navbar.tsx");
const footer = read("components/Footer.tsx");
const square = read("app/[locale]/square/page.tsx");
const community = read("app/[locale]/community/page.tsx");
const siteAudit = read("lib/launch/site-page-audit.ts");
const css = read("app/globals.css");
const pkg = read("package.json");

add("Dashboard redirects to the canonical account route", dashboard.includes("redirect(`/${locale}/account`)"));
add("Dashboard no longer exposes operator launch panels", !dashboard.includes("ProductionDataBackbonePanel") && !dashboard.includes("StorageAdapterReadinessPanel") && !dashboard.includes("AccountOrderEventTimelinePanel"));
add("Clothing alias redirects to the canonical shop", clothing.includes("redirect(`/${locale}/shop`)") && !clothing.includes("ShopPageClient"));
add("Collection aliases redirect directly to shop", collection.includes("redirect(`/${locale}/shop`)") && rootCollection.includes('redirect("/pl/shop")'));
add("Privacy policy alias redirects to canonical privacy", privacyAlias.includes("redirect(`/${locale}/privacy`)"));
add("Navigation uses the canonical shop route", !navbar.includes('{ href: "/clothing"') && navbar.includes('{ href: "/shop", label: labels.collection }'));
add("Footer uses the canonical shop route", !footer.includes('{ href: "/clothing"') && footer.includes('{ href: "/shop", label: "Clothing" }'));
add("Sitemap excludes aliases and authentication", !sitemap.includes('"/clothing"') && !sitemap.includes('"/login"'));
add("Sitemap includes public trust and research routes", sitemap.includes('"/research-lab"') && sitemap.includes('"/security"') && sitemap.includes('"/security/audits"'));
add("Sitemap freshness is updated", sitemap.includes('new Date("2026-06-14")'));
add("Square metadata describes public reading and gated publishing", square.includes("public-readable") && square.includes("publishing and private features require access"));
add("Internal page audit identifies clothing as a canonical shop alias", siteAudit.includes('id: "clothing-alias"') && siteAudit.includes("legacy clothing route redirects to the localized /shop catalogue"));
add("Community uses a cardless directory surface", community.includes('data-pass2010-community="cardless-directory-cyan-focus-low-motion"') && community.includes("pass2010-community-links") && !community.includes("velmere-command-shell"));
add("Community links have cyan focus and reduced-motion guards", css.includes("PASS2010 - canonical public routes and cardless community directory") && css.includes("rgba(165, 243, 252, 0.34)") && css.includes('[data-pass2010-community="cardless-directory-cyan-focus-low-motion"] *'));
add("Package includes PASS2010 verifier", pkg.includes("verify:pass2010-route-canonical-community-sweep"));

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
}

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  console.error(`PASS2010 verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}

console.log(`PASS2010 verification passed: ${checks.length}/${checks.length}`);
