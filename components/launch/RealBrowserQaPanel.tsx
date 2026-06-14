import { Gauge, MonitorSmartphone, ShieldCheck } from "lucide-react";

type Locale = "pl" | "de" | "en";

const copy = {
  pl: {
    eyebrow: "real browser QA lane",
    title: "Ostatni procent VLM Brain musi być sprawdzony w prawdziwej przeglądarce.",
    body: "Guardy pilnują builda, ale nie mierzą GPU, scrolla, overlapu i realnego FPS. Ten panel trzyma checklistę testów, które trzeba odklikać po deployu na Vercel.",
    pass: "manual QA",
    next: "następny test",
    items: [
      ["Orbit Basic", "Basic Analysis startuje w Orbit 360, bez ciężkiego canvas i bez debug copy."],
      ["Orbit Pro", "Pro Review startuje w Orbit 360, kafelki są klikalne i drawer zamyka się kliknięciem obok."],
      ["Orbit Advanced", "Advanced nadal daje premium orbit 360, wolny obrót i aktywny kafelek na froncie."],
      ["Evidence Board", "Board ma sparse/focused/full density i nie pokazuje drugiego VLM core."],
      ["Mobile overlap", "Na wąskim ekranie kafelki nie zasłaniają topbar/back/drawera."],
      ["Reduced motion", "Przy prefers-reduced-motion UI nie wymusza agresywnej animacji."],
    ],
  },
  de: {
    eyebrow: "real browser QA lane",
    title: "Der letzte Prozentpunkt des VLM Brain braucht echte Browser-Tests.",
    body: "Guards schützen den Build, messen aber nicht GPU, Scroll, Overlap und echte FPS. Dieses Panel hält die Tests, die nach Vercel Deployment manuell geprüft werden müssen.",
    pass: "manual QA",
    next: "nächster Test",
    items: [
      ["Orbit Basic", "Basic Analysis startet in Orbit 360, ohne schweres Canvas und ohne Debug Copy."],
      ["Orbit Pro", "Pro Review startet in Orbit 360, Kacheln sind klickbar und Drawer schließt per Outside Click."],
      ["Orbit Advanced", "Advanced bleibt Premium Orbit 360, langsame Rotation und aktive Kachel vorne."],
      ["Evidence Board", "Board nutzt sparse/focused/full density und zeigt keinen zweiten VLM Core."],
      ["Mobile overlap", "Auf schmalem Screen blockieren Kacheln nicht Topbar, Back Button oder Drawer."],
      ["Reduced motion", "Bei prefers-reduced-motion erzwingt UI keine aggressive Animation."],
    ],
  },
  en: {
    eyebrow: "real browser QA lane",
    title: "The final VLM Brain percent must be tested in a real browser.",
    body: "Guards protect the build, but they do not measure GPU, scroll, overlap or real FPS. This panel keeps the manual checks that must be done after Vercel deploy.",
    pass: "manual QA",
    next: "next test",
    items: [
      ["Orbit Basic", "Basic Analysis starts in Orbit 360, without heavy canvas or debug copy."],
      ["Orbit Pro", "Pro Review starts in Orbit 360, cards are clickable and drawer closes on outside click."],
      ["Orbit Advanced", "Advanced keeps premium Orbit 360, slow rotation and active card front focus."],
      ["Evidence Board", "Board uses sparse/focused/full density and does not show a second VLM core."],
      ["Mobile overlap", "On narrow screens cards do not block topbar, back button or drawer."],
      ["Reduced motion", "With prefers-reduced-motion the UI does not force aggressive animation."],
    ],
  },
} as const;

function resolveLocale(locale: string): Locale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

export default function RealBrowserQaPanel({ locale }: { locale: string }) {
  const c = copy[resolveLocale(locale)];

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-12">
      <div className="rbqa-shell">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.065] px-3 py-1.5 text-velmere-gold">
              <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em]">{c.eyebrow}</span>
            </div>
            <h2 className="mt-5 font-serif text-4xl leading-none tracking-[-0.045em] text-white md:text-6xl">{c.title}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/[0.58]">{c.body}</p>
            <div className="mt-6 rounded-[1.25rem] border border-cyan-200/[0.12] bg-cyan-300/[0.035] p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-100/[0.58]">{c.next}</p>
              <p className="mt-2 text-xs leading-6 text-cyan-100/[0.72]">Deploy PASS173 → test Chrome desktop → test mobile viewport → test reduced motion → collect Vercel runtime errors.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {c.items.map(([title, body], index) => {
              const Icon = index < 3 ? ShieldCheck : MonitorSmartphone;
              return (
                <article key={title} className="rbqa-card">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-black/[0.24] text-velmere-gold">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.34]">{c.pass}</p>
                      <h3 className="mt-1 text-sm font-semibold text-white/[0.88]">{title}</h3>
                      <p className="mt-2 text-xs leading-6 text-white/[0.56]">{body}</p>
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
