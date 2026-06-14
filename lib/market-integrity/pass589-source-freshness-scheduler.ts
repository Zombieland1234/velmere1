export type Pass589ProviderState = "live" | "stale" | "partial" | "offline";
export type Pass589Locale = "pl" | "de" | "en";

export type Pass589SourceFreshnessSchedule = {
  version: "pass589-source-freshness-scheduler";
  mode: "cadence_follow" | "stale_recovery" | "partial_fill" | "offline_backoff";
  state: Pass589ProviderState;
  delayMs: number;
  nextRefreshAt: number;
  freshnessBudgetSeconds: number;
  ageSeconds: number | null;
  progress: number | null;
  preserveConfirmedValues: true;
  headline: string;
  boundary: string;
};

const RANGE_FRESHNESS_SECONDS: Record<string, number> = {
  "1m": 180,
  "5m": 900,
  "15m": 2700,
  "30m": 5400,
  "1h": 10_800,
  "4h": 36_000,
  "1d": 194_400,
  "1w": 1_036_800,
};

const COPY = {
  pl: {
    live: "Następna kontrola świeżości podąża za deklarowaną kadencją świec.",
    stale: "Nieświeże dowody pozostają widoczne i są sprawdzane w szybszym rytmie odzyskiwania.",
    partial: "Potwierdzone świece pozostają widoczne, gdy system czeka na wystarczającą historię.",
    offline: "Źródło jest niedostępne, więc kolejne próby zwalniają bez czyszczenia potwierdzonych wartości.",
    boundary: "Kontrola świeżości może zmienić stan źródła, ale nigdy nie zastępuje potwierdzonych świec atrapami ani wymyślonymi wartościami.",
  },
  de: {
    live: "Die nächste Freshness-Prüfung folgt der deklarierten Kerzenkadenz.",
    stale: "Veraltete Evidenz bleibt sichtbar und wird in einem schnelleren Wiederherstellungsrhythmus geprüft.",
    partial: "Bestätigte Kerzen bleiben sichtbar, während das System auf ausreichende Historie wartet.",
    offline: "Die Quelle ist nicht verfügbar; weitere Versuche werden verlangsamt, ohne bestätigte Werte zu löschen.",
    boundary: "Eine Freshness-Prüfung kann den Quellenstatus ändern, ersetzt bestätigte Kerzen jedoch nie durch Platzhalter oder erfundene Werte.",
  },
  en: {
    live: "The next freshness check follows the declared candle cadence.",
    stale: "Stale evidence is retained and checked on a faster recovery rhythm.",
    partial: "Confirmed bars stay visible while the scheduler waits for enough history.",
    offline: "The source is unavailable, so retries back off without clearing confirmed values.",
    boundary: "A refresh tick may change freshness state, but it never replaces confirmed source candles with placeholders or fabricated values.",
  },
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRange(range?: string) {
  return (range || "1h").trim().toLowerCase();
}

function normalizeLocale(locale?: string): Pass589Locale {
  return locale === "de" || locale === "en" ? locale : "pl";
}

export function buildPass589SourceFreshnessSchedule(input: {
  state: Pass589ProviderState;
  ageSeconds: number | null;
  cadenceSeconds: number | null;
  range?: string;
  now?: number;
  locale?: Pass589Locale;
}): Pass589SourceFreshnessSchedule {
  const now = input.now ?? Date.now();
  const locale = normalizeLocale(input.locale);
  const c = COPY[locale];
  const freshnessBudgetSeconds =
    RANGE_FRESHNESS_SECONDS[normalizeRange(input.range)] ??
    RANGE_FRESHNESS_SECONDS["1h"];
  const cadenceSeconds =
    input.cadenceSeconds && input.cadenceSeconds > 0
      ? input.cadenceSeconds
      : freshnessBudgetSeconds / 3;

  let mode: Pass589SourceFreshnessSchedule["mode"];
  let delayMs: number;
  let headline: string;

  if (input.state === "live") {
    mode = "cadence_follow";
    const remainingSeconds =
      input.ageSeconds === null
        ? cadenceSeconds
        : Math.max(8, cadenceSeconds - (input.ageSeconds % cadenceSeconds));
    delayMs = clamp(remainingSeconds * 1000, 15_000, 120_000);
    headline = c.live;
  } else if (input.state === "stale") {
    mode = "stale_recovery";
    delayMs = clamp(cadenceSeconds * 250, 15_000, 60_000);
    headline = c.stale;
  } else if (input.state === "partial") {
    mode = "partial_fill";
    delayMs = clamp(cadenceSeconds * 500, 20_000, 90_000);
    headline = c.partial;
  } else {
    mode = "offline_backoff";
    delayMs = clamp(cadenceSeconds * 1000, 45_000, 300_000);
    headline = c.offline;
  }

  const progress =
    input.ageSeconds === null
      ? null
      : Math.round(
          clamp(input.ageSeconds / Math.max(freshnessBudgetSeconds, 1), 0, 1) *
            100,
        );

  return {
    version: "pass589-source-freshness-scheduler",
    mode,
    state: input.state,
    delayMs: Math.round(delayMs),
    nextRefreshAt: now + Math.round(delayMs),
    freshnessBudgetSeconds,
    ageSeconds: input.ageSeconds,
    progress,
    preserveConfirmedValues: true,
    headline,
    boundary: c.boundary,
  };
}
