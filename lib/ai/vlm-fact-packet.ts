import type { TokenRiskResult } from "@/lib/market-integrity/risk-types";
import type { buildRiskBrain } from "@/lib/market-integrity/risk-brain";
import type { VlmFact, VlmFreshness, VlmSource } from "./vlm-contract";
import { boundedNumber, sanitizeIdentifier, sanitizeVlmText } from "./vlm-security";
import { arbitrateVlmSources, type VlmSourceArbitration } from "./vlm-source-arbitration";

export type RiskBrainSnapshot = ReturnType<typeof buildRiskBrain>;

export type VlmCanonicalFactPacket = {
  schemaVersion: "velmere.vlm.fact-packet.v1";
  asset: {
    id: string;
    symbol: string;
    name: string;
    assetClass: string;
    chainId?: string;
    contractAddress?: string;
  };
  observedAt: string;
  dataQuality: "demo" | "partial" | "live";
  deterministicScore: number;
  deterministicVerdict: string;
  confidenceCap: number;
  sourceArbitration: VlmSourceArbitration;
  facts: VlmFact[];
  sources: VlmSource[];
  signals: Array<{ id: string; severity: string; points: number; sourceIds: string[] }>;
  layers: Array<{ id: string; label: string; score: number; confidence: number; state: string; evidence: string[] }>;
  conflicts: Array<{ description: string; sourceIds: string[] }>;
  missingData: string[];
  nextChecks: string[];
  allowedSourceIds: string[];
};

function validIso(value: unknown) {
  const date = new Date(String(value ?? ""));
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
}

