import type { AdvancedMarketCandle } from "@/components/market-integrity/AdvancedMarketChart";

export type Pass498ChartInsight = {
  version: "pass498-chart-insight-runtime";
  direction: "up" | "down" | "flat";
  change: number;
  changePercent: number;
  rangeHigh: number;
  rangeLow: number;
  rangePercent: number;
  volumeRatio: number | null;
};

export function buildPass498ChartInsight(
  candle: AdvancedMarketCandle,
  previous: AdvancedMarketCandle | undefined,
  visible: AdvancedMarketCandle[],
): Pass498ChartInsight {
  const change = previous ? candle.close - previous.close : candle.close - candle.open;
  const base = previous?.close || candle.open || 1;
  const changePercent = base === 0 ? 0 : (change / base) * 100;
  const rangeHigh = Math.max(...visible.map((item) => item.high));
  const rangeLow = Math.min(...visible.map((item) => item.low));
  const rangePercent = rangeLow === 0 ? 0 : ((rangeHigh - rangeLow) / Math.abs(rangeLow)) * 100;
  const volumes = visible.map((item) => item.volume).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const averageVolume = volumes.length ? volumes.reduce((sum, value) => sum + value, 0) / volumes.length : null;
  const volumeRatio = averageVolume && candle.volume ? candle.volume / averageVolume : null;
  return {
    version: "pass498-chart-insight-runtime",
    direction: Math.abs(changePercent) < 0.02 ? "flat" : change > 0 ? "up" : "down",
    change,
    changePercent,
    rangeHigh,
    rangeLow,
    rangePercent,
    volumeRatio,
  };
}
