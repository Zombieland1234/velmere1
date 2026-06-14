import type { VlmBrainBrowserReplayScript } from "./vlm-brain-browser-replay-script";
import type { VlmBrainOperatorHandoffVault } from "./vlm-brain-operator-handoff-vault";
import type { VlmBrainReleaseQaScorecard } from "./vlm-brain-release-qa-scorecard";
import type { VlmBrainReleaseTriageBoard } from "./vlm-brain-release-triage-board";

export type VlmBrainExportAuthorizationLane = {
  id: "release" | "handoff" | "browser" | "qa" | "pdf" | "wallet" | "raw_payload";
  label: string;
  state: "hard_block" | "review_required" | "operator_preview";
  score: number;
  exportAllowed: false;
  blocker: string;
  nextAction: string;
};

export type VlmBrainExportAuthorizationGate = {
  schemaVersion: "vlm-brain-export-authorization-gate-v1-pass246";
  gateMode: "operator_only_export_authorization";
  authorizationId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  decision: "hard_block" | "review_required";
  authorizationScore: number;
  publicExportAllowed: false;
  binaryPdfAllowed: false;
  customerCopyAllowed: false;
  rawPayloadAllowed: false;
  walletAccessAllowed: false;
  hardBlockCount: number;
  reviewCount: number;
  lanes: VlmBrainExportAuthorizationLane[];
  operatorSummary: string;
  customerBoundary: string;
};

const SCHEMA = "vlm-brain-export-authorization-gate-v1-pass246" as const;

function compact(value: unknown, fallback = "export authorization review required", limit = 320) {
  return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-EXPORT-AUTH", 260).toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function lane(input: Omit<VlmBrainExportAuthorizationLane, "exportAllowed">): VlmBrainExportAuthorizationLane {
  return { ...input, score: clampPercent(input.score), exportAllowed: false };
}

export function buildVlmBrainExportAuthorizationGate(
  triage: VlmBrainReleaseTriageBoard,
  handoff: VlmBrainOperatorHandoffVault,
  replay: VlmBrainBrowserReplayScript,
  scorecard: VlmBrainReleaseQaScorecard,
): VlmBrainExportAuthorizationGate {
  const createdAt = triage.createdAt ?? handoff.createdAt ?? replay.createdAt ?? scorecard.createdAt ?? new Date().toISOString();
  const lanes: VlmBrainExportAuthorizationLane[] = [
    lane({
      id: "release",
      label: "Release triage authorization",
      state: triage.decision === "hard_block" ? "hard_block" : "review_required",
      score: triage.releaseScore,
      blocker: triage.decision === "hard_block" ? "release triage has hard blocks" : "release triage still requires operator review",
      nextAction: triage.nextMilestone,
    }),
    lane({
      id: "handoff",
      label: "Operator handoff write authorization",
      state: handoff.handoffDecision === "server_write_required" ? "hard_block" : "review_required",
      score: handoff.sourceSnapshotWriteReady || handoff.caseTimelineWriteReady ? 55 : 24,
      blocker: "durable source snapshot and case timeline are not production-write ready",
      nextAction: handoff.nextMilestone,
    }),
    lane({
      id: "browser",
      label: "Real browser replay authorization",
      state: replay.replayDecision === "blocked_until_run" ? "hard_block" : "review_required",
      score: replay.steps.filter((step) => step.state !== "blocked").length * 10,
      blocker: "manual Vercel replay trace is required before export",
      nextAction: replay.nextMilestone,
    }),
    lane({
      id: "qa",
      label: "Release QA authorization",
      state: scorecard.qaDecision === "blocked" ? "hard_block" : "review_required",
      score: scorecard.overallScore,
      blocker: `${scorecard.blockedLaneCount} blocked QA lanes and ${scorecard.reviewLaneCount} review lanes remain`,
      nextAction: "Resolve browser, redaction, source, durable and copy QA lanes before public export.",
    }),
    lane({
      id: "pdf",
      label: "Binary PDF authorization",
      state: "hard_block",
      score: triage.binaryPdfReady && scorecard.binaryPdfReady ? 55 : 0,
      blocker: "binary PDF renderer, storage manifest and redaction envelope are not connected",
      nextAction: "Keep HTML/PDF-ready preview only until binary generation and storage are implemented.",
    }),
    lane({
      id: "wallet",
      label: "Wallet/access authorization",
      state: "hard_block",
      score: triage.walletAccessReady ? 50 : 0,
      blocker: "wallet/session entitlement is not production-ready and must never ask for recovery phrase/private key",
      nextAction: "Implement server-side entitlement, session expiry and no-seed wallet copy before gating access.",
    }),
    lane({
      id: "raw_payload",
      label: "Raw payload authorization",
      state: "hard_block",
      score: 0,
      blocker: "raw payload, PII, wallet data, secrets and provider bodies are never customer export material",
      nextAction: "Export redacted summaries only and persist the redaction manifest before any customer route.",
    }),
  ];
  const hardBlockCount = lanes.filter((item) => item.state === "hard_block").length;
  const reviewCount = lanes.filter((item) => item.state === "review_required").length;
  const authorizationScore = clampPercent(lanes.reduce((sum, item) => sum + item.score, 0) / lanes.length - hardBlockCount * 5 - reviewCount * 2);
  return {
    schemaVersion: SCHEMA,
    gateMode: "operator_only_export_authorization",
    authorizationId: stableId(`VLM-EXPORT-AUTH-${triage.token.symbol}-${triage.boardId}-${scorecard.scorecardId}-${createdAt}`),
    createdAt,
    token: triage.token,
    decision: hardBlockCount > 0 ? "hard_block" : "review_required",
    authorizationScore,
    publicExportAllowed: false,
    binaryPdfAllowed: false,
    customerCopyAllowed: false,
    rawPayloadAllowed: false,
    walletAccessAllowed: false,
    hardBlockCount,
    reviewCount,
    lanes,
    operatorSummary: "PASS246 converts the AI Brain release chain into a single export authorization gate: public export stays blocked until browser QA, durable writes, PDF route, wallet/session and redaction are real.",
    customerBoundary: "Internal operator gate only. It is not a certificate, not financial advice and not a final token verdict.",
  };
}

export const PASS246_VLM_BRAIN_EXPORT_AUTHORIZATION_GATE_CONTRACT = true;
