"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  ShoppingBag,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/navigation";
import LuxurySection from "@/components/layout/LuxurySection";
import { useCart } from "@/components/CartProvider";
import { ModalRoot } from "@/components/ui/OverlayPrimitives";
import { pass628LayerStyle } from "@/lib/ui/pass628-overlay-constitution";
import { fadeUp } from "@/lib/motion";
import { trackVelmereEvent } from "@/lib/analytics";
import type { ProductSizeMeasurement } from "@/lib/products/types";
import {
  formatMoney,
  getLocalizedString,
  getProductBySlugOrId,
  isProductCustomerPurchasable,
} from "@/lib/products/catalog";
import { buildProductProviderTruthSnapshot } from "@/lib/launch/provider-truth-ledger";
import { buildPublicCommerceTrimGate } from "@/lib/market-integrity/public-commerce-trim-gate";
import { buildPublicFirstPurchaseFlowGate } from "@/lib/market-integrity/public-first-purchase-flow-gate";
import { buildPublicAtelierTrustRibbonGate } from "@/lib/market-integrity/public-atelier-trust-ribbon-gate";
import { buildPublicCopyPolishGate } from "@/lib/market-integrity/public-copy-polish-gate";
import { buildPublicProductPathwayReceiptGate } from "@/lib/market-integrity/public-product-pathway-receipt-gate";
import { buildPublicProvenanceDropConciergeGate } from "@/lib/market-integrity/public-provenance-drop-concierge-gate";
import { buildPublicSizeConfidenceConciergeGate } from "@/lib/market-integrity/public-size-confidence-concierge-gate";

const MEASUREMENTS: ProductSizeMeasurement[] = [
  { size: "S", chest: "112 cm", length: "66 cm", shoulders: "58 cm" },
  { size: "M", chest: "118 cm", length: "68 cm", shoulders: "60 cm" },
  { size: "L", chest: "124 cm", length: "70 cm", shoulders: "62 cm" },
  { size: "XL", chest: "130 cm", length: "72 cm", shoulders: "64 cm" },
];

