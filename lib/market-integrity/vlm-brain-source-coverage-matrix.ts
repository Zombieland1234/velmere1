import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainCapsuleHandoff } from "./vlm-brain-capsule-handoff";
import type { VlmBrainCaseReviewTimeline } from "./vlm-brain-case-review-timeline";
import type { VlmBrainCustomerExportFirewall } from "./vlm-brain-customer-export-firewall";
import type { VlmBrainOperatorActionQueue } from "./vlm-brain-operator-action-queue";
import type { VlmBrainReportCapsuleEnvelope } from "./vlm-brain-report-capsule";

export type VlmBrainSourceCoverageLaneId =
  | "market"
  | "liquidity"
  | "holders"
  | "contract"
  | "social"
  | "report";

export type VlmBrainSourceCoverageLaneState = "covered" | "review" | "blocked" | "missing";

export type VlmBrainSourceCoverageLane = {
  id: VlmBrainSourceCoverageLaneId;
  label: string;
  state: VlmBrainSourceCoverageLaneState;
  score: number;
  evidence: string;
  nextAction: string;
  publicCopy: "allowed_after_review" | "internal_only" | "blocked";
};

export type VlmBrainSourceCoverageMatrix = {
  schemaVersion: "vlm-brain-source-coverage-matrix-v1-pass214";
  matrixMode: "operator_source_coverage_preview";
  matrixId: string;
  createdAt: string;
  token: {
    symbol: string;
    name: string;
  };
  capsuleId: string;
  firewallId: string;
  overallCoverageScore: number;
  reviewSla: "now" | "same_session" | "before_public_brief" | "before_pdf_export";
  exportPressure: "hard_block" | "review_lock" | "context_only";
  secondSourceRequired: boolean;
  missingLaneCount: number;
  blockedLaneCount: number;
  lanes: VlmBrainSourceCoverageLane[];
  operatorSummary: string;
  customerBoundary: string;
};

function compact(value: unknown, fallback = "operator review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-SOURCE-MATRIX", 220)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stateFromScore(score: number, blocked: boolean, missing: boolean): VlmBrainSourceCoverageLaneState {
  if (blocked) return "blocked";
  if (missing) return "missing";
  if (score < 58) return "review";
  return "covered";
}

function publicCopyForState(state: VlmBrainSourceCoverageLaneState): VlmBrainSourceCoverageLane["publicCopy"] {
  if (state === "covered") return "allowed_after_review";
  if (state === "review") return "internal_only";
  return "blocked";
}

function hasSignal(result: TokenRiskResult, ids: string[]) {
  return (result.signals ?? []).some((signal) => ids.includes(signal.id));
}

function lane(
  id: VlmBrainSourceCoverageLaneId,
  label: string,
  score: number,
  blocked: boolean,
  missing: boolean,
  evidence: string,
  nextAction: string,
): VlmBrainSourceCoverageLane {
  const state = stateFromScore(score, blocked, missing);
  return {
    id,
    label,
    state,
    score: clampPercent(score),
    evidence: compact(evidence, "coverage evidence pending"),
    nextAction: compact(nextAction, "attach a second source before public copy"),
    publicCopy: publicCopyForState(state),
  };
}

