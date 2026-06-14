import type { Metadata } from "next";
import { ArrowRight, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import LuxurySection from "@/components/layout/LuxurySection";
import { Link } from "@/navigation";
import { buildPublicLaunchSurfaceGate } from "@/lib/market-integrity/public-launch-surface-gate";
import { buildPublicFirstPurchaseFlowGate } from "@/lib/market-integrity/public-first-purchase-flow-gate";
import { buildPublicAtelierTrustRibbonGate } from "@/lib/market-integrity/public-atelier-trust-ribbon-gate";
import { buildPublicCopyPolishGate } from "@/lib/market-integrity/public-copy-polish-gate";
import { buildPublicProductPathwayReceiptGate } from "@/lib/market-integrity/public-product-pathway-receipt-gate";
import { buildPublicProvenanceDropConciergeGate } from "@/lib/market-integrity/public-provenance-drop-concierge-gate";
import { buildPublicSizeConfidenceConciergeGate } from "@/lib/market-integrity/public-size-confidence-concierge-gate";
import { buildVelmereMetadata } from "@/lib/seo/metadata";
import { getCheckoutReadiness } from "@/lib/checkout/config";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "pl" ? "Checkout — Velmère" : locale === "de" ? "Checkout — Velmère" : "Checkout — Velmère";
  const description = locale === "pl"
    ? "Spokojna informacja o dostępności checkoutu Velmère."
    : locale === "de"
      ? "Ruhige Information zur Verfügbarkeit des Velmère Checkouts."
      : "A calm status page for Velmère checkout availability.";
  return buildVelmereMetadata({ locale, path: "/checkout", title, description });
}

const copy = {
  pl: {
    kicker: "Bezpieczny checkout",
    title: "Płatność otworzymy dopiero wtedy, gdy wszystko będzie jasne.",
    body: "Przed uruchomieniem zamówień potwierdzamy produkt, pełny koszt dostawy i zasady zwrotu. Dzięki temu ostatni krok nie zaskakuje ceną ani warunkami.",
    status: "Checkout jest chwilowo zamknięty",
    statusBody: "Możesz spokojnie przeglądać kolekcję. Aktywny przycisk płatności pojawi się dopiero przy gotowym produkcie i potwierdzonej dostawie.",
    readyStatus: "Checkout jest gotowy",
    readyBody: "Dodaj produkt do koszyka, zaakceptuj warunki i przejdź do zabezpieczonej płatności Stripe jako gość — konto i portfel pozostają opcjonalne.",
    matrixTitle: "Co zobaczysz przed zapłatą",
    matrix: [
      ["Produkt", "Wybrany wariant, rozmiar i materiał."],
      ["Dostawa", "Region, koszt i przewidywany termin."],
      ["Zwrot", "Jasne warunki dostępne przed płatnością."],
      ["Potwierdzenie", "Czytelne podsumowanie i potwierdzenie zamówienia."],
    ],
    returnToShop: "Wróć do kolekcji",
    contact: "Zapytaj o dostępność",
    footnote: "Bez presji, odliczania i ukrytych kosztów.",
  },
  de: {
    kicker: "Sicherer Checkout",
    title: "Zahlung öffnet erst, wenn alles klar ist.",
    body: "Vor dem Bestellstart bestätigen wir Produkt, vollständige Lieferkosten und Rückgaberegeln. So überrascht der letzte Schritt weder mit Preis noch Bedingungen.",
    status: "Checkout ist vorübergehend geschlossen",
    statusBody: "Du kannst die Kollektion in Ruhe ansehen. Der Zahlungsbutton erscheint erst bei fertigem Produkt und bestätigter Lieferung.",
    readyStatus: "Checkout ist bereit",
    readyBody: "Lege ein Produkt in den Warenkorb, akzeptiere die Bedingungen und bezahle als Gast über Stripe. Konto und Wallet bleiben optional.",
    matrixTitle: "Was du vor der Zahlung siehst",
    matrix: [
      ["Produkt", "Ausgewählte Variante, Größe und Material."],
      ["Lieferung", "Region, Kosten und voraussichtlicher Termin."],
      ["Rückgabe", "Klare Bedingungen vor der Zahlung."],
      ["Bestätigung", "Saubere Zusammenfassung und Bestellbestätigung."],
    ],
    returnToShop: "Zur Kollektion",
    contact: "Verfügbarkeit fragen",
    footnote: "Ohne Druck, Countdown oder versteckte Kosten.",
  },
  en: {
    kicker: "Protected checkout",
    title: "Payment opens only when every detail is clear.",
    body: "Before orders go live, we confirm the product, full delivery cost and return terms. The final step should never surprise you with price or conditions.",
    status: "Checkout is temporarily closed",
    statusBody: "You can browse the collection without pressure. Payment appears only when the product and delivery promise are confirmed.",
    readyStatus: "Checkout is ready",
    readyBody: "Add a product to the cart, accept the terms and continue to protected Stripe guest checkout. Account and wallet remain optional.",
    matrixTitle: "What you will see before payment",
    matrix: [
      ["Product", "Selected variant, size and material."],
      ["Delivery", "Region, cost and expected timing."],
      ["Returns", "Clear terms available before payment."],
      ["Confirmation", "A clean summary and order confirmation."],
    ],
    returnToShop: "Return to collection",
    contact: "Ask about availability",
    footnote: "No pressure, countdowns or hidden costs.",
  },
} as const;

