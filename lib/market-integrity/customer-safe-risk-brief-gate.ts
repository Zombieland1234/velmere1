import type { TokenRiskResult } from "./risk-types";
import type { OperatorCaseSlaOrchestratorGate } from "./operator-case-sla-orchestrator-gate";
import type { PrivacyRedactionEnvelopeGate } from "./privacy-redaction-envelope-gate";
import type { RetentionPolicyGate } from "./retention-policy-gate";
import type { SourceFreshnessRegistryGate } from "./source-freshness-registry-gate";
import type { StorageAdapterContractGate } from "./storage-adapter-contract-gate";

type CustomerSafeEvidenceDraft = {
  exportStatus: "blocked" | "review" | "ready";
  missingDataAppendix: string[];
};

export type CustomerSafeRiskBriefTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type CustomerSafeRiskBriefStatus =
  | "customer_export_blocked"
  | "source_review_required"
  | "operator_brief_draft"
  | "private_brief_ready";

export type CustomerSafeRiskBriefRail = {
  id: "brief" | "source" | "redaction" | "storage" | "retention" | "seal";
  label: string;
  value: string;
  tone: CustomerSafeRiskBriefTone;
  note: string;
};

export type CustomerSafeRiskBriefLane = {
  id:
    | "executive_summary"
    | "risk_language"
    | "source_appendix"
    | "missing_data"
    | "redaction_boundary"
    | "export_route"
    | "customer_status";
  label: string;
  state: "customer_safe" | "operator_only" | "needs_review" | "blocked";
  copyClass: "public_brief" | "review_only" | "redacted_appendix" | "blocked_raw";
  value: string;
  note: string;
};

