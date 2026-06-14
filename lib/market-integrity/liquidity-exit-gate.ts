import type { TokenRiskResult } from "./risk-types";

export type LiquidityExitGateTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type LiquidityExitGateStatus =
  | "exit_route_gate"
  | "depth_review"
  | "source_gap"
  | "calm_route";

export type LiquidityExitGateRail = {
  id: "spread" | "bidDepth" | "sellRoute" | "buyRoute" | "imbalance" | "source";
  label: string;
  value: string;
  tone: LiquidityExitGateTone;
  note: string;
};

export type LiquidityExitGateOrderBook = {
  bestBid?: number;
  bestAsk?: number;
  spreadPercent?: number;
  bidDepthUsd?: number;
  askDepthUsd?: number;
  bidAskImbalancePercent?: number;
  simulatedSellSlippage10k?: number;
  simulatedBuySlippage10k?: number;
  riskPoints?: number;
  bids?: unknown[];
  asks?: unknown[];
  source?: string;
};

export type LiquidityExitGate = {
  version: "velmere_liquidity_exit_gate_v1_pass273";
  status: LiquidityExitGateStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: LiquidityExitGateRail[];
  blockers: string[];
  nextAction: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function finite(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function formatUsd(value?: number) {
  const finiteValue = finite(value);
  if (finiteValue === undefined) return "missing";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: Math.abs(finiteValue) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(finiteValue);
}

function formatPercent(value?: number, fallback = "missing") {
  const finiteValue = finite(value);
  if (finiteValue === undefined) return fallback;
  const sign = finiteValue > 0 ? "+" : "";
  return `${sign}${finiteValue.toFixed(Math.abs(finiteValue) >= 10 ? 1 : 2)}%`;
}

function toneFromScore(score: number): LiquidityExitGateTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function depthStress(depth?: number, target = 10_000) {
  const value = finite(depth);
  if (value === undefined) return 54;
  if (value <= 0) return 90;
  if (value < target * 2) return 72;
  if (value < target * 8) return 44;
  if (value < target * 20) return 24;
  return 10;
}

function slippageStress(value?: number) {
  const slip = finite(value);
  if (slip === undefined) return 44;
  const abs = Math.abs(slip);
  if (abs > 15) return 88;
  if (abs > 8) return 68;
  if (abs > 3) return 42;
  if (abs > 1) return 22;
  return 10;
}

function spreadStress(value?: number) {
  const spread = finite(value);
  if (spread === undefined) return 38;
  if (spread > 2.5) return 82;
  if (spread > 1) return 58;
  if (spread > 0.4) return 34;
  return 11;
}

export function buildLiquidityExitGate(
  result: TokenRiskResult,
  orderbook?: LiquidityExitGateOrderBook | null,
): LiquidityExitGate {
  const hasOrderBook = Boolean(
    orderbook &&
      (orderbook.bidDepthUsd ||
        orderbook.askDepthUsd ||
        orderbook.bestBid ||
        orderbook.bestAsk ||
        orderbook.bids?.length ||
        orderbook.asks?.length),
  );
  const bidDepth = finite(orderbook?.bidDepthUsd);
  const askDepth = finite(orderbook?.askDepthUsd);
  const spread = finite(orderbook?.spreadPercent);
  const sellSlip = finite(orderbook?.simulatedSellSlippage10k ?? result.metrics.simulatedSlippage10k);
  const buySlip = finite(orderbook?.simulatedBuySlippage10k);
  const imbalance = finite(orderbook?.bidAskImbalancePercent ?? result.metrics.bidAskImbalancePercent);
  const liquidityUsd = finite(result.metrics.liquidityUsd);
  const liquidityToMarketCap = finite(result.metrics.liquidityToMarketCapPercent);
  const volumeToLiquidity = finite(result.metrics.volumeToLiquidityRatio);
  const bookRisk = finite(orderbook?.riskPoints) ?? 0;

  const visibleBidStress = depthStress(bidDepth, 10_000);
  const visibleAskStress = depthStress(askDepth, 10_000);
  const sellRouteStress = slippageStress(sellSlip);
  const buyRouteStress = slippageStress(buySlip);
  const spreadRouteStress = spreadStress(spread);
  const imbalanceStress = imbalance === undefined
    ? 34
    : Math.abs(imbalance) > 65
      ? 78
      : Math.abs(imbalance) > 42
        ? 56
        : Math.abs(imbalance) > 22
          ? 30
          : 12;
  const marketMetricStress = clamp(
    (liquidityUsd === undefined ? 14 : liquidityUsd < 150_000 ? 30 : liquidityUsd < 750_000 ? 16 : 5) +
      (liquidityToMarketCap === undefined ? 8 : liquidityToMarketCap < 0.25 ? 24 : liquidityToMarketCap < 0.75 ? 12 : 3) +
      (volumeToLiquidity === undefined ? 5 : volumeToLiquidity > 6 ? 24 : volumeToLiquidity > 3 ? 13 : 2),
  );
  const sourceStress = result.dataQuality === "live" ? 10 : result.dataQuality === "partial" ? 42 : 64;

  const totalScore = Math.round(clamp(
    visibleBidStress * 0.18 +
      visibleAskStress * 0.1 +
      sellRouteStress * 0.22 +
      buyRouteStress * 0.1 +
      spreadRouteStress * 0.12 +
      imbalanceStress * 0.1 +
      marketMetricStress * 0.1 +
      bookRisk * 0.12 +
      sourceStress * 0.06,
  ));

  const blockers = [
    !hasOrderBook ? "live order book snapshot" : null,
    bidDepth === undefined ? "bid-side exit depth" : null,
    sellSlip === undefined ? "$10k sell slippage simulation" : null,
    spread === undefined ? "spread measurement" : null,
    result.dataQuality !== "live" ? "fresh source timestamp" : null,
    !result.token.pairAddress ? "pair/pool address for route replay" : null,
  ].filter((item): item is string => Boolean(item));

  const status: LiquidityExitGateStatus =
    totalScore >= 70 || (sellRouteStress >= 68 && visibleBidStress >= 58)
      ? "exit_route_gate"
      : blockers.length >= 4
        ? "source_gap"
        : totalScore >= 44
          ? "depth_review"
          : "calm_route";

  const headline =
    status === "exit_route_gate"
      ? "exit route gate active"
      : status === "source_gap"
        ? "exit route source gap"
        : status === "depth_review"
          ? "depth route needs review"
          : "route looks calmer, verify depth";

  const operatorCue =
    status === "exit_route_gate"
      ? "Do not let the displayed price outrun executable depth: check spread, bid wall and sell-route stress before any summary."
      : status === "source_gap"
        ? "Missing order-book data is uncertainty, not confidence. Keep Basic/Pro/Advanced wording soft until route proof is attached."
        : status === "depth_review"
          ? "Visible depth is not the same as safe execution. Compare sell-route and bid-side pressure before lowering review priority."
          : "Depth looks calmer under current inputs, but route freshness and pair proof still decide the public readout.";

  const nextAction =
    status === "exit_route_gate"
      ? "Open Pro/Advanced depth view, request multi-source orderbook snapshot and keep report/export locked until route proof is reviewed."
      : status === "source_gap"
        ? "Attach orderbook source, pair address and slippage simulation before strong customer-facing copy."
        : status === "depth_review"
          ? "Replay $10k/$50k route and compare visible bid/ask depth against liquidity and volume pressure."
          : "Refresh orderbook timestamp and keep the exit gate visible as a trust cue, not a trade signal.";

  return {
    version: "velmere_liquidity_exit_gate_v1_pass273",
    status,
    headline,
    trustBadge: `exit ${totalScore}/100`,
    operatorCue,
    blockers,
    nextAction,
    rails: [
      {
        id: "spread",
        label: "spread",
        value: formatPercent(spread),
        tone: toneFromScore(spreadRouteStress),
        note: hasOrderBook ? "price gap" : "book missing",
      },
      {
        id: "bidDepth",
        label: "bid depth",
        value: formatUsd(bidDepth),
        tone: toneFromScore(visibleBidStress),
        note: "visible exit wall",
      },
      {
        id: "sellRoute",
        label: "sell 10k",
        value: formatPercent(sellSlip),
        tone: toneFromScore(sellRouteStress),
        note: "route impact simulation",
      },
      {
        id: "buyRoute",
        label: "buy 10k",
        value: formatPercent(buySlip),
        tone: toneFromScore(buyRouteStress),
        note: "entry impact context",
      },
      {
        id: "imbalance",
        label: "imbalance",
        value: formatPercent(imbalance),
        tone: toneFromScore(imbalanceStress),
        note: "bid/ask pressure",
      },
      {
        id: "source",
        label: "source",
        value: hasOrderBook ? orderbook?.source ?? "orderbook" : result.dataQuality,
        tone: toneFromScore(sourceStress),
        note: blockers.length ? `${blockers.length} blockers` : "freshness gate",
      },
    ],
  };
}
