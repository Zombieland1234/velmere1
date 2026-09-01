import assert from "node:assert/strict";
import {
  assertProAuditPdfPaidCompleteness,
  type ProAuditPdfSnapshot,
} from "../../lib/security/pro-audit-pdf/render-pro-audit-pdf";

function snapshot(tier: "pro" | "advanced"): ProAuditPdfSnapshot {
  const upstreams = tier === "advanced"
    ? ["etherscan", "sourcify", "dexscreener", "goplus", "coingecko", "defillama"]
    : ["etherscan", "dexscreener", "goplus", "coingecko", "defillama"];
  return {
    tier,
    providerTruth: {
      confirmedIdentityBoundProviders: upstreams.length,
      independentProviderFamilies: [...upstreams],
      independentUpstreamRoots: [...upstreams],
      strictQuorumMet: true,
    },
    publicSourceTruth: {
      submitted: 0,
      contentBound: 0,
      exactIdentityBound: 0,
      allSubmittedSourcesBound: true,
    },
    evidenceReadiness: {
      proReady: true,
      advancedReady: tier === "advanced",
      reasons: ["docs:docsUrl not submitted"],
    },
    verdict: {
      riskScore: null,
      riskLabel: "No verified adverse finding",
      confidenceScore: 92,
      reviewPriorityScore: 20,
      readinessScore: 96,
    },
  } as ProAuditPdfSnapshot;
}

let assertions = 0;
for (const tier of ["pro", "advanced"] as const) {
  const complete = snapshot(tier);
  assert.doesNotThrow(() => assertProAuditPdfPaidCompleteness(complete)); assertions += 1;

  const notReady = structuredClone(complete);
  if (tier === "advanced") notReady.evidenceReadiness.advancedReady = false;
  else notReady.evidenceReadiness.proReady = false;
  assert.throws(() => assertProAuditPdfPaidCompleteness(notReady), /evidence_readiness_false/); assertions += 1;

  const shortQuorum = structuredClone(complete);
  shortQuorum.providerTruth.independentUpstreamRoots = shortQuorum.providerTruth.independentUpstreamRoots
    .slice(0, tier === "advanced" ? 3 : 2);
  assert.throws(() => assertProAuditPdfPaidCompleteness(shortQuorum), /independent_upstream_roots/); assertions += 1;

  const familyShortfall = structuredClone(complete);
  familyShortfall.providerTruth.independentProviderFamilies = familyShortfall.providerTruth.independentProviderFamilies
    .slice(0, tier === "advanced" ? 3 : 2);
  assert.throws(() => assertProAuditPdfPaidCompleteness(familyShortfall), /independent_provider_families/); assertions += 1;

  const copiedReceiptCount = structuredClone(complete);
  copiedReceiptCount.providerTruth.confirmedIdentityBoundProviders = 1;
  assert.throws(() => assertProAuditPdfPaidCompleteness(copiedReceiptCount), /identity_bound_provider_receipt_lanes/); assertions += 1;

  const lowConfidence = structuredClone(complete);
  lowConfidence.verdict.confidenceScore = tier === "advanced" ? 74 : 64;
  assert.throws(() => assertProAuditPdfPaidCompleteness(lowConfidence), /confidence_floor/); assertions += 1;

  const missingPermission = structuredClone(complete);
  missingPermission.evidenceReadiness.reasons.push("permission_evidence_not_resolved");
  assert.throws(() => assertProAuditPdfPaidCompleteness(missingPermission), /critical_evidence_reasons/); assertions += 1;

  const missingSourceAbi = structuredClone(complete);
  missingSourceAbi.evidenceReadiness.reasons.push("source_or_abi_receipt_required");
  assert.throws(() => assertProAuditPdfPaidCompleteness(missingSourceAbi), /critical_evidence_reasons/); assertions += 1;

  const publicIdentityMismatch = structuredClone(complete);
  publicIdentityMismatch.publicSourceTruth.submitted = 1;
  publicIdentityMismatch.publicSourceTruth.contentBound = 1;
  publicIdentityMismatch.publicSourceTruth.exactIdentityBound = 0;
  publicIdentityMismatch.publicSourceTruth.allSubmittedSourcesBound = true;
  assert.throws(() => assertProAuditPdfPaidCompleteness(publicIdentityMismatch), /public_source_exact_identity_binding/); assertions += 1;

  if (tier === "advanced") {
    const copiedPublicSource = structuredClone(complete);
    copiedPublicSource.publicSourceTruth.submitted = 1;
    copiedPublicSource.publicSourceTruth.contentBound = 0;
    copiedPublicSource.publicSourceTruth.allSubmittedSourcesBound = false;
    assert.throws(() => assertProAuditPdfPaidCompleteness(copiedPublicSource), /advanced_public_sources_not_content_bound/); assertions += 1;
  }
}

console.log(JSON.stringify({
  schemaVersion: "pass6-audit-pdf-paid-completeness-v1",
  status: "PASS",
  assertions,
  proMinimumIndependentUpstreams: 3,
  advancedMinimumIndependentUpstreams: 4,
  blockersCovered: [
    "readiness_false", "quorum_shortfall", "copied_receipt_count", "low_confidence",
    "permission_missing", "source_abi_missing", "provider_family_shortfall",
    "public_source_identity_mismatch", "advanced_public_source_unbound",
  ],
}, null, 2));
