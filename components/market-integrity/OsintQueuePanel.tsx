import { ClipboardCheck, Network, ShieldAlert } from "lucide-react";
import {
  getOsintQueueSummary,
  osintQueueItems,
} from "@/lib/market-integrity/osint-queue-contract";

type Locale = "pl" | "de" | "en";

const copy = {
  pl: {
    eyebrow: "osint queue",
    title: "Social, KOL i newsy idą do kolejki review, nie do werdyktu.",
    body: "OSINT Queue trzyma źródła, timestampy, safe paraphrase i reviewer note. Dzięki temu Lens może kierować social/news do ręcznej kontroli bez niebezpiecznych claimów.",
    total: "items",
    manual: "manual",
    blocked: "blocked",
    needs: "needs source",
    next: "następny krok",
    sources: "source requirements",
    safe: "safe wording",
    operator: "operator",
  },
  de: {
    eyebrow: "osint queue",
    title: "Social, KOL und News gehen in Review Queue, nicht in Befund.",
    body: "OSINT Queue hält Quellen, Timestamps, sichere Paraphrase und Reviewer Note. So kann Lens Social/News in manuelle Prüfung routen, ohne gefährliche Claims.",
    total: "items",
    manual: "manual",
    blocked: "blocked",
    needs: "needs source",
    next: "nächster Schritt",
    sources: "source requirements",
    safe: "safe wording",
    operator: "Operator",
  },
  en: {
    eyebrow: "osint queue",
    title: "Social, KOL and news go into review queue, not verdict.",
    body: "OSINT Queue holds sources, timestamps, safe paraphrase and reviewer note. This lets Lens route social/news into manual review without unsafe claims.",
    total: "items",
    manual: "manual",
    blocked: "blocked",
    needs: "needs source",
    next: "next step",
    sources: "source requirements",
    safe: "safe wording",
    operator: "operator",
  },
} as const;

function resolveLocale(locale: string): Locale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

function statusClass(status: string) {
  if (status === "blocked") return "oqp-status-blocked";
  if (status === "manual_review") return "oqp-status-manual";
  if (status === "needs_source") return "oqp-status-needs";
  return "oqp-status-queued";
}

export default function OsintQueuePanel({ locale }: { locale: string }) {
  const c = copy[resolveLocale(locale)];
  const summary = getOsintQueueSummary();

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-12">
      <div className="oqp-shell">
        <div className="grid gap-8 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.065] px-3 py-1.5 text-velmere-gold">
              <Network className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em]">{c.eyebrow}</span>
            </div>
            <h2 className="mt-5 font-serif text-4xl leading-none tracking-[-0.045em] text-white md:text-6xl">{c.title}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/[0.58]">{c.body}</p>

            <div className="mt-7 grid grid-cols-4 gap-3">
              <div className="oqp-stat"><p>{c.total}</p><strong>{summary.total}</strong></div>
              <div className="oqp-stat"><p>{c.manual}</p><strong>{summary.manualReview}</strong></div>
              <div className="oqp-stat"><p>{c.blocked}</p><strong>{summary.blocked}</strong></div>
              <div className="oqp-stat"><p>{c.needs}</p><strong>{summary.needsSource}</strong></div>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-red-300/[0.14] bg-red-500/[0.045] p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-red-100/[0.62]">{c.next}</p>
              <p className="mt-2 text-xs leading-6 text-red-100/[0.76]">{summary.nextCriticalStep}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {osintQueueItems.map((item) => (
              <article key={item.id} className="oqp-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.status === "blocked" ? <ShieldAlert className="h-4 w-4 text-velmere-gold" aria-hidden="true" /> : <ClipboardCheck className="h-4 w-4 text-velmere-gold" aria-hidden="true" />}
                      <span className="oqp-priority">{item.priority}</span>
                      <span className={`oqp-status ${statusClass(item.status)}`}>{item.status.replace("_", " ")}</span>
                      <span className="oqp-kind">{item.kind.replace("_", " ")}</span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-white/[0.88]">{item.title}</h3>
                    <p className="mt-2 text-xs leading-6 text-white/[0.56]">{item.capsule}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">{c.sources}</p>
                    <p className="mt-2 text-[11px] leading-5 text-white/[0.52]">{item.sourceRequirements.join(" · ")}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">{c.safe}</p>
                    <p className="mt-2 text-[11px] leading-5 text-white/[0.52]">{item.safeWording}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">{c.operator}</p>
                    <p className="mt-2 text-[11px] leading-5 text-white/[0.52]">{item.nextOperatorStep}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
