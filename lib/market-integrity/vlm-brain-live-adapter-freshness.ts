import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainReleaseReviewPacket } from "./vlm-brain-release-review-packet";
import type { VlmBrainSourceTruthSpine, VlmBrainTruthSpineLane } from "./vlm-brain-source-truth-spine";
import type { SourceAdapterCacheDecision } from "./source-adapter-runtime";

export type VlmBrainLiveAdapterFreshnessState = "live" | "usable" | "stale" | "expired" | "blocked";

export type VlmBrainLiveAdapterFreshnessLane = {
  id: string;
  label: string;
  adapterId: string;
  adapterLane: string;
  state: VlmBrainLiveAdapterFreshnessState;
  cacheDecision: SourceAdapterCacheDecision;
  mode: string;
  trustCap: number;
  ttlMinutes: number;
  staleAfterMinutes: number;
  ageBucket: "same_session" | "needs_refresh" | "expired_or_missing";
  refreshPriority: "P0" | "P1" | "P2";
  customerCopyGate: "blocked" | "review_only" | "context_after_review";
  sourceLedgerPreview: "append_ready_preview" | "append_blocked_missing_durable_store";
  hardStop: boolean;
  operatorAction: string;
  publicBoundary: string;
};

export type VlmBrainLiveAdapterFreshnessMesh = {
  schemaVersion: "vlm-brain-live-adapter-freshness-v1-pass217";
  meshMode: "operator_adapter_freshness_preview";
  meshId: string;
  createdAt: string;
  token: {
    symbol: string;
    name: string;
  };
  spineId: string;
  releasePacketId: string;
  decision: "hard_block" | "refresh_required" | "operator_review" | "internal_preview";
  freshnessScore: number;
  refreshRequiredCount: number;
  hardStopCount: number;
  customerExportGate: "blocked" | "review_locked" | "internal_only";
  sourceLedgerWrite: "preview_only_not_persisted";
  durableSnapshot: "not_connected";
  lanes: VlmBrainLiveAdapterFreshnessLane[];
  operatorSummary: string;
  customerBoundary: string;
};

const PASS217_LIVE_ADAPTER_FRESHNESS_SCHEMA = "vlm-brain-live-adapter-freshness-v1-pass217" as const;

function compact(value: unknown, fallback = "adapter freshness review required", limit = 340) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-ADAPTER-FRESHNESS", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function minutesBetween(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
}

function ageBucketFor(cacheDecision: SourceAdapterCacheDecision): VlmBrainLiveAdapterFreshnessLane["ageBucket"] {
  if (cacheDecision === "fresh") return "same_session";
  if (cacheDecision === "stale") return "needs_refresh";
  return "expired_or_missing";
}

function stateFor(lane: VlmBrainTruthSpineLane): VlmBrainLiveAdapterFreshnessState {
  if (lane.state === "blocked" || lane.mode === "blocked") return "blocked";
  if (lane.cacheDecision === "expired" || lane.cacheDecision === "missing" || lane.state === "missing") return "expired";
  if (lane.cacheDecision === "stale" || lane.state === "stale") return "stale";
  if (lane.mode === "live" && lane.state === "verified") return "live";
  return "usable";
}

function refreshPriorityFor(state: VlmBrainLiveAdapterFreshnessState, lane: VlmBrainTruthSpineLane): VlmBrainLiveAdapterFreshnessLane["refreshPriority"] {
  if (state === "blocked" || state === "expired") return "P0";
  if (state === "stale" || lane.publicCopy !== "after_review") return "P1";
  return "P2";
}

function customerCopyGateFor(state: VlmBrainLiveAdapterFreshnessState, lane: VlmBrainTruthSpineLane): VlmBrainLiveAdapterFreshnessLane["customerCopyGate"] {
  if (state === "blocked" || state === "expired" || lane.exportState === "customer_blocked") return "blocked";
  if (state === "stale" || lane.exportState === "operator_review") return "review_only";
  return "context_after_review";
}

function actionFor(state: VlmBrainLiveAdapterFreshnessState, lane: VlmBrainTruthSpineLane) {
  if (state === "live") return `Keep ${lane.label} attached to the case, but still show timestamp and source id before export.`;
  if (state === "usable") return `Use ${lane.label} only as operator context and attach a second source before customer copy.`;
  if (state === "stale") return `Refresh ${lane.label}, compare the new snapshot with the current adapter id and keep the old one as audit context.`;
  return `Block export for ${lane.label}; connect a real adapter snapshot, source id and durable write before public wording.`;
}

function boundaryFor(state: VlmBrainLiveAdapterFreshnessState, lane: VlmBrainTruthSpineLane) {
  if (state === "live") return "May support redacted internal preview after manual review; not a final verdict.";
  if (state === "usable") return "Partial/fallback freshness can explain uncertainty only; it cannot become a confident customer claim.";
  if (state === "stale") return "Stale source must be refreshed before any customer-facing summary or PDF-ready route.";
  return "Blocked/expired source stays operator-only and must not be exported as customer evidence.";
}

