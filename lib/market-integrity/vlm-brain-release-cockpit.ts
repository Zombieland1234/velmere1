import type { VlmBrainAdapterReadinessScheduler } from "./vlm-brain-adapter-readiness-scheduler";
import type { VlmBrainBrowserEvidenceCollector } from "./vlm-brain-browser-evidence-collector";
import type { VlmBrainCustomerBriefBuilder } from "./vlm-brain-customer-brief-builder";
import type { VlmBrainPdfRouteContract } from "./vlm-brain-pdf-route-contract";
import type { VlmBrainReleaseQaScorecard } from "./vlm-brain-release-qa-scorecard";
import type { VlmBrainReleaseReadinessOrchestrator } from "./vlm-brain-release-readiness-orchestrator";
import type { VlmBrainReleaseTriageBoard } from "./vlm-brain-release-triage-board";
import type { VlmBrainWalletSessionPolicy } from "./vlm-brain-wallet-session-policy";

export type VlmBrainReleaseCockpitLaneState = "hard_block" | "review_lock" | "operator_only";

export type VlmBrainReleaseCockpitLane = {
  id:
    | "release"
    | "triage"
    | "qa"
    | "browser"
    | "adapters"
    | "customer"
    | "wallet"
    | "pdf";
  label: string;
  state: VlmBrainReleaseCockpitLaneState;
  score: number;
  blockers: number;
  reviewItems: number;
  nextAction: string;
};

export type VlmBrainReleaseCockpit = {
  schemaVersion: "vlm-brain-release-cockpit-v1-pass252";
  cockpitMode: "operator_release_control_center";
  cockpitId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  decision: "hard_block" | "review_lock" | "operator_preview_only";
  releaseScore: number;
  hardBlockCount: number;
  reviewCount: number;
  customerExportAllowed: false;
  publicRouteAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  rawPayloadAllowed: false;
  browserQaRequired: true;
  lanes: VlmBrainReleaseCockpitLane[];
  priorityActions: string[];
  operatorSummary: string;
  customerBoundary: string;
};

const SCHEMA = "vlm-brain-release-cockpit-v1-pass252" as const;

function compact(value: unknown, fallback = "release cockpit review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-RELEASE-COCKPIT", 280)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stateFor(blocked: boolean, review: boolean): VlmBrainReleaseCockpitLaneState {
  if (blocked) return "hard_block";
  if (review) return "review_lock";
  return "operator_only";
}

function lane(input: VlmBrainReleaseCockpitLane): VlmBrainReleaseCockpitLane {
  return {
    ...input,
    label: compact(input.label, "Cockpit lane", 120),
    score: clampPercent(input.score),
    nextAction: compact(input.nextAction, "Manual release review required", 260),
  };
}

function decisionFor(lanes: VlmBrainReleaseCockpitLane[]): VlmBrainReleaseCockpit["decision"] {
  if (lanes.some((item) => item.state === "hard_block")) return "hard_block";
  if (lanes.some((item) => item.state === "review_lock")) return "review_lock";
  return "operator_preview_only";
}

