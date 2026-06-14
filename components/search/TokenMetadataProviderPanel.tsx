import { Database, Image as ImageIcon, ServerCog, ShieldAlert } from "lucide-react";
import {
  getTokenMetadataProviderSummary,
  tokenMetadataProviders,
} from "@/lib/search/token-metadata-cache";

type Locale = "pl" | "de" | "en";

const copy = {
  pl: {
    eyebrow: "token metadata cache",
    title: "Logo, symbol i rank muszą iść przez kontrolowany cache.",
    body: "To jest warstwa pod token metadata: fallback avatar, provider status, cache policy i bezpieczna granica. Search ma wyglądać premium, ale nie może ładować losowych rzeczy bez kontroli.",
    active: "active",
    planned: "planned",
    blocked: "blocked",
    indexed: "indexed",
    missing: "brakuje",
    next: "następny krok",
    boundary: "granica",
  },
  de: {
    eyebrow: "token metadata cache",
    title: "Logo, Symbol und Rank brauchen kontrollierten Cache.",
    body: "Das ist die Schicht für Token Metadata: Fallback Avatar, Provider Status, Cache Policy und klare Sicherheitsgrenze. Search soll premium wirken, aber nichts unkontrolliert laden.",
    active: "active",
    planned: "planned",
    blocked: "blocked",
    indexed: "indexed",
    missing: "fehlend",
    next: "nächster Schritt",
    boundary: "Grenze",
  },
  en: {
    eyebrow: "token metadata cache",
    title: "Logo, symbol and rank must go through controlled cache.",
    body: "This is the token metadata layer: fallback avatar, provider status, cache policy and a clear safety boundary. Search should feel premium without loading random uncontrolled assets.",
    active: "active",
    planned: "planned",
    blocked: "blocked",
    indexed: "indexed",
    missing: "missing",
    next: "next step",
    boundary: "boundary",
  },
} as const;

function resolveLocale(locale: string): Locale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

function providerTone(status: string) {
  if (status === "active_preview") return "tmp-status-active";
  if (status === "planned") return "tmp-status-planned";
  return "tmp-status-blocked";
}

function providerIcon(status: string) {
  if (status === "active_preview") return Database;
  if (status === "planned") return ServerCog;
  return ShieldAlert;
}

export default function TokenMetadataProviderPanel({ locale }: { locale: string }) {
  const c = copy[resolveLocale(locale)];
  const summary = getTokenMetadataProviderSummary();

  return (
    <section className="tmp-shell" aria-label={c.eyebrow}>
      <div className="grid gap-7 xl:grid-cols-[0.82fr_1.18fr] xl:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.065] px-3 py-1.5 text-velmere-gold">
            <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em]">{c.eyebrow}</span>
          </div>
          <h2 className="mt-5 font-serif text-3xl leading-none tracking-[-0.045em] text-white md:text-5xl">{c.title}</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/[0.58]">{c.body}</p>
          <div className="mt-7 grid grid-cols-4 gap-3">
            <div className="tmp-stat"><p>{c.active}</p><strong>{summary.active}</strong></div>
            <div className="tmp-stat"><p>{c.planned}</p><strong>{summary.planned}</strong></div>
            <div className="tmp-stat"><p>{c.blocked}</p><strong>{summary.blocked}</strong></div>
            <div className="tmp-stat"><p>{c.indexed}</p><strong>{summary.indexedRecords}</strong></div>
          </div>
          <div className="mt-5 rounded-[1.25rem] border border-cyan-200/[0.12] bg-cyan-300/[0.035] p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-100/[0.56]">{c.next}</p>
            <p className="mt-2 text-xs leading-6 text-cyan-100/[0.70]">{summary.nextCriticalStep}</p>
          </div>
        </div>

        <div className="grid gap-3">
          {tokenMetadataProviders.map((provider) => {
            const Icon = providerIcon(provider.status);
            return (
              <article key={provider.id} className="tmp-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
                      <span className="tmp-priority">{provider.priority}</span>
                      <span className={`tmp-status ${providerTone(provider.status)}`}>{provider.status.replace("_", " ")}</span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-white/[0.88]">{provider.label}</h3>
                    <p className="mt-2 text-xs leading-6 text-white/[0.56]">{provider.purpose}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">{c.missing}</p>
                    <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-white/[0.52]">
                      {provider.missing.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">{c.boundary}</p>
                    <p className="mt-2 text-[11px] leading-5 text-white/[0.52]">{provider.productionBoundary}</p>
                    <p className="mt-2 text-[11px] leading-5 text-velmere-gold/[0.66]">{provider.cachePolicy}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
