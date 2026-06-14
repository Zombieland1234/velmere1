import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainLaunchReadinessDashboard } from "./vlm-brain-launch-readiness-dashboard";
import type { VlmBrainMegaBranchControlTower } from "./vlm-brain-mega-branch-control-tower";
import type { VlmBrainPdfPreviewManifest } from "./vlm-brain-pdf-preview-manifest";
import type { VlmBrainReleaseChainAudit } from "./vlm-brain-release-chain-auditor";
import type { VlmBrainWalletAccessGateMatrix } from "./vlm-brain-wallet-access-gate-matrix";

export type VlmBrainReleaseTriageLaneState = "hard_block" | "review_lock" | "preview_only" | "ready_after_review";

export type VlmBrainReleaseTriageLane = {
  id: "chain" | "launch" | "control" | "pdf" | "wallet" | "data";
  label: string;
  state: VlmBrainReleaseTriageLaneState;
  score: number;
  blockers: number;
  reviewItems: number;
  exportGate: "blocked" | "operator_review" | "operator_preview" | "ready_after_review";
  nextAction: string;
  publicBoundary: string;
};

export type VlmBrainReleaseTriageBoard = {
  schemaVersion: "vlm-brain-release-triage-board-v1-pass243";
  boardMode: "operator_release_triage_preview";
  boardId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  decision: "hard_block" | "review_lock" | "operator_preview_only";
  releaseScore: number;
  hardBlockCount: number;
  reviewCount: number;
  customerExportReady: false;
  binaryPdfReady: false;
  walletAccessReady: false;
  rawPayloadAllowed: false;
  lanes: VlmBrainReleaseTriageLane[];
  operatorSummary: string;
  nextMilestone: string;
  customerBoundary: string;
};

const SCHEMA = "vlm-brain-release-triage-board-v1-pass243" as const;

function compact(value: unknown, fallback = "release triage review required", limit = 300) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-RELEASE-TRIAGE", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stateFrom(blocked: boolean, review: boolean): VlmBrainReleaseTriageLaneState {
  if (blocked) return "hard_block";
  if (review) return "review_lock";
  return "preview_only";
}

function exportGateFor(state: VlmBrainReleaseTriageLaneState): VlmBrainReleaseTriageLane["exportGate"] {
  if (state === "hard_block") return "blocked";
  if (state === "review_lock") return "operator_review";
  if (state === "ready_after_review") return "ready_after_review";
  return "operator_preview";
}

function lane(input: Omit<VlmBrainReleaseTriageLane, "exportGate">): VlmBrainReleaseTriageLane {
  return { ...input, score: clampPercent(input.score), exportGate: exportGateFor(input.state) };
}

function decisionFor(lanes: VlmBrainReleaseTriageLane[]): VlmBrainReleaseTriageBoard["decision"] {
  if (lanes.some((item) => item.state === "hard_block" || item.exportGate === "blocked")) return "hard_block";
  if (lanes.some((item) => item.state === "review_lock" || item.exportGate === "operator_review")) return "review_lock";
  return "operator_preview_only";
}

