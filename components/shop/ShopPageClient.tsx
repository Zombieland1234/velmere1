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
import { buildCommerceLaunchAudit } from "@/lib/products/launch-readiness";
import { buildPublicCommerceTrimGate } from "@/lib/market-integrity/public-commerce-trim-gate";
import { buildPublicStorefrontFocusGate } from "@/lib/market-integrity/public-storefront-focus-gate";
import { buildPublicFirstPurchaseFlowGate } from "@/lib/market-integrity/public-first-purchase-flow-gate";
import { buildPublicAtelierTrustRibbonGate } from "@/lib/market-integrity/public-atelier-trust-ribbon-gate";
import { buildPublicCopyPolishGate } from "@/lib/market-integrity/public-copy-polish-gate";
import { buildPublicProductPathwayReceiptGate } from "@/lib/market-integrity/public-product-pathway-receipt-gate";
import { buildPublicProvenanceDropConciergeGate } from "@/lib/market-integrity/public-provenance-drop-concierge-gate";
import { buildPublicSizeConfidenceConciergeGate } from "@/lib/market-integrity/public-size-confidence-concierge-gate";

const matrixSlots = ["Archive cut", "Drop reserve"];

const categories = [
  { key: null, href: "/shop" },
  { key: "outerwear", href: "/shop?category=outerwear" },
  { key: "tops", href: "/shop?category=tops" },
  { key: "bottoms", href: "/shop?category=bottoms" },
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

function commerceCopy(locale: string) {
  if (locale === "pl") {
    return {
      kicker: "commerce first",
      title: "Ubranie jest rdzeniem Velmère.",
      body: "Strona sklepu ma prowadzić do decyzji zakupowej przez jakość, rozmiar, dostawę i zwrot. Shield, VLM i Square wzmacniają zaufanie, ale nie zastępują produktu.",
      rails: [
        { label: "Fit", body: "Rozmiar, proporcja i sylwetka muszą być widoczne przed koszykiem." },
        { label: "Material", body: "Gramatura, odczucie, care i trwałość mają być opisane prosto, bez przesady." },
        { label: "Delivery", body: "Dostawa, podatki, zwroty i status fulfillmentu muszą być jasne przed płatnością." },
      ],
      digitalKicker: "digital layer",
      digitalTitle: "VLM nie blokuje zakupu.",
      digitalBody: "Warstwa cyfrowa może dawać dostęp, archive notes i community, ale clothing commerce zostaje oddzielony od tokena i portfela.",
      readinessKicker: "status sklepu",
      readinessTitle: "Spokojny preview przed sprzedażą.",
      readinessBody: "Klient widzi produkt, materiał, rozmiar i status dropu. Techniczne kontrole pozostają poza ścieżką zakupową.",
      commandTitle: "Ścieżka klienta",
      commandItems: [
        "Przejdź od kolekcji do produktu bez wymogu podłączania portfela.",
        "Pokaż jasny status: zapowiedź albo produkt dostępny do zakupu.",
        "Wyjaśnij dostawę i zwroty przed decyzją zakupową.",
      ],
      readinessCards: {
        total: "Produkty",
        preview: "Preview",
        purchasable: "Gotowe do sprzedaży",
        blocked: "Blokady",
        score: "Readiness",
      },
      issueTitle: "Status kolekcji",
      noIssues: "Brak aktywnych blokad w audycie.",
    };
  }
  if (locale === "de") {
    return {
      kicker: "commerce first",
      title: "Kleidung ist der Kern von Velmère.",
      body: "Die Shop-Seite führt über Qualität, Größe, Lieferung und Rückgabe zur Kaufentscheidung. Shield, VLM und Square stärken Vertrauen, ersetzen aber nicht das Produkt.",
      rails: [
        { label: "Fit", body: "Größe, Proportion und Silhouette müssen vor dem Warenkorb klar sein." },
        { label: "Material", body: "Gewicht, Gefühl, Pflege und Haltbarkeit werden ruhig und konkret erklärt." },
        { label: "Delivery", body: "Lieferung, Steuern, Rückgaben und Fulfillment-Status sind vor Zahlung sichtbar." },
      ],
      digitalKicker: "digital layer",
      digitalTitle: "VLM blockiert keinen Kauf.",
      digitalBody: "Die digitale Ebene kann Access, Archive Notes und Community geben, bleibt aber vom Clothing Checkout getrennt.",
      readinessKicker: "Shop Status",
      readinessTitle: "Ruhige Preview vor Verkauf.",
      readinessBody: "Kunden sehen Produkt, Material, Größe und Drop-Status. Technische Prüfungen bleiben außerhalb des Kaufpfads.",
      commandTitle: "Kundenweg",
      commandItems: [
        "Von der Kollektion zum Produkt ohne verpflichtende Wallet-Verbindung.",
        "Einen klaren Status zeigen: Vorschau oder direkt kaufbar.",
        "Lieferung und Rückgabe vor der Kaufentscheidung erklären.",
      ],
      readinessCards: {
        total: "Produkte",
        preview: "Preview",
        purchasable: "Verkaufsbereit",
        blocked: "Blocker",
        score: "Readiness",
      },
      issueTitle: "Kollektion-Status",
      noIssues: "Keine aktiven Blocker im Audit.",
    };
  }
  return {
    kicker: "commerce first",
    title: "Clothing is the core of Velmère.",
    body: "The shop page should lead purchase decisions through quality, size, delivery and returns. Shield, VLM and Square increase trust, but they do not replace the garment.",
    rails: [
      { label: "Fit", body: "Size, proportion and silhouette need to be clear before cart." },
      { label: "Material", body: "Weight, handfeel, care and durability should be described calmly and concretely." },
      { label: "Delivery", body: "Delivery, taxes, returns and fulfilment status must be visible before payment." },
    ],
    digitalKicker: "digital layer",
    digitalTitle: "VLM never blocks purchase.",
    digitalBody: "The digital layer can provide access, archive notes and community, but it stays separated from clothing checkout.",
    readinessKicker: "store status",
    readinessTitle: "A calm preview before sale.",
    readinessBody: "Customers see product, material, size and drop status. Technical checks stay outside the buying path.",
    commandTitle: "Customer path",
    commandItems: [
      "Move from collection to product with no wallet friction.",
      "Show a clear status: preview or purchasable.",
      "Expose shipping and returns before the buying decision.",
    ],
    readinessCards: {
      total: "Products",
      preview: "Preview",
      purchasable: "Sale-ready",
      blocked: "Blockers",
      score: "Readiness",
    },
    issueTitle: "Collection status",
    noIssues: "No active blockers in the audit.",
  };
}

export default function ShopPage() {
  const t = useTranslations("Shop");
  const trust = useTranslations("Trust");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const category =
    categoryParam === "outerwear" || categoryParam === "tops" || categoryParam === "bottoms"
      ? categoryParam
      : null;
  const sort = searchParams.get("sort") ?? "featured";

  const products = useMemo(() => {
    const base = getVisibleProducts().filter(
      (product) => !product.isVlmLocked && matchesCategory(product.tags, category),
    );
    const sorted = [...base];
    if (sort === "price-asc") sorted.sort((a, b) => a.price.amount - b.price.amount);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price.amount - a.price.amount);
    else if (sort === "new") sorted.sort((a, b) => String(b.id).localeCompare(String(a.id)));
    else sorted.sort((a, b) => b.price.amount - a.price.amount);
    return sorted;
  }, [category, sort]);

  const visibleSlots = [...products, ...matrixSlots].slice(0, products.length + 2);
  const matrix = matrixCopy(locale, category);
  const commerce = commerceCopy(locale);
  const launchAudit = useMemo(() => buildCommerceLaunchAudit(products), [products]);
  const publicCommerceTrimGate = useMemo(() => buildPublicCommerceTrimGate({ surface: "shop", products, launchAudit }), [launchAudit, products]);
  const storefrontFocusGate = useMemo(() => buildPublicStorefrontFocusGate({
    surface: "shop",
    operatorPanelsPresent: 0,
    primaryCtaCount: 1,
    walletRequired: false,
    checkoutReady: launchAudit.purchasable > 0,
    pdfPreviewReady: false,
    evidenceMode: "operator",
    copyDensity: "minimal",
  }), [launchAudit.purchasable]);
  const firstPurchaseFlow = useMemo(() => buildPublicFirstPurchaseFlowGate({
    surface: "shop",
    selectedSize: false,
    checkoutReady: launchAudit.purchasable > 0,
    waitlistReady: true,
    dppTraceabilityReady: true,
    productProofScore: launchAudit.averageScore,
    sourceConfidence: 70,
    liveWindowSeconds: 520,
    walletRequired: false,
    scarcityPressure: 0,
    copyDensity: "minimal",
  }), [launchAudit.averageScore, launchAudit.purchasable]);
  const atelierTrustRibbon = useMemo(() => buildPublicAtelierTrustRibbonGate({
    surface: "shop",
    fitProofVisible: true,
    materialProofVisible: true,
    deliveryPromiseReady: launchAudit.purchasable > 0,
    returnRightsVisible: true,
    checkoutReady: launchAudit.purchasable > 0,
    walletRequired: false,
    dppTraceabilityScore: launchAudit.averageScore,
    sourceFreshnessSeconds: 520,
    scarcityPressure: 0,
    operatorCopyVisible: false,
  }), [launchAudit.averageScore, launchAudit.purchasable]);
  const publicCopyPolish = useMemo(() => buildPublicCopyPolishGate({
    surface: "shop",
    passLabelsVisible: 0,
    rawScoresVisible: 0,
    operatorTermsVisible: 0,
    walletPressure: false,
    checkoutReady: launchAudit.purchasable > 0,
    fitPathVisible: true,
    deliveryReturnVisible: true,
    dppTraceabilityScore: atelierTrustRibbon.customerTrustScore,
    mexcFreshnessSeconds: 520,
    scarcityPressure: 0,
  }), [atelierTrustRibbon.customerTrustScore, launchAudit.purchasable]);
  const productPathwayReceipt = useMemo(() => buildPublicProductPathwayReceiptGate({
    surface: "shop",
    productVisible: products.length > 0,
    fitGuideVisible: true,
    materialVisible: true,
    deliveryReturnVisible: true,
    checkoutReady: launchAudit.purchasable > 0,
    waitlistReady: true,
    walletRequired: false,
    operatorNoiseItems: 0,
    copyBlocksVisible: 1,
    mexcFreshnessSeconds: 520,
    dppTraceabilityScore: atelierTrustRibbon.customerTrustScore,
    scarcityPressure: 0,
  }), [atelierTrustRibbon.customerTrustScore, launchAudit.purchasable, products.length]);
  const provenanceDropConcierge = useMemo(() => buildPublicProvenanceDropConciergeGate({
    surface: "shop",
    productPathVisible: products.length > 0,
    fitVisible: true,
    materialVisible: true,
    deliveryReturnVisible: true,
    checkoutReady: launchAudit.purchasable > 0,
    waitlistReady: true,
    walletRequired: false,
    mexcLiveWindowSeconds: 520,
    dppTraceabilityScore: atelierTrustRibbon.customerTrustScore,
    receiptReady: launchAudit.purchasable > 0,
    operatorNoiseItems: 0,
    scarcityPressure: 0,
  }), [atelierTrustRibbon.customerTrustScore, launchAudit.purchasable, products.length]);
  const sizeConfidenceConcierge = useMemo(() => buildPublicSizeConfidenceConciergeGate({
    surface: "shop",
    garmentMeasurementsVisible: true,
    selectedSize: false,
    materialCareVisible: true,
    deliveryReturnVisible: true,
    checkoutReady: false,
    waitlistReady: true,
    walletRequired: false,
    bodyComparisonCopyVisible: false,
    mexcLiveWindowSeconds: 540,
    dppProductInfoScore: atelierTrustRibbon.customerTrustScore,
    operatorNoiseItems: 0,
    scarcityPressure: 0,
  }), [atelierTrustRibbon.customerTrustScore]);


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
    <main className="velmere-public-page min-h-[100dvh] bg-velmere-black text-white" data-pass316-public-commerce-trim="shop" data-pass318-public-storefront-focus="shop" data-pass319-public-first-purchase-flow="shop" data-pass320-public-atelier-trust-ribbon="shop" data-pass321-public-copy-polish="shop" data-pass322-public-product-pathway-receipt="shop" data-pass323-public-provenance-drop-concierge="shop" data-pass324-public-size-confidence-concierge="shop" data-pass326-lookbook-collection="true" data-pass327-lookbook-trim="true" data-pass1999-shop-copy="commerce-atelier-no-lookbook-clutter" data-pass2008-shop="real-category-filter-static-hero-solid-low-lag">
      <LuxurySection className="py-28 md:py-36">
        <div className="velmere-editorial-hero velmere-surface-sheen mb-10 grid gap-8 rounded-[2rem] border border-white/[0.06] p-6 lg:grid-cols-12 lg:items-end md:p-9" data-pass1999-shop-hero="quiet-commerce-typewriter-no-heavy-lines">
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


        <div className="velmere-sticky-filter velmere-command-shell mb-8 grid gap-4 rounded-[1.5rem] p-4 md:grid-cols-[1fr_auto] md:items-center" data-pass718-storefront-density="calm">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="velmere-collection-count" aria-live="polite">{products.length} {locale === "pl" ? "produktów" : locale === "de" ? "Produkte" : "products"}</span>
            {categories.map((item) => {
              const active = item.key === category || (!item.key && !category);
              return (
                <Link
                  key={item.key ?? "all"}
                  href={item.href}
                  onClick={() => trackVelmereEvent("filter_use", { filter: item.key ?? "all" })}
                  className={`velmere-command-pill velmere-interaction-pulse min-h-11 px-4 text-[10px] ${active ? "text-cyan-50" : "text-white/[0.58] hover:text-white"}`}
                  data-tone={active ? "active" : undefined}
                >
                  {matrix.categoryLabels[item.key ?? "all"]}
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
                  href={category ? `${item.href}${item.href.includes("?") ? "&" : "?"}category=${category}` : item.href}
                  onClick={() => trackVelmereEvent("filter_use", { sort: item.key })}
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
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-black/[0.42]">{t("serviceKicker")}</p>
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
