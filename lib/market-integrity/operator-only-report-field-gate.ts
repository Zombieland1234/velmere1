import type { TokenRiskResult } from "./risk-types";
import type { CustomerSafeRiskBriefGate } from "./customer-safe-risk-brief-gate";
import type { EvidenceNoteIntegrityGate } from "./evidence-note-integrity-gate";
import type { LayoutStabilitySentinelGate } from "./layout-stability-sentinel-gate";
import type { LensReportPreviewGate } from "./lens-report-preview-gate";
import type { PdfForgeComposerGate } from "./pdf-forge-composer-gate";
import type { PrivacyRedactionEnvelopeGate } from "./privacy-redaction-envelope-gate";
import type { RetentionPolicyGate } from "./retention-policy-gate";
import type { SourceFreshnessRegistryGate } from "./source-freshness-registry-gate";
import type { StorageAdapterContractGate } from "./storage-adapter-contract-gate";

// PASS290 guard marker: operator-only report fields are separated from customer report copy through a Private Disclosure Loom.
export type OperatorOnlyReportFieldStatus =
  | "report_field_quarantine"
  | "operator_review_lane"
  | "private_disclosure_ready"
  | "velmere_disclosure_seal";

export type OperatorOnlyReportFieldTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type OperatorOnlyReportFieldClass =
  | "customer_visible"
  | "redacted_customer_appendix"
  | "operator_only"
  | "blocked_raw";

export type OperatorOnlyReportFieldRail = {
  id: "customer" | "operator" | "source" | "redaction" | "storage" | "pdf" | "layout" | "seal";
  label: string;
  value: string;
  tone: OperatorOnlyReportFieldTone;
  note: string;
};

export type OperatorOnlyReportFieldLane = {
  id:
    | "customer_summary"
    | "operator_memo"
    | "raw_evidence"
    | "source_replay"
    | "privacy_payload"
    | "pdf_signature"
    | "browser_trace"
    | "retention_delete"
    | "customer_footer";
  label: string;
  fieldClass: OperatorOnlyReportFieldClass;
  displayMode: "visible" | "masked" | "vault" | "blocked";
  value: string;
  note: string;
};

export type OperatorOnlyReportFieldGate = {
  version: "velmere_operator_only_report_field_gate_v1_pass290";
  disclosureId: string;
  status: OperatorOnlyReportFieldStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: OperatorOnlyReportFieldRail[];
  lanes: OperatorOnlyReportFieldLane[];
  customerLines: string[];
  operatorVaultLines: string[];
  blockers: string[];
  nextAction: string;
  customerBoundary: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function parseScore(value?: string) {
  const raw = value?.match(/(\d+)\/100/)?.[1];
  return raw ? Number(raw) : undefined;
}

function safeSymbol(result: TokenRiskResult) {
  return (result.token.symbol || "TOKEN").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 14) || "TOKEN";
}

function toneFromScore(score: number): OperatorOnlyReportFieldTone {
  if (score >= 86) return "green";
  if (score >= 72) return "gold";
  if (score >= 58) return "cyan";
  if (score >= 38) return "amber";
  return "red";
}

function classStress(fieldClass: OperatorOnlyReportFieldClass) {
  if (fieldClass === "customer_visible") return 12;
  if (fieldClass === "redacted_customer_appendix") return 32;
  if (fieldClass === "operator_only") return 64;
  return 94;
}

function hasSourceGap(gate: SourceFreshnessRegistryGate) {
  return gate.entries.some((entry) => entry.state === "missing" || entry.state === "stale" || entry.state === "blocked");
}

function hasRawPrivacyLock(gate: PrivacyRedactionEnvelopeGate) {
  return gate.lanes.some((lane) => lane.exposure === "blocked_raw");
}

function hasStorageBlock(gate: StorageAdapterContractGate) {
  return gate.status === "server_adapter_missing" || gate.lanes.some((lane) => lane.state === "blocked");
}

function hasRetentionBlock(gate: RetentionPolicyGate) {
  return gate.status !== "private_retention_seal";
}

