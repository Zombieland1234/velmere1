import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronDown, FlaskConical, ShieldCheck, Sigma } from "lucide-react";
import { Link } from "@/navigation";
import { buildVelmereMetadata, SUPPORTED_LOCALES } from "@/lib/seo/metadata";

type Locale = "pl" | "de" | "en";

const copy = {
  pl: {
    kicker: "prime lab · kryptografia · research deterministyczny",
    title: "Velmère Research Lab",
    subtitle: "Kryptografia, liczby pierwsze i determinizm informacyjny przedstawione jako testowalny research, nie jako obietnica przełamania zabezpieczeń.",
    badge: "audyt numeryczny · wymaga replikacji",
    back: "Wróć do VLM",
    cards: [
      { label: "Kryptografia", title: "Sekret pozostaje sekretem", body: "Podpis i weryfikacja pozwalają udowodnić kontrolę bez ujawniania prywatnego klucza." },
      { label: "Liczby pierwsze", title: "Mierzalny błąd rekonstrukcji", body: "Badamy resztę funkcji liczącej liczby pierwsze i porównujemy model z klasycznymi baseline'ami." },
      { label: "B. Protocol", title: "Skończona rekonstrukcja numeryczna", body: "Hipoteza jest oceniana przez holdout, przesunięcia parametrów, kontrolę sztucznych zer i niezależną replikację." },
      { label: "Entropia", title: "Deterministyczny model to nie RNG", body: "Źródło klucza wymaga jakościowej losowości. Model matematyczny nie zastępuje fizycznej entropii." },
    ],
    method: "Metoda badawcza",
    steps: [
      ["01", "Baseline", "Porównaj π(x), R(x) i klasyczne przybliżenia przed dodaniem korekty."],
      ["02", "B. Protocol", "Zdefiniuj skończoną korektę, parametry i przewidywany zakres działania."],
      ["03", "Falsification", "Sprawdź holdout, fake zeros, neighbor shift i stabilność poza dobranym oknem."],
      ["04", "Replication", "Udostępnij metodę i wyniki do niezależnego odtworzenia przed mocniejszym claimem."],
    ],
    boundaryTitle: "Granica twierdzenia",
    boundary: "Research Lab może mówić o benchmarku, rekonstrukcji, błędzie i falsyfikacji. Nie twierdzi, że udowodniono hipotezę Riemanna, złamano Bitcoin ani odzyskano prywatne klucze.",
    benchmarkTitle: "Audyt v3.1 · wyniki, które przeszły kontrolę",
    benchmarkIntro: "Liczby poniżej pochodzą z lokalnego raportu B. Protocol, aktualizowanego do testów v59. Najmocniejszy argument dotyczy skończonej rekonstrukcji numerycznej, nie twierdzenia asymptotycznego.",
    metrics: [
      ["v51 holdout", "800 punktów", "zamrożona mapa Adaptive-K"],
      ["Redukcja MAE", "96,734%", "53 871,13 → 1 759,36 względem R(x)"],
      ["Wygrane v51", "795 / 800", "bez dostrajania na zbiorze holdout"],
      ["v40 mixed-sign", "MAE 3,197", "najmocniejszy test dopasowania punktowego"],
    ],
    inverseTitle: "Odwrócona formuła · aktywny tor testowy",
    inverseBody: "Badamy, czy z obserwowanej reszty i stabilnego cutoffu można odtworzyć parametry korekty bez przecieku informacji z holdoutu. Ten tor pozostaje eksperymentalny.",
    inverseTests: [
      "Rozdziel trening skali od testu punktowego.",
      "Porównaj wynik z R(x), Li(x), stałą korektą i gładkim modelem log(x).",
      "Wykonaj neighbor-shift, shuffle wewnątrz okna i kontrolę sztucznych zer.",
      "Zamroź parametry przed nowym zakresem i opublikuj residuale.",
    ],
    caveat: "Ważna obserwacja v59: wąskie okna v51 są lokalnie gładkie, więc potwierdzają głównie zachowanie skali. v40/v49 pozostają mocniejszym testem fazy punktowej.",
  },
  de: {
    kicker: "prime lab · kryptografie · deterministische forschung",
    title: "Velmère Research Lab",
    subtitle: "Kryptografie, Primzahlen und Informationsdeterminismus als testbarer Research, nicht als Versprechen gebrochener Sicherheit.",
    badge: "numerisches Audit · Replikation erforderlich",
    back: "Zurück zu VLM",
    cards: [
      { label: "Kryptografie", title: "Das Secret bleibt geheim", body: "Signatur und Verifikation beweisen Kontrolle, ohne den privaten Schlüssel offenzulegen." },
      { label: "Primzahlen", title: "Messbarer Rekonstruktionsfehler", body: "Wir untersuchen den Residual der Primzahlzählfunktion und vergleichen das Modell mit klassischen Baselines." },
      { label: "B. Protocol", title: "Finite numerische Rekonstruktion", body: "Die Hypothese wird mit Holdout, Parameter-Shifts, Fake-Zeros und unabhängiger Replikation geprüft." },
      { label: "Entropie", title: "Determinismus ist kein RNG", body: "Schlüsselmaterial braucht hochwertige Zufälligkeit. Ein mathematisches Modell ersetzt keine physische Entropie." },
    ],
    method: "Forschungsmethode",
    steps: [
      ["01", "Baseline", "π(x), R(x) und klassische Näherungen vor jeder Korrektur vergleichen."],
      ["02", "B. Protocol", "Finite Korrektur, Parameter und erwarteten Geltungsbereich definieren."],
      ["03", "Falsifikation", "Holdout, Fake-Zeros, Neighbor Shift und Stabilität außerhalb des Fensters testen."],
      ["04", "Replikation", "Methode und Ergebnisse vor stärkeren Claims unabhängig reproduzieren lassen."],
    ],
    boundaryTitle: "Claim-Grenze",
    boundary: "Research Lab darf über Benchmark, Rekonstruktion, Fehler und Falsifikation sprechen. Es behauptet keinen Beweis der Riemann-Hypothese, keinen Bitcoin-Bruch und keine Wiederherstellung privater Schlüssel.",
    benchmarkTitle: "Audit v3.1 · kontrollierte Ergebnisse",
    benchmarkIntro: "Die Werte stammen aus dem lokalen B.-Protocol-Bericht bis Test v59. Die stärkste Aussage betrifft eine finite numerische Rekonstruktion, kein asymptotisches Theorem.",
    metrics: [
      ["v51 Holdout", "800 Punkte", "eingefrorene Adaptive-K-Map"],
      ["MAE-Reduktion", "96,734%", "53.871,13 → 1.759,36 gegenüber R(x)"],
      ["v51 Siege", "795 / 800", "ohne Tuning auf dem Holdout"],
      ["v40 Mixed-Sign", "MAE 3,197", "stärkster punktweiser Alignment-Test"],
    ],
    inverseTitle: "Inverse Formulierung · aktiver Testpfad",
    inverseBody: "Wir testen, ob Korrekturparameter aus Residual und stabilem Cutoff ohne Holdout-Leakage rekonstruiert werden können. Dieser Pfad bleibt experimentell.",
    inverseTests: [
      "Skalen-Training vom punktweisen Test trennen.",
      "Mit R(x), Li(x), konstanter Korrektur und glattem log(x)-Modell vergleichen.",
      "Neighbor-Shift, Window-Shuffle und Fake-Zero-Kontrollen ausführen.",
      "Parameter vor einem neuen Bereich einfrieren und Residuals veröffentlichen.",
    ],
    caveat: "Wichtige v59-Beobachtung: enge v51-Fenster sind lokal glatt und validieren primär Skalenverhalten. v40/v49 bleiben der stärkere punktweise Phasentest.",
  },
  en: {
    kicker: "prime lab · cryptography · deterministic research",
    title: "Velmère Research Lab",
    subtitle: "Cryptography, prime numbers and informational determinism framed as testable research, not a promise to defeat security.",
    badge: "numerical audit · replication required",
    back: "Back to VLM",
    cards: [
      { label: "Cryptography", title: "The secret stays secret", body: "Signatures and verification prove control without revealing the private key." },
      { label: "Prime numbers", title: "Measurable reconstruction error", body: "We study the residual of the prime-counting function and compare the model with classical baselines." },
      { label: "B. Protocol", title: "Finite numerical reconstruction", body: "The hypothesis is evaluated through holdout, parameter shifts, fake-zero controls and independent replication." },
      { label: "Entropy", title: "Determinism is not RNG", body: "Key material needs high-quality randomness. A mathematical model does not replace physical entropy." },
    ],
    method: "Research method",
    steps: [
      ["01", "Baseline", "Compare π(x), R(x) and classical approximations before adding a correction."],
      ["02", "B. Protocol", "Define the finite correction, parameters and expected operating range."],
      ["03", "Falsification", "Test holdout, fake zeros, neighbor shift and stability outside the selected window."],
      ["04", "Replication", "Publish the method and results for independent reproduction before stronger claims."],
    ],
    boundaryTitle: "Claim boundary",
    boundary: "Research Lab may discuss benchmarks, reconstruction, error and falsification. It does not claim a proof of the Riemann hypothesis, a break of Bitcoin or recovery of private keys.",
    benchmarkTitle: "Audit v3.1 · controlled results",
    benchmarkIntro: "The figures below come from the local B. Protocol report through test v59. The strongest claim is a finite numerical reconstruction, not an asymptotic theorem.",
    metrics: [
      ["v51 holdout", "800 points", "frozen Adaptive-K map"],
      ["MAE reduction", "96.734%", "53,871.13 → 1,759.36 against R(x)"],
      ["v51 wins", "795 / 800", "without holdout retuning"],
      ["v40 mixed-sign", "MAE 3.197", "strongest pointwise alignment test"],
    ],
    inverseTitle: "Inverse formulation · active test lane",
    inverseBody: "We are testing whether correction parameters can be reconstructed from the residual and a stable cutoff without holdout leakage. This lane remains experimental.",
    inverseTests: [
      "Separate scale training from pointwise testing.",
      "Compare against R(x), Li(x), a constant correction and a smooth log(x) model.",
      "Run neighbor-shift, within-window shuffle and fake-zero controls.",
      "Freeze parameters before a new range and publish residuals.",
    ],
    caveat: "Important v59 observation: narrow v51 windows are locally smooth, so they mainly validate scale behavior. v40/v49 remain the stronger pointwise phase test.",
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    path: "/research-lab",
    title: "Velmère Research Lab",
    description: "Testable cryptography and prime-number research with clear claim boundaries.",
  });
}

