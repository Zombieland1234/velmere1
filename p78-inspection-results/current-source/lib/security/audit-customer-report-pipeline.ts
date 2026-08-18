import { ASCII_CONTROL_OR_MARKUP_PATTERN } from "./ascii-control-characters";

import { normalizeProviderFamily } from "@/lib/ai/evidence-normalization";
import { canonicalJson } from "@/lib/security/canonical-json";
import { sha256Digest } from "@/lib/security/cryptographic-digest";
import {
  isPass4644CommerciallyFreshReceipt,
  type Pass4644ProviderEvidenceReceipt,
} from "@/lib/market-integrity/provider-evidence-receipt";
import { buildCustomerReportPayload, type CustomerReportDecisionSection } from "@/lib/market-integrity/customer-report-payload";
import { buildCustomerReportLayoutModel } from "@/lib/market-integrity/customer-report-layout-model";
import { requireRiskScore } from "@/lib/market-integrity/risk-score-availability";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
import type { Pass2578AuditReportAssemblerReport, Pass2578ReportSection } from "@/lib/security/audit-report-assembler";
import type { Pass2572AuditProviderRuntimeReport, Pass2572RuntimeLane } from "@/lib/security/audit-provider-runtime-client";
import { evaluateAuditPaidEvidenceReadiness, isStrictAuditEvidenceLane } from "@/lib/security/audit-paid-evidence-readiness";
import { getAuditTierContract, type AuditTierId } from "@/lib/security/audit-tier-contract";
import { projectAuditReportForCustomer } from "@/lib/security/audit-report-customer-projection";
import { getVlmCurrentSkuTruth } from "@/lib/commerce/vlm-current-sku-truth";
import { verifyAuditAdjudicatedAuthorityEvidence, type AuditAdjudicatedAuthorityEvidence } from "@/lib/security/audit-adjudicated-authority-evidence";

export const PASS4820_AUDIT_CUSTOMER_REPORT_PIPELINE_ID = "pass4820-audit-customer-report-pipeline-v1" as const;

function tierLabel(tier: AuditTierId): VelmereTier {
  return tier === "advanced" ? "Advanced" : tier === "pro" ? "Pro" : "Basic";
}