function pdfNeedsOperator(gate: PdfForgeComposerGate) {
  return gate.status === "pdf_quarantined" || gate.blockers.length > 0;
}

function layoutNeedsReplay(gate: LayoutStabilitySentinelGate) {
  return gate.status === "layout_quarantined" || gate.status === "scroll_watch";
}

function noteNeedsOperator(gate: EvidenceNoteIntegrityGate) {
  return gate.status === "note_quarantined" || gate.status === "source_note_review";
}

function previewNeedsOperator(gate: LensReportPreviewGate) {
  return gate.status === "preview_frozen" || gate.blockers.length > 2;
}

function briefNeedsOperator(gate: CustomerSafeRiskBriefGate) {
  return gate.status === "customer_export_blocked" || gate.status === "source_review_required";
}

export function buildOperatorOnlyReportFieldGate(
  result: TokenRiskResult,
  customerSafeRiskBriefGate: CustomerSafeRiskBriefGate,
  lensReportPreviewGate: LensReportPreviewGate,
  evidenceNoteIntegrityGate: EvidenceNoteIntegrityGate,
  pdfForgeComposerGate: PdfForgeComposerGate,
  sourceFreshnessRegistryGate: SourceFreshnessRegistryGate,
  storageAdapterContractGate: StorageAdapterContractGate,
  privacyRedactionEnvelopeGate: PrivacyRedactionEnvelopeGate,
  retentionPolicyGate: RetentionPolicyGate,
  layoutStabilitySentinelGate: LayoutStabilitySentinelGate,
): OperatorOnlyReportFieldGate {
  const symbol = safeSymbol(result);
  const confidence = Math.round((result.confidence ?? 0.35) * 100);
  const sourceGap = hasSourceGap(sourceFreshnessRegistryGate);
  const privacyLock = hasRawPrivacyLock(privacyRedactionEnvelopeGate);
  const storageBlock = hasStorageBlock(storageAdapterContractGate);
  const retentionBlock = hasRetentionBlock(retentionPolicyGate);
  const pdfOperator = pdfNeedsOperator(pdfForgeComposerGate);
  const layoutReplay = layoutNeedsReplay(layoutStabilitySentinelGate);
  const noteOperator = noteNeedsOperator(evidenceNoteIntegrityGate);
  const previewOperator = previewNeedsOperator(lensReportPreviewGate);
  const briefOperator = briefNeedsOperator(customerSafeRiskBriefGate);
  const highReviewPressure = result.level === "critical" || result.level === "high" || result.score >= 70;

  const lanes: OperatorOnlyReportFieldLane[] = [
    {
      id: "customer_summary",
      label: "customer summary",
      fieldClass: briefOperator ? "redacted_customer_appendix" : "customer_visible",
      displayMode: briefOperator ? "masked" : "visible",
      value: `${symbol} bounded review summary · ${confidence}% confidence`,
      note: "Public copy stays short, source-linked and non-advisory.",
    },
    {
      id: "operator_memo",
      label: "operator memo",
      fieldClass: "operator_only",
      displayMode: "vault",
      value: highReviewPressure ? "escalated review memo" : "standard review memo",
      note: "Reviewer reasoning, internal assumptions and handoff notes stay out of the customer report.",
    },
    {
      id: "raw_evidence",
      label: "raw evidence payload",
      fieldClass: privacyLock || storageBlock ? "blocked_raw" : "operator_only",
      displayMode: privacyLock || storageBlock ? "blocked" : "vault",
      value: privacyLock ? "privacy lock" : storageBlock ? "storage lock" : "vault only",
      note: "Raw query, wallet/IP, adapter response and debug payload never enter customer-facing copy.",
    },
    {
      id: "source_replay",
      label: "source replay",
      fieldClass: sourceGap ? "operator_only" : "redacted_customer_appendix",
      displayMode: sourceGap ? "vault" : "masked",
      value: sourceGap ? "freshness gap" : "redacted replay anchor",
      note: "MEXC-style depth/chart/source context is attached as replay proof before stronger report language.",
    },
    {
      id: "privacy_payload",
      label: "privacy payload",
      fieldClass: privacyLock ? "blocked_raw" : "redacted_customer_appendix",
      displayMode: privacyLock ? "blocked" : "masked",
      value: privacyLock ? "raw fields blocked" : "masked mirror",
      note: "Luxury-style traceability is shown as selective disclosure, not a leak of private source details.",
    },
    {
      id: "pdf_signature",
      label: "PDF signature",
      fieldClass: pdfOperator ? "operator_only" : "redacted_customer_appendix",
      displayMode: pdfOperator ? "vault" : "masked",
      value: pdfOperator ? "operator preview" : "Velmère Cybersecurity preview",
      note: "The brand signature remains a presentation seal, not a certificate, guarantee or financial advice.",
    },
    {
      id: "browser_trace",
      label: "browser trace",
      fieldClass: layoutReplay ? "operator_only" : "redacted_customer_appendix",
      displayMode: layoutReplay ? "vault" : "masked",
      value: layoutReplay ? "replay required" : "layout replay attached",
      note: "Right-edge drawer scroll and PDF controls must pass replay before public report surfaces are trusted.",
    },
    {
      id: "retention_delete",
      label: "retention/delete",
      fieldClass: retentionBlock ? "blocked_raw" : "redacted_customer_appendix",
      displayMode: retentionBlock ? "blocked" : "masked",
      value: retentionBlock ? "TTL owner missing" : "TTL boundary attached",
      note: "The customer report cannot claim durable handling without delete owner and retention policy.",
    },
    {
      id: "customer_footer",
      label: "customer footer",
      fieldClass: "customer_visible",
      displayMode: "visible",
      value: "review boundary footer",
      note: "No buy/sell prompts, no countdown, no ROI language, no scam verdict and no safety certificate wording.",
    },
  ];

  const fieldStress = Math.round(clamp(lanes.reduce((sum, lane) => sum + classStress(lane.fieldClass), 0) / lanes.length));
  const sourceScore = parseScore(sourceFreshnessRegistryGate.trustBadge) ?? 60;
  const storageScore = parseScore(storageAdapterContractGate.trustBadge) ?? 58;
  const privacyScore = parseScore(privacyRedactionEnvelopeGate.trustBadge) ?? 64;
  const pdfScore = parseScore(pdfForgeComposerGate.trustBadge) ?? 55;
  const layoutScore = parseScore(layoutStabilitySentinelGate.trustBadge) ?? 62;
  const disclosureScore = Math.round(
    clamp(
      100 - fieldStress * 0.36 +
        sourceScore * 0.14 +
        storageScore * 0.12 +
        privacyScore * 0.14 +
        pdfScore * 0.10 +
        layoutScore * 0.08 +
        (confidence >= 65 ? 8 : 2),
      0,
      100,
    ),
  );

  const blockers = [
    sourceGap ? "source replay has stale, missing or blocked lanes" : null,
    privacyLock ? "privacy redaction still blocks raw fields" : null,
    storageBlock ? "server-side storage adapter is not sealed" : null,
    retentionBlock ? "retention/delete owner is not sealed" : null,
    pdfOperator ? "PDF forge remains operator preview" : null,
    layoutReplay ? "right-edge drawer/PDF controls need browser replay" : null,
    noteOperator ? "evidence note still requires operator review" : null,
    previewOperator ? "Lens preview is frozen or over-blocked" : null,
    briefOperator ? "customer-safe brief is not private-ready" : null,
    highReviewPressure ? "high review pressure must stay operator-labelled" : null,
  ].filter((item): item is string => Boolean(item));

  const status: OperatorOnlyReportFieldStatus =
    privacyLock || storageBlock || retentionBlock || blockers.length >= 6
      ? "report_field_quarantine"
      : blockers.length >= 3 || disclosureScore < 66
        ? "operator_review_lane"
        : blockers.length >= 1 || disclosureScore < 82
          ? "private_disclosure_ready"
          : "velmere_disclosure_seal";

  const rails: OperatorOnlyReportFieldRail[] = [
    {
      id: "customer",
      label: "Customer copy",
      value: briefOperator ? "masked" : "bounded",
      tone: briefOperator ? "amber" : "green",
      note: "Only short, source-linked and non-advisory lines can be customer visible.",
    },
    {
      id: "operator",
      label: "Operator vault",
      value: `${lanes.filter((lane) => lane.fieldClass === "operator_only").length} lanes`,
      tone: "gold",
      note: "Internal reasoning and reviewer actions are separated from the customer packet.",
    },
    {
      id: "source",
      label: "Source replay",
      value: sourceGap ? "gap" : "attached",
      tone: sourceGap ? "amber" : "green",
      note: "Depth/orderbook/source TTL are report prerequisites, not decorative badges.",
    },
    {
      id: "redaction",
      label: "Redaction",
      value: privacyLock ? "raw locked" : "selective",
      tone: privacyLock ? "red" : "green",
      note: "Private disclosure mirrors digital product passport logic without exposing trade secrets or PII.",
    },
    {
      id: "storage",
      label: "Storage",
      value: storageBlock ? "blocked" : "case-bound",
      tone: storageBlock ? "red" : "cyan",
      note: "Browser-only preview cannot become durable proof.",
    },
    {
      id: "pdf",
      label: "PDF",
      value: pdfOperator ? "operator preview" : "branded preview",
      tone: pdfOperator ? "amber" : "green",
      note: "Velmère Cybersecurity signature stays bounded by source, storage and privacy gates.",
    },
    {
      id: "layout",
      label: "Layout replay",
      value: layoutReplay ? "watch" : "stable",
      tone: layoutReplay ? "amber" : "green",
      note: "Right-edge scroll, mobile safe-area and modal density remain part of report readiness.",
    },
    {
      id: "seal",
      label: "Disclosure seal",
      value: `${disclosureScore}/100`,
      tone: toneFromScore(disclosureScore),
      note: "Elite status is earned only by evidence separation, not by scarcity, hype or pressure.",
    },
  ];

  return {
    version: "velmere_operator_only_report_field_gate_v1_pass290",
    disclosureId: `VLM-DISCLOSURE-${symbol}-${String(disclosureScore).padStart(3, "0")}`,
    status,
    headline:
      status === "velmere_disclosure_seal"
        ? "Private disclosure seal is holding"
        : "Operator-only report fields are separated before customer preview",
    trustBadge: `Disclosure seal ${disclosureScore}/100`,
    operatorCue:
      "PASS290 adds a Private Disclosure Loom: customer-visible lines, redacted appendix fields and operator-only reasoning are woven into separate lanes before PDF/customer release.",
    rails,
    lanes,
    customerLines: [
      `${symbol} report preview is source-bounded and non-advisory.`,
      blockers[0] ? `Primary boundary: ${blockers[0]}.` : "Primary boundary: no open public-copy blocker detected in this preview.",
      "Customer copy cannot include raw payloads, wallet/IP context, operator memo, trade prompts or certainty language.",
    ],
    operatorVaultLines: [
      `Operator vault lanes: ${lanes.filter((lane) => lane.fieldClass === "operator_only" || lane.fieldClass === "blocked_raw").length}/${lanes.length}.`,
      `PDF boundary: ${pdfForgeComposerGate.status.replaceAll("_", " ")}.`,
      `Layout boundary: ${layoutStabilitySentinelGate.status.replaceAll("_", " ")}.`,
      `Evidence note: ${evidenceNoteIntegrityGate.status.replaceAll("_", " ")}.`,
    ],
    blockers,
    nextAction:
      blockers.length > 0
        ? `resolve ${blockers.length} disclosure blockers before customer report/PDF release`
        : "keep operator memo in vault and allow only bounded customer preview lines",
    customerBoundary:
      "The disclosure seal is a report-field separation status. It is not a certificate, guarantee, legal opinion, safety verdict or investment recommendation.",
  };
}