export type CustomerSafeRiskBriefGate = {
  version: "velmere_customer_safe_risk_brief_gate_v1_pass285";
  status: CustomerSafeRiskBriefStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: CustomerSafeRiskBriefRail[];
  lanes: CustomerSafeRiskBriefLane[];
  blockers: string[];
  customerBrief: string[];
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

function toneFromScore(score: number): CustomerSafeRiskBriefTone {
  if (score >= 78) return "red";
  if (score >= 55) return "amber";
  if (score >= 32) return "gold";
  return "green";
}

function laneCost(lane: CustomerSafeRiskBriefLane) {
  const stateCost =
    lane.state === "customer_safe"
      ? 12
      : lane.state === "needs_review"
        ? 52
        : lane.state === "operator_only"
          ? 66
          : 94;
  const copyCost =
    lane.copyClass === "public_brief"
      ? 14
      : lane.copyClass === "redacted_appendix"
        ? 30
        : lane.copyClass === "review_only"
          ? 56
          : 96;
  return Math.round(stateCost * 0.62 + copyCost * 0.38);
}

function sourceHasOpenGap(gate: SourceFreshnessRegistryGate) {
  return gate.entries.some((entry) => entry.state === "missing" || entry.state === "stale" || entry.state === "blocked");
}

function privacyHasRawBlock(gate: PrivacyRedactionEnvelopeGate) {
  return gate.lanes.some((lane) => lane.exposure === "blocked_raw");
}

function storageIsMissing(gate: StorageAdapterContractGate) {
  return gate.status === "server_adapter_missing" || gate.lanes.some((lane) => lane.state === "blocked");
}

function retentionIsBlocked(gate: RetentionPolicyGate) {
  return gate.status !== "private_retention_seal";
}

function operatorCaseOpen(gate: OperatorCaseSlaOrchestratorGate) {
  return gate.status !== "private_concierge_case";
}

function briefLine(result: TokenRiskResult, confidencePercent: number) {
  const scoreLabel = result.score >= 75 ? "critical review" : result.score >= 55 ? "high review" : result.score >= 35 ? "watch" : "calm prescreen";
  return `${result.token.symbol} is in ${scoreLabel} mode with ${confidencePercent}% confidence; missing or stale evidence must stay visible.`;
}

export function buildCustomerSafeRiskBriefGate(
  result: TokenRiskResult,
  evidenceReportDraft: CustomerSafeEvidenceDraft,
  sourceFreshnessRegistryGate: SourceFreshnessRegistryGate,
  storageAdapterContractGate: StorageAdapterContractGate,
  privacyRedactionEnvelopeGate: PrivacyRedactionEnvelopeGate,
  operatorCaseSlaOrchestratorGate: OperatorCaseSlaOrchestratorGate,
  retentionPolicyGate: RetentionPolicyGate,
): CustomerSafeRiskBriefGate {
  const confidencePercent = Math.round((result.confidence ?? 0.35) * 100);
  const sourceGap = sourceHasOpenGap(sourceFreshnessRegistryGate);
  const privacyBlocked = privacyHasRawBlock(privacyRedactionEnvelopeGate);
  const storageMissing = storageIsMissing(storageAdapterContractGate);
  const retentionBlocked = retentionIsBlocked(retentionPolicyGate);
  const caseOpen = operatorCaseOpen(operatorCaseSlaOrchestratorGate);
  const draftBlocked = evidenceReportDraft.exportStatus === "blocked";
  const hasMissingAppendix = evidenceReportDraft.missingDataAppendix.length > 0;
  const highRisk = result.score >= 72 || result.level === "critical" || result.level === "high";
  const liveData = result.dataQuality === "live";

  const lanes: CustomerSafeRiskBriefLane[] = [
    {
      id: "executive_summary",
      label: "executive summary",
      state: draftBlocked || confidencePercent < 55 ? "needs_review" : "customer_safe",
      copyClass: "public_brief",
      value: briefLine(result, confidencePercent),
      note: "short customer copy is allowed only as a bounded review summary, never as proof or trading instruction",
    },
    {
      id: "risk_language",
      label: "risk language",
      state: highRisk ? "operator_only" : "customer_safe",
      copyClass: highRisk ? "review_only" : "public_brief",
      value: highRisk ? "escalated review wording" : "calm review wording",
      note: "strong words are held behind operator review; public copy uses anomaly/source/missing-data language",
    },
    {
      id: "source_appendix",
      label: "source appendix",
      state: sourceGap ? "blocked" : "customer_safe",
      copyClass: sourceGap ? "blocked_raw" : "redacted_appendix",
      value: sourceGap ? "source TTL gap" : "source appendix attached",
      note: "chart, depth, policy and receipt freshness must be attached before public brief confidence increases",
    },
    {
      id: "missing_data",
      label: "missing data",
      state: hasMissingAppendix ? "needs_review" : "customer_safe",
      copyClass: hasMissingAppendix ? "review_only" : "public_brief",
      value: hasMissingAppendix ? `${evidenceReportDraft.missingDataAppendix.length} items` : "no explicit appendix",
      note: "missing data is displayed as uncertainty and cannot be converted into a clean trust badge",
    },
    {
      id: "redaction_boundary",
      label: "redaction boundary",
      state: privacyBlocked ? "blocked" : "customer_safe",
      copyClass: privacyBlocked ? "blocked_raw" : "redacted_appendix",
      value: privacyBlocked ? "raw payload blocked" : "redacted boundary",
      note: "raw query, wallet/IP, analytics payload and operator notes remain private unless redaction passes",
    },
    {
      id: "export_route",
      label: "export route",
      state: storageMissing || retentionBlocked ? "blocked" : "needs_review",
      copyClass: storageMissing || retentionBlocked ? "blocked_raw" : "redacted_appendix",
      value: storageMissing ? "storage missing" : retentionBlocked ? "TTL owner missing" : "review route",
      note: "binary PDF/download remains locked until server storage, TTL owner, redaction and source replay are proven",
    },
    {
      id: "customer_status",
      label: "customer status",
      state: caseOpen || !liveData ? "operator_only" : "customer_safe",
      copyClass: caseOpen || !liveData ? "review_only" : "public_brief",
      value: caseOpen ? "concierge hold" : liveData ? "live review" : "demo/partial hold",
      note: "elitarny status is earned through proof completion, with no buy/sell prompts, scarcity pressure or countdown mechanics",
    },
  ];

  const laneStress = Math.round(clamp(lanes.reduce((sum, lane) => sum + laneCost(lane), 0) / lanes.length));
  const sourceStress = parseScore(sourceFreshnessRegistryGate.trustBadge) ?? 66;
  const storageStress = parseScore(storageAdapterContractGate.trustBadge) ?? 76;
  const privacyStress = parseScore(privacyRedactionEnvelopeGate.trustBadge) ?? 72;
  const retentionStress = parseScore(retentionPolicyGate.trustBadge) ?? 74;
  const reportStress = draftBlocked ? 82 : evidenceReportDraft.exportStatus === "review" ? 48 : 26;
  const briefStress = Math.round(
    clamp(
      laneStress * 0.30 +
        sourceStress * 0.15 +
        storageStress * 0.14 +
        privacyStress * 0.14 +
        retentionStress * 0.12 +
        reportStress * 0.10 +
        (confidencePercent < 55 ? 70 : 24) * 0.05,
    ),
  );

  const blockers = [
    draftBlocked ? "evidence report draft export is blocked" : null,
    sourceGap ? "source freshness appendix has stale/missing/blocked lanes" : null,
    privacyBlocked ? "privacy redaction envelope still blocks raw payload" : null,
    storageMissing ? "server storage adapter proof missing" : null,
    retentionBlocked ? "retention/delete owner or TTL policy not sealed" : null,
    caseOpen ? "operator case SLA still open" : null,
    !liveData ? "live source quality not attached" : null,
    hasMissingAppendix ? "missing-data appendix must remain visible" : null,
  ].filter((item): item is string => Boolean(item));

  const status: CustomerSafeRiskBriefStatus =
    privacyBlocked || storageMissing || retentionBlocked || blockers.length >= 5
      ? "customer_export_blocked"
      : sourceGap || draftBlocked || briefStress >= 66
        ? "source_review_required"
        : caseOpen || briefStress >= 42
          ? "operator_brief_draft"
          : "private_brief_ready";

  const customerBrief = [
    briefLine(result, confidencePercent),
    `Dominant status: ${status.replaceAll("_", " ")}.`,
    blockers[0] ? `Primary boundary: ${blockers[0]}.` : "Primary boundary: customer copy may stay short, redacted and source-linked.",
    "This is an evidence routing summary, not a safety certificate or trading instruction.",
  ];

  const rails: CustomerSafeRiskBriefRail[] = [
    {
      id: "brief",
      label: "brief",
      value: evidenceReportDraft.exportStatus,
      tone: draftBlocked ? "red" : evidenceReportDraft.exportStatus === "review" ? "amber" : "green",
      note: "customer brief follows the evidence draft state",
    },
    {
      id: "source",
      label: "source",
      value: sourceGap ? "gap visible" : "appendix ready",
      tone: sourceGap ? "amber" : "green",
      note: "chart/depth/source TTL stays close to the decision surface",
    },
    {
      id: "redaction",
      label: "redaction",
      value: privacyBlocked ? "raw locked" : "masked",
      tone: privacyBlocked ? "red" : "green",
      note: "private payloads are never moved into public customer copy",
    },
    {
      id: "storage",
      label: "storage",
      value: storageMissing ? "not durable" : "contracted",
      tone: storageMissing ? "red" : "gold",
      note: "browser previews cannot become proof receipts",
    },
    {
      id: "retention",
      label: "retention",
      value: retentionBlocked ? "TTL hold" : "TTL sealed",
      tone: retentionBlocked ? "amber" : "green",
      note: "delete/hold policy controls export eligibility",
    },
    {
      id: "seal",
      label: "seal",
      value: status === "private_brief_ready" ? "Velvet Brief Seal" : "Proof Compass",
      tone: toneFromScore(briefStress),
      note: `brief stress ${briefStress}/100`,
    },
  ];

  return {
    version: "velmere_customer_safe_risk_brief_gate_v1_pass285",
    status,
    headline: status === "private_brief_ready" ? "Velvet Brief Seal" : "Customer risk brief proof compass",
    trustBadge: `brief stress ${briefStress}/100`,
    operatorCue:
      status === "private_brief_ready"
        ? "Velvet Brief Seal active: customer summary is short, redacted, source-linked and bounded by retention policy."
        : "Proof Compass active: public customer copy stays in a calm waiting room until source, storage, redaction and retention gates align.",
    rails,
    lanes,
    blockers,
    customerBrief,
    nextAction: blockers[0] ?? "Attach the redacted source appendix and keep the customer brief short.",
    customerBoundary:
      "Customer-facing report copy may show only review status, source limits and missing-data boundaries; raw payload, wallet/IP, guarantees, accusations and buy/sell pressure remain blocked.",
  };
}
