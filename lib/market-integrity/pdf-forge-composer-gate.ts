import type { TokenRiskResult } from "./risk-types";
import { normalizeConfidencePercent } from "./confidence-calibration";
import type { LensReportPreviewGate } from "./lens-report-preview-gate";
import type { EvidenceNoteIntegrityGate } from "./evidence-note-integrity-gate";
import type { PrivacyRedactionEnvelopeGate } from "./privacy-redaction-envelope-gate";
import type { SourceFreshnessRegistryGate } from "./source-freshness-registry-gate";
import type { RetentionPolicyGate } from "./retention-policy-gate";

// PASS288 guard marker: source stitching first, privacy redaction second, animated PDF forge third.
export type PdfForgeComposerStatus =
  | "pdf_quarantined"
  | "pdf_forging"
  | "operator_pdf_preview"
  | "velmere_cybersecurity_pdf_ready";

export type PdfForgeStageState = "complete" | "working" | "blocked" | "operator_only";

export type PdfForgeStage = {
  id: "token" | "sources" | "redaction" | "signature" | "pdf" | "export";
  label: string;
  value: string;
  state: PdfForgeStageState;
  note: string;
};

export type PdfForgeComposerGate = {
  version: "velmere_pdf_forge_composer_gate_v1_pass288";
  pdfId: string;
  status: PdfForgeComposerStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  downloadLabel: string;
  stages: PdfForgeStage[];
  signatureLines: string[];
  blockers: string[];
  nextAction: string;
  customerBoundary: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function safeSymbol(result: TokenRiskResult) {
  return (result.token.symbol || "TOKEN").toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function safeLevel(result: TokenRiskResult) {
  return String(result.level || "review").replace(/_/g, " ");
}

function hasFreshnessGap(gate: SourceFreshnessRegistryGate) {
  return gate.entries.some((entry) => entry.state === "missing" || entry.state === "stale" || entry.state === "blocked");
}

function hasRedactionGap(gate: PrivacyRedactionEnvelopeGate) {
  return gate.lanes.some((lane) => lane.exposure === "blocked_raw");
}

function hasRetentionGap(gate: RetentionPolicyGate) {
  return gate.status !== "private_retention_seal";
}

function escapePdfText(text: string) {
  return text
    .replace(/[\\()]/g, "\\$&")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7E]/g, " ")
    .slice(0, 92);
}