function localeCopy(locale: string) {
  if (locale === "pl" || locale === "de") return copy[locale];
  return copy.en;
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = localeCopy(locale);
  const checkoutReadiness = getCheckoutReadiness();
  const checkoutReady = checkoutReadiness.enabled;
  const publicLaunchGate = buildPublicLaunchSurfaceGate({ surface: "checkout", locale });
  const firstPurchaseFlow = buildPublicFirstPurchaseFlowGate({
    surface: "checkout", selectedSize: false, checkoutReady, waitlistReady: true,
    dppTraceabilityReady: true, productProofScore: 60, sourceConfidence: 70,
    liveWindowSeconds: 360, walletRequired: false, scarcityPressure: 0, copyDensity: "minimal",
  });
  const atelierTrustRibbon = buildPublicAtelierTrustRibbonGate({
    surface: "checkout", fitProofVisible: false, materialProofVisible: true,
    deliveryPromiseReady: checkoutReady, returnRightsVisible: true, checkoutReady,
    walletRequired: false, dppTraceabilityScore: 64, sourceFreshnessSeconds: 360,
    scarcityPressure: 0, operatorCopyVisible: false,
  });
  const publicCopyPolish = buildPublicCopyPolishGate({
    surface: "checkout", passLabelsVisible: 0, rawScoresVisible: 0, operatorTermsVisible: 0,
    walletPressure: false, checkoutReady, fitPathVisible: false,
    deliveryReturnVisible: true, dppTraceabilityScore: atelierTrustRibbon.customerTrustScore,
    mexcFreshnessSeconds: 360, scarcityPressure: 0,
  });
  const productPathwayReceipt = buildPublicProductPathwayReceiptGate({
    surface: "checkout", productVisible: false, fitGuideVisible: false, materialVisible: true,
    deliveryReturnVisible: true, checkoutReady, waitlistReady: true,
    walletRequired: false, operatorNoiseItems: 0, copyBlocksVisible: 1,
    mexcFreshnessSeconds: 360, dppTraceabilityScore: atelierTrustRibbon.customerTrustScore,
    scarcityPressure: 0,
  });
  const provenanceDropConcierge = buildPublicProvenanceDropConciergeGate({
    surface: "checkout", productPathVisible: false, fitVisible: false, materialVisible: true,
    deliveryReturnVisible: true, checkoutReady, waitlistReady: true,
    walletRequired: false, mexcLiveWindowSeconds: 360,
    dppTraceabilityScore: atelierTrustRibbon.customerTrustScore, receiptReady: false,
    operatorNoiseItems: 0, scarcityPressure: 0,
  });
  const sizeConfidenceConcierge = buildPublicSizeConfidenceConciergeGate({
    surface: "checkout", garmentMeasurementsVisible: false, selectedSize: false,
    materialCareVisible: true, deliveryReturnVisible: true, checkoutReady,
    waitlistReady: true, walletRequired: false, bodyComparisonCopyVisible: false,
    mexcLiveWindowSeconds: 360, dppProductInfoScore: atelierTrustRibbon.customerTrustScore,
    operatorNoiseItems: 0, scarcityPressure: 0,
  });

  void publicLaunchGate;
  void firstPurchaseFlow;
  void publicCopyPolish;
  void productPathwayReceipt;
  void provenanceDropConcierge;
  void sizeConfidenceConcierge;

  return (
    <main
      className="velmere-public-page min-h-[100dvh] bg-velmere-black text-white"
      data-pass317-public-launch-surface="checkout"
      data-pass318-public-storefront-focus="checkout"
      data-pass319-public-first-purchase-flow="checkout"
      data-pass320-public-atelier-trust-ribbon="checkout"
      data-pass321-public-copy-polish="checkout"
      data-pass322-public-product-pathway-receipt="checkout"
      data-pass323-public-provenance-drop-concierge="checkout"
      data-pass324-public-size-confidence-concierge="checkout"
      data-pass679-checkout-calm-state="true"
      data-pass2005-checkout-page="solid-cards-no-row-lines-cyan-focus"
    >
      <LuxurySection className="py-24 md:py-36">
        <section className="velmere-checkout-state mx-auto max-w-6xl overflow-hidden rounded-[2.4rem] border border-white/[0.08] bg-[#07090c] shadow-[0_34px_130px_rgba(0,0,0,0.48)]" data-pass2005-checkout-state="solid-no-glass">
          <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,.92fr)]">
            <div className="p-6 md:p-10 lg:p-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-200/[0.16] bg-cyan-300/[0.055]">
                <LockKeyhole className="h-7 w-7 text-cyan-100" aria-hidden="true" />
              </div>
              <p className="luxury-kicker mt-8 text-cyan-100/[0.82]">{t.kicker}</p>
              <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[0.96] tracking-[-0.05em] md:text-6xl">{t.title}</h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/[0.58] md:text-base">{t.body}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/shop" className="velmere-button-primary group">
                  {t.returnToShop}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
                <Link href="/contact" className="velmere-button-secondary">{t.contact}</Link>
              </div>
              <p className="mt-5 text-xs leading-6 text-white/[0.36]">{t.footnote}</p>
            </div>

            <aside className="border-t border-white/[0.055] bg-[#080a0d] p-6 md:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <div className="rounded-[1.5rem] border border-cyan-200/[0.12] bg-cyan-300/[0.035] p-5" data-pass2005-checkout-status="solid-cyan-no-gold-block">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200/[0.14] bg-black/[0.24]">
                    <ShieldCheck className="h-4 w-4 text-cyan-100" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-semibold text-white">{checkoutReady ? t.readyStatus : t.status}</p>
                </div>
                <p className="mt-4 text-xs leading-6 text-white/[0.54]">{checkoutReady ? t.readyBody : t.statusBody}</p>
              </div>

              <p className="mt-7 font-mono text-[9px] uppercase tracking-[0.18em] text-white/[0.42]">{t.matrixTitle}</p>
              <div className="mt-4 grid gap-3">
                {t.matrix.map(([label, value]) => (
                  <article key={label} className="group flex gap-3 rounded-2xl border border-white/[0.07] bg-[#0a0d10] p-4 transition-colors duration-150 hover:border-cyan-200/[0.16] hover:bg-cyan-300/[0.035]" data-pass2005-checkout-matrix-card="card-no-row-line-low-lag">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025]">
                      <Check className="h-3.5 w-3.5 text-cyan-100" aria-hidden="true" />
                    </span>
                    <span>
                      <strong className="block text-sm font-medium text-white/[0.82]">{label}</strong>
                      <small className="mt-1 block text-xs leading-5 text-white/[0.44]">{value}</small>
                    </span>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </section>
      </LuxurySection>
    </main>
  );
}
