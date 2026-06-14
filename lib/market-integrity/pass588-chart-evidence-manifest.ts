export type Pass588AnalysisDepth = "basic" | "pro" | "advanced";
export type Pass588Locale = "pl" | "de" | "en";
export type Pass588FieldState = "confirmed" | "limited" | "missing";

export type Pass588EvidenceField = {
  id: string;
  label: string;
  value: string;
  state: Pass588FieldState;
  sourceId: "primary" | "secondary" | "runtime" | "continuity" | "comparison";
  note: string;
};

export type Pass588ChartEvidenceManifest = {
  version: "pass588-chart-evidence-manifest";
  depth: Pass588AnalysisDepth;
  fieldBudget: 10 | 14 | 20;
  fields: Pass588EvidenceField[];
  confirmedCount: number;
  limitedCount: number;
  missingCount: number;
  distinctFieldCount: number;
  sourceCoverage: string[];
  status: "complete" | "limited";
  boundary: string;
};

const BUDGET: Record<Pass588AnalysisDepth, 10 | 14 | 20> = {
  basic: 10,
  pro: 14,
  advanced: 20,
};

const labels = {
  pl: {
    close: "Cena zamknięcia",
    time: "Czas świecy",
    interval: "Interwał",
    provider: "Stan źródła",
    freshness: "Wiek danych",
    coverage: "Pokrycie historii",
    cadence: "Kadencja świec",
    visibleRange: "Zakres widoczny",
    volumePulse: "Impuls wolumenu",
    continuity: "Ciągłość danych",
    failover: "Trasa awaryjna",
    consensus: "Zgodność źródeł",
    matchRate: "Dopasowanie świec",
    medianDivergence: "Mediana rozbieżności",
    directionAgreement: "Zgodność kierunku",
    maxDivergence: "Maks. rozbieżność",
    gaps: "Luki czasu",
    duplicates: "Duplikaty",
    cadenceShifts: "Zmiany kadencji",
    confidenceCap: "Limit pewności",
    missing: "brak danych",
    seconds: "s",
    states: {
      live: "na żywo", stale: "nieświeże", partial: "częściowe", offline: "offline",
      healthy: "spójne", watch: "do kontroli", blocked: "zablokowane",
      primary_live: "źródło główne aktywne", failover_ready: "źródło zapasowe gotowe", degraded: "tryb ograniczony",
      ready: "gotowe", limited: "ograniczone", aligned: "zgodne", divergent: "rozbieżne", single_source: "jedno źródło", unavailable: "niedostępne",
    },
  },
  de: {
    close: "Schlusskurs",
    time: "Kerzenzeit",
    interval: "Intervall",
    provider: "Quellenstatus",
    freshness: "Datenalter",
    coverage: "Historienabdeckung",
    cadence: "Kerzenkadenz",
    visibleRange: "Sichtbare Spanne",
    volumePulse: "Volumenimpuls",
    continuity: "Datenkontinuität",
    failover: "Ausweichroute",
    consensus: "Quellenabgleich",
    matchRate: "Kerzen-Match",
    medianDivergence: "Median-Abweichung",
    directionAgreement: "Richtungsabgleich",
    maxDivergence: "Max. Abweichung",
    gaps: "Zeitlücken",
    duplicates: "Duplikate",
    cadenceShifts: "Kadenzwechsel",
    confidenceCap: "Konfidenzgrenze",
    missing: "nicht verfügbar",
    seconds: "s",
    states: {
      live: "live", stale: "veraltet", partial: "teilweise", offline: "offline",
      healthy: "konsistent", watch: "prüfen", blocked: "gesperrt",
      primary_live: "Primärquelle aktiv", failover_ready: "Ersatzquelle bereit", degraded: "eingeschränkt",
      ready: "bereit", limited: "begrenzt", aligned: "abgeglichen", divergent: "abweichend", single_source: "eine Quelle", unavailable: "nicht verfügbar",
    },
  },
  en: {
    close: "Close price",
    time: "Candle time",
    interval: "Interval",
    provider: "Source state",
    freshness: "Data age",
    coverage: "History coverage",
    cadence: "Candle cadence",
    visibleRange: "Visible range",
    volumePulse: "Volume pulse",
    continuity: "Data continuity",
    failover: "Failover route",
    consensus: "Source consensus",
    matchRate: "Candle match",
    medianDivergence: "Median divergence",
    directionAgreement: "Direction agreement",
    maxDivergence: "Max divergence",
    gaps: "Time gaps",
    duplicates: "Duplicates",
    cadenceShifts: "Cadence shifts",
    confidenceCap: "Confidence cap",
    missing: "unavailable",
    seconds: "s",
    states: {
      live: "live", stale: "stale", partial: "partial", offline: "offline",
      healthy: "consistent", watch: "review", blocked: "blocked",
      primary_live: "primary source live", failover_ready: "standby source ready", degraded: "degraded",
      ready: "ready", limited: "limited", aligned: "aligned", divergent: "divergent", single_source: "single source", unavailable: "unavailable",
    },
  },
} as const;

function translateState(
  states: Record<string, string>,
  value: string | null | undefined,
) {
  if (!value) return value;
  return states[value] || value.replaceAll("_", " ");
}

function field(
  id: string,
  label: string,
  value: string | number | null | undefined,
  sourceId: Pass588EvidenceField["sourceId"],
  note: string,
  missingLabel: string,
  state?: Pass588FieldState,
): Pass588EvidenceField {
  const available = value !== null && value !== undefined && value !== "";
  return {
    id,
    label,
    value: available ? String(value) : missingLabel,
    state: state ?? (available ? "confirmed" : "missing"),
    sourceId,
    note,
  };
}

