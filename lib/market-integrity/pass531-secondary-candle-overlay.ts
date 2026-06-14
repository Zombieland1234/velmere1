import type { AdvancedMarketCandle } from "@/components/market-integrity/AdvancedMarketChart";

export type Pass531OverlayPoint = {
  primaryIndex: number;
  timestamp: number;
  primaryClose: number;
  secondaryClose: number;
  plotValue: number;
};

export type Pass531SecondaryCandleOverlay = {
  version: "pass531-secondary-candle-overlay";
  state: "ready" | "limited" | "unavailable";
  sourceLabel: string | null;
  scaleMode: "isolated_secondary_price" | "normalized_index";
  points: Pass531OverlayPoint[];
  matchRate: number;
  lowerBound: number | null;
  upperBound: number | null;
  selectedUnit: string;
  explanation: string;
  boundary: string;
};

function finitePositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function buildPass531SecondaryCandleOverlay(
  visiblePrimary: AdvancedMarketCandle[],
  secondary: AdvancedMarketCandle[],
  sourceLabel?: string | null,
  directPriceComparable = true,
): Pass531SecondaryCandleOverlay {
  const secondaryByTimestamp = new Map(
    secondary
      .filter(
        (item) => Number.isFinite(item.timestamp) && finitePositive(item.close),
      )
      .map((item) => [item.timestamp, item] as const),
  );
  const matched = visiblePrimary.flatMap((primary, primaryIndex) => {
    const peer = secondaryByTimestamp.get(primary.timestamp);
    if (!peer || !finitePositive(primary.close)) return [];
    return [{ primaryIndex, primary, peer }];
  });

  const matchRate = Math.round(
    (matched.length / Math.max(visiblePrimary.length, 1)) * 100,
  );
  if (matched.length < 2) {
    return {
      version: "pass531-secondary-candle-overlay",
      state: "unavailable",
      sourceLabel: sourceLabel?.trim() || null,
      scaleMode: directPriceComparable
        ? "isolated_secondary_price"
        : "normalized_index",
      points: [],
      matchRate,
      lowerBound: null,
      upperBound: null,
      selectedUnit: directPriceComparable ? "price" : "index",
      explanation:
        "A second source is attached, but fewer than two timestamp-matched bars are available in the visible window.",
      boundary:
        "The overlay never interpolates or manufactures missing secondary candles.",
    };
  }

  const base = matched[0].peer.close;
  const scaleMode: Pass531SecondaryCandleOverlay["scaleMode"] =
    directPriceComparable ? "isolated_secondary_price" : "normalized_index";
  const points = matched.map(({ primaryIndex, primary, peer }) => ({
    primaryIndex,
    timestamp: primary.timestamp,
    primaryClose: primary.close,
    secondaryClose: peer.close,
    plotValue:
      scaleMode === "normalized_index" ? (peer.close / base) * 100 : peer.close,
  }));
  const values = points.map((point) => point.plotValue);
  const rawLow = Math.min(...values);
  const rawHigh = Math.max(...values);
  const padding = Math.max(
    (rawHigh - rawLow) * 0.08,
    Math.abs(rawHigh) * 0.001,
    0.000001,
  );
  const state: Pass531SecondaryCandleOverlay["state"] =
    matchRate >= 55 ? "ready" : "limited";

  return {
    version: "pass531-secondary-candle-overlay",
    state,
    sourceLabel: sourceLabel?.trim() || "secondary provider",
    scaleMode,
    points,
    matchRate,
    lowerBound: rawLow - padding,
    upperBound: rawHigh + padding,
    selectedUnit:
      scaleMode === "normalized_index" ? "index 100" : "isolated price",
    explanation:
      scaleMode === "normalized_index"
        ? "The second feed is rebased to index 100 because its quote basis is not declared directly comparable."
        : "The second feed uses an isolated price scale so it cannot distort the primary candlestick axis.",
    boundary:
      "Only exact timestamp matches are drawn. Missing bars stay missing and the primary scale is never altered by the overlay.",
  };
}
