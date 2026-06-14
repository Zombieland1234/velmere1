"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  MessageSquare,
  PackageCheck,
  Radar,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/navigation";
import Reveal from "@/components/ui/Reveal";
import NeuralBrainVisual from "@/components/home/NeuralBrainVisual";
import LuxuryProductCarousel from "@/components/home/LuxuryProductCarousel";
import EditorialFeatureSwitcher from "@/components/home/EditorialFeatureSwitcher";

type LocaleCopy = {
  heroKicker: string;
  heroTitle: string;
  heroBody: string;
  heroEyebrow: string;
  exploreCollection: string;
  enterVlm: string;
  accessCore: string;
  readOnlyPreview: string;
  quickFacts: Array<[string, string]>;
  heroNotes: string[];
  clothingKicker: string;
  clothingTitle: string;
  clothingBody: string;
  shieldKicker: string;
  shieldTitle: string;
  shieldBody: string;
  openMarketShield: string;
  shieldMap: string;
  dropKicker: string;
  dropTitle: string;
  dropBody: string;
  squareCta: string;
  shippingCta: string;
  pillars: Array<{ kicker: string; title: string; body: string }>;
  flow: Array<[string, string, string]>;
  clothingFirstAtelier: Array<[string, string, string]>;
  shieldRails: Array<[string, string, string]>;
  buyingPrinciplesKicker: string;
  buyingPrinciplesTitle: string;
  buyingPrinciplesBody: string;
  buyingPrinciples: Array<[string, string, string]>;
  supportCards: Array<{ title: string; body: string }>;
  summaryKicker: string;
  summaryTitle: string;
  summaryItems: string[];
};

