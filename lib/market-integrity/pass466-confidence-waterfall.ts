import type {
  VelmereMarketSnapshot,
  VelmereSearchResult,
} from "@/lib/search/intelligence-search-contract";
import type { LensReportLocale } from "@/lib/search/lens-report";

export type Pass466WaterfallState =
  | "confirmed"
  | "review"
  | "source_required";

export type Pass466ConfidenceWaterfallStage = {
  id:
    | "identity"
    | "primary"
    | "second_source"
    | "freshness"
    | "fundamentals"
    | "final";
  label: string;
  cap: number;
  state: Pass466WaterfallState;
  detail: string;
};

export type Pass466ConfidenceWaterfall = {
  version: "pass466-confidence-waterfall";
  assetClass: string;
  product: "basic" | "pro" | "advanced";
  openingConfidence: number;
  finalConfidence: number;
  lostConfidence: number;
  stages: Pass466ConfidenceWaterfallStage[];
  filingUrl: string | null;
  filingLabel: string | null;
  boundary: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function copy(locale: LensReportLocale) {
  if (locale === "pl") {
    return {
      identity: "Tożsamość instrumentu",
      primary: "Główne źródło",
      second: "Drugie źródło",
      freshness: "Świeżość",
      fundamentals: "Fundamentals / filing",
      final: "Końcowy limit",
      identityOk: "Symbol i klasa aktywa są rozpoznane.",
      identityReview: "Klasa aktywa wymaga potwierdzenia.",
      primaryOk: "Provider zwrócił strukturalne dane.",
      primaryMissing: "Keyed provider lub dane rynkowe wymagane.",
      secondOk: "Drugie źródło jest dołączone i porównywalne.",
      secondReview: "Drugie źródło jest częściowe lub ma inną podstawę.",
      secondMissing: "Brak porównywalnego drugiego źródła.",
      fresh: "Timestamp mieści się w kontrakcie świeżości.",
      stale: "Timestamp jest stary albo nie został dołączony.",
      fundamentalOk: "Sprawozdania i SEC/XBRL są wystarczająco kompletne.",
      fundamentalReview: "Sprawozdania są częściowe, stare lub rozbieżne.",
      fundamentalMissing: "Fundamentals/filing nie dotyczą aktywa albo wymagają źródła.",
      finalText: "Najniższy potwierdzony limit steruje językiem Basic/Pro/Advanced.",
      boundary: "Waterfall pokazuje, gdzie znika pewność. Nie jest prognozą ceny ani certyfikatem bezpieczeństwa.",
    };
  }
  if (locale === "de") {
    return {
      identity: "Instrument-Identität",
      primary: "Primärquelle",
      second: "Zweitquelle",
      freshness: "Aktualität",
      fundamentals: "Fundamentals / Filing",
      final: "Finales Limit",
      identityOk: "Symbol und Assetklasse sind erkannt.",
      identityReview: "Die Assetklasse muss bestätigt werden.",
      primaryOk: "Der Provider lieferte strukturierte Daten.",
      primaryMissing: "Keyed Provider oder Marktdaten erforderlich.",
      secondOk: "Eine vergleichbare Zweitquelle ist verbunden.",
      secondReview: "Die Zweitquelle ist partiell oder nutzt eine andere Basis.",
      secondMissing: "Keine vergleichbare Zweitquelle vorhanden.",
      fresh: "Der Zeitstempel liegt innerhalb des Freshness-Vertrags.",
      stale: "Der Zeitstempel ist alt oder fehlt.",
      fundamentalOk: "Statements und SEC/XBRL sind ausreichend vollständig.",
      fundamentalReview: "Statements sind partiell, alt oder divergent.",
      fundamentalMissing: "Fundamentals/Filing sind nicht anwendbar oder benötigen eine Quelle.",
      finalText: "Das niedrigste bestätigte Limit steuert die Sprache von Basic/Pro/Advanced.",
      boundary: "Der Waterfall zeigt, wo Konfidenz verloren geht. Keine Preisprognose und kein Sicherheitszertifikat.",
    };
  }
  return {
    identity: "Instrument identity",
    primary: "Primary source",
    second: "Second source",
    freshness: "Freshness",
    fundamentals: "Fundamentals / filing",
    final: "Final cap",
    identityOk: "Symbol and asset class are resolved.",
    identityReview: "The asset class still needs confirmation.",
    primaryOk: "The provider returned structured data.",
    primaryMissing: "A keyed provider or market data is required.",
    secondOk: "A comparable second source is attached.",
    secondReview: "The second source is partial or uses a different basis.",
    secondMissing: "No comparable second source is attached.",
    fresh: "The timestamp is inside the freshness contract.",
    stale: "The timestamp is old or missing.",
    fundamentalOk: "Statements and SEC/XBRL are sufficiently complete.",
    fundamentalReview: "Statements are partial, stale or divergent.",
    fundamentalMissing: "Fundamentals/filing are not applicable or require a source.",
    finalText: "The lowest confirmed cap controls Basic/Pro/Advanced wording.",
    boundary: "The waterfall shows where confidence is lost. It is not a price forecast or safety certificate.",
  };
}

function freshnessCap(snapshot: VelmereMarketSnapshot | undefined) {
  if (!snapshot?.observedAt) return 58;
  const parsed = Date.parse(snapshot.observedAt);
  if (!Number.isFinite(parsed)) return 58;
  const ageMinutes = Math.max(0, (Date.now() - parsed) / 60_000);
  const slowAsset = snapshot.assetClass === "stock" || snapshot.assetClass === "etf" || snapshot.assetClass === "real_estate";
  if (slowAsset) {
    if (ageMinutes <= 24 * 60) return 94;
    if (ageMinutes <= 7 * 24 * 60) return 76;
    return 48;
  }
  if (ageMinutes <= 5) return 96;
  if (ageMinutes <= 60) return 78;
  return 46;
}

export function buildPass466ConfidenceWaterfall(
  result: VelmereSearchResult,
  locale: LensReportLocale,
  product: "basic" | "pro" | "advanced" = "advanced",
): Pass466ConfidenceWaterfall {
  const c = copy(locale);
  const snapshot = result.marketSnapshot;
  const opening = 100;
  const identityResolved = Boolean(result.symbol && (snapshot?.assetClass || result.category));
  const identityCap = identityResolved ? 100 : 72;
  const primaryBound = result.sources.some((source) => source.mode === "live") || snapshot?.providerState === "source_bound";
  const primaryCap = primaryBound ? Math.max(58, result.sourceConfidence) : Math.min(58, result.sourceConfidence);
  const usableSourceCount = result.sources.filter((source) => source.mode === "live" || source.mode === "live_table").length;
  const secondState = snapshot?.venueComparisonState;
  const secondBound = usableSourceCount >= 2 || secondState === "aligned";
  const secondReview = secondState === "watch" || secondState === "divergent" || result.sources.length >= 2;
  const secondCap = secondBound
    ? finite(snapshot?.venueConfidenceCap) ?? 92
    : secondReview
      ? finite(snapshot?.venueConfidenceCap) ?? 70
      : 54;
  const freshCap = freshnessCap(snapshot);
  const fundamentalApplies = snapshot?.assetClass === "stock" || snapshot?.assetClass === "etf" || snapshot?.assetClass === "real_estate";
  const fundamentalCap = fundamentalApplies
    ? Math.min(
        finite(snapshot?.fundamentalConfidenceCap) ?? 58,
        snapshot?.fundamentalSecState === "sec_aligned"
          ? 94
          : snapshot?.fundamentalSecState === "sec_partial"
            ? 72
            : snapshot?.fundamentalSecState === "sec_divergent"
              ? 46
              : 58,
      )
    : 100;
  const productFloor = product === "basic" ? 44 : product === "pro" ? 36 : 24;
  const finalConfidence = Math.max(
    productFloor,
    Math.min(
      opening,
      identityCap,
      primaryCap,
      secondCap,
      freshCap,
      fundamentalCap,
      result.sourceConfidence,
    ),
  );
  const stages: Pass466ConfidenceWaterfallStage[] = [
    {
      id: "identity",
      label: c.identity,
      cap: identityCap,
      state: identityResolved ? "confirmed" : "review",
      detail: identityResolved ? c.identityOk : c.identityReview,
    },
    {
      id: "primary",
      label: c.primary,
      cap: primaryCap,
      state: primaryBound ? "confirmed" : "source_required",
      detail: primaryBound ? c.primaryOk : c.primaryMissing,
    },
    {
      id: "second_source",
      label: c.second,
      cap: secondCap,
      state: secondBound ? "confirmed" : secondReview ? "review" : "source_required",
      detail: secondBound ? c.secondOk : secondReview ? c.secondReview : c.secondMissing,
    },
    {
      id: "freshness",
      label: c.freshness,
      cap: freshCap,
      state: freshCap >= 80 ? "confirmed" : freshCap >= 58 ? "review" : "source_required",
      detail: freshCap >= 80 ? c.fresh : c.stale,
    },
    {
      id: "fundamentals",
      label: c.fundamentals,
      cap: fundamentalCap,
      state: !fundamentalApplies
        ? "confirmed"
        : fundamentalCap >= 80
          ? "confirmed"
          : fundamentalCap >= 58
            ? "review"
            : "source_required",
      detail: !fundamentalApplies
        ? c.fundamentalMissing
        : fundamentalCap >= 80
          ? c.fundamentalOk
          : fundamentalCap >= 58
            ? c.fundamentalReview
            : c.fundamentalMissing,
    },
    {
      id: "final",
      label: c.final,
      cap: finalConfidence,
      state: finalConfidence >= 76 ? "confirmed" : finalConfidence >= 52 ? "review" : "source_required",
      detail: c.finalText,
    },
  ];
  const filingUrl = snapshot?.fundamentalFilingUrl || null;
  const filingLabel = filingUrl
    ? [snapshot?.fundamentalFilingForm, snapshot?.fundamentalFilingDate]
        .filter(Boolean)
        .join(" · ") || "SEC filing"
    : null;
  return {
    version: "pass466-confidence-waterfall",
    assetClass: snapshot?.assetClass || result.category,
    product,
    openingConfidence: opening,
    finalConfidence,
    lostConfidence: opening - finalConfidence,
    stages,
    filingUrl,
    filingLabel,
    boundary: c.boundary,
  };
}

export const pass466ConfidenceWaterfallContract = {
  id: "PASS466_CONFIDENCE_WATERFALL",
  rules: [
    "Every cap is monotonic: a missing source can lower confidence but can never increase it.",
    "The lowest confirmed cap controls wording in Browser, PDF and Shield AI.",
    "SEC filing links are evidence links and open outside the modal; they are never rendered as promotional calls to action.",
    "Basic, Pro and Advanced can expose different detail density, but they share the same final confidence boundary.",
  ],
} as const;
