export type Pass590Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type Pass590ContinuityIssue = {
  id: string;
  type:
    | "invalid_ohlc"
    | "duplicate_timestamp"
    | "reversed_input"
    | "gap"
    | "cadence_shift";
  severity: "info" | "watch" | "block";
  timestamp: number | null;
  detail: string;
};

export type Pass590CandleContinuityLedger<T extends Pass590Candle = Pass590Candle> = {
  version: "pass590-candle-continuity-ledger";
  state: "healthy" | "watch" | "blocked";
  candles: T[];
  inputCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  reversedInputCount: number;
  gapCount: number;
  estimatedMissingBars: number;
  cadenceShiftCount: number;
  expectedCadenceSeconds: number | null;
  continuityScore: number;
  issues: Pass590ContinuityIssue[];
  headline: string;
  boundary: string;
};

const RANGE_CADENCE_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14_400,
  "1d": 86_400,
  "1w": 604_800,
};

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function isValidCandle(candle: Pass590Candle) {
  const values = [
    candle.timestamp,
    candle.open,
    candle.high,
    candle.low,
    candle.close,
  ];
  if (!values.every(Number.isFinite)) return false;
  const highestBody = Math.max(candle.open, candle.close, candle.low);
  const lowestBody = Math.min(candle.open, candle.close, candle.high);
  return (
    candle.timestamp > 0 &&
    candle.high >= candle.low &&
    candle.high >= highestBody &&
    candle.low <= lowestBody
  );
}

function normalizeRange(range?: string) {
  return (range || "").trim().toLowerCase();
}

export function buildPass590CandleContinuityLedger<
  T extends Pass590Candle,
>(candles: T[], range?: string): Pass590CandleContinuityLedger<T> {
  const issues: Pass590ContinuityIssue[] = [];
  let reversedInputCount = 0;
  for (let index = 1; index < candles.length; index += 1) {
    if (candles[index].timestamp < candles[index - 1].timestamp) {
      reversedInputCount += 1;
    }
  }
  if (reversedInputCount) {
    issues.push({
      id: "input-order",
      type: "reversed_input",
      severity: "watch",
      timestamp: null,
      detail: `${reversedInputCount} input transition(s) arrived in reversed timestamp order and were sorted before render.`,
    });
  }

  const validInput: T[] = [];
  candles.forEach((candle, index) => {
    if (isValidCandle(candle)) {
      validInput.push(candle);
      return;
    }
    issues.push({
      id: `invalid-${index}-${candle.timestamp}`,
      type: "invalid_ohlc",
      severity: "block",
      timestamp: Number.isFinite(candle.timestamp) ? candle.timestamp : null,
      detail: "A candle with non-finite or internally inconsistent OHLC values was excluded.",
    });
  });

  const byTimestamp = new Map<number, T>();
  let duplicateCount = 0;
  validInput.forEach((candle) => {
    if (byTimestamp.has(candle.timestamp)) duplicateCount += 1;
    // Last provider observation wins for the same open time.
    byTimestamp.set(candle.timestamp, candle);
  });
  if (duplicateCount) {
    issues.push({
      id: "duplicate-timestamps",
      type: "duplicate_timestamp",
      severity: "watch",
      timestamp: null,
      detail: `${duplicateCount} duplicate timestamp(s) were collapsed; the latest observation for each open time was retained.`,
    });
  }

  const clean = Array.from(byTimestamp.values()).sort(
    (left, right) => left.timestamp - right.timestamp,
  );
  const deltas = clean
    .slice(1)
    .map((item, index) => item.timestamp - clean[index].timestamp)
    .filter((delta) => delta > 0);
  const declaredCadence = RANGE_CADENCE_SECONDS[normalizeRange(range)] ?? null;
  const observedCadence = median(
    deltas.filter((delta) =>
      declaredCadence ? delta <= declaredCadence * 2.2 : true,
    ),
  );
  const expectedCadenceSeconds = declaredCadence ?? observedCadence;

  let gapCount = 0;
  let estimatedMissingBars = 0;
  let cadenceShiftCount = 0;
  if (expectedCadenceSeconds) {
    deltas.forEach((delta, index) => {
      const timestamp = clean[index + 1]?.timestamp ?? null;
      const ratio = delta / expectedCadenceSeconds;
      if (ratio > 1.75) {
        gapCount += 1;
        const missing = Math.max(1, Math.round(ratio) - 1);
        estimatedMissingBars += missing;
        if (issues.length < 24) {
          issues.push({
            id: `gap-${timestamp}`,
            type: "gap",
            severity: ratio >= 4 ? "block" : "watch",
            timestamp,
            detail: `A ${Math.round(delta)}s interval implies about ${missing} missing candle(s) at the expected cadence.`,
          });
        }
      } else if (ratio < 0.72 || ratio > 1.28) {
        cadenceShiftCount += 1;
        if (issues.length < 24) {
          issues.push({
            id: `cadence-${timestamp}`,
            type: "cadence_shift",
            severity: "watch",
            timestamp,
            detail: `Observed cadence ${Math.round(delta)}s differs from the expected ${Math.round(expectedCadenceSeconds)}s interval.`,
          });
        }
      }
    });
  }

  const invalidCount = candles.length - validInput.length;
  const totalPenalty =
    invalidCount * 18 +
    duplicateCount * 4 +
    reversedInputCount * 2 +
    gapCount * 9 +
    Math.min(20, estimatedMissingBars * 2) +
    cadenceShiftCount * 3;
  const continuityScore = Math.max(0, Math.min(100, 100 - totalPenalty));
  const blocked =
    clean.length < 2 ||
    invalidCount >= Math.max(2, Math.ceil(candles.length * 0.25)) ||
    continuityScore < 45;
  const state: Pass590CandleContinuityLedger<T>["state"] = blocked
    ? "blocked"
    : continuityScore < 88 || issues.length > 0
      ? "watch"
      : "healthy";

  return {
    version: "pass590-candle-continuity-ledger",
    state,
    candles: clean,
    inputCount: candles.length,
    validCount: clean.length,
    invalidCount,
    duplicateCount,
    reversedInputCount,
    gapCount,
    estimatedMissingBars,
    cadenceShiftCount,
    expectedCadenceSeconds,
    continuityScore,
    issues,
    headline:
      state === "healthy"
        ? "Candle order and cadence are continuous."
        : state === "watch"
          ? "The chart remains readable, but continuity requires visible caution."
          : "The source history is not strong enough for an unrestricted chart claim.",
    boundary:
      "Only finite, internally consistent candles are rendered. Duplicate open times are collapsed and missing intervals are never interpolated.",
  };
}
