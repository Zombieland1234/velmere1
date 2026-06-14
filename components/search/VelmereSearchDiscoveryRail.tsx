import { Atom, Blocks, Compass, Orbit, ShieldQuestion } from "lucide-react";

type Locale = "pl" | "de" | "en";

const copy = {
  pl: {
    eyebrow: "Velmère discovery layer",
    title: "Nowe moduły researchu, krótkie i gotowe pod Shield.",
    body: "To są lekkie kapsuły do szybkiego rozeznania: narracja, kontrakt, brakujące źródła i skrót VLM. Nie udają pełnej analizy — prowadzą do Shield.",
    status: "beta concept",
    cards: [
      {
        title: "Narrative radar",
        body: "Krótki skrót, czy token jest napędzany narracją, social attention albo hype window.",
      },
      {
        title: "Contract lens",
        body: "Szybka lista pól, które Shield powinien sprawdzić: owner, proxy, mint, pause, tax.",
      },
      {
        title: "Source gap map",
        body: "Pokazuje, czego brakuje: holderzy, orderbook, unlocki, OSINT i timestampy.",
      },
      {
        title: "VLM capsule",
        body: "Jedna mała kapsuła: co wiadomo, co jest niepewne i jaki jest następny ruch operatora.",
      },
    ],
  },
  de: {
    eyebrow: "Velmère discovery layer",
    title: "Neue Research-Module, kurz und bereit für Shield.",
    body: "Leichte Kapseln für schnelle Orientierung: Narrative, Contract, fehlende Quellen und VLM Shortcut. Sie ersetzen keine volle Analyse — sie führen zu Shield.",
    status: "beta concept",
    cards: [
      {
        title: "Narrative radar",
        body: "Kurzer Hinweis, ob ein Token durch Narrative, Social Attention oder Hype Window bewegt wird.",
      },
      {
        title: "Contract lens",
        body: "Kurze Liste der Felder, die Shield prüfen soll: owner, proxy, mint, pause, tax.",
      },
      {
        title: "Source gap map",
        body: "Zeigt fehlende Daten: Holder, Orderbook, Unlocks, OSINT und Timestamps.",
      },
      {
        title: "VLM capsule",
        body: "Eine kleine Kapsel: was bekannt ist, was unsicher bleibt und der nächste Operator-Schritt.",
      },
    ],
  },
  en: {
    eyebrow: "Velmère discovery layer",
    title: "New research modules, short and Shield-ready.",
    body: "Lightweight capsules for quick orientation: narrative, contract, missing sources and VLM shortcut. They do not replace full analysis — they route into Shield.",
    status: "beta concept",
    cards: [
      {
        title: "Narrative radar",
        body: "Quick signal on whether a token is driven by narrative, social attention or a hype window.",
      },
      {
        title: "Contract lens",
        body: "Short checklist of what Shield should inspect: owner, proxy, mint, pause and tax.",
      },
      {
        title: "Source gap map",
        body: "Shows missing data: holders, orderbook, unlocks, OSINT and timestamps.",
      },
      {
        title: "VLM capsule",
        body: "One compact capsule: what is known, what stays uncertain and the next operator move.",
      },
    ],
  },
} as const;

const icons = [Compass, Blocks, ShieldQuestion, Atom] as const;

function resolveLocale(locale: string): Locale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

export default function VelmereSearchDiscoveryRail({ locale }: { locale: string }) {
  const c = copy[resolveLocale(locale)];

  return (
    <section className="vsdr-shell" aria-label={c.eyebrow}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-velmere-gold">{c.eyebrow}</p>
          <h2 className="mt-3 font-serif text-3xl leading-none tracking-[-0.045em] text-white md:text-5xl">{c.title}</h2>
          <p className="mt-4 text-sm leading-7 text-white/[0.58]">{c.body}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-black/[0.24] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.46]">
          <Orbit className="h-3.5 w-3.5 text-velmere-gold" aria-hidden="true" />
          {c.status}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {c.cards.map((card, index) => {
          const Icon = icons[index] ?? Compass;
          return (
            <article key={card.title} className="vsdr-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.075] text-velmere-gold">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white/[0.88]">{card.title}</h3>
              <p className="mt-2 text-xs leading-6 text-white/[0.54]">{card.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
