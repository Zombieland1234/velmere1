"use client";

import { buildOperatorLaunchGateMatrix, getOperatorLaunchGateSummary } from "@/lib/launch/operator-launch-gate-matrix";

type Props = {
  locale: string;
  surface: "admin" | "ops";
};

const copy = {
  pl: {
    eyebrow: "operator launch gates",
    title: "To jest główny panel blokad produkcyjnych dla admina i audytu.",
    body: "Pokazuje, co jeszcze blokuje realny start: operator identity, environment gate, server audit write, persistent ledger, idempotency i redacted source snapshots.",
    average: "średni postęp",
    p0: "P0 blokady",
    blocked: "blocked",
    next: "następny krytyczny krok",
    promise: "cel",
    blocker: "blokuje",
    step: "następny krok",
  },
  de: {
    eyebrow: "operator launch gates",
    title: "Das ist das zentrale Produktions-Gate für Admin und Audit.",
    body: "Es zeigt, was den echten Start noch blockiert: Operator Identity, Environment Gate, Server Audit Write, Persistent Ledger, Idempotency und redacted Source Snapshots.",
    average: "Durchschnitt",
    p0: "P0 Blocker",
    blocked: "blocked",
    next: "nächster kritischer Schritt",
    promise: "Ziel",
    blocker: "Blocker",
    step: "nächster Schritt",
  },
  en: {
    eyebrow: "operator launch gates",
    title: "This is the main production gate panel for admin and audit.",
    body: "It shows what still blocks real launch: operator identity, environment gate, server audit write, persistent ledger, idempotency and redacted source snapshots.",
    average: "average progress",
    p0: "P0 blockers",
    blocked: "blocked",
    next: "next critical step",
    promise: "goal",
    blocker: "blocking",
    step: "next step",
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

function priorityTone(priority: string) {
  if (priority === "P0") return "border-red-400/20 bg-red-500/[0.050] text-red-100/78";
  if (priority === "P1") return "border-velmere-gold/25 bg-velmere-gold/[0.055] text-velmere-gold";
  return "border-white/[0.10] bg-white/[0.035] text-white/[0.50]";
}

export default function OperatorLaunchGateMatrixPanel({ locale, surface }: Props) {
  const t = localeCopy(locale);
  const matrix = buildOperatorLaunchGateMatrix();
  const summary = getOperatorLaunchGateSummary();
  const visibleItems = surface === "admin" ? matrix : matrix.filter((item) => item.priority === "P0" || item.surface === "audit");

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-12">
      <div className="overflow-hidden rounded-[2rem] border border-red-300/[0.14] bg-[radial-gradient(circle_at_10%_0%,rgba(255,77,109,0.08),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(200,169,106,0.10),transparent_30%),rgba(255,255,255,0.024)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] md:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.45fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-100/[0.72]">{t.eyebrow}</p>
            <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-tight tracking-[-0.04em] text-white md:text-5xl">{t.title}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/[0.58]">{t.body}</p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-black/[0.24] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.36]">{t.average}</p>
                <p className="mt-2 font-mono text-xl text-white">{summary.averageProgress}%</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/[0.24] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.36]">{t.p0}</p>
                <p className="mt-2 font-mono text-xl text-white">{summary.p0Blocked}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/[0.24] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.36]">{t.blocked}</p>
                <p className="mt-2 font-mono text-xl text-white">{summary.blocked}</p>
              </div>
            </div>
            <p className="mt-5 rounded-2xl border border-red-300/[0.16] bg-red-500/[0.045] p-4 text-xs leading-6 text-red-100/[0.72]">
              {t.next}: {summary.nextCriticalStep}
            </p>
          </div>

          <div className="grid gap-3">
            {visibleItems.map((item) => (
              <article key={item.id} className="rounded-[1.35rem] border border-white/[0.08] bg-black/[0.22] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] ${priorityTone(item.priority)}`}>{item.priority}</span>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.42]">{item.surface}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-white">{item.label}</h3>
                  </div>
                  <span className={`rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] ${tone(item.status)}`}>
                    {item.status.replaceAll("_", " ")} · {item.progress}%
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 md:col-span-1">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-velmere-gold/[0.72]">{t.promise}</p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.56]">{item.promise}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 md:col-span-1">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-red-100/[0.62]">{t.blocker}</p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.56]">{item.blocker}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 md:col-span-1">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-cyan-100/[0.60]">{t.step}</p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.56]">{item.nextStep}</p>
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
