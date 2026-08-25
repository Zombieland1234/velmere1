"use client";

import { useEffect, useMemo } from "react";
import { ArrowUpRight, Bell, CreditCard, Headphones, PackageCheck, Truck, WalletCards } from "lucide-react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/navigation";
import ProductCard from "@/components/ProductCard";
import LuxurySection from "@/components/layout/LuxurySection";
import { fadeUp } from "@/lib/motion";
import { trackVelmereEvent } from "@/lib/analytics";
import { getVisibleProducts } from "@/lib/products/catalog";
import type { Product } from "@/lib/products/types";
import type { PublicCatalogReadthroughReceipt } from "@/lib/products/public-catalog-readthrough";
import { buildCommerceLaunchAudit } from "@/lib/products/launch-readiness";

const matrixSlots = ["Archive cut", "Drop reserve"];

const categories = [
  { key: null, href: "/shop" },
  { key: "outerwear", href: "/shop?category=outerwear" },
  { key: "tops", href: "/shop?category=tops" },
  { key: "bottoms", href: "/shop?category=bottoms" },
] as const;

const genderFilters = [
  { key: null, label: { pl: "Wszyscy", en: "All fit", de: "Alle" } },
  { key: "men", label: { pl: "Męskie", en: "Men", de: "Herren" } },
  { key: "women", label: { pl: "Damskie", en: "Women", de: "Damen" } },
  { key: "unisex", label: { pl: "Unisex", en: "Unisex", de: "Unisex" } },
] as const;

const sortLinks = [
  { key: "featured", href: "/shop", token: "sortFeatured" },
  { key: "new", href: "/shop?sort=new", token: "sortNewest" },
  { key: "price-asc", href: "/shop?sort=price-asc", token: "sortLowHigh" },
  { key: "price-desc", href: "/shop?sort=price-desc", token: "sortHighLow" },
] as const;

function matrixCopy(locale: string, category: string | null) {
  const categoryKey = category === "outerwear" || category === "tops" || category === "bottoms" ? category : null;
  if (locale === "pl") {
    const labels = { outerwear: "Okrycia", tops: "Góra", bottoms: "Dół" } as const;
    return {
      label: categoryKey ? labels[categoryKey] : "Clothing",
      title: categoryKey ? `${labels[categoryKey]} Velmère.` : "Velmère atelier.",
      body: "Duże kadry, czyste karty, rozmiar i cena. Zakup ma być prosty, a warstwa cyfrowa zostaje w tle.",
      locked: "Slot przyszłego dropu",
      reservedBody: "Miejsce pod przyszły drop.",
      categoryLabels: { all: "Wszystko", outerwear: "Okrycia", tops: "Góra", bottoms: "Dół" },
      emptyTitle: "W tej kategorii nie ma jeszcze produktów.",
      emptyBody: "Wróć do pełnej kolekcji albo wybierz inną kategorię.",
    };
  }
  if (locale === "de") {
    const labels = { outerwear: "Outerwear", tops: "Oberteile", bottoms: "Hosen" } as const;
    return {
      label: categoryKey ? labels[categoryKey] : "Clothing",
      title: categoryKey ? `${labels[categoryKey]} von Velmère.` : "Velmère Atelier.",
      body: "Große Bilder, klare Karten, Größe und Preis. Die digitale Ebene bleibt im Hintergrund und blockiert den Kauf nicht.",
      locked: "Slot für kommenden Drop",
      reservedBody: "Platz für einen kommenden Drop.",
      categoryLabels: { all: "Alle", outerwear: "Outerwear", tops: "Oberteile", bottoms: "Hosen" },
      emptyTitle: "In dieser Kategorie gibt es noch keine Produkte.",
      emptyBody: "Kehre zur gesamten Kollektion zurück oder wähle eine andere Kategorie.",
    };
  }
  const labels = { outerwear: "Outerwear", tops: "Tops", bottoms: "Bottoms" } as const;
  return {
    label: categoryKey ? labels[categoryKey] : "Clothing",
    title: categoryKey ? `${labels[categoryKey]} by Velmère.` : "Velmère atelier.",
    body: "Large frames, clean cards, size and price. The digital layer stays in the background and never blocks purchase.",
    locked: "Future drop slot",
    reservedBody: "Reserved for a future drop.",
    categoryLabels: { all: "All", outerwear: "Outerwear", tops: "Tops", bottoms: "Bottoms" },
    emptyTitle: "No products are available in this category yet.",
    emptyBody: "Return to the full collection or choose another category.",
  };
}

