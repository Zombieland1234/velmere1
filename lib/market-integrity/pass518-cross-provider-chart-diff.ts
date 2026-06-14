import type { AdvancedMarketCandle } from "@/components/market-integrity/AdvancedMarketChart";

export type Pass518ComparisonSummary = {
  secondarySource?: string | null;
  state?: string | null;
  priceDivergenceBps?: number | null;
  freshnessDeltaSeconds?: number | null;
  directPriceComparable?: boolean;
};

export type Pass518CrossProviderChartDiff = {
  version: "pass518-cross-provider-chart-diff";
  state: "aligned" | "watch" | "divergent" | "single_source" | "unavailable";
  secondarySource: string | null;
  matchedBars: number;
  matchRate: number;
  medianCloseDivergenceBps: number | null;
  maximumCloseDivergenceBps: number | null;
  directionAgreement: number | null;
  freshnessDeltaSeconds: number | null;
  source: "candles" | "provider_summary" | "none";
  explanation: string;
  boundary: string;
};

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function normalizeState(value?: string | null): Pass518CrossProviderChartDiff["state"] {
  if (value === "aligned") return "aligned";
  if (value === "divergent") return "divergent";
  if (value === "watch" || value === "stale") return "watch";
  if (value === "single_source") return "single_source";
  return "unavailable";
}

export function buildPass518CrossProviderChartDiff(
  primary: AdvancedMarketCandle[],
  secondary: AdvancedMarketCandle[] | undefined,
  summary?: Pass518ComparisonSummary | null,
): Pass518CrossProviderChartDiff {
  if (secondary && secondary.length > 1) {
    const secondaryByTime = new Map(secondary.map((item) => [item.timestamp, item]));
    const matched = primary.flatMap((item) => {
      const peer = secondaryByTime.get(item.timestamp);
      return peer ? [{ primary: item, secondary: peer }] : [];
    });
    const divergences = matched.map(({ primary: left, secondary: right }) => {
      const basis = Math.max(Math.abs(left.close), Math.abs(right.close), 1e-9);
      return (Math.abs(left.close - right.close) / basis) * 10_000;
    });
    const directionPairs = matched.slice(1).map((pair, index) => {
      const previous = matched[index];
      const leftDirection = Math.sign(pair.primary.close - previous.primary.close);
      const rightDirection = Math.sign(pair.secondary.close - previous.secondary.close);
      return leftDirection === rightDirection;
    });
    const medianBps = median(divergences);
    const maximumBps = divergences.length ? Math.max(...divergences) : null;
    const directionAgreement = directionPairs.length
      ? Math.round((directionPairs.filter(Boolean).length / directionPairs.length) * 100)
      : null;
    const matchRate = Math.round((matched.length / Math.max(primary.length, secondary.length, 1)) * 100);
    const state: Pass518CrossProviderChartDiff["state"] =
      medianBps === null ? "unavailable" : medianBps <= 18 && matchRate >= 70 ? "aligned" : medianBps <= 65 ? "watch" : "divergent";
    return {
      version: "pass518-cross-provider-chart-diff",
      state,
      secondarySource: summary?.secondarySource?.trim() || "secondary provider",
      matchedBars: matched.length,
      matchRate,
      medianCloseDivergenceBps: medianBps === null ? null : Math.round(medianBps * 10) / 10,
      maximumCloseDivergenceBps: maximumBps === null ? null : Math.round(maximumBps * 10) / 10,
      directionAgreement,
      freshnessDeltaSeconds: summary?.freshnessDeltaSeconds ?? null,
      source: "candles",
      explanation: "The comparison is calculated from timestamp-matched source candles and measures price-path agreement, not future performance.",
      boundary: "Only matched source bars are compared. Missing secondary bars remain missing and are not interpolated.",
    };
  }

  if (summary && typeof summary.priceDivergenceBps === "number") {
    return {
      version: "pass518-cross-provider-chart-diff",
      state: normalizeState(summary.state),
      secondarySource: summary.secondarySource?.trim() || null,
      matchedBars: 0,
      matchRate: 0,
      medianCloseDivergenceBps: Math.round(summary.priceDivergenceBps * 10) / 10,
      maximumCloseDivergenceBps: null,
      directionAgreement: null,
      freshnessDeltaSeconds: summary.freshnessDeltaSeconds ?? null,
      source: "provider_summary",
      explanation: summary.directPriceComparable === false
        ? "The provider summary is visible, but direct price comparison is limited by a different quote basis."
        : "The provider adapter supplied a point-in-time venue divergence summary without a second candle series.",
      boundary: "A provider summary is not a candle-by-candle comparison and is labelled separately.",
    };
  }

  return {
    version: "pass518-cross-provider-chart-diff",
    state: primary.length > 1 ? "single_source" : "unavailable",
    secondarySource: summary?.secondarySource?.trim() || null,
    matchedBars: 0,
    matchRate: 0,
    medianCloseDivergenceBps: null,
    maximumCloseDivergenceBps: null,
    directionAgreement: null,
    freshnessDeltaSeconds: summary?.freshnessDeltaSeconds ?? null,
    source: "none",
    explanation: "No verified secondary candle stream or provider divergence summary is attached.",
    boundary: "Single-source mode cannot claim cross-provider consensus.",
  };
}
