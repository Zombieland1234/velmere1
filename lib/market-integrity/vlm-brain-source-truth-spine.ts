import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainReleaseReviewPacket } from "./vlm-brain-release-review-packet";
import type { VlmBrainReportCapsuleEnvelope } from "./vlm-brain-report-capsule";
import type { VlmBrainSourceCoverageMatrix, VlmBrainSourceCoverageLaneId } from "./vlm-brain-source-coverage-matrix";
import {
  createSourceAdapterEnvelope,
  type SourceAdapterCacheDecision,
} from "./source-adapter-runtime";
import type { MarketIntegritySourceLane, SourceAdapterMode } from "./live-source-adapter-contract";

export type VlmBrainTruthSpineDecision =
  | "hard_block"
  | "refresh_required"
  | "operator_review"
  | "internal_preview";

export type VlmBrainTruthSpineLaneState = "verified" | "review" | "stale" | "missing" | "blocked";

export type VlmBrainTruthSpineLane = {
  id: VlmBrainSourceCoverageLaneId;
  label: string;
  adapterLane: MarketIntegritySourceLane;
  adapterId: string;
  state: VlmBrainTruthSpineLaneState;
  mode: SourceAdapterMode;
  cacheDecision: SourceAdapterCacheDecision;
  trustCap: number;
  sourceEvidence: string;
  truthDebt: string;
  nextAction: string;
  exportState: "customer_blocked" | "operator_review" | "internal_context";
  publicCopy: "never" | "after_review" | "context_only";
  staleAt: string;
  expiresAt: string;
};

export type VlmBrainSourceTruthSpine = {
  schemaVersion: "vlm-brain-source-truth-spine-v1-pass216";
  spineMode: "operator_truth_spine_preview";
  spineId: string;
  createdAt: string;
  token: {
    symbol: string;
    name: string;
  };
  capsuleId: string;
  matrixId: string;
  releasePacketId: string;
  decision: VlmBrainTruthSpineDecision;
  truthScore: number;
  staleLaneCount: number;
  missingLaneCount: number;
  blockedLaneCount: number;
  customerExport: "blocked" | "review_locked" | "internal_only";
  durableWrite: "not_connected";
  sourceLedgerWrite: "preview_only";
  lanes: VlmBrainTruthSpineLane[];
  operatorSummary: string;
  customerBoundary: string;
  adapterBoundary: string;
};