function buildCoverageLanes(
  capsule: VlmBrainReportCapsuleEnvelope,
  handoff: VlmBrainCapsuleHandoff,
  queue: VlmBrainOperatorActionQueue,
  timeline: VlmBrainCaseReviewTimeline,
  firewall: VlmBrainCustomerExportFirewall,
  result: TokenRiskResult,
): VlmBrainSourceCoverageLane[] {
  const dataQuality = String(result.dataQuality ?? "partial").toLowerCase();
  const sourceDebt = firewall.debtMatrix ?? [];
  const sourceBlocked = sourceDebt.some((debt) => debt.lane === "source" && debt.severity === "blocker");
  const freshnessBlocked = sourceDebt.some((debt) => debt.lane === "freshness" && debt.severity === "blocker");
  const redactionBlocked = sourceDebt.some((debt) => debt.lane === "redaction" && debt.severity === "blocker");
  const durabilityBlocked = sourceDebt.some((debt) => debt.lane === "durability" && debt.severity === "blocker");
  const missingData = hasSignal(result, ["insufficient_data"]);
  const hasLiquidityMetrics = typeof result.metrics?.liquidityUsd === "number" || typeof result.metrics?.volume24h === "number";
  const hasHolderMetrics = typeof result.metrics?.top10HolderPercent === "number" || typeof result.metrics?.holderCount === "number";
  const hasContractSignal = hasSignal(result, ["contract_privileges", "honeypot_risk", "high_sell_tax", "mint_risk", "blacklist_risk"]);
  const socialSignalCount = (result.signals ?? []).filter((signal) => ["volume_spike", "wash_trading_risk", "parabolic_24h_gain", "multi_timeframe_pump"].includes(signal.id)).length;
  const queueBlockers = queue.actions.filter((action) => action.priority === "P1" || action.exportImpact === "blocks_export").length;

  return [
    lane(
      "market",
      "Market tape",
      74 - (dataQuality === "partial" ? 14 : 0) - (dataQuality === "demo" ? 22 : 0) - (freshnessBlocked ? 24 : 0),
      freshnessBlocked,
      missingData,
      `Data quality: ${result.dataQuality}; freshness: ${handoff.freshness.label}; chart source: ${capsule.source.chartSource}.`,
      "Refresh price/volume chart source and attach the generatedAt timestamp to the case timeline.",
    ),
    lane(
      "liquidity",
      "Liquidity depth",
      68 + (hasLiquidityMetrics ? 12 : -18) - (hasSignal(result, ["thin_liquidity", "very_thin_liquidity", "orderbook_depth_collapse", "orderbook_slippage_risk"]) ? 18 : 0),
      sourceBlocked && !hasLiquidityMetrics,
      !hasLiquidityMetrics,
      `Liquidity USD: ${result.metrics?.liquidityUsd ?? "missing"}; volume 24h: ${result.metrics?.volume24h ?? "missing"}; debt: ${firewall.sourceDebtCount}.`,
      "Attach orderbook/depth or DEX liquidity lane before allowing a public liquidity summary.",
    ),
    lane(
      "holders",
      "Holder graph",
      62 + (hasHolderMetrics ? 14 : -20) - (hasSignal(result, ["holder_concentration"]) ? 18 : 0),
      sourceBlocked && !hasHolderMetrics,
      !hasHolderMetrics,
      `Top holders: ${result.metrics?.top10HolderPercent ?? "missing"}; holder count: ${result.metrics?.holderCount ?? "missing"}.`,
      "Attach holder concentration or custody-cluster source before customer-visible holder language.",
    ),
    lane(
      "contract",
      "Contract control",
      58 + (hasContractSignal ? -18 : 8) - (dataQuality !== "live" ? 10 : 0),
      missingData && dataQuality !== "live",
      !result.token?.tokenAddress && dataQuality !== "live",
      `Contract flags: ${hasContractSignal ? "present" : "not triggered"}; token address: ${result.token?.tokenAddress ?? "missing"}.`,
      "Verify owner/proxy/mint/pause/blacklist/tax state with a contract analyzer before export.",
    ),
    lane(
      "social",
      "Narrative / social pressure",
      56 + Math.min(14, socialSignalCount * 7) - (missingData ? 18 : 0),
      false,
      missingData && socialSignalCount === 0,
      `Narrative proxy signals: ${socialSignalCount}; dominant badge: ${result.badge}.`,
      "Attach OSINT/narrative source or keep social pressure copy internal-only.",
    ),
    lane(
      "report",
      "Report/export gate",
      72 - (redactionBlocked ? 24 : 0) - (durabilityBlocked ? 24 : 0) - (queueBlockers * 8),
      redactionBlocked || durabilityBlocked,
      timeline.ownerGate.durableWrite === "not_connected" || timeline.ownerGate.timelineStorage === "client_preview_only",
      `Firewall: ${firewall.releaseState}; PDF gate: ${firewall.pdfRouteGate}; timeline storage: ${timeline.ownerGate.timelineStorage}.`,
      "Persist the case, keep operator-only fields internal and run redaction review before PDF-ready export.",
    ),
  ];
}

