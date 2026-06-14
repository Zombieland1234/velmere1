import type { VlmBrainAdapterReadinessScheduler } from "./vlm-brain-adapter-readiness-scheduler";
import type { VlmBrainBrowserEvidenceCollector } from "./vlm-brain-browser-evidence-collector";
import type { VlmBrainCustomerBriefBuilder } from "./vlm-brain-customer-brief-builder";
import type { VlmBrainDurableSnapshotPlan } from "./vlm-brain-durable-snapshot-plan";
import type { VlmBrainExportAuthorizationGate } from "./vlm-brain-export-authorization-gate";
import type { VlmBrainPdfPreviewManifest } from "./vlm-brain-pdf-preview-manifest";
import type { VlmBrainWalletSessionPolicy } from "./vlm-brain-wallet-session-policy";

export type VlmBrainReleaseReadinessLane = {
  id: "authorization" | "browser_evidence" | "adapter_scheduler" | "customer_brief" | "wallet_session" | "durable_snapshot" | "pdf_manifest";
  label: string;
  state: "blocked" | "review" | "operator_preview";
  score: number;
  nextAction: string;
};

export type VlmBrainReleaseReadinessOrchestrator = {
  schemaVersion: "vlm-brain-release-readiness-orchestrator-v1-pass251";
  orchestratorMode: "operator_release_readiness_only";
  orchestratorId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  releaseDecision: "blocked" | "review_required";
  overallScore: number;
  publicReleaseAllowed: false;
  customerExportAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  rawPayloadAllowed: false;
  blockedLaneCount: number;
  reviewLaneCount: number;
  lanes: VlmBrainReleaseReadinessLane[];
  operatorSummary: string;
  nextMilestone: string;
  customerBoundary: string;
};

const SCHEMA = "vlm-brain-release-readiness-orchestrator-v1-pass251" as const;
function compact(value: unknown, fallback = "release readiness orchestration required", limit = 340) { return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || fallback; }
function stableId(value: string) { return compact(value, "VLM-RELEASE-ORCHESTRATOR", 280).toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
function clampPercent(value: number) { return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0; }
function lane(input: VlmBrainReleaseReadinessLane): VlmBrainReleaseReadinessLane { return { ...input, score: clampPercent(input.score) }; }

export function buildVlmBrainReleaseReadinessOrchestrator(
  exportGate: VlmBrainExportAuthorizationGate,
  browserEvidence: VlmBrainBrowserEvidenceCollector,
  adapterScheduler: VlmBrainAdapterReadinessScheduler,
  customerBrief: VlmBrainCustomerBriefBuilder,
  walletPolicy: VlmBrainWalletSessionPolicy,
  durablePlan: VlmBrainDurableSnapshotPlan,
  pdfManifest: VlmBrainPdfPreviewManifest,
): VlmBrainReleaseReadinessOrchestrator {
  const createdAt = exportGate.createdAt ?? browserEvidence.createdAt ?? adapterScheduler.createdAt ?? customerBrief.createdAt ?? walletPolicy.createdAt ?? new Date().toISOString();
  const lanes = [
    lane({ id: "authorization", label: "Export authorization", state: exportGate.decision === "hard_block" ? "blocked" : "review", score: exportGate.authorizationScore, nextAction: exportGate.operatorSummary }),
    lane({ id: "browser_evidence", label: "Browser evidence", state: browserEvidence.collectorDecision === "blocked_missing_trace" ? "blocked" : "review", score: Math.max(0, 82 - browserEvidence.missingArtifactCount * 12 - browserEvidence.reviewArtifactCount * 3), nextAction: browserEvidence.operatorSummary }),
    lane({ id: "adapter_scheduler", label: "Adapter scheduler", state: adapterScheduler.schedulerDecision === "blocked" ? "blocked" : "review", score: Math.max(0, 84 - adapterScheduler.p0Count * 14 - adapterScheduler.p1Count * 5), nextAction: adapterScheduler.operatorSummary }),
    lane({ id: "customer_brief", label: "Customer brief", state: customerBrief.briefDecision === "blocked" ? "blocked" : "review", score: Math.max(0, 78 - customerBrief.forbiddenClaimCount * 20), nextAction: customerBrief.operatorSummary }),
    lane({ id: "wallet_session", label: "Wallet session", state: walletPolicy.policyDecision === "blocked" ? "blocked" : "review", score: walletPolicy.walletAccessAllowed ? 70 : 25, nextAction: walletPolicy.operatorSummary }),
    lane({ id: "durable_snapshot", label: "Durable snapshot", state: durablePlan.durableWriteDecision === "blocked" ? "blocked" : "review", score: durablePlan.blockedWriteCount > 0 ? 35 : 62, nextAction: durablePlan.operatorSummary }),
    lane({ id: "pdf_manifest", label: "PDF manifest", state: pdfManifest.routeState === "download_blocked" ? "blocked" : "review", score: pdfManifest.binaryPdfReady ? 70 : 28, nextAction: pdfManifest.operatorSummary }),
  ];
  const blockedLaneCount = lanes.filter((item) => item.state === "blocked").length;
  const reviewLaneCount = lanes.filter((item) => item.state === "review").length;
  const overallScore = clampPercent(lanes.reduce((sum, item) => sum + item.score, 0) / lanes.length - blockedLaneCount * 3 - reviewLaneCount);
  return {
    schemaVersion: SCHEMA,
    orchestratorMode: "operator_release_readiness_only",
    orchestratorId: stableId(`VLM-RELEASE-ORCH-${exportGate.token.symbol}-${exportGate.authorizationId}-${createdAt}`),
    createdAt,
    token: exportGate.token,
    releaseDecision: blockedLaneCount > 0 ? "blocked" : "review_required",
    overallScore,
    publicReleaseAllowed: false,
    customerExportAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    rawPayloadAllowed: false,
    blockedLaneCount,
    reviewLaneCount,
    lanes,
    operatorSummary: "PASS251 orchestrates export authorization, browser evidence, adapter scheduler, customer brief, wallet policy, durable snapshot and PDF manifest into one release-readiness decision.",
    nextMilestone: "Run real Vercel browser replay, connect durable stores and prove redaction/PDF/wallet gates before public customer release.",
    customerBoundary: "Internal release orchestration only. Not a public certificate, investment recommendation or guaranteed safety statement.",
  };
}

export const PASS251_VLM_BRAIN_RELEASE_READINESS_ORCHESTRATOR_CONTRACT = true;
