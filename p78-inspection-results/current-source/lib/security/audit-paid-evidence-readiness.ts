import type { Pass2572RuntimeLane } from "./audit-provider-runtime-client";
import type { AuditTierContract, AuditTierId } from "./audit-tier-contract";
import { isStrictAuditAuthorityReceipt, verifyAuditAdjudicatedAuthorityEvidence, type AuditAdjudicatedAuthorityEvidence } from "./audit-adjudicated-authority-evidence";

export const PASS4819_AUDIT_PAID_EVIDENCE_READINESS_ID = "pass4819-audit-paid-evidence-readiness-v1" as const;

const SHA256_HEX = /^[a-f0-9]{64}$/i;

const MINIMUM_INDEPENDENT_UPSTREAM_ROOTS: Record<AuditTierId, number> = {
  basic: 1,
  pro: 3,
  advanced: 4,
};

function compactUnique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function isStrictAuditEvidenceLane(lane: Pass2572RuntimeLane) {
  const receipt = lane.receipt;
  const identity = lane.identity;
  const lineage = lane.lineage;
  return lane.state === "confirmed" &&
    identity?.matched === true &&
    identity.verification === "exact_response" &&
    Boolean(receipt) &&
    SHA256_HEX.test(String(receipt?.bodyDigest ?? "")) &&
    SHA256_HEX.test(String(receipt?.requestUrlDigest ?? "")) &&
    Number(receipt?.bodyBytes ?? 0) > 0 &&
    Number(receipt?.statusCode ?? 0) >= 200 &&
    Number(receipt?.statusCode ?? 0) < 300 &&
    lineage?.independenceEligible === true &&
    Boolean(lineage.upstreamRoot?.trim()) &&
    Boolean(lane.providerFamily?.trim());
}

export function evaluateAuditPaidEvidenceReadiness(input: {
  lanes: Pass2572RuntimeLane[];
  tier: AuditTierId;
  tierContract: AuditTierContract;
  evidenceRows: number;
  authorityEvidence?: AuditAdjudicatedAuthorityEvidence | null;
}) {
  const eligibleLanes = input.lanes.filter((lane) => lane.tier.includes(input.tier));
  const strictLanes = eligibleLanes.filter(isStrictAuditEvidenceLane);
  const rejectedLanes = eligibleLanes.filter((lane) => !isStrictAuditEvidenceLane(lane));
  // Public/passive dual-authority adjudication may supplement Basic only. Pro/Advanced keep
  // their original strict provider-lane quorum and cannot be unlocked by authority pages alone.
  const strictAuthorityReceipts = input.tier === "basic"
    && verifyAuditAdjudicatedAuthorityEvidence(input.authorityEvidence)
    && input.authorityEvidence?.state === "confirmed"
      ? input.authorityEvidence.receipts.filter(isStrictAuditAuthorityReceipt)
      : [];
  const verifiedEvidenceReceipts = strictLanes.length + strictAuthorityReceipts.length;
  const providerFamilies = compactUnique([
    ...strictLanes.map((lane) => lane.providerFamily),
    ...strictAuthorityReceipts.map((receipt) => receipt.providerFamily),
  ]);
  const upstreamRoots = compactUnique([
    ...strictLanes.map((lane) => lane.lineage.upstreamRoot.trim().toLowerCase()),
    ...strictAuthorityReceipts.map((receipt) => receipt.upstreamRoot.trim().toLowerCase()),
  ]);
  const contentDigests = compactUnique([
    ...strictLanes.map((lane) => lane.receipt?.bodyDigest.toLowerCase()),
    ...strictAuthorityReceipts.map((receipt) => receipt.bodyDigest.toLowerCase()),
  ]);
  const minimumUpstreamRoots = MINIMUM_INDEPENDENT_UPSTREAM_ROOTS[input.tier];
  const evidenceRows = Math.max(0, Math.trunc(Number(input.evidenceRows) || 0));

  const blockers = compactUnique([
    verifiedEvidenceReceipts < input.tierContract.minimumEvidence.verifiedProviderReceipts
      ? `verified_evidence_receipts:${verifiedEvidenceReceipts}/${input.tierContract.minimumEvidence.verifiedProviderReceipts}`
      : null,
    providerFamilies.length < input.tierContract.minimumEvidence.independentProviderFamilies
      ? `independent_provider_families:${providerFamilies.length}/${input.tierContract.minimumEvidence.independentProviderFamilies}`
      : null,
    upstreamRoots.length < minimumUpstreamRoots
      ? `independent_upstream_roots:${upstreamRoots.length}/${minimumUpstreamRoots}`
      : null,
    verifiedEvidenceReceipts < input.tierContract.minimumEvidence.liveLanes
      ? `strict_live_evidence:${verifiedEvidenceReceipts}/${input.tierContract.minimumEvidence.liveLanes}`
      : null,
    evidenceRows < input.tierContract.minimumEvidence.evidenceRows
      ? `evidence_rows:${evidenceRows}/${input.tierContract.minimumEvidence.evidenceRows}`
      : null,
  ]);

  return {
    passId: PASS4819_AUDIT_PAID_EVIDENCE_READINESS_ID,
    tier: input.tier,
    eligibleLanes: eligibleLanes.length,
    strictConfirmedLanes: strictLanes.length,
    strictAuthorityReceipts: strictAuthorityReceipts.length,
    rejectedOrPartialLanes: rejectedLanes.length,
    verifiedProviderReceipts: strictLanes.length,
    verifiedAuthorityReceipts: strictAuthorityReceipts.length,
    verifiedEvidenceReceipts,
    independentProviderFamilies: providerFamilies.length,
    independentProviderFamilyIds: providerFamilies,
    independentUpstreamRoots: upstreamRoots.length,
    independentUpstreamRootIds: upstreamRoots,
    uniqueContentDigests: contentDigests.length,
    evidenceRows,
    minimum: {
      ...input.tierContract.minimumEvidence,
      independentUpstreamRoots: minimumUpstreamRoots,
    },
    blockers,
    met: blockers.length === 0,
    rule: "Strict provider lanes keep their original exact-response identity rules. Basic may additionally count a server-adjudicated dual-authority contradiction bundle only when its target binding, digests and two independent authority roots verify. Pro/Advanced never inherit that exception; partial/request-bound evidence never satisfies paid quorum.",
  };
}