function homeCopy(locale: string): LocaleCopy {
  if (locale === "pl") {
    return {
      heroKicker: "VELMÈRE / PRIVATE HOUSE",
      heroTitle: "Limitowane sylwetki. Własny rytm.",
      heroBody:
        "Velmère ma prowadzić jak prywatny showroom: najpierw ubranie, potem dostęp, a dopiero na końcu system. Mniej hałasu, więcej zaufania i jasna ścieżka zakupu.",
      heroEyebrow: "Limitowane sylwetki, spokojny zakup i prywatna warstwa dostępu — bez cyfrowego hałasu.",
      exploreCollection: "Zobacz kolekcję",
      enterVlm: "Wejdź do VLM",
      accessCore: "Rdzeń dostępu",
      readOnlyPreview: "Prywatny podgląd",
      quickFacts: [
        ["Commerce", "Produkt, rozmiar, dostawa i zwroty pozostają czytelne przed checkoutem."],
        ["Access", "VLM jest opcjonalną warstwą dostępu, nie warunkiem zakupu."],
        ["Trust", "Shield pokazuje ryzyko i luki danych bez udawania gotowości."],
      ],
      heroNotes: ["Guest checkout", "Wallet optional"],
      clothingKicker: "UBRANIA NAJPIERW",
      clothingTitle: "Krój, materiał, obecność.",
      clothingBody:
        "Największy problem sklepu nie jest techniczny, tylko hierarchiczny. Klient musi szybciej rozumieć krój, materiał, zdjęcia, dostawę i poziom gotowości produktu.",
      shieldKicker: "SHIELD MARKET INTELLIGENCE",
      shieldTitle: "Ryzyko czytelne bez hałasu.",
      shieldBody:
        "Shield ma wyglądać jak narzędzie premium, nie jak przeciążony terminal. Najpierw czytelny werdykt, potem dowody, dopiero potem głębia dla ludzi, którzy jej naprawdę potrzebują.",
      openMarketShield: "Otwórz Market Shield",
      shieldMap: "Mapa Shield",
      dropKicker: "ARCHITEKTURA DROPU",
      dropTitle: "Dostęp budowany wokół produktu.",
      dropBody:
        "Kolekcja prowadzi do produktu, produkt do decyzji, a dostęp i community pozostają opcjonalnym rozszerzeniem świata Velmère.",
      squareCta: "Otwórz Square",
      shippingCta: "Dostawa i zwroty",
      pillars: [
        {
          kicker: "Czym jest Velmère?",
          title: "Marka z własnym rytmem.",
          body: "Limitowane sylwetki, ciężar materiału, proporcja i kontrola. Technologia wzmacnia markę tylko wtedy, gdy nie kradnie uwagi ubraniu.",
        },
        {
          kicker: "Warstwa VLM",
          title: "Dostęp, nie obietnice.",
          body: "VLM wspiera prywatne dropy, archiwum i membership. To warstwa dostępu, a nie obietnica ceny, zysku albo obowiązkowy element checkoutu.",
        },
        {
          kicker: "Prywatne dropy",
          title: "Rzadkość bez zamętu.",
          body: "Dostępność, rozmiary, opisy i care mają być czytelne. Rzadkość ma wynikać z produktu i kontroli, nie z chaosu informacyjnego.",
        },
        {
          kicker: "Velmère Square",
          title: "Community z granicami.",
          body: "Square zostaje osobną warstwą notatek i sygnałów memberów. Gość może czytać, ale nie musi przebijać się przez forum, żeby kupić ubranie.",
        },
      ],
      flow: [
        ["01", "Kolekcja", "Jedna spokojna nawigacja do najważniejszych sylwetek i kategorii."],
        ["02", "Produkt", "Pełny kontekst zakupu: materiał, care, cena, dostawa i prawa zwrotu."],
        ["03", "Decyzja", "VLM i community są dodatkiem, nie przeszkodą w zakupie."],
      ],
      clothingFirstAtelier: [
        ["01", "Krój", "Sylwetka, linia ramion, długość i proporcja muszą prowadzić pierwsze wrażenie."],
        ["02", "Materiał", "Każdy produkt potrzebuje jasnej informacji o gramaturze, dotyku i pielęgnacji."],
        ["03", "Zaufanie", "Dostawa, zwroty i status gotowości produktu mają być widoczne bez szukania."],
      ],
      shieldRails: [
        ["01", "Szybki werdykt", "Najpierw wynik i ograniczenia. Głębia dopiero po wejściu w analizę."],
        ["02", "Dowody", "Sprzeczności, źródła i pokrycie danych muszą być czytelne także na telefonie."],
        ["03", "Granice", "AI ma mówić, czego nie wie, zamiast symulować pewność."],
      ],
      buyingPrinciplesKicker: "JAK TO MA DZIAŁAĆ",
      buyingPrinciplesTitle: "Trzy warstwy doświadczenia.",
      buyingPrinciplesBody:
        "Produkt, zaufanie i dostęp tworzą jeden spokojny rytm — bez konkurowania o uwagę.",
      buyingPrinciples: [
        ["01", "Jedna dominanta", "Każdy ekran powinien mieć jeden główny punkt decyzji, a nie pięć rywalizujących bloków."],
        ["02", "Treść przed efektem", "Najpierw odpowiedzi o produkcie i zakupie. Ruch i system tylko wtedy, gdy pomagają."],
        ["03", "Zaufanie bez szukania", "Koszty, dostawa, zwroty i status warstwy VLM muszą być widoczne od razu."],
      ],
      supportCards: [
        { title: "Bezpieczny checkout", body: "Płatność, podatki i koszty dostawy powinny być jasne przed zakupem." },
        { title: "Czytelna dostawa", body: "Kierunek wysyłki, koszt i przewidywany termin nie mogą być ukryte." },
        { title: "Zwroty UE", body: "Prawo odstąpienia i zasady zwrotu mają być łatwe do znalezienia." },
        { title: "Ludzki kontakt", body: "Kontakt ma rozwiązywać zakupy i support, a nie odsyłać do wallet flow." },
      ],
      summaryKicker: "STORE LIFT",
      summaryTitle: "Produkt pierwszy. Reszta dokładnie wtedy, gdy jest potrzebna.",
      summaryItems: [
        "Czytelniejszy hero i CTA",
        "Mocniejsza hierarchia clothing-first",
        "Spokojniejsza narracja AI/VLM",
      ],
    };
  }

  if (locale === "de") {
    return {
      heroKicker: "VELMÈRE / PRIVATE HOUSE",
      heroTitle: "Limitierte Silhouetten. Eigener Rhythmus.",
      heroBody:
        "Materialgewicht, Proportion und Detail führen die Kollektion. VLM, Shield und Square bleiben eine diskrete Access-Ebene um das Produkt.",
      heroEyebrow: "Ein privates Haus für digitale Mode — Clothing first, Technologie nur dort, wo sie das Erlebnis stärkt.",
      exploreCollection: "Kollektion ansehen",
      enterVlm: "VLM öffnen",
      accessCore: "Access Core",
      readOnlyPreview: "Private Vorschau",
      quickFacts: [
        ["Commerce", "Produkt, Größe, Lieferung und Rückgabe bleiben vor Checkout klar."],
        ["Access", "VLM bleibt optionaler Zugang, keine Kaufvoraussetzung."],
        ["Trust", "Shield zeigt Risiko und Datenlücken ohne falsche Reife."],
      ],
      heroNotes: ["Guest checkout", "Wallet optional"],
      clothingKicker: "KLEIDUNG ZUERST",
      clothingTitle: "Schnitt, Material, Präsenz.",
      clothingBody:
        "Jede Silhouette soll sofort lesbar sein: Proportion, Materialgefühl, Größe und Styling.",
      shieldKicker: "SHIELD MARKET INTELLIGENCE",
      shieldTitle: "Risiko lesbar, ohne Lärm.",
      shieldBody:
        "Shield ordnet Signale, Quellen und Datenlücken. Erst Bedeutung, dann Evidenz, danach die volle Analysetiefe.",
      openMarketShield: "Market Shield öffnen",
      shieldMap: "Shield Map",
      dropKicker: "DROP ARCHITEKTUR",
      dropTitle: "Zugang rund um das Produkt.",
      dropBody:
        "Die Kollektion führt zum Produkt, das Produkt zur Entscheidung. Access und Community erweitern die Welt von Velmère optional.",
      squareCta: "Square öffnen",
      shippingCta: "Versand und Rückgabe",
      pillars: [
        {
          kicker: "Was ist Velmère?",
          title: "Eine Marke mit eigenem Rhythmus.",
          body: "Limitierte Silhouetten, Materialgewicht, Proportion und Kontrolle. Technologie stärkt die Marke nur dann, wenn sie dem Garment nicht die Bühne nimmt.",
        },
        {
          kicker: "Die VLM Ebene",
          title: "Zugang, keine Versprechen.",
          body: "VLM unterstützt private Drops, Archiv und Membership. Es ist eine Access-Ebene, kein Preisversprechen, Gewinnversprechen oder Checkout-Zwang.",
        },
        {
          kicker: "Private Drops",
          title: "Knappheit ohne Chaos.",
          body: "Verfügbarkeit, Größen, Texte und Care sollen klar sein. Knappheit soll aus dem Produkt kommen, nicht aus Informationslärm.",
        },
        {
          kicker: "Velmère Square",
          title: "Community mit Grenzen.",
          body: "Square bleibt eine eigene Ebene für Member-Notizen und Signale. Gäste können lesen, ohne sich durch ein Forum kaufen zu müssen.",
        },
      ],
      flow: [
        ["01", "Kollektion", "Eine ruhige Navigation zu den wichtigsten Silhouetten und Kategorien."],
        ["02", "Produkt", "Voller Kaufkontext: Material, Care, Preis, Lieferung und Rückgaberecht."],
        ["03", "Entscheidung", "VLM und Community bleiben Zusatz, nicht Hürde."],
      ],
      clothingFirstAtelier: [
        ["01", "Schnitt", "Silhouette, Schulterlinie, Länge und Proportion müssen den ersten Eindruck führen."],
        ["02", "Material", "Jedes Produkt braucht klare Angaben zu Gewicht, Handfeel und Pflege."],
        ["03", "Vertrauen", "Lieferung, Rückgabe und Produktstatus müssen sichtbar sein, ohne Suche."],
      ],
      shieldRails: [
        ["01", "Schnelles Verdict", "Zuerst Ergebnis und Grenzen. Tiefe erst nach dem Einstieg."],
        ["02", "Evidenz", "Widersprüche, Quellen und Coverage müssen auch mobil lesbar sein."],
        ["03", "Grenzen", "AI muss sagen, was sie nicht weiß, statt Sicherheit zu spielen."],
      ],
      buyingPrinciplesKicker: "WIE ES FUNKTIONIEREN SOLL",
      buyingPrinciplesTitle: "Drei Ebenen des Erlebnisses.",
      buyingPrinciplesBody:
        "Produkt, Vertrauen und Access bilden einen ruhigen Rhythmus, ohne um Aufmerksamkeit zu kämpfen.",
      buyingPrinciples: [
        ["01", "Eine Dominante", "Jeder Screen braucht einen klaren Hauptentscheid, nicht fünf konkurrierende Blöcke."],
        ["02", "Inhalt vor Effekt", "Erst Antworten zu Produkt und Kauf, dann Motion und System."],
        ["03", "Vertrauen sofort", "Kosten, Lieferung, Rückgabe und VLM-Status müssen direkt sichtbar sein."],
      ],
      supportCards: [
        { title: "Sicherer Checkout", body: "Zahlung, Steuern und Lieferkosten sollten vor dem Kauf klar sein." },
        { title: "Klare Lieferung", body: "Versandgebiet, Kosten und Zeitfenster dürfen nicht versteckt werden." },
        { title: "EU Rückgaben", body: "Widerruf und Rückgabe sollen leicht auffindbar sein." },
        { title: "Menschlicher Kontakt", body: "Support soll beim Kauf helfen und nicht in Wallet-Flows ausweichen." },
      ],
      summaryKicker: "STORE LIFT",
      summaryTitle: "Das Produkt zuerst. Alles andere genau dann, wenn es gebraucht wird.",
      summaryItems: [
        "Klarerer Hero und stärkere CTA",
        "Stärkere Clothing-first Hierarchie",
        "Ruhigere AI/VLM Erzählung",
      ],
    };
  }

  return {
    heroKicker: "VELMÈRE / PRIVATE HOUSE",
    heroTitle: "Limited silhouettes. A rhythm of its own.",
    heroBody:
      "Material weight, proportion and detail lead the collection. VLM, Shield and Square remain a discreet access layer around the product.",
    heroEyebrow: "A private house for digital fashion — clothing first, technology only where it strengthens the experience.",
    exploreCollection: "Explore collection",
    enterVlm: "Enter VLM",
    accessCore: "Access core",
    readOnlyPreview: "Private preview",
    quickFacts: [
      ["Commerce", "Product, sizing, shipping and returns stay clear before checkout."],
      ["Access", "VLM remains an optional access layer, not a purchase requirement."],
      ["Trust", "Shield exposes risk and evidence gaps without pretending the system is finished."],
    ],
    heroNotes: ["Guest checkout", "Wallet optional"],
    clothingKicker: "CLOTHING FIRST",
    clothingTitle: "Cut, material, presence.",
    clothingBody:
      "The biggest issue is not the stack, it is the hierarchy. People should understand fit, material, imagery, shipping and product readiness faster.",
    shieldKicker: "SHIELD MARKET INTELLIGENCE",
    shieldTitle: "Risk intelligence without the noise.",
    shieldBody:
      "Shield should feel like a premium instrument, not an overgrown terminal. Verdict first, evidence second, depth only when the user asks for it.",
    openMarketShield: "Open Market Shield",
    shieldMap: "Shield Map",
    dropKicker: "DROP ARCHITECTURE",
    dropTitle: "Access built around the product.",
    dropBody:
      "A strong storefront does not hit people with systems. It guides them through collection, product, trust and decision. Community and access can sit beside that path.",
    squareCta: "View Square",
    shippingCta: "Shipping and returns",
    pillars: [
      {
        kicker: "What is Velmère?",
        title: "A brand with its own rhythm.",
        body: "Limited silhouettes, fabric weight, proportion and control. Technology strengthens the brand only when it does not steal attention from the garment.",
      },
      {
        kicker: "The VLM layer",
        title: "Access, not promises.",
        body: "VLM supports private drops, archive access and membership. It is an access layer, not a price-performance claim or checkout requirement.",
      },
      {
        kicker: "Private drops",
        title: "Scarcity without confusion.",
        body: "Availability, sizing, copy and care should stay clear. Scarcity should come from product discipline, not from information overload.",
      },
      {
        kicker: "Velmère Square",
        title: "Community with boundaries.",
        body: "Square remains a separate member signal layer. Guests can read without having to navigate a forum to buy clothing.",
      },
    ],
    flow: [
      ["01", "Collection", "One calm navigation path into the key silhouettes and categories."],
      ["02", "Product", "Full purchase context: material, care, price, shipping and return rights."],
      ["03", "Decision", "VLM and community stay additive, not obstructive."],
    ],
    clothingFirstAtelier: [
      ["01", "Cut", "Silhouette, shoulder line, length and proportion should lead the first impression."],
      ["02", "Material", "Every product needs clear weight, handfeel and care information."],
      ["03", "Trust", "Shipping, returns and readiness status should be visible without digging."],
    ],
    shieldRails: [
      ["01", "Fast verdict", "Show the result and the limits first. Go deep only on demand."],
      ["02", "Evidence", "Contradictions, sources and data coverage stay readable on mobile."],
      ["03", "Boundaries", "AI should say what it does not know instead of simulating certainty."],
    ],
    buyingPrinciplesKicker: "HOW IT SHOULD WORK",
    buyingPrinciplesTitle: "Three layers of the experience.",
    buyingPrinciplesBody:
      "When these three things are clear, the store starts doing its job. When they are not, motion and AI cannot save the experience.",
    buyingPrinciples: [
      ["01", "One dominant move", "Every screen should have one main decision, not five competing blocks."],
      ["02", "Content before effect", "Answer product and buying questions first. Motion and systems should support that."],
      ["03", "Trust without hunting", "Costs, shipping, returns and VLM status should be visible immediately."],
    ],
    supportCards: [
      { title: "Secure checkout", body: "Payment, tax and delivery costs should be clear before purchase." },
      { title: "Shipping clarity", body: "Destination, cost and delivery window should never feel hidden." },
      { title: "EU returns", body: "Withdrawal and return information should be easy to find." },
      { title: "Human support", body: "Support should help with buying decisions, not send people into wallet flows." },
    ],
    summaryKicker: "STORE LIFT",
    summaryTitle: "Product first. Everything else exactly when it is needed.",
    summaryItems: [
      "Clearer hero and stronger CTA",
      "Stronger clothing-first hierarchy",
      "Calmer AI/VLM storytelling",
    ],
  };
}

