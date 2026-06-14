"use client";

import { getShippingReturnsTruthSummary, shippingReturnsTruthMatrix } from "@/lib/launch/shipping-returns-truth";

type Props = {
  locale: string;
  surface: "checkout" | "product" | "legal" | "shop";
};

const copy = {
  pl: {
    eyebrow: "shipping / returns truth",
    title: "Dostawa i zwroty muszą być jasne przed płatnością.",
    body: "Ta warstwa pilnuje regionów dostawy, kosztów, prawa zwrotu, refundów i wyjątków providerów. Checkout zostaje zablokowany, dopóki te elementy nie mają źródła.",
    average: "średni postęp",
    blocked: "blokery",
    review: "review",
    next: "następny krok",
    promise: "co ma widzieć klient",
    boundary: "granica bezpieczeństwa",
    blockers: "braki",
  },
  de: {
    eyebrow: "shipping / returns truth",
    title: "Versand und Rückgabe müssen vor Zahlung klar sein.",
    body: "Diese Ebene prüft Lieferregionen, Kosten, Rückgaberechte, Erstattungen und Provider-Ausnahmen. Checkout bleibt gesperrt, bis diese Punkte quellenbasiert sind.",
    average: "Durchschnitt",
    blocked: "Blocker",
    review: "Review",
    next: "nächster Schritt",
    promise: "Kundenversprechen",
    boundary: "Sicherheitsgrenze",
    blockers: "fehlend",
  },
  en: {
    eyebrow: "shipping / returns truth",
    title: "Shipping and returns must be clear before payment.",
    body: "This layer tracks delivery regions, costs, return rights, refunds and provider exceptions. Checkout stays blocked until these items are source-confirmed.",
    average: "average progress",
    blocked: "blocked",
    review: "review",
    next: "next step",
    promise: "customer promise",
    boundary: "safety boundary",
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

export default function ShippingReturnsTruthPanel({ locale, surface }: Props) {
  const t = localeCopy(locale);
  const summary = getShippingReturnsTruthSummary();
  const visibleItems = shippingReturnsTruthMatrix.filter((item) => {
    if (surface === "checkout") return item.requiredBeforeCheckout;
    if (surface === "product") return ["shipping-regions", "return-rights", "provider-exceptions"].includes(item.id);
    if (surface === "legal") return ["shipping-regions", "return-rights", "refund-flow", "provider-exceptions"].includes(item.id);
    return ["shipping-regions", "shipping-costs", "return-rights"].includes(item.id);
  });

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-12">
      <div className="rounded-[2rem] border border-white/[0.10] bg-white/[0.025] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.32)] md:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.45fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-velmere-gold">{t.eyebrow}</p>
            <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-tight tracking-[-0.04em] text-white md:text-5xl">{t.title}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/[0.58]">{t.body}</p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-black/[0.22] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.36]">{t.average}</p>
                <p className="mt-2 font-mono text-xl text-white">{summary.averageProgress}%</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/[0.22] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.36]">{t.blocked}</p>
                <p className="mt-2 font-mono text-xl text-white">{summary.blockedCount}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/[0.22] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.36]">{t.review}</p>
                <p className="mt-2 font-mono text-xl text-white">{summary.reviewCount}</p>
              </div>
            </div>
            <p className="mt-5 rounded-2xl border border-velmere-gold/[0.16] bg-velmere-gold/[0.055] p-4 text-xs leading-6 text-velmere-gold/[0.82]">
              {t.next}: {summary.nextCriticalStep}
            </p>
          </div>

          <div className="grid gap-3">
            {visibleItems.map((item) => (
              <article key={item.id} className="rounded-[1.35rem] border border-white/[0.08] bg-black/[0.22] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.34]">{item.route} · {item.sourceMode}</p>
                    <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{item.label}</h3>
                  </div>
                  <span className={`rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] ${tone(item.status)}`}>
                    {item.status.replaceAll("_", " ")} · {item.progress}%
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-velmere-gold/[0.72]">{t.promise}</p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.56]">{item.customerPromise}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-velmere-gold/[0.72]">{t.boundary}</p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.56]">{item.safetyBoundary}</p>
                  </div>
                </div>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.34]">
                  {t.blockers}: {item.blockers.join(" · ")}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