function freshnessFromTime(observedAt: string, dataQuality: TokenRiskResult["dataQuality"]): VlmFreshness {
  if (dataQuality === "demo") return "unknown";
  const ageMs = Date.now() - new Date(observedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return "unknown";
  if (ageMs <= 15 * 60_000) return "fresh";
  if (ageMs <= 6 * 60 * 60_000) return "aging";
  return "stale";
}

function sourceQuality(dataQuality: TokenRiskResult["dataQuality"], index: number) {
  const base = dataQuality === "live" ? 82 : dataQuality === "partial" ? 58 : 28;
  return Math.max(18, base - Math.min(index * 3, 18));
}

function sourceProvider(raw: string) {
  const lowered = raw.toLowerCase();
  if (lowered.includes("coingecko")) return "CoinGecko";
  if (lowered.includes("dexscreener")) return "DexScreener";
  if (lowered.includes("binance")) return "Binance";
  if (lowered.includes("mexc")) return "MEXC";
  if (lowered.includes("coinbase")) return "Coinbase";
  if (lowered.includes("kraken")) return "Kraken";
  if (lowered.includes("internal")) return "Velmère deterministic engine";
  return sanitizeVlmText(raw.split(/[/:]/)[0] || "Source", 80);
}

function makeSources(result: TokenRiskResult, observedAt: string): VlmSource[] {
  const raw = ["internal:risk-engine", ...result.dataSources].filter(Boolean);
  const unique = Array.from(new Set(raw)).slice(0, 24);
  return unique.map((source, index) => ({
    id: sanitizeIdentifier(source, `source:${index + 1}`),
    provider: sourceProvider(source),
    label: sanitizeVlmText(source, 180) || `Source ${index + 1}`,
    observedAt,
    quality: index === 0 ? 88 : sourceQuality(result.dataQuality, index - 1),
  }));
}

function metricFact(
  id: string,
  label: string,
  value: unknown,
  sourceIds: string[],
  observedAt: string,
  freshness: VlmFreshness,
): VlmFact {
  const normalized = typeof value === "number" && Number.isFinite(value) ? value : value == null ? null : sanitizeVlmText(value, 500);
  return { id, label, value: normalized, sourceIds: normalized === null ? [] : sourceIds.slice(0, 8), observedAt: normalized === null ? null : observedAt, freshness: normalized === null ? "unknown" : freshness };
}


function applyPacketConfidenceGovernor(input: {
  cap: number;
  dataQuality: TokenRiskResult["dataQuality"];
  sourceCount: number;
  providerCount: number;
  missingDataCount: number;
  conflictCount: number;
  quorumStatus: VlmSourceArbitration["evidenceQuorum"]["status"];
  sourceIntegrityStatus: VlmSourceArbitration["sourceIntegrity"]["status"];
  sourceIntegrityPenalty: number;
  temporalConsistencyStatus: VlmSourceArbitration["temporalConsistency"]["status"];
  temporalConsistencyPenalty: number;
}) {
  const reasons: string[] = [];
  let governed = Math.round(boundedNumber(input.cap, 8, 94, 28));

  if (input.dataQuality !== "live") {
    governed = Math.min(governed, input.dataQuality === "partial" ? 39 : 28);
    reasons.push(`Data quality is ${input.dataQuality}; public confidence is capped.`);
  }
  if (input.sourceCount < 2 || input.providerCount < 2) {
    governed = Math.min(governed, 39);
    reasons.push("Independent second source is missing; confidence cannot exceed fallback band.");
  }
  if (input.missingDataCount > 0) {
    governed = Math.min(governed, 39);
    reasons.push("Missing data is present; confidence cannot exceed fallback band.");
  }
  if (input.conflictCount > 0) {
    governed = Math.min(governed, 52);
    reasons.push("Conflicting evidence requires a conservative confidence cap.");
  }
  if (input.quorumStatus === "weak") {
    governed = Math.min(governed, 34);
    reasons.push("Evidence quorum is weak; AI cannot publish high-confidence conclusions.");
  } else if (input.quorumStatus === "mixed") {
    governed = Math.min(governed, 52);
    reasons.push("Evidence quorum is mixed; AI must keep conclusions conditional.");
  }
  if (input.sourceIntegrityStatus === "quarantined") {
    governed = Math.min(governed - input.sourceIntegrityPenalty, 28);
    reasons.push("Source Integrity Sentinel quarantined evidence; live confidence is blocked.");
  } else if (input.sourceIntegrityStatus === "degraded") {
    governed = Math.min(governed - Math.ceil(input.sourceIntegrityPenalty / 2), 44);
    reasons.push("Source Integrity Sentinel degraded evidence; confidence remains conditional.");
  }
  if (input.temporalConsistencyStatus === "invalid") {
    governed = Math.min(governed - input.temporalConsistencyPenalty, 24);
    reasons.push("Temporal Consistency Sentinel found invalid or future-dated evidence; live confidence is blocked.");
  } else if (input.temporalConsistencyStatus === "stale") {
    governed = Math.min(governed - Math.ceil(input.temporalConsistencyPenalty / 2), 34);
    reasons.push("Evidence Half-Life marks key facts as stale; AI cannot publish a live-strength conclusion.");
  } else if (input.temporalConsistencyStatus === "aging") {
    governed = Math.min(governed - Math.ceil(input.temporalConsistencyPenalty / 3), 52);
    reasons.push("Evidence Half-Life marks some facts as aging; AI must keep conclusions conditional.");
  }

  return { confidenceCap: Math.max(8, governed), reasons };
}

function normalizeConfidence(result: TokenRiskResult, brain: RiskBrainSnapshot) {
  const resultConfidence = typeof result.confidence === "number"
    ? result.confidence <= 1 ? result.confidence * 100 : result.confidence
    : 45;
  const brainConfidence = typeof brain.confidence === "number"
    ? brain.confidence <= 1 ? brain.confidence * 100 : brain.confidence
    : 34;
  const dataCap = result.dataQuality === "live" ? 88 : result.dataQuality === "partial" ? 62 : 34;
  const secondSourcePenalty = result.dataSources.length < 2 ? 12 : 0;
  return Math.round(boundedNumber(Math.min(resultConfidence, brainConfidence, dataCap) - secondSourcePenalty, 8, 94, 28));
}

export function buildCanonicalFactPacket(result: TokenRiskResult, brain: RiskBrainSnapshot): VlmCanonicalFactPacket {
  const observedAt = validIso(result.generatedAt);
  const sources = makeSources(result, observedAt);
  const allowedSourceIds = sources.map((source) => source.id);
  const marketSourceIds = allowedSourceIds.filter((id) => id !== "internal:risk-engine").slice(0, 3);
  const deterministicSource = ["internal:risk-engine"];
  const freshness = freshnessFromTime(observedAt, result.dataQuality);
  const baseConfidenceCap = normalizeConfidence(result, brain);
  const facts = [
    metricFact("price", "Current price", result.metrics.currentPrice, marketSourceIds, observedAt, freshness),
    metricFact("price-change-1h", "Price change 1h (%)", result.metrics.priceChange1h, marketSourceIds, observedAt, freshness),
    metricFact("price-change-24h", "Price change 24h (%)", result.metrics.priceChange24h, marketSourceIds, observedAt, freshness),
    metricFact("price-change-7d", "Price change 7d (%)", result.metrics.priceChange7d, marketSourceIds, observedAt, freshness),
    metricFact("price-change-30d", "Price change 30d (%)", result.metrics.priceChange30d, marketSourceIds, observedAt, freshness),
    metricFact("market-cap", "Market capitalization", result.metrics.marketCap, marketSourceIds, observedAt, freshness),
    metricFact("fdv", "Fully diluted valuation", result.metrics.fdv, marketSourceIds, observedAt, freshness),
    metricFact("volume-24h", "Volume 24h", result.metrics.volume24h, marketSourceIds, observedAt, freshness),
    metricFact("liquidity-usd", "Liquidity (USD)", result.metrics.liquidityUsd, marketSourceIds, observedAt, freshness),
    metricFact("holder-count", "Holder count", result.metrics.holderCount, marketSourceIds, observedAt, freshness),
    metricFact("top10-holder-percent", "Top 10 holder concentration (%)", result.metrics.top10HolderPercent, marketSourceIds, observedAt, freshness),
    metricFact("slippage-10k", "Simulated slippage at 10k", result.metrics.simulatedSlippage10k, marketSourceIds, observedAt, freshness),
    metricFact("sell-tax", "Sell tax (%)", result.metrics.sellTaxPercentage, marketSourceIds, observedAt, freshness),
    metricFact("risk-score", "Deterministic risk score", brain.brainScore, deterministicSource, observedAt, freshness),
  ];

  const conflictCount = result.metaModel?.conflictLevel && result.metaModel.conflictLevel !== "none" ? 1 : 0;
  const rawSourceArbitration = arbitrateVlmSources({ sources, facts, conflictCount, baseConfidenceCap });

  const preliminaryMissingData = Array.from(new Set([
    ...brain.missingData.map((item) => sanitizeVlmText(item, 220)),
    ...facts.filter((fact) => fact.value === null).map((fact) => fact.label),
    ...(result.dataSources.length < 2 ? ["independent second source"] : []),
  ])).filter(Boolean);

  const governedConfidence = applyPacketConfidenceGovernor({
    cap: rawSourceArbitration.confidenceCap,
    dataQuality: result.dataQuality,
    sourceCount: rawSourceArbitration.sourceCount,
    providerCount: rawSourceArbitration.providerCount,
    missingDataCount: preliminaryMissingData.length,
    conflictCount,
    quorumStatus: rawSourceArbitration.evidenceQuorum.status,
    sourceIntegrityStatus: rawSourceArbitration.sourceIntegrity.status,
    sourceIntegrityPenalty: rawSourceArbitration.sourceIntegrity.confidencePenalty,
    temporalConsistencyStatus: rawSourceArbitration.temporalConsistency.status,
    temporalConsistencyPenalty: rawSourceArbitration.temporalConsistency.confidencePenalty,
  });
  const sourceArbitration = {
    ...rawSourceArbitration,
    confidenceCap: governedConfidence.confidenceCap,
    reasons: Array.from(new Set([
      ...rawSourceArbitration.reasons,
      ...governedConfidence.reasons,
    ])).slice(0, 12),
  };
  const confidenceCap = sourceArbitration.confidenceCap;
  const missingData = Array.from(new Set([
    ...preliminaryMissingData,
    ...(sourceArbitration.evidenceQuorum.status !== "strong" ? ["evidence quorum below strong threshold"] : []),
    ...(sourceArbitration.sourceIntegrity.status !== "trusted" ? [`source integrity ${sourceArbitration.sourceIntegrity.status}`] : []),
    ...(sourceArbitration.temporalConsistency.status !== "current" ? [`temporal consistency ${sourceArbitration.temporalConsistency.status}`] : []),
    ...sourceArbitration.sourceIntegrity.reasons.slice(0, 6).map((reason) => `source integrity: ${reason}`),
    ...sourceArbitration.temporalConsistency.reasons.slice(0, 6).map((reason) => `temporal consistency: ${reason}`),
    ...sourceArbitration.temporalConsistency.staleFactIds.slice(0, 6).map((factId) => `stale temporal evidence for ${factId}`),
    ...sourceArbitration.evidenceQuorum.weakFactIds.slice(0, 6).map((factId) => `weak quorum for ${factId}`),
  ])).filter(Boolean).slice(0, 24);

  return {
    schemaVersion: "velmere.vlm.fact-packet.v1",
    asset: {
      id: sanitizeIdentifier(result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol, "unknown-asset"),
      symbol: sanitizeVlmText(result.token.symbol, 30) || "?",
      name: sanitizeVlmText(result.token.name, 140) || sanitizeVlmText(result.token.symbol, 30) || "Unknown asset",
      assetClass: "crypto",
      chainId: result.token.chainId ? sanitizeVlmText(result.token.chainId, 60) : undefined,
      contractAddress: result.token.tokenAddress ? sanitizeVlmText(result.token.tokenAddress, 120) : undefined,
    },
    observedAt,
    dataQuality: result.dataQuality,
    deterministicScore: Math.round(boundedNumber(brain.brainScore, 0, 100, result.score)),
    deterministicVerdict: sanitizeVlmText(brain.verdict, 60),
    confidenceCap,
    sourceArbitration,
    facts,
    sources,
    signals: result.signals.slice(0, 24).map((signal) => ({
      id: sanitizeIdentifier(signal.id, "signal"), severity: signal.severity, points: boundedNumber(signal.points, 0, 100), sourceIds: deterministicSource,
    })),
    layers: brain.activeLayers.slice(0, 12).map((layer) => ({
      id: sanitizeIdentifier(layer.id, "layer"), label: sanitizeVlmText(layer.label, 100), score: Math.round(boundedNumber(layer.score, 0, 100)),
      confidence: Math.round(boundedNumber(layer.confidence <= 1 ? layer.confidence * 100 : layer.confidence, 0, 100)), state: sanitizeVlmText(layer.state, 40), evidence: layer.evidence.map((item) => sanitizeVlmText(item, 100)).slice(0, 10),
    })),
    conflicts: result.metaModel?.conflictLevel && result.metaModel.conflictLevel !== "none"
      ? [{ description: `Deterministic agents report ${result.metaModel.conflictLevel} evidence conflict.`, sourceIds: deterministicSource }]
      : [],
    missingData,
    nextChecks: brain.nextActions.map((item) => sanitizeVlmText(item, 300)).filter(Boolean).slice(0, 14),
    allowedSourceIds,
  };
}
