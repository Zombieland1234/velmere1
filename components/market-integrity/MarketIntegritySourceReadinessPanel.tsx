import { Database, FileClock, RadioTower, ShieldAlert } from "lucide-react";
import {
  marketIntegritySourceReadiness,
  summarizeMarketIntegritySourceReadiness,
} from "@/lib/market-integrity/live-source-adapter-contract";

type Locale = "pl" | "de" | "en";

const copy = {
  pl: {
    eyebrow: "source readiness",
    title: "Shield musi pokazać, które źródła naprawdę żyją.",
    body: "Ten panel rozdziela live, partial, missing i blocked. Brak danych nie jest neutralny — operator widzi, czego brakuje zanim uzna wynik za spokojny.",
    avg: "średni postęp",
    open: "P0 otwarte",
    blocked: "braki/blokady",
    next: "następny krok",
    ttl: "TTL",
    stale: "stale",
    missing: "brakuje",
    boundary: "granica produkcji",
  },
  de: {
    eyebrow: "source readiness",
    title: "Shield muss zeigen, welche Quellen wirklich live sind.",
    body: "Dieses Panel trennt live, partial, missing und blocked. Fehlende Daten sind nicht neutral — der Operator sieht die Lücken vor jedem ruhigen Befund.",
    avg: "Durchschnitt",
    open: "P0 offen",
    blocked: "fehlend/blockiert",
    next: "nächster Schritt",
    ttl: "TTL",
    stale: "stale",
    missing: "fehlend",
    boundary: "Produktionsgrenze",
  },
  en: {
    eyebrow: "source readiness",
    title: "Shield must show which sources are truly live.",
    body: "This panel separates live, partial, missing and blocked. Missing data is not neutral — the operator sees gaps before trusting a calm score.",
    avg: "average progress",
    open: "P0 open",
    blocked: "missing/blocked",
    next: "next step",
    ttl: "TTL",
    stale: "stale",
    missing: "missing",
    boundary: "production boundary",
  },
} as const;

function resolveLocale(locale: string): Locale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

function modeClass(mode: string) {
  if (mode === "live") return "misr-mode-live";
  if (mode === "partial") return "misr-mode-partial";
  if (mode === "fallback") return "misr-mode-fallback";
  return "misr-mode-blocked";
}

function iconForMode(mode: string) {
  if (mode === "live" || mode === "partial") return RadioTower;
  if (mode === "fallback") return FileClock;
  return ShieldAlert;
}

function secondsToLabel(seconds: number) {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

export default function MarketIntegritySourceReadinessPanel({ locale }: { locale: string }) {
  const c = copy[resolveLocale(locale)];
  const summary = summarizeMarketIntegritySourceReadiness();

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-12">
      <div className="misr-shell">
        <div className="grid gap-8 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.065] px-3 py-1.5 text-velmere-gold">
              <Database className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em]">{c.eyebrow}</span>
            </div>
            <h2 className="mt-5 font-serif text-4xl leading-none tracking-[-0.045em] text-white md:text-6xl">{c.title}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/[0.58]">{c.body}</p>
            <div className="mt-7 grid grid-cols-3 gap-3">
              <div className="misr-stat"><p>{c.avg}</p><strong>{summary.averageProgress}%</strong></div>
              <div className="misr-stat"><p>{c.open}</p><strong>{summary.p0Open}</strong></div>
              <div className="misr-stat"><p>{c.blocked}</p><strong>{summary.blockedCount}</strong></div>
            </div>
            <div className="mt-5 rounded-[1.25rem] border border-red-300/[0.14] bg-red-500/[0.045] p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-red-100/[0.62]">{c.next}</p>
              <p className="mt-2 text-xs leading-6 text-red-100/[0.76]">{summary.nextCriticalStep}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {marketIntegritySourceReadiness.map((item) => {
              const Icon = iconForMode(item.mode);
              return (
                <article key={item.lane} className="misr-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Icon className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
                        <span className="misr-priority">{item.priority}</span>
                        <span className={`misr-mode ${modeClass(item.mode)}`}>{item.mode}</span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-white/[0.88]">{item.label}</h3>
                      <p className="mt-2 text-xs leading-6 text-white/[0.56]">{item.productionRequirement}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-2xl text-velmere-gold">{item.progress}%</p>
                      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.30]">
                        {c.ttl} {secondsToLabel(item.targetTtlSeconds)} · {c.stale} {secondsToLabel(item.staleAfterSeconds)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <span className="block h-full rounded-full bg-velmere-gold/[0.75]" style={{ width: `${item.progress}%` }} />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">{c.missing}</p>
                      <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-white/[0.52]">
                        {item.missing.map((missing) => <li key={missing}>• {missing}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">{c.boundary}</p>
                      <p className="mt-2 text-[11px] leading-5 text-white/[0.52]">{item.allowedFallback}</p>
                      <p className="mt-2 text-[11px] leading-5 text-white/[0.42]">{item.nextStep}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