function clean(value: unknown, max = 900) {
  return typeof value === "string"
    ? value.replace(ASCII_CONTROL_OR_MARKUP_PATTERN, " ").replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function auditState(section: Pass2578ReportSection): CustomerReportDecisionSection["state"] {
  if (section.state === "ready") return "ready";
  if (section.state === "partial" || section.state === "manual_review") return "watch";
  if (section.state === "blocked") return "blocked";
  return "missing";
}

function decisionSection(section: Pass2578ReportSection): CustomerReportDecisionSection {
  const minimumTier: VelmereTier = section.tier === "pro" ? "Pro" : section.tier === "advanced" ? "Advanced" : "Basic";
  const evidence = [
    section.evidenceCount > 0 ? `${section.evidenceCount} evidence rows` : "",
    ...section.sourceFamilies.map((family) => `source:${family}`),
    section.missingCount > 0 ? `${section.missingCount} missing evidence rows` : "",
  ].filter(Boolean);
  return {
    id: `audit-${section.id}`,
    title: section.title,
    minimumTier,
    state: auditState(section),
    summary: minimumTier === "Basic" ? section.customerSummary : section.proPdfSummary,
    evidence,
    actions: [section.advancedAction, section.state !== "ready" ? "Keep unresolved evidence visible in the customer report." : "Revalidate evidence before expiry."],
  };
}

function advancedDecisionSection(args: { report: Pass2578AuditReportAssemblerReport; qualityControlVerified: boolean; monitoringConfigured: boolean }): CustomerReportDecisionSection {
  const advancedTruth = getVlmCurrentSkuTruth("advanced", "en");
  return {
    id: "audit-advanced-availability-boundary",
    title: "Advanced availability and quality-control boundary",
    minimumTier: "Advanced",
    state: "blocked",
    summary: "Advanced is not for sale. Internal quality-control evidence may be retained for evaluation, but it does not unlock public delivery, human-review claims, operator sign-off or certification.",
    evidence: [
      `availability:${advancedTruth.decision}`,
      args.qualityControlVerified ? "internal quality-control receipt present" : "internal quality-control receipt missing",
      args.monitoringConfigured ? "internal monitoring/recheck configured" : "internal monitoring/recheck not configured",
      `${args.report.advancedQueue.length} automated analysis actions identified`,
    ],
    actions: [
      "Keep Advanced customer delivery blocked.",
      "Use Basic or an invitation-only Pro beta after the required evidence and internal quality-control checks pass.",
    ],
  };
}

function normalizedTarget(report: Pass2578AuditReportAssemblerReport) {
  return report.target.contractAddress ?? report.target.projectName ?? "unknown-audit-target";
}

function receiptFromLane(lane: Pass2572RuntimeLane, target: string, generatedAt: string): Pass4644ProviderEvidenceReceipt {
  const receipt = lane.receipt;
  const strict = isStrictAuditEvidenceLane(lane);
  const receivedAt = Number.isFinite(Date.parse(generatedAt)) ? generatedAt : new Date().toISOString();
  const observedAt = receipt?.observedAt && Number.isFinite(Date.parse(receipt.observedAt)) ? receipt.observedAt : "";
  const observedAtMs = Date.parse(observedAt);
  const receivedAtMs = Date.parse(receivedAt);
  const ttlMs = 15 * 60_000;
  const expiresAt = new Date((Number.isFinite(observedAtMs) ? observedAtMs : receivedAtMs) + ttlMs).toISOString();
  const futureObserved = Number.isFinite(observedAtMs) && observedAtMs > receivedAtMs + 120_000;
  // The runtime client records transport capture time, not a timestamp emitted by
  // the upstream payload. Preserve it for audit chronology but never call it provider-fresh.
  const timestampProvenance = !receipt
    ? "missing" as const
    : Number.isFinite(observedAtMs)
      ? "transport_received" as const
      : "invalid" as const;
  const fresh = false;
  const providerId = clean(lane.provider, 100) || clean(lane.label, 100) || "unknown-provider";
  const providerFamily = clean(lane.lineage?.upstreamRoot, 100) || clean(lane.providerFamily, 100) || providerId;
  const payloadHash = /^[a-f0-9]{64}$/i.test(String(receipt?.bodyDigest ?? ""))
    ? String(receipt?.bodyDigest).toLowerCase()
    : sha256Digest(canonicalJson({ lane: lane.id, state: lane.state, observedAt })).replace(/^sha256:/, "");
  const resolvedAddress = lane.identity?.resolvedAddress?.toLowerCase();
  const resolvedChainId = lane.identity?.resolvedChainId?.toLowerCase();
  const rejectionReasons = [
    !strict ? `strict_audit_lane_required:${lane.state}` : null,
    lane.identity?.verification !== "exact_response" ? "exact_response_identity_required" : null,
    lane.identity?.matched !== true ? "audit_target_identity_mismatch" : null,
    lane.lineage?.independenceEligible !== true ? "upstream_not_independence_eligible" : null,
    !receipt ? "content_bound_response_receipt_missing" : null,
    !receipt ? "provider_timestamp_missing" : null,
    receipt && !Number.isFinite(observedAtMs) ? "provider_timestamp_invalid" : null,
    timestampProvenance === "transport_received" ? "provider_timestamp_not_source_bound" : null,
    futureObserved ? "provider_timestamp_from_future" : null,
  ].filter((value): value is string => Boolean(value));
  return {
    schemaVersion: "pass4644_provider_evidence_receipt_v1",
    receiptId: `audit_${sha256Digest(canonicalJson({ lane: lane.id, providerId, providerFamily, payloadHash, observedAt })).replace(/^sha256:/, "").slice(0, 24)}`,
    providerId,
    providerFamily,
    surface: "contract_audit",
    verification: receipt ? "raw_response" : "health_only",
    state: strict ? "confirmed" : lane.state === "partial" ? "partial" : "rejected",
    identity: {
      requested: target.toLowerCase().slice(0, 180),
      resolvedAddress,
      resolvedChainId,
      matched: lane.identity?.matched === true,
    },
    capabilities: Array.from(new Set([lane.providerFamily ?? "audit", ...lane.evidence.map((item) => clean(item, 80)).filter(Boolean)])).slice(0, 12),
    timestampProvenance,
    observedAt,
    receivedAt,
    expiresAt,
    freshnessMs: null,
    fresh,
    httpStatus: receipt?.statusCode ?? (strict ? 200 : 0),
    latencyMs: Math.max(0, Math.round(lane.latencyMs ?? 0)),
    payloadBytes: Math.max(0, Math.round(receipt?.bodyBytes ?? 0)),
    payloadHash,
    commercialEvidenceEligible: strict && fresh && rejectionReasons.length === 0,
    rejectionReasons,
  };
}

function coverage(args: {
  report: Pass2578AuditReportAssemblerReport;
  providerRuntime: Pass2572AuditProviderRuntimeReport;
  strictCount: number;
  strictUpstreamCount: number;
}) {
  const totalLanes = Math.max(1, args.providerRuntime.lanes.length);
  const providerCoverage = Math.round((args.strictCount / totalLanes) * 100);
  const freshnessSection = args.report.sections.find((section) => section.id === "freshness-ledger");
  const permissionSection = args.report.sections.find((section) => section.id === "permission-parser");
  const liquiditySection = args.report.sections.find((section) => section.id === "liquidity-holder-lock-risk");
  return {
    data: Math.max(0, Math.min(100, args.report.finalVerdict.readinessScore)),
    provider: Math.max(0, Math.min(100, providerCoverage + Math.min(20, args.strictUpstreamCount * 5))),
    historical: freshnessSection?.state === "ready" ? 92 : freshnessSection?.state === "partial" ? 68 : 30,
    evidence: Math.max(0, Math.min(100, args.report.finalVerdict.sourceConfidence)),
    onchain: Math.max(0, Math.min(100, 50 + (permissionSection?.evidenceCount ?? 0) * 5 - (permissionSection?.missingCount ?? 0) * 7)),
    security: Math.max(0, Math.min(100, 55 + (liquiditySection?.evidenceCount ?? 0) * 4 - args.report.summary.totalMissing * 3)),
  };
}

const MANUAL_REVIEW_RECEIPT_PATTERN = /^(?:manual|vlm)_receipt_[a-z0-9_-]{16,96}$/i;

function normalizeVerifiedManualReviewReceiptId(value: string | null | undefined) {
  const receiptId = String(value ?? "").trim();
  return MANUAL_REVIEW_RECEIPT_PATTERN.test(receiptId) ? receiptId : null;
}

function secureAccessBindings(args: {
  requestedTier: AuditTierId;
  paymentVerified: boolean;
  accountBindingHash?: string | null;
  entitlementId?: string | null;
  paidEntitlementBinding?: string | null;
  paidTokenNonce?: string | null;
  payloadDigest: string;
  manualReviewReceiptId?: string | null;
  manualReviewVerified: boolean;
}) {
  if (args.requestedTier === "basic" || !args.paymentVerified) return {};
  const seed = sha256Digest(canonicalJson({
    account: args.accountBindingHash ?? "",
    entitlement: args.entitlementId ?? "",
    entitlementBinding: args.paidEntitlementBinding ?? args.paidTokenNonce ?? "",
    payload: args.payloadDigest,
  })).replace(/^sha256:/, "");
  const accountHex = /^[a-f0-9]{18,64}$/i.test(String(args.accountBindingHash ?? ""))
    ? String(args.accountBindingHash).slice(0, 64)
    : seed.slice(0, 40);
  const manualReviewReceiptId = args.manualReviewVerified
    ? normalizeVerifiedManualReviewReceiptId(args.manualReviewReceiptId)
    : null;
  return {
    accountId: `server:${accountHex}`,
    serverReceiptId: `vlm_receipt_${seed.slice(0, 32)}`,
    reportToken: `vlm_rpt_${seed.slice(8, 48)}`,
    payloadHash: args.payloadDigest,
    manualReviewReceiptId,
    accessVerification: {
      accountBound: true,
      serverReceiptVerified: true,
      reportTokenVerified: true,
      payloadHashBound: true,
      manualReviewVerified: args.manualReviewVerified && Boolean(manualReviewReceiptId),
      source: "server_entitlement" as const,
    },
  };
}

export function buildPass4820AuditCustomerReportPipeline(args: {
  report: Pass2578AuditReportAssemblerReport;
  providerRuntime: Pass2572AuditProviderRuntimeReport;
  requestedTier: AuditTierId;
  paymentVerified: boolean;
  evidenceLedgerVerified: boolean;
  accountBindingHash?: string | null;
  entitlementId?: string | null;
  paidEntitlementBinding?: string | null;
  paidTokenNonce?: string | null;
  manualReviewReceiptId?: string | null;
  manualReviewVerified?: boolean;
  monitoringConfigured?: boolean;
  authorityEvidence?: AuditAdjudicatedAuthorityEvidence | null;
}) {
  const reportRiskScore = requireRiskScore(
    args.report.finalVerdict.riskScore,
    "audit_customer_report",
  );
  // A boolean from an upstream adapter is not customer-facing quality-control authority.
  // The legacy receipt can support internal evaluation only; it never unlocks Advanced,
  // human-review copy, operator sign-off, certification or public sale.
  const manualReviewReceiptId = normalizeVerifiedManualReviewReceiptId(args.manualReviewReceiptId);
  const manualReviewVerified = args.manualReviewVerified === true && Boolean(manualReviewReceiptId);
  const monitoringConfigured = manualReviewVerified && args.monitoringConfigured === true;
  const authorityEvidence = verifyAuditAdjudicatedAuthorityEvidence(args.authorityEvidence) ? args.authorityEvidence ?? null : null;
  const readiness = {
    basic: evaluateAuditPaidEvidenceReadiness({ lanes: args.providerRuntime.lanes, tier: "basic", tierContract: getAuditTierContract("basic"), evidenceRows: args.report.summary.totalEvidence, authorityEvidence }),
    pro: evaluateAuditPaidEvidenceReadiness({ lanes: args.providerRuntime.lanes, tier: "pro", tierContract: getAuditTierContract("pro"), evidenceRows: args.report.summary.totalEvidence, authorityEvidence: null }),
    advanced: evaluateAuditPaidEvidenceReadiness({ lanes: args.providerRuntime.lanes, tier: "advanced", tierContract: getAuditTierContract("advanced"), evidenceRows: args.report.summary.totalEvidence, authorityEvidence: null }),
  };
  const invitationOrLegacyEntitlementVerified = args.paymentVerified;
  const evidenceEligibleTier: AuditTierId = args.requestedTier === "advanced"
    ? readiness.pro.met && invitationOrLegacyEntitlementVerified ? "pro" : "basic"
    : args.requestedTier === "pro"
      ? readiness.pro.met && invitationOrLegacyEntitlementVerified ? "pro" : "basic"
      : "basic";
  const target = normalizedTarget(args.report);
  const strictLanes = args.providerRuntime.lanes.filter(isStrictAuditEvidenceLane);
  const providerReceipts = args.providerRuntime.lanes.map((lane) => receiptFromLane(lane, target, args.report.generatedAt));
  const strictUpstreams = Array.from(new Set(strictLanes
    .map((lane) => normalizeProviderFamily(lane.lineage.upstreamRoot || lane.providerFamily || lane.provider))
    .filter((family) => family && family !== "missing" && family !== "Velmère internal")
    .map((family) => family.toLocaleLowerCase("en-US"))));
  const payloadDigest = sha256Digest(canonicalJson({ report: args.report, readiness, requestedTier: args.requestedTier, evidenceEligibleTier, authorityEvidenceDigest: authorityEvidence?.evidenceDigest ?? null }));
  const decisionSections = [
    ...args.report.sections.map(decisionSection),
    advancedDecisionSection({ report: args.report, qualityControlVerified: manualReviewVerified, monitoringConfigured }),
  ];
  const missingEvidence = Array.from(new Set([
    ...args.report.sections.filter((section) => section.missingCount > 0 || section.state === "blocked" || section.state === "missing").map((section) => `${section.title}: ${section.missingCount || section.state}`),
    ...args.providerRuntime.lanes.flatMap((lane) => lane.missing.map((item) => `${lane.label}: ${item}`)),
    !args.evidenceLedgerVerified ? "canonical evidence ledger append not verified" : null,
    args.requestedTier === "advanced" ? "Advanced is not for sale; only Basic or invitation-only Pro fallback may be delivered." : null,
    ...(authorityEvidence?.blockers ?? []).map((item) => `authority evidence: ${item}`),
  ].filter((value): value is string => Boolean(value))));
  const requestedForPayload: VelmereTier = tierLabel(evidenceEligibleTier);
  const accessBindings = secureAccessBindings({
    requestedTier: evidenceEligibleTier,
    paymentVerified: evidenceEligibleTier !== "basic" && invitationOrLegacyEntitlementVerified,
    accountBindingHash: args.accountBindingHash,
    entitlementId: args.entitlementId,
    paidEntitlementBinding: args.paidEntitlementBinding,
    paidTokenNonce: args.paidTokenNonce,
    payloadDigest,
    manualReviewReceiptId: null,
    manualReviewVerified: false,
  });
  const payload = buildCustomerReportPayload({
    locale: args.report.locale === "pl" || args.report.locale === "de" ? args.report.locale : "en",
    tier: requestedForPayload,
    symbol: args.report.target.contractAddress?.slice(0, 12) ?? args.report.target.projectName ?? "AUDIT",
    name: args.report.target.projectName ?? args.report.target.contractAddress ?? "Smart contract audit",
    family: args.report.target.contractAddress ? "erc20" : "defi_protocol",
    reportSurface: "security",
    riskScore: reportRiskScore,
    sourceFamilyCount: strictUpstreams.length,
    missingEvidence,
    providerConflicts: args.providerRuntime.lanes.filter((lane) => lane.state === "partial" || lane.state === "error").map((lane) => `${lane.label}:${lane.state}`),
    chartMode: "unavailable",
    providerEvidenceReceipts: providerReceipts,
    observedSourceLabels: args.providerRuntime.lanes.map((lane) => lane.provider),
    generatedAt: args.report.generatedAt,
    coverageInput: coverage({ report: args.report, providerRuntime: args.providerRuntime, strictCount: strictLanes.length, strictUpstreamCount: strictUpstreams.length }),
    missingCriticalEvidence: args.report.summary.blocked + args.report.summary.missing,
    stressTestExecuted: false,
    evidenceLedgerPresent: args.evidenceLedgerVerified,
    executedTests: [
      strictLanes.length > 0 ? "source_binding" : "",
      strictUpstreams.length >= 2 ? "source_quorum" : "",
      args.evidenceLedgerVerified ? "evidence_ledger" : "",
      manualReviewVerified ? "internal_quality_control" : "",
    ].filter(Boolean),
    unexecutedTests: [
      strictUpstreams.length < 2 ? "source_quorum" : "",
      !args.evidenceLedgerVerified ? "evidence_ledger" : "",
      args.requestedTier === "advanced" ? "advanced_not_for_sale" : "",
    ].filter(Boolean),
    providerTimestamps: strictLanes.map((lane) => lane.receipt?.observedAt ?? args.report.generatedAt),
    chainId: args.providerRuntime.target.chainId,
    contractAddress: args.providerRuntime.target.contractAddress ?? args.report.target.contractAddress ?? null,
    dataWindow: "audit provider receipts and source freshness window",
    decisionSections,
    runtimeCanonicalValues: {
      "audit.permission_summary": {
        value: (() => {
          const section = args.report.sections.find((item) => item.id === "permission-parser");
          return section ? {
            state: section.state,
            evidenceCount: section.evidenceCount,
            missingCount: section.missingCount,
            sourceFamilies: section.sourceFamilies,
            limitation: "customer_safe_section_projection",
          } : { state: "unavailable", limitation: "permission_section_not_generated" };
        })(),
        confidence: args.report.finalVerdict.sourceConfidence,
      },
      "audit.liquidity_evidence": {
        value: (() => {
          const section = args.report.sections.find((item) => item.id === "liquidity-holder-lock-risk");
          return section ? {
            state: section.state,
            evidenceCount: section.evidenceCount,
            missingCount: section.missingCount,
            sourceFamilies: section.sourceFamilies,
            limitation: "section_level_evidence_not_execution_liquidity",
          } : { state: "unavailable", limitation: "liquidity_section_not_generated" };
        })(),
        confidence: args.report.finalVerdict.sourceConfidence,
      },
      "audit.holder_evidence": {
        value: (() => {
          const section = args.report.sections.find((item) => item.id === "liquidity-holder-lock-risk");
          return section ? {
            state: section.state,
            evidenceCount: section.evidenceCount,
            missingCount: section.missingCount,
            sourceFamilies: section.sourceFamilies,
            limitation: "holder_identity_and_cex_exclusions_remain_source_bounded",
          } : { state: "unavailable", limitation: "holder_section_not_generated" };
        })(),
        confidence: args.report.finalVerdict.sourceConfidence,
      },
      "evidence.claim_ledger": {
        value: args.evidenceLedgerVerified ? {
          state: "verified",
          claims: decisionSections.map((section) => ({
            id: section.id,
            state: section.state,
            evidenceCount: section.evidence.length,
          })),
          unresolved: missingEvidence,
        } : { state: "unavailable", limitation: "canonical_evidence_ledger_not_verified" },
        confidence: args.evidenceLedgerVerified ? args.report.finalVerdict.sourceConfidence : 0,
      },
      "audit.quality_control_state": manualReviewVerified ? {
        value: "internal_receipt_verified",
        // The receipt is a persisted internal QA snapshot, not a human-review field mode.
        mode: "durable_snapshot",
        evidenceRefs: manualReviewReceiptId ? [manualReviewReceiptId] : [],
        limitation: "does_not_unlock_advanced_or_create_a_human_review_claim",
        confidence: 100,
      } : {
        value: "not_verified",
        mode: "explicit_missing",
        limitation: "advanced_remains_not_for_sale",
        confidence: 0,
      },
      "audit.monitoring_state": {
        value: monitoringConfigured ? "configured" : "not_configured",
        confidence: monitoringConfigured ? 100 : 0,
      },
      "audit.revalidation_plan": {
        value: args.report.advancedQueue.length > 0
          ? args.report.advancedQueue
          : ["revalidate_after_material_change"],
        confidence: args.report.finalVerdict.sourceConfidence,
      },
      "audit.finding_evidence_graph": {
        value: {
          state: args.evidenceLedgerVerified ? "verified" : "unverified",
          findings: args.report.topFindings.map((finding) => ({
            id: finding.id,
            severity: finding.severity,
            sourceFamily: finding.sourceFamily,
          })),
          strictUpstreamRoots: strictUpstreams,
        },
        confidence: args.evidenceLedgerVerified ? args.report.finalVerdict.sourceConfidence : 0,
      },
      "audit.false_positive_quality_control": {
        value: manualReviewVerified ? {
          state: "internal_quality_control_recorded",
          receiptId: manualReviewReceiptId,
          limitation: "not_independent_adjudication_and_not_included_human_review",
        } : {
          state: "unavailable",
          limitation: "independent_quality_review_not_performed",
        },
        confidence: manualReviewVerified ? 100 : 0,
      },
    },
    ...accessBindings,
  });
  const layout = buildCustomerReportLayoutModel(payload);
  // The commercial renderer is the final authority for what can actually be
  // shown or exported. Keep the API projection on that same tier; readiness
  // alone must never expose a paid projection while the PDF policy is locked.
  const deliveredTier: AuditTierId = payload.deliveryPolicy.visibleTier === "Advanced"
    ? "advanced"
    : payload.deliveryPolicy.visibleTier === "Pro"
      ? "pro"
      : "basic";
  const projection = projectAuditReportForCustomer({
    report: args.report,
    requestedTier: args.requestedTier,
    deliveredTier,
    manualReviewVerified: false,
  });
  const deliveryUnavailable = payload.deliveryPolicy.visibleTier === null;
  const unsigned = {
    schemaVersion: PASS4820_AUDIT_CUSTOMER_REPORT_PIPELINE_ID,
    requestedTier: args.requestedTier,
    deliveredTier,
    releaseState: deliveryUnavailable || !readiness.basic.met
      ? "blocked"
      : args.requestedTier === "advanced" && deliveredTier === "pro"
        ? "advanced_not_for_sale_pro_fallback"
        : deliveredTier === args.requestedTier
          ? "ready"
          : "redacted_to_basic",
    readiness,
    projection,
    customerReport: payload,
    customerReportPreviewLayout: layout,
    sourceTruth: {
      strictLaneCount: strictLanes.length,
      strictUpstreamRoots: strictUpstreams,
      providerReceiptCount: providerReceipts.length,
      adjudicatedAuthorityReceiptCount: authorityEvidence?.state === "confirmed" ? authorityEvidence.receipts.length : 0,
      adjudicatedAuthorityEvidenceDigest: authorityEvidence?.evidenceDigest ?? null,
      contentBoundProviderReceiptCount: providerReceipts.filter((receipt) => (
        isPass4644CommerciallyFreshReceipt(receipt, Date.parse(args.report.generatedAt))
      )).length,
    },
    rule: "Audit Basic/Pro/Advanced, customer preview and PDF consume the same evidence-bound report contract; Basic is a free pilot, Pro is invitation-only with internal quality control, and Advanced is not for sale.",
  } as const;
  return { ...unsigned, pipelineDigest: sha256Digest(canonicalJson(unsigned)) };
}