export default function HomePageClient() {
  const locale = useLocale();
  const copy = homeCopy(locale);
  const {
    pillars,
    flow,
    clothingFirstAtelier,
    shieldRails,
    buyingPrinciples,
    supportCards,
  } = copy;

  return (
    <main
      id="main-content"
      className="velmere-public-page bg-velmere-black text-velmere-ivory"
      data-pass318-public-storefront-focus="home"
      data-pass319-public-first-purchase-flow="home"
      data-pass320-public-atelier-trust-ribbon="home"
      data-pass321-public-copy-polish="home"
      data-pass322-public-product-pathway-receipt="home"
      data-pass323-public-provenance-drop-concierge="home"
      data-pass324-public-size-confidence-concierge="home"
      data-pass718-editorial-density="calm"
      data-pass2006-home-storefront-sweep="solid-home-footer-cookie-dashboard-low-lag"
    >
      <section className="luxury-section min-h-[calc(100dvh-4.5rem)] pt-28 md:pt-32">
        <div className="grid gap-6 pb-8 xl:grid-cols-[minmax(0,1fr)_minmax(25rem,0.82fr)] xl:items-stretch">
          <Reveal className="pass2006-home-hero velmere-editorial-hero velmere-surface-sheen relative overflow-hidden rounded-[2rem] border border-white/[0.10] bg-[radial-gradient(circle_at_18%_18%,rgba(200,169,106,0.12),transparent_34%),linear-gradient(145deg,#0d0d0f,#080809_58%,#151518)] p-6 shadow-velmere-card md:p-10">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_32%)]" />
            <div className="relative z-[1] flex h-full flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-velmere-gold/[0.24] bg-velmere-gold/[0.10] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-velmere-gold">
                  {copy.heroKicker}
                </span>
                {copy.heroNotes.map((note) => (
                  <span
                    key={note}
                    className="rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.46]"
                  >
                    {note}
                  </span>
                ))}
              </div>

              <p className="mt-7 max-w-2xl text-sm leading-7 text-white/[0.46] md:text-base">
                {copy.heroEyebrow}
              </p>
              <h1 className="mt-5 max-w-[11ch] font-serif text-[clamp(3.1rem,7vw,7rem)] leading-[0.88] tracking-[-0.06em] text-velmere-ivory">
                {copy.heroTitle}
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-velmere-grey-soft md:text-lg">
                {copy.heroBody}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/shop" className="velmere-button-primary">
                  {copy.exploreCollection} <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link href="/vlm-token" className="velmere-button-secondary">
                  {copy.enterVlm} <WalletCards className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-3">
                {copy.quickFacts.map(([title, body]) => (
                  <div
                    key={title}
                    className="pass2006-home-window velmere-premium-tile rounded-[1.35rem] border border-white/[0.08] bg-black/[0.18] p-4"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
                      {title}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/[0.58]">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="grid gap-6">
            <Reveal
              delay={0.08}
              className="pass2006-home-brain-card flex flex-col justify-between rounded-[2rem] border border-white/[0.10] bg-[linear-gradient(145deg,#111113,#080809_58%,#17181B)] p-4 shadow-velmere-card md:p-6"
            >
              <div className="mb-4 flex items-center justify-between gap-4 px-1">
                <p className="velmere-label text-velmere-gold">{copy.accessCore}</p>
                <span className="rounded-full border border-white/[0.10] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/[0.42]">
                  {copy.readOnlyPreview}
                </span>
              </div>
              <div className="flex flex-1 items-center justify-center">
                <NeuralBrainVisual />
              </div>
            </Reveal>

            <Reveal
              delay={0.12}
              className="pass2006-home-flow-card rounded-[2rem] border border-white/[0.10] bg-[#0d0d10] p-5 shadow-velmere-card"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                {flow.map(([step, title, body]) => (
                  <div
                    key={title}
                    className="pass2006-home-window velmere-premium-tile rounded-[1.25rem] border border-white/[0.08] bg-white/[0.025] p-4"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/[0.32]">
                      {step}
                    </p>
                    <h2 className="mt-3 text-base font-semibold text-white">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/[0.48]">{body}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="luxury-section py-14 md:py-18">
        <Reveal className="pass2006-home-section velmere-surface-sheen rounded-[2rem] border border-velmere-gold/[0.13] bg-[linear-gradient(145deg,rgba(212,175,55,0.08),rgba(255,255,255,0.025)_45%,rgba(0,0,0,0.18))] p-6 md:p-9">
          <div className="grid gap-8 lg:grid-cols-[0.62fr_1.38fr] lg:items-end">
            <div>
              <p className="velmere-label text-velmere-gold">{copy.clothingKicker}</p>
              <h2 className="mt-5 font-serif text-4xl leading-[0.95] tracking-[-0.045em] text-white md:text-6xl">
                {copy.clothingTitle}
              </h2>
              <p className="mt-5 text-sm leading-7 text-velmere-grey-soft">
                {copy.clothingBody}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {clothingFirstAtelier.map(([step, label, body]) => (
                <div
                  key={label}
                  className="pass2006-home-window rounded-[1.35rem] border border-white/[0.08] bg-black/[0.22] p-5"
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/[0.32]">
                    {step}
                  </p>
                  <h3 className="mt-4 text-xl text-white">{label}</h3>
                  <p className="mt-3 text-xs leading-6 text-velmere-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="luxury-section pb-12 md:pb-16">
        <LuxuryProductCarousel />
      </section>

      <section className="luxury-section pb-14 md:pb-20">
        <Reveal className="pass2006-home-section velmere-surface-sheen overflow-hidden rounded-[2rem] border border-cyan-200/[0.12] bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.10),transparent_34%),linear-gradient(135deg,#101115,#080809)] p-6 shadow-velmere-card md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(20rem,0.42fr)] lg:items-center">
            <div>
              <p className="velmere-label text-velmere-gold">{copy.shieldKicker}</p>
              <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-[0.95] tracking-[-0.045em] text-white md:text-6xl">
                {copy.shieldTitle}
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-velmere-grey-soft">
                {copy.shieldBody}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/market-integrity" className="velmere-button-primary">
                  {copy.openMarketShield} <Radar className="h-4 w-4" />
                </Link>
                <Link
                  href="/shield-map"
                  className="velmere-button-secondary"
                >
                  {copy.shieldMap} <ShieldCheck className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="grid gap-3">
              {shieldRails.map(([number, title, body]) => (
                <div
                  key={title}
                  className="pass2006-home-window rounded-2xl border border-white/[0.09] bg-black/[0.24] p-4"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
                    {number}
                  </p>
                  <h3 className="mt-2 text-lg text-white">{title}</h3>
                  <p className="mt-2 text-xs leading-6 text-white/[0.52]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="luxury-section pb-20 md:pb-24">
        <EditorialFeatureSwitcher />
      </section>


      <section className="luxury-section pb-20 md:pb-28">
        <div className="grid gap-4 md:grid-cols-2">
          {pillars.map((section, index) => (
            <Reveal
              key={section.kicker}
              delay={index * 0.04}
              className="pass2006-home-window luxury-card group min-h-[17rem] transition duration-300 hover:-translate-y-0.5 hover:border-cyan-200/[0.20] hover:bg-[#111417]"
            >
              <p className="velmere-label text-velmere-gold">{section.kicker}</p>
              <h2 className="mt-5 font-serif text-4xl leading-[0.95] tracking-[-0.04em] text-velmere-ivory md:text-5xl">
                {section.title}
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-velmere-grey-soft">
                {section.body}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="luxury-section pb-20 md:pb-28">
        <Reveal className="overflow-hidden rounded-[2rem] border border-white/[0.10] bg-[#111113] shadow-velmere-card">
          <div>
            <div className="p-6 md:p-10">
              <p className="velmere-label text-velmere-gold">{copy.dropKicker}</p>
              <h2 className="mt-5 font-serif text-5xl leading-[0.92] tracking-[-0.05em] md:text-7xl">
                {copy.dropTitle}
              </h2>
              <p className="mt-6 max-w-xl text-sm leading-7 text-velmere-grey-soft">
                {copy.dropBody}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/square" className="velmere-button-secondary">
                  {copy.squareCta} <MessageSquare className="h-4 w-4" />
                </Link>
                <Link href="/shipping" className="velmere-button-ghost">
                  {copy.shippingCta}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="luxury-section pb-24 md:pb-32">
        <div className="grid gap-4 md:grid-cols-4">
          {supportCards.map(({ title, body }, index) => {
            const Icon =
              index === 0
                ? ShieldCheck
                : index === 1
                  ? Truck
                  : index === 2
                    ? PackageCheck
                    : MessageSquare;

            return (
              <Reveal key={title} className="luxury-card min-h-[13rem]">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.03]">
                  <Icon className="h-5 w-5 text-velmere-gold" />
                </div>
                <h3 className="mt-5 text-lg text-velmere-ivory">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-velmere-muted">{body}</p>
              </Reveal>
            );
          })}
        </div>
      </section>

    </main>
  );
}
