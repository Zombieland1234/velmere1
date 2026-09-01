import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import {
  PASS2857_CUSTOMER_EXPORT_PRIVACY_CASE_SUPERVISOR_SLA_ACCEPTANCE_GATES,
  buildPass2857CustomerExportPrivacyCaseSupervisorSlaGate,
  type Pass2857CustomerExportPrivacyCaseStatus,
} from "@/lib/market-integrity/top1-customer-export-privacy-case-supervisor-sla-gate";
import type { Pass2856CustomerExportDsrAppealResolutionClosureGate } from "@/lib/market-integrity/top1-customer-export-dsr-appeal-resolution-closure-gate";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bool(value: string | null) {
  return value === "1" || value === "true" || value === "yes" || value === "passed";
}

function num(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function tier(value: string | null): VelmereTier {
  return value === "Pro" || value === "pro" ? "Pro" : value === "Advanced" || value === "advanced" ? "Advanced" : "Basic";
}

function status(value: string | null): Pass2857CustomerExportPrivacyCaseStatus {
  if (value === "open" || value === "pending_customer" || value === "pending_legal_privacy" || value === "sla_breached" || value === "escalated") return value;
  return "closed";
}

function buildPreviousDsrAppealResolutionClosureFixture(selectedTier: VelmereTier, generatedAt: string): Pass2856CustomerExportDsrAppealResolutionClosureGate {
  return {
    schemaVersion: "pass2856_customer_export_dsr_appeal_resolution_closure_gate_v1",
    surface: "API fixture for PASS2857",
    tier: selectedTier,
    releasePacketId: "release_packet_pass2857_fixture",
    sealId: "seal_pass2857_fixture",
    generatedAt,
    dsrAppealResolutionClosureState: "dsr_appeal_resolution_closure_ready",
    dsrAppealResolutionClosureReadinessScore: 99.4,
    dsrAppealResolutionClosureEnvelope: {
      previousDsrDeliveryAppealReopenState: "dsr_delivery_appeal_reopen_ready",
      previousDsrDeliveryAppealReopenReadinessScore: 99.1,
      previousCanCloseCustomerDsrDelivery: true,
      previousCanReopenCustomerDsrCase: false,
      previousCanUnfreezeCustomerExportAfterAppeal: true,
      customerAppealRequested: false,
      appealResolutionDecision: "no_appeal",
      appealCaseIntakeReceiptId: null,
      appealResolutionDecisionReceiptId: null,
      correctedDataSubjectAccessAuditPacketId: null,
      correctedDataSubjectAccessRedactionManifestHash: null,
      correctedPacketSupersedesPacketId: null,
      correctedPacketChannelReceipts: [],
      customerFinalResponseReceiptId: "customer_final_response_pass2857_fixture",
      finalPrivacyClosureReceiptId: "final_privacy_closure_pass2857_fixture",
      noResidualPrivacyObligationReceiptId: "no_residual_privacy_obligation_pass2857_fixture",
      privacyCaseAuditTimelineHash: "privacy_case_audit_timeline_hash_pass2857_fixture",
    },
    dsrAppealResolutionClosurePolicy: {
      canCloseCustomerDsrAppeal: true,
      canClaimFinalPrivacyCaseClosure: true,
      canUnfreezeCustomerExportAfterDsrAppealResolution: true,
      canClaimProductionDsrAppealResolutionWorkflow: false,
      reason: "Fixture PASS2856 final privacy closure is ready so PASS2857 can verify supervisor/SLA escalation boundary.",
    },
    dsrAppealResolutionClosureRiskSignals: {
      dsrDeliveryAppealReopenNotReady: false,
      missingAppealCaseIntakeReceipt: false,
      missingAppealResolutionDecisionReceipt: false,
      missingCorrectedPacketId: false,
      missingCorrectedPacketRedactionManifest: false,
      missingCorrectedPacketChannelDelivery: false,
      missingCustomerFinalResponseReceipt: false,
      missingFinalPrivacyClosureReceipt: false,
      missingNoResidualPrivacyObligationReceipt: false,
      missingPrivacyCaseAuditTimelineHash: false,
    },
    customerSafeCopy: "Previous PASS2856 final privacy closure fixture is ready for PASS2857 supervisor/SLA verification.",
    operatorNextActions: [],
  } as Pass2856CustomerExportDsrAppealResolutionClosureGate;
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("customer-export-privacy-case-supervisor-sla");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const selectedTier = tier(url.searchParams.get("tier"));
  const generatedAt = new Date().toISOString();
  const caseStatus = status(url.searchParams.get("privacyCaseStatus"));
  const previousGate = buildPreviousDsrAppealResolutionClosureFixture(selectedTier, generatedAt);
  const gate = buildPass2857CustomerExportPrivacyCaseSupervisorSlaGate({
    surface: url.searchParams.get("surface") ?? "customer-export-privacy-case-supervisor-sla-api",
    tier: selectedTier,
    customerExportDsrAppealResolutionClosureGate: previousGate,
    generatedAt,
    privacyCaseStatus: caseStatus,
    supervisorPseudonym: url.searchParams.get("supervisorPseudonym") ?? "privacy_supervisor_pass2857_fixture",
    supervisorAssignmentReceiptId: url.searchParams.get("supervisorAssignmentReceiptId") ?? "supervisor_assignment_pass2857_fixture",
    privacyCaseSlaPolicyId: url.searchParams.get("privacyCaseSlaPolicyId") ?? "privacy_case_sla_policy_pass2857_fixture",
    appealResolutionDueAt: url.searchParams.get("appealResolutionDueAt") ?? generatedAt,
    appealResolutionClosedAt: caseStatus === "closed" ? (url.searchParams.get("appealResolutionClosedAt") ?? generatedAt) : url.searchParams.get("appealResolutionClosedAt"),
    privacyCaseCurrentAgeHours: num(url.searchParams.get("privacyCaseCurrentAgeHours"), caseStatus === "closed" ? 6 : 42),
    legalPrivacySignoffLate: bool(url.searchParams.get("legalPrivacySignoffLate")),
    slaBreachDetected: bool(url.searchParams.get("slaBreachDetected")) || caseStatus === "sla_breached",
    lateSignoffEscalationReceiptId: (bool(url.searchParams.get("legalPrivacySignoffLate")) || caseStatus === "sla_breached") ? (url.searchParams.get("lateSignoffEscalationReceiptId") ?? "late_signoff_escalation_pass2857_fixture") : url.searchParams.get("lateSignoffEscalationReceiptId"),
    duplicateAppealCount: num(url.searchParams.get("duplicateAppealCount"), 0),
    duplicateAppealThrottleReceiptId: num(url.searchParams.get("duplicateAppealCount"), 0) > 0 ? (url.searchParams.get("duplicateAppealThrottleReceiptId") ?? "duplicate_appeal_throttle_pass2857_fixture") : url.searchParams.get("duplicateAppealThrottleReceiptId"),
    abuseGuardReceiptId: num(url.searchParams.get("duplicateAppealCount"), 0) > 0 ? (url.searchParams.get("abuseGuardReceiptId") ?? "abuse_guard_pass2857_fixture") : url.searchParams.get("abuseGuardReceiptId"),
    customerCommunicationCadenceReceiptId: url.searchParams.get("customerCommunicationCadenceReceiptId") ?? "customer_communication_cadence_pass2857_fixture",
    unresolvedCaseExportFreezeReceiptId: caseStatus !== "closed" ? (url.searchParams.get("unresolvedCaseExportFreezeReceiptId") ?? "unresolved_case_export_freeze_pass2857_fixture") : url.searchParams.get("unresolvedCaseExportFreezeReceiptId"),
    supervisorAuditTimelineHash: url.searchParams.get("supervisorAuditTimelineHash") ?? "supervisor_audit_timeline_hash_pass2857_fixture",
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2857,
      gate,
      acceptanceGates: PASS2857_CUSTOMER_EXPORT_PRIVACY_CASE_SUPERVISOR_SLA_ACCEPTANCE_GATES,
      rule: "Final privacy closure is not supervisor-controlled close. PASS2857 requires supervisor assignment, SLA policy/clock, late-signoff escalation, duplicate-appeal guard, customer cadence, unresolved-case freeze and supervisor audit timeline hash.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