function makePdf(lines: string[]) {
  const pageLines = lines.slice(0, 31);
  const stream = [
    "BT",
    "/F1 18 Tf",
    "54 770 Td",
    `(Velmere Cybersecurity) Tj`,
    "/F1 10 Tf",
    "0 -24 Td",
    `(Private PDF preview - source bounded, redacted, non-advisory) Tj`,
    ...pageLines.flatMap((line) => ["0 -18 Td", `(${escapePdfText(line)}) Tj`]),
    "ET",
  ].join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

export function buildPdfForgeComposerGate(
  result: TokenRiskResult,
  lensReportPreviewGate: LensReportPreviewGate,
  evidenceNoteIntegrityGate: EvidenceNoteIntegrityGate,
  sourceFreshnessRegistryGate: SourceFreshnessRegistryGate,
  privacyRedactionEnvelopeGate: PrivacyRedactionEnvelopeGate,
  retentionPolicyGate: RetentionPolicyGate,
): PdfForgeComposerGate {
  const symbol = safeSymbol(result);
  const confidence = normalizeConfidencePercent(result.confidence, 35);
  const sourceGap = hasFreshnessGap(sourceFreshnessRegistryGate);
  const redactionGap = hasRedactionGap(privacyRedactionEnvelopeGate);
  const retentionGap = hasRetentionGap(retentionPolicyGate);
  const previewFrozen = lensReportPreviewGate.status === "preview_frozen";
  const noteQuarantined = evidenceNoteIntegrityGate.status === "note_quarantined";
  const blockers = [
    sourceGap ? "source freshness registry has stale, missing or blocked lanes" : null,
    redactionGap ? "raw payload redaction is not fully sealed" : null,
    retentionGap ? "retention/delete owner is not sealed" : null,
    previewFrozen ? "Lens preview remains frozen" : null,
    noteQuarantined ? "evidence note remains quarantined" : null,
  ].filter((item): item is string => Boolean(item));

  const forgeScore = Math.round(
    clamp(
      confidence * 0.24 +
        (sourceGap ? 18 : 90) * 0.20 +
        (redactionGap ? 18 : 88) * 0.18 +
        (retentionGap ? 22 : 84) * 0.14 +
        (previewFrozen ? 24 : 78) * 0.14 +
        (noteQuarantined ? 20 : 76) * 0.10,
    ),
  );

  const status: PdfForgeComposerStatus =
    blockers.length >= 3
      ? "pdf_quarantined"
      : blockers.length >= 1
        ? "pdf_forging"
        : forgeScore >= 78
          ? "velmere_cybersecurity_pdf_ready"
          : "operator_pdf_preview";

  const stages: PdfForgeStage[] = [
    {
      id: "token",
      label: "token context",
      value: `${symbol} · ${safeLevel(result)}`,
      state: "complete",
      note: "The report starts with context and review pressure, not trade-direction language.",
    },
    {
      id: "sources",
      label: "source stitching",
      value: sourceGap ? "freshness gap" : "fresh enough",
      state: sourceGap ? "working" : "complete",
      note: "Chart, depth, source TTL and evidence anchors stay visible before public copy.",
    },
    {
      id: "redaction",
      label: "privacy mirror",
      value: redactionGap ? "raw locked" : "redacted",
      state: redactionGap ? "blocked" : "complete",
      note: "Wallet, IP, raw query and operator-only notes stay out of the customer PDF.",
    },
    {
      id: "signature",
      label: "brand signature",
      value: "Velmère Cybersecurity",
      state: blockers.length > 2 ? "operator_only" : "complete",
      note: "The signature is a presentation seal, not a safety certificate or financial advice.",
    },
    {
      id: "pdf",
      label: "PDF forge",
      value: status === "velmere_cybersecurity_pdf_ready" ? "ready" : "preview",
      state: status === "pdf_quarantined" ? "blocked" : "working",
      note: "The UI animates document assembly and downloads a branded PDF preview packet.",
    },
    {
      id: "export",
      label: "export boundary",
      value: retentionGap ? "TTL blocked" : "private preview",
      state: retentionGap ? "operator_only" : "complete",
      note: "Customer release stays bounded by source, retention and redaction gates.",
    },
  ];

  return {
    version: "velmere_pdf_forge_composer_gate_v1_pass288",
    pdfId: `VLM-PDF-${symbol}-${String(forgeScore).padStart(3, "0")}`,
    status,
    headline: status === "velmere_cybersecurity_pdf_ready" ? "Branded PDF preview ready" : "VLM PDF forge is building proof",
    trustBadge: `PDF forge ${forgeScore}/100`,
    operatorCue:
      "VLM Lens now behaves like a premium report forge: it animates source stitching, privacy redaction and a Velmère Cybersecurity signature before download.",
    downloadLabel: "Download Velmère PDF preview",
    stages,
    signatureLines: [
      "Velmère Cybersecurity",
      `Private source-bounded preview for ${symbol}`,
      "Signed presentation seal · not a certificate, not financial advice",
      `Evidence Note: ${evidenceNoteIntegrityGate.trustBadge}`,
      `Lens Preview: ${lensReportPreviewGate.trustBadge}`,
    ],
    blockers,
    nextAction:
      blockers.length > 0
        ? `resolve ${blockers.length} PDF forge blockers before public customer release`
        : "operator can keep the PDF as a branded redacted preview packet",
    customerBoundary:
      "This PDF is a branded Velmère Cybersecurity preview packet. It is not a guarantee, certificate, investment recommendation or final legal report.",
  };
}

export function serializeVelmereCybersecurityPdf(gate: PdfForgeComposerGate) {
  return makePdf([
    gate.pdfId,
    gate.headline,
    gate.trustBadge,
    gate.operatorCue,
    "",
    "Signature",
    ...gate.signatureLines,
    "",
    "Forge stages",
    ...gate.stages.map((stage) => `${stage.label}: ${stage.value} / ${stage.state} - ${stage.note}`),
    "",
    "Blockers",
    ...(gate.blockers.length ? gate.blockers : ["no public preview blockers inside this local packet"]),
    "",
    `Next action: ${gate.nextAction}`,
    gate.customerBoundary,
  ]);
}
