import type { Metadata } from "next";
import { ArrowRight, HelpCircle, MessageCircle, PackageCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import LuxurySection from "@/components/layout/LuxurySection";
import { Link } from "@/navigation";
import { buildVelmereMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    path: "/faq",
    title: "FAQ — Velmère",
    description: "Velmère answers for products, delivery, returns, accounts and optional VLM access.",
  });
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = locale === "pl"
    ? {
        kicker: "Pomoc",
        title: "Najważniejsze odpowiedzi, bez szukania po całej stronie.",
        intro: "Krótko wyjaśniamy zakup, dostawę, zwroty, konto i opcjonalny dostęp VLM.",
        items: [
          ["Czy zakup wymaga portfela?", "Nie. Odzież kupujesz jak w zwykłym sklepie. Portfel jest opcjonalny i nie powinien blokować zakupu."],
          ["Kiedy produkty będą dostępne?", "Produkt staje się aktywny dopiero po potwierdzeniu zdjęć, wariantów, ceny, materiału, dostawy i zasad zwrotu."],
          ["Gdzie zobaczę koszt dostawy?", "Pełny koszt i przewidywany termin będą widoczne przed płatnością, po wybraniu kraju i produktu."],
          ["Jak działają zwroty?", "Warunki zwrotu będą dostępne na karcie produktu i jeszcze raz przed płatnością."],
          ["Czy VLM jest inwestycją?", "Nie. VLM jest warstwą dostępu do funkcji i społeczności, bez obietnicy ceny, zysku, płynności lub listingu."],
        ],
        routes: [["Dostawa", "Sprawdź regiony i zasady."], ["Zwroty", "Zobacz warunki zwrotu."], ["Kontakt", "Napisz do wsparcia."]],
        cta: "Nadal potrzebujesz pomocy?",
        ctaBody: "Napisz jedną wiadomość z krótkim opisem sprawy. Bez haseł, seed phrase i danych płatniczych.",
        ctaButton: "Otwórz kontakt",
      }
    : locale === "de"
      ? {
          kicker: "Hilfe",
          title: "Die wichtigsten Antworten, ohne die ganze Seite zu durchsuchen.",
          intro: "Kurz erklärt: Kauf, Lieferung, Rückgabe, Account und optionaler VLM-Zugang.",
          items: [
            ["Brauche ich eine Wallet?", "Nein. Kleidung kaufst du wie in einem normalen Shop. Eine Wallet bleibt optional und darf den Kauf nicht blockieren."],
            ["Wann sind Produkte verfügbar?", "Ein Produkt wird erst nach bestätigten Bildern, Varianten, Preis, Material, Lieferung und Rückgaberegeln aktiv."],
            ["Wo sehe ich die Lieferkosten?", "Vollständige Kosten und erwartete Zeit erscheinen vor der Zahlung nach Auswahl von Land und Produkt."],
            ["Wie funktionieren Rückgaben?", "Die Rückgaberegeln stehen auf der Produktseite und erneut vor der Zahlung."],
            ["Ist VLM eine Investition?", "Nein. VLM ist eine Zugangsschicht für Funktionen und Community, ohne Aussagen zu Preisentwicklung, Liquidität oder Listings."],
          ],
          routes: [["Lieferung", "Regionen und Regeln ansehen."], ["Rückgabe", "Rückgabebedingungen ansehen."], ["Kontakt", "Support anschreiben."]],
          cta: "Noch Hilfe nötig?",
          ctaBody: "Sende eine Nachricht mit kurzer Beschreibung. Keine Passwörter, Seed Phrase oder Zahlungsdaten.",
          ctaButton: "Kontakt öffnen",
        }
      : {
          kicker: "Help",
          title: "The essential answers, without searching the entire site.",
          intro: "A clear guide to purchase, delivery, returns, account access and optional VLM features.",
          items: [
            ["Do I need a wallet to buy clothing?", "No. Clothing purchase works like a normal store. A wallet remains optional and should never block checkout."],
            ["When do products become available?", "A product goes live only after images, variants, price, material, delivery and return terms are confirmed."],
            ["Where will I see delivery cost?", "The full cost and expected timing appear before payment after you choose a country and product."],
            ["How do returns work?", "Return terms appear on the product page and again before payment."],
            ["Is VLM an investment?", "No. VLM is an access layer for features and community, without claims about price performance, liquidity or listings."],
          ],
          routes: [["Delivery", "Review regions and rules."], ["Returns", "Read return conditions."], ["Contact", "Message support."]],
          cta: "Still need help?",
          ctaBody: "Send one message with a short description. Never include passwords, seed phrases or payment details.",
          ctaButton: "Open contact",
        };
  const routeIcons = [Truck, RotateCcw, MessageCircle];
  const routeHrefs = ["/shipping", "/returns", "/contact"] as const;

  return (
    <main
      className="velmere-public-page min-h-[100dvh] bg-velmere-black text-white"
      data-pass680-faq-calm-accordion="true"
      data-pass2007-faq="solid-accordion-cyan-focus-low-motion"
    >
      <LuxurySection className="py-24 md:py-36">
        <section className="velmere-editorial-hero rounded-[2.3rem] border border-white/[0.09] bg-[#09090b]/[0.88] p-6 shadow-velmere-card md:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,.62fr)]">
            <div>
              <p className="luxury-kicker text-velmere-gold/[0.82]">{copy.kicker}</p>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[0.92] tracking-[-0.055em] md:text-7xl">{copy.title}</h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/[0.58] md:text-base">{copy.intro}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {copy.routes.map(([title, body], index) => {
                const Icon = routeIcons[index] ?? HelpCircle;
                return (
                  <Link key={title} href={routeHrefs[index]} className="velmere-faq-route group flex items-center gap-4 rounded-[1.25rem] border border-white/[0.08] bg-white/[0.025] p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-velmere-gold/[0.14] bg-velmere-gold/[0.05]">
                      <Icon className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-sm text-white">{title}</strong>
                      <small className="mt-1 block text-xs text-white/[0.42]">{body}</small>
                    </span>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-white/[0.24] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-velmere-gold" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 max-w-5xl">
          <div className="grid gap-3">
            {copy.items.map(([question, answer], index) => (
              <details key={question} className="velmere-faq-item pass2007-faq-item group border-t border-white/[0.08] first:border-t-0">
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 md:px-6">
                  <span className="font-mono text-[9px] text-cyan-100/[0.68]">{String(index + 1).padStart(2, "0")}</span>
                  <h2 className="min-w-0 flex-1 text-left text-sm font-semibold text-white md:text-base">{question}</h2>
                  <span className="velmere-faq-plus flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-lg font-light text-white/[0.56]">+</span>
                </summary>
                <div className="border-t border-white/[0.07] px-5 py-5 md:px-6">
                  <p className="max-w-3xl text-sm leading-7 text-white/[0.56]">{answer}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-6 flex max-w-5xl flex-col gap-5 rounded-[1.7rem] border border-velmere-gold/[0.13] bg-velmere-gold/[0.04] p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-velmere-gold/[0.14] bg-black/[0.15]">
              <PackageCheck className="h-5 w-5 text-velmere-gold" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">{copy.cta}</h2>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-white/[0.50]">{copy.ctaBody}</p>
            </div>
          </div>
          <Link href="/contact" className="velmere-button-primary shrink-0">{copy.ctaButton}</Link>
        </section>
      </LuxurySection>
    </main>
  );
}
