import { Activity, Database, FileCheck2, Globe2, LockKeyhole, ShieldCheck } from "lucide-react";

type Locale = "pl" | "de" | "en";
type Surface = "home" | "vlm" | "square" | "research" | "checkout" | "shield";

const surfaceWeight: Record<Surface, number> = {
  home: 1,
  vlm: 2,
  square: 2,
  research: 2,
  checkout: 3,
  shield: 3,
};

function resolveLocale(locale: string): Locale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

type ReadinessCopy = {
  kicker: string; title: string; body: string; ready: string; review: string; blocked: string; next: string;
  surface: Record<Surface, string>;
  lanes: ReadonlyArray<readonly [string, string]>;
};

const copy: Record<Locale, ReadinessCopy> = {
  pl: {
    kicker: "launch readiness index",
    title: "Jedna mapa tego, co blokuje start.",
    body: "Ten panel łączy produkt, Shield, Square, VLM, commerce, legal copy i operator gates w jedną mapę. Ma pokazywać prawdę o gotowości, a nie udawać produkcji.",
    ready: "gotowe",
    review: "review",
    blocked: "blokada",
    next: "następny krok",
    surface: {
      home: "Strona główna",
      vlm: "VLM access",
      square: "Square",
      research: "Research Lab",
      checkout: "Commerce",
      shield: "Shield",
    },
    lanes: [
      ["UI shell", "Premium layout, containment i czytelność powierzchni."],
      ["Mobile QA", "Safe area, scroll, modal, 60fps i brak nachodzenia sekcji."],
      ["Data spine", "Źródła live, partial, fallback, missing i timestampy."],
      ["Operator gate", "Admin lock, audit write, idempotency i redakcja sekretów."],
      ["Legal wording", "Bez certyfikatów bezpieczeństwa, porad inwestycyjnych i obietnic zysku."],
      ["Commerce truth", "Provider, płatność, dostawa, zwroty i status produktu przed publicznym startem."],
    ],
  },
  de: {
    kicker: "launch readiness index",
    title: "Eine Karte für alle Start-Blocker.",
    body: "Dieses Panel verbindet Product, Shield, Square, VLM, Commerce, Legal Copy und Operator Gates. Es zeigt echte Bereitschaft statt Produkt-Illusion.",
    ready: "bereit",
    review: "review",
    blocked: "blocker",
    next: "nächster Schritt",
    surface: {
      home: "Startseite",
      vlm: "VLM access",
      square: "Square",
      research: "Research Lab",
      checkout: "Commerce",
      shield: "Shield",
    },
    lanes: [
      ["UI shell", "Premium Layout, Containment und klare Oberfläche."],
      ["Mobile QA", "Safe area, Scroll, Modal, 60fps und keine Überschneidungen."],
      ["Data spine", "Live-, Partial-, Fallback-, Missing-Quellen und Zeitstempel."],
      ["Operator gate", "Admin Lock, Audit Write, Idempotency und Secret Redaction."],
      ["Legal wording", "Keine Sicherheitszertifikate, keine Anlageberatung, keine Gewinnversprechen."],
      ["Commerce truth", "Provider, Zahlung, Versand, Rückgaben und Produktstatus vor Public Launch."],
    ],
  },
  en: {
    kicker: "launch readiness index",
    title: "One map for every launch blocker.",
    body: "This panel connects product, Shield, Square, VLM, commerce, legal copy and operator gates. It shows real readiness instead of pretending production is done.",
    ready: "ready",
    review: "review",
    blocked: "blocked",
    next: "next step",
    surface: {
      home: "Home",
      vlm: "VLM access",
      square: "Square",
      research: "Research Lab",
      checkout: "Commerce",
      shield: "Shield",
    },
    lanes: [
      ["UI shell", "Premium layout, containment and surface clarity."],
      ["Mobile QA", "Safe area, scroll, modal, 60fps and no overlapping sections."],
      ["Data spine", "Live, partial, fallback, missing sources and timestamps."],
      ["Operator gate", "Admin lock, audit write, idempotency and secret redaction."],
      ["Legal wording", "No safety certificates, financial advice or profit promises."],
      ["Commerce truth", "Provider, payment, shipping, returns and product status before public launch."],
    ],
  },
};

function scoreForLane(index: number, surface: Surface) {
  const base = [86, 68, 58, 63, 78, 60][index] ?? 60;
  const weight = surfaceWeight[surface] ?? 1;
  return Math.max(34, Math.min(96, base + weight * 2 - (index === 2 || index === 3 ? 2 : 0)));
}

function statusForScore(score: number, c: ReadinessCopy) {
  if (score >= 78) return { label: c.ready, className: "fsri-status-ready" };
  if (score >= 58) return { label: c.review, className: "fsri-status-review" };
  return { label: c.blocked, className: "fsri-status-blocked" };
}

export default function FullSurfaceReadinessIndex({
  locale,
  surface = "home",
}: {
  locale: string;
  surface?: Surface;
}) {
  const activeLocale = resolveLocale(locale);
  const c = copy[activeLocale];
  const rows = c.lanes.map(([label, body], index) => {
    const score = scoreForLane(index, surface);
    return { label, body, score, status: statusForScore(score, c) };
  });
  const overall = Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length);
  const Icon = surface === "checkout" ? FileCheck2 : surface === "shield" ? ShieldCheck : surface === "research" ? Database : surface === "square" ? Globe2 : surface === "vlm" ? LockKeyhole : Activity;

  return (
    <section className="mx-auto max-w-7xl px-6 pb-16 md:px-12 md:pb-24">
      <div className="fsri-shell">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.065] px-3 py-1.5 text-velmere-gold">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em]">{c.kicker}</span>
            </div>
            <h2 className="mt-5 font-serif text-4xl leading-none tracking-[-0.045em] text-white md:text-6xl">{c.title}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/[0.58]">{c.body}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-white/[0.08] bg-black/[0.22] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.38]">{c.surface[surface]}</p>
                <p className="mt-2 font-mono text-3xl text-velmere-gold">{overall}%</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/[0.08] bg-black/[0.22] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.38]">{c.next}</p>
                <p className="mt-2 text-sm leading-6 text-white/[0.62]">{rows.find((row) => row.score < 70)?.label ?? rows.at(-1)?.label}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((row) => (
              <article key={row.label} className="fsri-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.36]">{row.label}</p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.56]">{row.body}</p>
                  </div>
                  <span className={`fsri-status ${row.status.className}`}>{row.status.label}</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <span className="block h-full rounded-full bg-velmere-gold/[0.72]" style={{ width: `${row.score}%` }} />
                </div>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.34]">{row.score}%</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