export function buildVlmBrainReleaseTriageBoard(
  releaseChain: VlmBrainReleaseChainAudit,
  launchDashboard: VlmBrainLaunchReadinessDashboard,
  controlTower: VlmBrainMegaBranchControlTower,
  pdfManifest: VlmBrainPdfPreviewManifest,
  walletGate: VlmBrainWalletAccessGateMatrix,
  result: TokenRiskResult,
): VlmBrainReleaseTriageBoard {
  const createdAt = result.generatedAt ?? controlTower.createdAt ?? launchDashboard.createdAt ?? new Date().toISOString();
  const symbol = compact(result.token.symbol || controlTower.token.symbol || "TOKEN", "TOKEN", 32).toUpperCase();
  const chainBlocked = releaseChain.chainDecision === "blocked" || releaseChain.hardBlockCount > 0;
  const launchBlocked = launchDashboard.launchDecision === "blocked" || !launchDashboard.publicLaunchReady;
  const towerBlocked = controlTower.towerDecision === "blocked" || !controlTower.publicExportReady || !controlTower.binaryPdfReady;
  const pdfBlocked = !pdfManifest.binaryPdfReady || !pdfManifest.rawPayloadAllowed || pdfManifest.routeState === "download_blocked";
  const walletBlocked = walletGate.accessDecision === "blocked" || !walletGate.walletConnectReady || walletGate.seedPhraseAllowed;
  const dataBlocked = String(result.dataQuality ?? "partial") !== "live" || (result.metaModel?.limitations?.length ?? 0) > 0;

  const lanes = [
    lane({
      id: "chain",
      label: "Release chain audit",
      state: stateFrom(chainBlocked, releaseChain.chainDecision !== "internal_preview_locked"),
      score: releaseChain.releaseReadinessScore,
      blockers: releaseChain.hardBlockCount,
      reviewItems: releaseChain.reviewCount,
      nextAction: releaseChain.nextMilestone,
      publicBoundary: releaseChain.customerBoundary,
    }),
    lane({
      id: "launch",
      label: "Launch readiness",
      state: stateFrom(launchBlocked, launchDashboard.launchDecision === "review_required"),
      score: launchDashboard.overallScore,
      blockers: launchDashboard.lanes.filter((item) => item.state === "blocked").length,
      reviewItems: launchDashboard.lanes.filter((item) => item.state === "review").length,
      nextAction: "Run Vercel browser QA, attach trace, and keep public launch disabled until gates pass.",
      publicBoundary: launchDashboard.customerBoundary,
    }),
    lane({
      id: "control",
      label: "Control tower",
      state: stateFrom(towerBlocked, controlTower.towerDecision === "operator_review_required"),
      score: Math.round(controlTower.branches.reduce((sum, item) => sum + item.score, 0) / Math.max(1, controlTower.branches.length)),
      blockers: controlTower.branches.filter((item) => item.state === "blocked").length,
      reviewItems: controlTower.branches.filter((item) => item.state === "review").length,
      nextAction: "Resolve adapter, renderer, governance, audit and customer preflight lanes before export.",
      publicBoundary: controlTower.customerBoundary,
    }),
    lane({
      id: "pdf",
      label: "PDF preview route",
      state: stateFrom(pdfBlocked, pdfManifest.reviewSectionCount > 0),
      score: 100 - pdfManifest.blockedSectionCount * 22 - pdfManifest.reviewSectionCount * 9,
      blockers: pdfManifest.blockedSectionCount,
      reviewItems: pdfManifest.reviewSectionCount,
      nextAction: "Keep HTML preview only; connect binary renderer and redaction envelope before download.",
      publicBoundary: pdfManifest.customerBoundary,
    }),
    lane({
      id: "wallet",
      label: "Wallet/access gate",
      state: stateFrom(walletBlocked, walletGate.accessDecision === "review_only"),
      score: walletGate.lanes.filter((item) => item.state !== "blocked").length * 18,
      blockers: walletGate.lanes.filter((item) => item.state === "blocked").length,
      reviewItems: walletGate.lanes.filter((item) => item.state === "review").length,
      nextAction: "Keep Basic/Pro/Advanced as preview until server-side entitlement and wallet session are implemented.",
      publicBoundary: walletGate.customerBoundary,
    }),
    lane({
      id: "data",
      label: "Data quality gate",
      state: stateFrom(dataBlocked, String(result.dataQuality ?? "partial") !== "live"),
      score: String(result.dataQuality ?? "partial") === "live" ? 72 : 38,
      blockers: result.metaModel?.limitations?.length ?? 0,
      reviewItems: String(result.dataQuality ?? "partial") === "live" ? 0 : 1,
      nextAction: "Refresh live market, holder, contract and OSINT sources before stronger customer copy.",
      publicBoundary: "Missing or fallback data remains an uncertainty signal and cannot be converted into a final verdict.",
    }),
  ];
  const decision = decisionFor(lanes);
  const hardBlockCount = lanes.reduce((sum, item) => sum + item.blockers + (item.state === "hard_block" ? 1 : 0), 0);
  const reviewCount = lanes.reduce((sum, item) => sum + item.reviewItems + (item.state === "review_lock" ? 1 : 0), 0);
  const releaseScore = clampPercent(lanes.reduce((sum, item) => sum + item.score, 0) / Math.max(1, lanes.length) - hardBlockCount * 3 - reviewCount);

  return {
    schemaVersion: SCHEMA,
    boardMode: "operator_release_triage_preview",
    boardId: stableId(`VLM-TRIAGE-${symbol}-${releaseChain.auditId}-${createdAt}`),
    createdAt,
    token: { symbol, name: compact(result.token.name || controlTower.token.name || symbol, symbol, 120) },
    decision,
    releaseScore,
    hardBlockCount,
    reviewCount,
    customerExportReady: false,
    binaryPdfReady: false,
    walletAccessReady: false,
    rawPayloadAllowed: false,
    lanes,
    operatorSummary: "PASS243 release triage compresses the long AI Brain release chain into one go/no-go board for operator review.",
    nextMilestone: "Attach real browser QA trace, durable ledger write and redacted PDF renderer before any customer export.",
    customerBoundary: "Internal release triage only: no public export, no binary PDF, no wallet entitlement and no raw payload until production gates pass.",
  };
}

export const PASS243_VLM_BRAIN_RELEASE_TRIAGE_BOARD_CONTRACT = true;
