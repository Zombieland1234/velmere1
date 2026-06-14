import type { AdvancedMarketCandle } from "@/components/market-integrity/AdvancedMarketChart";
import type { Pass503ProviderState } from "./pass503-provider-state-runtime";

export type Pass511ChartRegimeLens = {
  version: "pass511-chart-regime-lens";
  trend: "up" | "down" | "flat";
  regime: "expansion" | "compression" | "balanced";
  closeChangePercent: number;
  medianRangePercent: number;
  selectedRangePercent: number;
  selectedBodyShare: number;
  volumePercentile: number | null;
  visibleBars: number;
  trustworthy: boolean;
};

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function rangePercent(candle: AdvancedMarketCandle) {
  const base = Math.max(Math.abs(candle.open), 0.0000001);
  return ((candle.high - candle.low) / base) * 100;
}

export function buildPass511ChartRegimeLens(
  visible: AdvancedMarketCandle[],
  selected: AdvancedMarketCandle,
  providerState: Pass503ProviderState,
): Pass511ChartRegimeLens {
  const first = visible[0] ?? selected;
  const closeChangePercent = first.close === 0 ? 0 : ((selected.close - first.close) / Math.abs(first.close)) * 100;
  const ranges = visible.map(rangePercent).filter(Number.isFinite);
  const medianRangePercent = median(ranges);
  const selectedRangePercent = rangePercent(selected);
  const selectedBodyShare = selected.high === selected.low
    ? 0
    : (Math.abs(selected.close - selected.open) / Math.abs(selected.high - selected.low)) * 100;
  const volumes = visible
    .map((item) => item.volume)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const volumePercentile = typeof selected.volume === "number" && volumes.length
    ? Math.round((volumes.filter((value) => value <= selected.volume!).length / volumes.length) * 100)
    : null;
  const ratio = medianRangePercent > 0 ? selectedRangePercent / medianRangePercent : 1;
  return {
    version: "pass511-chart-regime-lens",
    trend: Math.abs(closeChangePercent) < 0.25 ? "flat" : closeChangePercent > 0 ? "up" : "down",
    regime: ratio >= 1.35 ? "expansion" : ratio <= 0.72 ? "compression" : "balanced",
    closeChangePercent,
    medianRangePercent,
    selectedRangePercent,
    selectedBodyShare,
    volumePercentile,
    visibleBars: visible.length,
    trustworthy: providerState === "live" || providerState === "partial",
  };
}
