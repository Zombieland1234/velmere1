import type { TokenRiskResult } from "./risk-types";
import type { CustomerSafeRiskBriefGate } from "./customer-safe-risk-brief-gate";
import type { PrivacyRedactionEnvelopeGate } from "./privacy-redaction-envelope-gate";
import type { RetentionPolicyGate } from "./retention-policy-gate";
import type { SourceFreshnessRegistryGate } from "./source-freshness-registry-gate";
import type { StorageAdapterContractGate } from "./storage-adapter-contract-gate";

type EvidenceReportDraft = {
  exportStatus: "blocked" | "review" | "ready";
  missingDataAppendix: string[];
};

export type LensReportPreviewTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type LensReportPreviewStatus =
  | "preview_frozen"
  | "source_appendix_review"
  | "operator_preview_draft"
  | "velvet_preview_ready";

export type LensReportPreviewRail = {
  id: "lens" | "summary" | "appendix" | "layout" | "privacy" | "seal";
  label: string;
  value: string;
  tone: LensReportPreviewTone;
  note: string;
};

export type LensReportPreviewSection = {
  id:
    | "front_card"
    | "risk_brief"
    | "source_appendix"
    | "missing_data"
    | "redaction_note"
    | "operator_boundary"
    | "export_footer";
  label: string;
  state: "public_preview" | "redacted_appendix" | "operator_only" | "blocked";
  layout: "cover" | "brief" | "appendix" | "boundary" | "footer";
  value: string;
  note: string;
};

