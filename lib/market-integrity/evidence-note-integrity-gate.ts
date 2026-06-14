import type { TokenRiskResult } from "./risk-types";
import type { LensReportPreviewGate } from "./lens-report-preview-gate";
import type { CustomerSafeRiskBriefGate } from "./customer-safe-risk-brief-gate";
import type { PrivacyRedactionEnvelopeGate } from "./privacy-redaction-envelope-gate";
import type { SourceFreshnessRegistryGate } from "./source-freshness-registry-gate";
import type { StorageAdapterContractGate } from "./storage-adapter-contract-gate";
import type { RetentionPolicyGate } from "./retention-policy-gate";

type EvidenceReportDraft = {
  exportStatus: "blocked" | "review" | "ready";
  missingDataAppendix: string[];
  legalNote: string;
};

export type EvidenceNoteIntegrityTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type EvidenceNoteIntegrityStatus =
  | "note_quarantined"
  | "source_note_review"
  | "operator_note_draft"
  | "velvet_note_ready";

export type EvidenceNoteIntegrityRail = {
  id: "claim" | "source" | "redaction" | "storage" | "tone" | "seal";
  label: string;
  value: string;
  tone: EvidenceNoteIntegrityTone;
  note: string;
};

export type EvidenceNoteIntegrityLine = {
  id: "claim" | "source" | "gap" | "boundary" | "next";
  label: string;
  state: "public_note" | "redacted_note" | "operator_only" | "blocked";
  value: string;
  note: string;
};

