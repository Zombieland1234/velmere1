import type { VlmBrainCustomerCopySanitizer } from "./vlm-brain-customer-copy-sanitizer";
import type { VlmBrainExportAuthorizationGate } from "./vlm-brain-export-authorization-gate";
import type { VlmBrainReportCapsuleEnvelope } from "./vlm-brain-report-capsule";
import type { VlmBrainSourcePolicyGate } from "./vlm-brain-source-policy-gate";

export type VlmBrainCustomerBriefSection = {
  id: "summary" | "source_confidence" | "missing_data" | "manual_review" | "export_boundary";
  label: string;
  state: "preview_only" | "blocked";
  copy: string;
};

export type VlmBrainCustomerBriefBuilder = {
  schemaVersion: "vlm-brain-customer-brief-builder-v1-pass249";
  briefMode: "sanitized_customer_preview_blocked";
  briefId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  briefDecision: "blocked" | "operator_preview_only";
  customerCopyReady: false;
  publicRouteAllowed: false;
  forbiddenClaimCount: number;
  sections: VlmBrainCustomerBriefSection[];
  operatorSummary: string;
  customerBoundary: string;
};

const SCHEMA = "vlm-brain-customer-brief-builder-v1-pass249" as const;
const forbidden = [/buy\s+signal/ig, /sell\s+signal/ig, /guaranteed\s+profit/ig, /risk[-\s]?free/ig, /safe\s+investment/ig, /scam\s+confirmed/ig, /fraud\s+proven/ig, /seed\s+phrase/ig, /private\s+key/ig];
function compact(value: unknown, fallback = "customer brief review required", limit = 420) { return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || fallback; }
function stableId(value: string) { return compact(value, "VLM-CUSTOMER-BRIEF", 260).toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
function sanitize(text: string) { return forbidden.reduce((out, pattern) => out.replace(pattern, "manual review"), compact(text)); }
function section(input: VlmBrainCustomerBriefSection): VlmBrainCustomerBriefSection { return { ...input, copy: sanitize(input.copy) }; }

export function buildVlmBrainCustomerBriefBuilder(
  capsule: VlmBrainReportCapsuleEnvelope,
  sanitizer: VlmBrainCustomerCopySanitizer,
  policy: VlmBrainSourcePolicyGate,
  exportGate: VlmBrainExportAuthorizationGate,
): VlmBrainCustomerBriefBuilder {
  const createdAt = capsule.generatedAt ?? sanitizer.createdAt ?? policy.createdAt ?? exportGate.createdAt ?? new Date().toISOString();
  const sourceText = [capsule.publicBrief, sanitizer.previewCopy, policy.operatorSummary, exportGate.operatorSummary].join(" ");
  const forbiddenClaimCount = forbidden.reduce((sum, pattern) => sum + (sourceText.match(pattern)?.length ?? 0), 0);
  const sections = [
    section({ id: "summary", label: "Public brief preview", state: "preview_only", copy: sanitizer.previewCopy || "Algorithmic risk flag requires source review before any customer brief." }),
    section({ id: "source_confidence", label: "Source confidence", state: policy.policyDecision === "blocked" ? "blocked" : "preview_only", copy: "Source confidence, adapter freshness and second-source requirements remain visible in the customer brief." }),
    section({ id: "missing_data", label: "Missing-data boundary", state: "preview_only", copy: "Missing, stale or fallback data is presented as uncertainty, never as neutral safety." }),
    section({ id: "manual_review", label: "Manual review status", state: exportGate.reviewCount > 0 ? "blocked" : "preview_only", copy: "Manual operator review is required before public export or PDF-ready customer copy." }),
    section({ id: "export_boundary", label: "Export boundary", state: "blocked", copy: exportGate.customerBoundary }),
  ];
  return {
    schemaVersion: SCHEMA,
    briefMode: "sanitized_customer_preview_blocked",
    briefId: stableId(`VLM-CUSTOMER-BRIEF-${exportGate.token.symbol}-${capsule.capsuleId}-${createdAt}`),
    createdAt,
    token: exportGate.token,
    briefDecision: exportGate.decision === "hard_block" || sanitizer.copyDecision === "blocked" || policy.policyDecision === "blocked" ? "blocked" : "operator_preview_only",
    customerCopyReady: false,
    publicRouteAllowed: false,
    forbiddenClaimCount,
    sections,
    operatorSummary: "PASS249 builds a sanitized customer-brief preview while keeping public route, binary PDF and customer copy disabled until authorization gates pass.",
    customerBoundary: "Preview copy only. No final verdict, no investment advice, no guaranteed safety and no raw source payload.",
  };
}

export const PASS249_VLM_BRAIN_CUSTOMER_BRIEF_BUILDER_CONTRACT = true;