export type LensReportPreviewGate = {
  version: "velmere_lens_report_preview_gate_v1_pass286";
  status: LensReportPreviewStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: LensReportPreviewRail[];
  sections: LensReportPreviewSection[];
  previewLines: string[];
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

function toneFromStress(stress: number): LensReportPreviewTone {
  if (stress >= 78) return "red";
  if (stress >= 56) return "amber";
  if (stress >= 34) return "gold";
  return "green";
}

function sectionStress(section: LensReportPreviewSection) {
  const stateStress =
    section.state === "public_preview"
      ? 14
      : section.state === "redacted_appendix"
        ? 32
        : section.state === "operator_only"
          ? 68
          : 94;
  const layoutStress =
    section.layout === "cover"
      ? 18
      : section.layout === "brief"
        ? 24
        : section.layout === "appendix"
          ? 44
          : section.layout === "boundary"
            ? 62
            : 36;
  return Math.round(stateStress * 0.72 + layoutStress * 0.28);
}

function sourceHasGap(gate: SourceFreshnessRegistryGate) {
  return gate.entries.some((entry) => entry.state === "missing" || entry.state === "stale" || entry.state === "blocked");
}

function privacyBlocksRaw(gate: PrivacyRedactionEnvelopeGate) {
  return gate.lanes.some((lane) => lane.exposure === "blocked_raw");
}

function storageBlocksPreview(gate: StorageAdapterContractGate) {
  return gate.status === "server_adapter_missing" || gate.lanes.some((lane) => lane.state === "blocked");
}

function retentionBlocksPreview(gate: RetentionPolicyGate) {
  return gate.status !== "private_retention_seal";
}

function briefBlocksPreview(gate: CustomerSafeRiskBriefGate) {
  return gate.status === "customer_export_blocked" || gate.blockers.length >= 4;
}

export function buildLensReportPreviewGate(
  result: TokenRiskResult,
  evidenceReportDraft: EvidenceReportDraft,
  customerSafeRiskBriefGate: CustomerSafeRiskBriefGate,
  sourceFreshnessRegistryGate: SourceFreshnessRegistryGate,
  storageAdapterContractGate: StorageAdapterContractGate,
  privacyRedactionEnvelopeGate: PrivacyRedactionEnvelopeGate,
  retentionPolicyGate: RetentionPolicyGate,
): LensReportPreviewGate {
  const sourceGap = sourceHasGap(sourceFreshnessRegistryGate);
  const privacyBlocked = privacyBlocksRaw(privacyRedactionEnvelopeGate);
  const storageBlocked = storageBlocksPreview(storageAdapterContractGate);
  const retentionBlocked = retentionBlocksPreview(retentionPolicyGate);
  const briefBlocked = briefBlocksPreview(customerSafeRiskBriefGate);
  const draftBlocked = evidenceReportDraft.exportStatus === "blocked";
  const hasMissingAppendix = evidenceReportDraft.missingDataAppendix.length > 0;
  const confidencePercent = Math.round((result.confidence ?? 0.35) * 100);
  const reportCanShowPreview = !privacyBlocked && !storageBlocked && !retentionBlocked && !briefBlocked;

  const sections: LensReportPreviewSection[] = [
    {
      id: "front_card",
      label: "front card",
      state: confidencePercent < 50 || draftBlocked ? "operator_only" : "public_preview",
      layout: "cover",
      value: `${result.token.symbol} · ${result.level.toUpperCase()} review · ${confidencePercent}% confidence`,
      note: "Lens preview starts with a calm status card, not a buy/sell headline or countdown.",
    },
    {
      id: "risk_brief",
      label: "risk brief",
      state: briefBlocked ? "blocked" : "public_preview",
      layout: "brief",
      value: customerSafeRiskBriefGate.customerBrief[0] ?? "bounded customer brief pending",
      note: "Customer-safe summary is reused from the brief gate to prevent contradictory report copy.",
    },
    {
      id: "source_appendix",
      label: "source appendix",
      state: sourceGap ? "blocked" : "redacted_appendix",
      layout: "appendix",
      value: sourceGap ? "freshness gap visible" : "TTL source appendix ready",
      note: "Chart, depth, holder, contract, OSINT and receipt state stay attached to the preview shell.",
    },
    {
      id: "missing_data",
      label: "missing data",
      state: hasMissingAppendix ? "operator_only" : "public_preview",
      layout: "appendix",
      value: hasMissingAppendix ? `${evidenceReportDraft.missingDataAppendix.length} open items` : "no extra appendix items",
      note: "Missing evidence is printed as uncertainty; it never becomes a premium trust badge.",
    },
    {
      id: "redaction_note",
      label: "redaction note",
      state: privacyBlocked ? "blocked" : "redacted_appendix",
      layout: "boundary",
      value: privacyBlocked ? "raw payload locked" : "private fields masked",
      note: "Raw wallet/IP, raw query, analytics payload and operator notes stay outside customer preview.",
    },
    {
      id: "operator_boundary",
      label: "operator boundary",
      state: storageBlocked || retentionBlocked ? "blocked" : "operator_only",
      layout: "boundary",
      value: storageBlocked ? "storage missing" : retentionBlocked ? "TTL owner missing" : "operator signoff required",
      note: "Browser preview is not durable proof; PDF/export remains locked without server storage and retention.",
    },
    {
      id: "export_footer",
      label: "export footer",
      state: reportCanShowPreview && !draftBlocked ? "public_preview" : "blocked",
      layout: "footer",
      value: reportCanShowPreview && !draftBlocked ? "preview only" : "download frozen",
      note: "Footer states that this is evidence routing, not certificate wording, guarantees or advice.",
    },
  ];

  const sectionLoad = Math.round(clamp(sections.reduce((sum, section) => sum + sectionStress(section), 0) / sections.length));
  const sourceStress = parseScore(sourceFreshnessRegistryGate.trustBadge) ?? 70;
  const briefStress = parseScore(customerSafeRiskBriefGate.trustBadge) ?? 64;
  const storageStress = parseScore(storageAdapterContractGate.trustBadge) ?? 74;
  const privacyStress = parseScore(privacyRedactionEnvelopeGate.trustBadge) ?? 70;
  const retentionStress = parseScore(retentionPolicyGate.trustBadge) ?? 78;
  const previewStress = Math.round(
    clamp(
      sectionLoad * 0.32 +
        sourceStress * 0.14 +
        briefStress * 0.14 +
        storageStress * 0.13 +
        privacyStress * 0.12 +
        retentionStress * 0.10 +
        (draftBlocked ? 82 : 22) * 0.05,
    ),
  );

  const blockers = [
    draftBlocked ? "evidence report draft is still blocked" : null,
    briefBlocked ? "customer-safe brief gate is not ready" : null,
    sourceGap ? "source freshness appendix has stale/missing/blocked lanes" : null,
    privacyBlocked ? "redaction envelope blocks raw payload" : null,
    storageBlocked ? "durable storage adapter proof missing" : null,
    retentionBlocked ? "retention/delete policy not sealed" : null,
    hasMissingAppendix ? "missing-data appendix must stay visible" : null,
  ].filter((item): item is string => Boolean(item));

  const status: LensReportPreviewStatus =
    privacyBlocked || storageBlocked || retentionBlocked || blockers.length >= 5
      ? "preview_frozen"
      : sourceGap || briefBlocked || draftBlocked || previewStress >= 66
        ? "source_appendix_review"
        : previewStress >= 42 || hasMissingAppendix
          ? "operator_preview_draft"
          : "velvet_preview_ready";

  const previewLines = [
    `${result.token.symbol} Lens preview: ${status.replaceAll("_", " ")}.`,
    blockers[0] ? `Primary lock: ${blockers[0]}.` : "Primary lock: none; preview still remains source-linked and non-advisory.",
    `Visible sections: ${sections.filter((section) => section.state !== "blocked").length}/${sections.length}.`,
    "No buy/sell prompts, no profit language, no certificate wording, no scarcity countdown.",
  ];

  const rails: LensReportPreviewRail[] = [
    {
      id: "lens",
      label: "lens",
      value: status === "velvet_preview_ready" ? "preview ready" : "preview hold",
      tone: status === "velvet_preview_ready" ? "green" : status === "preview_frozen" ? "red" : "amber",
      note: "Lens is a preview composer, not an export approval.",
    },
    {
      id: "summary",
      label: "summary",
      value: briefBlocked ? "brief locked" : "brief linked",
      tone: briefBlocked ? "red" : "green",
      note: "Customer brief copy is reused from the safe brief gate.",
    },
    {
      id: "appendix",
      label: "appendix",
      value: sourceGap ? "TTL gap" : "source stitched",
      tone: sourceGap ? "amber" : "green",
      note: "MEXC-style market context stays close to the decision surface.",
    },
    {
      id: "layout",
      label: "layout",
      value: "folded passport",
      tone: "gold",
      note: "Proof Passport Scroll compresses cover, brief, appendix and boundary into one calm rail.",
    },
    {
      id: "privacy",
      label: "privacy",
      value: privacyBlocked ? "raw locked" : "masked",
      tone: privacyBlocked ? "red" : "green",
      note: "Luxury-style traceability is shown without leaking private payload.",
    },
    {
      id: "seal",
      label: "seal",
      value: status === "velvet_preview_ready" ? "Velvet Preview Seal" : "Preview Compass",
      tone: toneFromStress(previewStress),
      note: `preview stress ${previewStress}/100`,
    },
  ];

  return {
    version: "velmere_lens_report_preview_gate_v1_pass286",
    status,
    headline: status === "velvet_preview_ready" ? "Velvet Preview Seal" : "Lens report preview compass",
    trustBadge: `preview stress ${previewStress}/100`,
    operatorCue:
      status === "velvet_preview_ready"
        ? "Velvet Preview Seal active: Lens can show a redacted, source-linked preview shell without enabling download."
        : "Preview Compass active: Lens keeps the report in a quiet waiting room until source appendix, redaction, storage and retention gates align.",
    rails,
    sections,
    previewLines,
    blockers,
    nextAction: blockers[0] ?? "Keep the Lens preview short, redacted, source-linked and locked from binary download.",
    customerBoundary:
      "Lens report preview may show only bounded status, source limits, missing-data boundaries and redacted appendix signals; raw payload, wallet/IP, guarantees, accusations, ROI language and buy/sell pressure remain blocked.",
  };
}
