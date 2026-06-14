// PASS180 safety marker: Contract Lens requires server-only analyzer output before production claims.
import { Code2, FileSearch, ShieldAlert } from "lucide-react";
// PASS180 safety marker: Contract Lens requires server-only analyzer output before production claims.
import {
  createContractLensPreview,
  getContractLensReadinessSummary,
} from "@/lib/market-integrity/contract-lens-contract";

type Locale = "pl" | "de" | "en";

const copy = {
  pl: {
    eyebrow: "contract lens",
    title: "Kontrakt ma osobną ścieżkę, nie mieszamy go z krótkim Lens.",
    body: "Contract Lens przygotowuje owner, proxy, mint, pause, blacklist, tax i source verification jako review-ready sygnały. Dopóki analyzer nie działa, wszystko zostaje preview/manual review.",
    signals: "sygnały",
    blocked: "blocked",
    review: "review",
    next: "następny krok",
    missing: "brakuje",
    operator: "operator",
    boundary: "granica",
  },
  de: {
    eyebrow: "contract lens",
    title: "Contract bekommt eine eigene Route, nicht den kurzen Lens-Mix.",
    body: "Contract Lens bereitet owner, proxy, mint, pause, blacklist, tax und source verification als review-ready Signale vor. Ohne Analyzer bleibt alles preview/manual review.",
    signals: "Signale",
    blocked: "blocked",
    review: "review",
    next: "nächster Schritt",
    missing: "fehlend",
    operator: "Operator",
    boundary: "Grenze",
  },
  en: {
    eyebrow: "contract lens",
    title: "Contracts get their own route, not the short Lens mix.",
    body: "Contract Lens prepares owner, proxy, mint, pause, blacklist, tax and source verification as review-ready signals. Until the analyzer exists, everything stays preview/manual review.",
    signals: "signals",
    blocked: "blocked",
    review: "review",
    next: "next step",
    missing: "missing",
    operator: "operator",
    boundary: "boundary",
  },
} as const;

function resolveLocale(locale: string): Locale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

function toneClass(tone: string) {
  if (tone === "calm") return "clp-tone-calm";
  if (tone === "blocked") return "clp-tone-blocked";
  if (tone === "elevated") return "clp-tone-elevated";
  return "clp-tone-review";
}

export default function ContractLensPanel({ locale }: { locale: string }) {
  const c = copy[resolveLocale(locale)];
  const preview = createContractLensPreview({ symbol: "TOKEN" });
  const summary = getContractLensReadinessSummary();

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-12">
      <div className="clp-shell">
        <div className="grid gap-8 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.065] px-3 py-1.5 text-velmere-gold">
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em]">{c.eyebrow}</span>
            </div>
            <h2 className="mt-5 font-serif text-4xl leading-none tracking-[-0.045em] text-white md:text-6xl">{c.title}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/[0.58]">{c.body}</p>

            <div className="mt-7 grid grid-cols-3 gap-3">
              <div className="clp-stat"><p>{c.signals}</p><strong>{summary.signalCount}</strong></div>
              <div className="clp-stat"><p>{c.blocked}</p><strong>{summary.blocked}</strong></div>
              <div className="clp-stat"><p>{c.review}</p><strong>{summary.review}</strong></div>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-red-300/[0.14] bg-red-500/[0.045] p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-red-100/[0.62]">{c.next}</p>
              <p className="mt-2 text-xs leading-6 text-red-100/[0.76]">{summary.nextCriticalStep}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {preview.signals.map((signal) => (
              <article key={signal.id} className="clp-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {signal.tone === "blocked" ? <ShieldAlert className="h-4 w-4 text-velmere-gold" aria-hidden="true" /> : <FileSearch className="h-4 w-4 text-velmere-gold" aria-hidden="true" />}
                      <span className={`clp-tone ${toneClass(signal.tone)}`}>{signal.tone}</span>
                      <span className="clp-mode">{signal.sourceMode.replace("_", " ")}</span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-white/[0.88]">{signal.label}</h3>
                    <p className="mt-2 text-xs leading-6 text-white/[0.56]">{signal.whyItMatters}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-2xl text-velmere-gold">{signal.score}</p>
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.30]">score</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">{c.missing}</p>
                    <p className="mt-2 text-[11px] leading-5 text-white/[0.52]">{signal.missingData.join(" · ")}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">{c.operator}</p>
                    <p className="mt-2 text-[11px] leading-5 text-white/[0.52]">{signal.nextOperatorStep}</p>
                  </div>
                </div>
              </article>
            ))}

            <p className="rounded-[1.1rem] border border-white/[0.08] bg-black/[0.24] p-4 text-xs leading-6 text-white/[0.48]">
              {c.boundary}: {preview.productionBoundary}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