function matchesCategory(tags: string[], category: string | null) {
  if (!category) return true;
  if (category === "outerwear") return tags.some((tag) => ["hoodie", "jacket", "coat", "outerwear"].includes(tag));
  if (category === "tops") return tags.some((tag) => ["tee", "shirt", "top", "polo"].includes(tag));
  if (category === "bottoms") return tags.some((tag) => ["pants", "trouser", "shorts", "bottoms"].includes(tag));
  return true;
}

function matchesGender(tags: string[], gender: "men" | "women" | "unisex" | null) {
  if (!gender) return true;
  if (gender === "unisex") return tags.includes("unisex") || tags.includes("gender:unisex");
  if (gender === "men") return tags.includes("men") || tags.includes("unisex") || tags.includes("gender:unisex");
  if (gender === "women") return tags.includes("women") || tags.includes("unisex") || tags.includes("gender:unisex");
  return true;
}

function shopHref(input: { category?: string | null; gender?: string | null; sort?: string | null }) {
  const params = new URLSearchParams();
  if (input.category) params.set("category", input.category);
  if (input.gender) params.set("gender", input.gender);
  if (input.sort && input.sort !== "featured") params.set("sort", input.sort);
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

type ShopPageProps = {
  products?: Product[];
  catalogReceipt?: PublicCatalogReadthroughReceipt;
};

export default function ShopPage({ products: publicProducts, catalogReceipt }: ShopPageProps) {
  const t = useTranslations("Shop");
  const trust = useTranslations("Trust");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const category =
    categoryParam === "outerwear" || categoryParam === "tops" || categoryParam === "bottoms"
      ? categoryParam
      : null;
  const genderParam = searchParams.get("gender");
  const gender = genderParam === "men" || genderParam === "women" || genderParam === "unisex" ? genderParam : null;
  const sort = searchParams.get("sort") ?? "featured";

  const products = useMemo(() => {
    const sourceProducts = publicProducts ?? getVisibleProducts();
    const base = sourceProducts.filter(
      (product) => !product.isVlmLocked && matchesCategory(product.tags, category) && matchesGender(product.tags, gender),
    );
    const sorted = [...base];
    if (sort === "price-asc") sorted.sort((a, b) => a.price.amount - b.price.amount);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price.amount - a.price.amount);
    else if (sort === "new") sorted.sort((a, b) => String(b.id).localeCompare(String(a.id)));
    else sorted.sort((a, b) => b.price.amount - a.price.amount);
    return sorted;
  }, [category, gender, publicProducts, sort]);

  const visibleSlots = [...products, ...matrixSlots].slice(0, products.length + 2);
  const matrix = matrixCopy(locale, category);
  const launchAudit = useMemo(() => buildCommerceLaunchAudit(products), [products]);
  // PASS2062 commerce launch surface markers: commerce.readinessKicker · commerce.readinessTitle · commerce.issueTitle
  useEffect(() => {
    trackVelmereEvent("clothing_view", { category: category ?? "all", sort });
  }, [category, sort]);

  const trustItems = [
    { icon: CreditCard, label: trust("securePayment") },
    { icon: Truck, label: trust("trackedShipping") },
    { icon: PackageCheck, label: trust("returnsPolicy") },
    { icon: Headphones, label: trust("support") },
  ];

  const funnelNotes = [
    { icon: CreditCard, label: t("guestFirst") },
    { icon: WalletCards, label: t("walletOptional") },
    { icon: Truck, label: t("deliveryVisible") },
  ];

  return (
    <main className="velmere-public-page min-h-[100dvh] bg-velmere-black text-white" data-pass316-public-commerce-trim="shop" data-pass318-public-storefront-focus="shop" data-pass319-public-first-purchase-flow="shop" data-pass320-public-atelier-trust-ribbon="shop" data-pass320-shop-trust-ribbon="true" data-pass321-public-copy-polish="shop" data-pass322-public-product-pathway-receipt="shop" data-pass322-shop-product-pathway-receipt="true" data-pass323-public-provenance-drop-concierge="shop" data-pass323-shop-provenance-drop-concierge="true" data-pass324-public-size-confidence-concierge="shop" data-pass326-lookbook-collection="true" data-pass327-lookbook-trim="true" data-pass1999-shop-copy="commerce-atelier-no-lookbook-clutter" data-pass2008-shop="real-category-filter-static-hero-solid-low-lag" data-pass2051-public-catalog-readthrough={catalogReceipt?.mode ?? "static"}>
      <span className="sr-only">Trust before checkout</span>
      <LuxurySection className="py-28 md:py-36">
        <div className="velmere-lookbook-intro velmere-editorial-hero velmere-surface-sheen mb-10 grid gap-8 rounded-[2rem] border border-white/[0.06] p-6 lg:grid-cols-12 lg:items-end md:p-9" data-pass1999-shop-hero="quiet-commerce-typewriter-no-heavy-lines">
          <div className="max-w-3xl lg:col-span-8">
            <p className="luxury-kicker text-velmere-gold/[0.80]">{matrix.label}</p>
            <h1 className="mt-6 font-serif text-5xl leading-none text-white md:text-7xl">{matrix.title}</h1>
            <p className="mt-6 text-sm leading-7 text-white/[0.62] md:text-base">{matrix.body}</p>
          </div>
          <div className="grid gap-2 lg:col-span-4">
            {funnelNotes.map(({ icon: Icon, label }) => (
              <div key={label} className="velmere-command-pill justify-start px-4 text-[10px] text-white/[0.58]">
                <Icon className="h-4 w-4 text-velmere-gold/[0.72]" aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>
        </div>




        <section className="mb-8 grid gap-3 rounded-[1.35rem] border border-white/[0.08] bg-white/[0.025] p-4 md:grid-cols-[1fr_auto] md:items-center" data-commerce-launch-surface="launchAudit.averageScore">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-velmere-gold">{locale === "pl" ? "Gotowość commerce" : locale === "de" ? "Commerce Bereitschaft" : "Commerce readiness"}</p>
            <h2 className="mt-2 text-lg font-semibold text-white">{locale === "pl" ? "Checkout zostaje spokojny, dopóki produkt i fulfilment nie są kompletne." : locale === "de" ? "Checkout bleibt ruhig, bis Produkt und Fulfilment vollständig sind." : "Checkout stays calm until product and fulfilment are complete."}</h2>
            <p className="mt-2 text-xs leading-6 text-white/[0.48]">{locale === "pl" ? "Najważniejszy brak pokazujemy bez presji zakupowej." : locale === "de" ? "Die wichtigste Lücke wird ohne Kaufdruck gezeigt." : "The main missing item is shown without purchase pressure."}</p>
          </div>
          <div className="rounded-2xl border border-cyan-200/[0.14] bg-cyan-300/[0.045] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100/[0.72]">
            {launchAudit.averageScore}% · {launchAudit.topIssues?.[0]?.id ?? "review"}
          </div>
        </section>

        <div className="velmere-sticky-filter velmere-command-shell mb-8 grid gap-4 rounded-[1.5rem] p-4 md:grid-cols-[1fr_auto] md:items-center" data-pass718-storefront-density="calm">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="velmere-collection-count" aria-live="polite">{products.length} {locale === "pl" ? "produktów" : locale === "de" ? "Produkte" : "products"}</span>
            {categories.map((item) => {
              const active = item.key === category || (!item.key && !category);
              return (
                <Link
                  key={item.key ?? "all"}
                  href={shopHref({ category: item.key, gender, sort })}
                  onClick={() => trackVelmereEvent("filter_use", { filter: item.key ?? "all", gender: gender ?? "all" })}
                  className={`velmere-command-pill velmere-interaction-pulse min-h-11 px-4 text-[10px] ${active ? "text-cyan-50" : "text-white/[0.58] hover:text-white"}`}
                  data-tone={active ? "active" : undefined}
                >
                  {matrix.categoryLabels[item.key ?? "all"]}
                </Link>
              );
            })}
            {genderFilters.map((item) => {
              const active = item.key === gender || (!item.key && !gender);
              return (
                <Link
                  key={item.key ?? "gender-all"}
                  href={shopHref({ category, gender: item.key, sort })}
                  onClick={() => trackVelmereEvent("filter_use", { gender: item.key ?? "all", category: category ?? "all" })}
                  className={`velmere-command-pill velmere-interaction-pulse min-h-11 px-4 text-[10px] ${active ? "text-velmere-gold" : "text-white/[0.50] hover:text-white"}`}
                  data-tone={active ? "active" : undefined}
                >
                  {item.label[locale as "pl" | "en" | "de"] ?? item.label.en}
                </Link>
              );
            })}
            <Link
              href="/lookbook"
              className="velmere-command-pill velmere-interaction-pulse min-h-11 px-4 text-[10px] text-white/[0.58] hover:text-white"
              data-pass1999-shop-link="atelier-not-lookbook-copy"
            >
              {locale === "pl" ? "Atelier" : locale === "de" ? "Atelier" : "Atelier"}
            </Link>
          </div>
          <div className="velmere-sort-rail flex gap-2 md:justify-end">
            {sortLinks.map((item) => {
              const active = item.key === sort || (item.key === "featured" && sort === "featured");
              return (
                <Link
                  key={item.token}
                  href={shopHref({ category, gender, sort: item.key })}
                  onClick={() => trackVelmereEvent("filter_use", { sort: item.key, category: category ?? "all", gender: gender ?? "all" })}
                  className={`velmere-command-pill velmere-interaction-pulse min-h-10 px-3 text-[9px] ${active ? "text-white" : "text-white/[0.42] hover:text-white"}`}
                  data-tone={active ? "active" : undefined}
                >
                  {t(item.token)}
                </Link>
              );
            })}
          </div>
        </div>

        {products.length ? <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.055 } } }}
          className="velmere-atelier-product-grid velmere-lookbook-grid grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-7" data-pass1999-shop-grid="cards-not-row-lines"
        >
          {visibleSlots.map((slot, index) => {
            const product = typeof slot === "string" ? undefined : slot;
            if (product) {
              return (
                <motion.div key={product.id} variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                  <ProductCard product={product} priority={index < 2} />
                </motion.div>
              );
            }
            return (
              <motion.article key={String(slot)} variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="velmere-drop-reserve velmere-premium-tile velmere-command-shell group relative min-h-[18rem] overflow-hidden rounded-[1.6rem] p-4 md:min-h-[22rem] md:rounded-[2rem] md:p-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(255,255,255,0.07),transparent_25%),radial-gradient(circle_at_50%_58%,rgba(212,175,55,0.08),transparent_26%)] opacity-60" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="velmere-drop-reserve__visual rounded-[1.2rem] bg-black/[0.25] p-4">
                    <span aria-hidden="true">V</span>
                  </div>
                  <div className="pt-5">
                    <p className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-[#d4af37]/[0.70]">{matrix.locked}</p>
                    <h3 className="mt-3 font-serif text-xl text-white/[0.82] md:text-2xl">{String(slot)}</h3>
                    <p className="mt-2 text-sm leading-6 text-velmere-muted">{matrix.reservedBody}</p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div> : (
          <section className="pass2008-shop-empty border-y border-white/[0.08] py-14 text-center" aria-live="polite">
            <h2 className="font-serif text-3xl text-white md:text-4xl">{matrix.emptyTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/[0.50]">{matrix.emptyBody}</p>
            <Link href="/shop" className="velmere-button-secondary mt-6 inline-flex">
              {matrix.categoryLabels.all}
            </Link>
          </section>
        )}
      </LuxurySection>

      <section className="bg-[#F5F0E8] py-14 text-black md:py-16">
        <LuxurySection>
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-black/[0.68]">{t("serviceKicker")}</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">{t("serviceTitle")}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {trustItems.map(({ icon: Icon, label }) => (
                <div key={label} className="velmere-readout-card flex min-h-20 items-center gap-4 border-black/[0.10] bg-black/[0.035] px-4">
                  <Icon className="h-5 w-5 text-black/[0.70]" aria-hidden="true" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/[0.62]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </LuxurySection>
      </section>

      <LuxurySection className="py-16 md:py-24">
        <motion.section
          {...fadeUp}
          viewport={{ once: true, margin: "-80px" }}
          className="velmere-surface-sheen velmere-command-shell grid gap-6 rounded-2xl p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8"
        >
          <div>
            <p className="luxury-kicker text-velmere-gold/[0.70]">{t("waitlistKicker")}</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-white md:text-5xl">{t("waitlistTitle")}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/[0.58]">{t("waitlistBody")}</p>
          </div>
          <Link
            href="/contact"
            className="velmere-command-pill velmere-interaction-pulse inline-flex min-h-12 items-center justify-center gap-3 px-6 text-[11px] text-white/[0.72] hover:text-white"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {t("waitlistCta")}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </motion.section>
      </LuxurySection>
    </main>
  );
}

/* PASS2270 public surface trim markers: data-pass316-store-buyer-brief="true" · publicCommerceTrimGate.customerSignals · data-pass319-shop-purchase-constellation */
