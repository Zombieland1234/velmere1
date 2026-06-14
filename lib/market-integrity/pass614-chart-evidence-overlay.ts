import type {
  Pass612OneSourceStateContract,
  Pass612SourceState,
} from "./pass612-one-source-state-contract";

export type Pass614Locale = "pl" | "de" | "en";

export type Pass614ChartEvidenceOverlay = {
  version: "pass614-chart-evidence-overlay";
  sourceState: Pass612SourceState;
  sourceLabel: string;
  sourceProvider: string;
  backupProvider: string | null;
  timestampLabel: string;
  confidenceCap: number;
  gapCount: number;
  crosshairFields: Array<{
    id: "timestamp" | "source" | "backup" | "confidence" | "gaps";
    label: string;
    value: string;
  }>;
  boundary: string;
};

const COPY = {
  pl: {
    timestamp: "Czas świecy",
    source: "Źródło",
    backup: "Źródło zapasowe",
    confidence: "Limit pewności",
    gaps: "Luki",
    none: "brak",
    unavailable: "niedostępne",
    boundary: "Crosshair opisuje tylko wybraną świecę i przypięte źródło; nie zamienia braków w dane.",
  },
  de: {
    timestamp: "Kerzenzeit",
    source: "Quelle",
    backup: "Ersatzquelle",
    confidence: "Konfidenzgrenze",
    gaps: "Lücken",
    none: "keine",
    unavailable: "nicht verfügbar",
    boundary: "Das Fadenkreuz beschreibt nur die gewählte Kerze und die gebundene Quelle; Lücken werden nicht zu Daten.",
  },
  en: {
    timestamp: "Candle time",
    source: "Source",
    backup: "Backup source",
    confidence: "Confidence cap",
    gaps: "Gaps",
    none: "none",
    unavailable: "unavailable",
    boundary: "The crosshair describes only the selected candle and its bound source; gaps are never converted into data.",
  },
} as const;

function normalizeLocale(locale: string): Pass614Locale {
  return locale === "de" || locale === "en" ? locale : "pl";
}

function timestampLabel(timestamp: number | string | null | undefined, locale: Pass614Locale) {
  if (timestamp === null || timestamp === undefined || timestamp === "") return COPY[locale].unavailable;
  const numeric = typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
  const milliseconds = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  if (!Number.isFinite(milliseconds)) return COPY[locale].unavailable;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return COPY[locale].unavailable;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function buildPass614ChartEvidenceOverlay(input: {
  locale: string;
  sourceContract: Pass612OneSourceStateContract;
  chartLayerId?: string;
  candleTimestamp?: number | string | null;
  gapCount?: number | null;
}): Pass614ChartEvidenceOverlay {
  const locale = normalizeLocale(input.locale);
  const c = COPY[locale];
  const layer =
    input.sourceContract.layers.find((item) => item.id === (input.chartLayerId ?? "candles")) ??
    input.sourceContract.layers[0];
  const sourceState = layer?.state ?? "offline";
  const sourceProvider = layer?.provider ?? c.unavailable;
  const backupProvider = layer?.backupProvider ?? null;
  const confidenceCap = Math.min(
    input.sourceContract.confidenceCap,
    layer?.confidenceCap ?? input.sourceContract.confidenceCap,
  );
  const gaps = Math.max(0, Math.round(input.gapCount ?? 0));
  const selectedTimestamp = input.candleTimestamp ?? layer?.observedAt ?? null;
  const sourceLabel = `${sourceState} · ${sourceProvider}`;

  return {
    version: "pass614-chart-evidence-overlay",
    sourceState,
    sourceLabel,
    sourceProvider,
    backupProvider,
    timestampLabel: timestampLabel(selectedTimestamp, locale),
    confidenceCap,
    gapCount: gaps,
    crosshairFields: [
      { id: "timestamp", label: c.timestamp, value: timestampLabel(selectedTimestamp, locale) },
      { id: "source", label: c.source, value: sourceLabel },
      { id: "backup", label: c.backup, value: backupProvider ?? c.none },
      { id: "confidence", label: c.confidence, value: `${confidenceCap}%` },
      { id: "gaps", label: c.gaps, value: String(gaps) },
    ],
    boundary: c.boundary,
  };
}
