import { AlertTriangle, CheckCircle2, ListChecks, RadioTower, ShieldAlert } from "lucide-react";
import { buildSecurityOperationsChecklistSnapshot } from "@/lib/security/security-operations-checklist";

type Locale = "pl" | "de" | "en";

const copy = {
  pl: {
    eyebrow: "security operations",
    title: "Co trzeba ustawić w Vercel, zanim security uznamy za produkcyjne.",
    body: "To nie jest marketingowa obietnica. To operator checklist: env, WAF, runtime QA i release gate.",
    progress: "progress",
    manual: "manual",
    blocked: "blocked",
    waf: "WAF drafts",
    validation: "validation",
    blocker: "blocker",
    steps: "Vercel steps",
  },
  de: {
    eyebrow: "security operations",
    title: "Was in Vercel gesetzt werden muss, bevor Security produktionsreif ist.",
    body: "Das ist kein Marketingversprechen. Das ist eine Operator Checklist: Env, WAF, Runtime QA und Release Gate.",
    progress: "progress",
    manual: "manual",
    blocked: "blocked",
    waf: "WAF drafts",
    validation: "validation",
    blocker: "blocker",
    steps: "Vercel steps",
  },
  en: {
    eyebrow: "security operations",
    title: "What must be configured in Vercel before security is production-ready.",
    body: "This is not a marketing promise. It is an operator checklist: env, WAF, runtime QA and release gate.",
    progress: "progress",
    manual: "manual",
    blocked: "blocked",
    waf: "WAF drafts",
    validation: "validation",
    blocker: "blocker",
    steps: "Vercel steps",
  },
} as const;

function resolveLocale(locale: string): Locale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

function statusClass(status: string) {
  if (status === "ready") return "vso-status-ready";
  if (status === "blocked") return "vso-status-blocked";
  if (status === "manual") return "vso-status-manual";
  return "vso-status-partial";
}

export default function SecurityOperationsChecklistPanel({ locale }: { locale: string }) {
  const c = copy[resolveLocale(locale)];
  const snapshot = buildSecurityOperationsChecklistSnapshot();

  return (
    <section className="mt-8 vso-shell">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.065] px-3 py-1.5 text-velmere-gold">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em]">{c.eyebrow}</span>
          </div>
          <h2 className="mt-4 font-serif text-4xl leading-none tracking-[-0.045em] md:text-5xl">{c.title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/[0.58]">{c.body}</p>
        </div>
        <div className="grid min-w-[17rem] grid-cols-3 gap-3">
          <div className="vso-stat"><p>{c.progress}</p><strong>{snapshot.averageProgress}%</strong></div>
          <div className="vso-stat"><p>{c.manual}</p><strong>{snapshot.manual}</strong></div>
          <div className="vso-stat"><p>{c.blocked}</p><strong>{snapshot.blocked}</strong></div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {snapshot.items.map((item) => (
          <article key={item.id} className="vso-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {item.status === "ready" ? <CheckCircle2 className="h-4 w-4 text-velmere-gold" aria-hidden="true" /> : <ShieldAlert className="h-4 w-4 text-velmere-gold" aria-hidden="true" />}
                  <span className={`vso-status ${statusClass(item.status)}`}>{item.status}</span>
                  <span className="vso-status">{item.phase.replace("_", " ")}</span>
                  <span className="vso-status">{item.progress}%</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-white/[0.90]">{item.title}</h3>
                <p className="mt-2 text-xs leading-6 text-white/[0.56]">{item.purpose}</p>
              </div>
            </div>

            {item.envKeys?.length ? (
              <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">env</p>
                <p className="mt-2 text-[11px] leading-5 text-white/[0.52]">{item.envKeys.join(" · ")}</p>
              </div>
            ) : null}

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">{c.steps}</p>
                <p className="mt-2 text-[11px] leading-5 text-white/[0.52]">{item.vercelSteps.join(" · ")}</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-black/[0.22] p-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">{c.validation}</p>
                <p className="mt-2 text-[11px] leading-5 text-white/[0.52]">{item.validation.join(" · ")}</p>
              </div>
            </div>

            <p className="mt-3 rounded-xl border border-red-300/[0.12] bg-red-500/[0.035] p-3 text-[11px] leading-5 text-red-100/[0.62]">
              {c.blocker}: {item.blockerIfMissing}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-[1.35rem] border border-cyan-200/[0.12] bg-cyan-300/[0.035] p-4">
        <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-100/[0.62]">
          <RadioTower className="h-3.5 w-3.5" aria-hidden="true" />
          {c.waf}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {snapshot.wafRuleDrafts.map((rule) => (
            <article key={rule.id} className="rounded-xl border border-white/[0.08] bg-black/[0.22] p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-velmere-gold" aria-hidden="true" />
                <span className="vso-status">{rule.action}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white/[0.82]">{rule.id}</h3>
              <p className="mt-2 font-mono text-[10px] leading-5 text-cyan-100/[0.56]">{rule.expression}</p>
              <p className="mt-2 text-[11px] leading-5 text-white/[0.48]">{rule.rationale}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-xs leading-6 text-cyan-100/[0.62]">{snapshot.productionBoundary}</p>
      </div>
    </section>
  );
}