const PASS216_SOURCE_TRUTH_SPINE_SCHEMA = "vlm-brain-source-truth-spine-v1-pass216" as const;

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compact(value: unknown, fallback = "source review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-SOURCE-TRUTH-SPINE", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapCoverageLaneToAdapter(lane: VlmBrainSourceCoverageLaneId): MarketIntegritySourceLane {
  switch (lane) {
    case "market":
      return "market";
    case "liquidity":
      return "orderbook";
    case "holders":
      return "holders";
    case "contract":
      return "contract";
    case "social":
      return "osint";
    case "report":
      return "unlocks";
    default:
      return "market";
  }
}

function modeFromCoverage(state: string, dataQuality: TokenRiskResult["dataQuality"]): SourceAdapterMode {
  if (state === "blocked") return "blocked";
  if (state === "missing") return "missing";
  if (dataQuality === "live" && state === "covered") return "live";
  if (state === "covered" || state === "review") return "partial";
  return "fallback";
}

function laneStateFrom(mode: SourceAdapterMode, cacheDecision: SourceAdapterCacheDecision, releaseBlocked: boolean): VlmBrainTruthSpineLaneState {
  if (releaseBlocked || mode === "blocked") return "blocked";
  if (mode === "missing") return "missing";
  if (cacheDecision === "expired" || cacheDecision === "stale") return "stale";
  if (mode === "live") return "verified";
  return "review";
}

function publicCopyFrom(state: VlmBrainTruthSpineLaneState): VlmBrainTruthSpineLane["publicCopy"] {
  if (state === "verified") return "after_review";
  if (state === "review" || state === "stale") return "context_only";
  return "never";
}

function exportStateFrom(state: VlmBrainTruthSpineLaneState): VlmBrainTruthSpineLane["exportState"] {
  if (state === "blocked" || state === "missing") return "customer_blocked";
  if (state === "review" || state === "stale") return "operator_review";
  return "internal_context";
}

function truthDebtFor(state: VlmBrainTruthSpineLaneState, cacheDecision: SourceAdapterCacheDecision) {
  if (state === "blocked") return "blocked lane requires a real adapter, durable source id and manual review before export";
  if (state === "missing") return "missing source must stay visible and cannot be treated as neutral";
  if (state === "stale" || cacheDecision === "stale" || cacheDecision === "expired") return "source freshness is not strong enough for customer copy without refresh";
  if (state === "review") return "partial evidence can support internal review only, not a final public statement";
  return "adapter snapshot can support internal preview after operator review";
}

function nextActionFor(state: VlmBrainTruthSpineLaneState, label: string) {
  if (state === "verified") return `Attach ${label} adapter id, timestamp and redacted snapshot to the case file before preview.`;
  if (state === "stale") return `Refresh ${label} and compare it with a second source before customer-facing copy.`;
  if (state === "review") return `Keep ${label} in operator review and add second-source evidence before export.`;
  return `Do not export ${label}; connect the missing adapter and keep this lane internal-only.`;
}

function decisionFor(lanes: VlmBrainTruthSpineLane[]): VlmBrainTruthSpineDecision {
  if (lanes.some((lane) => lane.state === "blocked" || lane.state === "missing")) return "hard_block";
  if (lanes.some((lane) => lane.state === "stale")) return "refresh_required";
  if (lanes.some((lane) => lane.state === "review")) return "operator_review";
  return "internal_preview";
}

function customerExportFor(decision: VlmBrainTruthSpineDecision): VlmBrainSourceTruthSpine["customerExport"] {
  if (decision === "hard_block") return "blocked";
  if (decision === "refresh_required" || decision === "operator_review") return "review_locked";
  return "internal_only";
}

export function buildVlmBrainSourceTruthSpine(
  capsule: VlmBrainReportCapsuleEnvelope,
  matrix: VlmBrainSourceCoverageMatrix,
  releasePacket: VlmBrainReleaseReviewPacket,
  result: TokenRiskResult,
): VlmBrainSourceTruthSpine {
  const createdAt = result.generatedAt ?? new Date().toISOString();
  const symbol = compact(capsule.token.symbol || result.token.symbol, "TOKEN").toUpperCase();
  const releaseBlocked = releasePacket.decision === "hard_block";
  const lanes = matrix.lanes.map((coverageLane) => {
    const adapterLane = mapCoverageLaneToAdapter(coverageLane.id);
    const mode = modeFromCoverage(coverageLane.state, result.dataQuality);
    const envelope = createSourceAdapterEnvelope({
      lane: adapterLane,
      adapterId: `vlm-brain-${adapterLane}-${coverageLane.id}-pass216-preview`,
      receivedAt: createdAt,
      mode,
      payload: {
        sourceTitle: coverageLane.label,
        confidence: coverageLane.score,
        rank: result.token.rank,
        marketCap: result.metrics.marketCap,
        volume24h: result.metrics.volume24h,
        spreadPercent: result.metrics.bidAskImbalancePercent,
        holderCount: result.metrics.holderCount,
        top10HolderPercent: result.metrics.top10HolderPercent,
        chainId: result.token.chainId,
        tokenAddress: result.token.tokenAddress,
      },
    });
    const state = laneStateFrom(mode, envelope.cacheDecision, releaseBlocked && coverageLane.state !== "covered");
    const trustCap = clampPercent(Math.min(coverageLane.score, releasePacket.releaseScore, Number(capsule.source.confidence.replace(/[^0-9.]/g, "")) || 0));
    return {
      id: coverageLane.id,
      label: coverageLane.label,
      adapterLane,
      adapterId: envelope.adapterId,
      state,
      mode,
      cacheDecision: envelope.cacheDecision,
      trustCap,
      sourceEvidence: compact(coverageLane.evidence, "source evidence pending"),
      truthDebt: truthDebtFor(state, envelope.cacheDecision),
      nextAction: nextActionFor(state, coverageLane.label),
      exportState: exportStateFrom(state),
      publicCopy: publicCopyFrom(state),
      staleAt: envelope.staleAt,
      expiresAt: envelope.expiresAt,
    } satisfies VlmBrainTruthSpineLane;
  });
  const decision = decisionFor(lanes);
  const blockedLaneCount = lanes.filter((lane) => lane.state === "blocked").length;
  const missingLaneCount = lanes.filter((lane) => lane.state === "missing").length;
  const staleLaneCount = lanes.filter((lane) => lane.state === "stale").length;
  const truthScore = clampPercent(
    Math.min(
      releasePacket.releaseScore,
      matrix.overallCoverageScore,
      lanes.reduce((sum, lane) => sum + lane.trustCap, 0) / Math.max(lanes.length, 1),
    ),
  );

  return {
    schemaVersion: PASS216_SOURCE_TRUTH_SPINE_SCHEMA,
    spineMode: "operator_truth_spine_preview",
    spineId: stableId(`VLM-SOURCE-TRUTH-SPINE-${symbol}-${matrix.matrixId}-${createdAt}`),
    createdAt,
    token: {
      symbol,
      name: compact(capsule.token.name || result.token.name || symbol, symbol),
    },
    capsuleId: capsule.capsuleId,
    matrixId: matrix.matrixId,
    releasePacketId: releasePacket.packetId,
    decision,
    truthScore,
    staleLaneCount,
    missingLaneCount,
    blockedLaneCount,
    customerExport: customerExportFor(decision),
    durableWrite: "not_connected",
    sourceLedgerWrite: "preview_only",
    lanes,
    operatorSummary:
      decision === "hard_block"
        ? "Keep the selected tile internal. Missing or blocked adapter truth prevents customer export and PDF-ready copy."
        : decision === "refresh_required"
          ? "Refresh stale source lanes before any customer-facing summary."
          : decision === "operator_review"
            ? "Use this only as an operator preview until second-source evidence is attached."
            : "Internal preview is possible after operator review, but durable storage is still required before download.",
    customerBoundary:
      "Customer copy remains anomaly/source-confidence/missing-data language only. This truth spine is not a final verdict, not a certificate and not financial advice.",
    adapterBoundary:
      "PASS216 preview only. Production export requires server-side adapters, durable source ledger writes, redacted payload storage and reviewer ownership.",
  };
}

export const PASS216_VLM_BRAIN_SOURCE_TRUTH_SPINE_CONTRACT = true;