function decisionFor(lanes: VlmBrainLiveAdapterFreshnessLane[]): VlmBrainLiveAdapterFreshnessMesh["decision"] {
  if (lanes.some((lane) => lane.state === "blocked" || lane.state === "expired")) return "hard_block";
  if (lanes.some((lane) => lane.state === "stale")) return "refresh_required";
  if (lanes.some((lane) => lane.state === "usable")) return "operator_review";
  return "internal_preview";
}

function customerExportGateFor(decision: VlmBrainLiveAdapterFreshnessMesh["decision"]): VlmBrainLiveAdapterFreshnessMesh["customerExportGate"] {
  if (decision === "hard_block") return "blocked";
  if (decision === "refresh_required" || decision === "operator_review") return "review_locked";
  return "internal_only";
}

export function buildVlmBrainLiveAdapterFreshnessMesh(
  spine: VlmBrainSourceTruthSpine,
  releasePacket: VlmBrainReleaseReviewPacket,
  result: TokenRiskResult,
): VlmBrainLiveAdapterFreshnessMesh {
  const createdAt = result.generatedAt ?? spine.createdAt ?? new Date().toISOString();
  const symbol = compact(spine.token.symbol || result.token.symbol, "TOKEN").toUpperCase();
  const lanes = spine.lanes.map((lane) => {
    const state = stateFor(lane);
    const ttlMinutes = minutesBetween(lane.staleAt, lane.expiresAt);
    const staleAfterMinutes = minutesBetween(createdAt, lane.staleAt);
    const hardStop = state === "blocked" || state === "expired" || lane.exportState === "customer_blocked";
    return {
      id: lane.id,
      label: lane.label,
      adapterId: lane.adapterId,
      adapterLane: lane.adapterLane,
      state,
      cacheDecision: lane.cacheDecision,
      mode: lane.mode,
      trustCap: lane.trustCap,
      ttlMinutes,
      staleAfterMinutes,
      ageBucket: ageBucketFor(lane.cacheDecision),
      refreshPriority: refreshPriorityFor(state, lane),
      customerCopyGate: customerCopyGateFor(state, lane),
      sourceLedgerPreview: hardStop ? "append_blocked_missing_durable_store" : "append_ready_preview",
      hardStop,
      operatorAction: compact(actionFor(state, lane), "refresh adapter before export"),
      publicBoundary: compact(boundaryFor(state, lane), "keep source boundary visible"),
    } satisfies VlmBrainLiveAdapterFreshnessLane;
  });
  const decision = decisionFor(lanes);
  const refreshRequiredCount = lanes.filter((lane) => lane.state === "stale" || lane.state === "expired" || lane.state === "blocked").length;
  const hardStopCount = lanes.filter((lane) => lane.hardStop).length;
  const freshnessScore = clampPercent(
    Math.min(
      releasePacket.releaseScore,
      spine.truthScore,
      lanes.reduce((sum, lane) => {
        const statePenalty = lane.state === "live" ? 0 : lane.state === "usable" ? 8 : lane.state === "stale" ? 24 : 42;
        return sum + Math.max(0, lane.trustCap - statePenalty);
      }, 0) / Math.max(lanes.length, 1),
    ),
  );

  return {
    schemaVersion: PASS217_LIVE_ADAPTER_FRESHNESS_SCHEMA,
    meshMode: "operator_adapter_freshness_preview",
    meshId: stableId(`VLM-LIVE-ADAPTER-FRESHNESS-${symbol}-${spine.spineId}-${createdAt}`),
    createdAt,
    token: {
      symbol,
      name: compact(spine.token.name || result.token.name || symbol, symbol),
    },
    spineId: spine.spineId,
    releasePacketId: releasePacket.packetId,
    decision,
    freshnessScore,
    refreshRequiredCount,
    hardStopCount,
    customerExportGate: customerExportGateFor(decision),
    sourceLedgerWrite: "preview_only_not_persisted",
    durableSnapshot: "not_connected",
    lanes,
    operatorSummary:
      decision === "hard_block"
        ? "At least one adapter lane is expired, blocked or customer-blocked. Keep this tile internal until a durable source snapshot exists."
        : decision === "refresh_required"
          ? "One or more adapter lanes require refresh before any customer-facing summary or PDF-ready copy."
          : decision === "operator_review"
            ? "Adapter freshness can support operator review, but second-source evidence is required before customer copy."
            : "All lanes are fresh enough for internal preview after manual review; customer export is still gated by durable storage.",
    customerBoundary:
      "Adapter freshness is a review signal only. Missing, stale or blocked lanes must stay visible and cannot become a safety certificate or trading instruction.",
  };
}

export const PASS217_VLM_BRAIN_LIVE_ADAPTER_FRESHNESS_CONTRACT = true;
