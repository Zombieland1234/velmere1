import assert from "node:assert/strict";
import {
  buildPublicVlmTierEligibility,
  decidePostPaymentEligibility,
  evaluateVlmTierEligibility,
  selectHighestEligibleTier,
  verifyVlmTierEligibilityReceipt,
  type VlmEligibilityEvidenceItem,
  type VlmTierEligibilityInput,
} from "@/lib/commerce/vlm-evidence-availability";

let assertions = 0;
function check(value: unknown, message: string) {
  assertions += 1;
  assert.ok(value, message);
}

const current: VlmEligibilityEvidenceItem = {
  id: "source_identity",
  label: "Source identity",
  required: true,
  critical: true,
  truthState: "REAL_CURRENT",
  freshness: "CURRENT",
  rightsState: "ALLOWED",
  runtimeReachable: true,
  historicalAvailable: true,
  observedAt: "2026-08-13T04:00:00.000Z",
  expiresAt: "2026-08-13T04:30:00.000Z",
};

function input(overrides: Partial<VlmTierEligibilityInput> = {}): VlmTierEligibilityInput {
  return {
    evaluatedAt: "2026-08-13T04:10:00.000Z",
    subjectId: "audit:0x1234",
    sourceHash: "sha256:" + "a".repeat(64),
    policy: {
      policyVersion: "test-policy-v1",
      product: "audit",
      tier: "pro",
      locale: "en",
      catalogState: "PUBLIC_SALE",
      requiresCurrentEvidence: true,
      requireCommercialRights: true,
      allowLimitations: false,
      allowHistoricalFallback: true,
      minMaterialValueDeltaBps: 1_000,
    },
    evidence: [current],
    runtimeHealth: "HEALTHY",
    valueDeltaVsLowerTierBps: 2_000,
    valueDeltaEvidenceReady: true,
    lastFullyEligibleAt: "2026-08-13T04:00:00.000Z",
    nextCheckAt: "2026-08-13T04:15:00.000Z",
    estimatedRestorationAt: null,
    estimatedRestorationBasis: null,
    suggestedLowerTier: "basic",
    ...overrides,
  };
}

const available = evaluateVlmTierEligibility(input());
check(available.availabilityState === "AVAILABLE", "fully evidenced public-sale tier must be AVAILABLE");
check(available.analysisEligible === true, "fully evidenced tier must be analysis eligible");
check(available.checkoutEligible === true && available.saleEligible === true, "public-sale tier must be checkout and sale eligible");
check(verifyVlmTierEligibilityReceipt(available), "eligibility receipt must verify");
check(buildPublicVlmTierEligibility(available, "en").estimatedRestorationKnown === false, "unknown ETA must remain explicitly unknown");

const missing = evaluateVlmTierEligibility(input({
  evidence: [{ ...current, truthState: "UNAVAILABLE", historicalAvailable: false }],
}));
check(missing.availabilityState === "TEMPORARILY_UNAVAILABLE", "missing critical evidence must fail closed");
check(missing.saleEligible === false, "missing critical evidence must disable sale");
check(missing.reasonCodes.includes("CRITICAL_EVIDENCE_MISSING"), "missing evidence reason must be retained");

const unboundCurrent = evaluateVlmTierEligibility(input({
  evidence: [{ ...current, observedAt: null, expiresAt: null }],
}));
check(unboundCurrent.analysisEligible === false && unboundCurrent.saleEligible === false, "CURRENT without observedAt/expiry binding must fail closed");
check(unboundCurrent.reasonCodes.includes("CRITICAL_EVIDENCE_STALE"), "missing current observation window must be explicit");

const historical = evaluateVlmTierEligibility(input({
  evidence: [{ ...current, truthState: "REAL_STALE", freshness: "HISTORICAL", historicalAvailable: true }],
}));
check(historical.availabilityState === "HISTORICAL_ONLY", "stale current evidence may fall back to historical only");
check(historical.historicalEligible === true, "safe historical fallback must be explicit");
check(historical.saleEligible === false, "historical fallback cannot silently sell current intelligence");

const rights = evaluateVlmTierEligibility(input({
  evidence: [{ ...current, rightsState: "BLOCKED" }],
}));
check(rights.availabilityState === "RIGHTS_BLOCKED", "blocked commercial rights must take precedence");
check(rights.reasonCodes.includes("RIGHTS_NOT_CONFIRMED"), "rights blocker must be public-safe and explicit");

