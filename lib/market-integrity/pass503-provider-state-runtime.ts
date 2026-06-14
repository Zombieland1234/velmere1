import type { AdvancedMarketCandle } from "@/components/market-integrity/AdvancedMarketChart";

export type Pass503ProviderState = "live" | "stale" | "partial" | "offline";

export type Pass503ProviderRuntime = {
  version: "pass503-provider-state-runtime";
  state: Pass503ProviderState;
  latestTimestamp: number | null;
  ageSeconds: number | null;
  candleCount: number;
  coverageScore: number;
  cadenceSeconds: number | null;
  sourceLabel: string;
  reason: string;
};

const rangeFreshnessLimit: Record<string, number> = {
  "1h": 60 * 60 * 3,
  "4h": 60 * 60 * 10,
  "1d": 60 * 60 * 54,
  "1w": 60 * 60 * 24 * 12,
};

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function buildPass503ProviderRuntime(
  candles: AdvancedMarketCandle[],
  source: string | undefined,
  range: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): Pass503ProviderRuntime {
  const clean = candles
    .filter((item) => Number.isFinite(item.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp);
  const latestTimestamp = clean.at(-1)?.timestamp ?? null;
  const ageSeconds = latestTimestamp === null ? null : Math.max(0, nowSeconds - latestTimestamp);
  const deltas = clean.slice(1).map((item, index) => Math.max(1, item.timestamp - clean[index].timestamp));
  const cadenceSeconds = median(deltas);
  const expectedMinimum = 24;
  const coverageScore = Math.max(0, Math.min(100, Math.round((clean.length / expectedMinimum) * 100)));
  const normalizedRange = (range || "1h").toLowerCase();
  const freshnessLimit = rangeFreshnessLimit[normalizedRange] ?? rangeFreshnessLimit["1h"];

  let state: Pass503ProviderState;
  let reason: string;
  if (!source || clean.length < 2 || latestTimestamp === null) {
    state = "offline";
    reason = "No verified source candle stream is available.";
  } else if (clean.length < 12) {
    state = "partial";
    reason = "The source is connected, but the visible history is too short for a stable readout.";
  } else if ((ageSeconds ?? Number.POSITIVE_INFINITY) > freshnessLimit) {
    state = "stale";
    reason = "The latest source candle is older than the freshness budget for this interval.";
  } else {
    state = "live";
    reason = "Source candles are present, ordered and inside the interval freshness budget.";
  }

  return {
    version: "pass503-provider-state-runtime",
    state,
    latestTimestamp,
    ageSeconds,
    candleCount: clean.length,
    coverageScore,
    cadenceSeconds,
    sourceLabel: source?.trim() || "unavailable",
    reason,
  };
}
