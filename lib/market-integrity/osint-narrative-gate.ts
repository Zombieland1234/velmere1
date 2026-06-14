import type { RiskSignalId, TokenRiskResult } from "./risk-types";

export type OsintNarrativeGateTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type OsintNarrativeGateStatus =
  | "narrative_quarantine"
  | "disclosure_review"
  | "source_gap"
  | "calm_story";

export type OsintNarrativeGateRail = {
  id: "attention" | "disclosure" | "official" | "news" | "cooldown" | "source";
  label: string;
  value: string;
  tone: OsintNarrativeGateTone;
  note: string;
};

export type OsintNarrativeSnapshot = {
  socialMentions24h?: number;
  mentionVelocityPercent?: number;
  paidDisclosureState?: "clear" | "unclear" | "sponsored" | "missing";
  officialClaimSource?: string;
  negativeNewsCount?: number;
  sourceFreshnessMinutes?: number;
  reviewedBy?: string;
  riskPoints?: number;
};

export type OsintNarrativeGate = {
  version: "velmere_osint_narrative_gate_v1_pass275";
  status: OsintNarrativeGateStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: OsintNarrativeGateRail[];
  blockers: string[];
  nextAction: string;
};

const NARRATIVE_SIGNALS = new Set<RiskSignalId>([
  "parabolic_24h_gain",
  "parabolic_7d_gain",
  "parabolic_30d_gain",
  "multi_timeframe_pump",
  "new_ath_repricing",
  "volume_spike",
  "wash_trading_risk",
  "market_volume_stress",
  "rebrand_after_crash",
  "exchange_deposit_anomaly",
  "insufficient_data",
]);

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function finite(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function compact(value?: number, fallback = "missing") {
  const safe = finite(value);
  if (safe === undefined) return fallback;
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(safe) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(safe);
}

function signedPercent(value?: number, fallback = "missing") {
  const safe = finite(value);
  if (safe === undefined) return fallback;
  const sign = safe > 0 ? "+" : "";
  return `${sign}${safe.toFixed(Math.abs(safe) >= 10 ? 1 : 2)}%`;
}

function toneFromScore(score: number): OsintNarrativeGateTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function hasSignal(result: TokenRiskResult, ids: RiskSignalId[]) {
  const wanted = new Set(ids);
  return result.signals.some((signal) => wanted.has(signal.id));
}

function disclosureStress(state?: OsintNarrativeSnapshot["paidDisclosureState"]) {
  if (state === "clear") return 12;
  if (state === "sponsored") return 64;
  if (state === "unclear") return 58;
  return 48;
}

function sourceLabel(result: TokenRiskResult, snapshot?: OsintNarrativeSnapshot | null) {
  const listedSources = result.token.url ? 1 : 0;
  const dataSources = Array.isArray(result.token.url) ? 0 : 0;
  const sourceCount = (result.token.url ? 1 : 0) + (snapshot?.officialClaimSource ? 1 : 0) + listedSources + dataSources;
  if (snapshot?.officialClaimSource) return "official";
  if (sourceCount > 0) return "partial";
  return result.dataQuality;
}

export function buildOsintNarrativeGate(
  result: TokenRiskResult,
  snapshot?: OsintNarrativeSnapshot | null,
): OsintNarrativeGate {
  const narrativeSignals = result.signals.filter((signal) => NARRATIVE_SIGNALS.has(signal.id));
  const fastPrice = hasSignal(result, [
    "parabolic_24h_gain",
    "parabolic_7d_gain",
    "parabolic_30d_gain",
    "multi_timeframe_pump",
    "new_ath_repricing",
  ]);
  const attentionVelocity = finite(snapshot?.mentionVelocityPercent);
  const mentions24h = finite(snapshot?.socialMentions24h);
  const negativeNewsCount = finite(snapshot?.negativeNewsCount);
  const freshnessMinutes = finite(snapshot?.sourceFreshnessMinutes);

  const volumePressure = Math.min(26, Math.abs(finite(result.metrics.volumeToMarketCapRatio) ?? 0) * 36) +
    Math.min(18, Math.abs(finite(result.metrics.volumeToLiquidityRatio) ?? 0) * 5);
  const attentionStress = clamp(
    (attentionVelocity === undefined ? 42 : attentionVelocity > 420 ? 88 : attentionVelocity > 180 ? 70 : attentionVelocity > 70 ? 48 : 18) +
      (mentions24h === undefined ? 8 : mentions24h > 25_000 ? 12 : mentions24h > 5_000 ? 7 : 0) +
      Math.min(18, narrativeSignals.length * 4) +
      (fastPrice ? 12 : 0) +
      volumePressure,
  );
  const disclosureGateStress = clamp(
    disclosureStress(snapshot?.paidDisclosureState) +
      (hasSignal(result, ["wash_trading_risk", "market_volume_stress"]) ? 10 : 0),
  );
  const officialProofStress = clamp(
    snapshot?.officialClaimSource ? 14 : 54 + (result.dataQuality === "live" ? 0 : result.dataQuality === "partial" ? 8 : 16),
  );
  const newsStress = clamp(
    negativeNewsCount === undefined ? 36 : negativeNewsCount >= 4 ? 82 : negativeNewsCount >= 2 ? 64 : negativeNewsCount === 1 ? 42 : 14,
  );
  const cooldownStress = clamp(
    (fastPrice ? 58 : 18) +
      (attentionVelocity === undefined ? 8 : attentionVelocity > 180 ? 18 : attentionVelocity > 70 ? 8 : 0) +
      Math.min(18, Math.abs(finite(result.metrics.priceChange24h) ?? 0) * 0.45),
  );
  const sourceStress = clamp(
    (snapshot?.officialClaimSource ? 10 : 48) +
      (freshnessMinutes === undefined ? 12 : freshnessMinutes > 180 ? 20 : freshnessMinutes > 60 ? 10 : 0) +
      (snapshot?.reviewedBy ? 0 : 8) +
      (result.dataQuality === "live" ? 0 : result.dataQuality === "partial" ? 8 : 18),
  );
  const externalRisk = finite(snapshot?.riskPoints) ?? 0;

  const totalScore = Math.round(clamp(
    attentionStress * 0.24 +
      disclosureGateStress * 0.18 +
      officialProofStress * 0.18 +
      newsStress * 0.12 +
      cooldownStress * 0.14 +
      sourceStress * 0.12 +
      externalRisk * 0.02,
  ));

  const blockers = [
    snapshot?.socialMentions24h === undefined ? "social mention source" : null,
    snapshot?.mentionVelocityPercent === undefined ? "attention velocity window" : null,
    !snapshot?.officialClaimSource ? "official claim source" : null,
    !snapshot?.paidDisclosureState || snapshot.paidDisclosureState === "missing" ? "KOL disclosure state" : null,
    freshnessMinutes === undefined ? "OSINT source freshness timestamp" : null,
    !snapshot?.reviewedBy ? "reviewer note" : null,
  ].filter((item): item is string => Boolean(item));

  const status: OsintNarrativeGateStatus =
    totalScore >= 72 || (attentionStress >= 68 && officialProofStress >= 52)
      ? "narrative_quarantine"
      : disclosureGateStress >= 56 || newsStress >= 58
        ? "disclosure_review"
        : blockers.length >= 4
          ? "source_gap"
          : "calm_story";

  const headline =
    status === "narrative_quarantine"
      ? "narrative quarantine active"
      : status === "disclosure_review"
        ? "disclosure review required"
        : status === "source_gap"
          ? "OSINT source gap"
          : "story lane calmer";

  const operatorCue =
    status === "narrative_quarantine"
      ? "Attention can create urgency without proof. Quarantine narrative pressure until official sources, disclosure and timestamps are attached. This is an anti-FOMO gate, not a trade signal."
      : status === "disclosure_review"
        ? "Treat KOL, news and social pressure as review material until disclosure state and source context are checked. Do not turn rumor into a verdict."
        : status === "source_gap"
          ? "Missing OSINT data is uncertainty, not trust. Keep public copy premium, calm and source-gated."
          : "Narrative lane is calmer, but keep the proof halo visible so status comes from sources, not hype.";

  const nextAction =
    status === "narrative_quarantine"
      ? "Open Advanced, attach source ledger rows for social/news/official claims and keep Basic limited to a short review cue."
      : status === "disclosure_review"
        ? "Check paid disclosure, publisher date and official project source before any report copy."
        : status === "source_gap"
          ? "Attach OSINT source list, timestamp, safe paraphrase and reviewer note before export."
          : "Refresh OSINT freshness and preserve the elite proof halo as a trust cue, not a dark pattern.";

  return {
    version: "velmere_osint_narrative_gate_v1_pass275",
    status,
    headline,
    trustBadge: `osint ${totalScore}/100`,
    operatorCue,
    blockers,
    nextAction,
    rails: [
      {
        id: "attention",
        label: "attention",
        value: mentions24h === undefined ? "missing" : compact(mentions24h),
        tone: toneFromScore(attentionStress),
        note: attentionVelocity === undefined ? "velocity missing" : `${signedPercent(attentionVelocity)} velocity`,
      },
      {
        id: "disclosure",
        label: "disclosure",
        value: snapshot?.paidDisclosureState ?? "missing",
        tone: toneFromScore(disclosureGateStress),
        note: "KOL/social context",
      },
      {
        id: "official",
        label: "official",
        value: snapshot?.officialClaimSource ? "attached" : "missing",
        tone: toneFromScore(officialProofStress),
        note: "claim source proof",
      },
      {
        id: "news",
        label: "news",
        value: negativeNewsCount === undefined ? "missing" : compact(negativeNewsCount),
        tone: toneFromScore(newsStress),
        note: "neutral paraphrase only",
      },
      {
        id: "cooldown",
        label: "cooldown",
        value: cooldownStress >= 58 ? "required" : "soft",
        tone: toneFromScore(cooldownStress),
        note: narrativeSignals.length ? `${narrativeSignals.length} narrative signals` : "no spike signal",
      },
      {
        id: "source",
        label: "source",
        value: sourceLabel(result, snapshot),
        tone: toneFromScore(sourceStress),
        note: blockers.length ? `${blockers.length} blockers` : "proof halo ready",
      },
    ],
  };
}
