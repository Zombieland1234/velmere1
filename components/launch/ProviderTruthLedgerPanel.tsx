"use client";

import { providerTruthLedger, getProviderTruthLedgerSummary } from "@/lib/launch/provider-truth-ledger";

type Props = {
  locale: string;
  surface: "shop" | "product" | "admin" | "checkout";
};

const copy = {
  pl: {
    eyebrow: "provider truth ledger",
    title: "Provider, SKU i dostawa muszą mieć dowód.",
    body: "Ten ledger pilnuje, żeby produkt nie przeszedł do checkoutu tylko dlatego, że wygląda dobrze. Każdy provider musi mieć SKU, warianty, regiony dostawy, czas produkcji i zasady zwrotu.",
    average: "średni postęp",
    blocked: "blokery",
    review: "review",
    next: "następny krok",
    evidence: "dowody",
    blockers: "braki",
  },
  de: {
    eyebrow: "provider truth ledger",
    title: "Provider, SKU und Versand brauchen Nachweise.",
    body: "Dieses Ledger verhindert, dass ein Produkt nur wegen gutem Design in den Checkout geht. Jeder Provider braucht SKU, Varianten, Lieferregionen, Produktionszeit und Rückgaberegeln.",
    average: "Durchschnitt",
    blocked: "Blocker",
    review: "Review",
    next: "nächster Schritt",
    evidence: "Nachweise",
    blockers: "fehlend",
  },
  en: {
    eyebrow: "provider truth ledger",
    title: "Provider, SKU and shipping need proof.",
    body: "This ledger prevents products from reaching checkout just because they look ready. Every provider needs SKU, variants, delivery regions, production timing and return rules.",
    average: "average progress",
    blocked: "blocked",
    review: "review",
    next: "next step",
    evidence: "evidence",
    blockers: "missing",
  },
} as const;

function localeCopy(locale: string) {
  if (locale === "pl" || locale === "de") return copy[locale];
  return copy.en;
}

function tone(status: string) {
  if (status === "blocked") return "border-red-400/20 bg-red-500/[0.045] text-red-100/75";
  if (status === "manual_review") return "border-velmere-gold/25 bg-velmere-gold/[0.055] text-velmere-gold";
  if (status === "ready") return "border-emerald-300/20 bg-emerald-400/[0.045] text-emerald-100/70";
  return "border-cyan-300/18 bg-cyan-400/[0.035] text-cyan-100/65";
}

export default function ProviderTruthLedgerPanel({ locale, surface }: Props) {
  const t = localeCopy(locale);
  const summary = getProviderTruthLedgerSummary();
  const visible = providerTruthLedger.filter((entry) => {
    if (surface === "product") return ["all-skus", "printful", "manual-products"].includes(entry.id);
    if (surface === "admin") return ["printful", "tapstitch", "contrado", "all-skus"].includes(entry.id);
    if (surface === "checkout") return entry.requiredBeforeCheckout;
    return ["all-skus", "printful", "tapstitch", "contrado"].includes(entry.id);
  });

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-12">
      <div className="rounded-[2rem] border border-white/[0.10] bg-black/[0.24] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] md:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.45fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-velmere-gold">{t.eyebrow}</p>
            <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-tight tracking-[-0.04em] text-white md:text-5xl">{t.title}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/[0.58]">{t.body}</p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.36]">{t.average}</p>
                <p className="mt-2 font-mono text-xl text-white">{summary.averageProgress}%</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.36]">{t.blocked}</p>
                <p className="mt-2 font-mono text-xl text-white">{summary.blockedCount}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.36]">{t.review}</p>
                <p className="mt-2 font-mono text-xl text-white">{summary.reviewCount}</p>
              </div>
            </div>
            <p className="mt-5 rounded-2xl border border-velmere-gold/[0.16] bg-velmere-gold/[0.055] p-4 text-xs leading-6 text-velmere-gold/[0.82]">
              {t.next}: {summary.nextCriticalStep}
            </p>
          </div>

          <div className="grid gap-3">
            {visible.map((entry) => (
              <article key={entry.id} className="rounded-[1.35rem] border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.34]">{entry.provider} · {entry.sourceMode}</p>
                    <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{entry.label}</h3>
                  </div>
                  <span className={`rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] ${tone(entry.status)}`}>
                    {entry.status.replaceAll("_", " ")} · {entry.progress}%
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.06] bg-black/[0.18] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-velmere-gold/[0.72]">{t.evidence}</p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.56]">{entry.evidence.join(" · ")}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-black/[0.18] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-velmere-gold/[0.72]">{t.blockers}</p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.56]">{entry.blockers.join(" · ")}</p>
                  </div>
                </div>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.34]">{entry.nextStep}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