export function buildPass588ChartEvidenceManifest(input: {
  locale: Pass588Locale;
  depth: Pass588AnalysisDepth;
  closeLabel: string | null;
  timestampLabel: string | null;
  range?: string;
  providerState: string;
  ageSeconds: number | null;
  coverageScore: number;
  cadenceSeconds: number | null;
  visibleRangePercent: number | null;
  volumeRatio: number | null;
  continuityState: string;
  continuityScore: number;
  failoverMode: string;
  comparisonState: string;
  matchRate: number | null;
  medianDivergenceBps: number | null;
  directionAgreement: number | null;
  maximumDivergenceBps: number | null;
  gapCount: number;
  duplicateCount: number;
  cadenceShiftCount: number;
  confidenceCap: number | null;
}): Pass588ChartEvidenceManifest {
  const c = labels[input.locale];
  const all: Pass588EvidenceField[] = [
    field("close", c.close, input.closeLabel, "primary", "Selected source candle close.", c.missing),
    field("time", c.time, input.timestampLabel, "primary", "Selected source candle timestamp.", c.missing),
    field("interval", c.interval, input.range?.toUpperCase(), "runtime", "Requested chart interval.", c.missing),
    field("provider", c.provider, translateState(c.states, input.providerState), "runtime", "Freshness-aware provider runtime state.", c.missing),
    field("freshness", c.freshness, input.ageSeconds === null ? null : `${Math.round(input.ageSeconds)}${c.seconds}`, "runtime", "Age of the latest verified candle.", c.missing),
    field("coverage", c.coverage, `${input.coverageScore}%`, "runtime", "Observed history against the minimum chart budget.", c.missing),
    field("cadence", c.cadence, input.cadenceSeconds === null ? null : `${Math.round(input.cadenceSeconds)}${c.seconds}`, "runtime", "Median positive timestamp interval.", c.missing),
    field("visible-range", c.visibleRange, input.visibleRangePercent === null ? null : `${input.visibleRangePercent.toFixed(2)}%`, "primary", "High-low span of the visible source candles.", c.missing),
    field("volume-pulse", c.volumePulse, input.volumeRatio === null ? null : `${input.volumeRatio.toFixed(2)}×`, "primary", "Selected volume against visible median volume.", c.missing),
    field("continuity", c.continuity, `${translateState(c.states, input.continuityState)} · ${input.continuityScore}%`, "continuity", "Order, duplicates, gaps and cadence audit.", c.missing, input.continuityState === "healthy" ? "confirmed" : "limited"),
    field("failover", c.failover, translateState(c.states, input.failoverMode), "runtime", "Current primary/standby route state.", c.missing, input.failoverMode === "blocked" ? "limited" : "confirmed"),
    field("consensus", c.consensus, translateState(c.states, input.comparisonState), "comparison", "Timestamp-matched source comparison state.", c.missing, input.comparisonState === "aligned" ? "confirmed" : "limited"),
    field("match-rate", c.matchRate, input.matchRate === null ? null : `${input.matchRate}%`, "comparison", "Share of bars matched at exact timestamps.", c.missing),
    field("median-divergence", c.medianDivergence, input.medianDivergenceBps === null ? null : `${input.medianDivergenceBps.toFixed(1)} bps`, "comparison", "Median close-price divergence on matched bars.", c.missing),
    field("direction-agreement", c.directionAgreement, input.directionAgreement === null ? null : `${input.directionAgreement}%`, "comparison", "Agreement of matched bar-to-bar directions.", c.missing),
    field("max-divergence", c.maxDivergence, input.maximumDivergenceBps === null ? null : `${input.maximumDivergenceBps.toFixed(1)} bps`, "comparison", "Maximum observed matched close divergence.", c.missing),
    field("gaps", c.gaps, input.gapCount, "continuity", "Detected intervals above the expected cadence.", c.missing, input.gapCount === 0 ? "confirmed" : "limited"),
    field("duplicates", c.duplicates, input.duplicateCount, "continuity", "Duplicate open times collapsed before render.", c.missing, input.duplicateCount === 0 ? "confirmed" : "limited"),
    field("cadence-shifts", c.cadenceShifts, input.cadenceShiftCount, "continuity", "Non-gap cadence deviations.", c.missing, input.cadenceShiftCount === 0 ? "confirmed" : "limited"),
    field("confidence-cap", c.confidenceCap, input.confidenceCap === null ? null : `${input.confidenceCap}%`, "runtime", "Maximum confidence allowed by route and source quality.", c.missing),
  ];

  const budget = BUDGET[input.depth];
  const fields = all.slice(0, budget);
  const ids = new Set(fields.map((item) => item.id));
  const confirmedCount = fields.filter((item) => item.state === "confirmed").length;
  const limitedCount = fields.filter((item) => item.state === "limited").length;
  const missingCount = fields.filter((item) => item.state === "missing").length;
  const sourceCoverage = Array.from(new Set(fields.map((item) => item.sourceId)));

  return {
    version: "pass588-chart-evidence-manifest",
    depth: input.depth,
    fieldBudget: budget,
    fields,
    confirmedCount,
    limitedCount,
    missingCount,
    distinctFieldCount: ids.size,
    sourceCoverage,
    status: ids.size === budget && missingCount === 0 ? "complete" : "limited",
    boundary:
      "Every visible field has a distinct ID and an explicit evidence source. Missing values remain missing instead of being replaced with repeated narrative.",
  };
}
