import type { TokenRiskResult } from "./risk-types";
import type { LiquidityExitGateOrderBook } from "./liquidity-exit-gate";

export type SourceAdapterQuorumGateTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type SourceAdapterQuorumGateStatus =
  | "circuit_breaker_active"
  | "quorum_review"
  | "fallback_gap"
  | "calm_quorum";

export type SourceAdapterQuorumRail = {
  id: "quorum" | "timeout" | "freshness" | "fallback" | "retry" | "seal";
  label: string;
  value: string;
  tone: SourceAdapterQuorumGateTone;
  note: string;
};

export type SourceAdapterQuorumSnapshot = {
  chartSource?: string;
  chartError?: string | null;
  chartLoading?: boolean;
  orderbook?: LiquidityExitGateOrderBook | null;
  orderbookError?: string | null;
  orderbookLoading?: boolean;
  adapterTimeoutCount?: number;
  fallbackCount?: number;
  retryWindowSeconds?: number;
  lastFreshSourceAt?: string;
  reviewerSeal?: string;
};

export type SourceAdapterQuorumGate = {
  version: "velmere_source_adapter_quorum_gate_v1_pass276";
  status: SourceAdapterQuorumGateStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: SourceAdapterQuorumRail[];
  blockers: string[];
  nextAction: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function finite(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toneFromScore(score: number): SourceAdapterQuorumGateTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function sourceAgeMinutes(value?: string) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
}

function compact(value?: number, fallback = "missing") {
  const safe = finite(value);
  if (safe === undefined) return fallback;
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(safe) >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(safe);
}

function hasOrderbook(snapshot?: SourceAdapterQuorumSnapshot | null) {
  const book = snapshot?.orderbook;
  return Boolean(
    book &&
      (book.bestBid ||
        book.bestAsk ||
        book.bidDepthUsd ||
        book.askDepthUsd ||
        book.bids?.length ||
        book.asks?.length),
  );
}

function sourceCount(result: TokenRiskResult, snapshot?: SourceAdapterQuorumSnapshot | null) {
  const listed = new Set<string>();
  for (const source of result.dataSources ?? []) {
    if (source) listed.add(source.toLowerCase());
  }
  if (result.token.url) listed.add("project_url");
  if (snapshot?.chartSource) listed.add(snapshot.chartSource.toLowerCase());
  if (snapshot?.orderbook?.source) listed.add(snapshot.orderbook.source.toLowerCase());
  if (hasOrderbook(snapshot)) listed.add("orderbook_snapshot");
  return listed.size;
}

function loadingStress(snapshot?: SourceAdapterQuorumSnapshot | null) {
  return (snapshot?.chartLoading ? 18 : 0) + (snapshot?.orderbookLoading ? 22 : 0);
}

export function buildSourceAdapterQuorumGate(
  result: TokenRiskResult,
  snapshot?: SourceAdapterQuorumSnapshot | null,
): SourceAdapterQuorumGate {
  const sources = sourceCount(result, snapshot);
  const timeouts = finite(snapshot?.adapterTimeoutCount) ?? 0;
  const fallbackCount = finite(snapshot?.fallbackCount) ?? (result.dataQuality === "live" ? 0 : result.dataQuality === "partial" ? 1 : 2);
  const retryWindow = finite(snapshot?.retryWindowSeconds) ?? (snapshot?.orderbookLoading || snapshot?.chartLoading ? 30 : 90);
  const ageMinutes = sourceAgeMinutes(snapshot?.lastFreshSourceAt ?? result.generatedAt);
  const hasChartSource = Boolean(snapshot?.chartSource && !snapshot?.chartError);
  const hasBook = hasOrderbook(snapshot);
  const hasErrors = Boolean(snapshot?.chartError || snapshot?.orderbookError);
  const hasReviewerSeal = Boolean(snapshot?.reviewerSeal);

  const quorumStress = clamp(
    sources >= 4 ? 10 : sources === 3 ? 22 : sources === 2 ? 42 : sources === 1 ? 62 : 82,
  );
  const timeoutStress = clamp(
    timeouts >= 3 ? 88 : timeouts === 2 ? 70 : timeouts === 1 ? 48 : hasErrors ? 58 : loadingStress(snapshot) || 10,
  );
  const freshnessStress = clamp(
    ageMinutes === undefined ? 56 : ageMinutes > 360 ? 82 : ageMinutes > 120 ? 64 : ageMinutes > 30 ? 38 : 14,
  );
  const fallbackStress = clamp(
    fallbackCount >= 3 ? 86 : fallbackCount === 2 ? 68 : fallbackCount === 1 ? 44 : result.dataQuality === "live" ? 12 : 34,
  );
  const retryStress = clamp(
    retryWindow <= 15 ? 28 : retryWindow <= 60 ? 36 : retryWindow <= 180 ? 50 : 68,
  );
  const sealStress = clamp(
    hasReviewerSeal ? 12 : 46 + (result.dataQuality === "demo" ? 18 : result.dataQuality === "partial" ? 8 : 0),
  );

  const totalScore = Math.round(clamp(
    quorumStress * 0.25 +
      timeoutStress * 0.18 +
      freshnessStress * 0.2 +
      fallbackStress * 0.16 +
      retryStress * 0.08 +
      sealStress * 0.13,
  ));

  const blockers = [
    sources < 2 ? "minimum two independent source adapters" : null,
    !hasChartSource ? "chart source adapter" : null,
    !hasBook ? "orderbook/depth adapter" : null,
    hasErrors ? "adapter error review" : null,
    ageMinutes === undefined ? "freshness timestamp" : null,
    fallbackCount > 0 ? "fallback source explanation" : null,
    !hasReviewerSeal ? "operator reviewer seal" : null,
  ].filter((item): item is string => Boolean(item));

  const status: SourceAdapterQuorumGateStatus =
    totalScore >= 72 || (fallbackStress >= 64 && quorumStress >= 52)
      ? "circuit_breaker_active"
      : blockers.length >= 5
        ? "fallback_gap"
        : totalScore >= 44
          ? "quorum_review"
          : "calm_quorum";

  const headline =
    status === "circuit_breaker_active"
      ? "adapter circuit breaker active"
      : status === "fallback_gap"
        ? "adapter quorum gap"
        : status === "quorum_review"
          ? "source quorum needs review"
          : "quorum calmer, verify seal";

  const operatorCue =
    status === "circuit_breaker_active"
      ? "If live adapters disagree, timeout or fall back, the interface must slow the readout. Scarcity and status stay visual only; source quorum decides what can be said. This is an anti-FOMO circuit breaker, not a trade signal."
      : status === "fallback_gap"
        ? "Fallback data is useful for layout, but missing adapter proof is uncertainty, not trust. Keep Basic short and push Pro/Advanced toward source repair."
        : status === "quorum_review"
          ? "Compare chart, orderbook and source freshness before lowering review pressure. The elite seal appears only after adapter proof and reviewer context are attached."
          : "Current inputs look calmer, but the proof seal still depends on fresh adapters and a reviewer note.";

  const nextAction =
    status === "circuit_breaker_active"
      ? "Freeze customer-facing confidence, retry failed adapters, attach chart/depth source rows and keep export wording locked until quorum is restored."
      : status === "fallback_gap"
        ? "Attach missing adapter source, error state, fallback reason and freshness timestamp before Pro/Advanced summary copy."
        : status === "quorum_review"
          ? "Run a second-source replay and compare chart, depth and source timestamp before surfacing a stronger readout."
          : "Refresh adapter timestamps and preserve the proof seal as a quiet trust cue, not a dark-pattern urgency cue.";

  return {
    version: "velmere_source_adapter_quorum_gate_v1_pass276",
    status,
    headline,
    trustBadge: `quorum ${totalScore}/100`,
    operatorCue,
    blockers,
    nextAction,
    rails: [
      {
        id: "quorum",
        label: "quorum",
        value: `${sources}/4`,
        tone: toneFromScore(quorumStress),
        note: sources < 2 ? "second source missing" : "source lanes counted",
      },
      {
        id: "timeout",
        label: "timeout",
        value: hasErrors ? "error" : timeouts ? compact(timeouts) : snapshot?.chartLoading || snapshot?.orderbookLoading ? "loading" : "clear",
        tone: toneFromScore(timeoutStress),
        note: snapshot?.orderbookError || snapshot?.chartError || "adapter heartbeat",
      },
      {
        id: "freshness",
        label: "freshness",
        value: ageMinutes === undefined ? "missing" : `${compact(ageMinutes)}m`,
        tone: toneFromScore(freshnessStress),
        note: "TTL before public copy",
      },
      {
        id: "fallback",
        label: "fallback",
        value: fallbackCount ? compact(fallbackCount) : "none",
        tone: toneFromScore(fallbackStress),
        note: result.dataQuality === "live" ? "live preferred" : `${result.dataQuality} lane`,
      },
      {
        id: "retry",
        label: "retry",
        value: `${compact(retryWindow)}s`,
        tone: toneFromScore(retryStress),
        note: "cooldown before recheck",
      },
      {
        id: "seal",
        label: "seal",
        value: hasReviewerSeal ? "attached" : "pending",
        tone: toneFromScore(sealStress),
        note: hasReviewerSeal ? snapshot?.reviewerSeal ?? "reviewer" : "elite proof seal locked",
      },
    ],
  };
}
