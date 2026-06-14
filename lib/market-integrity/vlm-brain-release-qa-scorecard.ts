import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainLensShieldHandoff } from "./vlm-brain-lens-shield-handoff";
import type { VlmBrainPdfPreviewManifest } from "./vlm-brain-pdf-preview-manifest";
import type { VlmBrainReleaseChainAudit } from "./vlm-brain-release-chain-auditor";
import type { VlmBrainSourceLedgerUiPreview } from "./vlm-brain-source-ledger-ui-preview";

export type VlmBrainReleaseQaScorecardLane = {
  id: "browser" | "motion" | "source" | "redaction" | "pdf" | "lens" | "durable" | "copy";
  label: string;
  state: "blocked" | "review" | "operator_preview" | "ready";
  score: number;
  nextAction: string;
};

export type VlmBrainReleaseQaScorecard = {
  schemaVersion: "vlm-brain-release-qa-scorecard-v1-pass224";
  scorecardMode: "operator_release_qa_preview";
  scorecardId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  releaseAuditId: string;
  ledgerPreviewId: string;
  pdfManifestId: string;
  lensHandoffId: string;
  qaDecision: "blocked" | "review_required" | "operator_preview_only";
  overallScore: number;
  publicReleaseReady: false;
  binaryPdfReady: false;
  rawPayloadAllowed: false;
  browserQaRequired: true;
  lanes: VlmBrainReleaseQaScorecardLane[];
  blockedLaneCount: number;
  reviewLaneCount: number;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS224_RELEASE_QA_SCORECARD_SCHEMA = "vlm-brain-release-qa-scorecard-v1-pass224" as const;

function compact(value: unknown, fallback = "release QA review required", limit = 260) {
  return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-RELEASE-QA", 220).toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function lane(input: VlmBrainReleaseQaScorecardLane): VlmBrainReleaseQaScorecardLane {
  return { ...input, label: compact(input.label, "QA lane", 120), score: clampPercent(input.score), nextAction: compact(input.nextAction, "manual QA required", 240) };
}

export function buildVlmBrainReleaseQaScorecard(
  releaseChainAudit: VlmBrainReleaseChainAudit,
  sourceLedgerPreview: VlmBrainSourceLedgerUiPreview,
  pdfPreviewManifest: VlmBrainPdfPreviewManifest,
  lensShieldHandoff: VlmBrainLensShieldHandoff,
  result: TokenRiskResult,
): VlmBrainReleaseQaScorecard {
  const createdAt = result.generatedAt ?? releaseChainAudit.createdAt ?? new Date().toISOString();
  const lanes = [
    lane({ id: "browser", label: "Real browser QA", state: "review", score: 46, nextAction: "Run Vercel browser QA for modal layering, search portal, drawer scroll and keyboard navigation." }),
    lane({ id: "motion", label: "Orbit motion QA", state: "review", score: 58, nextAction: "Compare DOM Orbit and WebGL prototype FPS on a weaker machine before choosing public renderer." }),
    lane({ id: "source", label: "Source coverage QA", state: releaseChainAudit.hardBlockCount > 0 ? "blocked" : releaseChainAudit.reviewCount > 0 ? "review" : "operator_preview", score: releaseChainAudit.releaseReadinessScore, nextAction: "Attach second-source evidence for missing/stale lanes." }),
    lane({ id: "redaction", label: "Redaction QA", state: pdfPreviewManifest.redactionRequired ? "review" : "ready", score: pdfPreviewManifest.rawPayloadAllowed ? 0 : 76, nextAction: "Store redaction envelope before customer copy or PDF-ready export." }),
    lane({ id: "pdf", label: "PDF route QA", state: pdfPreviewManifest.routeState === "download_blocked" ? "blocked" : "review", score: pdfPreviewManifest.binaryPdfReady ? 80 : 32, nextAction: "Keep binary PDF disabled until generator, manifest and durable stores are connected." }),
    lane({ id: "lens", label: "Lens handoff QA", state: lensShieldHandoff.handoffDecision === "blocked" ? "blocked" : "review", score: lensShieldHandoff.publicRouteEnabled ? 72 : 44, nextAction: "Keep Lens-to-Shield handoff operator-only until privacy route and source context pass QA." }),
    lane({ id: "durable", label: "Durable ledger QA", state: sourceLedgerPreview.ledgerDecision === "blocked" ? "blocked" : "review", score: sourceLedgerPreview.publicLedgerReady ? 75 : 35, nextAction: "Connect server-only source ledger and case timeline stores." }),
    lane({ id: "copy", label: "Customer copy QA", state: "review", score: result.dataQuality === "live" ? 66 : 48, nextAction: "Keep copy in anomaly/review/missing-data language with no buy/sell or safety claims." }),
  ];
  const blockedLaneCount = lanes.filter((item) => item.state === "blocked").length;
  const reviewLaneCount = lanes.filter((item) => item.state === "review").length;
  const overallScore = clampPercent(lanes.reduce((sum, item) => sum + item.score, 0) / lanes.length);
  return {
    schemaVersion: PASS224_RELEASE_QA_SCORECARD_SCHEMA,
    scorecardMode: "operator_release_qa_preview",
    scorecardId: stableId(`VLM-RELEASE-QA-${releaseChainAudit.token.symbol}-${releaseChainAudit.auditId}-${createdAt}`),
    createdAt,
    token: releaseChainAudit.token,
    releaseAuditId: releaseChainAudit.auditId,
    ledgerPreviewId: sourceLedgerPreview.ledgerPreviewId,
    pdfManifestId: pdfPreviewManifest.manifestId,
    lensHandoffId: lensShieldHandoff.handoffId,
    qaDecision: blockedLaneCount > 0 ? "blocked" : reviewLaneCount > 0 ? "review_required" : "operator_preview_only",
    overallScore,
    publicReleaseReady: false,
    binaryPdfReady: false,
    rawPayloadAllowed: false,
    browserQaRequired: true,
    lanes,
    blockedLaneCount,
    reviewLaneCount,
    operatorSummary: blockedLaneCount > 0 ? "Release QA is blocked. Do not enable customer export, public route or binary PDF." : "Release QA is operator-only and still needs real browser, source and redaction review.",
    customerBoundary: "QA scorecard is internal readiness evidence. It is not a customer certificate, not investment advice and not a final token verdict.",
  };
}

export const PASS224_VLM_BRAIN_RELEASE_QA_SCORECARD_CONTRACT = true;
