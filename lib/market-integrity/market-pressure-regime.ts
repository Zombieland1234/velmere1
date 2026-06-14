import type { TokenAssetRegime } from "./asset-regime";
import type { RiskSignalId, TokenRiskResult } from "./risk-types";

export type MarketPressureRailTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type MarketPressureRail = {
  id: "float" | "unlock" | "depth" | "hype";
  label: string;
  value: string;
  tone: MarketPressureRailTone;
  note: string;
};

export type MarketPressureRegime = {
  version: "velmere_market_pressure_v2_pass327_no_public_trust_chip";
  status: "anti_fomo_gate" | "review_pressure" | "source_gap" | "calm_prescreen";
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: MarketPressureRail[];
  blockers: string[];
};

const PRESSURE_SIGNAL_IDS = new Set<RiskSignalId>([
  "rapid_intraday_move",
  "parabolic_24h_gain",
  "parabolic_7d_gain",
  "parabolic_30d_gain",
  "multi_timeframe_pump",
  "new_ath_repricing",
  "volume_spike",
  "wash_trading_risk",
  "thin_liquidity",
  "very_thin_liquidity",
  "low_dex_liquidity",
  "orderbook_depth_collapse",
  "orderbook_slippage_risk",
  "orderbook_imbalance",
  "fdv_marketcap_gap",
  "supply_overhang",
]);

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function compactPercent(value?: number, fallback = "source required") {
  if (!Number.isFinite(value)) return fallback;
  return `${Number(value).toFixed(value && Math.abs(value) < 10 ? 1 : 0)}%`;
}

function hasSignal(result: TokenRiskResult, ids: RiskSignalId[]) {
  const wanted = new Set(ids);
  return result.signals.some((signal) => wanted.has(signal.id));
}

function supplyCirculationPercent(result: TokenRiskResult) {
  const circulating = result.metrics.circulatingSupply;
  const total = result.metrics.totalSupply ?? result.metrics.maxSupply;
  if (!circulating || !total || total <= 0) return undefined;
  return clamp((circulating / total) * 100, 0, 100);
}

function toneFromScore(score: number): MarketPressureRailTone {
  if (score >= 74) return "red";
  if (score >= 54) return "amber";
  if (score >= 32) return "gold";
  return "green";
}

export function buildMarketPressureRegime(
  result: TokenRiskResult,
  assetRegime: TokenAssetRegime,
): MarketPressureRegime {
  const circulatingPercent = supplyCirculationPercent(result);
  const fdvGap = result.metrics.fdvToMarketCapRatio;
  const liquidityPercent = result.metrics.liquidityToMarketCapPercent;
  const flowRatio = result.metrics.volumeToMarketCapRatio ?? 0;
  const pressureSignals = result.signals.filter((signal) => PRESSURE_SIGNAL_IDS.has(signal.id));
  const parabolicSignal = hasSignal(result, [
    "rapid_intraday_move",
    "parabolic_24h_gain",
    "parabolic_7d_gain",
    "parabolic_30d_gain",
    "multi_timeframe_pump",
    "new_ath_repricing",
    "volume_spike",
  ]);
  const thinLiquidity = hasSignal(result, [
    "thin_liquidity",
    "very_thin_liquidity",
    "low_dex_liquidity",
    "orderbook_depth_collapse",
    "orderbook_slippage_risk",
  ]);
  const unlockOverhang = hasSignal(result, ["fdv_marketcap_gap", "supply_overhang"]);

  const floatScore = clamp(
    (circulatingPercent === undefined ? 46 : 100 - circulatingPercent) +
      (fdvGap && fdvGap > 2 ? Math.min(34, fdvGap * 6) : 0),
  );
  const unlockScore = clamp(
    (unlockOverhang ? 54 : 22) +
      (fdvGap && fdvGap > 3 ? Math.min(35, fdvGap * 5) : 0) +
      (assetRegime.id === "alt_market" ? 10 : 0),
  );
  const depthScore = clamp(
    (thinLiquidity ? 58 : 20) +
      (liquidityPercent !== undefined ? Math.max(0, 28 - liquidityPercent * 4) : 18) +
      Math.min(20, Math.abs(flowRatio) * 80),
  );
  const hypeScore = clamp(
    (parabolicSignal ? 62 : 18) +
      Math.min(30, pressureSignals.length * 7) +
      Math.min(18, Math.abs(result.metrics.priceChange24h ?? 0) * 0.6),
  );
  const sourceGapScore = result.dataQuality === "live" ? 12 : result.dataQuality === "partial" ? 42 : 64;
  const totalPressure = Math.round(
    floatScore * 0.22 + unlockScore * 0.24 + depthScore * 0.26 + hypeScore * 0.18 + sourceGapScore * 0.1,
  );

  const blockers = [
    circulatingPercent === undefined ? "circulating float source" : null,
    fdvGap === undefined ? "FDV / market-cap gap" : null,
    liquidityPercent === undefined ? "liquidity depth source" : null,
    result.dataQuality !== "live" ? "live source freshness" : null,
  ].filter(Boolean) as string[];

  const status =
    totalPressure >= 68 || (parabolicSignal && thinLiquidity)
      ? "anti_fomo_gate"
      : blockers.length >= 3
        ? "source_gap"
        : totalPressure >= 44
          ? "review_pressure"
          : "calm_prescreen";

  const headline =
    status === "anti_fomo_gate"
      ? "anti-FOMO gate active"
      : status === "source_gap"
        ? "source gap slows verdict"
        : status === "review_pressure"
          ? "pressure map needs review"
          : "calm prescreen, verify sources";

  return {
    version: "velmere_market_pressure_v2_pass327_no_public_trust_chip",
    status,
    headline,
    trustBadge: `pressure ${totalPressure}/100`,
    operatorCue:
      status === "anti_fomo_gate"
        ? "Do not let a fast chart outrun float, unlock and exit-liquidity proof."
        : status === "source_gap"
          ? "Keep the public readout soft until float, depth and freshness sources are attached."
          : status === "review_pressure"
            ? "Compare pressure rails before opening Pro or Advanced review."
            : "Use Basic for a quick scan, then verify source freshness before stronger copy.",
    blockers,
    rails: [
      {
        id: "float",
        label: "float",
        value: compactPercent(circulatingPercent, "source gap"),
        tone: toneFromScore(floatScore),
        note: circulatingPercent === undefined ? "float not proven" : "circulating supply ratio",
      },
      {
        id: "unlock",
        label: "unlock",
        value: fdvGap ? `${fdvGap.toFixed(fdvGap < 10 ? 1 : 0)}x FDV` : "OSINT",
        tone: toneFromScore(unlockScore),
        note: unlockOverhang ? "overhang review" : "vesting proof needed",
      },
      {
        id: "depth",
        label: "depth",
        value: liquidityPercent !== undefined ? compactPercent(liquidityPercent) : "no book",
        tone: toneFromScore(depthScore),
        note: thinLiquidity ? "exit pressure" : "liquidity proof lane",
      },
      {
        id: "hype",
        label: "hype",
        value: pressureSignals.length ? `${pressureSignals.length} flags` : "quiet",
        tone: toneFromScore(hypeScore),
        note: parabolicSignal ? "momentum is not proof" : "no hype flag dominates",
      },
    ],
  };
}
