export type Pass386Locale = "pl" | "en" | "de";

export type Pass386DecisionDensityInput = {
  locale: Pass386Locale;
  symbol: string;
  name: string;
  assetClass: string;
  sourceMode: string;
  sourceConfidence: number;
  missingDataCount: number;
  providerRows: number;
  hasLiveResult: boolean;
};

export type Pass386DecisionDensityPlan = {
  mode: "quick_check" | "review_needed" | "operator_deep_dive";
  maxPdfPages: 4;
  maxFacts: number;
  minimumFacts: number;
  estimatedSeconds: number;
  headline: string;
  executiveVerdict: string;
  decisionQuestion: string;
  pdfRule: string;
  previewRule: string;
  aiRule: string;
  factOrder: string[];
  facts: { label: string; value: string; copy: string }[];
  omittedSections: string[];
  userDecisionChecklist: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function localize(locale: Pass386Locale, pl: string, en: string, de: string) {
  if (locale === "en") return en;
  if (locale === "de") return de;
  return pl;
}

export function buildPass386DecisionDensityPlan(input: Pass386DecisionDensityInput): Pass386DecisionDensityPlan {
  const confidence = clamp(Math.round(input.sourceConfidence || 0), 0, 100);
  const risk = 100 - confidence;
  const hasLive = input.hasLiveResult || /live|market|table/i.test(input.sourceMode);
  const missing = clamp(input.missingDataCount, 0, 12);
  const mode = confidence >= 72 && missing <= 2
    ? "quick_check"
    : confidence >= 58 && missing <= 5
      ? "review_needed"
      : "operator_deep_dive";
  const maxFacts = mode === "quick_check" ? 8 : mode === "review_needed" ? 10 : 12;
  const minimumFacts = mode === "quick_check" ? 5 : mode === "review_needed" ? 7 : 9;
  const estimatedSeconds = mode === "quick_check" ? 4.8 : mode === "review_needed" ? 7.2 : 10.8;
  const freshState = hasLive
    ? localize(input.locale, "wykryto warstwę live, ale mocne wnioski wymagają timestampu i drugiego źródła", "live layer detected, but stronger conclusions need timestamp and second source", "Live-Schicht erkannt, aber stärkere Aussagen brauchen Zeitstempel und zweite Quelle")
    : localize(input.locale, "tryb preview: najpierw identyfikacja, źródło i brakujące dane", "preview mode: identity, source and missing data first", "Preview-Modus: Identität, Quelle und fehlende Daten zuerst");

  const facts = [
    {
      label: localize(input.locale, "Aktyw", "Asset", "Asset"),
      value: `${input.symbol || input.name}`,
      copy: localize(input.locale, `Raport dotyczy ${input.name} i klasy ${input.assetClass}.`, `Report focuses on ${input.name} and asset class ${input.assetClass}.`, `Der Bericht fokussiert ${input.name} und Klasse ${input.assetClass}.`),
    },
    {
      label: localize(input.locale, "Źródło", "Source", "Quelle"),
      value: input.sourceMode.replaceAll("_", " "),
      copy: freshState,
    },
    {
      label: localize(input.locale, "Pewność", "Confidence", "Sicherheit"),
      value: `${confidence}/100`,
      copy: localize(input.locale, "Pewność steruje długością raportu: więcej braków = krótszy, bardziej ostrożny PDF.", "Confidence controls report length: more missing data means a shorter, more careful PDF.", "Die Sicherheit steuert die Berichtslänge: mehr Lücken = kürzerer, vorsichtigerer PDF."),
    },
    {
      label: localize(input.locale, "Ryzyko decyzji", "Decision risk", "Entscheidungsrisiko"),
      value: `${risk}/100`,
      copy: localize(input.locale, "To nie jest sygnał kup/sprzedaj; to informacja, ile dowodów brakuje do spokojnej decyzji użytkownika.", "This is not a buy/sell signal; it shows how much evidence is missing before a calm user decision.", "Das ist kein Kauf/Verkauf-Signal; es zeigt, wie viel Evidenz vor einer ruhigen Entscheidung fehlt."),
    },
    {
      label: localize(input.locale, "Braki", "Missing", "Lücken"),
      value: `${missing}`,
      copy: localize(input.locale, "AI ma pokazać najważniejsze luki, nie drukować całej historii passów.", "AI should show the most important gaps, not print the full pass history.", "Die KI zeigt die wichtigsten Lücken, nicht die komplette Pass-Historie."),
    },
    {
      label: localize(input.locale, "Provider", "Provider", "Provider"),
      value: `${input.providerRows}`,
      copy: localize(input.locale, "Provider-ready oznacza gotowość UI pod źródło; live pewność dopiero z timestampem i fallback flag.", "Provider-ready means the UI is ready for a source; live confidence requires timestamp and fallback flag.", "Provider-ready heißt UI-Bereitschaft; Live-Sicherheit braucht Zeitstempel und Fallback-Flag."),
    },
    {
      label: localize(input.locale, "Zakres PDF", "PDF scope", "PDF-Umfang"),
      value: `${minimumFacts}-${maxFacts} facts / 4 pages`,
      copy: localize(input.locale, "PDF ma zawierać tylko dane potrzebne do decyzji: co to jest, co widać, czego brakuje i co zrobić dalej.", "PDF contains only decision data: what it is, what is visible, what is missing and what to do next.", "PDF enthält nur Entscheidungsdaten: was es ist, was sichtbar ist, was fehlt und was als Nächstes folgt."),
    },
    {
      label: localize(input.locale, "Czas skanu", "Scan time", "Scan-Zeit"),
      value: `${estimatedSeconds.toFixed(1)}s`,
      copy: localize(input.locale, "Animacja mózgu trwa tyle, ile potrzeba na zebranie minimalnego zestawu dowodów, nie na efekt sztucznego oczekiwania.", "Brain animation lasts as long as the minimum evidence set requires, not as fake waiting time.", "Die Brain-Animation dauert so lange wie das minimale Evidenzpaket, nicht als künstliche Wartezeit."),
    },
    {
      label: localize(input.locale, "Decyzja", "Decision", "Entscheidung"),
      value: mode.replaceAll("_", " "),
      copy: localize(input.locale, "Użytkownik ma dostać jasny następny krok: zaakceptuj preview, przejdź do review albo poczekaj na źródła.", "User gets one clear next step: accept preview, move to review, or wait for sources.", "Der Nutzer bekommt einen klaren nächsten Schritt: Preview akzeptieren, Review öffnen oder auf Quellen warten."),
    },
    {
      label: localize(input.locale, "Język", "Language", "Sprache"),
      value: input.locale.toUpperCase(),
      copy: localize(input.locale, "Preview i download używają tego samego języka strony.", "Preview and download use the same page language.", "Preview und Download nutzen dieselbe Seitensprache."),
    },
    {
      label: localize(input.locale, "AI filter", "AI filter", "KI-Filter"),
      value: "signal > noise",
      copy: localize(input.locale, "Stare panele, debug i historia implementacji są wycięte z publicznego PDF.", "Old panels, debug and implementation history are removed from the public PDF.", "Alte Panels, Debug und Implementierungshistorie werden aus dem öffentlichen PDF entfernt."),
    },
    {
      label: localize(input.locale, "Granica", "Boundary", "Grenze"),
      value: "research note",
      copy: localize(input.locale, "Raport pomaga zrozumieć dane; nie obiecuje wyniku, bezpieczeństwa ani ruchu ceny.", "The report helps understand data; it does not promise outcome, safety or price movement.", "Der Bericht hilft Daten zu verstehen; er verspricht kein Ergebnis, keine Sicherheit und keine Preisbewegung."),
    },
  ].slice(0, maxFacts);

  return {
    mode,
    maxPdfPages: 4,
    maxFacts,
    minimumFacts,
    estimatedSeconds,
    headline: localize(input.locale, "Decision Density Engine: krótki PDF z najważniejszych danych", "Decision Density Engine: concise PDF with only the key data", "Decision Density Engine: kurzer PDF mit den wichtigsten Daten"),
    executiveVerdict: localize(
      input.locale,
      mode === "quick_check" ? "Wystarczy krótki raport: AI widzi podstawowe dane i może pokazać spokojny preview." : mode === "review_needed" ? "Potrzebny raport średni: AI widzi aktyw, ale wymaga kilku potwierdzeń przed mocniejszym opisem." : "Potrzebny operator review: AI ma pokazać braki i nie udawać pełnej pewności.",
      mode === "quick_check" ? "Short report is enough: AI sees the core data and can show a calm preview." : mode === "review_needed" ? "Medium report needed: AI sees the asset but needs confirmations before stronger copy." : "Operator review needed: AI must show gaps and avoid pretending full confidence.",
      mode === "quick_check" ? "Kurzer Bericht reicht: KI sieht Kerndaten und kann eine ruhige Preview zeigen." : mode === "review_needed" ? "Mittlerer Bericht nötig: KI sieht das Asset, braucht aber Bestätigungen." : "Operator-Review nötig: KI muss Lücken zeigen und darf keine volle Sicherheit vortäuschen."
    ),
    decisionQuestion: localize(input.locale, "Czy użytkownik ma wystarczająco danych, aby wykonać następny bezpieczny krok?", "Does the user have enough data to take the next safe step?", "Hat der Nutzer genug Daten für den nächsten sicheren Schritt?"),
    pdfRule: localize(input.locale, "PDF maksymalnie 4 strony: decyzja, dowody, braki, następny krok.", "PDF max 4 pages: decision, evidence, gaps, next step.", "PDF maximal 4 Seiten: Entscheidung, Evidenz, Lücken, nächster Schritt."),
    previewRule: localize(input.locale, "Preview i download pokazują ten sam wybrany zestaw faktów, nie pełną historię implementacji.", "Preview and download show the same selected fact set, not implementation history.", "Preview und Download zeigen dasselbe Faktenset, nicht die Implementierungshistorie."),
    aiRule: localize(input.locale, "AI tnie szum: jeśli fakt nie zmienia decyzji użytkownika, nie trafia do PDF.", "AI cuts noise: if a fact does not change the user's decision, it does not enter the PDF.", "KI schneidet Rauschen: wenn ein Fakt die Entscheidung nicht ändert, kommt er nicht in den PDF."),
    factOrder: ["identity", "source", "confidence", "missing", "provider", "decision", "next_step"],
    facts,
    omittedSections: ["legacy pass panels", "debug rails", "implementation changelog", "duplicated AI copy", "operator-only internals"],
    userDecisionChecklist: [
      localize(input.locale, "Czy aktyw został poprawnie rozpoznany?", "Was the asset identified correctly?", "Wurde das Asset korrekt erkannt?"),
      localize(input.locale, "Czy źródło ma świeży timestamp albo jasny tryb preview?", "Does the source have a fresh timestamp or clear preview mode?", "Hat die Quelle einen frischen Zeitstempel oder klaren Preview-Modus?"),
      localize(input.locale, "Czy braki danych są widoczne?", "Are missing data points visible?", "Sind Datenlücken sichtbar?"),
      localize(input.locale, "Czy jest jeden następny krok zamiast ściany tekstu?", "Is there one next step instead of a wall of text?", "Gibt es einen nächsten Schritt statt Textwand?"),
    ],
  };
}
