import type { VelmereSearchResult, VelmereSearchSourceMode } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";

export const PASS294_TRUST_SIGNAL_FEED_GATE = true;

export type TrustSignalFeedSurface = SocialExchangeSurface | "lens_results";

export type TrustSignalLane = {
  id: "exchange_depth" | "social_context" | "source_quorum" | "operator_boundary" | "anti_fomo";
  label: string;
  state: "ready" | "partial" | "blocked" | "watch";
  note: string;
};

export type TrustSignalFeedItem = {
  id: string;
  symbol: string;
  title: string;
  priority: number;
  tone: "calm" | "review" | "watch" | "blocked";
  rankReason: string;
  operatorAction: string;
  publicBoundary: string;
  lanes: TrustSignalLane[];
  transparentSignals: string[];
};

export type TrustSignalFeedGate = {
  version: "velmere_trust_signal_feed_gate_v1_pass294";
  surface: TrustSignalFeedSurface;
  query: string;
  headline: string;
  feedMode: "depth_context" | "transparent_ranking" | "operator_review";
  items: TrustSignalFeedItem[];
  rules: string[];
  blockedDarkPatterns: string[];
  innovation: string;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sourceModeWeight(mode: VelmereSearchSourceMode) {
  if (mode === "live_table") return 18;
  if (mode === "live") return 15;
  if (mode === "table") return 10;
  if (mode === "fallback") return 5;
  return 0;
}

function sourceModeLabel(mode: VelmereSearchSourceMode) {
  if (mode === "live_table") return "live + local source mix";
  if (mode === "live") return "live source";
  if (mode === "table") return "local indexed source";
  if (mode === "fallback") return "fallback source";
  return "missing source";
}

function toneFor(result: VelmereSearchResult, missingCount: number): TrustSignalFeedItem["tone"] {
  if (result.tone === "blocked" || result.sourceMode === "missing") return "blocked";
  if (missingCount >= 3 || result.tone === "elevated") return "watch";
  if (result.tone === "review") return "review";
  return "calm";
}

function laneStateFromConfidence(confidence: number, hardBlock = false): TrustSignalLane["state"] {
  if (hardBlock) return "blocked";
  if (confidence >= 70) return "ready";
  if (confidence >= 45) return "partial";
  return "watch";
}

function buildLanes(result: VelmereSearchResult, router?: SocialExchangeCommandSuggestion): TrustSignalLane[] {
  const sourceAverage = result.sources.length
    ? result.sources.reduce((sum, item) => sum + item.confidence, 0) / result.sources.length
    : result.sourceConfidence;
  const missingCount = result.missingData.length;
  const missingHardBlock = result.sourceMode === "missing" || missingCount >= 4;

  return [
    {
      id: "exchange_depth",
      label: "Depth context",
      state: result.missingData.some((item) => item.toLowerCase().includes("orderbook") || item.toLowerCase().includes("depth")) ? "partial" : "ready",
      note: router?.exchangeLabel ?? "connect venue depth before strong decisions",
    },
    {
      id: "social_context",
      label: "Social context",
      state: router?.status === "watch" ? "watch" : "partial",
      note: router?.socialLabel ?? "trend context is supporting evidence only",
    },
    {
      id: "source_quorum",
      label: "Source quorum",
      state: laneStateFromConfidence(sourceAverage, result.sourceMode === "missing"),
      note: `${sourceModeLabel(result.sourceMode)} · ${Math.round(sourceAverage)}% confidence`,
    },
    {
      id: "operator_boundary",
      label: "Operator boundary",
      state: missingHardBlock ? "blocked" : "partial",
      note: missingHardBlock ? "operator review required before public summary" : result.nextOperatorStep,
    },
    {
      id: "anti_fomo",
      label: "Anti-FOMO rail",
      state: "ready",
      note: "no countdown, no buy/sell command, no fake scarcity",
    },
  ];
}

export function buildTrustSignalFeedGate(input: {
  surface: TrustSignalFeedSurface;
  query?: string;
  results: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  max?: number;
}): TrustSignalFeedGate {
  const routerBySymbol = new Map(
    (input.routerSuggestions ?? []).map((item) => [item.symbol.toUpperCase(), item]),
  );

  const items = input.results
    .map<TrustSignalFeedItem>((result) => {
      const symbol = (result.symbol ?? result.avatarLabel ?? result.title).toUpperCase();
      const router = routerBySymbol.get(symbol);
      const missingCount = result.missingData.length;
      const missingPenalty = Math.min(22, missingCount * 4);
      const sourceBoost = sourceModeWeight(result.sourceMode);
      const routerBoost = router ? Math.min(18, router.routerScore / 6) : 4;
      const toneBoost = result.tone === "blocked" ? -8 : result.tone === "elevated" ? 12 : result.tone === "review" ? 8 : 2;
      const priority = clampScore(34 + sourceBoost + routerBoost + toneBoost + result.sourceConfidence / 5 - missingPenalty);
      const tone = toneFor(result, missingCount);
      const lanes = buildLanes(result, router);

      return {
        id: result.id,
        symbol,
        title: result.title,
        priority,
        tone,
        rankReason:
          tone === "blocked"
            ? "Missing source identity forces research-first ranking."
            : tone === "watch"
              ? "Attention exists, but missing evidence slows the flow."
              : tone === "review"
                ? "Strong enough for review, not strong enough for a final claim."
                : "Core asset context with source freshness still visible.",
        operatorAction: result.nextOperatorStep,
        publicBoundary: "Public copy stays evidence-first: no investment advice, no safety certificate, no guaranteed outcome.",
        lanes,
        transparentSignals: [
          sourceModeLabel(result.sourceMode),
          `${result.sourceConfidence}% source confidence`,
          `${missingCount} missing-data lane${missingCount === 1 ? "" : "s"}`,
          router?.psychologyLabel ?? "calm review copy",
        ],
      };
    })
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title))
    .slice(0, input.max ?? 6);

  const blockedCount = items.filter((item) => item.tone === "blocked" || item.tone === "watch").length;

  return {
    version: "velmere_trust_signal_feed_gate_v1_pass294",
    surface: input.surface,
    query: input.query ?? "",
    headline:
      blockedCount > 0
        ? "Trust Signal Feed is slowing hype-heavy or source-light results before action"
        : "Trust Signal Feed ranks results with visible source, depth and operator reasons",
    feedMode:
      input.surface === "shield_terminal"
        ? "depth_context"
        : blockedCount > 0
          ? "operator_review"
          : "transparent_ranking",
    items,
    rules: [
      "Every ranked card must show a visible reason instead of a hidden engagement score.",
      "Exchange depth is supporting context, not a directional trading command.",
      "Social or trend context can raise review priority but cannot lower source requirements.",
      "Missing data increases caution and operator review pressure.",
    ],
    blockedDarkPatterns: [
      "no infinite urgency loop",
      "no fake scarcity or elite-pressure lock",
      "no buy/sell command",
      "no profit, safety or certainty promise",
    ],
    innovation:
      "Velmère Trust Signal Feed: a transparent ranking layer that fuses exchange depth, social context and operator evidence boundaries without addictive feed mechanics.",
  };
}
