import { Archive, Clock3, DatabaseZap, ShieldAlert } from "lucide-react";
import {
  createDemoSourceSnapshotBundle,
  summarizeSourceSnapshotBundle,
} from "@/lib/market-integrity/source-adapter-runtime";

type Locale = "pl" | "de" | "en";

const copy = {
  pl: {
    eyebrow: "source snapshot ledger",
    title: "Każdy wynik Shield powinien mieć snapshot źródeł.",
    body: "To nie jest jeszcze zapis do bazy. To preview pokazuje, jak będą wyglądały redagowane snapshoty źródeł: lane, adapter, TTL, stale time, payload allowlist i jasna granica produkcji.",
    live: "partial/live",
    blocked: "missing/blocked",
    expired: "expired",
    next: "następny adapter",
    cache: "cache",
    ttl: "TTL",
    stale: "stale",
    boundary: "granica",
  },
  de: {
    eyebrow: "source snapshot ledger",
    title: "Jedes Shield-Ergebnis braucht einen Source Snapshot.",
    body: "Das ist noch kein Datenbank-Write. Dieses Preview zeigt redigierte Source Snapshots: Lane, Adapter, TTL, Stale Time, Payload-Allowlist und klare Produktionsgrenze.",
    live: "partial/live",
    blocked: "missing/blocked",
    expired: "expired",
    next: "nächster Adapter",
    cache: "cache",
    ttl: "TTL",
    stale: "stale",
    boundary: "Grenze",
  },
  en: {
    eyebrow: "source snapshot ledger",
    title: "Every Shield result should carry a source snapshot.",
    body: "This is not a database write yet. The preview shows redacted source snapshots: lane, adapter, TTL, stale time, payload allowlist and a clear production boundary.",
    live: "partial/live",
    blocked: "missing/blocked",
    expired: "expired",
    next: "next adapter",
    cache: "cache",
    ttl: "TTL",
    stale: "stale",
    boundary: "boundary",
  },
} as const;

function resolveLocale(locale: string): Locale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

function modeClass(mode: string) {
  if (mode === "live") return "sslp-mode-live";
  if (mode === "partial") return "sslp-mode-partial";
  if (mode === "fallback") return "sslp-mode-fallback";
  return "sslp-mode-blocked";
}

function shortIso(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

export default function SourceSnapshotLedgerPanel({ locale }: { locale: string }) {
  const c = copy[resolveLocale(locale)];
  const bundle = createDemoSourceSnapshotBundle();
  const summary = summarizeSourceSnapshotBundle(bundle);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-12">
      <div className="sslp-shell">
        <div className="grid gap-8 xl:grid-cols-[0.80fr_1.20fr] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.065] px-3 py-1.5 text-velmere-gold">
              <Archive className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em]">{c.eyebrow}</span>
            </div>
            <h2 className="mt-5 font-serif text-4xl leading-none tracking-[-0.045em] text-white md:text-6xl">{c.title}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/[0.58]">{c.body}</p>
            <div className="mt-7 grid grid-cols-3 gap-3">
              <div className="sslp-stat"><p>{c.live}</p><strong>{summary.freshOrPartial}</strong></div>
              <div className="sslp-stat"><p>{c.blocked}</p><strong>{summary.blockedOrMissing}</strong></div>
              <div className="sslp-stat"><p>{c.expired}</p><strong>{summary.expired}</strong></div>
            </div>
            <div className="mt-5 rounded-[1.25rem] border border-red-300/[0.14] bg-red-500/[0.045] p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-red-100/[0.62]">{c.next}</p>
              <p className="mt-2 text-xs leading-6 text-red-100/[0.76]">{summary.nextCriticalStep}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {bundle.snapshots.map((snapshot) => (
              <article key={`${snapshot.lane}-${snapshot.adapterId}`} className="sslp-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {snapshot.mode === "missing" || snapshot.mode === "blocked" ? (
                        <ShieldAlert className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
                      ) : snapshot.cacheDecision === "expired" ? (
                        <Clock3 className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
                      ) : (
                        <DatabaseZap className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
                      )}
                      <span className="sslp-lane">{snapshot.lane}</span>
                      <span className={`sslp-mode ${modeClass(snapshot.mode)}`}>{snapshot.mode}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white/[0.88]">{snapshot.adapterId}</h3>
                    <p className="mt-2 font-mono text-[10px] leading-5 text-white/[0.42]">
                      {c.cache}: {snapshot.cacheDecision} · {c.ttl}: {shortIso(snapshot.expiresAt)} · {c.stale}: {shortIso(snapshot.staleAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/[0.36]">{snapshot.storageWritePerformed ? "stored" : "preview"}</p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-velmere-gold">{snapshot.ttlSeconds}s TTL</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                  <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">redacted payload</p>
                  <p className="mt-2 break-words font-mono text-[10px] leading-5 text-white/[0.50]">{JSON.stringify(snapshot.redactedPayload)}</p>
                </div>

                <p className="mt-3 text-[11px] leading-5 text-white/[0.42]">{c.boundary}: {snapshot.productionBoundary}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