export default async function ResearchLabPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) notFound();
  setRequestLocale(locale);
  const safeLocale: Locale = locale === "de" || locale === "en" ? locale : "pl";
  const c = copy[safeLocale];

  return (
    <main
      className="velmere-public-page min-h-[100dvh] bg-velmere-black pb-24 pt-24 text-white md:pt-32"
      data-pass682-research-editorial-surface="true"
      data-pass2007-research="solid-evidence-cyan-no-card-stack"
    >
      <section className="luxury-section">
        <Link href="/vlm-token" className="velmere-button-secondary mb-6 inline-flex">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {c.back}
        </Link>

        <section className="velmere-editorial-hero overflow-hidden rounded-[2.5rem] border border-white/[0.09] bg-[#09090b]/[0.90] p-6 shadow-velmere-card md:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(19rem,.68fr)] lg:items-center">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.20em] text-velmere-gold">{c.kicker}</p>
              <h1 className="mt-6 max-w-4xl font-serif text-[clamp(3.2rem,7vw,6.7rem)] leading-[0.86] tracking-[-0.065em]">{c.title}</h1>
              <p className="mt-6 max-w-3xl text-sm leading-7 text-white/[0.60] md:text-base">{c.subtitle}</p>
              <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/[0.13] bg-cyan-300/[0.04] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-100/[0.74]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {c.badge}
              </p>
            </div>

            <aside className="velmere-research-orbit relative min-h-[21rem] overflow-hidden rounded-[2rem] border border-white/[0.08] bg-black/[0.26] p-7">
              <div className="velmere-research-grid absolute inset-0" />
              <svg viewBox="0 0 320 320" className="relative h-full min-h-[19rem] w-full" aria-label="Prime residual research diagram">
                <circle cx="160" cy="160" r="108" fill="none" stroke="rgba(200,169,106,.27)" />
                <circle cx="160" cy="160" r="72" fill="none" stroke="rgba(78,205,196,.20)" />
                <path d="M34 205 C76 78 122 248 164 122 C205 0 246 247 288 92" fill="none" stroke="rgba(200,169,106,.72)" strokeWidth="2" />
                <path d="M34 214 C82 177 118 185 160 160 C205 132 245 142 288 96" fill="none" stroke="rgba(78,205,196,.56)" strokeWidth="2" />
                <circle cx="160" cy="160" r="38" fill="rgba(10,10,12,.92)" stroke="rgba(255,255,255,.09)" />
                <text x="160" y="151" textAnchor="middle" fill="white" fontSize="28" fontWeight="700">B.</text>
                <text x="160" y="176" textAnchor="middle" fill="rgba(255,255,255,.45)" fontSize="10" fontFamily="monospace">π(x) - R(x)</text>
              </svg>
            </aside>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {c.cards.map((card, index) => (
            <article key={card.label} className="velmere-premium-tile group rounded-[1.5rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-velmere-gold">{card.label}</p>
                <span className="font-mono text-[8px] text-white/[0.24]">0{index + 1}</span>
              </div>
              <h2 className="mt-5 text-base font-semibold text-white">{card.title}</h2>
              <p className="mt-3 text-xs leading-6 text-white/[0.50]">{card.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,.74fr)_minmax(0,1.26fr)] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="velmere-label text-velmere-gold">Research</p>
            <h2 className="mt-4 font-serif text-4xl tracking-[-0.05em] md:text-5xl">{c.method}</h2>
            <p className="mt-5 text-sm leading-7 text-white/[0.50]">{c.boundary}</p>
          </div>
          <div className="grid gap-3">
            {c.steps.map(([step, title, body]) => (
              <article key={step} className="group grid gap-3 rounded-[1.4rem] border border-white/[0.08] bg-white/[0.022] p-5 sm:grid-cols-[3rem_10rem_1fr] sm:items-start">
                <span className="font-mono text-xs text-velmere-gold">{step}</span>
                <strong className="text-sm text-white">{title}</strong>
                <p className="text-sm leading-7 text-white/[0.50]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-velmere-gold">B. Protocol</p>
              <h2 className="mt-3 font-serif text-4xl tracking-[-0.05em]">{c.benchmarkTitle}</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/[0.48]">{c.benchmarkIntro}</p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {c.metrics.map(([label, value, note]) => (
              <article key={label} className="rounded-[1.35rem] border border-white/[0.07] bg-black/[0.18] p-5">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.36]">{label}</p>
                <strong className="mt-4 block font-mono text-xl text-cyan-100/[0.88]">{value}</strong>
                <p className="mt-3 text-xs leading-6 text-white/[0.44]">{note}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 rounded-[1.2rem] border border-cyan-200/[0.10] bg-cyan-300/[0.03] px-5 py-4 text-xs leading-6 text-cyan-50/[0.60]">{c.caveat}</p>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)]">
          <article className="pass2007-research-inverse rounded-[1.5rem] border border-cyan-200/[0.12] bg-[#090b0e] p-6">
            <Sigma className="h-5 w-5 text-cyan-100/[0.78]" aria-hidden="true" />
            <h2 className="mt-5 font-serif text-3xl tracking-[-0.045em]">{c.inverseTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-white/[0.52]">{c.inverseBody}</p>
          </article>

          <details className="velmere-research-details group rounded-[1.7rem] border border-white/[0.08] bg-white/[0.022] p-6">
            <summary className="flex cursor-pointer list-none items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-black/[0.18]">
                <FlaskConical className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
              </span>
              <span className="flex-1 text-sm font-semibold text-white">{c.inverseTitle}</span>
              <ChevronDown className="h-4 w-4 text-white/[0.42] transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-5 border-t border-white/[0.07] pt-5">
              {c.inverseTests.map((test) => (
                <div key={test} className="flex gap-3 border-b border-white/[0.06] py-3 last:border-b-0">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-velmere-gold" aria-hidden="true" />
                  <p className="text-sm leading-7 text-white/[0.52]">{test}</p>
                </div>
              ))}
            </div>
          </details>
        </section>

        <section className="pass2007-research-boundary mt-6 flex gap-4 border-l-2 border-cyan-200/[0.24] bg-cyan-300/[0.025] px-6 py-5 md:px-7">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-200/[0.14] bg-black/[0.16]">
            <ShieldCheck className="h-5 w-5 text-cyan-100/[0.78]" aria-hidden="true" />
          </span>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.17em] text-cyan-100/[0.72]">{c.boundaryTitle}</p>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/[0.56]">{c.boundary}</p>
          </div>
        </section>
      </section>
    </main>
  );
}
