import type { VlmBrainReleaseChainAudit } from "./vlm-brain-release-chain-auditor";
import type { VlmBrainReleaseQaScorecard } from "./vlm-brain-release-qa-scorecard";

export type VlmBrainReleaseBlockerResolution = {
  id: "hard_blockers" | "review_lanes" | "browser_trace" | "durable_store" | "pdf_route" | "customer_copy";
  label: string;
  state: "blocked" | "review" | "operator_preview";
  priority: "P0" | "P1" | "P2";
  owner: "source" | "qa" | "storage" | "report" | "copy";
  score: number;
  nextAction: string;
  publicBoundary: string;
};

export type VlmBrainReleaseBlockerResolver = {
  schemaVersion: "vlm-brain-release-blocker-resolver-v1-pass225";
  resolverMode: "operator_blocker_resolution_preview";
  resolverId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  releaseAuditId: string;
  scorecardId: string;
  resolverDecision: "blocked" | "review_required" | "operator_preview_only";
  publicExportReady: false;
  binaryPdfReady: false;
  rawPayloadAllowed: false;
  p0Count: number;
  p1Count: number;
  lanes: VlmBrainReleaseBlockerResolution[];
  operatorSummary: string;
  customerBoundary: string;
};

const SCHEMA = "vlm-brain-release-blocker-resolver-v1-pass225" as const;
function compact(value: unknown, fallback = "blocker resolver review required", limit = 280) {
  return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || fallback;
}
function stableId(value: string) { return compact(value, "VLM-BLOCKER-RESOLVER", 240).toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0))); }
function lane(input: VlmBrainReleaseBlockerResolution): VlmBrainReleaseBlockerResolution { return { ...input, label: compact(input.label, "resolution lane", 120), score: clamp(input.score), nextAction: compact(input.nextAction, "manual review required"), publicBoundary: compact(input.publicBoundary, "operator-only; not customer proof") }; }
export function buildVlmBrainReleaseBlockerResolver(audit: VlmBrainReleaseChainAudit, qa: VlmBrainReleaseQaScorecard): VlmBrainReleaseBlockerResolver {
  const createdAt = qa.createdAt ?? audit.createdAt ?? new Date().toISOString();
  const hardBlocked = audit.hardBlockCount > 0 || qa.blockedLaneCount > 0;
  const review = audit.reviewCount > 0 || qa.reviewLaneCount > 0;
  const lanes = [
    lane({ id: "hard_blockers", label: "Hard blocker resolution", state: hardBlocked ? "blocked" : "operator_preview", priority: hardBlocked ? "P0" : "P2", owner: "qa", score: 100 - (audit.hardBlockCount + qa.blockedLaneCount) * 12, nextAction: "Resolve hard blockers before enabling any customer route, PDF download or public Lens handoff.", publicBoundary: "Hard blocker state must never be softened into a public confidence claim." }),
    lane({ id: "review_lanes", label: "Review lane cleanup", state: review ? "review" : "operator_preview", priority: review ? "P1" : "P2", owner: "source", score: 100 - (audit.reviewCount + qa.reviewLaneCount) * 5, nextAction: "Attach second-source evidence for review lanes and keep missing-data wording visible.", publicBoundary: "Review lanes may explain uncertainty only after manual review." }),
    lane({ id: "browser_trace", label: "Browser QA trace", state: "review", priority: "P1", owner: "qa", score: qa.browserQaRequired ? 42 : 70, nextAction: "Capture Vercel browser trace for modal layering, scroll lock, keyboard flow and motion FPS.", publicBoundary: "Browser QA is internal release evidence, not a customer-facing proof." }),
    lane({ id: "durable_store", label: "Durable store connection", state: "blocked", priority: "P0", owner: "storage", score: 35, nextAction: "Connect server-only source snapshot, case timeline, redaction envelope and export manifest stores.", publicBoundary: "Without durable storage there is no public export or source-proof claim." }),
    lane({ id: "pdf_route", label: "PDF route blocker", state: qa.binaryPdfReady ? "review" : "blocked", priority: "P0", owner: "report", score: qa.binaryPdfReady ? 62 : 28, nextAction: "Keep binary PDF disabled until generator, manifest, redaction and durable stores pass QA.", publicBoundary: "PDF-ready preview is not a security certificate or investment document." }),
    lane({ id: "customer_copy", label: "Customer copy boundary", state: "review", priority: "P1", owner: "copy", score: 64, nextAction: "Keep copy in anomaly/review/missing-data language; remove buy/sell/safety/profit claims.", publicBoundary: "Customer copy cannot present the token as safe, profitable or finally cleared." }),
  ];
  const p0Count = lanes.filter((item) => item.priority === "P0").length;
  const p1Count = lanes.filter((item) => item.priority === "P1").length;
  const resolverDecision = lanes.some((item) => item.state === "blocked") ? "blocked" : lanes.some((item) => item.state === "review") ? "review_required" : "operator_preview_only";
  return { schemaVersion: SCHEMA, resolverMode: "operator_blocker_resolution_preview", resolverId: stableId(`VLM-BLOCKER-RESOLVER-${audit.token.symbol}-${qa.scorecardId}-${createdAt}`), createdAt, token: audit.token, releaseAuditId: audit.auditId, scorecardId: qa.scorecardId, resolverDecision, publicExportReady: false, binaryPdfReady: false, rawPayloadAllowed: false, p0Count, p1Count, lanes, operatorSummary: resolverDecision === "blocked" ? "Release remains blocked: durable store, PDF route and unresolved source lanes must be handled first." : "Release remains operator-only; manual review and browser QA are still required.", customerBoundary: "Blocker resolver is internal release evidence only. It is not financial advice, not a final verdict and not a safety certificate." };
}
export const PASS225_VLM_BRAIN_RELEASE_BLOCKER_RESOLVER_CONTRACT = true;
