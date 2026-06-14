import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainDurableSnapshotPlan } from "./vlm-brain-durable-snapshot-plan";
import type { VlmBrainReleaseChainAudit } from "./vlm-brain-release-chain-auditor";

export type VlmBrainSourceLedgerPreviewLane = {
  id: "adapter_snapshot" | "case_timeline" | "redaction_envelope" | "export_manifest" | "browser_trace" | "reviewer_note";
  label: string;
  state: "blocked" | "server_required" | "preview_only" | "review";
  proofMode: "operator_preview" | "server_write_required" | "not_public";
  score: number;
  nextAction: string;
  customerBoundary: string;
};

export type VlmBrainSourceLedgerUiPreview = {
  schemaVersion: "vlm-brain-source-ledger-ui-preview-v1-pass221";
  previewMode: "operator_source_ledger_preview";
  ledgerPreviewId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  releaseAuditId: string;
  durablePlanId: string;
  ledgerDecision: "blocked" | "server_write_required" | "operator_preview_only";
  publicLedgerReady: false;
  rawPayloadAllowed: false;
  browserTraceRequired: true;
  blockedLaneCount: number;
  serverRequiredCount: number;
  previewLaneCount: number;
  lanes: VlmBrainSourceLedgerPreviewLane[];
  operatorSummary: string;
  customerBoundary: string;
};

const PASS221_SOURCE_LEDGER_UI_PREVIEW_SCHEMA = "vlm-brain-source-ledger-ui-preview-v1-pass221" as const;

function compact(value: unknown, fallback = "source ledger preview review required", limit = 300) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-SOURCE-LEDGER-PREVIEW", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function lane(input: VlmBrainSourceLedgerPreviewLane): VlmBrainSourceLedgerPreviewLane {
  return {
    ...input,
    label: compact(input.label, "Ledger lane", 120),
    score: clampPercent(input.score),
    nextAction: compact(input.nextAction, "Attach durable source proof before export.", 240),
    customerBoundary: compact(input.customerBoundary, "Operator-only ledger preview; not customer proof.", 220),
  };
}

export function buildVlmBrainSourceLedgerUiPreview(
  releaseChainAudit: VlmBrainReleaseChainAudit,
  durableSnapshotPlan: VlmBrainDurableSnapshotPlan,
  result: TokenRiskResult,
): VlmBrainSourceLedgerUiPreview {
  const createdAt = result.generatedAt ?? releaseChainAudit.createdAt ?? new Date().toISOString();
  const blocked = releaseChainAudit.chainDecision === "blocked" || durableSnapshotPlan.durableWriteDecision === "blocked";
  const serverRequired = durableSnapshotPlan.durableWriteDecision === "server_adapter_required" || releaseChainAudit.serverAdapterRequiredCount > 0;
  const lanes = [
    lane({
      id: "adapter_snapshot",
      label: "Adapter snapshot proof",
      state: blocked ? "blocked" : serverRequired ? "server_required" : "preview_only",
      proofMode: serverRequired || blocked ? "server_write_required" : "operator_preview",
      score: releaseChainAudit.releaseReadinessScore - releaseChainAudit.hardBlockCount * 8,
      nextAction: "Persist adapter id, receivedAt, staleAt and expiresAt on a server-only source snapshot adapter.",
      customerBoundary: "Do not expose raw adapter payloads in customer copy; only show redacted source status after review.",
    }),
    lane({
      id: "case_timeline",
      label: "Case timeline proof",
      state: releaseChainAudit.reviewCount > 0 ? "review" : serverRequired ? "server_required" : "preview_only",
      proofMode: serverRequired ? "server_write_required" : "operator_preview",
      score: 100 - releaseChainAudit.reviewCount * 7,
      nextAction: "Attach reviewer note, timestamp and operator action before report preview is promoted.",
      customerBoundary: "Timeline is internal by default; customer copy receives a short reviewed summary only.",
    }),
    lane({
      id: "redaction_envelope",
      label: "Redaction envelope proof",
      state: releaseChainAudit.rawPayloadAllowed ? "blocked" : "server_required",
      proofMode: "server_write_required",
      score: releaseChainAudit.rawPayloadAllowed ? 0 : 74,
      nextAction: "Store redaction rules and final public-safe wording snapshot before PDF-ready export.",
      customerBoundary: "Raw payload, PII, secrets, private weights and long identifiers remain blocked.",
    }),
    lane({
      id: "export_manifest",
      label: "Export manifest proof",
      state: releaseChainAudit.pdfDownloadReady ? "preview_only" : "blocked",
      proofMode: "not_public",
      score: releaseChainAudit.pdfDownloadReady ? 70 : 24,
      nextAction: "Keep PDF download disabled until durable source, redaction and browser QA are connected.",
      customerBoundary: "PDF route is a preview lane, not a public safety certificate or trading recommendation.",
    }),
    lane({
      id: "browser_trace",
      label: "Browser QA trace",
      state: "review",
      proofMode: "operator_preview",
      score: 48,
      nextAction: "Capture real browser QA for modal layering, source dropdown, tile drawer and FPS before release.",
      customerBoundary: "Browser trace is internal QA evidence and is not shown as customer proof.",
    }),
    lane({
      id: "reviewer_note",
      label: "Reviewer note",
      state: releaseChainAudit.hardBlockCount > 0 ? "blocked" : "review",
      proofMode: "operator_preview",
      score: 66 - releaseChainAudit.hardBlockCount * 10,
      nextAction: "Reviewer must confirm missing data language and source confidence before customer brief.",
      customerBoundary: "Customer copy can mention source confidence only after manual review.",
    }),
  ];
  const blockedLaneCount = lanes.filter((item) => item.state === "blocked").length;
  const serverRequiredCount = lanes.filter((item) => item.state === "server_required").length;
  const previewLaneCount = lanes.filter((item) => item.state === "preview_only").length;
  const ledgerDecision = blockedLaneCount > 0 ? "blocked" : serverRequiredCount > 0 ? "server_write_required" : "operator_preview_only";
  return {
    schemaVersion: PASS221_SOURCE_LEDGER_UI_PREVIEW_SCHEMA,
    previewMode: "operator_source_ledger_preview",
    ledgerPreviewId: stableId(`VLM-LEDGER-PREVIEW-${releaseChainAudit.token.symbol}-${releaseChainAudit.auditId}-${createdAt}`),
    createdAt,
    token: { symbol: releaseChainAudit.token.symbol, name: releaseChainAudit.token.name },
    releaseAuditId: releaseChainAudit.auditId,
    durablePlanId: durableSnapshotPlan.planId,
    ledgerDecision,
    publicLedgerReady: false,
    rawPayloadAllowed: false,
    browserTraceRequired: true,
    blockedLaneCount,
    serverRequiredCount,
    previewLaneCount,
    lanes,
    operatorSummary:
      ledgerDecision === "blocked"
        ? "Source ledger preview is blocked. Keep public export and PDF download disabled until blockers are reviewed."
        : ledgerDecision === "server_write_required"
          ? "Source ledger preview is structurally mapped, but server-only durable writes are required before customer export."
          : "Source ledger preview is operator-only and still requires browser QA before any customer-facing brief.",
    customerBoundary:
      "Source ledger preview is an internal operator layer. It is not a certificate, not a proof of safety, not financial advice and not a final verdict.",
  };
}

export const PASS221_VLM_BRAIN_SOURCE_LEDGER_UI_PREVIEW_CONTRACT = true;
