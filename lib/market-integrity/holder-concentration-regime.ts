import type { TokenRiskResult } from "./risk-types";
import { buildHolderIntelligence } from "./holder-intelligence";

export type HolderConcentrationTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type HolderConcentrationRail = {
  id: "whales" | "labels" | "lp" | "team" | "unknown" | "freshness";
  label: string;
  value: string;
  tone: HolderConcentrationTone;
  note: string;
};

export type HolderConcentrationGate = {
  version: "velmere_holder_concentration_v1_pass272";
  status: "holder_gate" | "label_review" | "source_gap" | "calm_distribution";
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: HolderConcentrationRail[];
  blockers: string[];
  nextAction: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function finite(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toneFromScore(score: number): HolderConcentrationTone {
  if (score >= 74) return "red";
  if (score >= 54) return "amber";
  if (score >= 32) return "gold";
  return "green";
}

function compactPercent(value?: number, fallback = "source required") {
  if (!Number.isFinite(value)) return fallback;
  return `${Number(value).toFixed(value && Math.abs(value) < 10 ? 1 : 0)}%`;
}

function compactNumber(value?: number, fallback = "source required") {
  if (!Number.isFinite(value)) return fallback;
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value));
}

export function buildHolderConcentrationGate(result: TokenRiskResult): HolderConcentrationGate {
  const intelligence = buildHolderIntelligence(result);
  const top10 = finite(result.metrics.top10HolderPercent);
  const holderCount = finite(result.metrics.holderCount);
  const liquidity = finite(result.metrics.liquidityUsd);
  const marketCap = finite(result.metrics.marketCap);
  const fdvGap = finite(result.metrics.fdvToMarketCapRatio);
  const hasAddress = Boolean(result.token.tokenAddress && result.token.chainId);
  const unknownNode = intelligence.nodes.find((node) => node.id === "unknown");
  const whaleNode = intelligence.nodes.find((node) => node.id === "whales");
  const dexNode = intelligence.nodes.find((node) => node.id === "dex");
  const teamNode = intelligence.nodes.find((node) => node.id === "team");
  const liveNodes = intelligence.nodes.filter((node) => node.dataStatus === "live").length;
  const missingNodes = intelligence.nodes.filter((node) => node.dataStatus === "missing").length;
  const proxyNodes = intelligence.nodes.filter((node) => node.dataStatus === "proxy").length;
  const liquidityCoverage = marketCap && liquidity ? (liquidity / marketCap) * 100 : undefined;

  const whaleScore = clamp((whaleNode?.risk ?? 46) + (top10 && top10 > 55 ? 12 : 0));
  const labelScore = clamp(proxyNodes * 15 + missingNodes * 18 + (hasAddress ? 0 : 18));
  const lpScore = clamp(dexNode?.risk ?? (liquidityCoverage === undefined ? 54 : 28));
  const teamScore = clamp((teamNode?.risk ?? 36) + (fdvGap && fdvGap > 3 ? 12 : 0));
  const unknownScore = clamp(unknownNode?.risk ?? intelligence.dataUncertaintyPercent);
  const freshnessScore = result.dataQuality === "live" ? 18 : result.dataQuality === "partial" ? 48 : 68;
  const totalScore = Math.round(
    whaleScore * 0.24 +
      labelScore * 0.20 +
      lpScore * 0.18 +
      teamScore * 0.16 +
      unknownScore * 0.14 +
      freshnessScore * 0.08,
  );

  const blockers = [
    top10 === undefined ? "top-holder concentration" : null,
    holderCount === undefined ? "holder count" : null,
    hasAddress ? null : "contract address / chain id",
    "CEX/custody wallet labels",
    "team/treasury wallet labels",
    result.dataQuality !== "live" ? "live holder snapshot freshness" : null,
  ].filter(Boolean) as string[];

  const status =
    totalScore >= 70 || (top10 !== undefined && top10 >= 65)
      ? "holder_gate"
      : blockers.length >= 5 || missingNodes >= 3
        ? "source_gap"
        : totalScore >= 42 || proxyNodes >= 3
          ? "label_review"
          : "calm_distribution";

  const headline =
    status === "holder_gate"
      ? "holder concentration gate"
      : status === "source_gap"
        ? "holder source gap"
        : status === "label_review"
          ? "wallet-label review"
          : "holder map calm, verify labels";

  const nextAction =
    status === "holder_gate"
      ? "Open Pro/Advanced holder view and separate whales, CEX, LP and treasury before any public wording."
      : status === "source_gap"
        ? "Attach chain holder source and wallet labels; missing holders stay uncertainty, not safety."
        : status === "label_review"
          ? "Resolve CEX/custody/team labels before lowering concentration pressure."
          : "Keep holder lane visible and refresh source timestamp before stronger confidence copy.";

  return {
    version: "velmere_holder_concentration_v1_pass272",
    status,
    headline,
    trustBadge: `holder ${totalScore}/100`,
    operatorCue:
      status === "holder_gate"
        ? "A clean chart can still hide concentrated wallets; first split role labels, then read the score."
        : status === "source_gap"
          ? "Do not convert missing holder data into confidence. Treat gaps as review pressure."
          : status === "label_review"
            ? "The main question is not only who holds supply, but which wallets are custody, LP, treasury or related clusters."
            : "Distribution looks calmer under current inputs, but labels and freshness still decide trust.",
    rails: [
      {
        id: "whales",
        label: "whales",
        value: top10 !== undefined ? compactPercent(top10) : "proxy",
        tone: toneFromScore(whaleScore),
        note: top10 !== undefined ? "top 10 concentration" : "top-holder source needed",
      },
      {
        id: "labels",
        label: "labels",
        value: `${liveNodes}/${intelligence.nodes.length} live`,
        tone: toneFromScore(labelScore),
        note: `${proxyNodes} proxy · ${missingNodes} missing`,
      },
      {
        id: "lp",
        label: "LP/depth",
        value: liquidityCoverage !== undefined ? compactPercent(liquidityCoverage) : "missing",
        tone: toneFromScore(lpScore),
        note: "exit-liquidity coverage",
      },
      {
        id: "team",
        label: "team",
        value: fdvGap !== undefined ? `${fdvGap.toFixed(fdvGap < 10 ? 1 : 0)}x FDV` : "source required",
        tone: toneFromScore(teamScore),
        note: "treasury/unlock proxy",
      },
      {
        id: "unknown",
        label: "unclassified",
        value: `${intelligence.dataUncertaintyPercent}%`,
        tone: toneFromScore(unknownScore),
        note: "unclassified-wallet pressure",
      },
      {
        id: "freshness",
        label: "fresh",
        value: result.dataQuality,
        tone: toneFromScore(freshnessScore),
        note: `${compactNumber(holderCount)} holders`,
      },
    ],
    blockers,
    nextAction,
  };
}