export type EvidenceNoteIntegrityGate = {
  version: "velmere_evidence_note_integrity_gate_v1_pass287";
  status: EvidenceNoteIntegrityStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: EvidenceNoteIntegrityRail[];
  lines: EvidenceNoteIntegrityLine[];
  previewNote: string[];
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

function toneFromStress(stress: number): EvidenceNoteIntegrityTone {
  if (stress >= 78) return "red";
  if (stress >= 56) return "amber";
  if (stress >= 34) return "gold";
  return "green";
}

function sourceGap(gate: SourceFreshnessRegistryGate) {
  return gate.entries.some((entry) => entry.state === "missing" || entry.state === "stale" || entry.state === "blocked");
}

function redactionBlocks(gate: PrivacyRedactionEnvelopeGate) {
  return gate.lanes.some((lane) => lane.exposure === "blocked_raw");
}

function storageBlocks(gate: StorageAdapterContractGate) {
  return gate.status === "server_adapter_missing" || gate.lanes.some((lane) => lane.state === "blocked");
}

function lensBlocks(gate: LensReportPreviewGate) {
  return gate.status === "preview_frozen" || gate.blockers.length >= 4;
}

function briefBlocks(gate: CustomerSafeRiskBriefGate) {
  return gate.status === "customer_export_blocked" || gate.blockers.length >= 4;
}

function retentionBlocks(gate: RetentionPolicyGate) {
  return gate.status !== "private_retention_seal";
}

function safeSymbol(result: TokenRiskResult) {
  return result.token.symbol?.toUpperCase() || "TOKEN";
}

export function buildEvidenceNoteIntegrityGate(
  result: TokenRiskResult,
  evidenceReportDraft: EvidenceReportDraft,
  lensReportPreviewGate: LensReportPreviewGate,
  customerSafeRiskBriefGate: CustomerSafeRiskBriefGate,
  sourceFreshnessRegistryGate: SourceFreshnessRegistryGate,
  storageAdapterContractGate: StorageAdapterContractGate,
  privacyRedactionEnvelopeGate: PrivacyRedactionEnvelopeGate,
  retentionPolicyGate: RetentionPolicyGate,
): EvidenceNoteIntegrityGate {
  const hasSourceGap = sourceGap(sourceFreshnessRegistryGate);
  const hasRedactionBlock = redactionBlocks(privacyRedactionEnvelopeGate);
  const hasStorageBlock = storageBlocks(storageAdapterContractGate);
  const hasLensBlock = lensBlocks(lensReportPreviewGate);
  const hasBriefBlock = briefBlocks(customerSafeRiskBriefGate);
  const hasRetentionBlock = retentionBlocks(retentionPolicyGate);
  const draftBlocked = evidenceReportDraft.exportStatus === "blocked";
  const hasMissingData = evidenceReportDraft.missingDataAppendix.length > 0;
  const confidencePercent = Math.round((result.confidence ?? 0.35) * 100);

  const lines: EvidenceNoteIntegrityLine[] = [
    {
      id: "claim",
      label: "claim line",
      state: confidencePercent < 45 || draftBlocked ? "operator_only" : "public_note",
      value: `${safeSymbol(result)} shows ${result.level} review pressure at ${confidencePercent}% confidence`,
      note: "The note uses bounded review language instead of a verdict, guarantee or trade-direction signal.",
    },
    {
      id: "source",
      label: "source stitch",
      state: hasSourceGap ? "blocked" : "redacted_note",
      value: hasSourceGap ? "fresh source gap visible" : "source stitch attached",
      note: "Orderbook, depth, source freshness and evidence links stay close to the note before any customer wording.",
    },
    {
      id: "gap",
      label: "missing gap",
      state: hasMissingData ? "operator_only" : "public_note",
      value: hasMissingData ? `${evidenceReportDraft.missingDataAppendix.length} open evidence gaps` : "no extra appendix gap",
      note: "Missing data is printed as uncertainty and can never become a trust badge.",
    },
    {
      id: "boundary",
      label: "privacy boundary",
      state: hasRedactionBlock || hasStorageBlock || hasRetentionBlock ? "blocked" : "redacted_note",
      value: hasRedactionBlock ? "raw payload locked" : hasStorageBlock ? "storage missing" : hasRetentionBlock ? "TTL owner missing" : "redacted boundary active",
      note: "Raw query, wallet/IP context, analytics payload and operator-only notes stay outside customer copy.",
    },
    {
      id: "next",
      label: "next action",
      state: hasLensBlock || hasBriefBlock ? "blocked" : "operator_only",
      value: hasLensBlock ? lensReportPreviewGate.nextAction : hasBriefBlock ? customerSafeRiskBriefGate.nextAction : "operator note can stay short and source-linked",
      note: "The note is an evidence breadcrumb, not a PDF, certificate, legal proof or financial recommendation.",
    },
  ];

  const lineStress = Math.round(
    clamp(
      lines.reduce((sum, line) => {
        const stateStress = line.state === "public_note" ? 16 : line.state === "redacted_note" ? 28 : line.state === "operator_only" ? 62 : 94;
        return sum + stateStress;
      }, 0) / lines.length,
    ),
  );
  const sourceStress = parseScore(sourceFreshnessRegistryGate.trustBadge) ?? 70;
  const lensStress = parseScore(lensReportPreviewGate.trustBadge) ?? 68;
  const privacyStress = parseScore(privacyRedactionEnvelopeGate.trustBadge) ?? 72;
  const storageStress = parseScore(storageAdapterContractGate.trustBadge) ?? 74;
  const noteStress = Math.round(
    clamp(
      lineStress * 0.34 +
        sourceStress * 0.16 +
        lensStress * 0.14 +
        privacyStress * 0.14 +
        storageStress * 0.12 +
        (hasRetentionBlock ? 82 : 22) * 0.06 +
        (draftBlocked ? 86 : 18) * 0.04,
    ),
  );

  const blockers = [
    draftBlocked ? "evidence draft is still blocked" : null,
    hasSourceGap ? "source freshness gap must stay visible" : null,
    hasRedactionBlock ? "raw payload redaction lock is active" : null,
    hasStorageBlock ? "durable storage proof is missing" : null,
    hasRetentionBlock ? "retention/delete policy is not sealed" : null,
    hasLensBlock ? "Lens preview is not ready for public note" : null,
    hasBriefBlock ? "customer-safe brief blocks stronger wording" : null,
    hasMissingData ? "missing-data appendix must remain in the note" : null,
  ].filter((item): item is string => Boolean(item));

  const status: EvidenceNoteIntegrityStatus =
    hasRedactionBlock || hasStorageBlock || hasRetentionBlock || blockers.length >= 5
      ? "note_quarantined"
      : hasSourceGap || hasLensBlock || hasBriefBlock || draftBlocked || noteStress >= 66
        ? "source_note_review"
        : noteStress >= 42 || hasMissingData
          ? "operator_note_draft"
          : "velvet_note_ready";

  const rails: EvidenceNoteIntegrityRail[] = [
    {
      id: "claim",
      label: "claim",
      value: draftBlocked ? "claim held" : "bounded",
      tone: draftBlocked ? "red" : "green",
      note: "No accusation, no safety certificate and no performance guarantee.",
    },
    {
      id: "source",
      label: "source",
      value: hasSourceGap ? "gap visible" : "stitched",
      tone: hasSourceGap ? "amber" : "green",
      note: "MEXC-style market context is linked before customer wording.",
    },
    {
      id: "redaction",
      label: "redaction",
      value: hasRedactionBlock ? "raw locked" : "masked",
      tone: hasRedactionBlock ? "red" : "green",
      note: "LVMH-style traceability appears without leaking private data.",
    },
    {
      id: "storage",
      label: "storage",
      value: hasStorageBlock ? "not durable" : "case-bound",
      tone: hasStorageBlock ? "red" : "gold",
      note: "Browser preview cannot pretend to be durable proof.",
    },
    {
      id: "tone",
      label: "tone",
      value: "anti-FOMO",
      tone: "cyan",
      note: "No countdowns, trade-direction prompts, ROI wording or artificial urgency.",
    },
    {
      id: "seal",
      label: "seal",
      value: status === "velvet_note_ready" ? "Velvet Note Seal" : "Note Mirror",
      tone: toneFromStress(noteStress),
      note: `note stress ${noteStress}/100`,
    },
  ];

  const previewNote = [
    `${safeSymbol(result)} evidence note: ${status.replaceAll("_", " ")}.`,
    blockers[0] ? `Primary lock: ${blockers[0]}.` : "Primary lock: none; keep note bounded and source-linked.",
    `Allowed lines: ${lines.filter((line) => line.state !== "blocked").length}/${lines.length}.`,
    "Evidence note stays short: anomaly/review/source-gap wording only.",
  ];

  return {
    version: "velmere_evidence_note_integrity_gate_v1_pass287",
    status,
    headline: status === "velvet_note_ready" ? "Velvet Note Seal" : "evidence note mirror",
    trustBadge: `note stress ${noteStress}/100`,
    operatorCue:
      status === "velvet_note_ready"
        ? "Velvet Note Seal active: the short evidence note is redacted, source-linked and still non-advisory."
        : "Evidence Note Mirror active: short notes stay quarantined until source, privacy, storage and retention gates align.",
    rails,
    lines,
    previewNote,
    blockers,
    nextAction: blockers[0] ?? "Keep the evidence note short, redacted, source-linked and separate from PDF/export approval.",
    customerBoundary:
      "Evidence notes may show only bounded review language, source gaps, redaction state and next operator action; raw payload, wallet/IP, accusations, guarantees, ROI language, trade-direction prompts and certificate wording remain blocked.",
  };
}
