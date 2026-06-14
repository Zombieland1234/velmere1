import type { VlmBrainReportCapsuleEnvelope } from "./vlm-brain-report-capsule";
import type { VlmBrainReleaseChainAudit } from "./vlm-brain-release-chain-auditor";
import type { VlmBrainSourceLedgerUiPreview } from "./vlm-brain-source-ledger-ui-preview";

export type VlmBrainPdfPreviewManifestSection = {
  id: "public_brief" | "source_confidence" | "missing_data" | "operator_boundary" | "redaction" | "download_gate";
  label: string;
  state: "blocked" | "review" | "preview_only";
  exportMode: "operator_preview" | "customer_after_review" | "never_raw";
  text: string;
};

export type VlmBrainPdfPreviewManifest = {
  schemaVersion: "vlm-brain-pdf-preview-manifest-v1-pass222";
  manifestMode: "pdf_ready_html_preview_only";
  manifestId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  capsuleId: string;
  ledgerPreviewId: string;
  releaseAuditId: string;
  routeState: "download_blocked" | "operator_html_preview" | "review_required";
  binaryPdfReady: false;
  rawPayloadAllowed: false;
  customerCopyAllowed: "blocked" | "after_review";
  redactionRequired: true;
  sections: VlmBrainPdfPreviewManifestSection[];
  blockedSectionCount: number;
  reviewSectionCount: number;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS222_PDF_PREVIEW_MANIFEST_SCHEMA = "vlm-brain-pdf-preview-manifest-v1-pass222" as const;

function compact(value: unknown, fallback = "PDF preview review required", limit = 360) {
  return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PDF-PREVIEW", 260).toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function section(input: VlmBrainPdfPreviewManifestSection): VlmBrainPdfPreviewManifestSection {
  return { ...input, label: compact(input.label, "PDF preview section", 120), text: compact(input.text, "Operator review required before export.", 360) };
}

export function buildVlmBrainPdfPreviewManifest(
  capsule: VlmBrainReportCapsuleEnvelope,
  releaseChainAudit: VlmBrainReleaseChainAudit,
  sourceLedgerPreview: VlmBrainSourceLedgerUiPreview,
): VlmBrainPdfPreviewManifest {
  const createdAt = capsule.generatedAt ?? releaseChainAudit.createdAt ?? new Date().toISOString();
  const hardBlocked = releaseChainAudit.chainDecision === "blocked" || sourceLedgerPreview.ledgerDecision === "blocked";
  const needsReview = releaseChainAudit.reviewCount > 0 || sourceLedgerPreview.serverRequiredCount > 0 || capsule.exportReadiness !== "ready";
  const sections = [
    section({ id: "public_brief", label: "Public brief", state: hardBlocked ? "blocked" : needsReview ? "review" : "preview_only", exportMode: needsReview ? "operator_preview" : "customer_after_review", text: capsule.publicBrief }),
    section({ id: "source_confidence", label: "Source confidence", state: sourceLedgerPreview.serverRequiredCount > 0 ? "review" : "preview_only", exportMode: "operator_preview", text: `Source ledger decision: ${sourceLedgerPreview.ledgerDecision}. Public ledger ready: ${sourceLedgerPreview.publicLedgerReady}.` }),
    section({ id: "missing_data", label: "Missing data boundary", state: releaseChainAudit.hardBlockCount > 0 ? "blocked" : releaseChainAudit.reviewCount > 0 ? "review" : "preview_only", exportMode: "operator_preview", text: "Missing or stale data must remain visible as review context and cannot become a clean safety verdict." }),
    section({ id: "operator_boundary", label: "Operator boundary", state: "preview_only", exportMode: "operator_preview", text: releaseChainAudit.operatorSummary }),
    section({ id: "redaction", label: "Redaction", state: "review", exportMode: "never_raw", text: capsule.dataBoundary }),
    section({ id: "download_gate", label: "Download gate", state: releaseChainAudit.pdfDownloadReady ? "review" : "blocked", exportMode: "operator_preview", text: "Binary PDF download remains disabled until durable stores, redaction envelope and browser QA pass." }),
  ];
  const blockedSectionCount = sections.filter((item) => item.state === "blocked").length;
  const reviewSectionCount = sections.filter((item) => item.state === "review").length;
  const routeState = blockedSectionCount > 0 ? "download_blocked" : reviewSectionCount > 0 ? "review_required" : "operator_html_preview";
  return {
    schemaVersion: PASS222_PDF_PREVIEW_MANIFEST_SCHEMA,
    manifestMode: "pdf_ready_html_preview_only",
    manifestId: stableId(`VLM-PDF-PREVIEW-${capsule.token.symbol}-${capsule.capsuleId}-${createdAt}`),
    createdAt,
    token: capsule.token,
    capsuleId: capsule.capsuleId,
    ledgerPreviewId: sourceLedgerPreview.ledgerPreviewId,
    releaseAuditId: releaseChainAudit.auditId,
    routeState,
    binaryPdfReady: false,
    rawPayloadAllowed: false,
    customerCopyAllowed: hardBlocked || needsReview ? "blocked" : "after_review",
    redactionRequired: true,
    sections,
    blockedSectionCount,
    reviewSectionCount,
    operatorSummary: routeState === "download_blocked" ? "PDF download is blocked by source, release or redaction debt." : "PDF-ready HTML preview is operator-only until review and durable stores are connected.",
    customerBoundary: "PDF preview manifest is not a binary PDF, not a certificate, not financial advice and not a final market verdict.",
  };
}

export const PASS222_VLM_BRAIN_PDF_PREVIEW_MANIFEST_CONTRACT = true;
