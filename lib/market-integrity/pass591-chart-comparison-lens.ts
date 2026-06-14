export type Pass591Locale = "pl" | "de" | "en";

export type Pass591ComparisonCandle = {
  timestamp: number;
  close: number;
};

export type Pass591ComparisonPoint = {
  primaryIndex: number;
  timestamp: number;
  primaryIndexValue: number;
  secondaryIndexValue: number;
  spreadBps: number;
};

export type Pass591ChartComparisonLens = {
  version: "pass591-chart-comparison-lens";
  state: "ready" | "limited" | "blocked";
  scaleMode: "normalized_return" | "unavailable";
  comparable: boolean;
  primaryLabel: string;
  secondaryLabel: string | null;
  points: Pass591ComparisonPoint[];
  matchRate: number;
  latestRelativePerformancePercent: number | null;
  medianSpreadBps: number | null;
  maximumSpreadBps: number | null;
  headline: string;
  boundary: string;
};

const COPY = {
  pl: {
    blocked: "Ścieżka porównawcza wymaga co najmniej dwóch świec o identycznych znacznikach czasu.",
    blockedBoundary: "Świece nie są interpolowane, a punktowe podsumowanie dostawcy nie jest przedstawiane jako ścieżka świecowa.",
    ready: "Ścieżki źródła głównego i pomocniczego są porównywane od wspólnego punktu bazowego 100.",
    limited: "Znormalizowana ścieżka jest widoczna przy ograniczonym dopasowaniu znaczników czasu.",
    comparable: "Surowe ceny pozostają na odseparowanych skalach; porównanie obejmuje wyłącznie znormalizowany przebieg i identyczne znaczniki czasu.",
    directionOnly: "Podstawa kwotowania nie została oznaczona jako bezpośrednio porównywalna, dlatego widoczny jest tylko znormalizowany kierunek, a twierdzenia o surowym spreadzie pozostają zablokowane.",
  },
  de: {
    blocked: "Ein Vergleichspfad benötigt mindestens zwei Kerzen mit exakt übereinstimmenden Zeitstempeln.",
    blockedBoundary: "Kerzen werden nicht interpoliert und eine punktuelle Provider-Zusammenfassung wird nicht als Kerzenpfad dargestellt.",
    ready: "Primär- und Sekundärpfad werden ab demselben Index-100-Ausgangspunkt verglichen.",
    limited: "Der normalisierte Pfad ist bei begrenzter Zeitstempel-Übereinstimmung sichtbar.",
    comparable: "Rohpreise bleiben auf getrennten Skalen; verglichen werden nur normalisierte Pfade und exakt übereinstimmende Zeitstempel.",
    directionOnly: "Die Quote-Basis ist nicht als direkt vergleichbar deklariert; deshalb wird nur die normalisierte Richtung gezeigt und Aussagen zum Roh-Spread bleiben gesperrt.",
  },
  en: {
    blocked: "A comparison path needs at least two exact timestamp matches.",
    blockedBoundary: "No bars are interpolated and a point-in-time provider summary is not presented as a candle path.",
    ready: "Primary and secondary paths are compared from the same index-100 starting point.",
    limited: "The normalized path is visible with a limited timestamp match rate.",
    comparable: "Raw prices remain on isolated scales; the lens compares normalized path performance and exact timestamp matches only.",
    directionOnly: "The quote basis is not declared directly comparable, so only normalized path direction is shown and raw spread claims stay blocked.",
  },
} as const;

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function normalizeLocale(locale?: string): Pass591Locale {
  return locale === "de" || locale === "en" ? locale : "pl";
}

export function buildPass591ChartComparisonLens(input: {
  primary: Pass591ComparisonCandle[];
  secondary: Pass591ComparisonCandle[];
  primaryLabel?: string;
  secondaryLabel?: string | null;
  directPriceComparable?: boolean;
  locale?: Pass591Locale;
}): Pass591ChartComparisonLens {
  const c = COPY[normalizeLocale(input.locale)];
  const primary = input.primary.filter(
    (item) =>
      Number.isFinite(item.timestamp) &&
      Number.isFinite(item.close) &&
      item.close > 0,
  );
  const secondaryByTime = new Map(
    input.secondary
      .filter(
        (item) =>
          Number.isFinite(item.timestamp) &&
          Number.isFinite(item.close) &&
          item.close > 0,
      )
      .map((item) => [item.timestamp, item] as const),
  );
  const matched = primary.flatMap((item, primaryIndex) => {
    const peer = secondaryByTime.get(item.timestamp);
    return peer ? [{ item, peer, primaryIndex }] : [];
  });
  const matchRate = Math.round(
    (matched.length /
      Math.max(primary.length, input.secondary.length, 1)) *
      100,
  );

  if (matched.length < 2) {
    return {
      version: "pass591-chart-comparison-lens",
      state: "blocked",
      scaleMode: "unavailable",
      comparable: false,
      primaryLabel: input.primaryLabel?.trim() || "primary",
      secondaryLabel: input.secondaryLabel?.trim() || null,
      points: [],
      matchRate,
      latestRelativePerformancePercent: null,
      medianSpreadBps: null,
      maximumSpreadBps: null,
      headline: c.blocked,
      boundary: c.blockedBoundary,
    };
  }

  const primaryBase = matched[0].item.close;
  const secondaryBase = matched[0].peer.close;
  const points = matched.map(({ item, peer, primaryIndex }) => {
    const primaryIndexValue = (item.close / primaryBase) * 100;
    const secondaryIndexValue = (peer.close / secondaryBase) * 100;
    return {
      primaryIndex,
      timestamp: item.timestamp,
      primaryIndexValue,
      secondaryIndexValue,
      spreadBps: (primaryIndexValue - secondaryIndexValue) * 100,
    };
  });
  const absoluteSpreads = points.map((point) => Math.abs(point.spreadBps));
  const latest = points.at(-1)!;
  const comparable = input.directPriceComparable !== false;
  const state: Pass591ChartComparisonLens["state"] =
    matchRate >= 70 ? "ready" : "limited";
  const medianSpread = median(absoluteSpreads);

  return {
    version: "pass591-chart-comparison-lens",
    state,
    scaleMode: "normalized_return",
    comparable,
    primaryLabel: input.primaryLabel?.trim() || "primary",
    secondaryLabel: input.secondaryLabel?.trim() || "secondary",
    points,
    matchRate,
    latestRelativePerformancePercent:
      Math.round(
        (latest.primaryIndexValue - latest.secondaryIndexValue) * 100,
      ) / 100,
    medianSpreadBps:
      medianSpread === null ? null : Math.round(medianSpread * 10) / 10,
    maximumSpreadBps:
      absoluteSpreads.length
        ? Math.round(Math.max(...absoluteSpreads) * 10) / 10
        : null,
    headline: state === "ready" ? c.ready : c.limited,
    boundary: comparable ? c.comparable : c.directionOnly,
  };
}