function reviewSlaFromLanes(lanes: VlmBrainSourceCoverageLane[]): VlmBrainSourceCoverageMatrix["reviewSla"] {
  if (lanes.some((item) => item.state === "blocked")) return "now";
  if (lanes.some((item) => item.state === "missing")) return "same_session";
  if (lanes.some((item) => item.state === "review")) return "before_public_brief";
  return "before_pdf_export";
}

function exportPressureFromLanes(lanes: VlmBrainSourceCoverageLane[]): VlmBrainSourceCoverageMatrix["exportPressure"] {
  if (lanes.some((item) => item.publicCopy === "blocked")) return "hard_block";
  if (lanes.some((item) => item.publicCopy === "internal_only")) return "review_lock";
  return "context_only";
}

export function buildVlmBrainSourceCoverageMatrix(
  capsule: VlmBrainReportCapsuleEnvelope,
  handoff: VlmBrainCapsuleHandoff,
  queue: VlmBrainOperatorActionQueue,
  timeline: VlmBrainCaseReviewTimeline,
  firewall: VlmBrainCustomerExportFirewall,
  result: TokenRiskResult,
  nowIso = new Date().toISOString(),
): VlmBrainSourceCoverageMatrix {
  const lanes = buildCoverageLanes(capsule, handoff, queue, timeline, firewall, result);
  const missingLaneCount = lanes.filter((item) => item.state === "missing").length;
  const blockedLaneCount = lanes.filter((item) => item.state === "blocked").length;
  const reviewLaneCount = lanes.filter((item) => item.state === "review").length;
  const coverageAverage = lanes.reduce((sum, item) => sum + item.score, 0) / Math.max(1, lanes.length);
  const overallCoverageScore = clampPercent(
    coverageAverage - blockedLaneCount * 10 - missingLaneCount * 7 - reviewLaneCount * 4,
  );
  const secondSourceRequired = blockedLaneCount > 0 || missingLaneCount > 0 || firewall.sourceDebtCount > 0 || capsule.exportReadiness !== "ready";

  return {
    schemaVersion: "vlm-brain-source-coverage-matrix-v1-pass214",
    matrixMode: "operator_source_coverage_preview",
    matrixId: stableId(`VLM-SOURCE-COVERAGE-${capsule.capsuleId}-${firewall.firewallId}`),
    createdAt: nowIso,
    token: capsule.token,
    capsuleId: capsule.capsuleId,
    firewallId: firewall.firewallId,
    overallCoverageScore,
    reviewSla: reviewSlaFromLanes(lanes),
    exportPressure: exportPressureFromLanes(lanes),
    secondSourceRequired,
    missingLaneCount,
    blockedLaneCount,
    lanes,
    operatorSummary: compact(
      secondSourceRequired
        ? "Second-source review is required before a customer-facing brief or PDF-ready export. Keep blocked/missing lanes internal until source coverage improves."
        : "Coverage is suitable for operator preview. Customer-facing copy still requires redaction and durable case storage before export.",
    ),
    customerBoundary:
      "Customer copy can only summarize reviewed source coverage. It must not expose raw payloads, private scoring weights, operator-only debt or final safety claims.",
  };
}

export function serializeVlmBrainSourceCoverageMatrix(matrix: VlmBrainSourceCoverageMatrix) {
  return JSON.stringify(matrix, null, 2);
}

export const PASS214_VLM_BRAIN_SOURCE_COVERAGE_MATRIX_CONTRACT = true;