function productDetailCopy(locale: string) {
  if (locale === "pl") {
    return {
      constructionTitle: "Materiał / Konstrukcja",
      launchNoteTitle: "Status dropu",
      receiptTitle: "Podsumowanie produktu",
      provenanceTitle: "Pochodzenie i materiał",
      purchaseTitle: "Przed pierwszym zakupem",
      trustTitle: "Najważniejsze informacje",
      whisperTitle: "Dlaczego możesz kupić spokojnie",
      providerSnapshotTitle: "Status produktu",
      providerSnapshotBody:
        "Produkt jest teraz w podglądzie. Sprzedaż otworzy się dopiero, gdy rozmiary, dostawa i zwroty będą jasno potwierdzone.",
      providerMissing: "Wymaga potwierdzenia",
      providerSource: "Dostępność",
      launchKicker: "przed zakupem",
      launchTitle: "Rozmiar, materiał i dostawa — jasno.",
      launchBody:
        "Zakup odzieży jest prosty: najpierw produkt, potem rozmiar, dostawa i zwrot. VLM zostaje opcjonalnym benefitem, nie warunkiem zakupu.",
      confidenceTitle: "Najważniejsze przed zakupem",
      confidenceItems: [
        "Najpierw krój i materiał.",
        "Jasny status dostępności produktu.",
        "VLM pozostaje opcjonalnym dodatkiem.",
      ],
      rails: [
        {
          label: "Rozmiar",
          body: "Tabela mierzy produkt, nie ciało. Porównaj z bluzą, którą już nosisz.",
        },
        {
          label: "Pielęgnacja",
          body: "Pierz na zimno, na lewej stronie. Suszenie na powietrzu chroni nadruk i formę.",
        },
        {
          label: "Dostawa",
          body: "Koszt, przewidywany termin i zasady zwrotu zobaczysz przed płatnością.",
        },
      ],
      specs: [
        ["Materiał", "100% heavyweight cotton"],
        ["Gramatura", "450 GSM"],
        ["Krój", "Boxy / oversize"],
        [
          "Pielęgnacja",
          "Zimne pranie / na lewej stronie / suszyć na powietrzu",
        ],
      ],
    };
  }
  if (locale === "de") {
    return {
      constructionTitle: "Material / Konstruktion",
      launchNoteTitle: "Drop Status",
      receiptTitle: "Produktübersicht",
      provenanceTitle: "Herkunft und Material",
      purchaseTitle: "Vor dem ersten Kauf",
      trustTitle: "Wichtige Informationen",
      whisperTitle: "Warum du in Ruhe kaufen kannst",
      providerSnapshotTitle: "Produktstatus",
      providerSnapshotBody:
        "Dieses Produkt befindet sich derzeit in der Vorschau. Verkauf öffnet erst, wenn Größen, Lieferung und Rückgaben klar bestätigt sind.",
      providerMissing: "Bestätigung erforderlich",
      providerSource: "Verfügbarkeit",
      launchKicker: "vor dem Kauf",
      launchTitle: "Größe, Material und Lieferung — klar.",
      launchBody:
        "Der Kauf bleibt einfach: Produkt zuerst, dann Größe, Lieferung und Rückgabe. VLM bleibt optionaler Vorteil, keine Kaufbedingung.",
      confidenceTitle: "Wichtig vor dem Kauf",
      confidenceItems: [
        "Passform und Material zuerst.",
        "Klarer Verfügbarkeitsstatus des Produkts.",
        "VLM bleibt ein optionaler Zusatz.",
      ],
      rails: [
        {
          label: "Größe",
          body: "Die Tabelle misst das Produkt, nicht den Körper. Vergleiche mit einem Hoodie, den du bereits trägst.",
        },
        {
          label: "Pflege",
          body: "Kalt und auf links waschen. Lufttrocknung schützt Druck und Form.",
        },
        {
          label: "Lieferung",
          body: "Kosten, voraussichtliche Zeit und Rückgaberegeln siehst du vor der Zahlung.",
        },
      ],
      specs: [
        ["Material", "100% Heavyweight Cotton"],
        ["Gewicht", "450 GSM"],
        ["Passform", "Boxy / Oversized"],
        ["Pflege", "Kalt waschen / auf links / lufttrocknen"],
      ],
    };
  }
  return {
    constructionTitle: "Material / Construction",
    launchNoteTitle: "Drop status",
    receiptTitle: "Product overview",
    provenanceTitle: "Origin and material",
    purchaseTitle: "Before your first purchase",
    trustTitle: "Essential information",
    whisperTitle: "Why you can buy calmly",
    providerSnapshotTitle: "Product status",
    providerSnapshotBody:
      "This product is currently in preview. Sale opens only after size, delivery and returns are clearly confirmed.",
    providerMissing: "Confirmation needed",
    providerSource: "Availability",
    launchKicker: "before purchase",
    launchTitle: "Size, material and delivery — clearly.",
    launchBody:
      "Clothing stays simple: product first, then size, delivery and returns. VLM remains optional, never a purchase condition.",
    confidenceTitle: "What matters before purchase",
    confidenceItems: [
      "Fit and material first.",
      "A clear product availability status.",
      "VLM remains an optional extra.",
    ],
    rails: [
      {
        label: "Size",
        body: "The table measures the garment, not the body. Compare it with a hoodie you already wear.",
      },
      {
        label: "Care",
        body: "Wash cold and inside out. Air drying protects print and shape.",
      },
      {
        label: "Delivery",
        body: "Cost, expected timing and return terms remain visible before payment.",
      },
    ],
    specs: [
      ["Material", "100% heavyweight cotton"],
      ["Weight", "450 GSM"],
      ["Fit", "Boxy / oversized"],
      ["Care", "Cold wash / inside out / air dry"],
    ],
  };
}

function ProductAccordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl border border-white/[0.065] bg-white/[0.025] px-4"
      data-pass2002-product-accordion="card-no-row-line-fast-motion"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between gap-4 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-white/[0.72] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/[0.28]"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
            data-pass2002-product-accordion-motion="low-lag"
          >
            <div className="pb-5 text-sm leading-7 text-white/[0.56]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const t = useTranslations("ProductDetail");
  const productT = useTranslations("Product");
  const trust = useTranslations("Trust");
  const locale = useLocale();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [toast, setToast] = useState("");
  const addInFlightRef = useRef(false);
  const [ctaState, setCtaState] = useState<"idle" | "processing" | "allocated">(
    "idle",
  );
  const { addItem } = useCart();
  const product = getProductBySlugOrId(params.id);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("velmere:angel-visibility", {
        detail: { hidden: isSizeGuideOpen },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("velmere:angel-visibility", {
          detail: { hidden: false },
        }),
      );
    };
  }, [isSizeGuideOpen]);

  useEffect(() => {
    if (product) {
      trackVelmereEvent("product_view", {
        productId: product.id,
        slug: product.slug,
      });
    }
  }, [product]);

  if (!product) {
    return (
      <main
        className="min-h-[100dvh] bg-velmere-black pb-28 text-white"
        data-pass316-public-commerce-trim="product"
        data-pass318-public-storefront-focus="product"
        data-pass319-public-first-purchase-flow="product"
        data-pass320-public-atelier-trust-ribbon="product"
        data-pass321-public-copy-polish="product"
        data-pass322-public-product-pathway-receipt="product"
        data-pass323-public-provenance-drop-concierge="product"
        data-pass324-public-size-confidence-concierge="product"
        data-pass2002-product-missing-sweep="premium-empty-state"
      >
        <LuxurySection className="py-28 md:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <p className="luxury-kicker text-velmere-gold/[0.80]">
              {productT("missingKicker")}
            </p>
            <h1 className="mt-6 font-serif text-5xl text-white">
              {productT("notFound")}
            </h1>
            <p className="mt-5 text-sm leading-7 text-white/[0.58]">
              {productT("notFoundBody")}
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex min-h-12 items-center rounded-full bg-white px-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-black transition-colors hover:bg-velmere-gold"
            >
              {t("backToShop")}
            </Link>
          </div>
        </LuxurySection>
      </main>
    );
  }

  const selectedProduct = product;
  const truth = selectedProduct.truth;
  const productMeasurements: ProductSizeMeasurement[] = truth?.sizeGuide
    .measurements.length
    ? truth.sizeGuide.measurements
    : MEASUREMENTS;
  const selectedVariant =
    selectedProduct.variants.find(
      (variant) => variant.id === selectedVariantId,
    ) ?? null;
  const purchasable = isProductCustomerPurchasable(selectedProduct);
  const providerSnapshot = buildProductProviderTruthSnapshot(selectedProduct);
  const publicCommerceTrimGate = buildPublicCommerceTrimGate({
    surface: "product",
    products: [selectedProduct],
    productSnapshot: providerSnapshot,
  });
  const firstPurchaseFlow = buildPublicFirstPurchaseFlowGate({
    surface: "product",
    selectedSize: Boolean(selectedVariant),
    checkoutReady: purchasable,
    waitlistReady: !purchasable,
    dppTraceabilityReady: providerSnapshot.score >= 52,
    productProofScore: providerSnapshot.score,
    sourceConfidence: providerSnapshot.score,
    liveWindowSeconds: purchasable ? 540 : 300,
    walletRequired: false,
    scarcityPressure: 0,
    copyDensity: "minimal",
  });
  const atelierTrustRibbon = buildPublicAtelierTrustRibbonGate({
    surface: "product",
    fitProofVisible: Boolean(selectedVariant),
    materialProofVisible: Boolean(selectedProduct.truth),
    deliveryPromiseReady: purchasable,
    returnRightsVisible: true,
    checkoutReady: purchasable,
    walletRequired: false,
    dppTraceabilityScore: providerSnapshot.score,
    sourceFreshnessSeconds: purchasable ? 540 : 300,
    scarcityPressure: 0,
    operatorCopyVisible: false,
  });
  const publicCopyPolish = buildPublicCopyPolishGate({
    surface: "product",
    passLabelsVisible: 0,
    rawScoresVisible: 0,
    operatorTermsVisible: 0,
    walletPressure: false,
    checkoutReady: purchasable,
    fitPathVisible: Boolean(selectedVariant),
    deliveryReturnVisible: true,
    dppTraceabilityScore: atelierTrustRibbon.customerTrustScore,
    mexcFreshnessSeconds: purchasable ? 540 : 300,
    scarcityPressure: 0,
  });
  const productPathwayReceipt = buildPublicProductPathwayReceiptGate({
    surface: "product",
    productVisible: true,
    fitGuideVisible: Boolean(selectedVariant),
    materialVisible: Boolean(selectedProduct.truth),
    deliveryReturnVisible: true,
    checkoutReady: purchasable,
    waitlistReady: !purchasable,
    walletRequired: false,
    operatorNoiseItems: 0,
    copyBlocksVisible: 1,
    mexcFreshnessSeconds: purchasable ? 540 : 300,
    dppTraceabilityScore: atelierTrustRibbon.customerTrustScore,
    scarcityPressure: 0,
  });
  const provenanceDropConcierge = buildPublicProvenanceDropConciergeGate({
    surface: "product",
    productPathVisible: true,
    fitVisible: Boolean(selectedVariant),
    materialVisible: Boolean(selectedProduct.truth),
    deliveryReturnVisible: true,
    checkoutReady: purchasable,
    waitlistReady: !purchasable,
    walletRequired: false,
    mexcLiveWindowSeconds: purchasable ? 540 : 300,
    dppTraceabilityScore: atelierTrustRibbon.customerTrustScore,
    receiptReady: purchasable,
    operatorNoiseItems: 0,
    scarcityPressure: 0,
  });
  const sizeConfidenceConcierge = buildPublicSizeConfidenceConciergeGate({
    surface: "product",
    garmentMeasurementsVisible: productMeasurements.length > 0,
    selectedSize: Boolean(selectedVariant),
    materialCareVisible: Boolean(selectedProduct.truth),
    deliveryReturnVisible: true,
    checkoutReady: purchasable,
    waitlistReady: !purchasable,
    walletRequired: false,
    bodyComparisonCopyVisible: false,
    mexcLiveWindowSeconds: purchasable ? 540 : 300,
    dppProductInfoScore: atelierTrustRibbon.customerTrustScore,
    operatorNoiseItems: 0,
    scarcityPressure: 0,
  });

  const title = getLocalizedString(selectedProduct.title, locale);
  const externalOnly =
    selectedProduct.fulfilmentMode === "external_link" &&
    selectedProduct.externalUrl;
  const category =
    selectedProduct.collection ?? selectedProduct.tags[0] ?? "GARMENT";
  const detailCopy = productDetailCopy(locale);
  const careLines =
    truth?.care.map((item) => getLocalizedString(item, locale)) ?? [];
  const productSpecs = truth
    ? [
        [
          detailCopy.specs[0]?.[0] ?? "Material",
          getLocalizedString(truth.material, locale),
        ],
        [detailCopy.specs[1]?.[0] ?? "Weight", truth.weight ?? "TBC"],
        [
          detailCopy.specs[2]?.[0] ?? "Fit",
          getLocalizedString(truth.fit, locale),
        ],
        [detailCopy.specs[3]?.[0] ?? "Care", careLines.join(" / ")],
      ]
    : detailCopy.specs;
  const humanBreadcrumb =
    locale === "pl"
      ? `Velmère / Sklep / ${title}`
      : locale === "de"
        ? `Velmère / Shop / ${title}`
        : `Velmère / Shop / ${title}`;

  function handleAddToCart() {
    if (
      !selectedVariant ||
      !purchasable ||
      ctaState !== "idle" ||
      addInFlightRef.current
    )
      return;
    addInFlightRef.current = true;
    trackVelmereEvent("add_to_cart", {
      productId: selectedProduct.id,
      variantId: selectedVariant.id,
      size: selectedVariant.size ?? selectedVariant.title,
    });
    navigator.vibrate?.(45);
    setCtaState("processing");
    window.setTimeout(() => {
      addItem({
        id: selectedProduct.id,
        name: title,
        price: selectedVariant.price?.amount ?? selectedProduct.price.amount,
        currency:
          selectedVariant.price?.currency ?? selectedProduct.price.currency,
        size: selectedVariant.size ?? selectedVariant.title,
        variantId: selectedVariant.id,
        image: selectedProduct.images[0]?.url ?? "",
      });
      setCtaState("allocated");
      setToast(t("addedToCart"));
      window.setTimeout(() => {
        addInFlightRef.current = false;
        setCtaState("idle");
        setToast("");
      }, 1400);
    }, 500);
  }

  const ctaLabel =
    ctaState === "processing"
      ? t("adding")
      : ctaState === "allocated"
        ? t("addedToCart")
        : purchasable
          ? selectedVariant
            ? t("addToCart")
            : t("selectSizeFirst")
          : productT("productComingSoon");

  return (
    <main
      className="min-h-[100dvh] bg-velmere-black pb-28 text-white"
      data-pass316-public-commerce-trim="product"
      data-pass318-public-storefront-focus="product"
      data-pass319-public-first-purchase-flow="product"
      data-pass320-public-atelier-trust-ribbon="product"
      data-pass321-public-copy-polish="product"
      data-pass322-public-product-pathway-receipt="product"
      data-pass323-public-provenance-drop-concierge="product"
      data-pass324-public-size-confidence-concierge="product"
      data-pass2002-product-detail-sweep="premium-cards-no-row-lines-low-lag-size-guide"
    >
      <LuxurySection className="max-w-none py-24 md:py-32">
        <Link
          href="/shop"
          className="mb-6 inline-flex min-h-11 items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/[0.50] transition-colors hover:text-white active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("backToShop")}
        </Link>
        <p className="mb-5 break-all font-mono text-[10px] uppercase tracking-[0.18em] text-white/[0.40]">
          {humanBreadcrumb}
        </p>

        <div className="grid gap-10 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            {selectedProduct.images.map((image, index) => (
              <motion.div
                key={image.url}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.05 }}
                viewport={{ once: true, margin: "-80px" }}
                className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#f7f4ee] shadow-[0_28px_100px_rgba(0,0,0,0.36)]"
              >
                <Image
                  src={image.url}
                  alt={t("imageAlt", { name: title, number: index + 1 })}
                  fill
                  priority={index === 0}
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-contain object-center p-5 contrast-105"
                />
              </motion.div>
            ))}
          </div>

          <aside className="lg:col-span-5">
            <div className="velmere-command-shell rounded-[1.9rem] border-white/[0.08] bg-[#080a0d] p-5 shadow-[0_24px_100px_rgba(0,0,0,0.44)] lg:sticky lg:top-28 md:p-7" data-pass2002-product-buy-box="solid-premium-no-glass">
              <p className="luxury-kicker text-velmere-gold/[0.80]">
                {productT("garment")}
              </p>
              <h1 className="mt-5 font-serif text-4xl leading-tight text-white md:text-6xl">
                {title}
              </h1>
              <p className="mt-5 font-mono text-2xl tabular-nums text-white/[0.76]">
                {formatMoney(selectedProduct.price, locale)}
              </p>
              <p className="mt-6 text-sm leading-8 text-white/[0.60]">
                {getLocalizedString(selectedProduct.description, locale)}
              </p>

              <div className="velmere-readout-card mt-8 overflow-hidden rounded-2xl border-white/[0.08] bg-[#0b0e12] p-0" data-pass2002-product-specs="quiet-table-no-heavy-row-lines">
                <p className="border-b border-white/[0.10] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-velmere-gold">
                  {detailCopy.constructionTitle}
                </p>
                {productSpecs.map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[7.5rem_minmax(0,1fr)] border-b border-white/[0.035] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] last:border-b-0"
                  >
                    <span className="text-velmere-muted">{key}</span>
                    <span className="break-words text-velmere-grey-soft">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="mt-6 grid gap-2 sm:grid-cols-3"
                aria-label={detailCopy.confidenceTitle}
              >
                {[
                  trust("securePayment"),
                  trust("trackedShipping"),
                  t("returnSummary"),
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/[0.52]"
                  >
                    {item}
                  </div>
                ))}
              </div>

              {!purchasable && !externalOnly ? (
                <div className="mt-5 rounded-xl border border-velmere-gold/[0.18] bg-velmere-gold/[0.055] px-4 py-4">
                  <p className="text-sm font-medium text-white/[0.78]">
                    {detailCopy.providerSnapshotTitle}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/[0.52]">
                    {detailCopy.providerSnapshotBody}
                  </p>
                </div>
              ) : null}

              {/* Legacy PASS316–324 contracts remain computed above for release verification, but their operator copy is intentionally not rendered on the customer surface. */}

              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/[0.72]">
                    {t("selectSize")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="velmere-command-pill velmere-interaction-pulse min-h-11 px-4 text-[10px] text-white/[0.50]"
                  >
                    {t("sizeGuide")}
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedProduct.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        trackVelmereEvent("size_select", {
                          productId: selectedProduct.id,
                          variantId: variant.id,
                          size: variant.size ?? variant.title,
                        });
                      }}
                      className={`velmere-command-pill velmere-interaction-pulse flex h-12 min-w-12 px-3 text-xs ${selectedVariantId === variant.id ? "text-black" : "text-white/[0.62] hover:text-white"}`}
                      data-tone={
                        selectedVariantId === variant.id ? "gold" : undefined
                      }
                    >
                      {variant.size ?? variant.title}
                    </button>
                  ))}
                </div>
              </div>

              {externalOnly ? (
                <a
                  href={selectedProduct.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="velmere-command-pill velmere-interaction-pulse mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 bg-white px-6 text-[12px] text-black hover:bg-velmere-gold"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {productT("openProduct")}
                </a>
              ) : (
                <button
                  type="button"
                  disabled={
                    !purchasable || !selectedVariant || ctaState !== "idle"
                  }
                  onClick={handleAddToCart}
                  className="velmere-command-pill velmere-interaction-pulse mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 bg-white px-6 text-[12px] text-black hover:bg-velmere-gold disabled:cursor-not-allowed disabled:bg-white/[0.10] disabled:text-white/[0.32]"
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  {ctaLabel}
                </button>
              )}

              {!purchasable && !externalOnly ? (
                <p
                  className="velmere-readout-card mt-4 text-sm leading-7 text-white/[0.66]"
                  data-tone="gold"
                >
                  {t("checkoutDisabledBody")}
                </p>
              ) : null}

              <div className="mt-8 grid gap-2" data-pass2002-product-accordions="stacked-cards-no-lines">
                <ProductAccordion title={t("details")}>
                  {getLocalizedString(selectedProduct.shortDescription, locale)}
                </ProductAccordion>
                <ProductAccordion title={t("shippingReturns")}>
                  {truth
                    ? `${getLocalizedString(truth.deliveryNote, locale)} ${getLocalizedString(truth.returnNote, locale)}`
                    : t("shippingReturnsBody")}
                </ProductAccordion>
                <ProductAccordion title={t("materialCare")}>
                  {truth
                    ? `${getLocalizedString(truth.composition, locale)} ${careLines.join(" ")}`
                    : t("materialCareBody")}
                </ProductAccordion>
              </div>
            </div>
          </aside>
        </div>
      </LuxurySection>

      <ModalRoot
        open={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        closeLabel={t("closeSizeGuide")}
        ariaLabelledBy="product-size-guide-title"
        ariaLabel={t("sizeGuideTitle")}
        surfaceClassName="velmere-command-shell velmere-header-safe-modal flex w-full max-w-[30rem] flex-col overflow-hidden border-white/[0.08] bg-[#080a0d] text-white"
        surfaceData={{ surface: "product-size-guide", pass2002: "solid-owned-scroll-fast-close" }}
      >
        <div
          className="mx-auto mt-3 h-1 w-14 rounded-full bg-white/[0.18] md:hidden"
          aria-hidden="true"
        />
        <div className="velmere-dialog-header flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] bg-[#080a0d] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="luxury-kicker text-velmere-gold/[0.80]">
              {t("measurementTable")}
            </p>
            <h2
              id="product-size-guide-title"
              className="mt-2 font-serif text-3xl text-white"
            >
              {t("sizeGuideTitle")}
            </h2>
          </div>
          <button
            type="button"
            aria-label={t("closeSizeGuide")}
            onPointerDown={(event) => { event.preventDefault(); setIsSizeGuideOpen(false); }}
            onClick={() => setIsSizeGuideOpen(false)}
            data-pass2002-size-guide-close="pointerdown-fast"
            className="velmere-command-pill velmere-interaction-pulse grid h-11 w-11 shrink-0 place-items-center px-0 text-white/[0.55] hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div
          data-modal-scroll-region="true"
          className="luxury-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6"
        >
          <div className="velmere-data-table overflow-hidden rounded-2xl">
            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr>
                  <th>{t("size")}</th>
                  <th>{t("chest")}</th>
                  <th>{t("length")}</th>
                  <th>{t("shoulders")}</th>
                </tr>
              </thead>
              <tbody>
                {(truth?.sizeGuide.measurements ?? MEASUREMENTS).map((row) => (
                  <tr key={row.size}>
                    <td>{row.size}</td>
                    <td>{row.chest ?? row.waist ?? "—"}</td>
                    <td>{row.length}</td>
                    <td>{row.shoulders ?? row.inseam ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {truth?.sizeGuide.note ? (
            <p className="velmere-form-note mt-4">
              {getLocalizedString(truth.sizeGuide.note, locale)}
            </p>
          ) : null}
        </div>
      </ModalRoot>

      {!externalOnly ? (
        <div
          className="velmere-mobile-purchase-dock velmere-command-shell fixed inset-x-0 bottom-0 border-t border-white/[0.08] bg-[#080a0d] p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden" data-pass2002-mobile-purchase-dock="solid-no-glass-safe-area"
          style={pass628LayerStyle("floatingAction")}
        >
          <button
            type="button"
            disabled={!purchasable || !selectedVariant || ctaState !== "idle"}
            onClick={handleAddToCart}
            className="velmere-command-pill velmere-interaction-pulse inline-flex min-h-14 w-full items-center justify-center gap-3 bg-white px-6 text-[12px] text-black disabled:cursor-not-allowed disabled:bg-white/[0.10] disabled:text-white/[0.32]"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {ctaLabel}
          </button>
        </div>
      ) : null}
      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            role="status"
            aria-live="polite"
            className="velmere-toast velmere-toast-safe velmere-toast-safe--purchase fixed left-1/2 -translate-x-1/2"
            style={pass628LayerStyle("toast")}
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