export function buildVlmBrainReleaseCockpit(
  readiness: VlmBrainReleaseReadinessOrchestrator,
  triage: VlmBrainReleaseTriageBoard,
  qa: VlmBrainReleaseQaScorecard,
  browser: VlmBrainBrowserEvidenceCollector,
  adapters: VlmBrainAdapterReadinessScheduler,
  customer: VlmBrainCustomerBriefBuilder,
  wallet: VlmBrainWalletSessionPolicy,
  pdf: VlmBrainPdfRouteContract,
): VlmBrainReleaseCockpit {
  const createdAt =
    readiness.createdAt ??
    triage.createdAt ??
    qa.createdAt ??
    browser.createdAt ??
    adapters.createdAt ??
    customer.createdAt ??
    wallet.createdAt ??
    pdf.createdAt ??
    new Date().toISOString();

  const lanes = [
    lane({
      id: "release",
      label: "Release readiness",
      state: stateFor(readiness.releaseDecision === "blocked", readiness.releaseDecision === "review_required"),
      score: readiness.overallScore,
      blockers: readiness.blockedLaneCount,
      reviewItems: readiness.reviewLaneCount,
      nextAction: readiness.nextMilestone,
    }),
    lane({
      id: "triage",
      label: "Go / no-go triage",
      state: stateFor(triage.decision === "hard_block", triage.decision === "review_lock"),
      score: triage.releaseScore,
      blockers: triage.hardBlockCount,
      reviewItems: triage.reviewCount,
      nextAction: triage.nextMilestone,
    }),
    lane({
      id: "qa",
      label: "Release QA",
      state: stateFor(qa.qaDecision === "blocked", qa.qaDecision === "review_required" || qa.browserQaRequired),
      score: qa.overallScore,
      blockers: qa.blockedLaneCount,
      reviewItems: qa.reviewLaneCount,
      nextAction: qa.operatorSummary,
    }),
    lane({
      id: "browser",
      label: "Browser trace evidence",
      state: stateFor(browser.collectorDecision === "blocked_missing_trace", browser.reviewArtifactCount > 0),
      score: 100 - browser.missingArtifactCount * 18 - browser.reviewArtifactCount * 5,
      blockers: browser.missingArtifactCount,
      reviewItems: browser.reviewArtifactCount,
      nextAction: browser.operatorSummary,
    }),
    lane({
      id: "adapters",
      label: "Live adapter queue",
      state: stateFor(adapters.schedulerDecision === "blocked", adapters.schedulerDecision !== "review_queue"),
      score: 100 - adapters.p0Count * 22 - adapters.p1Count * 8,
      blockers: adapters.p0Count,
      reviewItems: adapters.p1Count,
      nextAction: adapters.operatorSummary,
    }),
    lane({
      id: "customer",
      label: "Customer brief boundary",
      state: stateFor(customer.briefDecision === "blocked", customer.forbiddenClaimCount > 0 || !customer.customerCopyReady),
      score: customer.forbiddenClaimCount > 0 ? 20 : 46,
      blockers: customer.briefDecision === "blocked" ? 1 : 0,
      reviewItems: customer.sections.filter((item) => item.state !== "preview_only").length,
      nextAction: customer.operatorSummary,
    }),
    lane({
      id: "wallet",
      label: "Wallet / access session",
      state: stateFor(wallet.policyDecision === "blocked", wallet.policyDecision === "server_required"),
      score: wallet.walletAccessAllowed ? 72 : 24,
      blockers: wallet.lanes.filter((item) => item.state === "blocked").length,
      reviewItems: wallet.lanes.filter((item) => item.state !== "blocked").length,
      nextAction: wallet.operatorSummary,
    }),
    lane({
      id: "pdf",
      label: "PDF route contract",
      state: stateFor(pdf.routeDecision === "download_blocked", !pdf.htmlPreviewReady),
      score: pdf.binaryPdfReady ? 82 : pdf.htmlPreviewReady ? 48 : 28,
      blockers: pdf.routeChecks.filter((item) => item.state === "blocked").length,
      reviewItems: pdf.routeChecks.filter((item) => item.state === "review").length,
      nextAction: pdf.operatorSummary,
    }),
  ];

  const decision = decisionFor(lanes);
  const hardBlockCount = lanes.reduce((sum, item) => sum + item.blockers + (item.state === "hard_block" ? 1 : 0), 0);
  const reviewCount = lanes.reduce((sum, item) => sum + item.reviewItems + (item.state === "review_lock" ? 1 : 0), 0);
  const releaseScore = clampPercent(lanes.reduce((sum, item) => sum + item.score, 0) / Math.max(1, lanes.length) - hardBlockCount * 2 - reviewCount);
  const priorityActions = lanes
    .filter((item) => item.state !== "operator_only" || item.blockers > 0 || item.reviewItems > 0)
    .sort((a, b) => (b.blockers - a.blockers) || (b.reviewItems - a.reviewItems) || (a.score - b.score))
    .slice(0, 5)
    .map((item) => `${item.label}: ${item.nextAction}`);

  return {
    schemaVersion: SCHEMA,
    cockpitMode: "operator_release_control_center",
    cockpitId: stableId(`VLM-RELEASE-COCKPIT-${readiness.token.symbol}-${readiness.orchestratorId}-${createdAt}`),
    createdAt,
    token: readiness.token,
    decision,
    releaseScore,
    hardBlockCount,
    reviewCount,
    customerExportAllowed: false,
    publicRouteAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    rawPayloadAllowed: false,
    browserQaRequired: true,
    lanes,
    priorityActions,
    operatorSummary:
      "PASS252 compresses the selected tile release chain into one operator cockpit so browser evidence, live adapters, customer copy, wallet access and PDF route gates cannot be read as separate approval signals.",
    customerBoundary:
      "Internal release control only. Customer-facing output remains preview/review language until browser QA, durable storage, redaction and source freshness are proven.",
  };
}

export const PASS252_VLM_BRAIN_RELEASE_COCKPIT_CONTRACT = true;