const conflicted = evaluateVlmTierEligibility(input({
  evidence: [{ ...current, truthState: "CONFLICTED" }],
}));
check(conflicted.availabilityState === "CONFLICTED", "critical provider conflict must not be silently flattened");
check(conflicted.saleEligible === false, "conflicted tier must not be sold");

const degraded = evaluateVlmTierEligibility(input({ runtimeHealth: "UNAVAILABLE" }));
check(degraded.availabilityState === "SYSTEM_DEGRADED", "unavailable runtime must block delivery");
check(degraded.reasonCodes.includes("RUNTIME_UNAVAILABLE"), "runtime blocker must be retained");

const noValue = evaluateVlmTierEligibility(input({
  policy: { ...input().policy, tier: "advanced", minMaterialValueDeltaBps: 1_500 },
  valueDeltaVsLowerTierBps: 700,
  suggestedLowerTier: "pro",
}));
check(noValue.valueEligible === false, "Advanced must be withheld when material delta is insufficient");
check(noValue.reasonCodes.includes("VALUE_DELTA_INSUFFICIENT"), "value withholding reason must be explicit");
check(noValue.saleEligible === false, "insufficient Advanced value must disable sale");

const invitation = evaluateVlmTierEligibility(input({
  policy: { ...input().policy, catalogState: "INVITATION_ONLY" },
}));
check(invitation.analysisEligible === true, "invitation-only catalog state may preserve internal analysis eligibility");
check(invitation.checkoutEligible === false && invitation.saleEligible === false, "invitation-only must block public checkout");
check(invitation.reasonCodes.includes("CATALOG_INVITATION_ONLY"), "catalog truth must be explicit");

const notForSale = evaluateVlmTierEligibility(input({
  policy: { ...input().policy, catalogState: "NOT_FOR_SALE", tier: "advanced" },
  suggestedLowerTier: "pro",
}));
check(notForSale.saleEligible === false, "NOT_FOR_SALE must override technical availability");
check(notForSale.reasonCodes.includes("CATALOG_NOT_FOR_SALE"), "NOT_FOR_SALE reason must be retained");

const tampered = { ...available, saleEligible: false };
check(!verifyVlmTierEligibilityReceipt(tampered), "receipt tampering must be detected");

const preStart = decidePostPaymentEligibility({
  purchasedTier: "pro",
  latestReceipt: missing,
  analysisStarted: false,
  explicitDowngradeConsent: false,
});
check(preStart.action === "CANCEL_AND_REFUND", "lost eligibility before start must cancel/refund");
check(preStart.silentDowngradeAllowed === false, "silent downgrade must never be allowed");

const started = decidePostPaymentEligibility({
  purchasedTier: "pro",
  latestReceipt: missing,
  analysisStarted: true,
  explicitDowngradeConsent: false,
});
check(started.action === "PAUSE_AND_RETRY", "lost eligibility after start must pause rather than silently downgrade");

const explicitDowngrade = decidePostPaymentEligibility({
  purchasedTier: "pro",
  latestReceipt: missing,
  analysisStarted: false,
  explicitDowngradeConsent: true,
});
check(explicitDowngrade.action === "CONTINUE_WITH_EXPLICIT_DOWNGRADE", "explicit consent may choose the suggested lower tier");
check(explicitDowngrade.deliverTier === "basic", "explicit downgrade must bind the exact lower tier");

const basic = evaluateVlmTierEligibility(input({
  policy: { ...input().policy, tier: "basic", catalogState: "FREE", requireCommercialRights: false, minMaterialValueDeltaBps: 0 },
  valueDeltaVsLowerTierBps: null,
  valueDeltaEvidenceReady: false,
  suggestedLowerTier: null,
}));
check(selectHighestEligibleTier([basic, invitation, noValue]) === "pro", "matrix must select the highest analysis-eligible tier, not the highest sold tier");

assert.throws(() => evaluateVlmTierEligibility(input({
  estimatedRestorationAt: "2026-08-13T04:20:00.000Z",
  estimatedRestorationBasis: null,
})), /estimated_restoration_basis_required/u, "restoration ETA without evidence basis must fail closed");
assertions += 1;

console.log(`Evidence availability / dynamic tier eligibility: PASS (${assertions}/${assertions})`);
